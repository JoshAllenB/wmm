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
  return Object.fromEntries(
    Object.entries(projectFields).filter(
      ([field]) =>
        field.startsWith("paymt") ||
        ["recvdate", "paymtdate", "adddate"].includes(field)
    )
  );
};

// Helper function to generate cache key
const generateCacheKey = (params) => {
  const { page, limit, sort, order, startDate, endDate, search } = params;
  const key = `payments_${page || 1}_${limit || 20}_${sort || 'recvdate'}_${order || 'desc'}_${startDate || ''}_${endDate || ''}_${search || ''}`;
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
      search = "",
    } = req.query;

    // Generate cache key
    const cacheKey = generateCacheKey(req.query);
    
    // Check cache first
    const cachedResult = queryCache.get(cacheKey);
    if (cachedResult) {
      return res.json(cachedResult);
    }

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Parse search and build client filter
    const parsedSearch = parseTaggedSearch(search);
    
    let clients = [];
    let totalClients = 0;
    let flatPayments = [];

    // Get relevant models
    const relevantModels = Object.entries(models)
      .filter(([modelName]) => {
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

    // If searching for a payment reference, search directly in payment models
    if (parsedSearch.paymentRef) {
      const paymentRefQuery = buildPaymentRefQuery(parsedSearch.paymentRef);
      
      // Process all models in parallel for payment reference search
      const modelQueries = validModels.map(async ([modelName, model]) => {
        try {
          const result = await model.find(paymentRefQuery)
            .select({ ...getPaymentFields(modelName), clientid: 1, clientId: 1 })
            .lean()
            .exec();
          return result.map(payment => ({
            ...payment,
            modelType: modelName.replace('Model', '')
          }));
        } catch (err) {
          console.error(`Error querying ${modelName}:`, err);
          return [];
        }
      });

      const results = await Promise.all(modelQueries);
      flatPayments = results.flat();

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
      
      if (search) {
        // When searching, get all matching clients
        clients = await ClientModel.find(clientFilter)
          .select('id lname fname mname company')
          .lean()
          .exec();
        totalClients = clients.length;
      } else {
        // Normal pagination
        [totalClients, clients] = await Promise.all([
          ClientModel.countDocuments({}),
          ClientModel.find({})
            .select('id lname fname mname company')
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean()
            .exec()
        ]);
      }

      if (clients.length > 0) {
        // Get client IDs for payment queries
        const clientIds = clients.map(c => c.id);

        // Process all models in parallel
        const modelQueries = validModels.map(async ([modelName, model]) => {
          try {
            const query = {
              $or: [
                { clientid: { $in: clientIds } },
                { clientId: { $in: clientIds } }
              ]
            };

            if (Object.keys(dateFilter).length > 0) {
              query.recvdate = dateFilter;
            }

            const result = await model.find(query)
              .select({ ...getPaymentFields(modelName), clientid: 1, clientId: 1 })
              .sort({ [sort]: order === 'desc' ? -1 : 1 })
              .lean()
              .exec();

            return result.map(payment => ({
              ...payment,
              modelType: modelName.replace('Model', '')
            }));
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
        ...clientInfo
      };
    });

    // Prepare the final result
    const result = {
      page: parseInt(page),
      limit: parseInt(limit),
      totalClients,
      totalPayments: paymentsWithClientInfo.length,
      data: paymentsWithClientInfo,
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