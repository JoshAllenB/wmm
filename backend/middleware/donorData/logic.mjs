import { getModelInstance, ClientModel } from "../apiLogic/services/modelManager.mjs";

export async function getAllDonors() {
  const WmmModel = await getModelInstance("WmmModel");
  
  // Get all unique donor IDs
  const donorIds = await WmmModel.distinct("donorid", { donorid: { $ne: 0 } });
  
  // Get donor details from ClientModel
  const donors = await ClientModel.find(
    { id: { $in: donorIds } },
    {
      id: 1,
      clientid: "$id", // Include clientID which is the same as id
      fname: 1,
      lname: 1,
      title: 1,
      company: 1,
      address: 1,
      contactnos: 1,
      email: 1,
      _id: 0
    }
  ).lean();

  // Format donor names
  return donors.map(donor => ({
    ...donor,
    name: `${donor.fname || ""} ${donor.lname || donor.company || ""}`.trim()
  }));
}

export async function getDonorRecipientData({
  page = 1,
  pageSize = 20,
  searchTerm = "",
  sortField = "donorid",
  sortOrder = "asc",
} = {}) {
  const WmmModel = await getModelInstance("WmmModel");

  // Build search conditions
  let searchConditions = [
    { $expr: { $ne: ["$clientid", "$donorid"] } },
    { donorid: { $ne: 0 } },
  ];

  // Add search functionality for ClientID and client name/company
  if (searchTerm && searchTerm.trim()) {
    const trimmedSearchTerm = searchTerm.trim();
    
    // Build search conditions for client lookup
    const clientSearchConditions = [];
    
    // Check if search term is a number (for ID search)
    const isNumeric = !isNaN(trimmedSearchTerm) && !isNaN(parseFloat(trimmedSearchTerm));
    
    if (isNumeric) {
      // If numeric, search for exact ID match
      clientSearchConditions.push({ id: parseInt(trimmedSearchTerm) });
    }
    
    // Always search in string fields (name and company)
    clientSearchConditions.push(
      { fname: { $regex: trimmedSearchTerm, $options: "i" } },
      { lname: { $regex: trimmedSearchTerm, $options: "i" } },
      { company: { $regex: trimmedSearchTerm, $options: "i" } }
    );
    
    // First, get client IDs that match the search term
    const matchingClients = await ClientModel.find({
      $or: clientSearchConditions,
    }, { id: 1 }).lean();

    const matchingClientIds = matchingClients.map(client => client.id);
    
    if (matchingClientIds.length > 0) {
      searchConditions.push({
        $or: [
          { donorid: { $in: matchingClientIds } },
          { clientid: { $in: matchingClientIds } },
        ],
      });
    } else {
      // If no matching clients found, return empty result
      return {
        data: [],
        totalPages: 0,
        totalRecords: 0,
      };
    }
  }

  //1. Get all gift subscriptions from these donors
  const giftSubscriptions = await WmmModel.aggregate([
    {
      $match: {
        $and: searchConditions,
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
        $and: searchConditions,
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
