import { getModelInstance } from "./modelManager.mjs";
import ClientModel from "../../../models/clients.mjs";
import { parseDate, getSubscriptionModelName } from "./helpers.mjs";

// Helper to get first and last day of a month from a date string
function getMonthRange(dateString) {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return { start: null, end: null };
  const year = d.getFullYear();
  const month = d.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999); // last day of month
  return { start, end };
}

// Helper function to get the appropriate subscription model
async function getSubscriptionModel(subscriptionType) {
  const modelName = getSubscriptionModelName(subscriptionType);
  return await getModelInstance(modelName);
}

// Helper function to create date pipeline stages
function createDatePipeline(dateField, subscriptionType = "WMM") {
  const pipeline = [
    {
      $match: {
        [dateField]: { $exists: true, $ne: null },
      },
    },
  ];

  // Add date conversion based on subscription type
  const modelName = getSubscriptionModelName(subscriptionType);
  if (modelName === "PromoModel") {
    // Handle Promo date format (M/D/YYYY HH:mm:ss)
    pipeline.push({
      $addFields: {
        normalizedDate: {
          $let: {
            vars: {
              // First get just the date part if there's a space
              datePart: {
                $cond: {
                  if: { $regexMatch: { input: `$${dateField}`, regex: " " } },
                  then: {
                    $arrayElemAt: [{ $split: [`$${dateField}`, " "] }, 0],
                  },
                  else: `$${dateField}`,
                },
              },
            },
            in: {
              $cond: {
                if: { $regexMatch: { input: "$$datePart", regex: "/" } },
                then: {
                  $let: {
                    vars: {
                      parts: { $split: ["$$datePart", "/"] },
                      year: {
                        $arrayElemAt: [{ $split: ["$$datePart", "/"] }, 2],
                      },
                      month: {
                        $toString: {
                          $cond: {
                            if: {
                              $lt: [
                                {
                                  $strLenBytes: {
                                    $arrayElemAt: [
                                      { $split: ["$$datePart", "/"] },
                                      0,
                                    ],
                                  },
                                },
                                2,
                              ],
                            },
                            then: {
                              $concat: [
                                "0",
                                {
                                  $arrayElemAt: [
                                    { $split: ["$$datePart", "/"] },
                                    0,
                                  ],
                                },
                              ],
                            },
                            else: {
                              $arrayElemAt: [
                                { $split: ["$$datePart", "/"] },
                                0,
                              ],
                            },
                          },
                        },
                      },
                      day: {
                        $toString: {
                          $cond: {
                            if: {
                              $lt: [
                                {
                                  $strLenBytes: {
                                    $arrayElemAt: [
                                      { $split: ["$$datePart", "/"] },
                                      1,
                                    ],
                                  },
                                },
                                2,
                              ],
                            },
                            then: {
                              $concat: [
                                "0",
                                {
                                  $arrayElemAt: [
                                    { $split: ["$$datePart", "/"] },
                                    1,
                                  ],
                                },
                              ],
                            },
                            else: {
                              $arrayElemAt: [
                                { $split: ["$$datePart", "/"] },
                                1,
                              ],
                            },
                          },
                        },
                      },
                    },
                    in: {
                      $dateFromString: {
                        dateString: {
                          $concat: ["$$year", "-", "$$month", "-", "$$day"],
                        },
                        format: "%Y-%m-%d",
                        timezone: "UTC",
                        onError: null,
                        onNull: null,
                      },
                    },
                  },
                },
                else: {
                  $dateFromString: {
                    dateString: "$$datePart",
                    format: "%Y-%m-%d",
                    timezone: "UTC",
                    onError: null,
                    onNull: null,
                  },
                },
              },
            },
          },
        },
      },
    });
  } else {
    // Handle WMM and Complimentary date format (YYYY-MM-DD)
    pipeline.push({
      $addFields: {
        normalizedDate: {
          $dateFromString: {
            dateString: `$${dateField}`,
            format: "%Y-%m-%d",
            timezone: "UTC",
            onError: null,
            onNull: null,
          },
        },
      },
    });
  }

  // Filter out invalid dates
  pipeline.push({
    $match: {
      normalizedDate: { $ne: null },
    },
  });

  return pipeline;
}

