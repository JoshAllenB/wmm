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
    query.$or.push({ lname: { $regex: new RegExp(lname, "i") } });
    query.$or.push({ company: { $regex: new RegExp(lname, "i") } });
    
    scoringPipeline.push({
      $addFields: {
        lnameMatch: {
          $cond: [
            {
              $and: [
                { $ne: ["$lname", null] },
                { $ne: ["$lname", undefined] },
                { $eq: [{ $type: "$lname" }, "string"] },
                {
                  $regexMatch: {
                    input: "$lname",
                    regex: new RegExp(`^${lname}$`, "i"),
                  },
                },
              ],
            },
            20,
            {
              $cond: [
                {
                  $and: [
                    { $ne: ["$lname", null] },
                    { $ne: ["$lname", undefined] },
                    { $eq: [{ $type: "$lname" }, "string"] },
                    {
                      $regexMatch: {
                        input: "$lname",
                        regex: new RegExp(lname, "i"),
                      },
                    },
                  ],
                },
                15,
                0,
              ],
            },
          ],
        },
      },
    });
    
    scoringPipeline.push({
      $addFields: {
        lnameInCompanyMatch: {
          $cond: [
            {
              $and: [
                { $ne: ["$company", null] },
                { $ne: ["$company", undefined] },
                { $eq: [{ $type: "$company" }, "string"] },
                {
                  $regexMatch: {
                    input: "$company",
                    regex: new RegExp(lname, "i"),
                  },
                },
              ],
            },
            7,
            0,
          ],
        },
      },
    });
    
    hasSearchableData = true;
  }

  // Address matching with standardization
  const clientStandardizedAddress = standardizedAddress || (address ? standardizeAddress(address) : '');
  const addressTokens = getAddressTokens(address);
  
  if (clientStandardizedAddress && clientStandardizedAddress.length > 2) {
    try {
      query.$or.push({
        address: { $regex: new RegExp(clientStandardizedAddress, "i") }
      });
      
      addressTokens.forEach((token) => {
        if (token && token.length > 3) {
          query.$or.push({
            address: { $regex: new RegExp(token, "i") }
          });
        }
      });

      if (addressComponents) {
        if (addressComponents.street1 && addressComponents.street1.length > 3) {
          query.$or.push({ address: { $regex: new RegExp(addressComponents.street1, "i") } });
        }
        
        if (addressComponents.barangay && addressComponents.barangay.length > 2) {
          query.$or.push({ address: { $regex: new RegExp(addressComponents.barangay, "i") } });
          query.$or.push({ barangay: { $regex: new RegExp(addressComponents.barangay, "i") } });
        }
        
        if (addressComponents.city && addressComponents.city.length > 2) {
          query.$or.push({ address: { $regex: new RegExp(addressComponents.city.replace(/^City of\s+/i, ""), "i") } });
          query.$or.push({ city: { $regex: new RegExp(addressComponents.city.replace(/^City of\s+/i, ""), "i") } });
        }
        
        if (addressComponents.province && addressComponents.province.length > 2) {
          query.$or.push({ address: { $regex: new RegExp(addressComponents.province, "i") } });
          query.$or.push({ province: { $regex: new RegExp(addressComponents.province, "i") } });
        }
      }

      scoringPipeline.push({
        $addFields: {
          addressExactMatch: {
            $cond: [
              {
                $and: [
                  { $ne: ["$address", null] },
                  { $ne: ["$address", ""] },
                  { $eq: [{ $type: "$address" }, "string"] },
                  {
                    $regexMatch: {
                      input: "$address",
                      regex: new RegExp(clientStandardizedAddress, "i"),
                    },
                  },
                ],
              },
              15,
              0,
            ],
          },
        },
      });
      
      if (addressTokens.length > 0) {
        const tokenScoring = addressTokens.map((token, index) => ({
          $cond: [
            {
              $and: [
                { $ne: ["$address", null] },
                { $ne: ["$address", ""] },
                { $eq: [{ $type: "$address" }, "string"] },
                {
                  $regexMatch: {
                    input: "$address",
                    regex: new RegExp(token, "i"),
                  },
                },
              ],
            },
            Math.max(10 - index, 5),
            0,
          ],
        }));
        
        scoringPipeline.push({
          $addFields: {
            addressTokenMatch: { $sum: tokenScoring },
          },
        });
      }
      
      if (addressComponents) {
        const componentScoring = [];
        
        if (addressComponents.street1 && addressComponents.street1.length > 3) {
          componentScoring.push({
            $cond: [
              {
                $and: [
                  { $ne: ["$address", null] },
                  { $ne: ["$address", ""] },
                  { $eq: [{ $type: "$address" }, "string"] },
                  {
                    $regexMatch: {
                      input: "$address",
                      regex: new RegExp(addressComponents.street1, "i"),
                    },
                  },
                ],
              },
              12,
              0,
            ],
          });
        }
        
        if (addressComponents.barangay && addressComponents.barangay.length > 2) {
          componentScoring.push({
            $cond: [
              {
                $or: [
                  {
                    $and: [
                      { $ne: ["$address", null] },
                      { $ne: ["$address", ""] },
                      { $eq: [{ $type: "$address" }, "string"] },
                      {
                        $regexMatch: {
                          input: "$address",
                          regex: new RegExp(addressComponents.barangay, "i"),
                        },
                      },
                    ],
                  },
                  {
                    $and: [
                      { $ne: ["$barangay", null] },
                      { $ne: ["$barangay", ""] },
                      { $eq: [{ $type: "$barangay" }, "string"] },
                      {
                        $regexMatch: {
                          input: "$barangay",
                          regex: new RegExp(addressComponents.barangay, "i"),
                        },
                      },
                    ],
                  },
                ],
              },
              8,
              0,
            ],
          });
        }
        
        if (addressComponents.city && addressComponents.city.length > 2) {
          const cityNoPrefix = addressComponents.city.replace(/^City of\s+/i, "");
          componentScoring.push({
            $cond: [
              {
                $or: [
                  {
                    $and: [
                      { $ne: ["$address", null] },
                      { $ne: ["$address", ""] },
                      { $eq: [{ $type: "$address" }, "string"] },
                      {
                        $regexMatch: {
                          input: "$address",
                          regex: new RegExp(cityNoPrefix, "i"),
                        },
                      },
                    ],
                  },
                  {
                    $and: [
                      { $ne: ["$city", null] },
                      { $ne: ["$city", ""] },
                      { $eq: [{ $type: "$city" }, "string"] },
                      {
                        $regexMatch: {
                          input: "$city",
                          regex: new RegExp(cityNoPrefix, "i"),
                        },
                      },
                    ],
                  },
                ],
              },
              7,
              0,
            ],
          });
        }
        
        if (addressComponents.province && addressComponents.province.length > 2) {
          componentScoring.push({
            $cond: [
              {
                $or: [
                  {
                    $and: [
                      { $ne: ["$address", null] },
                      { $ne: ["$address", ""] },
                      { $eq: [{ $type: "$address" }, "string"] },
                      {
                        $regexMatch: {
                          input: "$address",
                          regex: new RegExp(addressComponents.province, "i"),
                        },
                      },
                    ],
                  },
                  {
                    $and: [
                      { $ne: ["$province", null] },
                      { $ne: ["$province", ""] },
                      { $eq: [{ $type: "$province" }, "string"] },
                      {
                        $regexMatch: {
                          input: "$province",
                          regex: new RegExp(addressComponents.province, "i"),
                        },
                      },
                    ],
                  },
                ],
              },
              6,
              0,
            ],
          });
        }
        
        if (componentScoring.length > 0) {
          scoringPipeline.push({
            $addFields: {
              addressComponentMatch: { $sum: componentScoring },
            },
          });
        }
      }
      
      hasSearchableData = true;
    } catch (error) {
      console.error("Error processing address:", error);
    }
  }

  // First name matching
  if (fname && fname.length > 1) {
    query.$or.push({ fname: { $regex: new RegExp(fname, "i") } });
    query.$or.push({ company: { $regex: new RegExp(fname, "i") } });

    scoringPipeline.push({
      $addFields: {
        fnameMatch: {
          $cond: [
            {
              $and: [
                { $ne: ["$fname", null] },
                { $ne: ["$fname", null] },
                { $eq: [{ $type: "$fname" }, "string"] },
                {
                  $regexMatch: {
                    input: "$fname",
                    regex: new RegExp(fname, "i"),
                  },
                },
              ],
            },
            12,
            0,
          ],
        },
      },
    });
    
    scoringPipeline.push({
      $addFields: {
        fnameInCompanyMatch: {
          $cond: [
            {
              $and: [
                { $ne: ["$company", null] },
                { $ne: ["$company", undefined] },
                { $eq: [{ $type: "$company" }, "string"] },
                {
                  $regexMatch: {
                    input: "$company",
                    regex: new RegExp(fname, "i"),
                  },
                },
              ],
            },
            5,
            0,
          ],
        },
      },
    });
    
    hasSearchableData = true;
  }

  // Company name matching
  if (company && company.length > 2) {
    query.$or.push({ company: { $regex: new RegExp(company, "i") } });
    scoringPipeline.push({
      $addFields: {
        companyMatch: {
          $cond: [
            {
              $and: [
                { $ne: ["$company", null] },
                { $ne: ["$company", undefined] },
                { $eq: [{ $type: "$company" }, "string"] },
                {
                  $regexMatch: {
                    input: "$company",
                    regex: new RegExp(company, "i"),
                  },
                },
              ],
            },
            8,
            0,
          ],
        },
      },
    });
    hasSearchableData = true;
  }

  // Contact-based matching
  if (email && email.includes("@")) {
    query.$or.push({ email: { $regex: new RegExp(email, "i") } });
    scoringPipeline.push({
      $addFields: {
        emailMatch: {
          $cond: [
            {
              $and: [
                { $ne: ["$email", null] },
                { $ne: ["$email", undefined] },
                { $eq: [{ $type: "$email" }, "string"] },
                {
                  $regexMatch: {
                    input: "$email",
                    regex: new RegExp(email, "i"),
                  },
                },
              ],
            },
            8,
            0,
          ],
        },
      },
    });
    hasSearchableData = true;
  }

  if (cellno && cellno.length > 3) {
    query.$or.push({ cellno: { $regex: cellno } });
    scoringPipeline.push({
      $addFields: {
        cellnoMatch: {
          $cond: [
            {
              $and: [
                { $ne: ["$cellno", null] },
                { $ne: ["$cellno", undefined] },
                { $eq: [{ $type: "$cellno" }, "string"] },
                { $regexMatch: { input: "$cellno", regex: cellno } },
              ],
            },
            8,
            0,
          ],
        },
      },
    });
    hasSearchableData = true;
  }

  if (contactnos && contactnos.length > 3) {
    query.$or.push({ contactnos: { $regex: contactnos } });
    scoringPipeline.push({
      $addFields: {
        contactnosMatch: {
          $cond: [
            {
              $and: [
                { $ne: ["$contactnos", null] },
                { $ne: ["$contactnos", undefined] },
                { $eq: [{ $type: "$contactnos" }, "string"] },
                { $regexMatch: { input: "$contactnos", regex: contactnos } },
              ],
            },
            7,
            0,
          ],
        },
      },
    });
    hasSearchableData = true;
  }

  if (bdate) {
    query.$or.push({ bdate: bdate });
    scoringPipeline.push({
      $addFields: {
        bdateMatch: {
          $cond: [
            { $eq: ["$bdate", bdate] },
            7,
            0,
          ],
        },
      },
    });
    hasSearchableData = true;
  }

  if (acode) {
    query.$or.push({ acode: acode });
    scoringPipeline.push({
      $addFields: {
        acodeMatch: {
          $cond: [
            { $eq: ["$acode", acode] },
            12,
            0,
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
  ];

  pipeline.push({
    $addFields: {
      exactMatchCombo: {
        $sum: [
          {
            $cond: [
              {
                $and: [
                  { $ne: ["$lname", null] },
                  { $ne: ["$lname", undefined] },
                  { $eq: [{ $type: "$lname" }, "string"] },
                  { $ne: ["$fname", null] },
                  { $ne: ["$fname", undefined] },
                  { $eq: [{ $type: "$fname" }, "string"] },
                  {
                    $regexMatch: {
                      input: "$lname",
                      regex: new RegExp(`^${lname}$`, "i"),
                    },
                  },
                  {
                    $regexMatch: {
                      input: "$fname",
                      regex: new RegExp(`^${fname}$`, "i"),
                    },
                  },
                ],
              },
              15,
              0,
            ],
          },
          {
            $cond: [
              {
                $and: [
                  { $ne: ["$email", null] },
                  { $ne: ["$email", undefined] },
                  { $eq: [{ $type: "$email" }, "string"] },
                  { $eq: ["$email", email] },
                ],
              },
              10,
              0,
            ],
          },
          {
            $cond: [
              {
                $and: [
                  { $ne: ["$cellno", null] },
                  { $ne: ["$cellno", undefined] },
                  { $eq: [{ $type: "$cellno" }, "string"] },
                  { $eq: ["$cellno", cellno] },
                ],
              },
              8,
              0,
            ],
          },
        ],
      },
    },
  });

  pipeline.push({
    $addFields: {
      totalScore: {
        $sum: [
          { $ifNull: ["$fnameMatch", 0] },
          { $ifNull: ["$lnameMatch", 0] },
          { $ifNull: ["$fnameInCompanyMatch", 0] },
          { $ifNull: ["$lnameInCompanyMatch", 0] },
          { $ifNull: ["$companyMatch", 0] },
          { $ifNull: ["$addressExactMatch", 0] },
          { $ifNull: ["$addressTokenMatch", 0] },
          { $ifNull: ["$addressComponentMatch", 0] },
          { $ifNull: ["$emailMatch", 0] },
          { $ifNull: ["$cellnoMatch", 0] },
          { $ifNull: ["$contactnosMatch", 0] },
          { $ifNull: ["$bdateMatch", 0] },
          { $ifNull: ["$acodeMatch", 0] },
          { $ifNull: ["$exactMatchCombo", 0] },
        ],
      },
    },
  });

  pipeline.push({ $sort: { totalScore: -1 } });
  pipeline.push({ $limit: 15 });

  let clients = [];
  try {
    const options = {
      maxTimeMS: 5000,
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
        const servicePromises = [
          WmmModel.distinct("clientid", { clientid: { $in: clientIds } })
            .maxTimeMS(2000)
            .exec()
            .catch((err) => {
              console.error("Error fetching WMM services:", err);
              return [];
            }),
          HrgModel.distinct("clientid", { clientid: { $in: clientIds } })
            .maxTimeMS(2000)
            .exec()
            .catch((err) => {
              console.error("Error fetching HRG services:", err);
              return [];
            }),
          FomModel.distinct("clientid", { clientid: { $in: clientIds } })
            .maxTimeMS(2000)
            .exec()
            .catch((err) => {
              console.error("Error fetching FOM services:", err);
              return [];
            }),
          CalModel.distinct("clientid", { clientid: { $in: clientIds } })
            .maxTimeMS(2000)
            .exec()
            .catch((err) => {
              console.error("Error fetching CAL services:", err);
              return [];
            }),
        ];

        const serviceResults = await Promise.allSettled(servicePromises);
        const [
          wmmClientsResult,
          hrgClientsResult,
          fomClientsResult,
          calClientsResult,
        ] = serviceResults;

        const wmmClients =
          wmmClientsResult.status === "fulfilled" ? wmmClientsResult.value : [];
        const hrgClients =
          hrgClientsResult.status === "fulfilled" ? hrgClientsResult.value : [];
        const fomClients =
          fomClientsResult.status === "fulfilled" ? fomClientsResult.value : [];
        const calClients =
          calClientsResult.status === "fulfilled" ? calClientsResult.value : [];

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