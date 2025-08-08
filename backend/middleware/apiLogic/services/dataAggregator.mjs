import { getModelInstance } from "./modelManager.mjs";

export async function aggregateClientData(
  clients,
  modelNames,
  advancedFilterData = {}
) {
  // Validate input
  if (!clients || clients.length === 0) {
    return { combinedData: [], modelDataMap: new Map() };
  }

  // Limit batch size for performance
  const MAX_BATCH_SIZE = 5000;
  if (clients.length > MAX_BATCH_SIZE) {
    console.warn(`Large batch detected: ${clients.length} clients. Consider using smaller batches for better performance.`);
  }

  const modelDataMap = new Map();

  // Handle subscription type logic
  const subscriptionType = advancedFilterData.subscriptionType || "WMM";
  let adjustedModelNames = [...modelNames];

  // Replace WmmModel (case-insensitive) with appropriate subscription model
  const wmmIndex = modelNames.findIndex((name) => String(name).toLowerCase() === "wmmmodel");
  if (wmmIndex !== -1) {
    adjustedModelNames = [...modelNames];
    const replacement =
      subscriptionType === "Promo"
        ? "PromoModel"
        : subscriptionType === "Complimentary"
        ? "ComplimentaryModel"
        : "WmmModel";
    adjustedModelNames.splice(wmmIndex, 1, replacement);
  } else {
    // If no WmmModel placeholder exists, ensure correct subscription model is present
    const desired =
      subscriptionType === "Promo"
        ? "PromoModel"
        : subscriptionType === "Complimentary"
        ? "ComplimentaryModel"
        : "WmmModel";
    if (!modelNames.some((name) => String(name).toLowerCase() === desired.toLowerCase())) {
      adjustedModelNames = [...modelNames, desired];
    }
  }

  // Extract client IDs once for better performance
  const clientIds = clients.map((c) => c.id);
  
  // Create a Map for O(1) client lookup - use WeakMap for better memory management
  const clientMap = new Map(clients.map(client => [client.id, client]));

  // Process model data in parallel with error handling and memory optimization
  const modelDataPromises = adjustedModelNames.map(async (modelName) => {
    try {
      const Model = await getModelInstance(modelName);
      
      // Build aggregation pipeline based on model type
      const pipeline = buildAggregationPipeline(
        Model.modelName,
        clientIds,
        advancedFilterData
      );
      
      const result = await Model.aggregate(pipeline);
      return { modelName, data: result, success: true };
    } catch (error) {
      console.error(`Error aggregating data for model ${modelName}:`, error);
      return { modelName, data: [], success: false, error };
    }
  });

  const modelDataResults = await Promise.all(modelDataPromises);

  // Process and map the aggregated data with memory optimization
  modelDataResults.forEach(({ modelName, data, success }) => {
    if (!success) return; // Skip failed aggregations
    
    data.forEach((item) => {
      const clientId = item._id || item.clientid;
      if (!modelDataMap.has(clientId)) {
        modelDataMap.set(clientId, {});
      }

      // Optimize data object creation to reduce memory footprint
      const dataObject = {
        ...item,
        records: filterRecords(
          item.records || [],
          advancedFilterData,
          modelName
        ),
      };

      // Map each subscription type to its own data array
      const modelType = modelName.toLowerCase();
      let serviceType;

      // Handle subscription types
      if (modelType.includes("wmm")) {
        serviceType = "wmmData";
      } else if (modelType.includes("promo")) {
        serviceType = "promoData";
      } else if (modelType.includes("complimentary")) {
        serviceType = "compData";
      } else {
        serviceType = normalizeServiceType(modelName);
      }

      // Only set the data for the current subscription type
      if (
        (subscriptionType === "WMM" && serviceType === "wmmData") ||
        (subscriptionType === "Promo" && serviceType === "promoData") ||
        (subscriptionType === "Complimentary" && serviceType === "compData") ||
        !["wmmData", "promoData", "compData"].includes(serviceType)
      ) {
        modelDataMap.get(clientId)[serviceType] = dataObject;
      }
    });
  });

  // Create combinedData by merging client data with model data - optimize for memory
  const combinedData = clients.map((client) => {
    // Get model data for this client
    const modelData = modelDataMap.get(client.id) || {};
    
    // Create client data object with minimal memory footprint
    const clientData = {
      ...client,
      ...modelData,
      subscriptionType, // Add subscription type at root level
    };

    // Add DCS and MCCJ services if they match the client's group
    if (client.group) {
      const group = client.group.toUpperCase();
      if (group === "DCS") {
        clientData.dcsData = { isService: true, group: "DCS" };
      } else if (group === "MCCJ-ASIA") {
        clientData.mccjAsiaData = { isService: true, group: "MCCJ-ASIA" };
      } else if (group === "MCCJ") {
        clientData.mccjData = { isService: true, group: "MCCJ" };
      }
    }

    return clientData;
  });

  // Clear the model data map to free memory
  modelDataMap.clear();

  return {
    combinedData,
    modelDataMap: new Map(), // Return empty map since we've processed the data
  };
}

