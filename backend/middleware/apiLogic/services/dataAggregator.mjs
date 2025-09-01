import { getModelInstance } from "./modelManager.mjs";

// Helper function to parse date from various formats
function parseDate(dateString) {
  if (!dateString) return null;

  try {
    // Handle MM/DD/YY format
    if (typeof dateString === "string" && dateString.includes("/")) {
      const parts = dateString.split("/");
      if (parts.length === 3) {
        const month = parseInt(parts[0]) - 1;
        const day = parseInt(parts[1]);
        let year = parseInt(parts[2]);
        // Adjust two-digit year
        if (year < 100) {
          year = year < 50 ? 2000 + year : 1900 + year;
        }
        return new Date(year, month, day);
      }
    }

    // Handle other formats
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    return null;
  }
}

// Helper function to check if a record matches date filters
function recordMatchesDateFilters(record, filters, modelType) {
  // Check for WMM subscription date filters
  if (filters.wmmActiveFromDate || filters.wmmActiveToDate) {
    if (record.subsdate) {
      const subsdate = parseDate(record.subsdate);
      if (subsdate) {
        const fromDate = filters.wmmActiveFromDate
          ? parseDate(filters.wmmActiveFromDate)
          : null;
        const toDate = filters.wmmActiveToDate
          ? parseDate(filters.wmmActiveToDate)
          : null;

        if (fromDate && subsdate < fromDate) return false;
        if (toDate && subsdate > toDate) return false;
      }
    }
  }

  // Check for WMM expiring subscription filters
  if (filters.wmmExpiringFromDate || filters.wmmExpiringToDate) {
    if (record.enddate) {
      const enddate = parseDate(record.enddate);
      if (enddate) {
        const fromDate = filters.wmmExpiringFromDate
          ? parseDate(filters.wmmExpiringFromDate)
          : null;
        const toDate = filters.wmmExpiringToDate
          ? parseDate(filters.wmmExpiringToDate)
          : null;

        if (fromDate && enddate < fromDate) return false;
        if (toDate && enddate > toDate) return false;
      }
    }
  }

  // Check for HRG payment date filters
  if (filters.hrgPaymentFromDate || filters.hrgPaymentToDate) {
    if (record.recvdate && modelType.toLowerCase().includes("hrg")) {
      const recvdate = parseDate(record.recvdate);
      if (recvdate) {
        const fromDate = filters.hrgPaymentFromDate
          ? parseDate(filters.hrgPaymentFromDate)
          : null;
        const toDate = filters.hrgPaymentToDate
          ? parseDate(filters.hrgPaymentToDate)
          : null;

        if (fromDate && recvdate < fromDate) return false;
        if (toDate && recvdate > toDate) return false;
      }
    }
  }

  // Check for HRG campaign date filters
  if (filters.hrgCampaignFromDate || filters.hrgCampaignToDate) {
    if (record.campaigndate && modelType.toLowerCase().includes("hrg")) {
      const campaigndate = parseDate(record.campaigndate);
      if (campaigndate) {
        const fromDate = filters.hrgCampaignFromDate
          ? parseDate(filters.hrgCampaignFromDate)
          : null;
        const toDate = filters.hrgCampaignToDate
          ? parseDate(filters.hrgCampaignToDate)
          : null;

        if (fromDate && campaigndate < fromDate) return false;
        if (toDate && campaigndate > toDate) return false;
      }
    }
  }

  // Check for FOM payment date filters
  if (filters.fomPaymentFromDate || filters.fomPaymentToDate) {
    if (record.recvdate && modelType.toLowerCase().includes("fom")) {
      const recvdate = parseDate(record.recvdate);
      if (recvdate) {
        const fromDate = filters.fomPaymentFromDate
          ? parseDate(filters.fomPaymentFromDate)
          : null;
        const toDate = filters.fomPaymentToDate
          ? parseDate(filters.fomPaymentToDate)
          : null;

        if (fromDate && recvdate < fromDate) return false;
        if (toDate && recvdate > toDate) return false;
      }
    }
  }

  // Check for CAL received date filters
  if (filters.calReceivedFromDate || filters.calReceivedToDate) {
    if (record.recvdate && modelType.toLowerCase().includes("cal")) {
      const recvdate = parseDate(record.recvdate);
      if (recvdate) {
        const fromDate = filters.calReceivedFromDate
          ? parseDate(filters.calReceivedFromDate)
          : null;
        const toDate = filters.calReceivedToDate
          ? parseDate(filters.calReceivedToDate)
          : null;

        if (fromDate && recvdate < fromDate) return false;
        if (toDate && recvdate > toDate) return false;
      }
    }
  }

  // Check for CAL payment date filters
  if (filters.calPaymentFromDate || filters.calPaymentToDate) {
    if (record.paymtdate && modelType.toLowerCase().includes("cal")) {
      const paymtdate = parseDate(record.paymtdate);
      if (paymtdate) {
        const fromDate = filters.calPaymentFromDate
          ? parseDate(filters.calPaymentFromDate)
          : null;
        const toDate = filters.calPaymentToDate
          ? parseDate(filters.calPaymentToDate)
          : null;

        if (fromDate && paymtdate < fromDate) return false;
        if (toDate && paymtdate > toDate) return false;
      }
    }
  }

  return true;
}

