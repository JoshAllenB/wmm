import ClientModel from "../../models/clients.mjs";
import {
  models,
  modelConfigs,
  clientFields,
} from "../../models/modelConfig.mjs";

const additionalModels = {
  WmmModel: () => import("../../models/wmm.mjs"),
  HrgModel: () => import("../../models/hrg.mjs"),
  FomModel: () => import("../../models/fom.mjs"),
  CalModel: () => import("../../models/cal.mjs"),
};

function validatePaginationParams(page, limit) {
  // Ensure page and limit are numbers
  const validPage = typeof page === 'number' && !isNaN(page) ? Math.max(1, page) : 1;
  const validLimit = typeof limit === 'number' && !isNaN(limit) ? Math.max(1, limit) : 20;
  
  // Calculate skip value
  const skip = (validPage - 1) * validLimit;
  
  return { validPage, validLimit, skip };
}

async function fetchDataServices(
  modelNames,
  filter,
  page,
  limit,
  pageSize,
  group,
  clientIds = null,
  advancedFilterData = {}
) {
  try {
    // Validate pagination parameters to prevent NaN issues
    const { validPage, validLimit, skip } = validatePaginationParams(page, limit);

    // Update references to page and limit with the validated values
    page = validPage;
    limit = validLimit;

    // Ensure service-filtered data is fetched correctly
    // If advancedFilterData contains services, ensure corresponding model names are added
    if (advancedFilterData && advancedFilterData.services) {
      let servicesToAdd = [];
      const serviceMap = {
        "WMM": "WmmModel",
        "HRG": "HrgModel",
        "FOM": "FomModel",
        "CAL": "CalModel"
      };
      
      // Process services whether it's an array or comma-separated string
      const servicesArray = Array.isArray(advancedFilterData.services) 
        ? advancedFilterData.services 
        : (typeof advancedFilterData.services === 'string' 
          ? advancedFilterData.services.split(',').map(s => s.trim())
          : []);
          
      // Map services to model names with correct formatting
      servicesToAdd = servicesArray.map(service => {
        // Normalize the service name to handle case inconsistencies
        const serviceUpper = service.toUpperCase();
        return serviceMap[serviceUpper];
      }).filter(Boolean);
      
      // Add service models to modelNames if not already included
      servicesToAdd.forEach(modelName => {
        if (!modelNames.includes(modelName)) {
          modelNames.push(modelName);
        }
      });
    }

    // Cache imported models to avoid repeated dynamic imports
    const modelCache = {};

    async function getModel(modelKey) {
      if (!modelCache[modelKey]) {
        const importFunc = additionalModels[modelKey];
        if (importFunc) {
          const { default: Model } = await importFunc();
          modelCache[modelKey] = Model;
        }
      }
      return modelCache[modelKey];
    }

    let filterQuery = { $and: [] };

    const baseFilter = [];

    // Add group filter first (modified)
    if (advancedFilterData.group || group) {
      const groupValue = advancedFilterData.group || group;
      // Only add group filter if it's a non-empty string or array with non-empty values
      if (typeof groupValue === "string" && groupValue.trim()) {
        baseFilter.push({ group: groupValue });
      } else if (
        Array.isArray(groupValue) &&
        groupValue.some((g) => g.trim())
      ) {
        // Filter out empty strings and create valid group filter
        const validGroups = groupValue.filter((g) => g.trim());
        if (validGroups.length > 0) {
          baseFilter.push({ group: { $in: validGroups } });
        }
      }
    }

    // Add exclude SPack clients filter if enabled
    if (advancedFilterData.excludeSPackClients) {
      baseFilter.push({ 
        group: { 
          $not: { 
            $regex: "SPack", 
            $options: "i" 
          } 
        } 
      });
    }

    // Handle user filter (filter clients by the user who created or modified them)
    if (advancedFilterData.userId) {
      try {
        console.log("Filtering by user ID:", advancedFilterData.userId);
        
        // Get the username for this user ID
        const { default: UserModel } = await import("../../models/userControl/users.mjs");
        const userRecord = await UserModel.findById(advancedFilterData.userId);
        
        if (!userRecord || !userRecord.username) {
          console.log("Could not find username for user ID:", advancedFilterData.userId);
          baseFilter.push({ id: -1 }); // No results if we can't find the username
          return;
        }
        
        const username = userRecord.username;
        console.log("Found username:", username, "for user ID:", advancedFilterData.userId);
        
        // Import all service models to check for entries with this username
        const { default: WmmModel } = await import("../../models/wmm.mjs");
        const { default: FomModel } = await import("../../models/fom.mjs");
        const { default: HrgModel } = await import("../../models/hrg.mjs");
        const { default: CalModel } = await import("../../models/cal.mjs");
        
        // Create a simple adduser query that works across all models
        const adduserQuery = { adduser: { $regex: `^${username}$`, $options: 'i' } };
        
        // Find clients created by this user directly in the clients collection
        const clientsCreatedByUser = await ClientModel.find(adduserQuery).distinct("id");
        console.log(`Found ${clientsCreatedByUser.length} clients created directly by ${username}`);
        
        // Find clients with service records created by this user
        const [wmmClients, fomClients, hrgClients, calClients] = await Promise.all([
          WmmModel.find(adduserQuery).distinct("clientid"),
          FomModel.find(adduserQuery).distinct("clientid"),
          HrgModel.find(adduserQuery).distinct("clientid"),
          CalModel.find(adduserQuery).distinct("clientid")
        ]);
        
        console.log(`Service records created by ${username}:`, {
          wmm: wmmClients.length,
          fom: fomClients.length,
          hrg: hrgClients.length,
          cal: calClients.length
        });
        
        // Combine all unique client IDs
        const matchingClients = new Set([
          ...clientsCreatedByUser,
          ...wmmClients, 
          ...fomClients, 
          ...hrgClients, 
          ...calClients
        ].map(id => Number(id)));
        
        console.log(`Total unique clients with records by ${username}: ${matchingClients.size}`);
        
        if (matchingClients.size > 0) {
          console.log("Found clients for username:", username);
          baseFilter.push({ id: { $in: Array.from(matchingClients) } });
          
          // Store the username in the filter data for use in filtering records later
          // This will be used to filter the service records to only show those created by this user
          advancedFilterData.usernameFilter = username;
        } else {
          console.log("No clients found for username:", username);
          baseFilter.push({ id: -1 }); // No client has ID -1
        }
      } catch (error) {
        console.error("Error filtering by username:", error);
        baseFilter.push({ id: -1 }); // No client has ID -1
      }
    }

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

    // Handle fullName search
    if (advancedFilterData.fullName) {
      const fullName = advancedFilterData.fullName.trim();
      // Split the full name into parts
      const nameParts = fullName.split(/\s+/);

      // Create a more comprehensive search for full names
      // This will check if any part of the name matches any name field
      if (nameParts.length > 0) {
        const nameQueries = [];

        // Add a direct company phrase match for the full name
        nameQueries.push({ company: { $regex: fullName, $options: "i" } });

        // If multi-word search, require all words to be present in any name or company field
        if (nameParts.length > 1) {
          nameQueries.push({
            $and: nameParts.map((part) => ({
              $or: [
                { fname: { $regex: part, $options: "i" } },
                { lname: { $regex: part, $options: "i" } },
                { mname: { $regex: part, $options: "i" } },
                { sname: { $regex: part, $options: "i" } },
                { company: { $regex: part, $options: "i" } }
              ]
            }))
          });
        }

        nameParts.forEach((part) => {
          if (part.trim()) {
            nameQueries.push({ lname: { $regex: part, $options: "i" } });
            nameQueries.push({ fname: { $regex: part, $options: "i" } });
            nameQueries.push({ mname: { $regex: part, $options: "i" } });
            nameQueries.push({ sname: { $regex: part, $options: "i" } });
            nameQueries.push({ company: { $regex: part, $options: "i" } });
          }
        });

        baseFilter.push({
          $or: [
            ...nameQueries,
            ...(nameParts.length > 1
              ? [
                  {
                    $and: nameParts.map((part) => ({
                      $or: [
                        { lname: { $regex: part, $options: "i" } },
                        { fname: { $regex: part, $options: "i" } },
                        { mname: { $regex: part, $options: "i" } },
                        { sname: { $regex: part, $options: "i" } },
                        { company: { $regex: part, $options: "i" } }
                      ]
                    }))
                  }
                ]
              : [])
          ]
        });

        // --- Add scoring for relevance ---
        // This will be used in the aggregation pipeline after the filter is built
        // We'll add this to the pipeline after the filterQuery is constructed
        // So, set a flag here
        filterQuery.__addScoring = nameParts;
      }
    }

    // Handle clientId search (specific ID search from the tag search)
    if (advancedFilterData.clientId) {
      const clientId = parseInt(advancedFilterData.clientId);
      if (!isNaN(clientId)) {
        baseFilter.push({ id: clientId });
      }
    }

    // Handle client ID inclusion filter (whitelist)
    if (Array.isArray(advancedFilterData.includeClientIds) && advancedFilterData.includeClientIds.length > 0) {
      // Convert all IDs to numbers to ensure consistency
      const validIds = advancedFilterData.includeClientIds
        .map(id => typeof id === 'string' ? parseInt(id) : id)
        .filter(id => !isNaN(id));
      
      if (validIds.length > 0) {
        baseFilter.push({ id: { $in: validIds } });
      }
    }

    // Handle client ID exclusion filter (blacklist)
    if (Array.isArray(advancedFilterData.excludeClientIds) && advancedFilterData.excludeClientIds.length > 0) {
      // Convert all IDs to numbers to ensure consistency
      const validIds = advancedFilterData.excludeClientIds
        .map(id => typeof id === 'string' ? parseInt(id) : id)
        .filter(id => !isNaN(id));
      
      if (validIds.length > 0) {
        baseFilter.push({ id: { $nin: validIds } });
      }
    }

    // Handle paymentRef search
    if (advancedFilterData.paymentRef) {
      // Add search for payment reference in WMM records
      // We'll need to find all clients with matching payment references first
      try {
        const { default: WmmModel } = await import("../../models/wmm.mjs");
        const paymentRef = advancedFilterData.paymentRef.trim();
        
        // For MS references, extract the core reference number
        let refPattern = paymentRef;
        
        // Extract the core MS number (e.g., "MS 001488" becomes "MS001488" or "MS.*001488")
        const msMatch = paymentRef.match(/^([A-Z]{2})\s*(\d{6})/i);
        if (msMatch) {
          // Create a regex pattern that's flexible about spaces and leading zeros
          const prefix = msMatch[1].toUpperCase();
          const numbers = msMatch[2];
          
          // Create a regex that will match the pattern regardless of spaces, but preserve digits
          refPattern = `${prefix}.*${numbers.replace(/^0+/, '')}`;
        }

        // Find clients with matching payment references
        const clientsWithPaymentRef = await WmmModel.find({
          paymtref: { $regex: refPattern, $options: "i" }
        }).distinct("clientid");

        if (clientsWithPaymentRef.length > 0) {
          // Convert client IDs to numbers and filter out invalid ones
          const validClientIds = clientsWithPaymentRef
            .map((id) => parseInt(id))
            .filter((id) => !isNaN(id));

          if (validClientIds.length > 0) {
            baseFilter.push({ id: { $in: validClientIds } });
          }
        } else {
          // If no matching payment refs were found, ensure no results are returned
          baseFilter.push({ id: -1 }); // No client will have ID -1
        }
      } catch (error) {
        console.error("Error searching for payment references:", error);
      }
    }

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

    // Add date filter for "Added Today" functionality
    if (advancedFilterData.adddate) {
      baseFilter.push({ adddate: advancedFilterData.adddate });
    }

    // Support for regex pattern matching on adddate (for "Added Today" feature)
    if (advancedFilterData.adddate_regex) {
      try {
        // Create the today's date regex pattern
        const todayRegex = advancedFilterData.adddate_regex;
        
        // First, find clients with the matching client adddate
        const clientsAddedToday = await ClientModel.find({
          adddate: { $regex: todayRegex, $options: "i" }
        }).select("id").lean();
        
        // Create a set of client IDs that match the filter
        const matchingClientIds = new Set(
          clientsAddedToday.map(client => client.id)
        );
        
        // Import all service models to check for services added/updated today
        const { default: WmmModel } = await import("../../models/wmm.mjs");
        const { default: FomModel } = await import("../../models/fom.mjs");
        const { default: HrgModel } = await import("../../models/hrg.mjs");
        const { default: CalModel } = await import("../../models/cal.mjs");
        
        // Define all date fields to check for each model
        const dateFields = {
          WmmModel: ["adddate", "subsdate", "updatedate"],
          FomModel: ["adddate", "recvdate", "updatedate"],
          HrgModel: ["adddate", "recvdate", "updatedate"],
          CalModel: ["adddate", "recvdate", "caldate", "updatedate"]
        };
        
        // For each model, find clients with ANY date field matching today
        const modelQueries = [
          // WMM model date fields
          ...dateFields.WmmModel.map(field => 
            WmmModel.find({ [field]: { $regex: todayRegex, $options: "i" } }).distinct("clientid")
          ),
          // FOM model date fields
          ...dateFields.FomModel.map(field => 
            FomModel.find({ [field]: { $regex: todayRegex, $options: "i" } }).distinct("clientid")
          ),
          // HRG model date fields
          ...dateFields.HrgModel.map(field => 
            HrgModel.find({ [field]: { $regex: todayRegex, $options: "i" } }).distinct("clientid")
          ),
          // CAL model date fields
          ...dateFields.CalModel.map(field => 
            CalModel.find({ [field]: { $regex: todayRegex, $options: "i" } }).distinct("clientid")
          )
        ];
        
        // Execute all queries in parallel for better performance
        const results = await Promise.all(modelQueries);
        
        // Add all clients with services added/updated today to the set
        results.flat().forEach(clientId => {
          // Convert to number to ensure consistent type
          const numericId = Number(clientId);
          if (!isNaN(numericId)) {
            matchingClientIds.add(numericId);
          }
        });
        
        // Convert the set back to an array
        const allMatchingClientIds = Array.from(matchingClientIds);
        
        // Log for debugging
        console.log(`Found ${allMatchingClientIds.length} clients added/updated today`);
        
        if (allMatchingClientIds.length > 0) {
          // Replace the simple adddate filter with a more comprehensive one
          baseFilter.push({ id: { $in: allMatchingClientIds } });
        } else {
          // If no clients match our criteria, create a filter that will return no results
          baseFilter.push({ id: -1 });
        }
      } catch (error) {
        console.error("Error processing Added Today filter for services:", error);
        // Fall back to the original client-only filter
        baseFilter.push({ 
          adddate: { $regex: advancedFilterData.adddate_regex, $options: "i" } 
        });
      }
    }

    // Add area filter
    if (advancedFilterData.acode) {
      baseFilter.push({ acode: advancedFilterData.acode });
    }

    // Add type filter
    if (advancedFilterData.type) {
      baseFilter.push({ type: advancedFilterData.type });
    }

    // Add subsclass filter (already handled for WMM but might need it for general filtering)
    if (advancedFilterData.subsclass && !modelNames.includes("WMM")) {
      baseFilter.push({ subsclass: advancedFilterData.subsclass });
    }

    if (baseFilter.length > 0) {
      filterQuery.$and.push(...baseFilter);
    }

    // Optimize WMM filtering by combining queries where possible
    if (
      advancedFilterData.wmmStartSubsDate ||
      advancedFilterData.wmmExpiringMonth ||
      advancedFilterData.copiesRange ||
      advancedFilterData.subsclass
    ) {
      const WmmModel = await getModel("WmmModel");

      // Build a single aggregation pipeline instead of multiple separate queries
      const wmmPipeline = [];

      // Add match stage for all WMM filters
      const wmmMatchStage = { $match: {} };

      if (advancedFilterData.subsclass) {
        wmmMatchStage.$match.subsclass = advancedFilterData.subsclass;
      }

      if (
        advancedFilterData.wmmStartSubsDate &&
        advancedFilterData.wmmEndSubsDate
      ) {
        wmmMatchStage.$match.$expr = {
          $and: [
            {
              $lte: [
                { $dateFromString: { dateString: "$subsdate" } },
                new Date(advancedFilterData.wmmEndSubsDate),
              ],
            },
            {
              $gte: [
                { $dateFromString: { dateString: "$enddate" } },
                new Date(advancedFilterData.wmmStartSubsDate),
              ],
            },
          ],
        };
      }

      // Only add match stage if it has conditions
      if (Object.keys(wmmMatchStage.$match).length > 0) {
        wmmPipeline.push(wmmMatchStage);
      }

      // Sort and group to get latest subscription for each client
      wmmPipeline.push(
        { $sort: { clientid: 1, subsdate: -1 } },
        {
          $group: {
            _id: "$clientid",
            mostRecentSub: { $first: "$$ROOT" },
          },
        },
        { $replaceRoot: { newRoot: "$mostRecentSub" } }
      );

      // Add copies range filtering if needed
      if (advancedFilterData.copiesRange) {
        const copiesMatchStage = {
          $match: {
            $expr: {
              $let: {
                vars: {
                  numericCopies: { $toInt: "$copies" },
                },
                in: {
                  $cond: {
                    if: { $eq: [advancedFilterData.copiesRange, "lt5"] },
                    then: { $lt: ["$$numericCopies", 5] },
                    else: {
                      $cond: {
                        if: { $eq: [advancedFilterData.copiesRange, "5to10"] },
                        then: {
                          $and: [
                            { $gte: ["$$numericCopies", 5] },
                            { $lte: ["$$numericCopies", 10] },
                          ],
                        },
                        else: {
                          $cond: {
                            if: {
                              $eq: [advancedFilterData.copiesRange, "gt10"],
                            },
                            then: { $gt: ["$$numericCopies", 10] },
                            else: {
                              $cond: {
                                if: {
                                  $eq: [
                                    advancedFilterData.copiesRange,
                                    "custom",
                                  ],
                                },
                                then: {
                                  $and: [
                                    advancedFilterData.minCopies
                                      ? {
                                          $gte: [
                                            "$$numericCopies",
                                            parseInt(
                                              advancedFilterData.minCopies
                                            ),
                                          ],
                                        }
                                      : { $gte: ["$$numericCopies", 0] },
                                    advancedFilterData.maxCopies
                                      ? {
                                          $lte: [
                                            "$$numericCopies",
                                            parseInt(
                                              advancedFilterData.maxCopies
                                            ),
                                          ],
                                        }
                                      : { $gte: ["$$numericCopies", 0] },
                                  ],
                                },
                                else: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        };
        wmmPipeline.push(copiesMatchStage);
      }

      // Get client IDs from filtered WMM data
      const wmmResults = await WmmModel.aggregate(wmmPipeline);

      if (wmmResults.length > 0) {
        const validClientIds = wmmResults
          .map((result) => Number(result.clientid))
          .filter((id) => !isNaN(id));

        if (validClientIds.length > 0) {
          filterQuery.$and.push({ id: { $in: validClientIds } });
        } else {
          return {
            totalPages: 0,
            combinedData: [],
            totalCopies: 0,
            pageSpecificCopies: 0,
            totalCalQty: 0,
            totalCalAmt: 0,
            pageSpecificCalQty: 0,
            pageSpecificCalAmt: 0,
            clientServices: [],
            noData: true,
          };
        }
      } else {
        return {
          totalPages: 0,
          combinedData: [],
          totalCopies: 0,
          pageSpecificCopies: 0,
          totalCalQty: 0,
          totalCalAmt: 0,
          pageSpecificCalQty: 0,
          pageSpecificCalAmt: 0,
          clientServices: [],
          noData: true,
        };
      }
    }

    // Optimize services filtering with Promise.all and early returns
    if (advancedFilterData.services && advancedFilterData.services.length > 0) {
      // Handle exact service matching
      const exactMatchEnabled = !!advancedFilterData.exactServiceMatch;
      const serviceMatchExcludeWMM = advancedFilterData.serviceMatchExcludeWMM !== false;
      
      // Replace showActiveOnly boolean with subscriptionStatus check
      const subscriptionStatus = advancedFilterData.subscriptionStatus || 'all';
      
      // Get arrays of client IDs for each service type
      const allServiceTypeClients = await Promise.all(
        Object.keys(additionalModels).map(async (modelKey) => {
          const Model = await getModel(modelKey);
          const serviceName = modelKey.replace("Model", "").toUpperCase();
          
          // Build match stage for subscription status filtering
          const matchStage = { $match: {} };
          
          // For FOM/HRG with subscription status filter, handle the filtering appropriately
          if ((serviceName === 'HRG' || serviceName === 'FOM')) {
            if (subscriptionStatus === 'active') {
              // Only include active subscriptions (not unsubscribed)
              return Model.aggregate([
                { $match: { unsubscribe: { $ne: 1 } } },
                { $sort: { clientid: 1, recvdate: -1 } },
                {
                  $group: {
                    _id: "$clientid",
                    mostRecent: { $first: "$$ROOT" }
                  }
                },
                // Ensure the most recent record is not unsubscribed
                {
                  $match: {
                    "mostRecent.unsubscribe": { $ne: 1 }
                  }
                },
                {
                  $project: {
                    _id: 1 // Keep only the client ID
                  }
                }
              ]).then(results => ({
                serviceName,
                clientIds: results.map((r) => Number(r._id)).filter((id) => !isNaN(id))
              }));
            } else if (subscriptionStatus === 'unsubscribed') {
              // Only include unsubscribed subscriptions
              return Model.aggregate([
                { $match: { unsubscribe: 1 } },
                { $sort: { clientid: 1, recvdate: -1 } },
                {
                  $group: {
                    _id: "$clientid",
                    mostRecent: { $first: "$$ROOT" }
                  }
                },
                // Ensure the most recent record is unsubscribed
                {
                  $match: {
                    "mostRecent.unsubscribe": 1
                  }
                },
                {
                  $project: {
                    _id: 1 // Keep only the client ID
                  }
                }
              ]).then(results => ({
                serviceName,
                clientIds: results.map((r) => Number(r._id)).filter((id) => !isNaN(id))
              }));
            }
            // For 'all' status, don't apply any subscription filter
          }
          
          // Use aggregation to get all unique client IDs for this service
          const results = await Model.aggregate([
            matchStage,
            { $project: { clientid: 1 } },
            { $group: { _id: "$clientid" } },
          ]);
          return {
            serviceName,
            clientIds: results.map((r) => Number(r._id)).filter((id) => !isNaN(id))
          };
        })
      );
      
      // Get the target services we want to match
      const targetServices = advancedFilterData.services.map(s => s.toUpperCase());
      const targetServicesExceptWMM = targetServices.filter(s => s !== 'WMM');

      if (exactMatchEnabled && targetServicesExceptWMM.length > 0) {
        // For exact match, we need to:
        // 1. Find clients that have ALL the selected services
        // 2. Exclude clients that have ANY services we didn't select (except WMM)
        
        // Store client IDs that have the services we want
        let clientsWithTargetServices = [];
        
        // For each target service, get clients with that service
        for (const targetService of targetServicesExceptWMM) {
          const serviceData = allServiceTypeClients.find(s => 
            s.serviceName === targetService
          );
          
          if (serviceData) {
            if (clientsWithTargetServices.length === 0) {
              // For first service, start with all its clients
              clientsWithTargetServices = [...serviceData.clientIds];
            } else {
              // For subsequent services, keep only clients that have both
              clientsWithTargetServices = clientsWithTargetServices.filter(id => 
                serviceData.clientIds.includes(id)
              );
            }
          }
        }
        
        // Now exclude clients that have services we didn't select
        const unwantedServices = allServiceTypeClients
          .filter(s => !targetServices.includes(s.serviceName) && 
                      (s.serviceName !== 'WMM' || !serviceMatchExcludeWMM))
          .map(s => s.clientIds)
          .flat();
          
        // Remove duplicates from unwanted services list
        const uniqueUnwantedClients = [...new Set(unwantedServices)];
        
        // Filter out clients that have any unwanted services
        const validServiceClientIds = clientsWithTargetServices.filter(id => 
          !uniqueUnwantedClients.includes(id)
        );
        
        if (validServiceClientIds.length > 0) {
          filterQuery.$and.push({ id: { $in: validServiceClientIds } });
        } else {
          return {
            totalPages: 0,
            combinedData: [],
            totalCopies: 0,
            pageSpecificCopies: 0,
            totalCalQty: 0,
            totalCalAmt: 0,
            pageSpecificCalQty: 0,
            pageSpecificCalAmt: 0,
            clientServices: [],
            noData: true,
          };
        }
      } else {
        // Non-exact match (original logic) - Fetch client IDs that have the specified services
        const serviceClientIds = await Promise.all(
          advancedFilterData.services.map(async (serviceName) => {
            const modelKey = Object.keys(additionalModels).find((key) =>
              key.toLowerCase().includes(serviceName.toLowerCase())
            );

            if (!modelKey) return [];

            const Model = await getModel(modelKey);
            
            // For FOM/HRG with showActiveOnly, only include active clients
            const showActiveOnly = !!advancedFilterData.showActiveOnly;
            const serviceNameUpper = serviceName.toUpperCase();
            
            if (showActiveOnly && (serviceNameUpper === 'FOM' || serviceNameUpper === 'HRG')) {
              // Use a more specific approach for active records
              const results = await Model.aggregate([
                // Explicitly match only records where unsubscribe is not true
                { $match: { unsubscribe: { $ne: 1 } } },
                { $sort: { clientid: 1, recvdate: -1 } },
                {
                  $group: {
                    _id: "$clientid",
                    mostRecent: { $first: "$$ROOT" }
                  }
                },
                // Ensure again that the most recent record is not unsubscribed
                {
                  $match: {
                    "mostRecent.unsubscribe": { $ne: 1 }
                  }
                },
                {
                  $project: {
                    _id: 1 // Keep only the client ID
                  }
                }
              ]);
              
              return results.map((r) => Number(r._id)).filter((id) => !isNaN(id));
            }

            // Use a simpler, more efficient aggregation for other services
            const results = await Model.aggregate([
              { $project: { clientid: 1 } },
              { $group: { _id: "$clientid" } },
            ]);

            return results.map((r) => Number(r._id)).filter((id) => !isNaN(id));
          })
        );

        if (serviceClientIds.length > 0) {
          // Start with the first service's client list
          let validServiceClientIds = serviceClientIds[0] || [];

          // For each subsequent service, keep only the clients that exist in both lists
          for (let i = 1; i < serviceClientIds.length; i++) {
            if (advancedFilterData.servicesMatchAny) {
              // OR logic - include clients that have ANY of the selected services
              validServiceClientIds = [
                ...new Set([...validServiceClientIds, ...serviceClientIds[i]]),
              ];
            } else {
              // AND logic - include only clients that have ALL selected services
              validServiceClientIds = validServiceClientIds.filter((id) =>
                serviceClientIds[i].includes(id)
              );
            }
          }

          if (validServiceClientIds.length > 0) {
            filterQuery.$and.push({ id: { $in: validServiceClientIds } });
          } else {
            return {
              totalPages: 0,
              combinedData: [],
              totalCopies: 0,
              pageSpecificCopies: 0,
              totalCalQty: 0,
              totalCalAmt: 0,
              pageSpecificCalQty: 0,
              pageSpecificCalAmt: 0,
              clientServices: [],
              noData: true,
            };
          }
        }
      }
    }

    // After adding all filters, clean up empty $and array
    if (filterQuery.$and && filterQuery.$and.length === 0) {
      delete filterQuery.$and;
    } else if (filterQuery.$and && filterQuery.$and.length === 1) {
      // If there's only one condition, use it directly
      filterQuery = filterQuery.$and[0];
    }

    // --- Add scoring to aggregation pipeline if needed ---
    let scoringStage = null;
    if (filterQuery.__addScoring) {
      const nameParts = filterQuery.__addScoring;
      delete filterQuery.__addScoring;
      scoringStage = {
        $addFields: {
          matchScore: {
            $add: [
              // For each part, sum the matches in all fields
              ...nameParts.map((part) => ({
                $add: [
                  { $cond: [{ $regexMatch: { input: "$fname", regex: part, options: "i" } }, 1, 0] },
                  { $cond: [{ $regexMatch: { input: "$lname", regex: part, options: "i" } }, 1, 0] },
                  { $cond: [{ $regexMatch: { input: "$mname", regex: part, options: "i" } }, 1, 0] },
                  { $cond: [{ $regexMatch: { input: "$sname", regex: part, options: "i" } }, 1, 0] },
                  { $cond: [{ $regexMatch: { input: "$company", regex: part, options: "i" } }, 1, 0] }
                ]
              }))
            ]
          }
        }
      };
    }

    // Optimize client fetching by selecting only needed fields
    let aggregatePipeline = [];
    aggregatePipeline.push({ $match: filterQuery });
    if (scoringStage) {
      aggregatePipeline.push(scoringStage);
      aggregatePipeline.push({ $sort: { matchScore: -1, id: -1 } });
    } else {
      aggregatePipeline.push({ $sort: { id: -1 } });
    }

    // Ensure pageSize and skip are numbers
    const pageSizeNum = Number(pageSize);

    const totalClients = await ClientModel.countDocuments(filterQuery);
    const totalPages = Math.ceil(totalClients / validLimit);

    // First fetch clients
    const clients = await ClientModel.aggregate(aggregatePipeline)
      .project(clientFields)
      .skip(skip)
      .limit(validLimit)
      .exec();

    // Then fetch model data in parallel
    const modelDataArrays = await Promise.all(
      modelNames.map(async (modelName) => {
        const modelKey = Object.keys(models).find(
          (key) => key.toLowerCase() === modelName.toLowerCase()
        );

        if (!modelKey) {
          throw new Error(`Model not found for ${modelName}`);
        }

        const modelFunction = models[modelKey];
        let Model;
        if (typeof modelFunction === "function") {
          const importedModel = await modelFunction();
          Model = importedModel.default || importedModel;
        } else {
          Model = modelFunction;
        }

        if (Model && Model.modelName && typeof Model.aggregate === "function") {
          const config = modelConfigs[modelKey];
          if (!config) {
            console.error(`No configuration found for ${modelName}`);
            return { data: [], totalCopies: 0, pageSpecificCopies: 0 };
          }

          // Only fetch data for clients in the current page to reduce data volume
          const clientIds = clients.map((c) => c.id);

          // For WMM model, we need to get subscription data
          if (modelKey.toLowerCase() === "wmmmodel") {
            const result = await Model.aggregate([
              {
                $match: {
                  clientid: { $in: clientIds.map((id) => parseInt(id)) },
                },
              },
              { $project: config.projectFields },
              { $sort: { clientid: 1, subsdate: -1 } },
              {
                $group: {
                  _id: "$clientid", // This will be the integer clientid
                  recentCopies: { $first: "$copies" },
                  totalCopies: { $sum: { $toInt: "$copies" } },
                  totalCalQty: { $sum: { $toInt: "$calqty" } },
                  totalCalAmt: { $sum: { $toDouble: "$calamt" } },
                  subsclass: { $first: "$subsclass" },
                  subsdate: { $first: "$subsdate" },
                  enddate: { $first: "$enddate" },
                  records: {
                    $push: "$$ROOT", // Include the entire document in records
                  },
                },
              },
            ]);

            return result;
          }

          // Special handling for FOM and HRG model with showActiveOnly
          if ((modelKey.toLowerCase() === "fommodel" || modelKey.toLowerCase() === "hrgmodel") && advancedFilterData.showActiveOnly) {
            // Only include the most recent active (unsubscribe: false) record
            return Model.aggregate([
              {
                $match: {
                  clientid: { $in: clientIds.map((id) => parseInt(id)) },
                  unsubscribe: { $ne: 1 },
                },
              },
              { $project: config.projectFields },
              { $sort: { clientid: 1, recvdate: -1 } },
              {
                $group: {
                  _id: "$clientid",
                  records: { $push: "$$ROOT" },
                  mostRecent: { $first: "$$ROOT" },
                },
              },
              // Only include groups where mostRecent exists and is not unsubscribed
              {
                $match: {
                  mostRecent: { $exists: true },
                  "mostRecent.unsubscribe": { $ne: 1 }
                }
              },
              {
                $project: {
                  _id: 1,
                  records: { $slice: ["$records", 1] }, // Only keep the most recent record
                  recentCopies: "$mostRecent.copies",
                  totalCopies: "$mostRecent.copies",
                  totalCalQty: "$mostRecent.calqty",
                  totalCalAmt: "$mostRecent.calamt",
                  subsclass: "$mostRecent.subsclass",
                  recvdate: "$mostRecent.recvdate",
                  unsubscribe: "$mostRecent.unsubscribe"
                }
              }
            ]);
          }

          // Special handling for CAL model
          if (modelKey.toLowerCase() === "calmodel") {
            return Model.aggregate([
              {
                $match: {
                  clientid: { $in: clientIds.map((id) => parseInt(id)) }, // Convert to integers
                },
              },
              { $project: config.projectFields },
              {
                $addFields: {
                  numericCalQty: { $toInt: "$calqty" },
                  numericCalAmt: { $toDouble: "$calamt" },
                  // Calculate the line total (qty * amt) for each record
                  lineTotal: {
                    $multiply: [
                      { $toInt: { $ifNull: ["$calqty", 0] } },
                      { $toDouble: { $ifNull: ["$calamt", 0] } }
                    ]
                  }
                }
              },
              {
                $group: {
                  _id: "$clientid", // This will be the integer clientid
                  totalCalQty: { $sum: "$numericCalQty" },
                  // Sum of (qty * amt) for each record
                  totalCalAmt: { $sum: "$lineTotal" },
                  records: {
                    $push: "$$ROOT", // Include the entire document in records
                  },
                },
              },
            ]);
          }

          // For other models
          return Model.aggregate([
            {
              $match: {
                clientid: { $in: clientIds.map((id) => parseInt(id)) }, // Convert to integers
              },
            },
            { $project: config.projectFields },
            {
              $group: {
                _id: "$clientid", // This will be the integer clientid
                recentCopies: { $first: "$copies" },
                totalCopies: { $sum: { $toInt: "$copies" } },
                totalCalQty: { $sum: { $toInt: "$calqty" } },
                totalCalAmt: { $sum: { $toDouble: "$calamt" } },
                subsclass: { $first: "$subsclass" },
                records: {
                  $push: "$$ROOT", // Include the entire document in records
                },
              },
            },
          ]);
        } else {
          console.error(`Invalid model for ${modelName}. Model:`, Model);
          return [];
        }
      })
    );

    // Process model data
    const validModelDataArrays = modelDataArrays.filter(
      (array) => Array.isArray(array) && array.length > 0
    );

    const modelDataMap = new Map();
    validModelDataArrays.forEach((modelData, index) => {
      modelData.forEach((item) => {
        const clientId = item._id || item.clientid;
        if (!modelDataMap.has(clientId)) {
          modelDataMap.set(clientId, {});
        }

        // Create the data object with all fields from the item
        const dataObject = {
          ...item,
          records: item.records || [],
        };
        
        // If a username filter is active, filter the records to only include those created by this user
        if (advancedFilterData.usernameFilter && dataObject.records && dataObject.records.length > 0) {
          const username = advancedFilterData.usernameFilter;
          console.log(`Filtering records by username: ${username} for client ${clientId}`);
          
          // Filter records to only include those created by the selected user
          dataObject.records = dataObject.records.filter(record => {
            return record.adduser === username || 
                   (typeof record.adduser === 'string' && 
                    record.adduser.toLowerCase() === username.toLowerCase());
          });
          
          console.log(`After filtering: ${dataObject.records.length} records remain for client ${clientId}`);
        }
        
        // If showActiveOnly is enabled, filter out unsubscribed records for HRG and FOM
        if (advancedFilterData.showActiveOnly && dataObject.records && dataObject.records.length > 0) {
          const modelNameLower = modelNames[index].toLowerCase();
          if (modelNameLower.includes("hrg") || modelNameLower.includes("fom")) {
            // Filter out records with unsubscribe: 1 (since it's stored as 0/1 not true/false)
            dataObject.records = dataObject.records.filter(record => {
              return record.unsubscribe !== 1 && record.unsubscribe !== true;
            });
            console.log(`After unsubscribe filtering: ${dataObject.records.length} records remain for client ${clientId}`);
          }
        }

        // Set the data for this model - fixed: ensure consistent casing for service keys
        const modelNameLower = modelNames[index].toLowerCase();
        let serviceType;
        
        // Normalize model names to consistent service data keys
        if (modelNameLower.includes("wmm")) {
          serviceType = "wmmData";
        } else if (modelNameLower.includes("hrg")) {
          serviceType = "hrgData";
        } else if (modelNameLower.includes("fom")) {
          serviceType = "fomData";
        } else if (modelNameLower.includes("cal")) {
          serviceType = "calData";
        } else {
          // Fallback to the original method if not a recognized service
          serviceType = modelNameLower.replace("model", "") + "Data";
        }
        
        modelDataMap.get(clientId)[serviceType] = dataObject;
      });
    });

    // When using advanced filter with services, ensure model data is fetched for those services
    if (advancedFilterData && advancedFilterData.services && 
        advancedFilterData.services.length > 0 && modelNames.length > 0) {
      
      // Create a dedicated section to fetch service data for all matching clients
      try {
        // Get client IDs for all clients matching the filter
        const clientsMatchingFilter = await ClientModel.find(filterQuery).select('id').lean();
        const clientIds = clientsMatchingFilter.map(c => c.id);
        
        if (clientIds.length > 0) {
          // Process services to ensure data is fetched for each requested service type
          const serviceModels = [];
          if (advancedFilterData.services.includes('FOM')) {
            serviceModels.push({ 
              name: 'FomModel',
              importFunc: () => import("../../models/fom.mjs")
            });
          }
          if (advancedFilterData.services.includes('HRG')) {
            serviceModels.push({ 
              name: 'HrgModel',
              importFunc: () => import("../../models/hrg.mjs")
            });
          }
          if (advancedFilterData.services.includes('CAL')) {
            serviceModels.push({ 
              name: 'CalModel',
              importFunc: () => import("../../models/cal.mjs")
            });
          }
          if (advancedFilterData.services.includes('WMM')) {
            serviceModels.push({ 
              name: 'WmmModel',
              importFunc: () => import("../../models/wmm.mjs")
            });
          }
          
          // Fetch data for each service model in parallel
          const serviceDataPromises = serviceModels.map(async (modelInfo) => {
            const { default: Model } = await modelInfo.importFunc();
            const serviceType = modelInfo.name.replace('Model', '').toLowerCase() + 'Data';
            
            // Create the base query for this service
            const serviceQuery = {
              clientid: { $in: clientIds }
            };
            
            // For FOM/HRG with subscription status, handle accordingly
            const modelName = modelInfo.name.replace('Model', '').toUpperCase();
            const subscriptionStatus = advancedFilterData.subscriptionStatus || 'all';
            
            if (subscriptionStatus === 'active' && (modelName === 'FOM' || modelName === 'HRG')) {
              serviceQuery.unsubscribe = { $ne: 1 };
            } else if (subscriptionStatus === 'unsubscribed' && (modelName === 'FOM' || modelName === 'HRG')) {
              serviceQuery.unsubscribe = 1;
            }
            
            // Fetch data for these clients
            const serviceData = await Model.find(serviceQuery).lean();
            
            // Group data by client ID
            const groupedData = serviceData.reduce((acc, item) => {
              const clientId = Number(item.clientid);
              if (!acc[clientId]) {
                acc[clientId] = [];
              }
              acc[clientId].push(item);
              return acc;
            }, {});
            
            return { serviceType, groupedData };
          });
          
          const serviceDataResults = await Promise.all(serviceDataPromises);
          
          // Add each service's data to the modelDataMap
          serviceDataResults.forEach(({ serviceType, groupedData }) => {
            Object.entries(groupedData).forEach(([clientId, records]) => {
              if (!modelDataMap.has(Number(clientId))) {
                modelDataMap.set(Number(clientId), {});
              }
              
              // If showActiveOnly is true, filter out unsubscribed records for HRG and FOM
              let filteredRecords = records;
              if (advancedFilterData.showActiveOnly) {
                const serviceTypeUpper = serviceType.replace('Data', '').toUpperCase();
                if (serviceTypeUpper === 'HRG' || serviceTypeUpper === 'FOM') {
                  filteredRecords = records.filter(record => record.unsubscribe !== 1 && record.unsubscribe !== true);
                  console.log(`Filtered records for ${serviceTypeUpper}, client ${clientId} based on subscription status: ${records.length} -> ${filteredRecords.length}`);
                }
              }
              
              // Apply subscription status filtering
              if (advancedFilterData.subscriptionStatus && advancedFilterData.subscriptionStatus !== 'all' && 
                  records && records.length > 0) {
                const modelNameLower = modelNames[index].toLowerCase();
                if (modelNameLower.includes("hrg") || modelNameLower.includes("fom")) {
                  if (advancedFilterData.subscriptionStatus === 'active') {
                    filteredRecords = records.filter(record => record.unsubscribe !== 1 && record.unsubscribe !== true);
                  } else if (advancedFilterData.subscriptionStatus === 'unsubscribed') {
                    filteredRecords = records.filter(record => record.unsubscribe === 1 || record.unsubscribe === true);
                  }
                  console.log(`Filtered records for ${serviceType.replace('Data', '').toUpperCase()}, client ${clientId} based on subscription status: ${records.length} -> ${filteredRecords.length}`);
                }
              }
              
              modelDataMap.get(Number(clientId))[serviceType] = {
                records: filteredRecords,
                _id: Number(clientId)
              };
            });
          });
        }
      } catch (error) {
        console.error("Error fetching service data for filtered clients:", error);
      }
    }

    // Log a sample of the combined data
    const combinedData = clients.map((client) => {
      // Add a flag if this client was created by the filtered user
      let createdByFilteredUser = false;
      if (advancedFilterData.usernameFilter) {
        const username = advancedFilterData.usernameFilter;
        createdByFilteredUser = 
          client.adduser === username || 
          (typeof client.adduser === 'string' && 
           client.adduser.toLowerCase() === username.toLowerCase());
      }
      
      return {
        ...client,
        ...modelDataMap.get(client.id),
        createdByFilteredUser // Add flag to indicate if this client was created by the filtered user
      };
    });
    
    // Filter out clients with only unsubscribed HRG/FOM records when showActiveOnly is true
    let filteredCombinedData = combinedData;
    if (advancedFilterData.showActiveOnly) {
      filteredCombinedData = combinedData.filter(client => {
        // If filtering by HRG
        if (advancedFilterData.services.includes('HRG')) {
          const hrgData = client.hrgData?.records || [];
          if (hrgData.length === 0) return false; // No HRG data
          // Check if all HRG records are unsubscribed
          const hasActiveRecord = hrgData.some(record => record.unsubscribe !== 1 && record.unsubscribe !== true);
          if (!hasActiveRecord) return false;
        }
        
        // If filtering by FOM
        if (advancedFilterData.services.includes('FOM')) {
          const fomData = client.fomData?.records || [];
          if (fomData.length === 0) return false; // No FOM data
          // Check if all FOM records are unsubscribed
          const hasActiveRecord = fomData.some(record => record.unsubscribe !== 1 && record.unsubscribe !== true);
          if (!hasActiveRecord) return false;
        }
        
        return true;
      });
      
      console.log(`Filtered ${combinedData.length - filteredCombinedData.length} clients with only unsubscribed records`);
    }

    // Replace with subscription status filtering
    if (advancedFilterData.subscriptionStatus && advancedFilterData.subscriptionStatus !== 'all') {
      filteredCombinedData = combinedData.filter(client => {
        // If filtering by HRG
        if (advancedFilterData.services.includes('HRG')) {
          const hrgData = client.hrgData?.records || [];
          if (hrgData.length === 0) return false; // No HRG data
          
          if (advancedFilterData.subscriptionStatus === 'active') {
            // Check if any HRG record is active
            const hasActiveRecord = hrgData.some(record => record.unsubscribe !== 1 && record.unsubscribe !== true);
            if (!hasActiveRecord) return false;
          } else if (advancedFilterData.subscriptionStatus === 'unsubscribed') {
            // Check if any HRG record is unsubscribed
            const hasUnsubscribedRecord = hrgData.some(record => record.unsubscribe === 1 || record.unsubscribe === true);
            if (!hasUnsubscribedRecord) return false;
          }
        }
        
        // If filtering by FOM
        if (advancedFilterData.services.includes('FOM')) {
          const fomData = client.fomData?.records || [];
          if (fomData.length === 0) return false; // No FOM data
          
          if (advancedFilterData.subscriptionStatus === 'active') {
            // Check if any FOM record is active
            const hasActiveRecord = fomData.some(record => record.unsubscribe !== 1 && record.unsubscribe !== true);
            if (!hasActiveRecord) return false;
          } else if (advancedFilterData.subscriptionStatus === 'unsubscribed') {
            // Check if any FOM record is unsubscribed
            const hasUnsubscribedRecord = fomData.some(record => record.unsubscribe === 1 || record.unsubscribe === true);
            if (!hasUnsubscribedRecord) return false;
          }
        }
        
        return true;
      });
      
      console.log(`Filtered ${combinedData.length - filteredCombinedData.length} clients based on subscription status`);
    }

    // Calculate totalCopies using only the most recent copies for each client
    let totalCopies = 0;
    let totalCalQty = 0;
    let totalCalAmt = 0;
    let hrgTotalAmt = 0;
    let fomTotalAmt = 0;
    let calTotalPaymtAmt = 0;
    let totalFilterQuery = { ...filterQuery };

    // Use Promise to get the totalCopies based on the filter
    const getTotalValues = async () => {
      try {
        // Get all client IDs that match the filter
        const filteredClientIds = await ClientModel.find(totalFilterQuery)
          .select("id")
          .lean()
          .then((results) => results.map((client) => client.id));

        // If no clients match the filter, return zeros
        if (filteredClientIds.length === 0) {
          return { 
            totalCopies: 0, 
            totalCalQty: 0, 
            totalCalAmt: 0, 
            totalHrgAmt: 0, 
            totalFomAmt: 0, 
            totalCalPaymtAmt: 0 
          };
        }

        // Get WMM model for calculations
        const { default: WmmModel } = await import("../../models/wmm.mjs");
        // Get CAL model for calendar calculations
        const { default: CalModel } = await import("../../models/cal.mjs");
        // Get HRG model for calculations
        const { default: HrgModel } = await import("../../models/hrg.mjs");
        // Get FOM model for calculations
        const { default: FomModel } = await import("../../models/fom.mjs");

        // Build WMM query to match filtered clients
        const wmmQuery = {
          clientid: { $in: filteredClientIds.map((id) => parseInt(id)) },
        };

        // Get all HRG entries for filtered clients
        const hrgQuery = {
          clientid: { $in: filteredClientIds.map((id) => parseInt(id)) },
        };
        const allHrgEntries = await HrgModel.find(hrgQuery).lean();

        // Get all FOM entries for filtered clients
        const fomQuery = {
          clientid: { $in: filteredClientIds.map((id) => parseInt(id)) },
        };
        const allFomEntries = await FomModel.find(fomQuery).lean();

        // Add subscription class filter if present
        if (advancedFilterData.subsclass) {
          wmmQuery.subsclass = advancedFilterData.subsclass;
        }

        // For date filtering, we'll use a simpler approach
        // We'll get all subscriptions for the filtered clients and filter in memory
        const allSubscriptions = await WmmModel.find(wmmQuery).lean();

        // Filter subscriptions based on date if needed
        let filteredSubscriptions = allSubscriptions;
        if (
          advancedFilterData.wmmStartSubsDate &&
          advancedFilterData.wmmEndSubsDate
        ) {
          const startDate = new Date(advancedFilterData.wmmStartSubsDate);
          const endDate = new Date(advancedFilterData.wmmEndSubsDate);

          filteredSubscriptions = allSubscriptions.filter((sub) => {
            try {
              const subDate = new Date(sub.subsdate);
              const subEndDate = new Date(sub.enddate);
              return subDate <= endDate && subEndDate >= startDate;
            } catch (e) {
              console.error("Error parsing date:", e);
              return false;
            }
          });
        }

        // Get all calendar entries for filtered clients
        const calQuery = {
          clientid: { $in: filteredClientIds.map((id) => parseInt(id)) },
        };
        const allCalEntries = await CalModel.find(calQuery).lean();

        // For both copies and calendar data, we only want to count the most recent entry for each client
        const clientLatestSubscriptions = new Map();
        const clientLatestCalEntries = new Map();
        const clientLatestHrgEntries = new Map();
        const clientLatestFomEntries = new Map();

        // Find the most recent WMM subscription for each client
        for (const sub of filteredSubscriptions) {
          const clientId = parseInt(sub.clientid);
          const subsDate = new Date(sub.subsdate);

          if (
            !clientLatestSubscriptions.has(clientId) ||
            subsDate >
              new Date(clientLatestSubscriptions.get(clientId).subsdate)
          ) {
            clientLatestSubscriptions.set(clientId, sub);
          }
        }

        // Find the most recent calendar entry for each client
        for (const cal of allCalEntries) {
          const clientId = parseInt(cal.clientid);
          const calDate = cal.caldate ? new Date(cal.caldate) : cal.recvdate ? new Date(cal.recvdate) : new Date(0);

          if (
            !clientLatestCalEntries.has(clientId) ||
            (calDate >
                new Date(clientLatestCalEntries.get(clientId).caldate || clientLatestCalEntries.get(clientId).recvdate || 0))
          ) {
            clientLatestCalEntries.set(clientId, cal);
          }
        }

        // Find the most recent HRG entry for each client
        for (const hrg of allHrgEntries) {
          const clientId = parseInt(hrg.clientid);
          const hrgDate = hrg.recvdate ? new Date(hrg.recvdate) : new Date(0);

          if (
            !clientLatestHrgEntries.has(clientId) ||
            (hrg.recvdate && hrgDate >
                new Date(clientLatestHrgEntries.get(clientId).recvdate || 0))
          ) {
            clientLatestHrgEntries.set(clientId, hrg);
          }
        }

        // Find the most recent FOM entry for each client
        for (const fom of allFomEntries) {
          const clientId = parseInt(fom.clientid);
          const fomDate = fom.recvdate ? new Date(fom.recvdate) : new Date(0);

          if (
            !clientLatestFomEntries.has(clientId) ||
            (fom.recvdate && fomDate >
                new Date(clientLatestFomEntries.get(clientId).recvdate || 0))
          ) {
            clientLatestFomEntries.set(clientId, fom);
          }
        }

        // Sum up copies from the most recent subscription for each client
        let copiesTotal = 0;
        for (const sub of clientLatestSubscriptions.values()) {
          if (sub.copies) {
            const copies =
              typeof sub.copies === "string"
                ? parseInt(sub.copies, 10)
                : sub.copies;

            // Only add if it's a valid number
            if (!isNaN(copies) && copies > 0) {
              copiesTotal += copies;
            }
          }
        }

        // Sum up calendar quantities and amounts from the most recent entry for each client
        let calQtyTotal = 0;
        let calAmtTotal = 0;
        let hrgTotalAmt = 0;
        let fomTotalAmt = 0;
        let calTotalPaymtAmt = 0;

        // Debugging counters
        let validCalQtyEntries = 0;
        let validCalAmtEntries = 0;
        let validCalPaymtEntries = 0;

        for (const cal of clientLatestCalEntries.values()) {
          // Handle calendar quantity calculation
          if (cal.calqty) {
            const calQty =
              typeof cal.calqty === "string"
                ? parseInt(cal.calqty, 10)
                : cal.calqty;

            // Only add if it's a valid number
            if (!isNaN(calQty) && calQty > 0) {
              calQtyTotal += calQty;
              validCalQtyEntries++;
              
              // Calculate total amount by multiplying quantity by amount per unit
              if (cal.calamt) {
                const calAmt =
                  typeof cal.calamt === "string"
                    ? parseFloat(cal.calamt.replace(/[^\d.-]/g, ''))
                    : cal.calamt;
                
                // Only add if it's a valid number
                if (!isNaN(calAmt) && calAmt > 0) {
                  calAmtTotal += (calQty * calAmt);
                  validCalAmtEntries++;
                }
              }
            }
          }

          // Handle calendar payment amount calculation - only count if there's a payment reference
          if (cal.paymtamt && cal.paymtref) {
            const calPaymtAmt =
              typeof cal.paymtamt === "string"
                ? parseFloat(cal.paymtamt.replace(/[^\d.-]/g, ''))
                : cal.paymtamt;

            // Only add if it's a valid number
            if (!isNaN(calPaymtAmt) && calPaymtAmt > 0) {
              calTotalPaymtAmt += calPaymtAmt;
              validCalPaymtEntries++;
            }
          }
        }

        // Debugging counters for HRG and FOM
        let validHrgAmtEntries = 0;
        let validFomAmtEntries = 0;

        // Calculate HRG payment amounts from most recent entries
        for (const hrg of clientLatestHrgEntries.values()) {
          if (hrg.paymtamt) {
            const hrgAmt =
              typeof hrg.paymtamt === "string"
                ? parseFloat(hrg.paymtamt.replace(/[^\d.-]/g, ''))
                : hrg.paymtamt;

            // Only add if it's a valid number
            if (!isNaN(hrgAmt) && hrgAmt > 0) {
              hrgTotalAmt += hrgAmt;
              validHrgAmtEntries++;
            }
          }
        }

        // Calculate FOM payment amounts from most recent entries
        for (const fom of clientLatestFomEntries.values()) {
          if (fom.paymtamt) {
            const fomAmt =
              typeof fom.paymtamt === "string"
                ? parseFloat(fom.paymtamt.replace(/[^\d.-]/g, ''))
                : fom.paymtamt;

            // Only add if it's a valid number
            if (!isNaN(fomAmt) && fomAmt > 0) {
              fomTotalAmt += fomAmt;
              validFomAmtEntries++;
            }
          }
        }

        // Return ALL totals
        return {
          totalCopies: copiesTotal,
          totalCalQty: calQtyTotal,
          totalCalAmt: calAmtTotal,
          totalHrgAmt: hrgTotalAmt,
          totalFomAmt: fomTotalAmt,
          totalCalPaymtAmt: calTotalPaymtAmt,
        };
      } catch (error) {
        console.error("Error calculating totals:", error);
        return { 
          totalCopies: 0, 
          totalCalQty: 0, 
          totalCalAmt: 0, 
          totalHrgAmt: 0, 
          totalFomAmt: 0, 
          totalCalPaymtAmt: 0 
        };
      }
    };

    // Calculate totals based on filter
    const totals = await getTotalValues();
        
    totalCopies = totals.totalCopies;
    totalCalQty = totals.totalCalQty;
    totalCalAmt = totals.totalCalAmt;
    hrgTotalAmt = totals.totalHrgAmt;
    fomTotalAmt = totals.totalFomAmt;
    calTotalPaymtAmt = totals.totalCalPaymtAmt;

    // Calculate page-specific amounts based on the clients in the current page
    const pageSpecificCopies = filteredCombinedData.reduce((acc, client) => {
      const clientCopies = validModelDataArrays.reduce(
        (copiesAcc, modelData) => {
          const clientRecord = modelData.find((item) => item._id === client.id);
          return copiesAcc + (clientRecord?.recentCopies || 0);
        },
        0
      );
      return acc + clientCopies;
    }, 0);

    const pageSpecificCalQty = filteredCombinedData.reduce((acc, client) => {
      const clientCalQty = validModelDataArrays.reduce((qtyAcc, modelData) => {
        const clientRecord = modelData.find((item) => item._id === client.id);
        return qtyAcc + (clientRecord?.totalCalQty || 0);
      }, 0);
      return acc + clientCalQty;
    }, 0);

    const pageSpecificCalAmt = filteredCombinedData.reduce((acc, client) => {
      // Look for CAL data in the client's data
      const calData = client.calData?.records || [];
      if (calData.length === 0) return acc;
      
      // Get the most recent CAL record based on recvdate
      const sortedCalData = [...calData].sort((a, b) => {
        return new Date(b.recvdate || 0) - new Date(a.recvdate || 0);
      });
      
      const mostRecentCal = sortedCalData[0];
      if (mostRecentCal && mostRecentCal.calamt && mostRecentCal.calqty) {
        let amt = 0;
        let qty = 0;
        
        try {
          // Parse calamt
          if (typeof mostRecentCal.calamt === 'string') {
            // Remove any non-numeric characters except decimal point and negative sign
            const cleanedAmt = mostRecentCal.calamt.replace(/[^\d.-]/g, '');
            amt = parseFloat(cleanedAmt);
          } else {
            amt = mostRecentCal.calamt;
          }
          
          // Parse calqty
          if (typeof mostRecentCal.calqty === 'string') {
            qty = parseInt(mostRecentCal.calqty, 10);
          } else {
            qty = mostRecentCal.calqty;
          }
          
          // Calculate total by multiplying qty by amt
          return acc + (isNaN(amt) || isNaN(qty) ? 0 : amt * qty);
          
        } catch (error) {
          console.error("Error calculating CAL total amount:", error);
          return acc;
        }
      }
      
      return acc;
    }, 0);

    // Add page-specific HRG, FOM, and CAL payment amount calculations
    const pageSpecificHrgAmt = filteredCombinedData.reduce((acc, client) => {
      // Look for HRG data in the client's data
      const hrgData = client.hrgData?.records || [];
      if (hrgData.length === 0) return acc;
      
      // Get the most recent HRG record based on recvdate
      const sortedHrgData = [...hrgData].sort((a, b) => {
        return new Date(b.recvdate || 0) - new Date(a.recvdate || 0);
      });
      
      const mostRecentHrg = sortedHrgData[0];
      if (mostRecentHrg && mostRecentHrg.paymtamt) {
        let amt = 0;
        
        try {
          if (typeof mostRecentHrg.paymtamt === 'string') {
            // Remove any non-numeric characters except decimal point and negative sign
            const cleanedAmt = mostRecentHrg.paymtamt.replace(/[^\d.-]/g, '');
            amt = parseFloat(cleanedAmt);
          } else {
            amt = mostRecentHrg.paymtamt;
          }
          
        } catch (error) {
          console.error("Error parsing HRG payment amount:", error);
          return acc;
        }
        
        return acc + (isNaN(amt) ? 0 : amt);
      }
      
      return acc;
    }, 0);

    const pageSpecificFomAmt = filteredCombinedData.reduce((acc, client) => {
      // Look for FOM data in the client's data
      const fomData = client.fomData?.records || [];
      if (fomData.length === 0) return acc;
      
      // Get the most recent FOM record based on recvdate
      const sortedFomData = [...fomData].sort((a, b) => {
        return new Date(b.recvdate || 0) - new Date(a.recvdate || 0);
      });
      
      const mostRecentFom = sortedFomData[0];
      if (mostRecentFom && mostRecentFom.paymtamt) {
        let amt = 0;
        
        try {
          if (typeof mostRecentFom.paymtamt === 'string') {
            // Remove any non-numeric characters except decimal point and negative sign
            const cleanedAmt = mostRecentFom.paymtamt.replace(/[^\d.-]/g, '');
            amt = parseFloat(cleanedAmt);
          } else {
            amt = mostRecentFom.paymtamt;
          }
          
        } catch (error) {
          console.error("Error parsing FOM payment amount:", error);
          return acc;
        }
        
        return acc + (isNaN(amt) ? 0 : amt);
      }
      
      return acc;
    }, 0);

    const pageSpecificCalPaymtAmt = filteredCombinedData.reduce((acc, client) => {
      // Look for CAL data in the client's data
      const calData = client.calData?.records || [];
      if (calData.length === 0) return acc;
      
      // Get the most recent CAL record based on recvdate
      const sortedCalData = [...calData].sort((a, b) => {
        return new Date(b.recvdate || 0) - new Date(a.recvdate || 0);
      });
      
      const mostRecentCal = sortedCalData[0];
      if (mostRecentCal && mostRecentCal.paymtamt && mostRecentCal.paymtref) {
        let amt = 0;
        
        try {
          if (typeof mostRecentCal.paymtamt === 'string') {
            // Remove any non-numeric characters except decimal point and negative sign
            const cleanedAmt = mostRecentCal.paymtamt.replace(/[^\d.-]/g, '');
            amt = parseFloat(cleanedAmt);
          } else {
            amt = mostRecentCal.paymtamt;
          }
          
        } catch (error) {
          console.error("Error parsing CAL payment amount:", error);
          return acc;
        }
        
        return acc + (isNaN(amt) ? 0 : amt);
      }
      
      return acc;
    }, 0);

    const serviceData = await Promise.all(
      Object.entries(additionalModels).map(async ([modelName, importFunc]) => {
        const { default: Model } = await importFunc();
        const serviceName = modelName
          .toLowerCase()
          .replace("model", "")
          .toUpperCase();

        const serviceSubscriptions = await Model.aggregate([
          {
            $group: {
              _id: "$clientid",
              hasData: { $sum: 1 },
            },
          },
        ]);

        return { serviceName, subscriptions: serviceSubscriptions };
      })
    );

    const clientServices = filteredCombinedData.map((client) => {
      const services = serviceData.reduce(
        (acc, { serviceName, subscriptions }) => {
          const hasService = subscriptions.some(
            (sub) => Number(sub._id) === Number(client.id) && sub.hasData > 0
          );
          if (hasService) {
            acc.push(serviceName);
          }
          
          return acc;
        },
        []
      );

      return {
        clientId: client.id,
        services,
      };
    });

    return {
      totalPages,
      totalClients,
      currentPage: page,
      pageSize,
      combinedData: filteredCombinedData.map((client) => ({
        ...client,
        ...modelDataMap.get(client.id),
      })),
      totalCopies,
      pageSpecificCopies,
      totalCalQty,
      totalCalAmt,
      pageSpecificCalQty,
      pageSpecificCalAmt,
      totalHrgAmt: hrgTotalAmt || 0,
      totalFomAmt: fomTotalAmt || 0,
      totalCalPaymtAmt: calTotalPaymtAmt || 0,
      pageSpecificHrgAmt: pageSpecificHrgAmt || 0,
      pageSpecificFomAmt: pageSpecificFomAmt || 0,
      pageSpecificCalPaymtAmt: pageSpecificCalPaymtAmt || 0,
      pageSpecificClients: filteredCombinedData.length,
      clientServices,
    };
  } catch (error) {
    console.error(`Error in fetchDataServices:`, error);
    throw error;
  }
}

export default fetchDataServices;
