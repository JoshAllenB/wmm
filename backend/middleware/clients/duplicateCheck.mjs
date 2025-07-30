import ClientModel from "../../models/clients.mjs";
import WmmModel from "../../models/wmm.mjs";
import HrgModel from "../../models/hrg.mjs";
import FomModel from "../../models/fom.mjs";
import CalModel from "../../models/cal.mjs";
import PromoModel from "../../models/promo.mjs";
import ComplimentaryModel from "../../models/complimentary.mjs";

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
  priorities,
  searchPrecision
}) {
  // Track if we have any significant data to search with
  let hasSearchableData = false;
  
  // Determine search strategy based on available data
  const hasLname = lname && lname.length >= 2;
  const hasFname = fname && fname.length >= 2;
  const hasAddress = address && address.length >= 3;
  const hasEmail = email && email.includes("@");
  const hasPhone = (cellno && cellno.length >= 5) || (contactnos && contactnos.length >= 5);
  const hasCompany = company && company.length >= 2;
  const hasBdate = bdate && bdate.length > 0;
  const hasAcode = acode && acode.length >= 3;
  
  // Calculate search precision level
  const filledFieldsCount = [hasLname, hasFname, hasAddress, hasEmail, hasPhone, hasCompany, hasBdate, hasAcode]
    .filter(Boolean).length;
  
  // Adjust search strategy based on available data
  const isHighPrecision = filledFieldsCount >= 3;
  const isMediumPrecision = filledFieldsCount >= 2;
  const isLowPrecision = hasLname; // At minimum, we need lname

  // Build a query to find potential duplicates
  const query = { $or: [] };

  // Create a scoring pipeline for prioritizing matches
  const scoringPipeline = [];

  // Last name-based matching (highest priority) - always required
  if (hasLname) {
    // Use exact match first, then partial match
    query.$or.push({ lname: lname });
    query.$or.push({ lname: { $regex: new RegExp(`^${lname}`, "i") } });
    
    // Adjust scoring based on precision level
    const lnameExactScore = isHighPrecision ? 25 : isMediumPrecision ? 20 : 15;
    const lnamePartialScore = isHighPrecision ? 20 : isMediumPrecision ? 15 : 10;
    
    scoringPipeline.push({
      $addFields: {
        lnameMatch: {
          $cond: [
            { $eq: ["$lname", lname] },
            lnameExactScore,
            {
              $cond: [
                {
                  $regexMatch: {
                    input: "$lname",
                    regex: new RegExp(`^${lname}`, "i"),
                  },
                },
                lnamePartialScore,
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
  
  if (hasAddress && (clientStandardizedAddress || Object.values(standardizedComponents).some(v => v))) {
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

      // Add scoring for address matches with precision-based scoring
      const addressFullScore = isHighPrecision ? 20 : isMediumPrecision ? 15 : 10;
      const addressPartialScore = isHighPrecision ? 15 : isMediumPrecision ? 10 : 8;
      const addressComponentScore = isHighPrecision ? 12 : isMediumPrecision ? 8 : 6;
      const addressCityScore = isHighPrecision ? 10 : isMediumPrecision ? 7 : 5;
      const addressProvinceScore = isHighPrecision ? 8 : isMediumPrecision ? 5 : 3;
      
      scoringPipeline.push({
        $addFields: {
          addressMatch: {
            $sum: [
              // Full address match
              { 
                $cond: [
                  { $eq: ["$address", clientStandardizedAddress] },
                  addressFullScore,
                  { 
                    $cond: [
                      { 
                        $regexMatch: {
                          input: "$address",
                          regex: new RegExp(clientStandardizedAddress, "i")
                        }
                      },
                      addressPartialScore,
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
                  addressComponentScore,
                  0
                ]
              },
              {
                $cond: [
                  { $eq: ["$city", standardizedComponents.city] },
                  addressCityScore,
                  0
                ]
              },
              {
                $cond: [
                  { $eq: ["$province", standardizedComponents.province] },
                  addressProvinceScore,
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
  if (hasEmail) {
    query.$or.push({ email: email.toLowerCase() });
    
    // Adjust email scoring based on precision
    const emailScore = isHighPrecision ? 20 : isMediumPrecision ? 15 : 10;
    
    scoringPipeline.push({
      $addFields: {
        emailMatch: {
          $cond: [
            { $eq: ["$email", email.toLowerCase()] },
            emailScore,
            0
          ]
        }
      }
    });
    hasSearchableData = true;
  }

  // Phone number exact matching
  if (hasPhone) {
    const phoneNumber = cellno || contactnos;
    query.$or.push({ cellno: phoneNumber });
    query.$or.push({ contactnos: phoneNumber });
    
    // Adjust phone scoring based on precision
    const phoneScore = isHighPrecision ? 18 : isMediumPrecision ? 12 : 8;
    
    scoringPipeline.push({
      $addFields: {
        cellnoMatch: {
          $cond: [
            { $or: [
              { $eq: ["$cellno", phoneNumber] },
              { $eq: ["$contactnos", phoneNumber] }
            ]},
            phoneScore,
            0
          ]
        }
      }
    });
    hasSearchableData = true;
  }

  // First name matching (lower priority)
  if (hasFname) {
    query.$or.push({ fname: fname });
    query.$or.push({ fname: { $regex: new RegExp(`^${fname}`, "i") } });
    
    // Adjust first name scoring based on precision
    const fnameExactScore = isHighPrecision ? 15 : isMediumPrecision ? 10 : 8;
    const fnamePartialScore = isHighPrecision ? 12 : isMediumPrecision ? 8 : 6;
    
    scoringPipeline.push({
      $addFields: {
        fnameMatch: {
          $cond: [
            { $eq: ["$fname", fname] },
            fnameExactScore,
            {
              $cond: [
                {
                  $regexMatch: {
                    input: "$fname",
                    regex: new RegExp(`^${fname}`, "i"),
                  },
                },
                fnamePartialScore,
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
  if (hasCompany) {
    query.$or.push({ company: company });
    query.$or.push({ company: { $regex: new RegExp(`^${company}`, "i") } });
    
    // Adjust company scoring based on precision
    const companyExactScore = isHighPrecision ? 12 : isMediumPrecision ? 10 : 6;
    const companyPartialScore = isHighPrecision ? 10 : isMediumPrecision ? 8 : 5;
    
    scoringPipeline.push({
      $addFields: {
        companyMatch: {
          $cond: [
            { $eq: ["$company", company] },
            companyExactScore,
            {
              $cond: [
                {
                  $regexMatch: {
                    input: "$company",
                    regex: new RegExp(`^${company}`, "i"),
                  },
                },
                companyPartialScore,
                0,
              ],
            },
          ],
        },
      },
    });
    hasSearchableData = true;
  }

  // Ensure we have at least lname to proceed
  if (!hasLname || query.$or.length === 0) {
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
        const [wmmClients, hrgClients, fomClients, calClients, promoClients, complimentaryClients] = await Promise.all([
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
          PromoModel.distinct("clientid", { clientid: { $in: clientIds } })
            .maxTimeMS(5000)
            .lean()
            .exec()
            .catch(() => []),
          ComplimentaryModel.distinct("clientid", { clientid: { $in: clientIds } })
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
            if (promoClients.includes(clientId)) clientCopy.services.push("PROMO");
            if (complimentaryClients.includes(clientId)) clientCopy.services.push("COMP");
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