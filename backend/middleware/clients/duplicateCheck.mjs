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
    // Standardize Philippine-specific terms
    .replace(/\bPRK\b|\bPUROK\b/gi, "PUROK")
    .replace(/\bBRGY\b|\bBGY\b|\bBARANGAY\b/gi, "BARANGAY")
    .replace(/\bSUBD\b|\bSUBDIV\b|\bSUBDIVISION\b/gi, "SUBDIVISION")
    .replace(/\bVLG\b|\bVILL\b|\bVILLAGE\b/gi, "VILLAGE")
    .replace(/\bPHASE\b|\bPHASE\b/gi, "PHASE")
    .replace(/\bBLK\b|\bBLOCK\b/gi, "BLOCK")
    .replace(/\bLOT\b/gi, "LOT")
    // Standardize common Philippine street terms
    .replace(/\bST\b|\bSTREET\b/gi, "STREET")
    .replace(/\bAVE\b|\bAVENUE\b/gi, "AVENUE")
    .replace(/\bRD\b|\bROAD\b/gi, "ROAD")
    // Standardize city/municipality
    .replace(/\bCITY OF\b/gi, "")
    .replace(/\bMUN\b|\bMUNICIPALITY OF\b/gi, "")
    // Handle common Philippine address prefixes
    .replace(/\bNO\.\s*/gi, "")  // Remove "NO." prefix from house numbers
    .replace(/\bUNIT\s*\d+/gi, "") // Remove unit numbers
    .replace(/\bBLDG\b|\bBUILDING\b/gi, "BUILDING")
    // Remove common punctuation except for slashes in lot/block numbers
    .replace(/[.,#!$%\^&\*;:{}=\-_`~()]/g, " ")
    // Standardize spaces
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
      token.length > 2 && // Keep minimum 2 chars for Ph abbreviations
      !/^\d+$/.test(token) && // Exclude tokens that are just numbers
      !['STREET', 'AVENUE', 'ROAD', 'THE', 'AND', 
        'SUBDIVISION', 'VILLAGE', 'BARANGAY', 'PUROK', 'PHASE', 'BLOCK', 'LOT',
        'BUILDING'].includes(token) // Exclude common Philippine address terms
    );
};

// Helper function to standardize address components
const standardizeAddressComponents = (components) => {
  if (!components) return {};
  
  // Helper to clean city/municipality names
  const cleanCityName = (city) => {
    if (!city) return '';
    return city
      .toUpperCase()
      .replace(/^(CITY OF|MUNICIPALITY OF)\s+/i, '')
      .trim();
  };
  
  return {
    housestreet: standardizeAddress(components.housestreet || ''),
    subdivision: standardizeAddress(components.subdivision || ''),
    barangay: standardizeAddress(components.barangay || ''),
    city: cleanCityName(components.city || ''),
    province: standardizeAddress(components.province || '')
  };
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

  // Address matching with standardization and components
  const clientStandardizedAddress = standardizedAddress || (address ? standardizeAddress(address) : '');
  const standardizedComponents = standardizeAddressComponents(addressComponents);
  
  if (clientStandardizedAddress || Object.values(standardizedComponents).some(v => v)) {
    try {
      // Match on full standardized address if available
      if (clientStandardizedAddress) {
        query.$or.push({ 
          address: { 
            $regex: new RegExp(clientStandardizedAddress.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), "i") 
          } 
        });
      }

      // Match on individual components
      if (standardizedComponents.housestreet) {
        query.$or.push({ 
          $or: [
            { address: { $regex: new RegExp(standardizedComponents.housestreet, "i") } },
            { housestreet: { $regex: new RegExp(standardizedComponents.housestreet, "i") } }
          ]
        });
      }
      
      if (standardizedComponents.subdivision) {
        query.$or.push({ 
          $or: [
            { address: { $regex: new RegExp(standardizedComponents.subdivision, "i") } },
            { subdivision: { $regex: new RegExp(standardizedComponents.subdivision, "i") } }
          ]
        });
      }
      
      if (standardizedComponents.barangay) {
        query.$or.push({ 
          $or: [
            { address: { $regex: new RegExp(standardizedComponents.barangay, "i") } },
            { barangay: { $regex: new RegExp(standardizedComponents.barangay, "i") } }
          ]
        });
      }

      if (standardizedComponents.city) {
        query.$or.push({ city: standardizedComponents.city });
      }

      if (standardizedComponents.province) {
        query.$or.push({ province: standardizedComponents.province });
      }

      // Add scoring for address matches
      scoringPipeline.push({
        $addFields: {
          addressMatch: {
            $sum: [
              // Full address match
              { 
                $cond: [
                  { $eq: ["$address", clientStandardizedAddress] },
                  15,
                  { 
                    $cond: [
                      { 
                        $regexMatch: {
                          input: "$address",
                          regex: new RegExp(clientStandardizedAddress, "i")
                        }
                      },
                      10,
                      0
                    ]
                  }
                ]
              },
              // Component matches
              {
                $cond: [
                  { 
                    $or: [
                      { $eq: ["$housestreet", standardizedComponents.housestreet] },
                      { 
                        $regexMatch: {
                          input: { $ifNull: ["$address", ""] },
                          regex: new RegExp(standardizedComponents.housestreet, "i")
                        }
                      }
                    ]
                  },
                  8,
                  0
                ]
              },
              {
                $cond: [
                  { $eq: ["$city", standardizedComponents.city] },
                  7,
                  0
                ]
              },
              {
                $cond: [
                  { $eq: ["$province", standardizedComponents.province] },
                  5,
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

  if (!hasSearchableData || query.$or.length === 0) {
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
        housestreet: 1,
        subdivision: 1,
        barangay: 1,
        street: 1,
        city: 1,
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