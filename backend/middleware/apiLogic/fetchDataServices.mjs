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

    const skip = (page - 1) * pageSize;
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
          console.log(`Searching for payment reference with pattern: ${refPattern}`);
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
      console.log("Backend received adddate_regex pattern:", advancedFilterData.adddate_regex);
      baseFilter.push({ 
        adddate: { $regex: advancedFilterData.adddate_regex, $options: "i" } 
      });
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
      // Fetch client IDs that have the specified services in parallel
      const serviceClientIds = await Promise.all(
        advancedFilterData.services.map(async (serviceName) => {
          const modelKey = Object.keys(additionalModels).find((key) =>
            key.toLowerCase().includes(serviceName.toLowerCase())
          );

          if (!modelKey) return [];

          const Model = await getModel(modelKey);

          // Use a simpler, more efficient aggregation
          const results = await Model.aggregate([
            { $project: { clientid: 1 } },
            { $group: { _id: "$clientid" } },
          ]);

          return results.map((r) => Number(r._id)).filter((id) => !isNaN(id));
        })
      );

      // If we have multiple services selected, we need to find the intersection
      // of clients that have ALL the selected services
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
    const skipNum = Number(skip);

    const totalClients = await ClientModel.countDocuments(filterQuery);
    const totalPages = Math.ceil(totalClients / pageSizeNum);

    // First fetch clients
    const clients = await ClientModel.aggregate(aggregatePipeline)
      .project(clientFields)
      .skip(skipNum)
      .limit(pageSizeNum)
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
                  clientid: { $in: clientIds.map((id) => parseInt(id)) }, // Convert to integers
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

        // Set the data for this model
        const modelKey =
          modelNames[index].toLowerCase().replace("model", "") + "Data";
        modelDataMap.get(clientId)[modelKey] = dataObject;
      });
    });

    // Log a sample of the combined data
    const combinedData = clients.map((client) => ({
      ...client,
      ...modelDataMap.get(client.id),
    }));

    // Calculate totalCopies using only the most recent copies for each client
    let totalCopies = 0;
    let totalCalQty = 0;
    let totalCalAmt = 0;
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
          return { totalCopies: 0, totalCalQty: 0, totalCalAmt: 0 };
        }

        // Get WMM model for calculations
        const { default: WmmModel } = await import("../../models/wmm.mjs");
        // Get CAL model for calendar calculations
        const { default: CalModel } = await import("../../models/cal.mjs");

        // Build WMM query to match filtered clients
        const wmmQuery = {
          clientid: { $in: filteredClientIds.map((id) => parseInt(id)) },
        };

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
          const calDate = cal.caldate ? new Date(cal.caldate) : new Date(0);

          if (
            !clientLatestCalEntries.has(clientId) ||
            (cal.caldate &&
              calDate >
                new Date(clientLatestCalEntries.get(clientId).caldate || 0))
          ) {
            clientLatestCalEntries.set(clientId, cal);
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
            }
          }

          // Handle calendar amount calculation
          if (cal.calamt) {
            const calAmt =
              typeof cal.calamt === "string"
                ? parseFloat(cal.calamt)
                : cal.calamt;

            // Only add if it's a valid number
            if (!isNaN(calAmt) && calAmt > 0) {
              calAmtTotal += calAmt;
            }
          }
        }

        return {
          totalCopies: copiesTotal,
          totalCalQty: calQtyTotal,
          totalCalAmt: calAmtTotal,
        };
      } catch (error) {
        console.error("Error calculating totals:", error);
        return { totalCopies: 0, totalCalQty: 0, totalCalAmt: 0 };
      }
    };

    // Calculate totals based on filter
    const totals = await getTotalValues();
    totalCopies = totals.totalCopies;
    totalCalQty = totals.totalCalQty;
    totalCalAmt = totals.totalCalAmt;

    const pageSpecificCopies = combinedData.reduce((acc, client) => {
      const clientCopies = validModelDataArrays.reduce(
        (copiesAcc, modelData) => {
          const clientRecord = modelData.find((item) => item._id === client.id);
          return copiesAcc + (clientRecord?.recentCopies || 0);
        },
        0
      );
      return acc + clientCopies;
    }, 0);

    const pageSpecificCalQty = combinedData.reduce((acc, client) => {
      const clientCalQty = validModelDataArrays.reduce((qtyAcc, modelData) => {
        const clientRecord = modelData.find((item) => item._id === client.id);
        return qtyAcc + (clientRecord?.totalCalQty || 0);
      }, 0);
      return acc + clientCalQty;
    }, 0);

    const pageSpecificCalAmt = combinedData.reduce((acc, client) => {
      const clientCalAmt = validModelDataArrays.reduce((amtAcc, modelData) => {
        const clientRecord = modelData.find((item) => item._id === client.id);
        return amtAcc + (clientRecord?.totalCalAmt || 0);
      }, 0);
      return acc + clientCalAmt;
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

    const clientServices = clients.map((client) => {
      const services = serviceData.reduce(
        (acc, { serviceName, subscriptions }) => {
          const hasService = subscriptions.some(
            (sub) => sub._id === client.id && sub.hasData > 0
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
      combinedData: clients.map((client) => ({
        ...client,
        ...modelDataMap.get(client.id),
      })),
      totalCopies,
      pageSpecificCopies,
      totalCalQty,
      totalCalAmt,
      pageSpecificCalQty,
      pageSpecificCalAmt,
      clientServices,
    };
  } catch (error) {
    console.error(`Error in fetchDataServices:`, error);
    throw error;
  }
}

export default fetchDataServices;
