import { getModelInstance, ClientModel } from "../apiLogic/services/modelManager.mjs";

export async function getAllDonors() {
  // Use the isDonor flag directly from ClientModel
  const donors = await ClientModel.find(
    { isDonor: true },
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

  // Build search conditions - use isDonor flag instead of complex aggregation
  let searchConditions = [
    { donorid: { $ne: 0 } },
  ];

  // Add search functionality for donor name/company
  if (searchTerm && searchTerm.trim()) {
    const trimmedSearchTerm = searchTerm.trim();
    
    // Build search conditions for donor lookup
    const donorSearchConditions = [];
    
    // Check if search term is a number (for ID search)
    const isNumeric = !isNaN(trimmedSearchTerm) && !isNaN(parseFloat(trimmedSearchTerm));
    
    if (isNumeric) {
      // If numeric, search for exact ID match
      donorSearchConditions.push({ id: parseInt(trimmedSearchTerm) });
    }
    
    // Always search in string fields (name and company)
    donorSearchConditions.push(
      { fname: { $regex: trimmedSearchTerm, $options: "i" } },
      { lname: { $regex: trimmedSearchTerm, $options: "i" } },
      { company: { $regex: trimmedSearchTerm, $options: "i" } }
    );
    
    // Get donor IDs that match the search term and are donors
    const matchingDonors = await ClientModel.find({
      $and: [
        { isDonor: true },
        { $or: donorSearchConditions }
      ]
    }, { id: 1 }).lean();

    const matchingDonorIds = matchingDonors.map(donor => donor.id);
    
    if (matchingDonorIds.length > 0) {
      searchConditions.push({ donorid: { $in: matchingDonorIds } });
    } else {
      // If no matching donors found, return empty result
      return {
        data: [],
        totalPages: 0,
        totalRecords: 0,
      };
    }
  } else {
    // If no search term, get all donor IDs from ClientModel
    const allDonors = await ClientModel.find(
      { isDonor: true },
      { id: 1 }
    ).lean();
    
    const allDonorIds = allDonors.map(donor => donor.id);
    searchConditions.push({ donorid: { $in: allDonorIds } });
  }

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

  // Get gift subscriptions with pagination
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
    return {
      data: [],
      totalPages,
      totalRecords: total,
    };
  }

  // Get unique client IDs (both donors and recipients)
  const allClientsIds = [
    ...new Set([
      ...giftSubscriptions.map((s) => s.donorid),
      ...giftSubscriptions.map((s) => s.clientid),
    ]),
  ];

  // Fetch basic client info in one query
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

  // Create client info map
  const clientInfoMap = clients.reduce((map, client) => {
    let contactInfo = "";

    // Safely handle contactnos
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

  // Organize data hierarchically
  const result = [];
  const donorMap = new Map();

  // Group subscriptions by donor
  giftSubscriptions.forEach((sub) => {
    if (!donorMap.has(sub.donorid)) {
      donorMap.set(sub.donorid, []);
    }
    donorMap.get(sub.donorid).push(sub);
  });

  // Build the final structure
  donorMap.forEach((subscriptions, donorIDs) => {
    const recipientMap = new Map();

    // Group subscriptions by recipient
    subscriptions.forEach((sub) => {
      if (!recipientMap.has(sub.clientid)) {
        recipientMap.set(sub.clientid, []);
      }
      recipientMap.get(sub.clientid).push(sub);
    });

    // Format recipients
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

  return {
    data: result,
    totalPages,
    totalRecords: total,
  };
}

export async function getDonorStatistics() {
  // Get donor count using isDonor flag
  const donorCount = await ClientModel.countDocuments({ isDonor: true });
  
  // Get active donors (those with gift subscriptions)
  const WmmModel = await getModelInstance("WmmModel");
  const activeDonorCount = await WmmModel.distinct("donorid", { 
    donorid: { $ne: 0 } 
  }).then(ids => ids.length);
  
  // Get total gift subscriptions
  const totalGiftSubscriptions = await WmmModel.countDocuments({ 
    donorid: { $ne: 0 } 
  });
  
  // Get recent donors (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentDonors = await ClientModel.countDocuments({
    isDonor: true,
    adddate: { $gte: thirtyDaysAgo.toISOString() }
  });
  
  return {
    totalDonors: donorCount,
    activeDonors: activeDonorCount,
    totalGiftSubscriptions,
    recentDonors,
    inactiveDonors: donorCount - activeDonorCount
  };
}
