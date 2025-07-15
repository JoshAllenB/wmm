import { models, modelConfigs } from "../../models/modelConfig.mjs";
import ClientModel from "../../models/clients.mjs";
import NodeCache from "node-cache";

// Initialize cache with 5 minute TTL and check period of 600 seconds
const queryCache = new NodeCache({ 
  stdTTL: 300,
  checkperiod: 600,
  useClones: false // Disable cloning for better performance
});

// Cache for loaded models to avoid reloading on every request
const modelCache = new Map();

// Helper function to extract payment fields
const getPaymentFields = (modelName) => {
  const projectFields = modelConfigs[modelName]?.projectFields || {};
  
  // Include all payment-related fields and date fields
  return Object.fromEntries(
    Object.entries(projectFields).filter(
      ([field]) =>
        field.startsWith("paymt") ||
        field.startsWith("cal") ||  // Include calendar-related fields
        ["recvdate", "paymtdate", "adddate", "renewdate", "campaigndate"].includes(field)
    )
  );
};

// Helper function to generate cache key
const generateCacheKey = (params) => {
  const { page, limit, sort, order, startDate, endDate, startYear, endYear, search } = params;
  const key = `payments_${page || 1}_${limit || 20}_${sort || 'recvdate'}_${order || 'desc'}_${startDate || ''}_${endDate || ''}_${startYear || ''}_${endYear || ''}_${search || ''}`;
  return key.toLowerCase(); // Normalize cache key
};

// Helper function to extract payment reference numbers from various formats
const extractPaymentRefNumber = (input) => {
  if (!input) return null;
  
  // Common payment reference patterns
  const patterns = [
    /^(?:OR#?\s*)?(\d{5,6})$/i,           // OR number: OR#12345 or 12345
    /^(?:MS\s*)?(\d{6})$/i,               // MS number: MS123456 or 123456
    /^(?:GCASH\s*)?(\d{6,})$/i,           // GCASH number
    /^[A-Z]{2}\s*\d{6}$/i,                // Two letters followed by 6 digits (MS 123456)
    /^\d{4,}[A-Z]?$/                      // 4+ digits optionally followed by a letter
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

// Helper function to extract dates from paymtref field
const extractDatesFromPaymtRef = (paymtref) => {
  if (!paymtref) return [];
  
  // Match dates in format MM/DD/YYYY
  const dateRegex = /(\d{2})\/(\d{2})\/(\d{4})/g;
  const matches = [...paymtref.matchAll(dateRegex)];
  
  return matches.map(match => {
    const [_, month, day, year] = match;
    return new Date(year, month - 1, day);
  });
};

// Helper function to check if a date falls within a year range
const isDateInYearRange = (date, startYear, endYear) => {
  const year = date.getFullYear();
  if (startYear && !endYear) return year >= parseInt(startYear);
  if (!startYear && endYear) return year <= parseInt(endYear);
  if (startYear && endYear) return year >= parseInt(startYear) && year <= parseInt(endYear);
  return true;
};

// Helper function to extract dates from paymtform field
const extractDateFromPaymtForm = (paymtform) => {
  if (!paymtform) return null;
  
  // Match date patterns like BKTR-1/13/25 or similar
  const dateRegex = /(\d{1,2})\/(\d{1,2})\/(\d{2})/;
  const match = paymtform.match(dateRegex);
  
  if (match) {
    const [_, month, day, year] = match;
    // Handle 2-digit year
    let fullYear = parseInt(year);
    if (fullYear < 100) {
      fullYear += fullYear < 50 ? 2000 : 1900;
    }
    return new Date(fullYear, parseInt(month) - 1, parseInt(day));
  }
  
  return null;
};

// Helper function to build date filter aggregation stages
const buildDateFilterStages = (startYear, endYear, modelName) => {
  if (!startYear && !endYear) return [];

  // Create Date objects at the start and end of the years
  const startDate = startYear ? new Date(Date.UTC(parseInt(startYear), 0, 1)) : null;
  const endDate = endYear ? new Date(Date.UTC(parseInt(endYear), 11, 31, 23, 59, 59, 999)) : null;

  // Define date fields to check based on model
  const dateFields = {
    wmm: {
      fields: [],  // WMM only uses dates from paymtref
      hasPaymtRef: true
    },
    hrg: {
      fields: ['recvdate'],  // Payment received date
      hasPaymtForm: true
    },
    fom: {
      fields: ['recvdate'],  // Payment received date
      hasPaymtForm: true
    },
    cal: {
      fields: ['paymtdate', 'recvdate'],  // Payment date and received date
      hasPaymtForm: true
    }
  };

  const modelConfig = dateFields[modelName.toLowerCase()] || { fields: [], hasPaymtRef: false };
  const stages = [];

  // Stage 1: Add extracted dates from paymtref if applicable
  if (modelConfig.hasPaymtRef) {
    stages.push({
      $addFields: {
        extractedDates: {
          $function: {
            body: function(paymtref) {
              if (!paymtref) return [];
              const dateRegex = /(\d{2})\/(\d{2})\/(\d{4})/g;
              const matches = String(paymtref).matchAll(dateRegex);
              const dates = [];
              for (const match of matches) {
                const [_, month, day, year] = match;
                // Create date in UTC to match the filter dates
                dates.push(new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day))));
              }
              return dates;
            },
            args: ["$paymtref"],
            lang: "js"
          }
        }
      }
    });
  }

  // Stage 2: Add extracted date from paymtform if applicable
  if (modelConfig.hasPaymtForm) {
    stages.push({
      $addFields: {
        paymtformDate: {
          $function: {
            body: function(paymtform) {
              if (!paymtform) return null;
              const dateRegex = /(\d{1,2})\/(\d{1,2})\/(\d{2})/;
              const match = String(paymtform).match(dateRegex);
              if (match) {
                const [_, month, day, year] = match;
                let fullYear = parseInt(year);
                if (fullYear < 100) {
                  fullYear += fullYear < 50 ? 2000 : 1900;
                }
                // Create date in UTC to match the filter dates
                return new Date(Date.UTC(fullYear, parseInt(month) - 1, parseInt(day)));
              }
              return null;
            },
            args: ["$paymtform"],
            lang: "js"
          }
        }
      }
    });
  }

  return stages;
};

