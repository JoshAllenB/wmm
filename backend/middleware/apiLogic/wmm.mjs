import ClientModel from "../../models/clients.mjs";
import WmmModel from "../../models/wmm.mjs";

async function fetchWmmData(filter, page, limit, pageSize) {
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

  const [totalClients, clients, wmmData] = await Promise.all([
    ClientModel.countDocuments(filterQuery),
    ClientModel.find(filterQuery)
      .select(
        "id lname fname mname sname title bdate company address street city barangay zipcode area acode contactnos cellno ofcno email type group remarks adddate adduser subscriptionFreq subscriptionStart subscriptionEnd copies metadata",
      )
      .sort({ id: -1 })
      .limit(limit)
      .skip(skip)
      .lean(),
    WmmModel.aggregate([
      {
        $group: {
          _id: "$clientid",
          records: {
            $push: {
              subsdate: "$subsdate",
              enddate: "$enddate",
              renewdate: "$renewdate",
              subsyear: "$subsyear",
              copies: "$copies",
              adduser: "$adduser",
              adddate: "$adddate",
              metadata: "$metadata",
            },
          },
        },
      },
    ]),
  ]);

  const totalPages = Math.ceil(totalClients / pageSize);
  const wmmDataMap = new Map(wmmData.map((item) => [item._id, item.records]));

  const combinedData = clients.map((client) => ({
    ...client,
    wmmData: (wmmDataMap.get(client.id) || []).map((record) => ({
      ...record,
      metadata: {
        addedBy:
          record.metadata?.addedBy || client.metadata?.addedBy || "Unknown",
        addedAt: record.metadata?.addedAt
          ? new Date(record.metadata.addedAt)
          : client.metadata?.addedAt || new Date(),
        editedBy:
          record.metadata?.editedBy || client.metadata?.editedBy || "Unknown",
        editedAt: record.metadata?.editedAt
          ? new Date(record.metadata.editedAt)
          : client.metadata?.editedAt,
      },
    })),
  }));

  return { totalPages, combinedData };
}

export default fetchWmmData;
