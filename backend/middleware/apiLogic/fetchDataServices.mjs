import ClientModel from "../../models/clients.mjs";
import {
  models,
  modelConfigs,
  clientFields,
} from "../../models/modelConfig.mjs";

const additionalModels = {
  WmmModel: () => import("../../models/wmm.mjs"),
  HrgModel: () => import("../../models/hrg.mjs"),
  FomModel: () => import("../../models/fom.mjs"),
  CalModel: () => import("../../models/cal.mjs"),
};

async function fetchDataServices(
  modelNames,
  filter,
  page,
  limit,
  pageSize,
  group,
  clientIds = null,
  advancedFilterData = {}
) {
  try {
    const skip = (page - 1) * pageSize;
    let filterQuery = { $and: [] };

    const baseFilter = [];

    // Add group filter first (modified)
    if (advancedFilterData.group || group) {
      const groupValue = advancedFilterData.group || group;
      // Only add group filter if it's a non-empty string or array with non-empty values
      if (typeof groupValue === "string" && groupValue.trim()) {
        baseFilter.push({ group: groupValue });
      } else if (
        Array.isArray(groupValue) &&
        groupValue.some((g) => g.trim())
      ) {
        // Filter out empty strings and create valid group filter
        const validGroups = groupValue.filter((g) => g.trim());
        if (validGroups.length > 0) {
          baseFilter.push({ group: { $in: validGroups } });
        }
      }
    }

    if (filter) {
      const numericFilter = Number(filter);
      const isNumeric = !isNaN(numericFilter);
      baseFilter.push({
        $or: [
          ...(isNumeric ? [{ id: numericFilter }] : []),
          { lname: { $regex: filter, $options: "i" } },
          { fname: { $regex: filter, $options: "i" } },
          { mname: { $regex: filter, $options: "i" } },
          { sname: { $regex: filter, $options: "i" } },
        ],
      });
    }

    // Add area filter
    if (advancedFilterData.area) {
      baseFilter.push({ area: advancedFilterData.area });
    }

    if (baseFilter.length > 0) {
      filterQuery.$and.push(...baseFilter);
    }

    // Replace the WMM filtering section with:

    if (
      advancedFilterData.wmmStartSubsDate ||
      advancedFilterData.wmmExpiringMonth ||
      advancedFilterData.copiesRange ||
      advancedFilterData.subsclass
    ) {
      const { default: WmmModel } = await import("../../models/wmm.mjs");
      let wmmFilterQuery = [];
      let wmmLatestSubs = null;

      // Handle copies range filtering first
      if (advancedFilterData.copiesRange) {
        wmmLatestSubs = await WmmModel.aggregate([
          { $sort: { clientid: 1, subsdate: -1 } },
          {
            $group: {
              _id: "$clientid",
              mostRecentSub: { $first: "$$ROOT" },
            },
          },
          { $replaceRoot: { newRoot: "$mostRecentSub" } },
          {
            $match: {
              $expr: {
                $let: {
                  vars: {
                    numericCopies: { $toInt: "$copies" },
                  },
                  in: {
                    $cond: {
                      if: { $eq: [advancedFilterData.copiesRange, "lt5"] },
                      then: { $lt: ["$$numericCopies", 5] },
                      else: {
                        $cond: {
                          if: {
                            $eq: [advancedFilterData.copiesRange, "5to10"],
                          },
                          then: {
                            $and: [
                              { $gte: ["$$numericCopies", 5] },
                              { $lte: ["$$numericCopies", 10] },
                            ],
                          },
                          else: {
                            $cond: {
                              if: {
                                $eq: [advancedFilterData.copiesRange, "gt10"],
                              },
                              then: { $gt: ["$$numericCopies", 10] },
                              else: {
                                $cond: {
                                  if: {
                                    $eq: [
                                      advancedFilterData.copiesRange,
                                      "custom",
                                    ],
                                  },
                                  then: {
                                    $and: [
                                      advancedFilterData.minCopies
                                        ? {
                                            $gte: [
                                              "$$numericCopies",
                                              parseInt(
                                                advancedFilterData.minCopies
                                              ),
                                            ],
                                          }
                                        : { $gte: ["$$numericCopies", 0] },
                                      advancedFilterData.maxCopies
                                        ? {
                                            $lte: [
                                              "$$numericCopies",
                                              parseInt(
                                                advancedFilterData.maxCopies
                                              ),
                                            ],
                                          }
                                        : { $gte: ["$$numericCopies", 0] },
                                    ],
                                  },
                                  else: true,
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        ]);
      }

      // Add other WMM filters to wmmFilterQuery array
      if (
        advancedFilterData.wmmStartSubsDate &&
        advancedFilterData.wmmEndSubsDate
      ) {
        // Your existing date filtering...
        wmmFilterQuery.push({
          $match: {
            $expr: {
              $and: [
                {
                  $lte: [
                    { $dateFromString: { dateString: "$subsdate" } },
                    new Date(advancedFilterData.wmmEndSubsDate),
                  ],
                },
                {
                  $gte: [
                    { $dateFromString: { dateString: "$enddate" } },
                    new Date(advancedFilterData.wmmStartSubsDate),
                  ],
                },
              ],
            },
          },
        });
      }

      if (advancedFilterData.subsclass) {
        wmmFilterQuery.push({
          $match: {
            subsclass: advancedFilterData.subsclass,
          },
        });
      }

      // Get results from other filters if any
      let wmmResults = [];
      if (wmmFilterQuery.length > 0) {
        wmmResults = await WmmModel.aggregate([
          ...wmmFilterQuery,
          {
            $group: {
              _id: "$clientid",
            },
          },
        ]);
      }

      // Combine results from both filtering methods
      let validClientIds = [];

      if (wmmLatestSubs?.length > 0) {
        validClientIds = wmmLatestSubs
          .map((result) => Number(result.clientid))
          .filter((id) => !isNaN(id));
      }

      if (wmmResults.length > 0) {
        const otherClientIds = wmmResults
          .map((result) => Number(result._id))
          .filter((id) => !isNaN(id));

        if (validClientIds.length > 0) {
          // If we have both copies filter and other filters, use intersection
          validClientIds = validClientIds.filter((id) =>
            otherClientIds.includes(id)
          );
        } else {
          // If we only have other filters, use those results
          validClientIds = otherClientIds;
        }
      }

      if (validClientIds.length > 0) {
        filterQuery.$and.push({ id: { $in: validClientIds } });
      } else {
        return {
          totalPages: 0,
          combinedData: [],
          totalCopies: 0,
          pageSpecificCopies: 0,
          totalCalQty: 0,
          totalCalAmt: 0,
          pageSpecificCalQty: 0,
          pageSpecificCalAmt: 0,
          clientServices: [],
          noData: true,
        };
      }
    }
    // After adding all filters, clean up empty $and array
    if (filterQuery.$and.length === 0) {
      delete filterQuery.$and;
    } else if (filterQuery.$and.length === 1) {
      // If there's only one condition, use it directly
      filterQuery = filterQuery.$and[0];
    }

    const totalClients = await ClientModel.countDocuments(filterQuery);
    const totalPages = Math.ceil(totalClients / pageSize);

    // Get paginated clients with proper skip and limit
    const clients = await ClientModel.find(filterQuery)
      .select(clientFields)
      .sort({ id: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const modelNamesArray = Array.isArray(modelNames)
      ? modelNames
      : [modelNames];

    const fetchPromises = modelNamesArray.map(async (modelName) => {
      const modelKey = Object.keys(models).find(
        (key) => key.toLowerCase() === modelName.toLowerCase()
      );

      if (!modelKey) {
        throw new Error(`Model not found for ${modelName}`);
      }

      const modelFunction = models[modelKey];
      let Model;
      if (typeof modelFunction === "function") {
        const importedModel = await modelFunction();
        Model = importedModel.default || importedModel;
      } else {
        Model = modelFunction;
      }

      if (Model && Model.modelName && typeof Model.aggregate === "function") {
        const config = modelConfigs[modelKey];
        if (!config) {
          console.error(`No configuration found for ${modelName}`);
          return { data: [], totalCopies: 0, pageSpecificCopies: 0 };
        }

        return Model.aggregate([
          {
            $project: config.projectFields,
          },
          {
            $group: {
              _id: "$clientid",
              recentCopies: { $first: "$copies" },
              totalCopies: { $sum: "$copies" },
              totalCalQty: { $sum: "$calqty" },
              totalCalAmt: { $sum: "$calamt" },
              subsclass: { $first: "$subsclass" },
              records: {
                $push: config.groupFields,
              },
            },
          },
        ]);
      } else {
        console.error(`Invalid model for ${modelName}. Model:`, Model);
        return [];
      }
    });

    const [modelDataArrays] = await Promise.all([Promise.all(fetchPromises)]);

    // Process model data
    const validModelDataArrays = modelDataArrays.filter(
      (array) => Array.isArray(array) && array.length > 0
    );

    const modelDataMap = new Map();
    validModelDataArrays.forEach((modelData, index) => {
      modelData.forEach((item) => {
        const clientId = item._id || item.clientid;
        if (!modelDataMap.has(clientId)) {
          modelDataMap.set(clientId, {});
        }
        modelDataMap.get(clientId)[
          modelNamesArray[index].toLowerCase().replace("model", "") + "Data"
        ] = item.records || item;
      });
    });

    const combinedData = clients.map((client) => ({
      ...client,
      ...modelDataMap.get(client.id),
    }));

    const totalCopies = validModelDataArrays.reduce((acc, modelData) => {
      modelData.forEach((item) => {
        if (clients.some((client) => client.id === item._id)) {
          acc += item.recentCopies || 0;
        }
      });
      return acc;
    }, 0);

    const pageSpecificCopies = combinedData.reduce((acc, client) => {
      const clientCopies = validModelDataArrays.reduce(
        (copiesAcc, modelData) => {
          const clientRecord = modelData.find((item) => item._id === client.id);
          return copiesAcc + (clientRecord?.recentCopies || 0);
        },
        0
      );
      return acc + clientCopies;
    }, 0);

    const totalCalQty = validModelDataArrays.reduce((acc, modelData) => {
      modelData.forEach((item) => {
        if (clients.some((client) => client.id === item._id)) {
          acc += item.totalCalQty || 0;
        }
      });
      return acc;
    }, 0);

    const totalCalAmt = validModelDataArrays.reduce((acc, modelData) => {
      modelData.forEach((item) => {
        if (clients.some((client) => client.id === item._id)) {
          acc += item.totalCalAmt || 0;
        }
      });
      return acc;
    }, 0);

    const pageSpecificCalQty = combinedData.reduce((acc, client) => {
      const clientCalQty = validModelDataArrays.reduce((qtyAcc, modelData) => {
        const clientRecord = modelData.find((item) => item._id === client.id);
        return qtyAcc + (clientRecord?.totalCalQty || 0);
      }, 0);
      return acc + clientCalQty;
    }, 0);

    const pageSpecificCalAmt = combinedData.reduce((acc, client) => {
      const clientCalAmt = validModelDataArrays.reduce((amtAcc, modelData) => {
        const clientRecord = modelData.find((item) => item._id === client.id);
        return amtAcc + (clientRecord?.totalCalAmt || 0);
      }, 0);
      return acc + clientCalAmt;
    }, 0);

    const serviceData = await Promise.all(
      Object.entries(additionalModels).map(async ([modelName, importFunc]) => {
        const { default: Model } = await importFunc();
        const serviceName = modelName
          .toLowerCase()
          .replace("model", "")
          .toUpperCase();

        const serviceSubscriptions = await Model.aggregate([
          {
            $group: {
              _id: "$clientid",
              hasData: { $sum: 1 },
            },
          },
        ]);

        return { serviceName, subscriptions: serviceSubscriptions };
      })
    );

    const clientServices = clients.map((client) => {
      const services = serviceData.reduce(
        (acc, { serviceName, subscriptions }) => {
          const hasService = subscriptions.some(
            (sub) => sub._id === client.id && sub.hasData > 0
          );
          if (hasService) {
            acc.push(serviceName);
          }
          return acc;
        },
        []
      );

      return {
        clientId: client.id,
        services,
      };
    });

    return {
      totalPages,
      totalClients,
      currentPage: page,
      pageSize,
      combinedData: clients.map((client) => ({
        ...client,
        ...modelDataMap.get(client.id),
      })),
      totalCopies,
      pageSpecificCopies,
      totalCalQty,
      totalCalAmt,
      pageSpecificCalQty,
      pageSpecificCalAmt,
      clientServices,
    };
  } catch (error) {
    console.error(`Error in fetchDataServices:`, error);
    throw error;
  }
}

export default fetchDataServices;
