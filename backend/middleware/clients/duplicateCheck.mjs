import ClientModel from "../../models/clients.mjs";
import WmmModel from "../../models/wmm.mjs";
import HrgModel from "../../models/hrg.mjs";
import FomModel from "../../models/fom.mjs";
import CalModel from "../../models/cal.mjs";

// Address standardization utility function
const standardizeAddress = (address) => {
  if (!address || typeof address !== 'string') return '';
  
  return address
    .toUpperCase()
    // Standardize common street abbreviations
    .replace(/\bST\b|\bSTREET\b/gi, "STREET")
    .replace(/\bAVE\b|\bAVENUE\b/gi, "AVENUE")
    .replace(/\bRD\b|\bROAD\b/gi, "ROAD")
    .replace(/\bBLVD\b|\bBOULEVARD\b/gi, "BOULEVARD")
    .replace(/\bLN\b|\bLANE\b/gi, "LANE")
    .replace(/\bDR\b|\bDRIVE\b/gi, "DRIVE")
    .replace(/\bCT\b|\bCOURT\b/gi, "COURT")
    .replace(/\bPL\b|\bPLACE\b/gi, "PLACE")
    .replace(/\bSQ\b|\bSQUARE\b/gi, "SQUARE")
    .replace(/\bCIR\b|\bCIRCLE\b/gi, "CIRCLE")
    .replace(/\bPKWY\b|\bPARKWAY\b/gi, "PARKWAY")
    .replace(/\bHWY\b|\bHIGHWAY\b/gi, "HIGHWAY")
    // Remove apartment/unit numbers
    .replace(/\bAPT\b.*\d+|\bUNIT\b.*\d+|\bNO\b\.?\s*\d+|\bSUITE\b.*\d+/gi, "")
    .replace(/\b(APARTMENT|SUITE|UNIT|ROOM)\b\s*(\w|\d)+/gi, "")
    // Remove common punctuation and standardize spacing
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
};

// Extract address tokens for partial matching
const getAddressTokens = (address) => {
  if (!address || typeof address !== 'string') return [];
  
  const standardized = standardizeAddress(address);
  
  // Split by spaces and filter out short words and numbers-only tokens
  return standardized
    .split(/\s+/)
    .filter(token => 
      token.length > 3 && // Only tokens with more than 3 characters
      !/^\d+$/.test(token) && // Exclude tokens that are just numbers
      !['STREET', 'AVENUE', 'ROAD', 'BOULEVARD', 'LANE', 'DRIVE', 'THE', 'AND'].includes(token) // Exclude common words
    );
};