// Optimized search parsing with memoization
const searchCache = new Map();
const parseTaggedSearch = (searchValue = "") => {
  const normalizedSearch = searchValue.trim().toLowerCase();
  if (!normalizedSearch) {
    return { search: "", paymentRef: "", fullName: "" };
  }

  // Check cache first
  const cached = searchCache.get(normalizedSearch);
  if (cached) return cached;

  const filters = {
    search: "",
    paymentRef: "",
    fullName: "",
  };

  let remainingValue = normalizedSearch;

  // First check for explicitly tagged payment reference
  const taggedRefMatch = remainingValue.match(/\bref:\s*([^\s]+)/i);
  if (taggedRefMatch) {
    filters.paymentRef = extractPaymentRefNumber(taggedRefMatch[1]);
    remainingValue = remainingValue.replace(taggedRefMatch[0], "").trim();
  }

  // Check for tagged full name
  const nameMatch = remainingValue.match(/\bname:\s*([^:]+?)(?=\s+\w+:|$)/i);
  if (nameMatch) {
    filters.fullName = nameMatch[1].trim();
    remainingValue = remainingValue.replace(nameMatch[0], "").trim();
  }

  // If no tagged payment reference was found, look for potential payment ref in remaining text
  if (!filters.paymentRef) {
    const potentialRef = extractPaymentRefNumber(remainingValue);
    if (potentialRef) {
      filters.paymentRef = potentialRef;
      remainingValue = remainingValue.replace(potentialRef, "").trim();
    }
  }

  // If we haven't found a payment reference or name yet, treat the input as a name search
  if (!filters.paymentRef && !filters.fullName) {
    filters.fullName = remainingValue;
    remainingValue = "";
  }

  // Any remaining text goes to general search
  filters.search = remainingValue;

  // Cache the result
  searchCache.set(normalizedSearch, filters);
  
  // Limit cache size to prevent memory leaks
  if (searchCache.size > 1000) {
    const firstKey = searchCache.keys().next().value;
    searchCache.delete(firstKey);
  }

  return filters;
};

// Helper function to load and cache models
const loadModel = async (modelName, modelLoader) => {
  // Check if model is already cached
  if (modelCache.has(modelName)) {
    return modelCache.get(modelName);
  }

  try {
    const model = await modelLoader();
    const loadedModel = model.default;
    modelCache.set(modelName, loadedModel);
    return loadedModel;
  } catch (err) {
    console.error(`Error loading model ${modelName}:`, err);
    return null;
  }
};