export async function buildFilterQuery(filter, group, advancedFilterData = {}) {
  // Initialize the filter query
  const baseFilter = [];
  let hasIncludedIds = false;
  let includedIds = [];

  // Handle client ID inclusion first
  if (advancedFilterData.includeClientIds) {
    // Convert to array if it's a single value
    const includeIds = Array.isArray(advancedFilterData.includeClientIds)
      ? advancedFilterData.includeClientIds
      : [advancedFilterData.includeClientIds];

    includedIds = includeIds
      .map((id) => Number(id))
      .filter((id) => !isNaN(id) && isFinite(id));

    if (includedIds.length > 0) {
      hasIncludedIds = true;
    } else {
      return { id: -1 }; // No matches if invalid IDs
    }
  }

  // Handle client ID exclusion
  if (advancedFilterData.excludeClientIds) {
    // Convert to array if it's a single value
    const excludeIds = Array.isArray(advancedFilterData.excludeClientIds)
      ? advancedFilterData.excludeClientIds
      : [advancedFilterData.excludeClientIds];

    const validIds = excludeIds
      .map((id) => Number(id))
      .filter((id) => !isNaN(id) && isFinite(id));

    if (validIds.length > 0) {
      // Add the exclusion filter as a top-level condition
      baseFilter.push({ id: { $nin: validIds } });
    }
  }

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

  // Add exclude CMC clients filter
  if (advancedFilterData.excludeCMCClients) {
    baseFilter.push({
      group: {
        $not: {
          $regex: "CMC",
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
    const subscriptionType = advancedFilterData.subscriptionType || "WMM";
    const modelName = getSubscriptionModelName(subscriptionType);
    const SubscriptionModel = await getModelInstance(modelName);
    let customCopiesNum = null;

    // For custom copies, ensure we have a valid number
    if (
      advancedFilterData.copiesRange === "custom" &&
      advancedFilterData.customCopies
    ) {
      customCopiesNum = parseInt(advancedFilterData.customCopies);
      if (isNaN(customCopiesNum)) {
        baseFilter.push({ id: -1 }); // No matches if invalid number
        return;
      }
    }

    // Create aggregation pipeline to get most recent record for each client
    const pipeline = [
      // First stage: Match only records with valid dates and copies
      {
        $match: {
          subsdate: { $exists: true, $ne: null },
          copies: { $exists: true, $ne: null },
        },
      },
      // Second stage: Convert subsdate string to Date and copies to number
      {
        $addFields: {
          subsDateObj: {
            $dateFromString: {
              dateString: "$subsdate",
              format: "%Y-%m-%d",
              onError: null,
              onNull: null,
            },
          },
          copiesNum: {
            $toInt: "$copies", // Simpler conversion to integer
          },
        },
      },
      // Only consider records with valid date and copies
      {
        $match: {
          subsDateObj: { $ne: null },
          copiesNum: { $ne: null },
        },
      },
      // Sort by client ID and subscription date (newest first)
      {
        $sort: {
          clientid: 1,
          subsDateObj: -1,
        },
      },
      // Group by client ID to get most recent record
      {
        $group: {
          _id: "$clientid",
          latestCopies: { $first: "$copiesNum" },
        },
      },
    ];

    // Add match stage based on copies range
    switch (advancedFilterData.copiesRange) {
      case "1":
        pipeline.push({
          $match: {
            latestCopies: 1,
          },
        });
        break;
      case "2":
        pipeline.push({
          $match: {
            latestCopies: 2,
          },
        });
        break;
      case "gt1":
        pipeline.push({
          $match: {
            latestCopies: { $gt: 1 },
          },
        });
        break;
      case "custom":
        if (customCopiesNum !== null) {
          pipeline.push({
            $match: {
              latestCopies: customCopiesNum,
            },
          });
        }
        break;
    }

    // Execute aggregation and log for debugging
    const clientsWithCopies = await SubscriptionModel.aggregate(pipeline);

    const clientIds = clientsWithCopies.map((c) => c._id);

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
          { fname: { $regex: `^${nameParts[0]}$`, $options: "i" } },
          ...(nameParts.length > 1
            ? [{ lname: { $regex: `^${nameParts[1]}$`, $options: "i" } }]
            : []),
          ...(nameParts.length > 2
            ? [{ mname: { $regex: `^${nameParts[2]}$`, $options: "i" } }]
            : []),
          ...(nameParts.length > 3
            ? [{ sname: { $regex: `^${nameParts[3]}$`, $options: "i" } }]
            : []),
        ],
      });

      // Add partial matches
      nameQueries.push({
        $or: nameParts.map((part) => ({
          $or: [
            { fname: { $regex: part, $options: "i" } },
            { lname: { $regex: part, $options: "i" } },
            { mname: { $regex: part, $options: "i" } },
            { sname: { $regex: part, $options: "i" } },
          ],
        })),
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
        $and: areaParts.map((part) => ({
          acode: { $regex: `^${part}$`, $options: "i" },
        })),
      });

      // Add partial matches
      areaQueries.push({
        $or: areaParts.map((part) => ({
          acode: { $regex: part, $options: "i" },
        })),
      });

      baseFilter.push({ $or: areaQueries });
    }
  }

  // Add HRG/FOM specific active subscription filter
  if (advancedFilterData.hrgFomActiveSubscription) {
    const HrgModel = await getModelInstance("HrgModel");
    const FomModel = await getModelInstance("FomModel");

    // Get active HRG subscriptions
    const activeHrgClients = await HrgModel.find({
      unsubscribe: { $ne: 1 },
      recvdate: { $exists: true, $ne: null },
    }).distinct("clientid");

    // Get active FOM subscriptions
    const activeFomClients = await FomModel.find({
      unsubscribe: { $ne: 1 },
      recvdate: { $exists: true, $ne: null },
    }).distinct("clientid");

    // Combine unique client IDs
    const activeClientIds = [
      ...new Set([...activeHrgClients, ...activeFomClients]),
    ]
      .map((id) => parseInt(id))
      .filter((id) => !isNaN(id));

    if (activeClientIds.length > 0) {
      baseFilter.push({ id: { $in: activeClientIds } });
    } else {
      baseFilter.push({ id: -1 });
    }
  }

  // At the end, before returning the query:
  let filterQuery;

  if (hasIncludedIds) {
    // If we have included IDs, create an $or condition that will match either:
    // 1. The specifically included IDs
    // 2. All other filter conditions (if any)
    const conditions = [{ id: { $in: includedIds } }];

    if (baseFilter.length > 0) {
      conditions.push({ $and: baseFilter });
    }

    filterQuery = { $or: conditions };
  } else {
    // If no included IDs, use the regular filter
    filterQuery = baseFilter.length > 0 ? { $and: baseFilter } : {};
  }

  // Create a simplified version of the query for logging
  const simplifiedQuery = {
    ...filterQuery,
    $or: filterQuery.$or?.map((cond) => {
      if (cond.id?.$in && cond.id.$in.length > 10) {
        return {
          id: {
            $in: [
              ...cond.id.$in.slice(0, 3),
              `...${cond.id.$in.length - 6} more...`,
              ...cond.id.$in.slice(-3),
            ],
          },
        };
      }
      return cond;
    }),
    $and: filterQuery.$and?.map((cond) => {
      // Handle ID exclusions
      if (cond.id?.$nin && cond.id.$nin.length > 10) {
        return {
          id: {
            $nin: [
              ...cond.id.$nin.slice(0, 3),
              `...${cond.id.$nin.length - 6} more...`,
              ...cond.id.$nin.slice(-3),
            ],
          },
        };
      }
      // Handle ID inclusions
      if (cond.id?.$in && cond.id.$in.length > 10) {
        return {
          id: {
            $in: [
              ...cond.id.$in.slice(0, 3),
              `...${cond.id.$in.length - 6} more...`,
              ...cond.id.$in.slice(-3),
            ],
          },
        };
      }
      return cond;
    }),
  };

  if (
    advancedFilterData.excludeClientIds ||
    advancedFilterData.includeClientIds
  ) {
    // Convert excluded IDs to numbers for logging
    const excludedIds = advancedFilterData.excludeClientIds
      ? (Array.isArray(advancedFilterData.excludeClientIds)
          ? advancedFilterData.excludeClientIds
          : [advancedFilterData.excludeClientIds]
        )
          .map((id) => Number(id))
          .filter((id) => !isNaN(id) && isFinite(id))
      : [];

    // Convert included IDs to numbers for logging
    const includedIds = advancedFilterData.includeClientIds
      ? (Array.isArray(advancedFilterData.includeClientIds)
          ? advancedFilterData.includeClientIds
          : [advancedFilterData.includeClientIds]
        )
          .map((id) => Number(id))
          .filter((id) => !isNaN(id) && isFinite(id))
      : [];
  }

  return filterQuery;
}