export async function checkDuplicates({
  fname,
  lname,
  email,
  cellno,
  contactnos,
  bdate,
  address,
  standardizedAddress,
  addressComponents,
  acode,
  company,
  priorities
}) {
  // Track if we have any significant data to search with
  let hasSearchableData = false;

  // Build a query to find potential duplicates
  const query = { $or: [] };

  // Create a scoring pipeline for prioritizing matches
  const scoringPipeline = [];

  // Last name-based matching (highest priority)
  if (lname && lname.length > 1) {
    // Use exact match first, then partial match
    query.$or.push({ lname: lname });
    query.$or.push({ lname: { $regex: new RegExp(`^${lname}`, "i") } });
    
    scoringPipeline.push({
      $addFields: {
        lnameMatch: {
          $cond: [
            { $eq: ["$lname", lname] },
            20,
            {
              $cond: [
                {
                  $regexMatch: {
                    input: "$lname",
                    regex: new RegExp(`^${lname}`, "i"),
                  },
                },
                15,
                0,
              ],
            },
          ],
        },
      },
    });
    
    hasSearchableData = true;
  }

  // Address matching with standardization
  const clientStandardizedAddress = standardizedAddress || (address ? standardizeAddress(address) : '');
  
  if (clientStandardizedAddress && clientStandardizedAddress.length > 2) {
    try {
      // Instead of using regex for full address, use address components
      if (addressComponents) {
        if (addressComponents.street1 && addressComponents.street1.length > 3) {
          query.$or.push({ address: { $regex: new RegExp(addressComponents.street1, "i") } });
        }
        
        if (addressComponents.city && addressComponents.city.length > 2) {
          const cityNoPrefix = addressComponents.city.replace(/^City of\s+/i, "");
          query.$or.push({ city: cityNoPrefix });
        }
        
        if (addressComponents.province && addressComponents.province.length > 2) {
          query.$or.push({ province: addressComponents.province });
        }
      }

      scoringPipeline.push({
        $addFields: {
          addressMatch: {
            $sum: [
              { 
                $cond: [
                  { $eq: ["$address", clientStandardizedAddress] },
                  15,
                  0
                ]
              },
              {
                $cond: [
                  { $and: [
                    { $ne: ["$city", null] },
                    { $eq: ["$city", addressComponents?.city?.replace(/^City of\s+/i, "")] }
                  ]},
                  8,
                  0
                ]
              },
              {
                $cond: [
                  { $and: [
                    { $ne: ["$province", null] },
                    { $eq: ["$province", addressComponents?.province] }
                  ]},
                  7,
                  0
                ]
              }
            ]
          }
        }
      });
      
      hasSearchableData = true;
    } catch (error) {
      console.error("Error processing address:", error);
    }
  }

  // Email exact matching (high priority)
  if (email && email.includes("@")) {
    query.$or.push({ email: email.toLowerCase() });
    scoringPipeline.push({
      $addFields: {
        emailMatch: {
          $cond: [
            { $eq: ["$email", email.toLowerCase()] },
            15,
            0
          ]
        }
      }
    });
    hasSearchableData = true;
  }

  // Phone number exact matching
  if (cellno && cellno.length > 3) {
    query.$or.push({ cellno: cellno });
    scoringPipeline.push({
      $addFields: {
        cellnoMatch: {
          $cond: [
            { $eq: ["$cellno", cellno] },
            12,
            0
          ]
        }
      }
    });
    hasSearchableData = true;
  }

  // First name matching (lower priority)
  if (fname && fname.length > 1) {
    query.$or.push({ fname: fname });
    query.$or.push({ fname: { $regex: new RegExp(`^${fname}`, "i") } });
    
    scoringPipeline.push({
      $addFields: {
        fnameMatch: {
          $cond: [
            { $eq: ["$fname", fname] },
            10,
            {
              $cond: [
                {
                  $regexMatch: {
                    input: "$fname",
                    regex: new RegExp(`^${fname}`, "i"),
                  },
                },
                8,
                0,
              ],
            },
          ],
        },
      },
    });
    hasSearchableData = true;
  }

  // Company exact matching
  if (company && company.length > 2) {
    query.$or.push({ company: company });
    query.$or.push({ company: { $regex: new RegExp(`^${company}`, "i") } });
    
    scoringPipeline.push({
      $addFields: {
        companyMatch: {
          $cond: [
            { $eq: ["$company", company] },
            10,
            {
              $cond: [
                {
                  $regexMatch: {
                    input: "$company",
                    regex: new RegExp(`^${company}`, "i"),
                  },
                },
                8,
                0,
              ],
            },
          ],
        },
      },
    });
    hasSearchableData = true;
  }

  if (!hasSearchableData) {
    return { matches: [] };
  }

  const pipeline = [
    { $match: query },
    {
      $project: {
        id: 1,
        lname: 1,
        fname: 1,
        mname: 1,
        sname: 1,
        bdate: 1,
        company: 1,
        address: 1,
        street: 1,
        city: 1,
        barangay: 1,
        zipcode: 1,
        area: 1,
        acode: 1,
        contactnos: 1,
        cellno: 1,
        ofcno: 1,
        email: 1,
        province: 1,
      },
    },
    ...scoringPipeline,
    {
      $addFields: {
        totalScore: {
          $sum: [
            { $ifNull: ["$fnameMatch", 0] },
            { $ifNull: ["$lnameMatch", 0] },
            { $ifNull: ["$addressMatch", 0] },
            { $ifNull: ["$emailMatch", 0] },
            { $ifNull: ["$cellnoMatch", 0] },
            { $ifNull: ["$companyMatch", 0] },
          ],
        },
      },
    },
    { $sort: { totalScore: -1 } },
    { $limit: 15 }
  ];

  let clients = [];
  try {
    const options = {
      maxTimeMS: 10000, // Increased timeout to 10 seconds
      allowDiskUse: true,
    };

    clients = await ClientModel.aggregate(pipeline, options);
  } catch (dbError) {
    console.error("Database error during client search:", dbError);
    return {
      matches: [],
      error: "Search operation timed out, please try with more specific criteria.",
    };
  }

  // If we have matches, check which services each client has
  let clientsWithServices = [...clients];

  if (clients.length > 0) {
    try {
      const clientIds = clients
        .map((client) => parseInt(client.id))
        .filter((id) => !isNaN(id));

      if (clientIds.length > 0) {
        // Run service queries in parallel with increased timeouts
        const [wmmClients, hrgClients, fomClients, calClients] = await Promise.all([
          WmmModel.distinct("clientid", { clientid: { $in: clientIds } })
            .maxTimeMS(5000)
            .lean()
            .exec()
            .catch(() => []),
          HrgModel.distinct("clientid", { clientid: { $in: clientIds } })
            .maxTimeMS(5000)
            .lean()
            .exec()
            .catch(() => []),
          FomModel.distinct("clientid", { clientid: { $in: clientIds } })
            .maxTimeMS(5000)
            .lean()
            .exec()
            .catch(() => []),
          CalModel.distinct("clientid", { clientid: { $in: clientIds } })
            .maxTimeMS(5000)
            .lean()
            .exec()
            .catch(() => []),
        ]);

        clientsWithServices = clients.map((client) => {
          const clientId = parseInt(client.id);
          const clientCopy = { ...client, services: [] };

          if (!isNaN(clientId)) {
            if (wmmClients.includes(clientId)) clientCopy.services.push("WMM");
            if (hrgClients.includes(clientId)) clientCopy.services.push("HRG");
            if (fomClients.includes(clientId)) clientCopy.services.push("FOM");
            if (calClients.includes(clientId)) clientCopy.services.push("CAL");
          }

          return clientCopy;
        });
      }
    } catch (serviceError) {
      console.error("Error fetching client services:", serviceError);
    }
  }

  return { matches: clientsWithServices };
} 