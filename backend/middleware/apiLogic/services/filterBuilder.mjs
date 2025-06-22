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

  // Add copies filter
  if (advancedFilterData.copiesRange) {
    const WmmModel = await getModelInstance('WmmModel');
    let copiesQuery = {};

    // Create aggregation pipeline to get most recent record for each client
    const pipeline = [
      // First stage: Match only records with valid dates
      {
        $match: {
          subsdate: { $exists: true, $ne: null }
        }
      },
      // Second stage: Convert subsdate string to Date for proper sorting
      {
        $addFields: {
          subsDateObj: {
            $dateFromString: {
              dateString: "$subsdate",
              format: "%Y-%m-%d",
              onError: null,
              onNull: null
            }
          }
        }
      },
      // Only consider records with valid date
      { $match: { subsDateObj: { $ne: null } } },
      // Sort by client ID and subscription date (newest first)
      { $sort: { clientid: 1, subsDateObj: -1 } },
      // Group by client ID to get most recent record
      {
        $group: {
          _id: "$clientid",
          latestCopies: { $first: "$copies" }
        }
      }
    ];

    // Add match stage based on copies range
    switch (advancedFilterData.copiesRange) {
      case '1':
        pipeline.push({ $match: { latestCopies: 1 } });
        break;
      case '2':
        pipeline.push({ $match: { latestCopies: 2 } });
        break;
      case 'gt1':
        pipeline.push({ $match: { latestCopies: { $gt: 1 } } });
        break;
      case 'custom':
        const matchStage = { $match: {} };
        if (advancedFilterData.minCopies) {
          matchStage.$match.latestCopies = { $gte: parseInt(advancedFilterData.minCopies) };
        }
        if (advancedFilterData.maxCopies) {
          matchStage.$match.latestCopies = { ...matchStage.$match.latestCopies, $lte: parseInt(advancedFilterData.maxCopies) };
        }
        if (Object.keys(matchStage.$match).length > 0) {
          pipeline.push(matchStage);
        }
        break;
    }

    // Execute aggregation
    const clientsWithCopies = await WmmModel.aggregate(pipeline);
    const clientIds = clientsWithCopies.map(c => c._id);

    if (clientIds.length > 0) {
      baseFilter.push({ id: { $in: clientIds } });
    } else {
      baseFilter.push({ id: -1 }); // No matches
    }
  }

  // Add name combination filter
  if (advancedFilterData.nameCombination) {
    const nameParts = advancedFilterData.nameCombination.split(/\s+/);
    if (nameParts.length > 0) {
      const nameQueries = [];
      
      // Add exact name combination match
      nameQueries.push({
        $and: [
          { fname: { $regex: `^${nameParts[0]}$`, $options: 'i' } },
          ...(nameParts.length > 1 ? [{ lname: { $regex: `^${nameParts[1]}$`, $options: 'i' } }] : []),
          ...(nameParts.length > 2 ? [{ mname: { $regex: `^${nameParts[2]}$`, $options: 'i' } }] : []),
          ...(nameParts.length > 3 ? [{ sname: { $regex: `^${nameParts[3]}$`, $options: 'i' } }] : [])
        ]
      });

      // Add partial matches
      nameQueries.push({
        $or: nameParts.map(part => ({
          $or: [
            { fname: { $regex: part, $options: 'i' } },
            { lname: { $regex: part, $options: 'i' } },
            { mname: { $regex: part, $options: 'i' } },
            { sname: { $regex: part, $options: 'i' } }
          ]
        }))
      });

      baseFilter.push({ $or: nameQueries });
    }
  }

  // Add area code combination filter
  if (advancedFilterData.areaCombination) {
    const areaParts = advancedFilterData.areaCombination.split(/\s+/);
    if (areaParts.length > 0) {
      const areaQueries = [];
      
      // Add exact area code combination match
      areaQueries.push({
        $and: areaParts.map(part => ({
          acode: { $regex: `^${part}$`, $options: 'i' }
        }))
      });

      // Add partial matches
      areaQueries.push({
        $or: areaParts.map(part => ({
          acode: { $regex: part, $options: 'i' }
        }))
      });

      baseFilter.push({ $or: areaQueries });
    }
  }

  // Add HRG/FOM specific active subscription filter
  if (advancedFilterData.hrgFomActiveSubscription) {
    const HrgModel = await getModelInstance('HrgModel');
    const FomModel = await getModelInstance('FomModel');

    // Get active HRG subscriptions
    const activeHrgClients = await HrgModel.find({
      unsubscribe: { $ne: 1 },
      recvdate: { $exists: true, $ne: null }
    }).distinct('clientid');

    // Get active FOM subscriptions
    const activeFomClients = await FomModel.find({
      unsubscribe: { $ne: 1 },
      recvdate: { $exists: true, $ne: null }
    }).distinct('clientid');

    // Combine unique client IDs
    const activeClientIds = [...new Set([...activeHrgClients, ...activeFomClients])]
      .map(id => parseInt(id))
      .filter(id => !isNaN(id));

    if (activeClientIds.length > 0) {
      baseFilter.push({ id: { $in: activeClientIds } });
    } else {
      baseFilter.push({ id: -1 });
    }
  }

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
  // Handle payment reference filter
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

  // Handle service filtering
  if (advancedFilterData.services) {
    try {
      const WmmModel = await getModelInstance('WmmModel');
      const FomModel = await getModelInstance('FomModel');
      const HrgModel = await getModelInstance('HrgModel');
      const CalModel = await getModelInstance('CalModel');

      // Ensure services is an array - handle both string and array inputs
      const services = Array.isArray(advancedFilterData.services) 
        ? advancedFilterData.services 
        : typeof advancedFilterData.services === 'string'
          ? [advancedFilterData.services]
          : [];

      const subscriptionStatus = advancedFilterData.subscriptionStatus || 'all';

      // Get clients for each selected service
      let targetClients = new Set();
      let isFirstService = true;

      // First, get all clients for each service
      const serviceClientsMap = {};
      for (const service of services) {
        const Model = {
          'WMM': WmmModel,
          'FOM': FomModel,
          'HRG': HrgModel,
          'CAL': CalModel
        }[service.toUpperCase()];  // Ensure case-insensitive matching

        if (!Model) continue;

        // Get clients for this service with subscription status
        let query = {};
        
        // Special handling for HRG and FOM subscription status
        if ((service.toUpperCase() === 'HRG' || service.toUpperCase() === 'FOM') && subscriptionStatus !== 'all') {
          if (subscriptionStatus === 'active') {
            // For active subscriptions, only check the most recent record for each client
            const activeClients = await Model.aggregate([
              // First stage: Match only records with valid receive date and not unsubscribed
              { $match: {} },
              // Second stage: Convert recvdate string to Date for proper sorting
              {
                $addFields: {
                  recvDateObj: {
                    $dateFromString: {
                      dateString: "$recvdate",
                      format: "%Y-%m-%d",
                      onError: null,
                      onNull: null
                    }
                  }
                }
              },
              // Only consider records with valid date
              { $match: { recvDateObj: { $ne: null}}},
              // Sort by client ID and receive date (newest first)
              { $sort: { clientid: 1, recvDateObj: -1 }},
               // Group by client ID to get most recent record
              {
                $group: {
                  _id: "$clientid",
                  lastUnsubscribe: { $first: "$unsubscribe" },
                  lastRecvDate: { $first: "$recvdate" }
                }
              },
              {
                $match: {
                  $and: [
                    { 
                      $or: [
                        { lastUnsubscribe: { $exists: false } },
                        { lastUnsubscribe: { $ne: 1 } }
                      ]
                    },
                    { lastRecvDate: { $exists: true, $ne: null } }
                  ]
                }
              },
              // Final stage: Project only the client ID
              {
                $project: {
                  _id: 1
                }
              }
            ]);
            
            const clientIds = activeClients.map(c => c._id);
            if (clientIds.length > 0) {
              serviceClientsMap[service.toUpperCase()] = new Set(clientIds);
            }
            continue;
          } else if (subscriptionStatus === 'unsubscribed') {
            // For unsubscribed status, get clients whose latest record is unsubscribed
            const unsubscribedClients = await Model.aggregate([
              // First stage: Match only records with valid receive date
              {$match: {}},
              // Second stage: Convert recvdate string to Date for proper sorting
              {
                $addFields: {
                  recvDateObj: {
                    $dateFromString: {
                      dateString: "$recvdate",
                      format: "%Y-%m-%d",
                      onError: null,
                      onNull: null
                    }
                  }
                }
              },
              // Third stage: Remove records with invalid converted dates
              {
                $match: {
                  recvDateObj: { $ne: null }
                }
              },
              // Fourth stage: Sort by client ID and converted receive date (descending)
              {
                $sort: { 
                  clientid: 1, 
                  recvDateObj: -1
                }
              },
              // Fifth stage: Group by client ID and take first (most recent) record
              {
                $group: {
                  _id: "$clientid",
                  lastUnsubscribe: { $first: "$unsubscribe" },
                  lastRecvDate: { $first: "$recvdate" }
                }
              },
              // Sixth stage: Only keep clients whose most recent record is unsubscribed
              {
                $match: {
                  lastUnsubscribe: 1,
                  lastRecvDate: { $exists: true, $ne: null }
                }
              },
              // Final stage: Project only the client ID
              {
                $project: {
                  _id: 1
                }
              }
            ]);
            
            const clientIds = unsubscribedClients.map(c => c._id);
            if (clientIds.length > 0) {
              serviceClientsMap[service.toUpperCase()] = new Set(clientIds);
            }
            continue;
          }
        } else {
          // For other services or when no subscription status filter
          if (subscriptionStatus === 'active') {
            query.unsubscribe = { $ne: 1 };
          } else if (subscriptionStatus === 'unsubscribed') {
            query.unsubscribe = 1;
          }
        }
        
        const serviceClients = await Model.distinct('clientid', query);
        if (serviceClients.length > 0) {
          serviceClientsMap[service.toUpperCase()] = new Set(serviceClients);
        }
      }

      // Special handling for FOM and HRG to ensure exclusivity
      if (serviceClientsMap.FOM || serviceClientsMap.HRG) {
        // If both FOM and HRG are selected, they should be mutually exclusive
        if (serviceClientsMap.FOM && serviceClientsMap.HRG) {
          const fomOnlyClients = new Set(
            [...serviceClientsMap.FOM].filter(id => !serviceClientsMap.HRG.has(id))
          );
          const hrgOnlyClients = new Set(
            [...serviceClientsMap.HRG].filter(id => !serviceClientsMap.FOM.has(id))
          );
          targetClients = new Set([...fomOnlyClients, ...hrgOnlyClients]);
        }
        // If only FOM is selected, exclude any clients that have HRG
        else if (serviceClientsMap.FOM) {
          const hrgClients = await HrgModel.distinct('clientid', {});
          targetClients = new Set(
            [...serviceClientsMap.FOM].filter(id => !hrgClients.includes(id))
          );
        }
        // If only HRG is selected, exclude any clients that have FOM
        else if (serviceClientsMap.HRG) {
          const fomClients = await FomModel.distinct('clientid', {});
          targetClients = new Set(
            [...serviceClientsMap.HRG].filter(id => !fomClients.includes(id))
          );
        }
      }
      // For other services or combinations, use the original intersection logic
      else {
        for (const [service, clients] of Object.entries(serviceClientsMap)) {
          if (isFirstService) {
            targetClients = clients;
            isFirstService = false;
          } else {
            // Intersect with existing clients if we want clients with all services
            targetClients = new Set(
              [...targetClients].filter(id => clients.has(id))
            );
          }
        }
      }

      // Convert Set to Array and add to filter
      const finalClients = [...targetClients].map(Number).filter(id => !isNaN(id));
      
      if (finalClients.length > 0) {
        baseFilter.push({ id: { $in: finalClients } });
      } else if (services.length > 0) {
        baseFilter.push({ id: -1 }); // No matches if services were selected but no clients found
      }

    } catch (error) {
      console.error('Error in service filtering:', error);
      baseFilter.push({ id: -1 }); // No matches on error
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
  // Handle adddate_regex filter
  if (advancedFilterData.adddate_regex) {
    try {
      const WmmModel = await getModelInstance('WmmModel');
      const FomModel = await getModelInstance('FomModel');
      const HrgModel = await getModelInstance('HrgModel');
      const CalModel = await getModelInstance('CalModel');

      // Create pipeline for regex date filtering
      const createRegexPipeline = [
        {
          $match: {
            adddate: { 
              $regex: advancedFilterData.adddate_regex,
              $options: "i"
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
        WmmModel.aggregate(createRegexPipeline),
        FomModel.aggregate(createRegexPipeline),
        HrgModel.aggregate(createRegexPipeline),
        CalModel.aggregate(createRegexPipeline)
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
      console.error("Error in adddate regex filtering:", error);
      baseFilter.push({ id: -1 });
    }
  }

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
                format: "%Y-%m-%d",
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
                format: "%Y-%m-%d",
                timezone: "UTC",
                onError: null,
                onNull: null
              }
            },
            endDateObj: {
              $dateFromString: {
                dateString: "$enddate",
                format: "%Y-%m-%d",
                timezone: "UTC",
                onError: null,
                onNull: null
              }
            }
          }
        },
        // Filter out records with invalid dates
        {
          $match: {
            subsDateObj: { $ne: null },
            endDateObj: { $ne: null }
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
                format: "%Y-%m-%d",
                timezone: "UTC",
                onError: null,
                onNull: null
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
  // Single area code filter
  if (advancedFilterData.acode && advancedFilterData.acode.trim()) {
    baseFilter.push({ 
      acode: advancedFilterData.acode.trim()  // Exact match with client's acode field
    });
  }

  // Handle areas parameter (can be string or array)
  if (advancedFilterData.areas) {
    // Convert to array if it's a string
    const areas = Array.isArray(advancedFilterData.areas) 
      ? advancedFilterData.areas 
      : [advancedFilterData.areas];

    // Clean the area codes and remove duplicates
    const validAreas = [...new Set(
      areas
        .map(area => area.trim())
        .filter(area => area.length > 0)
    )];

    if (validAreas.length > 0) {
      // Match client's acode field against the selected areas
      baseFilter.push({
        acode: {
          $in: validAreas
        }
      });
    }
  }

  if (advancedFilterData.type) {
    baseFilter.push({ type: advancedFilterData.type });
  }
} 