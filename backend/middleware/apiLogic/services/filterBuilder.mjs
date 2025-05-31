import { getModelInstance } from './modelManager.mjs';
import { parseDate } from './helpers.mjs';

export async function buildFilterQuery(filter, group, advancedFilterData = {}) {
  let filterQuery = { $and: [] };
  const baseFilter = [];


  // Add group filter
  if (advancedFilterData.group || group) {
    const groupValue = advancedFilterData.group || group;
    if (typeof groupValue === "string" && groupValue.trim()) {
      baseFilter.push({ group: groupValue });
    } else if (Array.isArray(groupValue) && groupValue.some((g) => g.trim())) {
      const validGroups = groupValue.filter((g) => g.trim());
      if (validGroups.length > 0) {
        baseFilter.push({ group: { $in: validGroups } });
      }
    }
  }

  // Add exclude SPack clients filter
  if (advancedFilterData.excludeSPackClients) {
    baseFilter.push({
      group: {
        $not: {
          $regex: "SPack",
          $options: "i",
        },
      },
    });
  }

  // Add basic text search filter
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
        { company: { $regex: filter, $options: "i" } },
      ],
    });
  }

  // Add full name search
  if (advancedFilterData.fullName) {
    const fullName = advancedFilterData.fullName.trim();
    const nameParts = fullName.split(/\s+/);

    if (nameParts.length > 0) {
      const nameQueries = [];
      nameQueries.push({ company: { $regex: fullName, $options: "i" } });

      if (nameParts.length > 1) {
        nameQueries.push({
          $and: nameParts.map((part) => ({
            $or: [
              { fname: { $regex: part, $options: "i" } },
              { lname: { $regex: part, $options: "i" } },
              { mname: { $regex: part, $options: "i" } },
              { sname: { $regex: part, $options: "i" } },
              { company: { $regex: part, $options: "i" } },
            ],
          })),
        });
      }

      baseFilter.push({ $or: nameQueries });
      filterQuery.__addScoring = nameParts;
    }
  }

  // Add client ID filters
  if (advancedFilterData.clientId) {
    const clientId = parseInt(advancedFilterData.clientId);
    if (!isNaN(clientId)) {
      baseFilter.push({ id: clientId });
    }
  }

  // Add client ID inclusion/exclusion filters
  if (Array.isArray(advancedFilterData.includeClientIds) && advancedFilterData.includeClientIds.length > 0) {
    const validIds = advancedFilterData.includeClientIds
      .map((id) => (typeof id === "string" ? parseInt(id) : id))
      .filter((id) => !isNaN(id));

    if (validIds.length > 0) {
      baseFilter.push({ id: { $in: validIds } });
    }
  }

  if (Array.isArray(advancedFilterData.excludeClientIds) && advancedFilterData.excludeClientIds.length > 0) {
    const validIds = advancedFilterData.excludeClientIds
      .map((id) => (typeof id === "string" ? parseInt(id) : id))
      .filter((id) => !isNaN(id));

    if (validIds.length > 0) {
      baseFilter.push({ id: { $nin: validIds } });
    }
  }

  // Add service-specific filters
  await addServiceFilters(baseFilter, advancedFilterData);

  // Add personal info field filters
  addPersonalInfoFilters(baseFilter, advancedFilterData);

  // Add date filters
  await addDateFilters(baseFilter, advancedFilterData);

  // Add area and type filters
  addAreaAndTypeFilters(baseFilter, advancedFilterData);

  // Clean up and finalize filter query
  if (baseFilter.length > 0) {
    filterQuery.$and.push(...baseFilter);
  }

  if (filterQuery.$and.length === 0) {
    delete filterQuery.$and;
  } else if (filterQuery.$and.length === 1) {
    filterQuery = filterQuery.$and[0];
  }

  return filterQuery;
}

