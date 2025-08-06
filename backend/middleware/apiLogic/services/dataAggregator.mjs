import { getModelInstance } from "./modelManager.mjs";

export async function aggregateClientData(
  clients,
  modelNames,
  advancedFilterData = {}
) {
  const modelDataMap = new Map();

  // Handle subscription type logic
  const subscriptionType = advancedFilterData.subscriptionType || "WMM";
  let adjustedModelNames = [...modelNames];

  // Replace WmmModel with appropriate subscription model
  if (modelNames.includes("WmmModel")) {
    adjustedModelNames = modelNames.filter((name) => name !== "WmmModel");

    switch (subscriptionType) {
      case "Promo":
        adjustedModelNames.push("PromoModel");
        break;
      case "Complimentary":
        adjustedModelNames.push("ComplimentaryModel");
        break;
      default: // WMM
        adjustedModelNames.push("WmmModel");
    }
  }

  // Process model data in parallel
  const modelDataArrays = await Promise.all(
    adjustedModelNames.map(async (modelName) => {
      const Model = await getModelInstance(modelName);
      const clientIds = clients.map((c) => c.id);

      // Build aggregation pipeline based on model type
      const pipeline = buildAggregationPipeline(
        Model.modelName,
        clientIds,
        advancedFilterData
      );
      return Model.aggregate(pipeline);
    })
  );

  // Process and map the aggregated data
  modelDataArrays.forEach((modelData, index) => {
    modelData.forEach((item) => {
      const clientId = item._id || item.clientid;
      if (!modelDataMap.has(clientId)) {
        modelDataMap.set(clientId, {});
      }

      const dataObject = {
        ...item,
        records: filterRecords(
          item.records || [],
          advancedFilterData,
          adjustedModelNames[index]
        ),
      };

      // Map each subscription type to its own data array
      const modelType = adjustedModelNames[index].toLowerCase();
      let serviceType;

      // Handle subscription types
      if (modelType.includes("wmm")) {
        serviceType = "wmmData";
      } else if (modelType.includes("promo")) {
        serviceType = "promoData";
      } else if (modelType.includes("complimentary")) {
        serviceType = "compData";
      } else {
        serviceType = normalizeServiceType(adjustedModelNames[index]);
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

  // Create combinedData by merging client data with model data
  const combinedData = clients.map((client) => {
    const clientData = {
      ...client,
      ...modelDataMap.get(client.id),
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

  return {
    combinedData,
    modelDataMap,
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