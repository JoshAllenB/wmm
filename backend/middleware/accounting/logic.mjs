import { models, modelConfigs } from "../../models/modelConfig.mjs";
import ClientModel from "../../models/clients.mjs";

// Helper function to extract payment fields
const getPaymentFields = (modelName) => {
  const projectFields = modelConfigs[modelName]?.projectFields || {};
  return Object.fromEntries(
    Object.entries(projectFields).filter(([field]) => 
      field.startsWith("paymt") || 
      ["recvdate", "paymtdate", "adddate"].includes(field)
    )
  );
};

// Helper function to extract payment reference numbers from various formats
const extractPaymentRefNumber = (input) => {
  if (!input) return null;
  
  console.log('🔍 Input:', input);
  
  // Case 1: Simple number (e.g., "55857")
  if (/^\d+$/.test(input)) {
    console.log('✅ Simple number:', input);
    return input;
  }
  
  // Case 2: Starts with letters then numbers (e.g., "OR# 45424", "MS 001615")
  const prefixMatch = input.match(/(?:^|\W)([A-Za-z]+\s*#?\s*)(\d+)/i);
  if (prefixMatch) {
    console.log('✅ Prefixed number:', prefixMatch[2]);
    return prefixMatch[2];
  }
  
  // Case 3: Multiple numbers (e.g., "MS 001615 01/07/2025", "GCASH#7021940567967 10/20/2024")
  const numbers = input.match(/\d+/g);
  if (numbers) {
    // Sort numbers by length to find potential reference numbers
    const sortedNumbers = numbers.sort((a, b) => {
      // Prioritize 6-digit numbers (typical MS/OR references)
      if (a.length === 6 && b.length !== 6) return -1;
      if (b.length === 6 && a.length !== 6) return 1;
      // Then prefer longer numbers
      return b.length - a.length;
    });
    
    console.log('✅ Multiple numbers -> selected:', sortedNumbers[0]);
    return sortedNumbers[0];
  }
  
  console.log('❌ No valid reference found');
  return null;
};

// Parse tagged search similar to AllClient component
const parseTaggedSearch = (searchValue = "") => {
  const filters = {
    search: "",
    paymentRef: "",
    fullName: ""
  };

  if (!searchValue.trim()) return filters;

  console.log('🔎 Search:', searchValue);
  let remainingValue = searchValue;

  // First check for explicitly tagged payment reference
  const taggedRefMatch = remainingValue.match(/\bref:\s*([^\s]+)/i);
  if (taggedRefMatch) {
    console.log('📌 Tagged ref:', taggedRefMatch[1]);
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
      console.log('✨ Untagged ref:', potentialRef);
      remainingValue = remainingValue.replace(new RegExp(potentialRef.replace(/(\d)/g, '\\W*$1'), 'i'), '').trim();
    }
  }

  // Handle remaining text as name if it contains spaces and we don't have a name yet
  if (!filters.fullName && remainingValue.includes(" ")) {
    filters.fullName = remainingValue;
    remainingValue = "";
  }

  // Any remaining single word goes to general search
  filters.search = remainingValue;

  console.log('🎯 Result:', { ref: filters.paymentRef || 'none' });

  return filters;
};

// Add the buildClientSearchFilter function
const buildClientSearchFilter = (parsedSearch) => {
  const searchFilters = [];
  const { fullName, search } = parsedSearch;

  // Helper function to build name search conditions
  const buildNameConditions = (value) => {
    const parts = value.split(/\s+/);
    const nameFields = ["lname", "fname", "mname", "company"];
    
    if (parts.length > 1) {
      return {
        $and: parts.map(part => ({
          $or: nameFields.map(field => ({ 
            [field]: { $regex: part, $options: "i" } 
          }))
        }))
      };
    }
    
    const regex = new RegExp(value, 'i');
    return {
      $or: nameFields.map(field => ({ [field]: regex }))
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

// Helper function to create payment reference patterns
const createPaymentRefPatterns = (ref) => {
  // Remove all non-digit characters first
  const cleanRef = ref.replace(/\D/g, '');
  
  const withZeros = cleanRef;
  const withoutZeros = cleanRef.replace(/^0+/, '');
  const withAddedZeros = withoutZeros.padStart(6, '0');
  const shortForm = withoutZeros.slice(-5); // Last 5 digits

  const patterns = [
    withZeros, 
    withoutZeros, 
    withAddedZeros,
    shortForm
  ].filter((val, index, arr) => val && arr.indexOf(val) === index);

  console.log('🔢 Ref patterns:', patterns);
  return patterns;
};

// Helper function to build payment reference query condition
const buildPaymentRefQuery = (refPatterns) => {
  // Convert to numbers where possible (remove duplicates)
  const numericValues = [...new Set(refPatterns
    .map(p => {
      const num = parseInt(p, 10);
      return isNaN(num) ? null : num;
    })
    .filter(n => n !== null))];

  // String patterns (original values)
  const stringPatterns = [...new Set(refPatterns)];

  console.log('🔢 Strict payment reference matching:', {
    searchingFor: refPatterns,
    asNumbers: numericValues,
    asStrings: stringPatterns
  });

  const conditions = [];

  // 1. Numeric equality (for number fields)
  if (numericValues.length > 0) {
    conditions.push({
      $or: [
        { paymtref: { $in: numericValues } }, // Direct number match
        { 
          // Handle cases where paymtref is stored as string but should match number
          $expr: {
            $in: [
              { $toInt: { $ifNull: ["$paymtref", 0] } }, 
              numericValues
            ]
          }
        }
      ]
    });
  }

  // 2. String equality (no partial matching)
  if (stringPatterns.length > 0) {
    conditions.push({
      $or: [
        { paymtref: { $in: stringPatterns } }, // Direct string match
        { 
          // Handle cases where paymtref is stored as number but should match string
          $expr: {
            $in: [
              { $toString: { $ifNull: ["$paymtref", ""] } }, 
              stringPatterns
            ]
          }
        }
      ]
    });
  }

  // For models that might have both types in the same field
  return conditions.length > 1 ? { $or: conditions } : conditions[0] || {};
};

// GET /payments - Get all payments for all clients
export const getAllPayments = async (req, res) => {
  try {
    res.setHeader("Content-Type", "application/json");
    
    // Destructure and validate query parameters
    const {
      page = 1,
      limit = 100,
      sort = "recvdate",
      order = "desc",
      startDate,
      endDate,
      search = "",
    } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Parse search and build client filter
    const parsedSearch = parseTaggedSearch(search);
    const clientFilter = buildClientSearchFilter(parsedSearch);

    // Get paginated clients
    const [totalClients, clients] = await Promise.all([
      ClientModel.countDocuments(clientFilter),
      ClientModel.find(clientFilter)
      .select("id lname fname mname company")
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
        .lean()
    ]);

    if (!clients.length) {
      return res.json({
        page: parseInt(page),
        limit: parseInt(limit),
        totalClients: 0,
        totalPayments: 0,
        data: []
      });
    }

    // Get client IDs for payment queries
    const clientIds = clients.map(c => c.id);
    
        console.log('🔍 Starting search with:', {
      ref: parsedSearch.paymentRef || 'none',
      name: parsedSearch.fullName || 'none',
      dateRange: Object.keys(dateFilter).length ? dateFilter : 'none'
    });

    // Process all models in parallel
    const modelQueries = Object.entries(models)
      .filter(([modelName]) => {
        // Skip models that don't have payment fields configured
        const paymentFields = getPaymentFields(modelName);
        const hasPaymentFields = Object.keys(paymentFields).length > 0;
        
        if (!hasPaymentFields) {
          console.log(`⏭️ Skip ${modelName} - no payment fields`);
        }
        return hasPaymentFields;
      })
      .map(async ([modelName, modelLoader]) => {
      console.log(`📋 Searching in ${modelName}...`);
      const model = await modelLoader();
      const paymentFields = getPaymentFields(modelName);

        const clientIdField = modelName === "ComplimentaryModel" ? "clientId" : "clientid";

        // Build the match query
        const matchQuery = {
          [clientIdField]: { $in: clientIds }
        };

        if (parsedSearch.paymentRef) {
          // Generate all possible patterns for the payment reference
          const refPatterns = createPaymentRefPatterns(parsedSearch.paymentRef);
          
          // Use $and to require both client ID and reference match
          matchQuery.$and = [
            { [clientIdField]: { $in: clientIds } },
            buildPaymentRefQuery(refPatterns)
          ];
        }

        if (Object.keys(dateFilter).length > 0) {
          matchQuery.recvdate = dateFilter;
        }

        return model.default.aggregate([
          { $match: matchQuery },
          {
            $addFields: {
              paymtrefType: { $type: "$paymtref" }
            }
          },
          {
            $project: {
              ...paymentFields,
              [clientIdField]: 1,
              model: { $literal: modelName.replace("Model", "") },
              paymtrefType: 1
            },
          },
          { $sort: { [sort]: order === "desc" ? -1 : 1 } },
        ]);
      });

    const allModelPayments = await Promise.all(modelQueries);
    const allPayments = allModelPayments.flat();

    // Create client map for faster lookup
    const clientMap = clients.reduce((acc, client) => {
      acc[client.id] = {
        clientName: `${client.lname}, ${client.fname}${client.mname ? " " + client.mname : ""}`,
        company: client.company
      };
      return acc;
    }, {});

    // Map payments with client info
    const flatPayments = allPayments.map(payment => {
      const clientId = payment.clientid || payment.clientId;
      return {
        ...payment,
        clientId,
        ...clientMap[clientId]
      };
    });

    // Group results by model
    const resultsByModel = flatPayments.reduce((acc, payment) => {
      if (!acc[payment.model]) {
        acc[payment.model] = {
          count: 0,
          types: new Set(),
          sample: null
        };
      }
      acc[payment.model].count++;
      acc[payment.model].types.add(payment.paymtrefType);
      if (!acc[payment.model].sample) {
        acc[payment.model].sample = {
          client: payment.clientName,
          ref: payment.paymtref,
          type: payment.paymtrefType,
          amount: payment.paymtamt
        };
      }
      return acc;
    }, {});

    // Log summary by model
    console.log('📊 Search Results by Model:', 
      Object.entries(resultsByModel)
        .map(([model, data]) => ({
          model,
          matches: data.count,
          refTypes: [...data.types],
          example: data.sample
        }))
    );

    // Log overall summary
    console.log('🎯 Total Results:', {
      clients: totalClients,
      payments: flatPayments.length,
      models: Object.keys(resultsByModel).length
    });

    res.json({
      page: parseInt(page),
      limit: parseInt(limit),
      totalClients,
      totalPayments: flatPayments.length,
      data: flatPayments,
    });
  } catch (error) {
    console.error("Error in /payments endpoint:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};