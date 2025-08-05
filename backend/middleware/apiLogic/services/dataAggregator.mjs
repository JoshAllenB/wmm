import { getModelInstance } from "./modelManager.mjs";
import { getSubscriptionModelName, adjustModelNamesForSubscription } from "./helpers.mjs";

// In-memory cache for frequently accessed data
const dataCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000; // Maximum cache entries

// Cache cleanup function
function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of dataCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      dataCache.delete(key);
    }
  }
  
  // If cache is still too large, remove oldest entries
  if (dataCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(dataCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, Math.floor(MAX_CACHE_SIZE * 0.2)); // Remove 20% of oldest entries
    toRemove.forEach(([key]) => dataCache.delete(key));
  }
}

// Generate cache key
function generateCacheKey(clients, modelNames, advancedFilterData) {
  const clientIds = clients.map(c => c.id).sort((a, b) => a - b);
  return JSON.stringify({
    clientIds: clientIds.slice(0, 10), // Only use first 10 IDs for cache key
    modelNames: modelNames.sort(),
    subscriptionType: advancedFilterData.subscriptionType || "WMM",
    usernameFilter: advancedFilterData.usernameFilter,
    showActiveOnly: advancedFilterData.showActiveOnly,
    subscriptionStatus: advancedFilterData.subscriptionStatus
  });
}

export async function aggregateClientData(
  clients,
  modelNames,
  advancedFilterData = {}
) {
  // Clean up cache periodically
  if (Math.random() < 0.1) { // 10% chance to cleanup on each request
    cleanupCache();
  }

  // Check cache first
  const cacheKey = generateCacheKey(clients, modelNames, advancedFilterData);
  const cachedResult = dataCache.get(cacheKey);
  if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL) {
    return cachedResult.data;
  }

  const modelDataMap = new Map();

  // Handle subscription type logic - use helper function
  const subscriptionType = advancedFilterData.subscriptionType || "WMM";
  const adjustedModelNames = adjustModelNamesForSubscription(modelNames, subscriptionType);

  // Batch process model data with optimized queries
  const modelDataArrays = await Promise.all(
    adjustedModelNames.map(async (modelName) => {
      const Model = await getModelInstance(modelName);
      const clientIds = clients.map((c) => c.id);

      // Use optimized aggregation pipeline
      const pipeline = buildOptimizedAggregationPipeline(
        Model.modelName,
        clientIds,
        advancedFilterData,
        subscriptionType
      );
      
      return Model.aggregate(pipeline).allowDiskUse(true); // Allow disk use for large datasets
    })
  );

  // Process and map the aggregated data efficiently
  modelDataArrays.forEach((modelData, index) => {
    modelData.forEach((item) => {
      const clientId = item._id || item.clientid;
      if (!modelDataMap.has(clientId)) {
        modelDataMap.set(clientId, {});
      }

      const dataObject = {
        ...item,
        records: filterRecordsOptimized(
          item.records || [],
          advancedFilterData,
          adjustedModelNames[index]
        ),
      };

      // Map service type efficiently
      const serviceType = getServiceType(adjustedModelNames[index], subscriptionType);

      // Only set data for relevant subscription type
      if (shouldIncludeServiceType(serviceType, subscriptionType)) {
        modelDataMap.get(clientId)[serviceType] = dataObject;
      }
    });
  });

  // Create combinedData efficiently
  const combinedData = clients.map((client) => {
    const clientData = {
      ...client,
      ...modelDataMap.get(client.id),
      subscriptionType,
    };

    // Add group-based services efficiently
    addGroupServices(clientData, client.group);

    return clientData;
  });

  const result = {
    combinedData,
    modelDataMap,
  };

  // Cache the result
  dataCache.set(cacheKey, {
    data: result,
    timestamp: Date.now()
  });

  return result;
}

