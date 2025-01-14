import {
  models,
  modelConfigs,
  clientFields,
  ClientModel,
} from "../../models/modelConfig.mjs";

async function fetchData(modelNames, filter, page, limit, pageSize, group) {
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

  if (group) {
    // Normalize group to handle potential type issues
    const normalizedGroup = String(group).trim();

    filterQuery.group = normalizedGroup;
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

    // Calculate copies for current page
    const pageSpecificCopies = combinedData.reduce((acc, client) => {
      // Sum copies only for the clients on the current page
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

    return {
      totalPages,
      combinedData,
      totalCopies,
      pageSpecificCopies,
      totalCalQty,
      totalCalAmt,
      pageSpecificCalQty,
      pageSpecificCalAmt,
    };
  } catch (error) {
    console.error(`Error in fetchData:`, error);
    throw error;
  }
}

export default fetchData;
