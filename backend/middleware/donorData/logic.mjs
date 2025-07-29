import { getModelInstance } from "../apiLogic/services/modelManager.mjs";
import ClientModel from "../../models/clients.mjs";

export async function getDonorRecipientData({
  page = 1,
  pageSize = 20,
  searchTerm = "",
  sortField = "donorid",
  sortOrder = "asc",
} = {}) {
  const WmmModel = await getModelInstance("WmmModel");

  //1. Get all gift subscriptions from these donors
  const giftSubscriptions = await WmmModel.aggregate([
    {
      $match: {
        $and: [
          { $expr: { $ne: ["$clientid", "$donorid"] } },
          { donorid: { $ne: 0 } },
        ],
      },
    },
    { $sort: { donorid: 1, subsdate: -1 } },
    // Group by donor first to get all subscriptions per donor
    {
      $group: {
        _id: "$donorid",
        subscriptions: { $push: "$$ROOT" },
      },
    },
    // Sort and paginate at the donor level
    { $sort: { _id: 1 } },
    { $skip: (page - 1) * pageSize },
    { $limit: pageSize },
    // Unwind back to get all subscriptions
    { $unwind: "$subscriptions" },
    { $replaceRoot: { newRoot: "$subscriptions" } },
  ]);

  if (giftSubscriptions.length === 0) {
    return [];
  }

  //2. Get unique client IDs (both donors and recipients)
  const allClientsIds = [
    ...new Set([
      ...giftSubscriptions.map((s) => s.donorid),
      ...giftSubscriptions.map((s) => s.clientid),
    ]),
  ];

  //3. Fetch basic client info in one query
  const clients = await ClientModel.find(
    { id: { $in: allClientsIds } },
    {
      id: 1,
      fname: 1,
      lname: 1,
      title: 1,
      company: 1,
      address: 1,
      contactnos: 1,
    }
  ).lean();

  //4. Create client info map
  const clientInfoMap = clients.reduce((map, client) => {
    let contactInfo = "";

    //Safely handle contactnos
    if (Array.isArray(client.contactnos)) {
      contactInfo = client.contactnos.filter(Boolean).join(", ");
    } else if (client.contactnos) {
      contactInfo = String(client.contactnos);
    }

    map[client.id] = {
      name: `${client.title || ""} ${client.fname || ""} ${
        client.lname || client.company || ""
      }`.trim(),
      address: client.address,
      contact: contactInfo,
    };
    return map;
  }, {});

  //5. Organize data hierarchically
  const result = [];
  const donorMap = new Map();

  //Group subscriptions by donor
  giftSubscriptions.forEach((sub) => {
    if (!donorMap.has(sub.donorid)) {
      donorMap.set(sub.donorid, []);
    }
    donorMap.get(sub.donorid).push(sub);
  });

  //Build the final structure
  donorMap.forEach((subscriptions, donorIDs) => {
    const recipientMap = new Map();

    //Group susbcriptions by recipient
    subscriptions.forEach((sub) => {
      if (!recipientMap.has(sub.clientid)) {
        recipientMap.set(sub.clientid, []);
      }
      recipientMap.get(sub.clientid).push(sub);
    });

    //Format recipients
    const recipients = [];
    recipientMap.forEach((subs, recipientId) => {
      recipients.push({
        id: recipientId,
        ...(clientInfoMap[recipientId] || {}),
        subscriptions: subs.map((sub) => ({
          id: sub.id,
          subsdate: sub.subsdate,
          expiry: sub.expiry,
          copies: sub.copies,
          remarks: sub.remarks,
          subsclass: sub.subsclass,
        })),
      });
    });

    result.push({
      donor: {
        id: donorIDs,
        ...(clientInfoMap[donorIDs] || {}),
      },
      recipients,
    });
  });

  // Get total count of unique donors for pagination
  const totalRecords = await WmmModel.aggregate([
    {
      $match: {
        $and: [
          { $expr: { $ne: ["$clientid", "$donorid"] } },
          { donorid: { $ne: 0 } },
        ],
      },
    },
    {
      $group: {
        _id: "$donorid",
      },
    },
    { $count: "total" },
  ]);

  const total = totalRecords[0]?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    data: result,
    totalPages,
    totalRecords: total,
  };
}