// Optimized client search filter builder
const buildClientSearchFilter = (parsedSearch) => {
  const searchFilters = [];
  const { fullName, search } = parsedSearch;

  if (!fullName && !search) return {};

  // Helper function to build name search conditions
  const buildNameConditions = (value) => {
    const parts = value.split(/\s+/).filter(Boolean);
    const nameFields = ["lname", "fname", "mname", "company"];

    if (parts.length > 1) {
      return {
        $and: parts.map((part) => ({
          $or: nameFields.map((field) => ({
            [field]: new RegExp(part, "i")
          }))
        }))
      };
    }

    return {
      $or: nameFields.map((field) => ({
        [field]: new RegExp(value, "i")
      }))
    };
  };

  // Full name filter
  if (fullName) {
    searchFilters.push(buildNameConditions(fullName));
  }

  // General search filter (only for name fields)
  if (search) {
    searchFilters.push(buildNameConditions(search));
  }

  return searchFilters.length > 0 ? { $or: searchFilters } : {};
};

// Optimized payment reference query builder
const buildPaymentRefQuery = (ref) => {
  if (!ref) return null;

  const cleanRef = ref.toString().trim();
  return {
    paymtref: new RegExp(cleanRef, "i")
  };
};

// Helper function to get the appropriate date field for a model
function getDateFieldForModel(modelName) {
  const lowerName = modelName.toLowerCase();
  if (lowerName.includes('cal')) return 'paymtdate';
  if (lowerName.includes('wmm')) return null; // Handled specially
  return 'recvdate'; // Default for other models
}

