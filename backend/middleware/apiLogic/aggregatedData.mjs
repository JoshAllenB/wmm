import ClientModel from "../../models/clients.mjs";

// Import all models dynamically
const models = {
  WmmModel: () => import("../../models/wmm.mjs"),
  HrgModel: () => import("../../models/hrg.mjs"),
  // Add new models here as needed
};

// Configuration for each model
const modelConfigs = {
  WmmModel: {
    projectFields: {
      clientid: 1,
      subsdate: 1,
      enddate: 1,
      renewdate: 1,
      subsyear: 1,
      copies: 1
    },
    groupFields: {
      subsdate: "$subsdate",
      enddate: "$enddate",
      renewdate: "$renewdate",
      subsyear: "$subsyear",
      copies: "$copies",
    }
  },
  HrgModel: {
    projectFields: {
      clientid: 1,
      recvdate: 1,
      renewdate: 1,
      campaigndate: 1,
      paymtref: 1,
      paymtamt: 1,
      unsubscribe: 1,
    },
    groupFields: {
      recvdate: "$recvdate",
      renewdate: "$renewdate",
      campaigndate: "$campaigndate",
      paymtref: "$paymtref",
      paymtamt: "$paymtamt",
      unsubscribe: "$unsubscribe"
    }
  },
  // Add configurations for new models here
};

async function fetchAggregatedData(filter, page, limit, pageSize) {
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

  const clientFields = "id lname fname mname sname title bdate company address street city barangay zipcode area acode contactnos cellno ofcno email type group remarks adddate adduser subscriptionFreq subscriptionStart subscriptionEnd copies metadata";

  const [totalClients, clients, ...modelData] = await Promise.all([
    ClientModel.countDocuments(filterQuery),
    ClientModel.find(filterQuery)
      .select(clientFields)
      .sort({ id: -1 })
      .limit(limit)
      .skip(skip)
      .lean(),
    ...Object.entries(models).map(async ([modelName, importFunc]) => {
      const { default: Model } = await importFunc();
      const config = modelConfigs[modelName];
      return Model.aggregate([
        {
          $project: config.projectFields
        },
        {
          $group: {
            _id: "$clientid",
            records: {
              $push: config.groupFields
            },
          },
        },
      ]);
    })
  ]);

  const totalPages = Math.ceil(totalClients / pageSize);

  const modelDataMaps = modelData.map(data => 
    new Map(data.map((item) => [item._id, item.records]))
  );

  const combinedData = clients.map((client) => ({
    ...client,
    ...Object.fromEntries(
      Object.keys(models).map((modelName, index) => [
        `${modelName.toLowerCase().replace('model', '')}Data`,
        modelDataMaps[index].get(client.id) || []
      ])
    )
  }));

  return { totalPages, combinedData };
}

export default fetchAggregatedData;