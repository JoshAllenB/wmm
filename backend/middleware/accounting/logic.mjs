import { models, modelConfigs } from "../../models/modelConfig.mjs";
import ClientModel from "../../models/clients.mjs";

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
    if (pattern.test(inputStr)) {
      return inputStr;
    }
  }
  
  return null;
};

// Parse tagged search similar to AllClient component
const parseTaggedSearch = (searchValue = "") => {
  const filters = {
    search: "",
    paymentRef: "",
    fullName: "",
  };

  if (!searchValue.trim()) return filters;

  let remainingValue = searchValue;

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
        $and: parts.map((part) => ({
          $or: nameFields.map((field) => ({
            [field]: { $regex: part, $options: "i" },
          })),
        })),
      };
    }

    const regex = new RegExp(value, "i");
    return {
      $or: nameFields.map((field) => ({ [field]: regex })),
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
  // Keep the original reference as the only pattern
  const patterns = [ref];

  return patterns;
};

// Helper function to build payment reference query condition
const buildPaymentRefQuery = (refPatterns) => {
  const cleanRef = refPatterns[0].toString().trim();

  return {
    $or: [
      { paymtref: { $eq: cleanRef } },
      {
        $expr: {
          $eq: [{ $toString: { $ifNull: ["$paymtref", ""] } }, cleanRef],
        },
      },
      {
        $expr: {
          $gt: [
            {
              $indexOfCP: [
                { $toString: { $ifNull: ["$paymtref", ""] } },
                cleanRef,
              ],
            },
            -1,
          ],
        },
      },
    ],
  };
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
    
    let clients = [];
    let totalClients = 0;

    // If searching for a payment reference, search directly in payment models first
    if (parsedSearch.paymentRef) {
      const refPatterns = createPaymentRefPatterns(parsedSearch.paymentRef);
      const paymentRefQuery = buildPaymentRefQuery(refPatterns);
      
      // Process all models in parallel but only for payment reference search
      const modelQueries = Object.entries(models)
        .filter(([modelName]) => {
          const paymentFields = getPaymentFields(modelName);
          return Object.keys(paymentFields).length > 0;
        })
        .map(async ([modelName, modelLoader]) => {
          const model = await modelLoader();
          const paymentFields = getPaymentFields(modelName);
          const clientIdField = modelName === "ComplimentaryModel" ? "clientId" : "clientid";

          // First find matching payment references
          const matchingPayments = await model.default.aggregate([
            { $match: paymentRefQuery },
            {
              $project: {
                ...paymentFields,
                [clientIdField]: 1,
                model: { $literal: modelName.replace("Model", "") },
              },
            },
            { $sort: { [sort]: order === "desc" ? -1 : 1 } },
            { $limit: 1000 }, // Reasonable limit for performance
          ]);

          return matchingPayments;
        });

      const allModelPayments = await Promise.all(modelQueries);
      const allPayments = allModelPayments.flat();

      // Get unique client IDs from the payments
      const uniqueClientIds = [...new Set(allPayments.map(p => p.clientid || p.clientId))];

      if (uniqueClientIds.length > 0) {
        // Fetch only the clients that have matching payments
        clients = await ClientModel.find({ id: { $in: uniqueClientIds } })
          .select("id lname fname mname company")
          .lean();
        totalClients = clients.length;
      }

      // Create client map for faster lookup
      const clientMap = clients.reduce((acc, client) => {
        acc[client.id] = {
          clientName: `${client.lname}, ${client.fname}${
            client.mname ? " " + client.mname : ""
          }`,
          company: client.company,
        };
        return acc;
      }, {});

      // Map payments with client info
      const flatPayments = allPayments.map((payment) => {
        const clientId = payment.clientid || payment.clientId;
        const clientInfo = clientMap[clientId] || {
          clientName: "Unknown Client",
          company: "",
        };
        return {
          ...payment,
          clientId,
          ...clientInfo,
        };
      });

      return res.json({
        page: 1,
        limit: flatPayments.length,
        totalClients,
        totalPayments: flatPayments.length,
        data: flatPayments,
      });
    }

    // Handle name search or general search
    if (parsedSearch.fullName || parsedSearch.search) {
      const clientFilter = buildClientSearchFilter(parsedSearch);
      
      // Get all matching clients without pagination for search
      clients = await ClientModel.find(clientFilter)
        .select("id lname fname mname company")
        .limit(1000) // Reasonable limit for performance
        .lean();
      
      totalClients = clients.length;
    } else {
      // Normal paginated flow for non-search cases
      [totalClients, clients] = await Promise.all([
        ClientModel.countDocuments({}),
        ClientModel.find({})
          .select("id lname fname mname company")
          .skip((page - 1) * limit)
          .limit(parseInt(limit))
          .lean(),
      ]);
    }

    if (!clients.length) {
      return res.json({
        page: parseInt(page),
        limit: parseInt(limit),
        totalClients: 0,
        totalPayments: 0,
        data: [],
      });
    }

    // Get client IDs for payment queries
    const clientIds = clients.map((c) => c.id);

    // Process all models in parallel
    const modelQueries = Object.entries(models)
      .filter(([modelName]) => {
        const paymentFields = getPaymentFields(modelName);
        return Object.keys(paymentFields).length > 0;
      })
      .map(async ([modelName, modelLoader]) => {
        const model = await modelLoader();
        const paymentFields = getPaymentFields(modelName);
        const clientIdField = modelName === "ComplimentaryModel" ? "clientId" : "clientid";

        const matchQuery = {
          [clientIdField]: { $in: clientIds },
        };

        if (Object.keys(dateFilter).length > 0) {
          matchQuery.recvdate = dateFilter;
        }

        return model.default.aggregate([
          { $match: matchQuery },
          {
            $project: {
              ...paymentFields,
              [clientIdField]: 1,
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
        clientName: `${client.lname}, ${client.fname}${
          client.mname ? " " + client.mname : ""
        }`,
        company: client.company,
      };
      return acc;
    }, {});

    // Map payments with client info
    const flatPayments = allPayments.map((payment) => {
      const clientId = payment.clientid || payment.clientId;
      const clientInfo = clientMap[clientId] || {
        clientName: "Unknown Client",
        company: "",
      };
      return {
        ...payment,
        clientId,
        ...clientInfo,
      };
    });

    res.json({
      page: parseInt(page),
      limit: parseInt(limit),
      totalClients,
      totalPayments: flatPayments.length,
      data: flatPayments,
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};