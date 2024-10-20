import {
  models,
  modelConfigs,
  clientFields,
  ClientModel,
} from "../../models/modelConfig.mjs";

async function fetchData(modelNames, filter, page, limit, pageSize) {
  const skip = (page - 1) * pageSize;
  const numericFilter = Number(filter);
  const isNumeric = !isNaN(numericFilter);
  const filterQuery = {
    $or: [
      ...(isNumeric ? [{ id: numericFilter }] : []),
      { lname: { $regex: filter, $options: "i" } },
      { fname: { $regex: filter, $options: "i" } },
      { mname: { $regex: filter, $options: "i" } },
      { sname: { $regex: filter, $options: "i" } },
    ],
  };

  try {
    // If modelNames is a string, convert it to an array
    const modelNamesArray = Array.isArray(modelNames) ? modelNames : [modelNames];

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
          return [];
        }

        return Model.aggregate([
          {
            $project: config.projectFields,
          },
          {
            $group: {
              _id: "$clientid",
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
        modelDataMap.get(clientId)[modelNamesArray[index].toLowerCase().replace("model", "") + "Data"] = item.records || item;
      });
    });

    const combinedData = clients.map((client) => ({
      ...client,
      ...modelDataMap.get(client.id),
    }));

    return { totalPages, combinedData };
  } catch (error) {
    console.error(`Error in fetchData:`, error);
    throw error;
  }
}

export default fetchData;