import ClientModel from "../../models/clients.mjs";
import WmmModel from "../../models/wmm.mjs";
import HrgModel from "../../models/hrg.mjs";
import FomModel from "../../models/fom.mjs";
import CalModel from "../../models/cal.mjs";
import PromoModel from "../../models/promo.mjs";
import ComplimentaryModel from "../../models/complimentary.mjs";

// Address standardization utility function
// Update the standardizeAddress function to better handle Philippine addresses
const standardizeAddress = (address) => {
  if (!address || typeof address !== "string") return "";

  return (
    address
      .toUpperCase()
      // Standardize Philippine-specific terms
      .replace(/\bPRK\b|\bPUROK\b/gi, "PUROK")
      .replace(/\bBRGY\b|\bBGY\b|\bBARANGAY\b/gi, "BARANGAY")
      .replace(/\bSUBD\b|\bSUBDIV\b|\bSUBDIVISION\b/gi, "SUBDIVISION")
      .replace(/\bVLG\b|\bVILL\b|\bVILLAGE\b/gi, "VILLAGE")
      // Remove common punctuation except for slashes in lot/block numbers
      .replace(/[.,#!$%\^&\*;:{}=\-_`~()]/g, " ")
      // Standardize spaces
      .replace(/\s{2,}/g, " ")
      .trim()
  );
};

// Add a function to extract address components
const extractAddressComponents = (address) => {
  if (!address) return {};

  const lines = address
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);
  const components = {
    housestreet: lines[0] || "",
    subdivision: lines[1] || "",
    barangay: lines[2] || "",
  };

  return components;
};

// Extract address tokens for partial matching
const getAddressTokens = (address) => {
  if (!address || typeof address !== "string") return [];

  const standardized = standardizeAddress(address);

  // Split by spaces and filter out short words and numbers-only tokens
  return standardized.split(/\s+/).filter(
    (token) =>
      token.length > 2 && // Keep minimum 2 chars for Ph abbreviations
      !/^\d+$/.test(token) && // Exclude tokens that are just numbers
      ![
        "STREET",
        "AVENUE",
        "ROAD",
        "THE",
        "AND",
        "SUBDIVISION",
        "VILLAGE",
        "BARANGAY",
        "PUROK",
        "PHASE",
        "BLOCK",
        "LOT",
        "BUILDING",
      ].includes(token) // Exclude common Philippine address terms
  );
};

// Helper function to standardize address components
const standardizeAddressComponents = (components) => {
  if (!components) return {};

  // Helper to clean city/municipality names
  const cleanCityName = (city) => {
    if (!city) return "";
    return city
      .toUpperCase()
      .replace(/^(CITY OF|MUNICIPALITY OF)\s+/i, "")
      .trim();
  };

  return {
    housestreet: standardizeAddress(components.housestreet || ""),
    subdivision: standardizeAddress(components.subdivision || ""),
    barangay: standardizeAddress(components.barangay || ""),
    city: cleanCityName(components.city || ""),
    province: standardizeAddress(components.province || ""),
  };
};

export async function checkDuplicates({
  fname,
  lname,
  email,
  cellno,
  contactnos,
  bdate,
  bdateMonth,
  bdateDay,
  bdateYear,
  address,
  standardizedAddress,
  addressComponents,
  acode,
  company,
  priorities,
  searchPrecision,
}) {
  // Track if we have any significant data to search with
  let hasSearchableData = false;

  // Check for the presence of any of the specified fields
  const hasLname = lname && lname.length >= 2;
  const hasFname = fname && fname.length >= 2;
  const hasAddress = address && address.length >= 3;
  const hasHouseStreet =
    addressComponents?.housestreet && addressComponents.housestreet.length >= 2;
  const hasSubdivision =
    addressComponents?.subdivision && addressComponents.subdivision.length >= 2;
  const hasBarangay =
    addressComponents?.barangay && addressComponents.barangay.length >= 2;
  const hasPhone =
    (cellno && cellno.length >= 5) || (contactnos && contactnos.length >= 3);
  const hasBdate =
    (bdate && bdate.length > 0) || (bdateMonth && bdateDay && bdateYear);

  // If none of the specified fields are present, return empty results
  if (
    !hasLname &&
    !hasFname &&
    !hasHouseStreet &&
    !hasSubdivision &&
    !hasBarangay &&
    !hasPhone &&
    !hasBdate
  ) {
    return { matches: [] };
  }

  // Calculate search precision level based on key fields
  const filledFieldsCount = [
    hasLname,
    hasFname,
    hasHouseStreet,
    hasSubdivision,
    hasBarangay,
    hasPhone,
    hasBdate,
  ].filter(Boolean).length;

  // Adjust search strategy based on available data
  const isHighPrecision = filledFieldsCount >= 3;
  const isMediumPrecision = filledFieldsCount >= 2;
  const isLowPrecision = filledFieldsCount >= 1; // Any single field is enough to trigger search

  // Build a query to find potential duplicates
  const query = { $or: [] };

  // Create a scoring pipeline for prioritizing matches
  const scoringPipeline = [];

  // First name matching
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

  // Last name matching
  if (hasLname) {
    query.$or.push({ lname: lname });
    query.$or.push({ lname: { $regex: new RegExp(`^${lname}`, "i") } });

    // Adjust scoring based on precision level
    const lnameExactScore = isHighPrecision ? 25 : isMediumPrecision ? 20 : 15;
    const lnamePartialScore = isHighPrecision
      ? 20
      : isMediumPrecision
      ? 15
      : 10;

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
  const clientStandardizedAddress =
    standardizedAddress || (address ? standardizeAddress(address) : "");
  const standardizedComponents =
    standardizeAddressComponents(addressComponents);

  // Process address components
  try {
    // Match on full standardized address if available
    if (clientStandardizedAddress) {
      query.$or.push({
        address: {
          $regex: new RegExp(
            clientStandardizedAddress.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"),
            "i"
          ),
        },
      });
      hasSearchableData = true;
    }

    // Match on individual components - each can trigger a search independently
    if (standardizedComponents.housestreet) {
      query.$or.push({
        $or: [
          {
            address: {
              $regex: new RegExp(standardizedComponents.housestreet, "i"),
            },
          },
          {
            housestreet: {
              $regex: new RegExp(standardizedComponents.housestreet, "i"),
            },
          },
        ],
      });
      hasSearchableData = true;
    }

    if (standardizedComponents.subdivision) {
      query.$or.push({
        $or: [
          {
            address: {
              $regex: new RegExp(standardizedComponents.subdivision, "i"),
            },
          },
          {
            subdivision: {
              $regex: new RegExp(standardizedComponents.subdivision, "i"),
            },
          },
        ],
      });
      hasSearchableData = true;
    }

    if (standardizedComponents.barangay) {
      query.$or.push({
        $or: [
          {
            address: {
              $regex: new RegExp(standardizedComponents.barangay, "i"),
            },
          },
          {
            barangay: {
              $regex: new RegExp(standardizedComponents.barangay, "i"),
            },
          },
        ],
      });
      hasSearchableData = true;
    }

    if (standardizedComponents.city) {
      query.$or.push({ city: standardizedComponents.city });
      hasSearchableData = true;
    }

    if (standardizedComponents.province) {
      query.$or.push({ province: standardizedComponents.province });
      hasSearchableData = true;
    }

    // Add scoring for address matches with precision-based scoring
    const addressFullScore = isHighPrecision ? 20 : isMediumPrecision ? 15 : 10;
    const addressPartialScore = isHighPrecision
      ? 15
      : isMediumPrecision
      ? 10
      : 8;
    const addressComponentScore = isHighPrecision
      ? 12
      : isMediumPrecision
      ? 8
      : 6;
    const addressCityScore = isHighPrecision ? 10 : isMediumPrecision ? 7 : 5;
    const addressProvinceScore = isHighPrecision
      ? 8
      : isMediumPrecision
      ? 5
      : 3;

    // Only add address scoring if we have any address data
    const hasAddressData =
      clientStandardizedAddress ||
      standardizedComponents.housestreet ||
      standardizedComponents.subdivision ||
      standardizedComponents.barangay ||
      standardizedComponents.city ||
      standardizedComponents.province;

    if (hasAddressData) {
      scoringPipeline.push({
        $addFields: {
          addressMatch: {
            $sum: [
              // Full address match - only if we have a client address
              ...(clientStandardizedAddress
                ? [
                    {
                      $cond: [
                        { $eq: ["$address", clientStandardizedAddress] },
                        addressFullScore,
                        {
                          $cond: [
                            {
                              $and: [
                                { $ne: ["$address", ""] },
                                {
                                  $regexMatch: {
                                    input: "$address",
                                    regex: new RegExp(
                                      clientStandardizedAddress,
                                      "i"
                                    ),
                                  },
                                },
                              ],
                            },
                            addressPartialScore,
                            0,
                          ],
                        },
                      ],
                    },
                  ]
                : []),
              // Component matches - only if we have component data
              ...(standardizedComponents.housestreet
                ? [
                    {
                      $cond: [
                        {
                          $or: [
                            {
                              $eq: [
                                "$housestreet",
                                standardizedComponents.housestreet,
                              ],
                            },
                            {
                              $and: [
                                { $ne: ["$address", ""] },
                                {
                                  $regexMatch: {
                                    input: { $ifNull: ["$address", ""] },
                                    regex: new RegExp(
                                      standardizedComponents.housestreet,
                                      "i"
                                    ),
                                  },
                                },
                              ],
                            },
                          ],
                        },
                        addressComponentScore,
                        0,
                      ],
                    },
                  ]
                : []),
              ...(standardizedComponents.city
                ? [
                    {
                      $cond: [
                        { $eq: ["$city", standardizedComponents.city] },
                        addressCityScore,
                        0,
                      ],
                    },
                  ]
                : []),
              ...(standardizedComponents.province
                ? [
                    {
                      $cond: [
                        { $eq: ["$province", standardizedComponents.province] },
                        addressProvinceScore,
                        0,
                      ],
                    },
                  ]
                : []),
            ],
          },
        },
      });
    } else {
      // If no address data, set addressMatch to 0
      scoringPipeline.push({
        $addFields: {
          addressMatch: 0,
        },
      });
    }

    hasSearchableData = true;
  } catch (error) {
    console.error("Error processing address:", error);
  }

  // Email exact matching (high priority)
  if (email) {
    query.$or.push({ email: email.toLowerCase() });

    // Adjust email scoring based on precision
    const emailScore = isHighPrecision ? 20 : isMediumPrecision ? 15 : 10;

    scoringPipeline.push({
      $addFields: {
        emailMatch: {
          $cond: [{ $eq: ["$email", email.toLowerCase()] }, emailScore, 0],
        },
      },
    });
    hasSearchableData = true;
  }

  // Phone number matching with improved pattern recognition
  const normalizePhoneNumber = (number) => {
    if (!number) return "";
    // Remove all non-digit characters
    return number.replace(/\D/g, "");
  };

  const getLastDigits = (number, length = 4) => {
    const normalized = normalizePhoneNumber(number);
    return normalized.slice(-length);
  };

  // Phone number matching - each number can trigger independently
  if (cellno && cellno.length >= 5) {
    const normalizedCellno = normalizePhoneNumber(cellno);
    const lastFourDigits = getLastDigits(cellno);
    const lastSixDigits = getLastDigits(cellno, 6);

    // Add multiple matching conditions for cell number
    query.$or.push(
      // Exact matches (normalized)
      { cellno: normalizedCellno },
      { contactnos: normalizedCellno },
      // Last 4 digits match
      { cellno: { $regex: lastFourDigits + "$" } },
      { contactnos: { $regex: lastFourDigits + "$" } },
      // Last 6 digits match (if available)
      ...(lastSixDigits.length === 6
        ? [
            { cellno: { $regex: lastSixDigits + "$" } },
            { contactnos: { $regex: lastSixDigits + "$" } },
          ]
        : [])
    );

    // Adjust phone scoring based on precision and match type
    const exactScore = isHighPrecision ? 20 : isMediumPrecision ? 15 : 10;
    const sixDigitScore = isHighPrecision ? 15 : isMediumPrecision ? 10 : 8;
    const fourDigitScore = isHighPrecision ? 10 : isMediumPrecision ? 8 : 5;

    scoringPipeline.push({
      $addFields: {
        cellnoMatch: {
          $cond: [
            // Exact match
            {
              $or: [
                {
                  $eq: [
                    { $ifNull: [{ $toString: "$cellno" }, ""] },
                    normalizedCellno,
                  ],
                },
                {
                  $eq: [
                    { $ifNull: [{ $toString: "$contactnos" }, ""] },
                    normalizedCellno,
                  ],
                },
              ],
            },
            exactScore,
            {
              $cond: [
                // Last 6 digits match
                {
                  $or: [
                    {
                      $regexMatch: {
                        input: { $ifNull: [{ $toString: "$cellno" }, ""] },
                        regex: new RegExp(lastSixDigits + "$"),
                      },
                    },
                    {
                      $regexMatch: {
                        input: { $ifNull: [{ $toString: "$contactnos" }, ""] },
                        regex: new RegExp(lastSixDigits + "$"),
                      },
                    },
                  ],
                },
                sixDigitScore,
                {
                  $cond: [
                    // Last 4 digits match
                    {
                      $or: [
                        {
                          $regexMatch: {
                            input: { $ifNull: [{ $toString: "$cellno" }, ""] },
                            regex: new RegExp(lastFourDigits + "$"),
                          },
                        },
                        {
                          $regexMatch: {
                            input: {
                              $ifNull: [{ $toString: "$contactnos" }, ""],
                            },
                            regex: new RegExp(lastFourDigits + "$"),
                          },
                        },
                      ],
                    },
                    fourDigitScore,
                    0,
                  ],
                },
              ],
            },
          ],
        },
      },
    });
    hasSearchableData = true;
  }

  if (contactnos && contactnos.length >= 5) {
    const normalizedContactnos = normalizePhoneNumber(contactnos);
    const lastFourDigits = getLastDigits(contactnos);
    const lastSixDigits = getLastDigits(contactnos, 6);

    // Add multiple matching conditions for contact number
    query.$or.push(
      // Exact matches (normalized)
      { cellno: normalizedContactnos },
      { contactnos: normalizedContactnos },
      // Last 4 digits match
      { cellno: { $regex: lastFourDigits + "$" } },
      { contactnos: { $regex: lastFourDigits + "$" } },
      // Last 6 digits match (if available)
      ...(lastSixDigits.length === 6
        ? [
            { cellno: { $regex: lastSixDigits + "$" } },
            { contactnos: { $regex: lastSixDigits + "$" } },
          ]
        : [])
    );

    // Adjust phone scoring based on precision and match type
    const exactScore = isHighPrecision ? 20 : isMediumPrecision ? 15 : 10;
    const sixDigitScore = isHighPrecision ? 15 : isMediumPrecision ? 10 : 8;
    const fourDigitScore = isHighPrecision ? 10 : isMediumPrecision ? 8 : 5;

    scoringPipeline.push({
      $addFields: {
        contactnosMatch: {
          $cond: [
            // Exact match
            {
              $or: [
                {
                  $eq: [
                    { $ifNull: [{ $toString: "$cellno" }, ""] },
                    normalizedContactnos,
                  ],
                },
                {
                  $eq: [
                    { $ifNull: [{ $toString: "$contactnos" }, ""] },
                    normalizedContactnos,
                  ],
                },
              ],
            },
            exactScore,
            {
              $cond: [
                // Last 6 digits match
                {
                  $or: [
                    {
                      $regexMatch: {
                        input: { $ifNull: [{ $toString: "$cellno" }, ""] },
                        regex: new RegExp(lastSixDigits + "$"),
                      },
                    },
                    {
                      $regexMatch: {
                        input: { $ifNull: [{ $toString: "$contactnos" }, ""] },
                        regex: new RegExp(lastSixDigits + "$"),
                      },
                    },
                  ],
                },
                sixDigitScore,
                {
                  $cond: [
                    // Last 4 digits match
                    {
                      $or: [
                        {
                          $regexMatch: {
                            input: { $ifNull: [{ $toString: "$cellno" }, ""] },
                            regex: new RegExp(lastFourDigits + "$"),
                          },
                        },
                        {
                          $regexMatch: {
                            input: {
                              $ifNull: [{ $toString: "$contactnos" }, ""],
                            },
                            regex: new RegExp(lastFourDigits + "$"),
                          },
                        },
                      ],
                    },
                    fourDigitScore,
                    0,
                  ],
                },
              ],
            },
          ],
        },
      },
    });
    hasSearchableData = true;
  }

  // Birth date matching
  if (bdate && bdate.length > 0) {
    // If we have a full bdate string, use it directly
    const [year, month, day] = bdate.split("-");
    const monthDay = `${month}-${day}`;

    // Add multiple matching conditions for birthdate
    query.$or.push(
      { bdate: bdate }, // Exact match
      { bdate: { $regex: new RegExp(`-${monthDay}$`) } }, // Match month-day regardless of year
      { bdate: { $regex: new RegExp(`${year}-${month}`) } } // Match year-month
    );

    // Adjust birth date scoring based on precision
    const bdateScore = isHighPrecision ? 20 : isMediumPrecision ? 15 : 10;
    const bdatePartialScore = isHighPrecision ? 12 : isMediumPrecision ? 8 : 5;

    scoringPipeline.push({
      $addFields: {
        bdateMatch: {
          $cond: [
            { $eq: ["$bdate", bdate] }, // Exact match
            bdateScore,
            {
              $cond: [
                {
                  $or: [
                    {
                      $regexMatch: {
                        input: "$bdate",
                        regex: new RegExp(`-${monthDay}$`),
                      },
                    }, // Month-day match
                    {
                      $regexMatch: {
                        input: "$bdate",
                        regex: new RegExp(`${year}-${month}`),
                      },
                    }, // Year-month match
                  ],
                },
                bdatePartialScore,
                0,
              ],
            },
          ],
        },
      },
    });
    hasSearchableData = true;
  } else if (bdateMonth && bdateDay && bdateYear) {
    // If we have all three components (day, month, year), format as YYYY-MM-DD
    const formattedBdate = `${bdateYear}-${bdateMonth.padStart(
      2,
      "0"
    )}-${bdateDay.padStart(2, "0")}`;
    const monthDay = `${bdateMonth.padStart(2, "0")}-${bdateDay.padStart(
      2,
      "0"
    )}`;

    // Add multiple matching conditions
    query.$or.push(
      { bdate: formattedBdate }, // Exact match
      { bdate: { $regex: new RegExp(`-${monthDay}$`) } }, // Match month-day regardless of year
      {
        bdate: {
          $regex: new RegExp(`${bdateYear}-${bdateMonth.padStart(2, "0")}`),
        },
      } // Match year-month
    );

    // Adjust birth date scoring based on precision - higher score for complete date
    const bdateScore = isHighPrecision ? 20 : isMediumPrecision ? 15 : 10;
    const bdatePartialScore = isHighPrecision ? 12 : isMediumPrecision ? 8 : 5;

    scoringPipeline.push({
      $addFields: {
        bdateMatch: {
          $cond: [
            { $eq: ["$bdate", formattedBdate] }, // Exact match
            bdateScore,
            {
              $cond: [
                {
                  $or: [
                    {
                      $regexMatch: {
                        input: "$bdate",
                        regex: new RegExp(`-${monthDay}$`),
                      },
                    }, // Month-day match
                    {
                      $regexMatch: {
                        input: "$bdate",
                        regex: new RegExp(
                          `${bdateYear}-${bdateMonth.padStart(2, "0")}`
                        ),
                      },
                    }, // Year-month match
                  ],
                },
                bdatePartialScore,
                0,
              ],
            },
          ],
        },
      },
    });
    hasSearchableData = true;
  } else if (bdateMonth && bdateDay) {
    // If we have only day and month (no year), search for partial matches
    // This allows finding clients with same birth day and month regardless of year
    const month = bdateMonth.padStart(2, "0");
    const day = bdateDay.padStart(2, "0");
    const monthDay = `${month}-${day}`;

    // Add month-day pattern matching
    query.$or.push(
      { bdate: { $regex: new RegExp(`-${monthDay}$`) } }, // Match month-day at end of date
      { bdate: { $regex: new RegExp(`-${month}-`) } } // Match just the month
    );

    // Lower score for partial date matches (day/month only)
    const bdatePartialScore = isHighPrecision ? 12 : isMediumPrecision ? 8 : 5;
    const monthOnlyScore = isHighPrecision ? 8 : isMediumPrecision ? 5 : 3;

    scoringPipeline.push({
      $addFields: {
        bdateMatch: {
          $cond: [
            {
              $regexMatch: {
                input: "$bdate",
                regex: new RegExp(`-${monthDay}$`),
              },
            }, // Month-day match
            bdatePartialScore,
            {
              $cond: [
                {
                  $regexMatch: {
                    input: "$bdate",
                    regex: new RegExp(`-${month}-`),
                  },
                }, // Month only match
                monthOnlyScore,
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
  if (company) {
    query.$or.push({ company: company });
    query.$or.push({ company: { $regex: new RegExp(`^${company}`, "i") } });

    // Adjust company scoring based on precision
    const companyExactScore = isHighPrecision ? 12 : isMediumPrecision ? 10 : 6;
    const companyPartialScore = isHighPrecision
      ? 10
      : isMediumPrecision
      ? 8
      : 5;

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

  // Ensure we have at least one searchable field to proceed
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
            { $ifNull: ["$contactnosMatch", 0] },
            { $ifNull: ["$bdateMatch", 0] },
            { $ifNull: ["$companyMatch", 0] },
          ],
        },
      },
    },
    { $sort: { totalScore: -1 } },
    { $limit: 15 },
  ];

  let clients = [];
  try {
    const options = {
      maxTimeMS: 10000, // Increased timeout to 10 seconds
      allowDiskUse: true,
    };

    clients = await ClientModel.aggregate(pipeline, options);

    // Debug logging
    console.log("🗄️ Database query results:", {
      totalFound: clients.length,
      sampleResults: clients.slice(0, 3).map((c) => ({
        id: c.id,
        fname: c.fname,
        lname: c.lname,
        totalScore: c.totalScore,
        fnameMatch: c.fnameMatch,
        lnameMatch: c.lnameMatch,
      })),
    });
  } catch (dbError) {
    console.error("Database error during client search:", dbError);
    return {
      matches: [],
      error:
        "Search operation timed out, please try with more specific criteria.",
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
        const [
          wmmClients,
          hrgClients,
          fomClients,
          calClients,
          promoClients,
          complimentaryClients,
        ] = await Promise.all([
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
          ComplimentaryModel.distinct("clientid", {
            clientid: { $in: clientIds },
          })
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
            if (promoClients.includes(clientId))
              clientCopy.services.push("PROMO");
            if (complimentaryClients.includes(clientId))
              clientCopy.services.push("COMP");
          }

          return clientCopy;
        });
      }
    } catch (serviceError) {
      console.error("Error fetching client services:", serviceError);
    }
  }

  // Filter and categorize results for better UX
  const categorizeResults = (clients) => {
    if (clients.length === 0) return { matches: [], categories: {} };

    // Debug logging
    console.log("🔍 Categorizing results:", {
      totalClients: clients.length,
      clientScores: clients.map((c) => ({
        id: c.id,
        fname: c.fname,
        lname: c.lname,
        totalScore: c.totalScore,
      })),
    });

    // Define match quality thresholds
    const HIGH_MATCH_THRESHOLD = 35; // Multiple strong field matches
    const MEDIUM_MATCH_THRESHOLD = 25; // Several field matches
    const LOW_MATCH_THRESHOLD = 5; // Few field matches

    // Categorize clients by match quality
    const highMatches = clients.filter(
      (client) => client.totalScore >= HIGH_MATCH_THRESHOLD
    );
    const mediumMatches = clients.filter(
      (client) =>
        client.totalScore >= MEDIUM_MATCH_THRESHOLD &&
        client.totalScore < HIGH_MATCH_THRESHOLD
    );
    const lowMatches = clients.filter(
      (client) =>
        client.totalScore >= LOW_MATCH_THRESHOLD &&
        client.totalScore < MEDIUM_MATCH_THRESHOLD
    );

    // Determine which results to show based on available data and match quality
    let finalMatches = [];
    let showLowMatches = false;

    // If we have high-quality matches, show only those
    if (highMatches.length > 0) {
      finalMatches = highMatches;
    }
    // If we have medium matches but no high matches, show medium + some low
    else if (mediumMatches.length > 0) {
      finalMatches = [...mediumMatches];
      // Add up to 2 low matches if they exist
      if (lowMatches.length > 0) {
        finalMatches.push(...lowMatches.slice(0, 2));
        showLowMatches = true;
      }
    }
    // If we only have low matches, show them but limit the number
    else if (lowMatches.length > 0) {
      finalMatches = lowMatches.slice(0, 5); // Limit to 5 low-quality matches
      showLowMatches = true;
    }

    // Add metadata about the categorization
    const categories = {
      highMatches: highMatches.length,
      mediumMatches: mediumMatches.length,
      lowMatches: lowMatches.length,
      showLowMatches,
      totalFound: clients.length,
      threshold: {
        high: HIGH_MATCH_THRESHOLD,
        medium: MEDIUM_MATCH_THRESHOLD,
        low: LOW_MATCH_THRESHOLD,
      },
    };

    // Debug logging
    console.log("📊 Categorization results:", {
      highMatches: highMatches.length,
      mediumMatches: mediumMatches.length,
      lowMatches: lowMatches.length,
      finalMatches: finalMatches.length,
      finalMatchScores: finalMatches.map((m) => ({
        id: m.id,
        fname: m.fname,
        lname: m.lname,
        totalScore: m.totalScore,
      })),
    });

    return {
      matches: finalMatches,
      categories,
      // Include all matches for debugging/advanced view if needed
      allMatches: clients,
    };
  };

  const categorizedResults = categorizeResults(clientsWithServices);
  return categorizedResults;
}
