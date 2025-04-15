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
    // Cache imported models to avoid repeated dynamic imports
    const modelCache = {};

    async function getModel(modelKey) {
      if (!modelCache[modelKey]) {
        const importFunc = additionalModels[modelKey];
        if (importFunc) {
          const { default: Model } = await importFunc();
          modelCache[modelKey] = Model;
        }
      }
      return modelCache[modelKey];
    }

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

    const personalInfoFields = [
      "fname",
      "lname",
      "mname",
      "sname",
      "email",
      "address",
      "contactnos",
      "cellno",
      "ofcno",
    ];
    personalInfoFields.forEach((field) => {
      if (advancedFilterData[field]) {
        baseFilter.push({
          [field]: { $regex: advancedFilterData[field], $options: "i" },
        });
      }
    });

    // Add date filter for "Added Today" functionality
    if (advancedFilterData.adddate) {
      baseFilter.push({ adddate: advancedFilterData.adddate });
    }

    // Add area filter
    if (advancedFilterData.acode) {
      baseFilter.push({ acode: advancedFilterData.acode });
    }

    // Add type filter
    if (advancedFilterData.type) {
      baseFilter.push({ type: advancedFilterData.type });
    }

    // Add subsclass filter (already handled for WMM but might need it for general filtering)
    if (advancedFilterData.subsclass && !modelNames.includes("WMM")) {
      baseFilter.push({ subsclass: advancedFilterData.subsclass });
    }

    if (baseFilter.length > 0) {
      filterQuery.$and.push(...baseFilter);
    }

    // Optimize WMM filtering by combining queries where possible
    if (
      advancedFilterData.wmmStartSubsDate ||
      advancedFilterData.wmmExpiringMonth ||
      advancedFilterData.copiesRange ||
      advancedFilterData.subsclass
    ) {
      const WmmModel = await getModel("WmmModel");

      // Build a single aggregation pipeline instead of multiple separate queries
      const wmmPipeline = [];

      // Add match stage for all WMM filters
      const wmmMatchStage = { $match: {} };

      if (advancedFilterData.subsclass) {
        wmmMatchStage.$match.subsclass = advancedFilterData.subsclass;
      }

      if (
        advancedFilterData.wmmStartSubsDate &&
        advancedFilterData.wmmEndSubsDate
      ) {
        wmmMatchStage.$match.$expr = {
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
        };
      }

      // Only add match stage if it has conditions
      if (Object.keys(wmmMatchStage.$match).length > 0) {
        wmmPipeline.push(wmmMatchStage);
      }

      // Sort and group to get latest subscription for each client
      wmmPipeline.push(
        { $sort: { clientid: 1, subsdate: -1 } },
        {
          $group: {
            _id: "$clientid",
            mostRecentSub: { $first: "$$ROOT" },
          },
        },
        { $replaceRoot: { newRoot: "$mostRecentSub" } }
      );

      // Add copies range filtering if needed
      if (advancedFilterData.copiesRange) {
        const copiesMatchStage = {
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
                        if: { $eq: [advancedFilterData.copiesRange, "5to10"] },
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
        };
        wmmPipeline.push(copiesMatchStage);
      }

      // Get client IDs from filtered WMM data
      const wmmResults = await WmmModel.aggregate(wmmPipeline);

      if (wmmResults.length > 0) {
        const validClientIds = wmmResults
          .map((result) => Number(result.clientid))
          .filter((id) => !isNaN(id));

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

    // Optimize services filtering with Promise.all and early returns
    if (advancedFilterData.services && advancedFilterData.services.length > 0) {
      // Fetch client IDs that have the specified services in parallel
      const serviceClientIds = await Promise.all(
        advancedFilterData.services.map(async (serviceName) => {
          const modelKey = Object.keys(additionalModels).find((key) =>
            key.toLowerCase().includes(serviceName.toLowerCase())
          );

          if (!modelKey) return [];

          const Model = await getModel(modelKey);

          // Use a simpler, more efficient aggregation
          const results = await Model.aggregate([
            { $project: { clientid: 1 } },
            { $group: { _id: "$clientid" } },
          ]);

          return results.map((r) => Number(r._id)).filter((id) => !isNaN(id));
        })
      );

      // If we have multiple services selected, we need to find the intersection
      // of clients that have ALL the selected services
      if (serviceClientIds.length > 0) {
        // Start with the first service's client list
        let validServiceClientIds = serviceClientIds[0] || [];

        // For each subsequent service, keep only the clients that exist in both lists
        for (let i = 1; i < serviceClientIds.length; i++) {
          if (advancedFilterData.servicesMatchAny) {
            // OR logic - include clients that have ANY of the selected services
            validServiceClientIds = [
              ...new Set([...validServiceClientIds, ...serviceClientIds[i]]),
            ];
          } else {
            // AND logic - include only clients that have ALL selected services
            validServiceClientIds = validServiceClientIds.filter((id) =>
              serviceClientIds[i].includes(id)
            );
          }
        }

        if (validServiceClientIds.length > 0) {
          filterQuery.$and.push({ id: { $in: validServiceClientIds } });
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
    }

    // After adding all filters, clean up empty $and array
    if (filterQuery.$and.length === 0) {
      delete filterQuery.$and;
    } else if (filterQuery.$and.length === 1) {
      // If there's only one condition, use it directly
      filterQuery = filterQuery.$and[0];
    }

    // Optimize client fetching by selecting only needed fields
    const totalClients = await ClientModel.countDocuments(filterQuery);
    const totalPages = Math.ceil(totalClients / pageSize);

    // First fetch clients
    const clients = await ClientModel.find(filterQuery)
      .select(clientFields)
      .sort({ id: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    // Then fetch model data in parallel
    const modelDataArrays = await Promise.all(
      modelNames.map(async (modelName) => {
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

          // Only fetch data for clients in the current page to reduce data volume
          const clientIds = clients.map((c) => c.id);

          // For WMM model, we need to get subscription data
          if (modelKey.toLowerCase() === "wmmmodel") {
            console.log("Processing WMM model data...");
            console.log("Client IDs to match:", clientIds);

            const result = await Model.aggregate([
              {
                $match: {
                  clientid: { $in: clientIds.map((id) => parseInt(id)) }, // Convert to integers
                },
              },
              { $project: config.projectFields },
              { $sort: { clientid: 1, subsdate: -1 } },
              {
                $group: {
                  _id: "$clientid", // This will be the integer clientid
                  recentCopies: { $first: "$copies" },
                  totalCopies: { $sum: { $toInt: "$copies" } },
                  totalCalQty: { $sum: { $toInt: "$calqty" } },
                  totalCalAmt: { $sum: { $toInt: "$calamt" } },
                  subsclass: { $first: "$subsclass" },
                  subsdate: { $first: "$subsdate" },
                  enddate: { $first: "$enddate" },
                  records: {
                    $push: "$$ROOT", // Include the entire document in records
                  },
                },
              },
            ]);

            // Log the first result to see what's being returned
            if (result.length > 0) {
              console.log("WMM sample result:", {
                clientId: result[0]._id,
                recordsCount: result[0].records?.length || 0,
                hasRecords: !!result[0].records,
                firstRecord: result[0].records?.[0]
                  ? Object.keys(result[0].records[0]).join(", ")
                  : "No records",
              });
            } else {
              console.log("No WMM data found for the current clients");
            }

            return result;
          }

          // For other models
          return Model.aggregate([
            {
              $match: {
                clientid: { $in: clientIds.map((id) => parseInt(id)) }, // Convert to integers
              },
            },
            { $project: config.projectFields },
            {
              $group: {
                _id: "$clientid", // This will be the integer clientid
                recentCopies: { $first: "$copies" },
                totalCopies: { $sum: { $toInt: "$copies" } },
                totalCalQty: { $sum: { $toInt: "$calqty" } },
                totalCalAmt: { $sum: { $toInt: "$calamt" } },
                subsclass: { $first: "$subsclass" },
                records: {
                  $push: "$$ROOT", // Include the entire document in records
                },
              },
            },
          ]);
        } else {
          console.error(`Invalid model for ${modelName}. Model:`, Model);
          return [];
        }
      })
    );

    // Process model data
    const validModelDataArrays = modelDataArrays.filter(
      (array) => Array.isArray(array) && array.length > 0
    );

    console.log("Valid model data arrays count:", validModelDataArrays.length);
    validModelDataArrays.forEach((modelData, index) => {
      console.log(`Model ${modelNames[index]} has ${modelData.length} records`);
      if (modelData.length > 0) {
        console.log(
          `First record has ${
            modelData[0].records?.length || 0
          } subscription records`
        );
      }
    });

    const modelDataMap = new Map();
    validModelDataArrays.forEach((modelData, index) => {
      modelData.forEach((item) => {
        const clientId = item._id || item.clientid;
        if (!modelDataMap.has(clientId)) {
          modelDataMap.set(clientId, {});
        }

        // Create the data object with all fields from the item
        const dataObject = {
          ...item,
          records: item.records || [],
        };

        // Log the data object for WMM
        if (modelNames[index].toLowerCase() === "wmmmodel") {
          console.log(`WMM data for client ${clientId}:`, {
            recordsCount: dataObject.records.length,
            hasRecords: !!dataObject.records,
            dataKeys: Object.keys(dataObject).join(", "),
          });
        }

        // Set the data for this model
        const modelKey =
          modelNames[index].toLowerCase().replace("model", "") + "Data";
        modelDataMap.get(clientId)[modelKey] = dataObject;
      });
    });

    // Log a sample of the combined data
    const combinedData = clients.map((client) => ({
      ...client,
      ...modelDataMap.get(client.id),
    }));

    if (combinedData.length > 0) {
      const sampleClient = combinedData[0];
      console.log("Sample combined client data:", {
        id: sampleClient.id,
        hasWmmData: !!sampleClient.wmmData,
        wmmRecordsCount: sampleClient.wmmData?.records?.length || 0,
        wmmDataKeys: sampleClient.wmmData
          ? Object.keys(sampleClient.wmmData).join(", ")
          : "No WMM data",
      });
    }

    // Calculate totalCopies using only the most recent copies for each client
    let totalCopies = 0;
    let totalFilterQuery = { ...filterQuery };

    // Use Promise to get the totalCopies based on the filter
    const getTotalCopies = async () => {
      try {
        // Get all client IDs that match the filter
        const filteredClientIds = await ClientModel.find(totalFilterQuery)
          .select("id")
          .lean()
          .then((results) => results.map((client) => client.id));

        // If no clients match the filter, return 0
        if (filteredClientIds.length === 0) {
          return 0;
        }

        // Get WMM model for copies calculation
        const { default: WmmModel } = await import("../../models/wmm.mjs");

        // Build WMM query to match filtered clients
        const wmmQuery = {
          clientid: { $in: filteredClientIds.map((id) => parseInt(id)) },
        };

        // Add subscription class filter if present
        if (advancedFilterData.subsclass) {
          wmmQuery.subsclass = advancedFilterData.subsclass;
        }

        // For date filtering, we'll use a simpler approach
        // We'll get all subscriptions for the filtered clients and filter in memory
        const allSubscriptions = await WmmModel.find(wmmQuery).lean();

        // Filter subscriptions based on date if needed
        let filteredSubscriptions = allSubscriptions;
        if (
          advancedFilterData.wmmStartSubsDate &&
          advancedFilterData.wmmEndSubsDate
        ) {
          const startDate = new Date(advancedFilterData.wmmStartSubsDate);
          const endDate = new Date(advancedFilterData.wmmEndSubsDate);

          filteredSubscriptions = allSubscriptions.filter((sub) => {
            try {
              const subDate = new Date(sub.subsdate);
              const subEndDate = new Date(sub.enddate);
              return subDate <= endDate && subEndDate >= startDate;
            } catch (e) {
              console.error("Error parsing date:", e);
              return false;
            }
          });
        }

        // Sum up all copies directly
        let totalCopies = 0;
        for (const sub of filteredSubscriptions) {
          // Only count if copies is a valid number or can be converted to a valid number
          if (sub.copies) {
            const copies =
              typeof sub.copies === "string"
                ? parseInt(sub.copies, 10)
                : sub.copies;

            // Only add if it's a valid number
            if (!isNaN(copies) && copies > 0) {
              totalCopies += copies;
            }
          }
        }

        return totalCopies;
      } catch (error) {
        console.error("Error calculating total copies:", error);
        return 0;
      }
    };

    // Calculate total copies based on filter
    totalCopies = await getTotalCopies();

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
