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
  
  console.log('🔍 Processing payment reference input:', input);
  
  // Case 1: Simple number (e.g., "55857")
  if (/^\d+$/.test(input)) {
    console.log('✅ Found simple number:', input);
    return input;
  }
  
  // Case 2: Starts with letters then numbers (e.g., "OR# 45424", "MS 001615")
  const prefixMatch = input.match(/(?:^|\W)([A-Za-z]+\s*#?\s*)(\d+)/i);
  if (prefixMatch) {
    console.log('✅ Found prefixed number:', {
      prefix: prefixMatch[1],
      number: prefixMatch[2]
    });
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
    
    console.log('✅ Found multiple numbers, sorted by priority:', {
      allNumbers: numbers,
      sortedNumbers: sortedNumbers,
      selected: sortedNumbers[0]
    });
    return sortedNumbers[0];
  }
  
  console.log('❌ No valid payment reference found in:', input);
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

  console.log('🔎 Processing search value:', searchValue);
  let remainingValue = searchValue;

  // First check for explicitly tagged payment reference
  const taggedRefMatch = remainingValue.match(/\bref:\s*([^\s]+)/i);
  if (taggedRefMatch) {
    console.log('📌 Found tagged reference:', taggedRefMatch[1]);
    // Enhanced extraction that handles all formats
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
    console.log('🔍 Looking for untagged payment reference in:', remainingValue);
    const potentialRef = extractPaymentRefNumber(remainingValue);
    if (potentialRef) {
      filters.paymentRef = potentialRef;
      console.log('✨ Found untagged payment reference:', potentialRef);
      // Remove the matched reference from remaining text
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

  console.log('🎯 Final payment reference result:', {
    originalInput: searchValue,
    extractedRef: filters.paymentRef || 'none'
  });

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
  // Original number with zeros
  const withZeros = ref;
  // Number without leading zeros
  const withoutZeros = ref.replace(/^0+/, '');
  // Add leading zeros if not present (up to 6 digits)
  const withAddedZeros = withoutZeros.padStart(6, '0');

  console.log('🔢 Generated payment reference patterns:', {
    withZeros,
    withoutZeros,
    withAddedZeros
  });

  // Create patterns that will match any of these variations
  return [withZeros, withoutZeros, withAddedZeros]
    .filter((val, index, arr) => arr.indexOf(val) === index); // Remove duplicates
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
    
    // Process all models in parallel
    const modelQueries = Object.entries(models).map(async ([modelName, modelLoader]) => {
      const model = await modelLoader();
      const paymentFields = getPaymentFields(modelName);
      
      if (Object.keys(paymentFields).length === 0) return [];

      // Build the base match query
      const matchQuery = {};
      
      // Add payment reference filter if provided
      if (parsedSearch.paymentRef) {
        const refPatterns = createPaymentRefPatterns(parsedSearch.paymentRef);
        
        matchQuery.paymtref = { 
          $regex: refPatterns.map(p => `\\b(?:${p})\\b`).join('|'), 
          $options: "i" 
        };
        
        console.log('🔍 Searching with payment reference patterns:', {
          patterns: refPatterns,
          regex: refPatterns.map(p => `\\b(?:${p})\\b`).join('|')
        });
      }

      // Add date filter if provided
      if (Object.keys(dateFilter).length > 0) {
        matchQuery.recvdate = dateFilter;
      }

      return model.default.aggregate([
        { $match: matchQuery },
        {
          $project: {
            ...paymentFields,
            model: { $literal: modelName.replace("Model", "") },
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

    // Log the first 3 results
    console.log('🎯 Search Results (first 3):', {
      totalFound: flatPayments.length,
      sampleResults: flatPayments.slice(0, 3).map(payment => ({
        client: payment.clientName,
        amount: payment.paymtamt,
        reference: payment.paymtref,
        date: payment.recvdate,
        model: payment.model
      }))
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