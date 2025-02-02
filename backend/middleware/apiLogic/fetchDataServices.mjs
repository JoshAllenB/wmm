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
  const skip = (page - 1) * pageSize;

  const filterQuery = { $and: [] };

  if (filter) {
    const numericFilter = Number(filter);
    const isNumeric = !isNaN(numericFilter);
    filterQuery.$and.push({
      $or: [
        ...(isNumeric ? [{ id: numericFilter }] : []),
        { lname: { $regex: filter, $options: "i" } },
        { fname: { $regex: filter, $options: "i" } },
        { mname: { $regex: filter, $options: "i" } },
        { sname: { $regex: filter, $options: "i" } },
      ],
    });
  }

  if (group) {
    filterQuery.$and.push({ group: { $regex: group, $options: "i" } });
  }

  const advanceConditions = Object.entries(advancedFilterData)
    .filter(([_, value]) => value)
    .map(([key, value]) => {
      if (key === "startDate") {
        console.log(`Filtering with startDate: ${value}`);
        return {
          $expr: {
            $and: [
              { $eq: [{ $type: "$adddate" }, "string"] },
              {
                $gte: [
                  {
                    $dateFromString: {
                      dateString: {
                        $let: {
                          vars: {
                            matchResult: {
                              $regexFind: {
                                input: "$adddate",
                                regex: "^(\\d{1,2}/\\d{1,2}/\\d{4})",
                              },
                            },
                          },
                          in: "$$matchResult.match",
                        },
                      },
                      format: "%m/%d/%Y",
                    },
                  },
                  new Date(value),
                ],
              },
            ],
          },
        };
      }

      if (key === "endDate") {
        console.log(`Filtering with endDate: ${value}`);
        return {
          $expr: {
            $and: [
              { $eq: [{ $type: "$adddate" }, "string"] },
              {
                $lte: [
                  {
                    $dateFromString: {
                      dateString: {
                        $let: {
                          vars: {
                            matchResult: {
                              $regexFind: {
                                input: "$adddate",
                                regex: "^(\\d{1,2}/\\d{1,2}/\\d{4})",
                              },
                            },
                          },
                          in: "$$matchResult.match",
                        },
                      },
                      format: "%m/%d/%Y",
                    },
                  },
                  new Date(value),
                ],
              },
            ],
          },
        };
      }

      return { [key]: { $regex: value, $options: "i" } };
    });

  if (advanceConditions.length > 0) {
    filterQuery.$and.push(...advanceConditions);
  }

  console.log("Filter Query:", JSON.stringify(filterQuery, null, 2));

  if (clientIds) {
    filterQuery.$and.push({ id: { $in: clientIds } });
  }

  if (filterQuery.$and.length === 0) {
    delete filterQuery.$and;
  }

  const clientCount = await ClientModel.countDocuments(filterQuery);

  if (clientCount === 0) {
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

  try {
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
      } else if (Model && typeof Model.HRG === "function") {
        const config = modelConfigs[modelKey];
        if (!config) {
          console.error(`No configuration found for ${modelName}`);
          return [];
        }

        return Model.HRG.find(filterQuery).lean();
      } else {
        console.error(`Invalid model for ${modelName}. Model:`, Model);
        return [];
      }
    });

    const [totalClients, clients, ...modelDataArrays] = await Promise.all([
      ClientModel.countDocuments(filterQuery),
      ClientModel.find(filterQuery)
        .select(clientFields)
        .sort({ id: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      ...fetchPromises,
    ]);

    const totalPages = Math.ceil(totalClients / pageSize);

    const modelDataMap = new Map();
    modelDataArrays.forEach((modelData, index) => {
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

    const totalCopies = modelDataArrays.reduce((acc, modelData) => {
      modelData.forEach((item) => {
        acc += item.totalCopies || 0;
      });
      return acc;
    }, 0);

    const pageSpecificCopies = combinedData.reduce((acc, client) => {
      const clientCopies = modelDataArrays.reduce((copiesAcc, modelData) => {
        const clientRecord = modelData.find((item) => item._id === client.id);
        return copiesAcc + (clientRecord?.totalCopies || 0);
      }, 0);
      return acc + clientCopies;
    }, 0);

    const totalCalQty = modelDataArrays.reduce((acc, modelData) => {
      modelData.forEach((item) => {
        acc += item.totalCalQty || 0;
      });
      return acc;
    }, 0);

    const totalCalAmt = modelDataArrays.reduce((acc, modelData) => {
      modelData.forEach((item) => {
        acc += item.totalCalAmt || 0;
      });
      return acc;
    }, 0);

    const pageSpecificCalQty = combinedData.reduce((acc, client) => {
      const clientCalQty = modelDataArrays.reduce((qtyAcc, modelData) => {
        const clientRecord = modelData.find((item) => item._id === client.id);
        return qtyAcc + (clientRecord?.totalCalQty || 0);
      }, 0);
      return acc + clientCalQty;
    }, 0);

    const pageSpecificCalAmt = combinedData.reduce((acc, client) => {
      const clientCalAmt = modelDataArrays.reduce((amtAcc, modelData) => {
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
      combinedData,
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