async function addServiceFilters(baseFilter, advancedFilterData) {
  // Handle payment reference filter
  if (advancedFilterData.paymentRef) {
    const subscriptionType = advancedFilterData.subscriptionType || "WMM";
    const modelName = getSubscriptionModelName(subscriptionType);
    const SubscriptionModel = await getModelInstance(modelName);
    const paymentRef = advancedFilterData.paymentRef.trim();
    let refPattern = paymentRef;

    const msMatch = paymentRef.match(/^([A-Z]{2})\s*(\d{6})/i);
    if (msMatch) {
      const prefix = msMatch[1].toUpperCase();
      const numbers = msMatch[2];
      refPattern = `${prefix}.*${numbers.replace(/^0+/, "")}`;
    }

    const clientsWithPaymentRef = await SubscriptionModel.find({
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
      const subscriptionType = advancedFilterData.subscriptionType || "WMM";

      // Get the appropriate subscription model based on type
      const SubscriptionModel = await getSubscriptionModel(subscriptionType);

      const FomModel = await getModelInstance("FomModel");
      const HrgModel = await getModelInstance("HrgModel");
      const CalModel = await getModelInstance("CalModel");

      // Ensure services is an array - handle both string and array inputs
      const services = Array.isArray(advancedFilterData.services)
        ? advancedFilterData.services
        : typeof advancedFilterData.services === "string"
        ? [advancedFilterData.services]
        : [];

      const subscriptionStatus = advancedFilterData.subscriptionStatus || "all";

      // Check if there are any other filters besides services
      const hasOtherFilters = Object.keys(advancedFilterData).some(
        (key) =>
          key !== "services" &&
          key !== "subscriptionStatus" &&
          key !== "subscriptionType" &&
          advancedFilterData[key] !== undefined &&
          advancedFilterData[key] !== null &&
          advancedFilterData[key] !== ""
      );

      // Get clients for each selected service
      let targetClients = new Set();
      let isFirstService = true;

      // First, get all clients for each service
      const serviceClientsMap = {};
      for (const service of services) {
        let Model;
        switch (service.toUpperCase()) {
          case "WMM":
          case "PROMO":
          case "COMP":
            // Only use the subscription model that matches the current subscription type
            if (
              (subscriptionType === "WMM" && service === "WMM") ||
              (subscriptionType === "Promo" && service === "PROMO") ||
              (subscriptionType === "Complimentary" && service === "COMP")
            ) {
              Model = SubscriptionModel;
            }
            break;
          case "FOM":
            Model = FomModel;
            break;
          case "HRG":
            Model = HrgModel;
            break;
          case "CAL":
            Model = CalModel;
            break;
          default:
            continue;
        }

        if (!Model) continue;

        // Get clients for this service with subscription status
        let query = {};

        // Only apply subscription status filter if there are other filters
        if (
          hasOtherFilters &&
          (service.toUpperCase() === "HRG" ||
            service.toUpperCase() === "FOM") &&
          subscriptionStatus !== "all"
        ) {
          if (subscriptionStatus === "active") {
            // For active subscriptions, only check the most recent record for each client
            const activeClients = await Model.aggregate([
              { $match: {} },
              {
                $addFields: {
                  recvDateObj: {
                    $dateFromString: {
                      dateString: "$recvdate",
                      format: "%Y-%m-%d",
                      onError: null,
                      onNull: null,
                    },
                  },
                },
              },
              { $match: { recvDateObj: { $ne: null } } },
              { $sort: { clientid: 1, recvDateObj: -1 } },
              {
                $group: {
                  _id: "$clientid",
                  lastUnsubscribe: { $first: "$unsubscribe" },
                  lastRecvDate: { $first: "$recvdate" },
                },
              },
              {
                $match: {
                  $and: [
                    {
                      $or: [
                        { lastUnsubscribe: { $exists: false } },
                        { lastUnsubscribe: { $ne: 1 } },
                      ],
                    },
                    { lastRecvDate: { $exists: true, $ne: null } },
                  ],
                },
              },
              {
                $project: {
                  _id: 1,
                },
              },
            ]);

            const clientIds = activeClients.map((c) => c._id);
            if (clientIds.length > 0) {
              serviceClientsMap[service.toUpperCase()] = new Set(clientIds);
            }
            continue;
          } else if (subscriptionStatus === "unsubscribed") {
            // For unsubscribed status, get clients whose latest record is unsubscribed
            const unsubscribedClients = await Model.aggregate([
              // First stage: Match only records with valid receive date
              { $match: {} },
              // Second stage: Convert recvdate string to Date for proper sorting
              {
                $addFields: {
                  recvDateObj: {
                    $dateFromString: {
                      dateString: "$recvdate",
                      format: "%Y-%m-%d",
                      onError: null,
                      onNull: null,
                    },
                  },
                },
              },
              // Third stage: Remove records with invalid converted dates
              {
                $match: {
                  recvDateObj: { $ne: null },
                },
              },
              // Fourth stage: Sort by client ID and converted receive date (descending)
              {
                $sort: {
                  clientid: 1,
                  recvDateObj: -1,
                },
              },
              // Fifth stage: Group by client ID and take first (most recent) record
              {
                $group: {
                  _id: "$clientid",
                  lastUnsubscribe: { $first: "$unsubscribe" },
                  lastRecvDate: { $first: "$recvdate" },
                },
              },
              // Sixth stage: Only keep clients whose most recent record is unsubscribed
              {
                $match: {
                  lastUnsubscribe: 1,
                  lastRecvDate: { $exists: true, $ne: null },
                },
              },
              // Final stage: Project only the client ID
              {
                $project: {
                  _id: 1,
                },
              },
            ]);

            const clientIds = unsubscribedClients.map((c) => c._id);
            if (clientIds.length > 0) {
              serviceClientsMap[service.toUpperCase()] = new Set(clientIds);
            }
            continue;
          }
        } else {
          // For other services or when no subscription status filter
          if (subscriptionStatus === "active") {
            query.unsubscribe = { $ne: 1 };
          } else if (subscriptionStatus === "unsubscribed") {
            query.unsubscribe = 1;
          }
        }

        const serviceClients = await Model.distinct("clientid", query);
        if (serviceClients.length > 0) {
          serviceClientsMap[service.toUpperCase()] = new Set(serviceClients);
        }
      }

      // Special handling for FOM and HRG to ensure exclusivity
      if (serviceClientsMap.FOM || serviceClientsMap.HRG) {
        // Get DCS clients to exclude
        const dcsClients = await ClientModel.distinct("id", { group: "DCS" });

        // If both FOM and HRG are selected, they should be mutually exclusive
        if (serviceClientsMap.FOM && serviceClientsMap.HRG) {
          const fomOnlyClients = new Set(
            [...serviceClientsMap.FOM].filter(
              (id) => !serviceClientsMap.HRG.has(id) && !dcsClients.includes(id)
            )
          );
          const hrgOnlyClients = new Set(
            [...serviceClientsMap.HRG].filter(
              (id) => !serviceClientsMap.FOM.has(id) && !dcsClients.includes(id)
            )
          );
          targetClients = new Set([...fomOnlyClients, ...hrgOnlyClients]);
        }
        // If only FOM is selected, exclude any clients that have HRG or are in DCS group
        else if (serviceClientsMap.FOM) {
          const hrgClients = await HrgModel.distinct("clientid", {});
          targetClients = new Set(
            [...serviceClientsMap.FOM].filter(
              (id) => !hrgClients.includes(id) && !dcsClients.includes(id)
            )
          );
        }
        // If only HRG is selected, exclude any clients that have FOM or are in DCS group
        else if (serviceClientsMap.HRG) {
          const fomClients = await FomModel.distinct("clientid", {});
          targetClients = new Set(
            [...serviceClientsMap.HRG].filter(
              (id) => !fomClients.includes(id) && !dcsClients.includes(id)
            )
          );
        }
      }
      // For subscription services (WMM/PROMO/COMP) or other combinations
      else {
        // Get the appropriate service key based on subscription type
        const subscriptionServiceKey = {
          WMM: "WMM",
          Promo: "PROMO",
          Complimentary: "COMP",
        }[subscriptionType];

        // Initialize targetClients with subscription service clients if available
        if (serviceClientsMap[subscriptionServiceKey]) {
          targetClients = serviceClientsMap[subscriptionServiceKey];
          isFirstService = false;
        }

        // Add other services using intersection
        for (const [service, clients] of Object.entries(serviceClientsMap)) {
          if (service === subscriptionServiceKey) continue; // Skip subscription service as it's already handled

          if (isFirstService) {
            targetClients = clients;
            isFirstService = false;
          } else {
            // Intersect with existing clients if we want clients with all services
            targetClients = new Set(
              [...targetClients].filter((id) => clients.has(id))
            );
          }
        }
      }

      // Convert Set to Array and add to filter
      const finalClients = [...targetClients]
        .map(Number)
        .filter((id) => !isNaN(id));

      if (finalClients.length > 0) {
        baseFilter.push({ id: { $in: finalClients } });
      } else if (services.length > 0) {
        baseFilter.push({ id: -1 }); // No matches if services were selected but no clients found
      }
    } catch (error) {
      console.error("Error in service filtering:", error);
      baseFilter.push({ id: -1 }); // No matches on error
    }
  }

  // Handle WMM Calendar Status Filter
  if (
    advancedFilterData.calendarReceived ||
    advancedFilterData.calendarNotReceived
  ) {
    try {
      const WmmModel = await getModelInstance("WmmModel");
      let calendarQuery = {};

      // Build query based on selected options
      if (
        advancedFilterData.calendarReceived &&
        !advancedFilterData.calendarNotReceived
      ) {
        calendarQuery = { calendar: true };
      } else if (
        advancedFilterData.calendarNotReceived &&
        !advancedFilterData.calendarReceived
      ) {
        calendarQuery = {
          $or: [
            { calendar: false },
            { calendar: { $exists: false } },
            { calendar: null },
          ],
        };
      } else if (
        advancedFilterData.calendarReceived &&
        advancedFilterData.calendarNotReceived
      ) {
        // If both are selected, no need to filter by calendar status
        return;
      }

      // Only proceed if we have a valid query
      if (Object.keys(calendarQuery).length > 0) {
        const clientsWithCalendarStatus = await WmmModel.find(
          calendarQuery
        ).distinct("clientid");
        const validClientIds = clientsWithCalendarStatus
          .map((id) => parseInt(id))
          .filter((id) => !isNaN(id));

        if (validClientIds.length > 0) {
          baseFilter.push({ id: { $in: validClientIds } });
        } else {
          baseFilter.push({ id: -1 });
        }
      }
    } catch (error) {
      console.error("Error in calendar status filtering:", error);
      baseFilter.push({ id: -1 });
    }
  }

  // Handle SPack Status Filter
  if (advancedFilterData.spackReceived || advancedFilterData.spackNotReceived) {
    try {
      let spackQuery = {};

      // Build query based on selected options
      if (
        advancedFilterData.spackReceived &&
        !advancedFilterData.spackNotReceived
      ) {
        spackQuery = { spack: true };
      } else if (
        advancedFilterData.spackNotReceived &&
        !advancedFilterData.spackReceived
      ) {
        spackQuery = {
          $or: [
            { spack: false },
            { spack: { $exists: false } },
            { spack: null },
          ],
        };
      } else if (
        advancedFilterData.spackReceived &&
        advancedFilterData.spackNotReceived
      ) {
        // If both are selected, no need to filter by spack status
        return;
      }

      // Only proceed if we have a valid query
      if (Object.keys(spackQuery).length > 0) {
        const clientsWithSpackStatus = await ClientModel.find(
          spackQuery
        ).distinct("id");
        const validClientIds = clientsWithSpackStatus
          .map((id) => parseInt(id))
          .filter((id) => !isNaN(id));

        if (validClientIds.length > 0) {
          baseFilter.push({ id: { $in: validClientIds } });
        } else {
          baseFilter.push({ id: -1 });
        }
      }
    } catch (error) {
      console.error("Error in spack status filtering:", error);
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
  // Handle adddate_regex filter
  if (advancedFilterData.adddate_regex) {
    try {
      const WmmModel = await getModelInstance("WmmModel");
      const FomModel = await getModelInstance("FomModel");
      const HrgModel = await getModelInstance("HrgModel");
      const CalModel = await getModelInstance("CalModel");
      const PromoModel = await getModelInstance("PromoModel");
      const ComplimentaryModel = await getModelInstance("ComplimentaryModel");

      // Create pipeline for regex date filtering
      const createRegexPipeline = [
        {
          $match: {
            adddate: {
              $regex: advancedFilterData.adddate_regex,
              $options: "i",
            },
          },
        },
        {
          $group: {
            _id: "$clientid",
          },
        },
      ];

      // Execute aggregation for each model in parallel
      const [
        wmmClients,
        fomClients,
        hrgClients,
        calClients,
        promoClients,
        complimentaryClients,
      ] = await Promise.all([
        WmmModel.aggregate(createRegexPipeline),
        FomModel.aggregate(createRegexPipeline),
        HrgModel.aggregate(createRegexPipeline),
        CalModel.aggregate(createRegexPipeline),
        PromoModel.aggregate(createRegexPipeline),
        ComplimentaryModel.aggregate(createRegexPipeline),
      ]);

      // Combine all client IDs
      const matchingClientIds = [
        ...new Set([
          ...wmmClients.map((c) => Number(c._id)),
          ...fomClients.map((c) => Number(c._id)),
          ...hrgClients.map((c) => Number(c._id)),
          ...calClients.map((c) => Number(c._id)),
          ...promoClients.map((c) => Number(c._id)),
          ...complimentaryClients.map((c) => Number(c._id)),
        ]),
      ].filter((id) => !isNaN(id));

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
      const WmmModel = await getModelInstance("WmmModel");
      const FomModel = await getModelInstance("FomModel");
      const HrgModel = await getModelInstance("HrgModel");
      const CalModel = await getModelInstance("CalModel");

      // Convert dates to proper format for comparison
      const startDate = advancedFilterData.startDate
        ? parseDate(advancedFilterData.startDate)
        : null;
      const endDate = advancedFilterData.endDate
        ? parseDate(advancedFilterData.endDate)
        : null;

      // Set end date to end of day for inclusive comparison
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
      }

      // Execute aggregation for each model in parallel
      const [
        wmmClients,
        fomClients,
        hrgClients,
        calClients,
        promoClients,
        complimentaryClients,
      ] = await Promise.all([
        WmmModel.aggregate(createDatePipeline("adddate", "WMM")),
        FomModel.aggregate(createDatePipeline("adddate")),
        HrgModel.aggregate(createDatePipeline("adddate")),
        CalModel.aggregate(createDatePipeline("adddate")),
        PromoModel.aggregate(createDatePipeline("adddate", "Promo")),
        ComplimentaryModel.aggregate(
          createDatePipeline("adddate", "Complimentary")
        ),
      ]);

      // Combine all client IDs
      const matchingClientIds = [
        ...new Set([
          ...wmmClients.map((c) => Number(c._id)),
          ...fomClients.map((c) => Number(c._id)),
          ...hrgClients.map((c) => Number(c._id)),
          ...calClients.map((c) => Number(c._id)),
          ...promoClients.map((c) => Number(c._id)),
          ...complimentaryClients.map((c) => Number(c._id)),
        ]),
      ].filter((id) => !isNaN(id));

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

  // Update the createDatePipeline function
  const createDatePipeline = (dateField, subscriptionType = "WMM") => [
    {
      $match: {
        [dateField]: { $exists: true, $ne: null },
      },
    },
    {
      $addFields: {
        normalizedDate: {
          $cond: {
            if: { $eq: [subscriptionType, "Promo"] },
            then: {
              // For Promo model, handle M/D/YYYY HH:mm:ss format
              $let: {
                vars: {
                  datePart: {
                    $cond: {
                      if: {
                        $regexMatch: { input: `$${dateField}`, regex: " " },
                      },
                      then: {
                        $arrayElemAt: [{ $split: [`$${dateField}`, " "] }, 0],
                      },
                      else: `$${dateField}`,
                    },
                  },
                },
                in: {
                  $cond: {
                    if: { $regexMatch: { input: "$$datePart", regex: "/" } },
                    then: {
                      $let: {
                        vars: {
                          parts: { $split: ["$$datePart", "/"] },
                          year: {
                            $arrayElemAt: [{ $split: ["$$datePart", "/"] }, 2],
                          },
                          month: {
                            $toString: {
                              $cond: {
                                if: {
                                  $lt: [
                                    {
                                      $strLenBytes: {
                                        $arrayElemAt: [
                                          { $split: ["$$datePart", "/"] },
                                          0,
                                        ],
                                      },
                                    },
                                    2,
                                  ],
                                },
                                then: {
                                  $concat: [
                                    "0",
                                    {
                                      $arrayElemAt: [
                                        { $split: ["$$datePart", "/"] },
                                        0,
                                      ],
                                    },
                                  ],
                                },
                                else: {
                                  $arrayElemAt: [
                                    { $split: ["$$datePart", "/"] },
                                    0,
                                  ],
                                },
                              },
                            },
                          },
                          day: {
                            $toString: {
                              $cond: {
                                if: {
                                  $lt: [
                                    {
                                      $strLenBytes: {
                                        $arrayElemAt: [
                                          { $split: ["$$datePart", "/"] },
                                          1,
                                        ],
                                      },
                                    },
                                    2,
                                  ],
                                },
                                then: {
                                  $concat: [
                                    "0",
                                    {
                                      $arrayElemAt: [
                                        { $split: ["$$datePart", "/"] },
                                        1,
                                      ],
                                    },
                                  ],
                                },
                                else: {
                                  $arrayElemAt: [
                                    { $split: ["$$datePart", "/"] },
                                    1,
                                  ],
                                },
                              },
                            },
                          },
                        },
                        in: {
                          $dateFromString: {
                            dateString: {
                              $concat: ["$$year", "-", "$$month", "-", "$$day"],
                            },
                            format: "%Y-%m-%d",
                            timezone: "UTC",
                            onError: null,
                            onNull: null,
                          },
                        },
                      },
                    },
                    else: {
                      // For WMM and Complimentary models, handle YYYY-MM-DD format
                      $dateFromString: {
                        dateString: `$${dateField}`,
                        format: "%Y-%m-%d",
                        timezone: "UTC",
                        onError: null,
                        onNull: null,
                      },
                    },
                  },
                },
              },
            },
            else: {
              // For WMM and Complimentary models, handle YYYY-MM-DD format
              $dateFromString: {
                dateString: `$${dateField}`,
                format: "%Y-%m-%d",
                timezone: "UTC",
                onError: null,
                onNull: null,
              },
            },
          },
        },
      },
    },
    {
      $match: {
        normalizedDate: { $ne: null },
      },
    },
  ];

  // Handle WMM Active Subscription Filter
  if (
    advancedFilterData.wmmActiveFromDate ||
    advancedFilterData.wmmActiveToDate
  ) {
    try {
      const Model = await getSubscriptionModel(
        advancedFilterData.subscriptionType
      );

      let fromDate = null,
        toDate = null;
      if (advancedFilterData.wmmActiveFromDate) {
        fromDate = getMonthRange(advancedFilterData.wmmActiveFromDate).start;
      }
      if (advancedFilterData.wmmActiveToDate) {
        toDate = getMonthRange(advancedFilterData.wmmActiveToDate).end;
      }

      const pipeline = [
        ...createDatePipeline(
          "subsdate",
          advancedFilterData.subscriptionType || "WMM"
        ),
      ];

      // Match the old SQL logic exactly:
      // From date: subsdate >= date at midnight
      // To date: subsdate <= date at end of day
      const dateConditions = [];
      if (fromDate && toDate) {
        dateConditions.push({
          $expr: {
            $and: [
              { $gte: ["$normalizedDate", fromDate] }, // subsdate >= fromDate at midnight
              { $lte: ["$normalizedDate", toDate] }, // subsdate <= toDate at 23:59:59
            ],
          },
        });
      } else if (fromDate) {
        dateConditions.push({
          $expr: {
            $gte: ["$normalizedDate", fromDate], // subsdate >= fromDate at midnight
          },
        });
      } else if (toDate) {
        dateConditions.push({
          $expr: {
            $lte: ["$normalizedDate", toDate], // subsdate <= toDate at 23:59:59
          },
        });
      }

      if (dateConditions.length > 0) {
        pipeline.push({ $match: { $or: dateConditions } });
      }

      pipeline.push({
        $group: {
          _id: "$clientid",
        },
      });

      const activeClients = await Model.aggregate(pipeline);
      const validClientIds = activeClients
        .map((c) => Number(c._id))
        .filter((id) => !isNaN(id));

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
  if (
    advancedFilterData.wmmExpiringFromDate ||
    advancedFilterData.wmmExpiringToDate
  ) {
    try {
      const WmmModel = await getModelInstance("WmmModel");
      let fromDate = null,
        toDate = null;
      if (advancedFilterData.wmmExpiringFromDate) {
        fromDate = getMonthRange(advancedFilterData.wmmExpiringFromDate).start;
      }
      if (advancedFilterData.wmmExpiringToDate) {
        toDate = getMonthRange(advancedFilterData.wmmExpiringToDate).end;
      }
      const pipeline = [
        {
          $match: {
            enddate: { $exists: true, $ne: null },
          },
        },
        {
          $addFields: {
            endDateObj: {
              $dateFromString: {
                dateString: "$enddate",
                format: "%Y-%m-%d",
                timezone: "UTC",
                onError: null,
                onNull: null,
              },
            },
          },
        },
        {
          $match: {
            endDateObj: { $ne: null },
          },
        },
      ];

      // For expiring subscriptions, we want:
      // 1. If both fromDate and toDate: subscription must end within this period
      // 2. If only fromDate: subscription must end during or after this month
      // 3. If only toDate: subscription must end during or before this month
      const dateConditions = [];
      if (fromDate && toDate) {
        dateConditions.push({
          $expr: {
            $and: [
              { $gte: ["$endDateObj", fromDate] }, // ends during or after start month
              { $lte: ["$endDateObj", toDate] }, // ends during or before end month
            ],
          },
        });
      } else if (fromDate) {
        dateConditions.push({
          $expr: {
            $gte: ["$endDateObj", fromDate], // ends during or after this month
          },
        });
      } else if (toDate) {
        dateConditions.push({
          $expr: {
            $lte: ["$endDateObj", toDate], // ends during or before this month
          },
        });
      }

      if (dateConditions.length > 0) {
        pipeline.push({ $match: { $or: dateConditions } });
      }

      pipeline.push({
        $group: {
          _id: "$clientid",
        },
      });

      const expiringClients = await WmmModel.aggregate(pipeline);
      const validClientIds = expiringClients
        .map((c) => Number(c._id))
        .filter((id) => !isNaN(id));
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

  // Handle CAL Order Received Date Filter
  if (
    advancedFilterData.calReceivedFromDate ||
    advancedFilterData.calReceivedToDate
  ) {
    try {
      const CalModel = await getModelInstance("CalModel");
      const startDate = advancedFilterData.calReceivedFromDate
        ? parseDate(advancedFilterData.calReceivedFromDate)
        : null;
      const endDate = advancedFilterData.calReceivedToDate
        ? parseDate(advancedFilterData.calReceivedToDate)
        : null;

      // Set end date to end of day for inclusive comparison
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
      }

      const pipeline = [
        ...createDatePipeline("recvdate"),
        {
          $match: {
            normalizedDate: {
              ...(startDate && { $gte: startDate }),
              ...(endDate && { $lte: endDate }),
            },
          },
        },
        {
          $group: {
            _id: "$clientid",
          },
        },
      ];

      const receivedClients = await CalModel.aggregate(pipeline);
      const validClientIds = receivedClients
        .map((c) => Number(c._id))
        .filter((id) => !isNaN(id));

      if (validClientIds.length > 0) {
        baseFilter.push({ id: { $in: validClientIds } });
      } else {
        baseFilter.push({ id: -1 });
      }
    } catch (error) {
      console.error("Error in CAL order received date filtering:", error);
      baseFilter.push({ id: -1 });
    }
  }

  // Handle CAL Payment Date Filter
  if (
    advancedFilterData.calPaymentFromDate ||
    advancedFilterData.calPaymentToDate
  ) {
    try {
      const CalModel = await getModelInstance("CalModel");
      const startDate = advancedFilterData.calPaymentFromDate
        ? parseDate(advancedFilterData.calPaymentFromDate)
        : null;
      const endDate = advancedFilterData.calPaymentToDate
        ? parseDate(advancedFilterData.calPaymentToDate)
        : null;

      // Set end date to end of day for inclusive comparison
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
      }

      const pipeline = [
        ...createDatePipeline("paymtdate"),
        {
          $match: {
            normalizedDate: {
              ...(startDate && { $gte: startDate }),
              ...(endDate && { $lte: endDate }),
            },
          },
        },
        {
          $group: {
            _id: "$clientid",
          },
        },
      ];

      const paidClients = await CalModel.aggregate(pipeline);
      const validClientIds = paidClients
        .map((c) => Number(c._id))
        .filter((id) => !isNaN(id));

      if (validClientIds.length > 0) {
        baseFilter.push({ id: { $in: validClientIds } });
      } else {
        baseFilter.push({ id: -1 });
      }
    } catch (error) {
      console.error("Error in CAL payment date filtering:", error);
      baseFilter.push({ id: -1 });
    }
  }

  // Handle HRG Payment Transaction Date Filter
  if (
    advancedFilterData.hrgPaymentFromDate ||
    advancedFilterData.hrgPaymentToDate
  ) {
    try {
      const HrgModel = await getModelInstance("HrgModel");
      const startDate = advancedFilterData.hrgPaymentFromDate
        ? parseDate(advancedFilterData.hrgPaymentFromDate)
        : null;
      const endDate = advancedFilterData.hrgPaymentToDate
        ? parseDate(advancedFilterData.hrgPaymentToDate)
        : null;

      // Set end date to end of day for inclusive comparison
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
      }

      const pipeline = [
        ...createDatePipeline("recvdate"),
        {
          $match: {
            normalizedDate: {
              ...(startDate && { $gte: startDate }),
              ...(endDate && { $lte: endDate }),
            },
          },
        },
        {
          $group: {
            _id: "$clientid",
          },
        },
      ];

      const paidClients = await HrgModel.aggregate(pipeline);
      const validClientIds = paidClients
        .map((c) => Number(c._id))
        .filter((id) => !isNaN(id));

      if (validClientIds.length > 0) {
        baseFilter.push({ id: { $in: validClientIds } });
      } else {
        baseFilter.push({ id: -1 });
      }
    } catch (error) {
      console.error("Error in HRG payment date filtering:", error);
      baseFilter.push({ id: -1 });
    }
  }

  // Handle HRG Campaign Date Filter
  if (
    advancedFilterData.hrgCampaignFromDate ||
    advancedFilterData.hrgCampaignToDate
  ) {
    try {
      const HrgModel = await getModelInstance("HrgModel");
      const startDate = advancedFilterData.hrgCampaignFromDate
        ? parseDate(advancedFilterData.hrgCampaignFromDate)
        : null;
      const endDate = advancedFilterData.hrgCampaignToDate
        ? parseDate(advancedFilterData.hrgCampaignToDate)
        : null;

      // Set end date to end of day for inclusive comparison
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
      }

      const pipeline = [
        ...createDatePipeline("campaigndate"),
        {
          $match: {
            normalizedDate: {
              ...(startDate && { $gte: startDate }),
              ...(endDate && { $lte: endDate }),
            },
          },
        },
        {
          $group: {
            _id: "$clientid",
          },
        },
      ];

      const campaignClients = await HrgModel.aggregate(pipeline);
      const validClientIds = campaignClients
        .map((c) => Number(c._id))
        .filter((id) => !isNaN(id));

      if (validClientIds.length > 0) {
        baseFilter.push({ id: { $in: validClientIds } });
      } else {
        baseFilter.push({ id: -1 });
      }
    } catch (error) {
      console.error("Error in HRG campaign date filtering:", error);
      baseFilter.push({ id: -1 });
    }
  }

  // Handle FOM Payment Transaction Date Filter
  if (
    advancedFilterData.fomPaymentFromDate ||
    advancedFilterData.fomPaymentToDate
  ) {
    try {
      const FomModel = await getModelInstance("FomModel");
      const startDate = advancedFilterData.fomPaymentFromDate
        ? parseDate(advancedFilterData.fomPaymentFromDate)
        : null;
      const endDate = advancedFilterData.fomPaymentToDate
        ? parseDate(advancedFilterData.fomPaymentToDate)
        : null;

      // Set end date to end of day for inclusive comparison
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
      }

      const pipeline = [
        ...createDatePipeline("recvdate"),
        {
          $match: {
            normalizedDate: {
              ...(startDate && { $gte: startDate }),
              ...(endDate && { $lte: endDate }),
            },
          },
        },
        {
          $group: {
            _id: "$clientid",
          },
        },
      ];

      const paidClients = await FomModel.aggregate(pipeline);
      const validClientIds = paidClients
        .map((c) => Number(c._id))
        .filter((id) => !isNaN(id));

      if (validClientIds.length > 0) {
        baseFilter.push({ id: { $in: validClientIds } });
      } else {
        baseFilter.push({ id: -1 });
      }
    } catch (error) {
      console.error("Error in FOM payment date filtering:", error);
      baseFilter.push({ id: -1 });
    }
  }
}

function addAreaAndTypeFilters(baseFilter, advancedFilterData) {
  const escapeRegex = (string) => {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  };
  
  // Single area code filter
  if (advancedFilterData.acode && advancedFilterData.acode.trim()) {
    const acodePattern = advancedFilterData.acode.trim();
    baseFilter.push({
      acode: { 
        $regex: new RegExp(`^${escapeRegex(acodePattern)}\\s*$`, 'i')
      }
    });
  }

  // Handle areas parameter (can be string or array)
  if (advancedFilterData.areas) {
    // Convert to array if it's a string
    const areas = Array.isArray(advancedFilterData.areas)
      ? advancedFilterData.areas
      : [advancedFilterData.areas];

    // Clean the area codes and remove duplicates
    const validAreas = [
      ...new Set(
        areas.map((area) => area.trim()).filter((area) => area.length > 0)
      ),
    ];

    if (validAreas.length > 0) {
      // Create regex patterns for each area code
      const areaPatterns = validAreas.map(area => 
        new RegExp(`^${escapeRegex(area)}\\s*$`, 'i')
      );
      
      baseFilter.push({
        $or: areaPatterns.map(pattern => ({ acode: pattern }))
      });
    }
  }

  if (advancedFilterData.type) {
    baseFilter.push({ type: advancedFilterData.type });
  }
}