async function addServiceFilters(baseFilter, advancedFilterData) {
  if (advancedFilterData.paymentRef) {
    const WmmModel = await getModelInstance('WmmModel');
    const paymentRef = advancedFilterData.paymentRef.trim();
    let refPattern = paymentRef;

    const msMatch = paymentRef.match(/^([A-Z]{2})\s*(\d{6})/i);
    if (msMatch) {
      const prefix = msMatch[1].toUpperCase();
      const numbers = msMatch[2];
      refPattern = `${prefix}.*${numbers.replace(/^0+/, "")}`;
    }

    const clientsWithPaymentRef = await WmmModel.find({
      paymtref: { $regex: refPattern, $options: "i" },
    }).distinct("clientid");

    if (clientsWithPaymentRef.length > 0) {
      const validClientIds = clientsWithPaymentRef
        .map((id) => parseInt(id))
        .filter((id) => !isNaN(id));

      if (validClientIds.length > 0) {
        baseFilter.push({ id: { $in: validClientIds } });
      } else {
        baseFilter.push({ id: -1 });
      }
    } else {
      baseFilter.push({ id: -1 });
    }
  }
}

function addPersonalInfoFilters(baseFilter, advancedFilterData) {
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
}

async function addDateFilters(baseFilter, advancedFilterData) {
  // Handle WMM Date Encoded Filter (adddate)
  if (advancedFilterData.startDate || advancedFilterData.endDate) {
    try {
      const WmmModel = await getModelInstance('WmmModel');
      const FomModel = await getModelInstance('FomModel');
      const HrgModel = await getModelInstance('HrgModel');
      const CalModel = await getModelInstance('CalModel');

      // Convert dates to proper format for comparison
      const startDate = advancedFilterData.startDate ? parseDate(advancedFilterData.startDate) : null;
      const endDate = advancedFilterData.endDate ? parseDate(advancedFilterData.endDate) : null;

      // Set end date to end of day for inclusive comparison
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
      }

      // Create base pipeline for date filtering
      const createDatePipeline = (dateField) => [
        {
          $match: {
            [dateField]: { $exists: true, $ne: null }
          }
        },
        {
          $addFields: {
            parsedDate: {
              $dateFromString: {
                dateString: `$${dateField}`,
                format: "%m/%d/%Y %H:%M:%S",
                timezone: "UTC",
                onError: null,
                onNull: null
              }
            }
          }
        },
        {
          $match: {
            parsedDate: {
              ...(startDate && { $gte: startDate }),
              ...(endDate && { $lte: endDate })
            }
          }
        },
        {
          $group: {
            _id: "$clientid"
          }
        }
      ];

      // Execute aggregation for each model in parallel
      const [wmmClients, fomClients, hrgClients, calClients] = await Promise.all([
        WmmModel.aggregate(createDatePipeline('adddate')),
        FomModel.aggregate(createDatePipeline('adddate')),
        HrgModel.aggregate(createDatePipeline('adddate')),
        CalModel.aggregate(createDatePipeline('adddate'))
      ]);

      // Combine all client IDs
      const matchingClientIds = [...new Set([
        ...wmmClients.map(c => Number(c._id)),
        ...fomClients.map(c => Number(c._id)),
        ...hrgClients.map(c => Number(c._id)),
        ...calClients.map(c => Number(c._id))
      ])].filter(id => !isNaN(id));

      if (matchingClientIds.length > 0) {
        baseFilter.push({ id: { $in: matchingClientIds } });
      } else {
        baseFilter.push({ id: -1 }); // No matches
      }
    } catch (error) {
      console.error("Error in date filtering:", error);
      baseFilter.push({ id: -1 });
    }
  }

  // Handle WMM Active Subscription Filter
  if (advancedFilterData.wmmStartSubsDate && advancedFilterData.wmmEndSubsDate) {
    try {
      const WmmModel = await getModelInstance('WmmModel');
      const startDate = parseDate(advancedFilterData.wmmStartSubsDate);
      const endDate = parseDate(advancedFilterData.wmmEndSubsDate);

      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
      }

      const pipeline = [
        // Match records with valid dates
        {
          $match: {
            subsdate: { $exists: true, $ne: null },
            enddate: { $exists: true, $ne: null }
          }
        },
        // Convert string dates to Date objects
        {
          $addFields: {
            subsDateObj: {
              $dateFromString: {
                dateString: "$subsdate",
                format: "%m/%d/%Y %H:%M:%S",
                timezone: "UTC"
              }
            },
            endDateObj: {
              $dateFromString: {
                dateString: "$enddate",
                format: "%m/%d/%Y %H:%M:%S",
                timezone: "UTC"
              }
            }
          }
        },
        // Match subscriptions that are active during the target period
        {
          $match: {
            $expr: {
              $and: [
                { $lte: ["$subsDateObj", endDate] },
                { $gte: ["$endDateObj", startDate] }
              ]
            }
          }
        },
        // Group by client to get unique clients
        {
          $group: {
            _id: "$clientid",
            subscriptions: {
              $push: {
                subsdate: "$subsDateObj",
                enddate: "$endDateObj"
              }
            }
          }
        }
      ];

      const activeClients = await WmmModel.aggregate(pipeline);
      const validClientIds = activeClients.map(c => Number(c._id)).filter(id => !isNaN(id));

      if (validClientIds.length > 0) {
        baseFilter.push({ id: { $in: validClientIds } });
      } else {
        baseFilter.push({ id: -1 });
      }
    } catch (error) {
      console.error("Error in WMM active subscription filtering:", error);
      baseFilter.push({ id: -1 });
    }
  }

  // Handle WMM Expiring Subscription Filter
  if (advancedFilterData.wmmStartEndDate && advancedFilterData.wmmEndEndDate) {
    try {
      const WmmModel = await getModelInstance('WmmModel');
      const startDate = parseDate(advancedFilterData.wmmStartEndDate);
      const endDate = parseDate(advancedFilterData.wmmEndEndDate);

      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
      }

      const pipeline = [
        // Initial match for valid dates
        {
          $match: {
            enddate: { $exists: true, $ne: null }
          }
        },
        // Convert string dates to Date objects
        {
          $addFields: {
            endDateObj: {
              $dateFromString: {
                dateString: "$enddate",
                format: "%m/%d/%Y %H:%M:%S",
                timezone: "UTC"
              }
            }
          }
        },
        // Match subscriptions expiring in the target period
        {
          $match: {
            $expr: {
              $and: [
                { $gte: ["$endDateObj", startDate] },
                { $lte: ["$endDateObj", endDate] }
              ]
            }
          }
        },
        // Sort by client and subscription date
        {
          $sort: {
            clientid: 1,
            subsdate: -1
          }
        },
        // Group by client
        {
          $group: {
            _id: "$clientid",
            expiryDate: { $first: "$endDateObj" },
            allDates: {
              $push: {
                subsdate: "$subsdate",
                enddate: "$enddate"
              }
            }
          }
        },
        // Filter out clients with newer subscriptions
        {
          $match: {
            $expr: {
              $not: {
                $anyElementTrue: {
                  $map: {
                    input: "$allDates",
                    as: "date",
                    in: {
                      $and: [
                        { $gt: ["$$date.subsdate", "$expiryDate"] },
                        { $gt: ["$$date.enddate", endDate] }
                      ]
                    }
                  }
                }
              }
            }
          }
        }
      ];

      const expiringClients = await WmmModel.aggregate(pipeline);
      const validClientIds = expiringClients.map(c => Number(c._id)).filter(id => !isNaN(id));

      if (validClientIds.length > 0) {
        baseFilter.push({ id: { $in: validClientIds } });
      } else {
        baseFilter.push({ id: -1 });
      }
    } catch (error) {
      console.error("Error in WMM expiring subscription filtering:", error);
      baseFilter.push({ id: -1 });
    }
  }
}

function addAreaAndTypeFilters(baseFilter, advancedFilterData) {
  if (advancedFilterData.acode) {
    baseFilter.push({ acode: advancedFilterData.acode });
  }

  if (Array.isArray(advancedFilterData.areas) && advancedFilterData.areas.length > 0) {
    if (advancedFilterData.exactAreaMatch) {
      baseFilter.push({
        acode: {
          $in: advancedFilterData.areas,
        },
      });
    } else {
      const areaRegexPatterns = advancedFilterData.areas.map(
        (area) => new RegExp(`^${area}$|^${area}\\s|^${area}$`, "i")
      );

      baseFilter.push({
        acode: {
          $in: areaRegexPatterns,
        },
      });
    }
  }

  if (advancedFilterData.type) {
    baseFilter.push({ type: advancedFilterData.type });
  }
} 