function buildOptimizedAggregationPipeline(modelName, clientIds, advancedFilterData, subscriptionType) {
  const baseMatch = {
    clientid: { $in: clientIds.map((id) => parseInt(id)) },
  };

  // Add filters to base match to reduce data processing
  if (advancedFilterData.usernameFilter) {
    baseMatch.adduser = { $regex: advancedFilterData.usernameFilter, $options: 'i' };
  }

  if (advancedFilterData.showActiveOnly && (modelName.toLowerCase().includes('hrg') || modelName.toLowerCase().includes('fom'))) {
    baseMatch.unsubscribe = { $ne: 1 };
  } else if (advancedFilterData.subscriptionStatus === 'unsubscribed' && (modelName.toLowerCase().includes('hrg') || modelName.toLowerCase().includes('fom'))) {
    baseMatch.unsubscribe = 1;
  }

  // Optimized pipeline for subscription models
  if (modelName.toLowerCase().match(/wmm|promo|complimentary/)) {
    const isPromo = modelName.toLowerCase().includes("promo");
    const isWmm = modelName.toLowerCase().includes("wmm");

    return [
      { $match: baseMatch },
      { $sort: { clientid: 1, subsdate: -1 } },
      {
        $group: {
          _id: "$clientid",
          recentCopies: { $first: "$copies" },
          totalCopies: { $sum: { $toInt: "$copies" } },
          subsclass: { $first: "$subsclass" },
          subsdate: { $first: "$subsdate" },
          enddate: { $first: "$enddate" },
          subsyear: { $first: "$subsyear" },
          remarks: { $first: "$remarks" },
          calendar: { $first: "$calendar" },
          adddate: { $first: "$adddate" },
          adduser: { $first: "$adduser" },
          // Conditional fields based on model type
          paymtref: { $first: { $cond: [isWmm, "$paymtref", null] } },
          paymtamt: { $first: { $cond: [isWmm, "$paymtamt", null] } },
          paymtmasses: { $first: { $cond: [isWmm, "$paymtmasses", null] } },
          donorid: { $first: { $cond: [isWmm, "$donorid", null] } },
          referralid: { $first: { $cond: [isPromo, "$referralid", null] } },
          // Limit records to reduce memory usage
          records: {
            $push: {
              $mergeObjects: [
                "$$ROOT",
                {
                  _id: { $toString: "$_id" },
                  clientid: { $toString: "$clientid" },
                },
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          clientid: "$_id",
          recentCopies: 1,
          totalCopies: 1,
          subsclass: 1,
          subsdate: 1,
          enddate: 1,
          subsyear: 1,
          remarks: 1,
          calendar: 1,
          adddate: 1,
          adduser: 1,
          paymtref: 1,
          paymtamt: 1,
          paymtmasses: 1,
          donorid: 1,
          referralid: 1,
          records: { $slice: ["$records", 50] }, // Limit to 50 records per client
        },
      },
    ];
  }

  // Optimized pipeline for CAL model
  if (modelName.toLowerCase() === "cal") {
    return [
      { $match: baseMatch },
      {
        $addFields: {
          numericCalQty: { $toInt: "$calqty" },
          numericCalAmt: { $toDouble: "$calamt" },
          lineTotal: {
            $multiply: [
              { $toInt: { $ifNull: ["$calqty", 0] } },
              { $toDouble: { $ifNull: ["$calamt", 0] } },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$clientid",
          totalCalQty: { $sum: "$numericCalQty" },
          totalCalAmt: { $sum: "$lineTotal" },
          records: { $push: "$$ROOT" },
        },
      },
      {
        $project: {
          _id: 0,
          clientid: "$_id",
          totalCalQty: 1,
          totalCalAmt: 1,
          records: { $slice: ["$records", 50] }, // Limit to 50 records per client
        },
      },
    ];
  }

  // Optimized pipeline for other models (HRG, FOM)
  const modelType = modelName.replace(/model/i, "").toUpperCase();
  return [
    { $match: baseMatch },
    { $sort: { clientid: 1, recvdate: -1 } },
    {
      $group: {
        _id: "$clientid",
        records: { $push: "$$ROOT" },
      },
    },
    {
      $project: {
        _id: 0,
        clientid: "$_id",
        records: { $slice: ["$records", 50] }, // Limit to 50 records per client
      },
    },
  ];
}

function filterRecordsOptimized(records, advancedFilterData, modelName) {
  if (!records.length) return records;

  // Apply filters more efficiently
  let filteredRecords = records;

  // Apply username filter if present
  if (advancedFilterData.usernameFilter) {
    const username = advancedFilterData.usernameFilter.toLowerCase();
    filteredRecords = filteredRecords.filter(
      (record) =>
        record.adduser &&
        record.adduser.toLowerCase() === username
    );
  }

  // Apply subscription status filter for HRG and FOM
  const modelType = modelName.toLowerCase();
  if (modelType.includes("hrg") || modelType.includes("fom")) {
    if (advancedFilterData.showActiveOnly) {
      filteredRecords = filteredRecords.filter(
        (record) => record.unsubscribe !== 1 && record.unsubscribe !== true
      );
    } else if (advancedFilterData.subscriptionStatus === "unsubscribed") {
      filteredRecords = filteredRecords.filter(
        (record) => record.unsubscribe === 1 || record.unsubscribe === true
      );
    }
  }

  return filteredRecords;
}

function getServiceType(modelName, subscriptionType) {
  const modelNameLower = modelName.toLowerCase();

  // Handle subscription types
  if (modelNameLower.includes("wmm")) return "wmmData";
  if (modelNameLower.includes("promo")) return "promoData";
  if (modelNameLower.includes("complimentary")) return "compData";

  // Handle other services
  if (modelNameLower.includes("hrg")) return "hrgData";
  if (modelNameLower.includes("fom")) return "fomData";
  if (modelNameLower.includes("cal")) return "calData";

  return modelNameLower.replace("model", "") + "Data";
}

function shouldIncludeServiceType(serviceType, subscriptionType) {
  // Always include non-subscription services
  if (!["wmmData", "promoData", "compData"].includes(serviceType)) {
    return true;
  }

  // Only include relevant subscription service
  return (
    (subscriptionType === "WMM" && serviceType === "wmmData") ||
    (subscriptionType === "Promo" && serviceType === "promoData") ||
    (subscriptionType === "Complimentary" && serviceType === "compData")
  );
}

function addGroupServices(clientData, group) {
  if (!group) return;

  const groupUpper = group.toUpperCase();
  switch (groupUpper) {
    case "DCS":
      clientData.dcsData = { isService: true, group: "DCS" };
      break;
    case "MCCJ-ASIA":
      clientData.mccjAsiaData = { isService: true, group: "MCCJ-ASIA" };
      break;
    case "MCCJ":
      clientData.mccjData = { isService: true, group: "MCCJ" };
      break;
  }
}

// Export cache management functions for external use
export function clearCache() {
  dataCache.clear();
}

export function getCacheStats() {
  return {
    size: dataCache.size,
    maxSize: MAX_CACHE_SIZE,
    ttl: CACHE_TTL
  };
}