// GET /payments - Get all payments for all clients with caching
export const getAllPayments = async (req, res) => {
  try {
    const startTime = Date.now();
    res.setHeader("Content-Type", "application/json");

    const {
      page = 1,
      limit = 100,
      sort = "recvdate",
      order = "desc",
      startDate,
      endDate,
      startYear,
      endYear,
      search = "",
    } = req.query;

    const pageNum = parseInt(page);
    const pageSize = parseInt(limit);

    // Generate cache key
    const cacheKey = generateCacheKey(req.query);
    
    // Check cache first
    const cachedResult = queryCache.get(cacheKey);
    if (cachedResult) {
      return res.json(cachedResult);
    }

    // Parse search and build client filter
    const parsedSearch = parseTaggedSearch(search);
    
    let clients = [];
    let flatPayments = [];
    let paginatedPayments = [];

    // Get relevant models
    const relevantModels = Object.entries(models)
      .filter(([modelName]) => {
        // Only include WMM, HRG, FOM, and CAL models
        const validModels = ['wmm', 'hrg', 'fom', 'cal'];
        const isValidModel = validModels.some(valid => modelName.toLowerCase().includes(valid));
        if (!isValidModel) return false;
        const paymentFields = getPaymentFields(modelName);
        return Object.keys(paymentFields).length > 0;
      });

    // Load all models in parallel
    const loadedModels = await Promise.all(
      relevantModels.map(async ([modelName, modelLoader]) => {
        const model = await loadModel(modelName, modelLoader);
        return model ? [modelName, model] : null;
      })
    );

    // Filter out any failed model loads
    const validModels = loadedModels.filter(Boolean);

    // Build year filter dates
    const yearFilter = {};
    if (startYear) {
      yearFilter.$gte = new Date(parseInt(startYear), 0, 1);
    }
    if (endYear) {
      yearFilter.$lte = new Date(parseInt(endYear), 11, 31, 23, 59, 59, 999);
    }

    // If searching for a payment reference, search directly in payment models
    if (parsedSearch.paymentRef) {
      const paymentRefQuery = buildPaymentRefQuery(parsedSearch.paymentRef);
      
      // Process all models in parallel for payment reference search
      const modelQueries = validModels.map(async ([modelName, model]) => {
        try {
          let query = { ...paymentRefQuery };

          // Add year filter if needed
          if (Object.keys(yearFilter).length > 0) {
            const dateField = getDateFieldForModel(modelName);
            if (dateField) {
              query[dateField] = yearFilter;
            } else if (modelName.toLowerCase().includes('wmm')) {
              // For WMM, we'll filter after fetching
              query.isWmm = true;
            }
          }

          const result = await model.find(query)
            .select({ ...getPaymentFields(modelName), clientid: 1, clientId: 1 })
            .lean()
            .exec();

          return result.map(payment => ({
            ...payment,
            modelType: modelName.replace('Model', ''),
            // For WMM, extract dates from paymtref
            ...(modelName.toLowerCase().includes('wmm') && { 
              extractedDates: extractDatesFromPaymtRef(payment.paymtref) 
            })
          }));
        } catch (err) {
          console.error(`Error querying ${modelName}:`, err);
          return [];
        }
      });

      const results = await Promise.all(modelQueries);
      flatPayments = results.flat();

      // Apply year filter for WMM models if needed
      if (Object.keys(yearFilter).length > 0) {
        flatPayments = flatPayments.filter(payment => {
          if (payment.modelType.toLowerCase().includes('wmm')) {
            return payment.extractedDates?.some(date => 
              (!yearFilter.$gte || date >= yearFilter.$gte) &&
              (!yearFilter.$lte || date <= yearFilter.$lte)
            );
          }
          return true; // Other models already filtered in query
        });
      }

      // Get unique client IDs from payments
      const clientIds = [...new Set(flatPayments.map(p => p.clientid || p.clientId))];
      
      if (clientIds.length > 0) {
        // Fetch client information
        clients = await ClientModel.find({ id: { $in: clientIds } })
          .select('id lname fname mname company')
          .lean()
          .exec();
      }
    } else {
      // Handle name search or regular pagination
      const clientFilter = buildClientSearchFilter(parsedSearch);
      
      // Get all matching clients first
      clients = await ClientModel.find(clientFilter)
        .select('id lname fname mname company')
        .lean()
        .exec();

      if (clients.length > 0) {
        // Get client IDs for payment queries
        const clientIds = clients.map(c => c.id);

        // Process all models in parallel with aggregation for better date handling
        const modelQueries = validModels.map(async ([modelName, model]) => {
          try {
            const isWmmModel = modelName.toLowerCase().includes('wmm');
            const isCalModel = modelName.toLowerCase().includes('cal');
            const isHrgModel = modelName.toLowerCase().includes('hrg');
            const isFomModel = modelName.toLowerCase().includes('fom');
            
            // Determine date fields based on model type
            let dateFields = [];
            if (isWmmModel) {
              // WMM dates are handled through paymtref extraction
              dateFields = [];
            } else if (isCalModel) {
              dateFields = ['paymtdate', 'recvdate'];
            } else {
              // HRG and FOM use recvdate
              dateFields = ['recvdate'];
            }

            // Base pipeline stages
            const pipeline = [
              {
                $match: {
                  $or: [
                    { clientid: { $in: clientIds } },
                    { clientId: { $in: clientIds } }
                  ]
                }
              }
            ];

            // Add date extraction for WMM model
            if (isWmmModel && Object.keys(yearFilter).length > 0) {
              pipeline.push({
                $addFields: {
                  extractedDates: {
                    $function: {
                      body: function(paymtref) {
                        if (!paymtref) return [];
                        const dateRegex = /(\d{2})\/(\d{2})\/(\d{4})/g;
                        const matches = String(paymtref).matchAll(dateRegex);
                        const dates = [];
                        for (const match of matches) {
                          const [_, month, day, year] = match;
                          dates.push(new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day))));
                        }
                        return dates;
                      },
                      args: ["$paymtref"],
                      lang: "js"
                    }
                  }
                }
              });

              // Add date filter for WMM
              if (yearFilter.$gte || yearFilter.$lte) {
                pipeline.push({
                  $match: {
                    extractedDates: {
                      $elemMatch: yearFilter
                    }
                  }
                });
              }
            }
            // Add date handling for HRG and FOM models
            else if ((isHrgModel || isFomModel) && Object.keys(yearFilter).length > 0) {
              
              // Add paymtform date extraction
              pipeline.push({
                $addFields: {
                  extractedPaymtFormDate: {
                    $function: {
                      body: function(paymtform) {
                        if (!paymtform) return null;
                        const match = String(paymtform).match(/(\d{1,2})\/(\d{1,2})\/(\d{2})/);
                        if (match) {
                          const [_, month, day, year] = match;
                          let fullYear = parseInt(year);
                          if (fullYear < 100) {
                            fullYear += fullYear < 50 ? 2000 : 1900;
                          }
                          return new Date(Date.UTC(fullYear, parseInt(month) - 1, parseInt(day)));
                        }
                        return null;
                      },
                      args: ["$paymtform"],
                      lang: "js"
                    }
                  },
                  // Convert string dates to Date objects
                  parsedRecvDate: {
                    $dateFromString: {
                      dateString: "$recvdate",
                      onError: null
                    }
                  }
                }
              });

              // Add date filter for both recvdate and paymtform date
              pipeline.push({
                $match: {
                  $or: [
                    {
                      parsedRecvDate: yearFilter
                    },
                    {
                      extractedPaymtFormDate: yearFilter
                    }
                  ]
                }
              });
            }
            // Add date handling for CAL model
            else if (isCalModel && Object.keys(yearFilter).length > 0) {
              
              // Convert string dates to Date objects
              pipeline.push({
                $addFields: {
                  parsedPaymtDate: {
                    $dateFromString: {
                      dateString: "$paymtdate",
                      onError: null
                    }
                  },
                  parsedRecvDate: {
                    $dateFromString: {
                      dateString: "$recvdate",
                      onError: null
                    }
                  }
                }
              });

              // Add date filter for both dates
              pipeline.push({
                $match: {
                  $or: [
                    {
                      parsedPaymtDate: yearFilter
                    },
                    {
                      parsedRecvDate: yearFilter
                    }
                  ]
                }
              });
            }

            // Add projection
            pipeline.push({
              $project: {
                ...getPaymentFields(modelName),
                clientid: 1,
                clientId: 1,
                modelType: { $literal: modelName.replace('Model', '') },
                ...(isWmmModel ? { paymtref: 1, extractedDates: 1 } : {}),
                ...(isCalModel ? { paymtdate: 1, recvdate: 1 } : {}),
                ...((isHrgModel || isFomModel) ? { 
                  recvdate: 1,
                  paymtform: 1,
                  extractedPaymtFormDate: 1
                } : {}),
                ...(!isCalModel && !isWmmModel && !isHrgModel && !isFomModel ? { recvdate: 1 } : {})
              }
            });

            const result = await model.aggregate(pipeline);
            return result;
          } catch (err) {
            console.error(`Error querying ${modelName}:`, err);
            return [];
          }
        });

        const results = await Promise.all(modelQueries);
        flatPayments = results.flat();
      }
    }

    // Create client map for faster lookup
    const clientMap = new Map(
      clients.map(client => [
        client.id,
        {
          clientName: `${client.lname}, ${client.fname}${client.mname ? ' ' + client.mname : ''}`,
          company: client.company
        }
      ])
    );

    // Map payments with client info
    const paymentsWithClientInfo = flatPayments.map(payment => {
      const clientId = payment.clientid || payment.clientId;
      const clientInfo = clientMap.get(clientId) || {
        clientName: 'Unknown Client',
        company: ''
      };
      return {
        ...payment,
        clientId,
        ...clientInfo,
        date: payment.paymtdate || payment.recvdate || 
              (payment.extractedDates ? payment.extractedDates[0] : null)
      };
    });

    // Sort payments if needed
    if (sort) {
      const sortField = sort === 'date' ? 'date' : sort;
      paymentsWithClientInfo.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (!aVal && !bVal) return 0;
        if (!aVal) return order === 'desc' ? 1 : -1;
        if (!bVal) return order === 'desc' ? -1 : 1;
        return order === 'desc' 
          ? (bVal > aVal ? 1 : -1)
          : (aVal > bVal ? 1 : -1);
      });
    }

    // Calculate pagination based on actual data length
    const totalRecords = paymentsWithClientInfo.length;
    const totalPages = Math.ceil(totalRecords / pageSize);
    const validPageNum = Math.max(1, Math.min(pageNum, totalPages));
    const startIndex = (validPageNum - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalRecords);

    // Get paginated data
    paginatedPayments = paymentsWithClientInfo.slice(startIndex, endIndex);

    // Prepare the final result
    const result = {
      page: validPageNum,
      limit: pageSize,
      totalRecords,
      totalPages,
      data: paginatedPayments,
      executionTime: Date.now() - startTime
    };

    // Cache the result
    queryCache.set(cacheKey, result);
    
    res.json(result);
  } catch (error) {
    console.error("Error in getAllPayments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};