function buildAggregationPipeline(modelName, clientIds, advancedFilterData) {
  const baseMatch = {
    clientid: { $in: clientIds.map((id) => parseInt(id)) },
  };

  // Use same pipeline for all subscription models (WMM, Promo, Complimentary)
  if (modelName.toLowerCase().match(/wmm|promo|complimentary/)) {
    const isPromo = modelName.toLowerCase().includes("promo");
    const isWmm = modelName.toLowerCase().includes("wmm");

    return [
      { $match: baseMatch },
      { $sort: { clientid: 1, subsdate: -1 } },
      {
        $addFields: {
          modelType: modelName.replace(/model/i, "").toUpperCase(),
        },
      },
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
          // WMM specific fields
          paymtref: { $first: { $cond: [isWmm, "$paymtref", null] } },
          paymtamt: { $first: { $cond: [isWmm, "$paymtamt", null] } },
          paymtmasses: { $first: { $cond: [isWmm, "$paymtmasses", null] } },
          donorid: { $first: { $cond: [isWmm, "$donorid", null] } },
          // Promo specific fields
          referralid: { $first: { $cond: [isPromo, "$referralid", null] } },
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
          // WMM specific fields
          paymtref: 1,
          paymtamt: 1,
          paymtmasses: 1,
          donorid: 1,
          // Promo specific fields
          referralid: 1,
          records: 1,
        },
      },
    ];
  }

  // Handle other models
  switch (modelName.toLowerCase()) {
    case "cal":
      return [
        { $match: baseMatch },
        {
          $addFields: {
            modelType: "CAL",
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
      ];

    default:
      const modelType = modelName.replace(/model/i, "").toUpperCase();
      return [
        { $match: baseMatch },
        { $sort: { clientid: 1, recvdate: -1 } },
        {
          $addFields: {
            modelType: modelType,
          },
        },
        {
          $group: {
            _id: "$clientid",
            records: { $push: "$$ROOT" },
          },
        },
      ];
  }
}

function filterRecords(records, advancedFilterData, modelName) {
  if (!records.length) return records;

  let filteredRecords = [...records];

  // Apply username filter if present
  if (advancedFilterData.usernameFilter) {
    const username = advancedFilterData.usernameFilter;
    filteredRecords = filteredRecords.filter(
      (record) =>
        record.adduser === username ||
        (typeof record.adduser === "string" &&
          record.adduser.toLowerCase() === username.toLowerCase())
    );
  }

  // Apply active/unsubscribed filter for HRG and FOM
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

function normalizeServiceType(modelName) {
  const modelNameLower = modelName.toLowerCase();

  // Handle subscription types
  if (modelNameLower.includes("wmm")) return "wmmData";
  if (modelNameLower.includes("promo")) return "promoData";
  if (modelNameLower.includes("complimentary")) return "compData";

  // Handle other services
  if (modelNameLower.includes("hrg")) return "hrgData";
  if (modelNameLower.includes("fom")) return "fomData";
  if (modelNameLower.includes("cal")) return "calData";
  if (modelNameLower.includes("dcs")) return "dcsData";
  if (modelNameLower.includes("mccj-asia")) return "mccjAsiaData";
  if (modelNameLower.includes("mccj")) return "mccjData";

  return modelNameLower.replace("model", "") + "Data";
}