// Function to create filtered records based on date filters
function createFilteredRecords(records, advancedFilterData, modelType) {
  if (!records || records.length === 0) return null;

  // Check if any date filters are applied
  const hasDateFilters = [
    "wmmActiveFromDate",
    "wmmActiveToDate",
    "wmmExpiringFromDate",
    "wmmExpiringToDate",
    "hrgPaymentFromDate",
    "hrgPaymentToDate",
    "hrgCampaignFromDate",
    "hrgCampaignToDate",
    "fomPaymentFromDate",
    "fomPaymentToDate",
    "calReceivedFromDate",
    "calReceivedToDate",
    "calPaymentFromDate",
    "calPaymentToDate",
  ].some((filter) => advancedFilterData[filter]);

  if (!hasDateFilters) return null;

  // Filter records based on date filters
  const filteredRecords = records.filter((record) =>
    recordMatchesDateFilters(record, advancedFilterData, modelType)
  );

  // Only return filtered records if there are any matches
  return filteredRecords.length > 0 ? filteredRecords : null;
}

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
    console.warn(
      `Large batch detected: ${clients.length} clients. Consider using smaller batches for better performance.`
    );
  }

  const modelDataMap = new Map();

  // Handle subscription type logic
  const subscriptionType = advancedFilterData.subscriptionType || "WMM";
  let adjustedModelNames = [...modelNames];

  // Replace WmmModel (case-insensitive) with appropriate subscription model
  const wmmIndex = modelNames.findIndex(
    (name) => String(name).toLowerCase() === "wmmmodel"
  );
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
    if (
      !modelNames.some(
        (name) => String(name).toLowerCase() === desired.toLowerCase()
      )
    ) {
      adjustedModelNames = [...modelNames, desired];
    }
  }

  // Extract client IDs once for better performance
  const clientIds = clients.map((c) => c.id);

  // Create a Map for O(1) client lookup - use WeakMap for better memory management
  const clientMap = new Map(clients.map((client) => [client.id, client]));

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
      const filteredRecords = filterRecords(
        item.records || [],
        advancedFilterData,
        modelName
      );

      const dataObject = {
        ...item,
        records: filteredRecords,
      };

      // Add filtered records if date filters are applied
      const dateFilteredRecords = createFilteredRecords(
        item.records || [],
        advancedFilterData,
        modelName
      );

      if (dateFilteredRecords) {
        dataObject.filteredRecords = dateFilteredRecords;
      }

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
            numericCalUnit: { $toDouble: "$calunit" },
            numericCalAmt: { $toDouble: "$calamt" },
            lineTotal: {
              $multiply: [
                { $toInt: { $ifNull: ["$calqty", 0] } },
                { $toDouble: { $ifNull: ["$calunit", 0] } },
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
