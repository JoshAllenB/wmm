import { getModelInstance } from "./modelManager.mjs";
import ClientModel from "../../../models/clients.mjs";
import { parseDate, getSubscriptionModelName } from "./helpers.mjs";

// Helper function to extract payment reference numbers from various formats
const extractPaymentRefNumber = (input) => {
  if (!input) return null;

  // Common payment reference patterns
  const patterns = [
    /^(?:OR#?\s*)?(\d{5,6})$/i, // OR number: OR#12345 or 12345
    /^(?:MS\s*)?(\d{6})$/i, // MS number: MS123456 or 123456
    /^(?:GCASH\s*)?(\d{6,})$/i, // GCASH number
    /^[A-Z]{2}\s*\d{6}$/i, // Two letters followed by 6 digits (MS 123456)
    /^\d{4,}[A-Z]?$/, // 4+ digits optionally followed by a letter
  ];

  const inputStr = input.toString().trim();

  // Check if input matches any of our payment reference patterns
  for (const pattern of patterns) {
    const match = inputStr.match(pattern);
    if (match) {
      return match[1] || match[0]; // Return the captured group if exists, otherwise full match
    }
  }

  return null;
};

// Helper function to apply clientID filtering to a list of client IDs
const applyClientIdFiltering = (clientIds, advancedFilterData) => {
  if (
    !advancedFilterData.includeClientIds &&
    !advancedFilterData.excludeClientIds
  ) {
    return clientIds; // No filtering needed
  }

  let filteredClients = clientIds;

  // Apply include filter
  if (advancedFilterData.includeClientIds) {
    const includeIds = Array.isArray(advancedFilterData.includeClientIds)
      ? advancedFilterData.includeClientIds
      : [advancedFilterData.includeClientIds];

    const validIncludeIds = includeIds
      .map((id) => Number(id))
      .filter((id) => !isNaN(id) && isFinite(id));

    if (validIncludeIds.length > 0) {
      // Only include clients that are both in the original list AND in the include list
      filteredClients = filteredClients.filter((id) =>
        validIncludeIds.includes(id)
      );
    }
  }

  // Apply exclude filter
  if (advancedFilterData.excludeClientIds) {
    const excludeIds = Array.isArray(advancedFilterData.excludeClientIds)
      ? advancedFilterData.excludeClientIds
      : [advancedFilterData.excludeClientIds];

    const validExcludeIds = excludeIds
      .map((id) => Number(id))
      .filter((id) => !isNaN(id) && isFinite(id));

    if (validExcludeIds.length > 0) {
      // Remove clients that are in the exclude list
      filteredClients = filteredClients.filter(
        (id) => !validExcludeIds.includes(id)
      );
    }
  }

  return filteredClients;
};

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
  let filterQuery = {}; // Initialize filterQuery early for scoring

  // Check if this is a search-based query (names, client ID, or payment ref)
  const isSearchQuery = filter && filter.trim() !== "";
  const isPaymentRefSearch =
    isSearchQuery && filter.toLowerCase().startsWith("ref:");
  const isClientIdSearch = isSearchQuery && !isNaN(Number(filter));
  const isNameSearch =
    isSearchQuery && !isPaymentRefSearch && !isClientIdSearch;

  // Check if services are explicitly selected
  const hasExplicitServices =
    advancedFilterData.services &&
    Array.isArray(advancedFilterData.services) &&
    advancedFilterData.services.length > 0;

  // Handle client ID inclusion first (but defer processing if services are selected)
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

  // Handle client ID exclusion (defer processing to check if there are other filters)
  if (advancedFilterData.excludeClientIds) {
    // Convert to array if it's a single value
    const excludeIds = Array.isArray(advancedFilterData.excludeClientIds)
      ? advancedFilterData.excludeClientIds
      : [advancedFilterData.excludeClientIds];

    const validExcludeIds = excludeIds
      .map((id) => Number(id))
      .filter((id) => !isNaN(id) && isFinite(id));

    // Store exclude IDs for later processing
    if (validExcludeIds.length > 0) {
      // Don't add to baseFilter yet - we'll handle it at the end based on other filters
    }
  }

  // Add group filter
  if (advancedFilterData.group || group) {
    const groupValue = advancedFilterData.group || group;

    const normalizeGroup = (groupName) => {
      if (!groupName || typeof groupName !== "string") return "";
      return groupName.trim().toLowerCase();
    };

    if (typeof groupValue === "string") {
      const normalizedGroup = normalizeGroup(groupValue);
      if (normalizedGroup) {
        baseFilter.push({
          $expr: {
            $eq: [
              { $trim: { input: { $toLower: "$group" } } },
              normalizedGroup,
            ],
          },
        });
      }
    } else if (Array.isArray(groupValue)) {
      // Filter out empty/whitespace groups and normalize
      const validGroups = groupValue
        .map((g) => normalizeGroup(g))
        .filter((g) => g.length > 0);

      if (validGroups.length > 0) {
        // Match any of the valid groups (case insensitive, trimmed)
        baseFilter.push({
          $expr: {
            $in: [{ $trim: { input: { $toLower: "$group" } } }, validGroups],
          },
        });
      }
    }
  }

  // Add exclude CMC clients filter
  if (advancedFilterData.excludeCMCClients) {
    baseFilter.push({
      $nor: [{ group: "CMC" }, { group: { $regex: "CMC", $options: "i" } }],
    });
  }

  // Add exclude DCS clients filter
  if (advancedFilterData.excludeDCSClients) {
    baseFilter.push({
      $nor: [{ group: "DCS" }, { group: { $regex: "DCS", $options: "i" } }],
    });
  }

  // Add basic text search filter
  if (filter) {
    // Check if it's a payment reference search
    if (filter.toLowerCase().startsWith("ref:")) {
      const paymentRef = filter.substring(4).trim();
      if (paymentRef) {
        try {
          // Search across ALL subscription models for payment references
          const WmmModel = await getModelInstance("WmmModel");
          const PromoModel = await getModelInstance("PromoModel");
          const ComplimentaryModel = await getModelInstance(
            "ComplimentaryModel"
          );
          const FomModel = await getModelInstance("FomModel");
          const HrgModel = await getModelInstance("HrgModel");
          const CalModel = await getModelInstance("CalModel");

          // Use the helper to extract the reference number
          const extractedRef = extractPaymentRefNumber(paymentRef);
          const searchPattern = extractedRef || paymentRef;

          // Search in ALL models for payment reference
          const [
            wmmClients,
            promoClients,
            complimentaryClients,
            fomClients,
            hrgClients,
            calClients,
          ] = await Promise.all([
            WmmModel.find({
              paymtref: { $regex: searchPattern, $options: "i" },
            }).distinct("clientid"),
            PromoModel.find({
              paymtref: { $regex: searchPattern, $options: "i" },
            }).distinct("clientid"),
            ComplimentaryModel.find({
              paymtref: { $regex: searchPattern, $options: "i" },
            }).distinct("clientid"),
            FomModel.find({
              paymtref: { $regex: searchPattern, $options: "i" },
            }).distinct("clientid"),
            HrgModel.find({
              paymtref: { $regex: searchPattern, $options: "i" },
            }).distinct("clientid"),
            CalModel.find({
              paymtref: { $regex: searchPattern, $options: "i" },
            }).distinct("clientid"),
          ]);

          // Combine all client IDs from all models
          const allClientIds = [
            ...wmmClients,
            ...promoClients,
            ...complimentaryClients,
            ...fomClients,
            ...hrgClients,
            ...calClients,
          ];

          if (allClientIds.length > 0) {
            const validClientIds = allClientIds
              .map((id) => parseInt(id))
              .filter((id) => !isNaN(id));

            if (validClientIds.length > 0) {
              baseFilter.push({ id: { $in: validClientIds } });
            } else {
              baseFilter.push({ id: -1 }); // No matches if invalid IDs
            }
          } else {
            baseFilter.push({ id: -1 }); // No matches if no payment refs found
          }
        } catch (error) {
          console.error("Error in payment reference filtering:", error);
          baseFilter.push({ id: -1 }); // No matches on error
        }
      }
    } else {
      // Handle regular search (client ID, names, company names)
      const numericFilter = Number(filter);
      const isNumeric = !isNaN(numericFilter);

      // Check if the search term contains spaces (likely a full name or company name)
      const hasSpaces = filter.includes(" ");

      if (hasSpaces) {
        // Handle full names and company names with spaces
        const searchTerms = filter
          .split(/\s+/)
          .filter((term) => term.trim() !== "");

        if (searchTerms.length > 0) {
          const searchQueries = [];

          // Add exact full name/company match
          searchQueries.push({
            $or: [
              { company: { $regex: filter, $options: "i" } },
              // Try to match as full name (first + last name)
              {
                $and: [
                  { fname: { $regex: searchTerms[0], $options: "i" } },
                  { lname: { $regex: searchTerms[1] || "", $options: "i" } },
                ],
              },
              // Try reverse order (last + first name)
              {
                $and: [
                  { lname: { $regex: searchTerms[0], $options: "i" } },
                  { fname: { $regex: searchTerms[1] || "", $options: "i" } },
                ],
              },
            ],
          });

          // Add partial matches for each search term
          searchQueries.push({
            $or: searchTerms.map((term) => ({
              $or: [
                { fname: { $regex: term, $options: "i" } },
                { lname: { $regex: term, $options: "i" } },
                { mname: { $regex: term, $options: "i" } },
                { sname: { $regex: term, $options: "i" } },
                { company: { $regex: term, $options: "i" } },
              ],
            })),
          });

          baseFilter.push({ $or: searchQueries });
        }
      } else {
        // Handle single word searches (client ID, single names, company names)
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
    }
  }

  // Add full name search
  if (advancedFilterData.fullName) {
    const fullName = advancedFilterData.fullName.trim();
    const nameParts = fullName
      .split(/\s+/)
      .filter((part) => part.trim() !== "");

    if (nameParts.length > 0) {
      const nameQueries = [];

      // Add exact company name match
      nameQueries.push({ company: { $regex: fullName, $options: "i" } });

      if (nameParts.length > 1) {
        // Handle full names with multiple parts
        nameQueries.push({
          $or: [
            // Try to match as full name (first + last name)
            {
              $and: [
                { fname: { $regex: nameParts[0], $options: "i" } },
                { lname: { $regex: nameParts[1], $options: "i" } },
              ],
            },
            // Try reverse order (last + first name)
            {
              $and: [
                { lname: { $regex: nameParts[0], $options: "i" } },
                { fname: { $regex: nameParts[1], $options: "i" } },
              ],
            },
            // Try to match any combination of name parts
            {
              $and: nameParts.map((part) => ({
                $or: [
                  { fname: { $regex: part, $options: "i" } },
                  { lname: { $regex: part, $options: "i" } },
                  { mname: { $regex: part, $options: "i" } },
                  { sname: { $regex: part, $options: "i" } },
                  { company: { $regex: part, $options: "i" } },
                ],
              })),
            },
          ],
        });
      } else {
        // Handle single word names
        nameQueries.push({
          $or: [
            { fname: { $regex: nameParts[0], $options: "i" } },
            { lname: { $regex: nameParts[0], $options: "i" } },
            { mname: { $regex: nameParts[0], $options: "i" } },
            { sname: { $regex: nameParts[0], $options: "i" } },
            { company: { $regex: nameParts[0], $options: "i" } },
          ],
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

  // Add service-specific filters (bypass if this is a search query)
  // Only apply service filters if this is NOT a search query
  if (!isSearchQuery) {
    await addServiceFilters(baseFilter, advancedFilterData);
  }

  // Add personal info field filters
  addPersonalInfoFilters(baseFilter, advancedFilterData);

  // Add date filters
  await addDateFilters(baseFilter, advancedFilterData);

  // Add area and type filters
  addAreaAndTypeFilters(baseFilter, advancedFilterData);

  // Add subsclass filter (only for WMM model)
  if (advancedFilterData.subsclass) {
    const subscriptionType = advancedFilterData.subscriptionType || "WMM";

    // Only apply subsclass filter for WMM subscription type
    if (subscriptionType === "WMM") {
      try {
        const WmmModel = await getModelInstance("WmmModel");

        // Use aggregation to get the most recent record for each client based on adddate
        const pipeline = [
          // Convert adddate string to Date for proper sorting
          {
            $addFields: {
              addDateObj: {
                $dateFromString: {
                  dateString: "$adddate",
                  format: "%Y-%m-%d",
                  onError: null,
                  onNull: null,
                },
              },
            },
          },

          // Only include records with valid dates
          { $match: { addDateObj: { $ne: null } } },

          // Sort by client ID and adddate (newest first)
          { $sort: { clientid: 1, addDateObj: -1 } },

          // Group by client ID to get the most recent record
          {
            $group: {
              _id: "$clientid",
              latestSubsclass: { $first: "$subsclass" },
              latestAddDate: { $first: "$adddate" },
            },
          },

          // Only include clients where the most recent subsclass exactly matches the filter
          { $match: { latestSubsclass: advancedFilterData.subsclass } },

          // Project only the client ID
          { $project: { _id: 1 } },
        ];

        const clientsWithSubsclass = await WmmModel.aggregate(pipeline);

        const validClientIds = clientsWithSubsclass
          .map((c) => parseInt(c._id))
          .filter((id) => !isNaN(id));

        if (validClientIds.length > 0) {
          baseFilter.push({ id: { $in: validClientIds } });
        } else {
          baseFilter.push({ id: -1 }); // No matches
        }
      } catch (error) {
        console.error("Error in subsclass filtering:", error);
        baseFilter.push({ id: -1 }); // No matches on error
      }
    }
  }

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

  // Add HRG/FOM subscription status filter
  if (
    advancedFilterData.hrgFomSubscriptionStatus &&
    advancedFilterData.hrgFomSubscriptionStatus !== "all"
  ) {
    try {
      const HrgModel = await getModelInstance("HrgModel");
      const FomModel = await getModelInstance("FomModel");

      let targetClients = new Set();
      const services = advancedFilterData.services || [];

      // Determine which services to check based on services filter
      // If no services are specified, we need to check both and be flexible
      // If services are specified, we only check those specific services
      const checkHrg = services.includes("HRG");
      const checkFom = services.includes("FOM");
      const noServiceFilter = services.length === 0;

      // Check for date range filters
      const hasHrgDateRange =
        advancedFilterData.hrgPaymentFromDate ||
        advancedFilterData.hrgPaymentToDate ||
        advancedFilterData.hrgCampaignFromDate ||
        advancedFilterData.hrgCampaignToDate;
      const hasFomDateRange =
        advancedFilterData.fomPaymentFromDate ||
        advancedFilterData.fomPaymentToDate;

      // Get clients based on subscription status
      if (advancedFilterData.hrgFomSubscriptionStatus === "subscribed") {
        // Get subscribed clients (unsubscribe = false or not set) with most recent data
        const queries = [];

        if (noServiceFilter) {
          // If no service filter, check both HRG and FOM for subscribed clients
          // This will include clients who are subscribed to either HRG or FOM

          // Get all HRG clients with their latest subscription status
          let hrgPipeline = [
            { $match: {} }, // Get all records first
          ];

          // Add date range filter for HRG if specified
          if (hasHrgDateRange) {
            const hrgStartDate = advancedFilterData.hrgPaymentFromDate
              ? parseDate(advancedFilterData.hrgPaymentFromDate)
              : advancedFilterData.hrgCampaignFromDate
              ? parseDate(advancedFilterData.hrgCampaignFromDate)
              : null;
            const hrgEndDate = advancedFilterData.hrgPaymentToDate
              ? parseDate(advancedFilterData.hrgPaymentToDate)
              : advancedFilterData.hrgCampaignToDate
              ? parseDate(advancedFilterData.hrgCampaignToDate)
              : null;

            if (hrgEndDate) {
              hrgEndDate.setHours(23, 59, 59, 999);
            }

            // Add date pipeline and date range match
            hrgPipeline.push(...createDatePipeline("recvdate"));
            hrgPipeline.push({
              $match: {
                normalizedDate: {
                  ...(hrgStartDate && { $gte: hrgStartDate }),
                  ...(hrgEndDate && { $lte: hrgEndDate }),
                },
              },
            });
          }

          hrgPipeline.push(
            { $sort: { clientid: 1, adddate: -1 } }, // Sort by adddate to get most recent record
            {
              $group: { _id: "$clientid", latestRecord: { $first: "$$ROOT" } },
            },
            { $match: { "latestRecord.unsubscribe": { $ne: true } } }, // Only subscribed clients (unsubscribe != true)
            {
              $project: {
                _id: 1,
                unsubscribeValue: "$latestRecord.unsubscribe",
                adddateValue: "$latestRecord.adddate",
              },
            }
          );

          queries.push(HrgModel.aggregate(hrgPipeline));

          // Get all FOM clients with their latest subscription status
          let fomPipeline = [
            { $match: {} }, // Get all records first
          ];

          // Add date range filter for FOM if specified
          if (hasFomDateRange) {
            const fomStartDate = advancedFilterData.fomPaymentFromDate
              ? parseDate(advancedFilterData.fomPaymentFromDate)
              : null;
            const fomEndDate = advancedFilterData.fomPaymentToDate
              ? parseDate(advancedFilterData.fomPaymentToDate)
              : null;

            if (fomEndDate) {
              fomEndDate.setHours(23, 59, 59, 999);
            }

            // Add date pipeline and date range match
            fomPipeline.push(...createDatePipeline("recvdate"));
            fomPipeline.push({
              $match: {
                normalizedDate: {
                  ...(fomStartDate && { $gte: fomStartDate }),
                  ...(fomEndDate && { $lte: fomEndDate }),
                },
              },
            });
          }

          fomPipeline.push(
            { $sort: { clientid: 1, adddate: -1 } }, // Sort by adddate to get most recent record
            {
              $group: { _id: "$clientid", latestRecord: { $first: "$$ROOT" } },
            },
            { $match: { "latestRecord.unsubscribe": { $ne: true } } }, // Only subscribed clients (unsubscribe != true)
            {
              $project: {
                _id: 1,
                unsubscribeValue: "$latestRecord.unsubscribe",
                adddateValue: "$latestRecord.adddate",
              },
            }
          );

          queries.push(FomModel.aggregate(fomPipeline));
        } else {
          // If service filter is applied, only check the specified services
          if (checkHrg) {
            let hrgPipeline = [
              { $match: {} }, // Get all records first
            ];

            // Add date range filter for HRG if specified
            if (hasHrgDateRange) {
              const hrgStartDate = advancedFilterData.hrgPaymentFromDate
                ? parseDate(advancedFilterData.hrgPaymentFromDate)
                : advancedFilterData.hrgCampaignFromDate
                ? parseDate(advancedFilterData.hrgCampaignFromDate)
                : null;
              const hrgEndDate = advancedFilterData.hrgPaymentToDate
                ? parseDate(advancedFilterData.hrgPaymentToDate)
                : advancedFilterData.hrgCampaignToDate
                ? parseDate(advancedFilterData.hrgCampaignToDate)
                : null;

              if (hrgEndDate) {
                hrgEndDate.setHours(23, 59, 59, 999);
              }

              // Add date pipeline and date range match
              hrgPipeline.push(...createDatePipeline("recvdate"));
              hrgPipeline.push({
                $match: {
                  normalizedDate: {
                    ...(hrgStartDate && { $gte: hrgStartDate }),
                    ...(hrgEndDate && { $lte: hrgEndDate }),
                  },
                },
              });
            }

            hrgPipeline.push(
              { $sort: { clientid: 1, adddate: -1 } }, // Sort by adddate to get most recent record
              {
                $group: {
                  _id: "$clientid",
                  latestRecord: { $first: "$$ROOT" },
                },
              },
              { $match: { "latestRecord.unsubscribe": { $ne: true } } },
              {
                $project: {
                  _id: 1,
                  unsubscribeValue: "$latestRecord.unsubscribe",
                  adddateValue: "$latestRecord.adddate",
                },
              }
            );

            queries.push(HrgModel.aggregate(hrgPipeline));
          }

          if (checkFom) {
            let fomPipeline = [
              { $match: {} }, // Get all records first
            ];

            // Add date range filter for FOM if specified
            if (hasFomDateRange) {
              const fomStartDate = advancedFilterData.fomPaymentFromDate
                ? parseDate(advancedFilterData.fomPaymentFromDate)
                : null;
              const fomEndDate = advancedFilterData.fomPaymentToDate
                ? parseDate(advancedFilterData.fomPaymentToDate)
                : null;

              if (fomEndDate) {
                fomEndDate.setHours(23, 59, 59, 999);
              }

              // Add date pipeline and date range match
              fomPipeline.push(...createDatePipeline("recvdate"));
              fomPipeline.push({
                $match: {
                  normalizedDate: {
                    ...(fomStartDate && { $gte: fomStartDate }),
                    ...(fomEndDate && { $lte: fomEndDate }),
                  },
                },
              });
            }

            fomPipeline.push(
              { $sort: { clientid: 1, adddate: -1 } }, // Sort by adddate to get most recent record
              {
                $group: {
                  _id: "$clientid",
                  latestRecord: { $first: "$$ROOT" },
                },
              },
              { $match: { "latestRecord.unsubscribe": { $ne: true } } },
              {
                $project: {
                  _id: 1,
                  unsubscribeValue: "$latestRecord.unsubscribe",
                  adddateValue: "$latestRecord.adddate",
                },
              }
            );

            queries.push(FomModel.aggregate(fomPipeline));
          }
        }

        const results = await Promise.all(queries);

        results.forEach((result, index) => {
          result.forEach((client) => {
            targetClients.add(client._id);
          });
        });
      } else if (
        advancedFilterData.hrgFomSubscriptionStatus === "unsubscribed"
      ) {
        // Get unsubscribed clients (unsubscribe = true) with most recent data
        const queries = [];

        if (noServiceFilter) {
          // If no service filter, check both HRG and FOM for unsubscribed clients
          // This will include clients who are unsubscribed from either HRG or FOM

          // Get all HRG clients with their latest subscription status
          let hrgPipeline = [
            { $match: {} }, // Get all records first
          ];

          // Add date range filter for HRG if specified
          if (hasHrgDateRange) {
            const hrgStartDate = advancedFilterData.hrgPaymentFromDate
              ? parseDate(advancedFilterData.hrgPaymentFromDate)
              : advancedFilterData.hrgCampaignFromDate
              ? parseDate(advancedFilterData.hrgCampaignFromDate)
              : null;
            const hrgEndDate = advancedFilterData.hrgPaymentToDate
              ? parseDate(advancedFilterData.hrgPaymentToDate)
              : advancedFilterData.hrgCampaignToDate
              ? parseDate(advancedFilterData.hrgCampaignToDate)
              : null;

            if (hrgEndDate) {
              hrgEndDate.setHours(23, 59, 59, 999);
            }

            // Add date pipeline and date range match
            hrgPipeline.push(...createDatePipeline("recvdate"));
            hrgPipeline.push({
              $match: {
                normalizedDate: {
                  ...(hrgStartDate && { $gte: hrgStartDate }),
                  ...(hrgEndDate && { $lte: hrgEndDate }),
                },
              },
            });
          }

          hrgPipeline.push(
            { $sort: { clientid: 1, adddate: -1 } }, // Sort by adddate to get most recent record
            {
              $group: { _id: "$clientid", latestRecord: { $first: "$$ROOT" } },
            },
            { $match: { "latestRecord.unsubscribe": true } }, // Only unsubscribed clients
            {
              $project: {
                _id: 1,
                unsubscribeValue: "$latestRecord.unsubscribe",
                adddateValue: "$latestRecord.adddate",
              },
            }
          );

          queries.push(HrgModel.aggregate(hrgPipeline));

          // Get all FOM clients with their latest subscription status
          let fomPipeline = [
            { $match: {} }, // Get all records first
          ];

          // Add date range filter for FOM if specified
          if (hasFomDateRange) {
            const fomStartDate = advancedFilterData.fomPaymentFromDate
              ? parseDate(advancedFilterData.fomPaymentFromDate)
              : null;
            const fomEndDate = advancedFilterData.fomPaymentToDate
              ? parseDate(advancedFilterData.fomPaymentToDate)
              : null;

            if (fomEndDate) {
              fomEndDate.setHours(23, 59, 59, 999);
            }

            // Add date pipeline and date range match
            fomPipeline.push(...createDatePipeline("recvdate"));
            fomPipeline.push({
              $match: {
                normalizedDate: {
                  ...(fomStartDate && { $gte: fomStartDate }),
                  ...(fomEndDate && { $lte: fomEndDate }),
                },
              },
            });
          }

          fomPipeline.push(
            { $sort: { clientid: 1, adddate: -1 } }, // Sort by adddate to get most recent record
            {
              $group: { _id: "$clientid", latestRecord: { $first: "$$ROOT" } },
            },
            { $match: { "latestRecord.unsubscribe": true } }, // Only unsubscribed clients
            {
              $project: {
                _id: 1,
                unsubscribeValue: "$latestRecord.unsubscribe",
                adddateValue: "$latestRecord.adddate",
              },
            }
          );

          queries.push(FomModel.aggregate(fomPipeline));
        } else {
          // If service filter is applied, only check the specified services
          if (checkHrg) {
            let hrgPipeline = [
              { $match: {} }, // Get all records first
            ];

            // Add date range filter for HRG if specified
            if (hasHrgDateRange) {
              const hrgStartDate = advancedFilterData.hrgPaymentFromDate
                ? parseDate(advancedFilterData.hrgPaymentFromDate)
                : advancedFilterData.hrgCampaignFromDate
                ? parseDate(advancedFilterData.hrgCampaignFromDate)
                : null;
              const hrgEndDate = advancedFilterData.hrgPaymentToDate
                ? parseDate(advancedFilterData.hrgPaymentToDate)
                : advancedFilterData.hrgCampaignToDate
                ? parseDate(advancedFilterData.hrgCampaignToDate)
                : null;

              if (hrgEndDate) {
                hrgEndDate.setHours(23, 59, 59, 999);
              }

              // Add date pipeline and date range match
              hrgPipeline.push(...createDatePipeline("recvdate"));
              hrgPipeline.push({
                $match: {
                  normalizedDate: {
                    ...(hrgStartDate && { $gte: hrgStartDate }),
                    ...(hrgEndDate && { $lte: hrgEndDate }),
                  },
                },
              });
            }

            hrgPipeline.push(
              { $sort: { clientid: 1, adddate: -1 } }, // Sort by adddate to get most recent record
              {
                $group: {
                  _id: "$clientid",
                  latestRecord: { $first: "$$ROOT" },
                },
              },
              { $match: { "latestRecord.unsubscribe": true } },
              {
                $project: {
                  _id: 1,
                  unsubscribeValue: "$latestRecord.unsubscribe",
                  adddateValue: "$latestRecord.adddate",
                },
              }
            );

            queries.push(HrgModel.aggregate(hrgPipeline));
          }

          if (checkFom) {
            let fomPipeline = [
              { $match: {} }, // Get all records first
            ];

            // Add date range filter for FOM if specified
            if (hasFomDateRange) {
              const fomStartDate = advancedFilterData.fomPaymentFromDate
                ? parseDate(advancedFilterData.fomPaymentFromDate)
                : null;
              const fomEndDate = advancedFilterData.fomPaymentToDate
                ? parseDate(advancedFilterData.fomPaymentToDate)
                : null;

              if (fomEndDate) {
                fomEndDate.setHours(23, 59, 59, 999);
              }

              // Add date pipeline and date range match
              fomPipeline.push(...createDatePipeline("recvdate"));
              fomPipeline.push({
                $match: {
                  normalizedDate: {
                    ...(fomStartDate && { $gte: fomStartDate }),
                    ...(fomEndDate && { $lte: fomEndDate }),
                  },
                },
              });
            }

            fomPipeline.push(
              { $sort: { clientid: 1, adddate: -1 } }, // Sort by adddate to get most recent record
              {
                $group: {
                  _id: "$clientid",
                  latestRecord: { $first: "$$ROOT" },
                },
              },
              { $match: { "latestRecord.unsubscribe": true } },
              {
                $project: {
                  _id: 1,
                  unsubscribeValue: "$latestRecord.unsubscribe",
                  adddateValue: "$latestRecord.adddate",
                },
              }
            );

            queries.push(FomModel.aggregate(fomPipeline));
          }
        }

        const results = await Promise.all(queries);

        results.forEach((result, index) => {
          result.forEach((client) => {
            targetClients.add(client._id);
          });
        });
      }

      // Convert Set to Array and add to filter
      const finalClients = [...targetClients]
        .map(Number)
        .filter((id) => !isNaN(id));

      // Handle clientID filtering when HRG/FOM subscription status is selected
      if (finalClients.length > 0) {
        // Apply clientID filtering to HRG/FOM subscription status results
        const filteredClients = applyClientIdFiltering(
          finalClients,
          advancedFilterData
        );

        if (filteredClients.length > 0) {
          baseFilter.push({ id: { $in: filteredClients } });
        } else {
          baseFilter.push({ id: -1 }); // No matches after clientID filtering
        }
      } else {
        baseFilter.push({ id: -1 }); // No matches
      }
    } catch (error) {
      console.error("Error in HRG/FOM subscription status filtering:", error);
      baseFilter.push({ id: -1 }); // No matches on error
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

    // Handle clientID filtering when HRG/FOM active subscription is selected
    if (activeClientIds.length > 0) {
      // Apply clientID filtering to HRG/FOM active subscription results
      const filteredClients = applyClientIdFiltering(
        activeClientIds,
        advancedFilterData
      );

      if (filteredClients.length > 0) {
        baseFilter.push({ id: { $in: filteredClients } });
      } else {
        baseFilter.push({ id: -1 }); // No matches after clientID filtering
      }
    } else {
      baseFilter.push({ id: -1 });
    }
  }

  // At the end, before returning the query:
  // Check if there are other filters besides include/exclude
  const hasOtherFilters =
    baseFilter.length > 0 ||
    (filter && filter.trim() !== "") ||
    advancedFilterData.group ||
    group ||
    hasExplicitServices ||
    Object.keys(advancedFilterData).some(
      (key) =>
        key !== "includeClientIds" &&
        key !== "excludeClientIds" &&
        key !== "clientId" &&
        advancedFilterData[key] !== undefined &&
        advancedFilterData[key] !== null &&
        advancedFilterData[key] !== ""
    );

  // Get exclude IDs if present
  const excludeIds = advancedFilterData.excludeClientIds
    ? Array.isArray(advancedFilterData.excludeClientIds)
      ? advancedFilterData.excludeClientIds
      : [advancedFilterData.excludeClientIds]
    : [];
  const validExcludeIds = excludeIds
    .map((id) => Number(id))
    .filter((id) => !isNaN(id) && isFinite(id));

  if (hasIncludedIds && !hasExplicitServices) {
    // Handle include logic
    if (validExcludeIds.length > 0) {
      // Apply exclude to included IDs
      const filteredIncludedIds = includedIds.filter(
        (id) => !validExcludeIds.includes(id)
      );

      if (filteredIncludedIds.length > 0) {
        if (hasOtherFilters) {
          // Include + Exclude + Other filters: filtered included IDs OR other filters
          const conditions = [{ id: { $in: filteredIncludedIds } }];
          if (baseFilter.length > 0) {
            conditions.push({ $and: baseFilter });
          }
          filterQuery = { $or: conditions };
        } else {
          // Include + Exclude only: just the filtered included IDs
          filterQuery = { id: { $in: filteredIncludedIds } };
        }
      } else {
        // All included IDs were excluded
        if (hasOtherFilters) {
          // Only other filters
          filterQuery = baseFilter.length > 0 ? { $and: baseFilter } : {};
        } else {
          // No results
          filterQuery = { id: -1 };
        }
      }
    } else {
      // Only include, no exclude
      if (hasOtherFilters) {
        // Include + Other filters: included IDs OR other filters
        const conditions = [{ id: { $in: includedIds } }];
        if (baseFilter.length > 0) {
          conditions.push({ $and: baseFilter });
        }
        filterQuery = { $or: conditions };
      } else {
        // Include only: just the included IDs
        filterQuery = { id: { $in: includedIds } };
      }
    }
  } else if (
    !hasIncludedIds &&
    validExcludeIds.length > 0 &&
    !hasExplicitServices
  ) {
    // Only exclude logic
    if (hasOtherFilters) {
      // Exclude + Other filters: apply other filters first, then exclude
      // We'll handle this by adding exclude to the baseFilter
      baseFilter.push({ id: { $nin: validExcludeIds } });
      filterQuery = baseFilter.length > 0 ? { $and: baseFilter } : {};
    } else {
      // Exclude only: global exclude
      filterQuery = { id: { $nin: validExcludeIds } };
    }
  } else {
    // No include/exclude OR services are selected (clientID filtering is handled within service filtering)
    if (validExcludeIds.length > 0 && !hasExplicitServices) {
      if (hasOtherFilters) {
        // Other filters + exclude: we need to use aggregation to apply filters first, then exclude
        // This requires a different approach - we'll need to modify the query to use aggregation
        // For now, let's create a special case for this scenario
        try {
          const ClientModel = await getModelInstance("ClientModel");

          // First, apply the other filters to get the matching client IDs
          const otherFilters = baseFilter.filter(
            (filter) => !filter.id || !filter.id.$nin
          );
          const matchQuery =
            otherFilters.length > 0 ? { $and: otherFilters } : {};

          // Get all clients that match the other filters
          const matchingClients = await ClientModel.find(matchQuery).distinct(
            "id"
          );
          const matchingClientIds = matchingClients
            .map((id) => Number(id))
            .filter((id) => !isNaN(id));

          // Then exclude the specified IDs from the results
          const finalClientIds = matchingClientIds.filter(
            (id) => !validExcludeIds.includes(id)
          );

          if (finalClientIds.length > 0) {
            filterQuery = { id: { $in: finalClientIds } };
          } else {
            filterQuery = { id: -1 }; // No matches after exclusion
          }
        } catch (error) {
          console.error(
            "Error in exclude filtering with other filters:",
            error
          );
          // Fallback to simple $and approach
          baseFilter.push({ id: { $nin: validExcludeIds } });
          filterQuery = baseFilter.length > 0 ? { $and: baseFilter } : {};
        }
      } else {
        // Exclude only: global exclude
        filterQuery = { id: { $nin: validExcludeIds } };
      }
    } else {
      filterQuery = baseFilter.length > 0 ? { $and: baseFilter } : {};
    }
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

    // Use the helper to extract the reference number
    const extractedRef = extractPaymentRefNumber(paymentRef);
    let refPattern = extractedRef || paymentRef;

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

      // Special handling for FOM and HRG to remove exclusivity and avoid implicit DCS/CMC exclusion
      if (serviceClientsMap.FOM || serviceClientsMap.HRG) {
        const allThreeSelected =
          serviceClientsMap.FOM &&
          serviceClientsMap.HRG &&
          serviceClientsMap.CAL;

        // If all three services are selected, union all
        if (allThreeSelected) {
          targetClients = new Set([
            ...serviceClientsMap.FOM,
            ...serviceClientsMap.HRG,
            ...serviceClientsMap.CAL,
          ]);
        }
        // If both FOM and HRG are selected, include union of both
        else if (serviceClientsMap.FOM && serviceClientsMap.HRG) {
          targetClients = new Set([
            ...serviceClientsMap.FOM,
            ...serviceClientsMap.HRG,
          ]);
        }
        // If only FOM is selected, include all FOM clients
        else if (serviceClientsMap.FOM) {
          targetClients = new Set([...serviceClientsMap.FOM]);
        }
        // If only HRG is selected, include all HRG clients
        else if (serviceClientsMap.HRG) {
          targetClients = new Set([...serviceClientsMap.HRG]);
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

      // Handle clientID filtering when services are selected
      if (finalClients.length > 0) {
        // Apply clientID filtering to service results
        const filteredClients = applyClientIdFiltering(
          finalClients,
          advancedFilterData
        );

        if (filteredClients.length > 0) {
          baseFilter.push({ id: { $in: filteredClients } });
        } else {
          baseFilter.push({ id: -1 }); // No matches after clientID filtering
        }
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

  // Handle Calendar Entitlement Filter
  if (advancedFilterData.calendarEntitledOnly) {
    try {
      const subscriptionType = advancedFilterData.subscriptionType || "WMM";
      const Model = await getSubscriptionModel(subscriptionType);

      // Normalize expiry range to months (ignore day) if provided
      // We will intersect entitlement with the selected Expiry Date range if present
      let expiryStart = null;
      let expiryEnd = null;
      if (advancedFilterData.wmmExpiringFromDate) {
        const d = parseDate(advancedFilterData.wmmExpiringFromDate);
        if (d)
          expiryStart = new Date(
            Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
          );
      }
      if (advancedFilterData.wmmExpiringToDate) {
        const d = parseDate(advancedFilterData.wmmExpiringToDate);
        if (d)
          expiryEnd = new Date(
            Date.UTC(
              d.getUTCFullYear(),
              d.getUTCMonth() + 1,
              0,
              23,
              59,
              59,
              999
            )
          );
      }

      // Build pipeline on enddate; if expiry range provided, match within it
      const entitlementPipeline = [
        ...createDatePipeline("enddate", subscriptionType),
      ];

      if (expiryStart || expiryEnd) {
        entitlementPipeline.push({
          $match: {
            normalizedDate: {
              ...(expiryStart && { $gte: expiryStart }),
              ...(expiryEnd && { $lte: expiryEnd }),
            },
          },
        });
      }

      // Project year/month for month-only comparisons and group by client+year
      entitlementPipeline.push(
        {
          $project: {
            clientid: 1,
            year: { $year: "$normalizedDate" },
            month: { $month: "$normalizedDate" },
          },
        },
        {
          $group: {
            _id: { clientid: "$clientid", year: "$year" },
            maxMonth: { $max: "$month" },
          },
        }
      );

      const grouped = await Model.aggregate(entitlementPipeline);

      // Determine entitlement per client within the (optional) expiry range years
      const entitledSet = new Set();
      for (const row of grouped) {
        const clientId = Number(row._id.clientid);
        if (isNaN(clientId)) continue;
        const maxMonth = row.maxMonth; // 1..12
        if (maxMonth >= 12) entitledSet.add(clientId);
      }

      // If an expiry range was given, only clients having at least one enddate in the range were considered above.
      // If no expiry range is given, the above evaluates all years present in data.

      let validClientIds = [...entitledSet];

      // Deduplicate (defensive)
      validClientIds = [...new Set(validClientIds)];

      if (validClientIds.length > 0) {
        baseFilter.push({ id: { $in: validClientIds } });
      } else {
        baseFilter.push({ id: -1 });
      }
    } catch (error) {
      console.error("Error in calendar entitlement filtering:", error);
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
  // Define createDatePipeline function at the beginning to avoid temporal dead zone
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
                      // For WMM/Complimentary/HRG/FOM/CAL, strip time if present and parse YYYY-MM-DD
                      $let: {
                        vars: {
                          datePart: {
                            $cond: {
                              if: {
                                $regexMatch: {
                                  input: `$${dateField}`,
                                  regex: " ",
                                },
                              },
                              then: {
                                $arrayElemAt: [
                                  { $split: [`$${dateField}`, " "] },
                                  0,
                                ],
                              },
                              else: `$${dateField}`,
                            },
                          },
                        },
                        in: {
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
            },
            else: {
              // For non-Promo models, strip time part if present then parse YYYY-MM-DD
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
    },
    {
      $match: {
        normalizedDate: { $ne: null },
      },
    },
  ];

  // Handle adddate_regex filter (optimized for subscription type)
  if (advancedFilterData.adddate_regex) {
    try {
      // Determine which models to query based on subscription type
      const subscriptionType = advancedFilterData.subscriptionType || "WMM";

      let modelsToQuery = [];

      if (subscriptionType === "WMM") {
        const WmmModel = await getModelInstance("WmmModel");
        modelsToQuery = [{ name: "WMM", model: WmmModel }];
      } else if (subscriptionType === "Promo") {
        const PromoModel = await getModelInstance("PromoModel");
        modelsToQuery = [{ name: "Promo", model: PromoModel }];
      } else if (subscriptionType === "Complimentary") {
        const ComplimentaryModel = await getModelInstance("ComplimentaryModel");
        modelsToQuery = [{ name: "Complimentary", model: ComplimentaryModel }];
      } else {
        // Default: query all models (for backward compatibility)
        const [
          WmmModel,
          FomModel,
          HrgModel,
          CalModel,
          PromoModel,
          ComplimentaryModel,
        ] = await Promise.all([
          getModelInstance("WmmModel"),
          getModelInstance("FomModel"),
          getModelInstance("HrgModel"),
          getModelInstance("CalModel"),
          getModelInstance("PromoModel"),
          getModelInstance("ComplimentaryModel"),
        ]);
        modelsToQuery = [
          { name: "WMM", model: WmmModel },
          { name: "FOM", model: FomModel },
          { name: "HRG", model: HrgModel },
          { name: "CAL", model: CalModel },
          { name: "Promo", model: PromoModel },
          { name: "Complimentary", model: ComplimentaryModel },
        ];
      }

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

      // Execute aggregation for relevant models only
      const modelResults = await Promise.all(
        modelsToQuery.map(async ({ name, model }) => {
          try {
            const results = await model.aggregate(createRegexPipeline);
            return results;
          } catch (error) {
            console.error(`Error aggregating ${name} model:`, error);
            return [];
          }
        })
      );

      // Combine all client IDs
      const matchingClientIds = [
        ...new Set(modelResults.flat().map((c) => Number(c._id))),
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
      // Determine which models to query based on subscription type
      const subscriptionType = advancedFilterData.subscriptionType || "WMM";

      let modelsToQuery = [];

      if (subscriptionType === "WMM") {
        const WmmModel = await getModelInstance("WmmModel");
        modelsToQuery = [{ name: "WMM", model: WmmModel, type: "WMM" }];
      } else if (subscriptionType === "Promo") {
        const PromoModel = await getModelInstance("PromoModel");
        modelsToQuery = [{ name: "Promo", model: PromoModel, type: "Promo" }];
      } else if (subscriptionType === "Complimentary") {
        const ComplimentaryModel = await getModelInstance("ComplimentaryModel");
        modelsToQuery = [
          {
            name: "Complimentary",
            model: ComplimentaryModel,
            type: "Complimentary",
          },
        ];
      } else {
        // Default: query all models (for backward compatibility)
        const [
          WmmModel,
          FomModel,
          HrgModel,
          CalModel,
          PromoModel,
          ComplimentaryModel,
        ] = await Promise.all([
          getModelInstance("WmmModel"),
          getModelInstance("FomModel"),
          getModelInstance("HrgModel"),
          getModelInstance("CalModel"),
          getModelInstance("PromoModel"),
          getModelInstance("ComplimentaryModel"),
        ]);
        modelsToQuery = [
          { name: "WMM", model: WmmModel, type: "WMM" },
          { name: "FOM", model: FomModel, type: "WMM" },
          { name: "HRG", model: HrgModel, type: "WMM" },
          { name: "CAL", model: CalModel, type: "WMM" },
          { name: "Promo", model: PromoModel, type: "Promo" },
          {
            name: "Complimentary",
            model: ComplimentaryModel,
            type: "Complimentary",
          },
        ];
      }

      // Prepare date range
      const dateRange = {
        startDate: advancedFilterData.startDate
          ? parseDate(advancedFilterData.startDate)
          : null,
        endDate: advancedFilterData.endDate
          ? parseDate(advancedFilterData.endDate)
          : null,
      };

      // Adjust end date to end of day if it exists
      if (dateRange.endDate) {
        dateRange.endDate.setHours(23, 59, 59, 999);
      }

      // Create pipelines for all models with date range filtering
      const createDateRangePipeline = (dateField, subscriptionType = "WMM") => {
        const basePipeline = createDatePipeline(dateField, subscriptionType);

        // Add date range filtering
        const dateConditions = [];
        if (dateRange.startDate && dateRange.endDate) {
          dateConditions.push({
            $expr: {
              $and: [
                { $gte: ["$normalizedDate", dateRange.startDate] },
                { $lte: ["$normalizedDate", dateRange.endDate] },
              ],
            },
          });
        } else if (dateRange.startDate) {
          dateConditions.push({
            $expr: {
              $gte: ["$normalizedDate", dateRange.startDate],
            },
          });
        } else if (dateRange.endDate) {
          dateConditions.push({
            $expr: {
              $lte: ["$normalizedDate", dateRange.endDate],
            },
          });
        }

        if (dateConditions.length > 0) {
          basePipeline.push({ $match: { $or: dateConditions } });
        }

        // Add grouping to get client IDs and original adddate for debugging
        basePipeline.push({
          $group: {
            _id: "$clientid",
            originalAddDate: { $first: `$${dateField}` },
            normalizedDate: { $first: "$normalizedDate" },
          },
        });

        return basePipeline;
      };

      const pipelines = modelsToQuery.map(({ model, type }) => ({
        model,
        pipeline: createDateRangePipeline("adddate", type),
      }));

      // Execute all aggregations in parallel
      const aggregationResults = await Promise.all(
        pipelines.map(({ model, pipeline }) => model.aggregate(pipeline))
      );

      // Combine and deduplicate client IDs
      const matchingClientIds = aggregationResults
        .flatMap((clients) => clients.map((c) => Number(c._id)))
        .filter((id) => !isNaN(id))
        .filter((id, index, self) => self.indexOf(id) === index); // Deduplicate

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

  // Handle Expiring Subscription Filter (supports WMM, Promo, Complimentary)
  if (
    advancedFilterData.wmmExpiringFromDate ||
    advancedFilterData.wmmExpiringToDate
  ) {
    try {
      const subscriptionType = advancedFilterData.subscriptionType || "WMM";
      const Model = await getSubscriptionModel(subscriptionType);

      let fromDate = null,
        toDate = null;
      if (advancedFilterData.wmmExpiringFromDate) {
        fromDate = getMonthRange(advancedFilterData.wmmExpiringFromDate).start;
      }
      if (advancedFilterData.wmmExpiringToDate) {
        toDate = getMonthRange(advancedFilterData.wmmExpiringToDate).end;
      }

      const pipeline = [
        ...createDatePipeline(
          "enddate",
          advancedFilterData.subscriptionType || "WMM"
        ),
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
              { $gte: ["$normalizedDate", fromDate] },
              { $lte: ["$normalizedDate", toDate] },
            ],
          },
        });
      } else if (fromDate) {
        dateConditions.push({
          $expr: {
            $gte: ["$normalizedDate", fromDate],
          },
        });
      } else if (toDate) {
        dateConditions.push({
          $expr: {
            $lte: ["$normalizedDate", toDate],
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

      const expiringClients = await Model.aggregate(pipeline);
      let validClientIds = expiringClients
        .map((c) => Number(c._id))
        .filter((id) => !isNaN(id));

      // If expiryDateRangeOnly is enabled, filter out clients who have renewed beyond the expiry date
      if (advancedFilterData.expiryDateRangeOnly && validClientIds.length > 0) {
        // Get the maximum expiry date from the range to use as the cutoff
        const maxExpiryDate = toDate || fromDate;

        if (maxExpiryDate) {
          // Find clients who have subscription records beyond the max expiry date
          const renewedClientsPipeline = [
            ...createDatePipeline(
              "subsdate",
              advancedFilterData.subscriptionType || "WMM"
            ),
            {
              $match: {
                $expr: {
                  $gt: ["$normalizedDate", maxExpiryDate],
                },
                clientid: { $in: validClientIds },
              },
            },
            {
              $group: {
                _id: "$clientid",
              },
            },
          ];

          const renewedClients = await Model.aggregate(renewedClientsPipeline);
          const renewedClientIds = renewedClients
            .map((c) => Number(c._id))
            .filter((id) => !isNaN(id));

          // Remove clients who have renewed beyond the expiry date
          validClientIds = validClientIds.filter(
            (id) => !renewedClientIds.includes(id)
          );
        }
      }

      if (validClientIds.length > 0) {
        baseFilter.push({ id: { $in: validClientIds } });
      } else {
        baseFilter.push({ id: -1 });
      }
    } catch (error) {
      console.error("Error in expiring subscription filtering:", error);
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
  // Now supports Month and Year (MM and YYYY) selection as well as legacy fields
  if (
    advancedFilterData.hrgCampaignFromDate ||
    advancedFilterData.hrgCampaignToDate ||
    advancedFilterData.hrgCampaignYear ||
    advancedFilterData.hrgCampaignMonth ||
    (advancedFilterData.hrgCampaignFromMonth &&
      advancedFilterData.hrgCampaignFromYear) ||
    (advancedFilterData.hrgCampaignToMonth &&
      advancedFilterData.hrgCampaignToYear)
  ) {
    try {
      const HrgModel = await getModelInstance("HrgModel");
      let pipeline = [...createDatePipeline("campaigndate")];

      // New month/year handling
      const hasSingleMonthYear =
        advancedFilterData.hrgCampaignMonth &&
        advancedFilterData.hrgCampaignYear;
      const hasFromMonthYear =
        advancedFilterData.hrgCampaignFromMonth &&
        advancedFilterData.hrgCampaignFromYear;
      const hasToMonthYear =
        advancedFilterData.hrgCampaignToMonth &&
        advancedFilterData.hrgCampaignToYear;

      if (hasSingleMonthYear) {
        const year = Number(advancedFilterData.hrgCampaignYear);
        const monthZeroIdx = Number(advancedFilterData.hrgCampaignMonth) - 1;
        if (
          !isNaN(year) &&
          !isNaN(monthZeroIdx) &&
          monthZeroIdx >= 0 &&
          monthZeroIdx <= 11
        ) {
          const monthStart = new Date(
            Date.UTC(year, monthZeroIdx, 1, 0, 0, 0, 0)
          );
          const monthEnd = new Date(
            Date.UTC(year, monthZeroIdx + 1, 0, 23, 59, 59, 999)
          );
          pipeline.push({
            $match: { normalizedDate: { $gte: monthStart, $lte: monthEnd } },
          });
        }
      } else if (hasFromMonthYear || hasToMonthYear) {
        let rangeStart = null;
        let rangeEnd = null;

        if (hasFromMonthYear) {
          const fromYear = Number(advancedFilterData.hrgCampaignFromYear);
          const fromMonthZeroIdx =
            Number(advancedFilterData.hrgCampaignFromMonth) - 1;
          if (
            !isNaN(fromYear) &&
            !isNaN(fromMonthZeroIdx) &&
            fromMonthZeroIdx >= 0 &&
            fromMonthZeroIdx <= 11
          ) {
            rangeStart = new Date(
              Date.UTC(fromYear, fromMonthZeroIdx, 1, 0, 0, 0, 0)
            );
          }
        }

        if (hasToMonthYear) {
          const toYear = Number(advancedFilterData.hrgCampaignToYear);
          const toMonthZeroIdx =
            Number(advancedFilterData.hrgCampaignToMonth) - 1;
          if (
            !isNaN(toYear) &&
            !isNaN(toMonthZeroIdx) &&
            toMonthZeroIdx >= 0 &&
            toMonthZeroIdx <= 11
          ) {
            rangeEnd = new Date(
              Date.UTC(toYear, toMonthZeroIdx + 1, 0, 23, 59, 59, 999)
            );
          }
        }

        if (rangeStart || rangeEnd) {
          pipeline.push({
            $match: {
              normalizedDate: {
                ...(rangeStart && { $gte: rangeStart }),
                ...(rangeEnd && { $lte: rangeEnd }),
              },
            },
          });
        }
      } else if (advancedFilterData.hrgCampaignYear) {
        // Year-only fallback (legacy or explicit)
        const year = Number(advancedFilterData.hrgCampaignYear);
        if (!isNaN(year)) {
          const yearStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
          const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
          pipeline.push({
            $match: { normalizedDate: { $gte: yearStart, $lte: yearEnd } },
          });
        }
      } else {
        // Legacy from/to full date values
        const startDate = advancedFilterData.hrgCampaignFromDate
          ? parseDate(advancedFilterData.hrgCampaignFromDate)
          : null;
        const endDate = advancedFilterData.hrgCampaignToDate
          ? parseDate(advancedFilterData.hrgCampaignToDate)
          : null;

        if (endDate) {
          endDate.setHours(23, 59, 59, 999);
        }

        pipeline.push({
          $match: {
            normalizedDate: {
              ...(startDate && { $gte: startDate }),
              ...(endDate && { $lte: endDate }),
            },
          },
        });
      }

      pipeline.push({
        $group: {
          _id: "$clientid",
        },
      });

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

  // Handle CAL Calendar Year via caltype "WALL CALENDAR YYYY"
  if (advancedFilterData.calYear) {
    try {
      const CalModel = await getModelInstance("CalModel");
      const year = Number(advancedFilterData.calYear);
      if (!isNaN(year)) {
        const regex = new RegExp(`^WALL\\s+CALENDAR\\s+${year}$`, "i");
        const clients = await CalModel.find({
          caltype: { $regex: regex },
        }).distinct("clientid");
        const validClientIds = clients
          .map((c) => Number(c))
          .filter((id) => !isNaN(id));
        if (validClientIds.length > 0)
          baseFilter.push({ id: { $in: validClientIds } });
        else baseFilter.push({ id: -1 });
      } else {
        baseFilter.push({ id: -1 });
      }
    } catch (error) {
      console.error("Error in CAL calendar year filtering:", error);
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
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  };

  // Single area code filter
  if (advancedFilterData.acode && advancedFilterData.acode.trim()) {
    const acodePattern = advancedFilterData.acode.trim();
    baseFilter.push({
      acode: {
        $regex: new RegExp(`^${escapeRegex(acodePattern)}\\s*$`, "i"),
      },
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
      const areaPatterns = validAreas.map(
        (area) => new RegExp(`^${escapeRegex(area)}\\s*$`, "i")
      );

      baseFilter.push({
        $or: areaPatterns.map((pattern) => ({ acode: pattern })),
      });
    }
  }

  if (advancedFilterData.type) {
    baseFilter.push({ type: advancedFilterData.type });
  }
}
