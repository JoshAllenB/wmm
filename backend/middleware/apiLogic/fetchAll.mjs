import ClientModel from "../../models/clients.mjs";

const models = {
  WmmModel: () => import("../../models/wmm.mjs"),
  HrgModel: () => import("../../models/hrg.mjs"),
  FomModel: () => import("../../models/fom.mjs"),
  CalModel: () => import("../../models/cal.mjs"),
};

const modelConfigs = {
  WmmModel: {
    projectFields: {
      clientid: 1,
      subsdate: 1,
      enddate: 1,
      renewdate: 1,
      subsyear: 1,
      copies: 1,
    },
    groupFields: {
      subsdate: "$subsdate",
      enddate: "$enddate",
      renewdate: "$renewdate",
      subsyear: "$subsyear",
      copies: "$copies",
    },
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
      unsubscribe: "$unsubscribe",
    },
  },
  FomModel: {
    projectFields: {
      clientid: 1,
      recvdate: 1,
      remarks: 1,
      paymtamt: 1,
      unsubscribe: 1,
    },
    groupFields: {
      recvdate: "$recvdate",
      remarks: "$remarks",
      paymtamt: "$aymtamt",
      unsubscribe: "$unsubscribe",
    },
  },
  CalModel: {
    projectFields: {
      clientid: 1,
      recvdate: 1,
      caltype: 1,
      calqty: 1,
      calamt: 1,
      paymtref: 1,
      paymtamt: 1,
      paymtform: 1,
      paymtdate: 1,
      adddate: 1,
      adduser: 1,
    },
    groupFields: {
      recvdate: "$recvdate",
      caltype: "$caltype",
      calqty: "$calqty",
      calamt: "$calamt",
      paymtref: "$paymtref",
      paymtamt: "$paymtamt",
      paymtform: "$paymtform",
      paymtdate: "$paymtdate",
      adddate: "$adddate",
      adduser: "$adduser",
    },
  },
};

async function fetchAll(filter, page, limit, pageSize) {
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

  const clientFields =
    "id lname fname mname sname title bdate company address street city barangay zipcode area acode contactnos cellno ofcno email type group remarks adddate adduser metadata";

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
    }),
  ]);

  const totalPages = Math.ceil(totalClients / pageSize);

  const totalCopies = modelData.reduce((acc, modelDataArray) => {
    modelDataArray.forEach((item) => {
      acc += item.totalCopies || 0;
    });
    return acc;
  }, 0);

  const totalCalQty = modelData.reduce((acc, modelDataArray) => {
    modelDataArray.forEach((item) => {
      acc += item.totalCalQty || 0;
    });
    return acc;
  }, 0);

  const totalCalAmt = modelData.reduce((acc, modelDataArray) => {
    modelDataArray.forEach((item) => {
      acc += item.totalCalAmt || 0;
    });
    return acc;
  }, 0);

  const modelDataMaps = modelData.map(
    (data) => new Map(data.map((item) => [item._id, item.records]))
  );

  const combinedData = clients.map((client) => ({
    ...client,
    ...Object.fromEntries(
      Object.keys(models).map((modelName, index) => [
        `${modelName.toLowerCase().replace("model", "")}Data`,
        modelDataMaps[index].get(client.id) || [],
      ])
    ),
  }));

  const pageSpecificCalQty = combinedData.reduce((acc, client) => {
    const clientCalQty = modelDataMaps.reduce((qtyAcc, modelDataMap) => {
      const clientRecords = modelDataMap.get(client.id) || [];
      return (
        qtyAcc +
        clientRecords.reduce((sum, record) => sum + (record.calqty || 0), 0)
      );
    }, 0);
    return acc + clientCalQty;
  }, 0);

  const pageSpecificCalAmt = combinedData.reduce((acc, client) => {
    const clientCalAmt = modelDataMaps.reduce((amtAcc, modelDataMap) => {
      const clientRecords = modelDataMap.get(client.id) || [];
      return (
        amtAcc +
        clientRecords.reduce((sum, record) => sum + (record.calamt || 0), 0)
      );
    }, 0);
    return acc + clientCalAmt;
  }, 0);

  return {
    totalPages,
    combinedData,
    totalCopies,
    totalCalQty,
    totalCalAmt,
    pageSpecificCalQty,
    pageSpecificCalAmt,
  };
}

export default fetchAll;
