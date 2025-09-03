import WmmModel from "../../../models/wmm.mjs";
import HrgModel from "../../../models/hrg.mjs";
import FomModel from "../../../models/fom.mjs";
import CalModel from "../../../models/cal.mjs";
import ClientModel from "../../../models/clients.mjs";
import PromoModel from "../../../models/promo.mjs";
import ComplimentaryModel from "../../../models/complimentary.mjs";
import { aggregateClientData } from "./dataAggregator.mjs";

export async function calculateStatistics(
  filterQuery,
  pageClientIds = [],
  page = 1,
  limit = 20,
  advancedFilterData = {},
  preFilteredData = null,
  userRoles = []
) {
  try {
    // Ensure pageClientIds is always an array
    const validPageClientIds = Array.isArray(pageClientIds)
      ? pageClientIds
      : [];

    // Determine which calculations to perform based on user roles
    const hasAdminRole = userRoles.includes("Admin") || userRoles.includes("Accounting");
    const hasWmmRole = userRoles.includes("WMM") || hasAdminRole;
    const hasHrgRole = userRoles.includes("HRG") || hasAdminRole;
    const hasFomRole = userRoles.includes("FOM") || hasAdminRole;
    const hasCalRole = userRoles.includes("CAL") || hasAdminRole;
    const hasPromoRole = userRoles.includes("WMM") || hasAdminRole; // Promo is part of WMM
    const hasComplimentaryRole = userRoles.includes("WMM") || hasAdminRole; // Complimentary is part of WMM

    // If no roles provided, assume admin access (fallback for backward compatibility)
    const shouldCalculateAll = userRoles.length === 0 || hasAdminRole;

    // Initialize stats array with structured data
    const stats = {
      clientCount: {
        total: 0, // This will be ALL clients in database
        filtered: 0, // This will be filtered count
        page: 0,
      },
      serviceClientCounts: {
        wmm: {
          total: 0,
          page: 0,
        },
        hrgOnly: {
          total: 0,
          page: 0,
        },
        fomOnly: {
          total: 0,
          page: 0,
        },
        promo: {
          total: 0,
          page: 0,
        },
        complimentary: {
          total: 0,
          page: 0,
        },
      },
      metrics: [
        {
          service: "WMM",
          label: "Copies",
          total: 0,
          page: 0,
          unit: "",
          clientsFound: {
            total: 0,
            page: 0,
          },
        },
        {
          service: "CAL",
          metrics: [
            {
              label: "Quantity",
              total: 0,
              page: 0,
              unit: "",
            },
            {
              label: "Amount",
              total: 0,
              page: 0,
              unit: "Php",
            },
            {
              label: "Payments",
              total: 0,
              page: 0,
              unit: "Php",
              tooltip: "Includes only payments with reference, date and form",
            },
            {
              label: "Balance",
              total: 0,
              page: 0,
              unit: "Php",
              tooltip: "Expected amount minus received payments",
            },
            {
              label: "Non-numeric Payments",
              total: 0,
              page: 0,
              unit: "count",
              tooltip: "Number of records with non-numeric payment amounts",
            },
          ],
          currentCalType: "",
          clientsFound: {
            total: 0,
            page: 0,
          },
        },
        {
          service: "HRG",
          label: "Payment",
          total: 0,
          page: 0,
          unit: "Php",
          tooltip: "Totals from most recent records based on receive date",
          clientsFound: {
            total: 0,
            page: 0,
          },
        },
        {
          service: "FOM",
          label: "Payment",
          total: 0,
          page: 0,
          unit: "Php",
          tooltip: "Totals from most recent records based on receive date",
          clientsFound: {
            total: 0,
            page: 0,
          },
        },
        {
          service: "Promo",
          label: "Copies",
          total: 0,
          page: 0,
          unit: "",
          clientsFound: {
            total: 0,
            page: 0,
          },
        },
        {
          service: "Complimentary",
          label: "Copies",
          total: 0,
          page: 0,
          unit: "",
          clientsFound: {
            total: 0,
            page: 0,
          },
        },
      ],
      dataQuality: {
        hrg: {
          nonNumericPayments: {
            total: 0,
            page: 0,
          },
        },
        fom: {
          nonNumericPayments: {
            total: 0,
            page: 0,
          },
        },
        cal: {
          nonNumericPayments: {
            total: 0,
            page: 0,
          },
        },
      },
    };

    // Get total clients in database (unfiltered)
    const totalClientsInDb = await ClientModel.countDocuments();
    stats.clientCount.total = totalClientsInDb;

    // Get filtered clients count
    const filteredClientsCount = await ClientModel.countDocuments(filterQuery);
    stats.clientCount.filtered = filteredClientsCount;
    stats.clientCount.page = validPageClientIds.length;

    // Get filtered client IDs for service calculations
    const filteredClients = await ClientModel.find(filterQuery)
      .select("id")
      .lean();
    const filteredIds = filteredClients.map((client) => client.id);

    // Ensure we have valid arrays for calculations
    if (!Array.isArray(filteredIds) || filteredIds.length === 0) {
      return stats; // Return empty stats if no filtered IDs
    }

    // If we have pre-filtered data, use it for calculations
    if (preFilteredData && preFilteredData.combinedData) {
      // Check if date filters are applied by looking for filteredRecords
      const hasDateFilters = preFilteredData.combinedData.some((client) => {
        return Object.values(client).some(
          (data) => data && typeof data === "object" && data.filteredRecords
        );
      });

      if (hasDateFilters) {
        // Use pre-filtered data with date filters applied
        // This is more efficient than making additional database queries
        // since the data is already filtered by date in dataAggregator.mjs
        
        // Only calculate WMM stats if user has WMM role
        if (hasWmmRole || shouldCalculateAll) {
          const wmmStats = calculateWmmStatsFromData(
            preFilteredData.combinedData,
            validPageClientIds
          );
          stats.metrics[0].total = wmmStats.totalCopies;
          stats.metrics[0].page = wmmStats.pageSpecificCopies;
          stats.metrics[0].clientsFound.total = wmmStats.totalClients;
          stats.metrics[0].clientsFound.page = wmmStats.pageClients;
          stats.serviceClientCounts.wmm.total = wmmStats.totalClients;
          stats.serviceClientCounts.wmm.page = wmmStats.pageClients;
        }

        // Only calculate CAL stats if user has CAL role
        if (hasCalRole || shouldCalculateAll) {
          const calStats = calculateCalStatsFromData(
            preFilteredData.combinedData,
            validPageClientIds
          );
          stats.metrics[1].currentCalType = calStats.currentCalType;
          stats.metrics[1].metrics[0].total = calStats.totalQty;
          stats.metrics[1].metrics[0].page = calStats.pageSpecificQty;
          stats.metrics[1].metrics[1].total = calStats.totalAmt;
          stats.metrics[1].metrics[1].page = calStats.pageSpecificAmt;
          stats.metrics[1].metrics[2].total = calStats.totalPaymtAmt;
          stats.metrics[1].metrics[2].page = calStats.pageSpecificPaymtAmt;
          stats.metrics[1].metrics[3].total = calStats.totalBalance;
          stats.metrics[1].metrics[3].page = calStats.pageSpecificBalance;
          stats.metrics[1].metrics[4].total = calStats.nonNumericCount;
          stats.metrics[1].metrics[4].page = calStats.pageNonNumericCount;
          stats.metrics[1].clientsFound.total = calStats.totalClients;
          stats.metrics[1].clientsFound.page = calStats.pageClients;
        }

        // Only calculate HRG stats if user has HRG role
        if (hasHrgRole || shouldCalculateAll) {
          const hrgStats = calculateHrgStatsFromData(
            preFilteredData.combinedData,
            validPageClientIds
          );
          stats.metrics[2].total = hrgStats.totalAmt;
          stats.metrics[2].page = hrgStats.pageSpecificAmt;
          stats.metrics[2].clientsFound.total = hrgStats.totalClients;
          stats.metrics[2].clientsFound.page = hrgStats.pageClients;
          stats.serviceClientCounts.hrgOnly.total = hrgStats.totalClients;
          stats.serviceClientCounts.hrgOnly.page = hrgStats.pageClients;
          stats.dataQuality.hrg.nonNumericPayments.total =
            hrgStats.nonNumericCount;
          stats.dataQuality.hrg.nonNumericPayments.page =
            hrgStats.pageNonNumericCount;
        }

        // Only calculate FOM stats if user has FOM role
        if (hasFomRole || shouldCalculateAll) {
          const fomStats = calculateFomStatsFromData(
            preFilteredData.combinedData,
            validPageClientIds
          );
          stats.metrics[3].total = fomStats.totalAmt;
          stats.metrics[3].page = fomStats.pageSpecificAmt;
          stats.metrics[3].clientsFound.total = fomStats.totalClients;
          stats.metrics[3].clientsFound.page = fomStats.pageClients;
          stats.serviceClientCounts.fomOnly.total = fomStats.totalClients;
          stats.serviceClientCounts.fomOnly.page = fomStats.pageClients;
          stats.dataQuality.fom.nonNumericPayments.total =
            fomStats.nonNumericCount;
          stats.dataQuality.fom.nonNumericPayments.page =
            fomStats.pageNonNumericCount;
        }

        // Only calculate Promo stats if user has WMM role (Promo is part of WMM)
        if (hasPromoRole || shouldCalculateAll) {
          const promoStats = calculatePromoStatsFromData(
            preFilteredData.combinedData,
            validPageClientIds
          );
          stats.metrics[4].total = promoStats.totalCopies;
          stats.metrics[4].page = promoStats.pageSpecificCopies;
          stats.metrics[4].clientsFound.total = promoStats.totalClients;
          stats.metrics[4].clientsFound.page = promoStats.pageClients;
          stats.serviceClientCounts.promo.total = promoStats.totalClients;
          stats.serviceClientCounts.promo.page = promoStats.pageClients;
        }

        // Only calculate Complimentary stats if user has WMM role (Complimentary is part of WMM)
        if (hasComplimentaryRole || shouldCalculateAll) {
          const complimentaryStats = calculateComplimentaryStatsFromData(
            preFilteredData.combinedData,
            validPageClientIds
          );
          stats.metrics[5].total = complimentaryStats.totalCopies;
          stats.metrics[5].page = complimentaryStats.pageSpecificCopies;
          stats.metrics[5].clientsFound.total = complimentaryStats.totalClients;
          stats.metrics[5].clientsFound.page = complimentaryStats.pageClients;
          stats.serviceClientCounts.complimentary.total =
            complimentaryStats.totalClients;
          stats.serviceClientCounts.complimentary.page =
            complimentaryStats.pageClients;
        }
      } else {
        // No date filters, use regular database queries
        
        // Only calculate WMM stats if user has WMM role
        if (hasWmmRole || shouldCalculateAll) {
          const wmmStats = await calculateWmmStats(
            filteredIds,
            validPageClientIds
          );
          stats.metrics[0].total = wmmStats.totalCopies;
          stats.metrics[0].page = wmmStats.pageSpecificCopies;
          stats.metrics[0].clientsFound.total = wmmStats.totalClients;
          stats.metrics[0].clientsFound.page = wmmStats.pageClients;
          stats.serviceClientCounts.wmm.total = wmmStats.totalClients;
          stats.serviceClientCounts.wmm.page = wmmStats.pageClients;
        }

        // Only calculate CAL statistics if user has CAL role
        if (hasCalRole || shouldCalculateAll) {
          const calStats = await calculateCalStats(
            filteredIds,
            validPageClientIds
          );
          stats.metrics[1].currentCalType = calStats.currentCalType;
          stats.metrics[1].metrics[0].total = calStats.totalQty;
          stats.metrics[1].metrics[0].page = calStats.pageSpecificQty;
          stats.metrics[1].metrics[1].total = calStats.totalAmt;
          stats.metrics[1].metrics[1].page = calStats.pageSpecificAmt;
          stats.metrics[1].metrics[2].total = calStats.totalPaymtAmt;
          stats.metrics[1].metrics[2].page = calStats.pageSpecificPaymtAmt;
          stats.metrics[1].metrics[3].total = calStats.totalBalance;
          stats.metrics[1].metrics[3].page = calStats.pageSpecificBalance;
          stats.metrics[1].metrics[4].total = calStats.nonNumericCount;
          stats.metrics[1].metrics[4].page = calStats.pageNonNumericCount;
          stats.metrics[1].clientsFound.total = calStats.totalClients;
          stats.metrics[1].clientsFound.page = calStats.pageClients;
        }

        // Only calculate HRG statistics if user has HRG role
        if (hasHrgRole || shouldCalculateAll) {
          const hrgStats = await calculateHrgStats(
            filteredIds,
            validPageClientIds,
            advancedFilterData
          );
          stats.metrics[2].total = hrgStats.totalAmt;
          stats.metrics[2].page = hrgStats.pageSpecificAmt;
          stats.metrics[2].clientsFound.total = hrgStats.totalClients;
          stats.metrics[2].clientsFound.page = hrgStats.pageClients;
          stats.serviceClientCounts.hrgOnly.total = hrgStats.totalClients;
          stats.serviceClientCounts.hrgOnly.page = hrgStats.pageClients;
          stats.dataQuality.hrg.nonNumericPayments.total =
            hrgStats.nonNumericCount;
          stats.dataQuality.hrg.nonNumericPayments.page =
            hrgStats.pageNonNumericCount;
        }

        // Only calculate FOM statistics if user has FOM role
        if (hasFomRole || shouldCalculateAll) {
          const fomStats = await calculateFomStats(
            filteredIds,
            validPageClientIds
          );
          stats.metrics[3].total = fomStats.totalAmt;
          stats.metrics[3].page = fomStats.pageSpecificAmt;
          stats.metrics[3].clientsFound.total = fomStats.totalClients;
          stats.metrics[3].clientsFound.page = fomStats.pageClients;
          stats.serviceClientCounts.fomOnly.total = fomStats.totalClients;
          stats.serviceClientCounts.fomOnly.page = fomStats.pageClients;
          stats.dataQuality.fom.nonNumericPayments.total =
            fomStats.nonNumericCount;
          stats.dataQuality.fom.nonNumericPayments.page =
            fomStats.pageNonNumericCount;
        }

        // Only calculate Promo statistics if user has WMM role (Promo is part of WMM)
        if (hasPromoRole || shouldCalculateAll) {
          const promoStats = await calculatePromoStats(
            filteredIds,
            validPageClientIds
          );
          stats.metrics[4].total = promoStats.totalCopies;
          stats.metrics[4].page = promoStats.pageSpecificCopies;
          stats.metrics[4].clientsFound.total = promoStats.totalClients;
          stats.metrics[4].clientsFound.page = promoStats.pageClients;
          stats.serviceClientCounts.promo.total = promoStats.totalClients;
          stats.serviceClientCounts.promo.page = promoStats.pageClients;
        }

        // Only calculate Complimentary statistics if user has WMM role (Complimentary is part of WMM)
        if (hasComplimentaryRole || shouldCalculateAll) {
          const complimentaryStats = await calculateComplimentaryStats(
            filteredIds,
            validPageClientIds
          );
          stats.metrics[5].total = complimentaryStats.totalCopies;
          stats.metrics[5].page = complimentaryStats.pageSpecificCopies;
          stats.metrics[5].clientsFound.total = complimentaryStats.totalClients;
          stats.metrics[5].clientsFound.page = complimentaryStats.pageClients;
          stats.serviceClientCounts.complimentary.total =
            complimentaryStats.totalClients;
          stats.serviceClientCounts.complimentary.page =
            complimentaryStats.pageClients;
        }
      }
    } else {
      // Fallback to original database queries if no pre-filtered data
      
      // Only calculate WMM stats if user has WMM role
      if (hasWmmRole || shouldCalculateAll) {
        const wmmStats = await calculateWmmStats(filteredIds, validPageClientIds);
        stats.metrics[0].total = wmmStats.totalCopies;
        stats.metrics[0].page = wmmStats.pageSpecificCopies;
        stats.metrics[0].clientsFound.total = wmmStats.totalClients;
        stats.metrics[0].clientsFound.page = wmmStats.pageClients;
        stats.serviceClientCounts.wmm.total = wmmStats.totalClients;
        stats.serviceClientCounts.wmm.page = wmmStats.pageClients;
      }

      // Only calculate CAL statistics if user has CAL role
      if (hasCalRole || shouldCalculateAll) {
        const calStats = await calculateCalStats(filteredIds, validPageClientIds);
        stats.metrics[1].currentCalType = calStats.currentCalType;
        stats.metrics[1].metrics[0].total = calStats.totalQty;
        stats.metrics[1].metrics[0].page = calStats.pageSpecificQty;
        stats.metrics[1].metrics[1].total = calStats.totalAmt;
        stats.metrics[1].metrics[1].page = calStats.pageSpecificAmt;
        stats.metrics[1].metrics[2].total = calStats.totalPaymtAmt;
        stats.metrics[1].metrics[2].page = calStats.pageSpecificPaymtAmt;
        stats.metrics[1].metrics[3].total = calStats.totalBalance;
        stats.metrics[1].metrics[3].page = calStats.pageSpecificBalance;
        stats.metrics[1].metrics[4].total = calStats.nonNumericCount;
        stats.metrics[1].metrics[4].page = calStats.pageNonNumericCount;
        stats.metrics[1].clientsFound.total = calStats.totalClients;
        stats.metrics[1].clientsFound.page = calStats.pageClients;
      }

      // Only calculate HRG statistics if user has HRG role
      if (hasHrgRole || shouldCalculateAll) {
        const hrgStats = await calculateHrgStats(
          filteredIds,
          validPageClientIds,
          advancedFilterData
        );
        stats.metrics[2].total = hrgStats.totalAmt;
        stats.metrics[2].page = hrgStats.pageSpecificAmt;
        stats.metrics[2].clientsFound.total = hrgStats.totalClients;
        stats.metrics[2].clientsFound.page = hrgStats.pageClients;
        stats.serviceClientCounts.hrgOnly.total = hrgStats.totalClients;
        stats.serviceClientCounts.hrgOnly.page = hrgStats.pageClients;
        stats.dataQuality.hrg.nonNumericPayments.total = hrgStats.nonNumericCount;
        stats.dataQuality.hrg.nonNumericPayments.page =
          hrgStats.pageNonNumericCount;
      }

      // Only calculate FOM statistics if user has FOM role
      if (hasFomRole || shouldCalculateAll) {
        const fomStats = await calculateFomStats(filteredIds, validPageClientIds);
        stats.metrics[3].total = fomStats.totalAmt;
        stats.metrics[3].page = fomStats.pageSpecificAmt;
        stats.metrics[3].clientsFound.total = fomStats.totalClients;
        stats.metrics[3].clientsFound.page = fomStats.pageClients;
        stats.serviceClientCounts.fomOnly.total = fomStats.totalClients;
        stats.serviceClientCounts.fomOnly.page = fomStats.pageClients;
        stats.dataQuality.fom.nonNumericPayments.total = fomStats.nonNumericCount;
        stats.dataQuality.fom.nonNumericPayments.page =
          fomStats.pageNonNumericCount;
      }

      // Only calculate Promo statistics if user has WMM role (Promo is part of WMM)
      if (hasPromoRole || shouldCalculateAll) {
        const promoStats = await calculatePromoStats(
          filteredIds,
          validPageClientIds
        );
        stats.metrics[4].total = promoStats.totalCopies;
        stats.metrics[4].page = promoStats.pageSpecificCopies;
        stats.metrics[4].clientsFound.total = promoStats.totalClients;
        stats.metrics[4].clientsFound.page = promoStats.pageClients;
        stats.serviceClientCounts.promo.total = promoStats.totalClients;
        stats.serviceClientCounts.promo.page = promoStats.pageClients;
      }

      // Only calculate Complimentary statistics if user has WMM role (Complimentary is part of WMM)
      if (hasComplimentaryRole || shouldCalculateAll) {
        const complimentaryStats = await calculateComplimentaryStats(
          filteredIds,
          validPageClientIds
        );
        stats.metrics[5].total = complimentaryStats.totalCopies;
        stats.metrics[5].page = complimentaryStats.pageSpecificCopies;
        stats.metrics[5].clientsFound.total = complimentaryStats.totalClients;
        stats.metrics[5].clientsFound.page = complimentaryStats.pageClients;
        stats.serviceClientCounts.complimentary.total =
          complimentaryStats.totalClients;
        stats.serviceClientCounts.complimentary.page =
          complimentaryStats.pageClients;
      }
    }

    return stats;
  } catch (error) {
    console.error("Error calculating statistics:", error);
    throw error;
  }
}

async function calculateWmmStats(allFilteredClientIds, pageClientIds) {
  const pipeline = [
    {
      $match: {
        clientid: { $exists: true },
        copies: { $exists: true },
      },
    },
    {
      $addFields: {
        subsDateObj: {
          $cond: {
            if: {
              $regexMatch: { input: "$subsdate", regex: /^\d{4}-\d{2}-\d{2}$/ },
            },
            then: {
              $dateFromString: {
                dateString: "$subsdate",
                format: "%Y-%m-%d",
                onError: null,
                onNull: null,
              },
            },
            else: {
              $dateFromString: {
                dateString: "$subsdate",
                format: "%m/%d/%Y %H:%M:%S",
                onError: null,
                onNull: null,
              },
            },
          },
        },
        endDateObj: {
          $cond: {
            if: {
              $regexMatch: { input: "$enddate", regex: /^\d{4}-\d{2}-\d{2}$/ },
            },
            then: {
              $dateFromString: {
                dateString: "$enddate",
                format: "%Y-%m-%d",
                onError: null,
                onNull: null,
              },
            },
            else: {
              $dateFromString: {
                dateString: "$enddate",
                format: "%m/%d/%Y %H:%M:%S",
                onError: null,
                onNull: null,
              },
            },
          },
        },
        copiesNum: {
          $convert: {
            input: "$copies",
            to: "int",
            onError: 0,
            onNull: 0,
          },
        },
      },
    },
    {
      $match: {
        copiesNum: { $gt: 0 },
        endDateObj: { $exists: true },
      },
    },
    {
      $sort: {
        clientid: 1,
        subsDateObj: -1, // Sort by the converted date object
      },
    },
    {
      $group: {
        _id: "$clientid",
        recentCopies: { $first: "$copiesNum" }, // Use converted numeric copies
        subsdate: { $first: "$subsdate" },
        enddate: { $first: "$enddate" },
      },
    },
  ];

  // For total copies - use the same pipeline but with filtered client IDs
  const totalPipeline = [
    {
      $match: {
        clientid: { $in: allFilteredClientIds },
      },
    },
    ...pipeline,
    {
      $group: {
        _id: null,
        totalCopies: { $sum: "$recentCopies" }, // Sum the already converted copies
        clientCount: { $sum: 1 }, // Count unique clients
      },
    },
  ];

  // For page-specific calculation - use the same pipeline with page client IDs
  const pagePipeline = [
    {
      $match: {
        clientid: { $in: pageClientIds },
      },
    },
    ...pipeline,
    {
      $group: {
        _id: null,
        totalCopies: { $sum: "$recentCopies" }, // Sum the already converted copies
        clientCount: { $sum: 1 }, // Count unique clients
      },
    },
  ];

  const [totalResult, pageResult] = await Promise.all([
    WmmModel.aggregate(totalPipeline),
    WmmModel.aggregate(pagePipeline),
  ]);

  return {
    totalCopies: totalResult[0]?.totalCopies || 0,
    pageSpecificCopies: pageResult[0]?.totalCopies || 0,
    totalClients: totalResult[0]?.clientCount || 0,
    pageClients: pageResult[0]?.clientCount || 0,
  };
}

async function calculateCalStats(allFilteredClientIds, pageClientIds) {
  // Get current year and next year
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  // Find the most relevant calendar type
  const calTypes = await CalModel.distinct("caltype");
  const validCalTypes = calTypes.filter((t) => t && typeof t === "string");
  const currentCalType =
    validCalTypes.find((t) => t.includes(String(nextYear))) ||
    validCalTypes.find((t) => t.includes(String(currentYear))) ||
    `WALL CALENDAR ${currentYear}`;

  // Base pipeline stages for getting most recent records per client
  const basePipeline = [
    {
      $match: {
        caltype: currentCalType,
        clientid: { $exists: true },
      },
    },
    {
      $addFields: {
        paymtDateObj: {
          $dateFromString: {
            dateString: "$paymtdate",
            format: "%m/%d/%Y %H:%M:%S",
            onError: null,
            onNull: null,
          },
        },
        convertedQty: { $toInt: "$calqty" },
        convertedUnitAmt: {
          $cond: [
            { $eq: [{ $type: "$calamt" }, "string"] },
            {
              $toDouble: {
                $replaceOne: { input: "$calamt", find: ",", replacement: "" },
              },
            },
            { $toDouble: "$calamt" },
          ],
        },
        isNonNumericPayment: {
          $and: [
            { $eq: [{ $type: "$paymtamt" }, "string"] },
            { $ne: ["$paymtamt", "N/A"] },
            {
              $eq: [
                {
                  $type: {
                    $toDouble: {
                      $replaceOne: {
                        input: "$paymtamt",
                        find: ",",
                        replacement: "",
                      },
                    },
                  },
                },
                "double",
              ],
            },
          ],
        },
        convertedPaymtAmt: {
          $cond: [
            { $eq: [{ $type: "$paymtamt" }, "string"] },
            {
              $cond: [
                { $eq: ["$paymtamt", "N/A"] },
                0,
                {
                  $toDouble: {
                    $replaceOne: {
                      input: "$paymtamt",
                      find: ",",
                      replacement: "",
                    },
                  },
                },
              ],
            },
            { $toDouble: "$paymtamt" },
          ],
        },
      },
    },
    {
      $sort: {
        clientid: 1,
        paymtDateObj: -1,
      },
    },
    {
      $group: {
        _id: "$clientid",
        qty: { $first: "$convertedQty" },
        amt: { $first: { $multiply: ["$convertedQty", "$convertedUnitAmt"] } },
        paymtAmt: { $first: "$convertedPaymtAmt" },
      },
    },
  ];

  // For total calulcation (all clients)
  const totalPipeline = [
    {
      $match: {
        caltype: currentCalType,
        clientid: { $in: allFilteredClientIds },
      },
    },
    ...basePipeline,
    {
      $group: {
        _id: null,
        totalQty: {
          $sum: {
            $convert: { input: "$qty", to: "double", onError: 0, onNull: 0 },
          },
        },
        totalAmt: { $sum: "$amt" },
        totalPaymtAmt: { $sum: "$paymtAmt" },
        nonNumericCount: { $sum: { $cond: ["$isNonNumericPayment", 1, 0] } },
        clientCount: { $sum: 1 }, // Count unique clients
      },
    },
  ];

  // For page-specific calculation (filtered Clients)
  const pagePipeline = [
    {
      $match: {
        caltype: currentCalType,
        clientid: { $in: pageClientIds },
      },
    },
    ...basePipeline,
    {
      $group: {
        _id: null,
        totalQty: {
          $sum: {
            $convert: { input: "$qty", to: "double", onError: 0, onNull: 0 },
          },
        },
        totalAmt: { $sum: "$amt" },
        totalPaymtAmt: { $sum: "$paymtAmt" },
        nonNumericCount: { $sum: { $cond: ["$isNonNumericPayment", 1, 0] } },
        clientCount: { $sum: 1 }, // Count unique clients
      },
    },
  ];

  const [totalResult, pageResult] = await Promise.all([
    CalModel.aggregate(totalPipeline),
    CalModel.aggregate(pagePipeline),
  ]);

  const totalStats = totalResult[0] || {
    totalQty: 0,
    totalAmt: 0,
    totalPaymtAmt: 0,
    nonNumericCount: 0,
    clientCount: 0,
  };
  const pageStats = pageResult[0] || {
    totalQty: 0,
    totalAmt: 0,
    totalPaymtAmt: 0,
    nonNumericCount: 0,
    clientCount: 0,
  };

  return {
    currentCalType,
    totalQty: totalStats.totalQty,
    totalAmt: totalStats.totalAmt,
    totalPaymtAmt: totalStats.totalPaymtAmt,
    totalBalance: totalStats.totalAmt - totalStats.totalPaymtAmt,
    pageSpecificQty: pageStats.totalQty,
    pageSpecificAmt: pageStats.totalAmt,
    pageSpecificPaymtAmt: pageStats.totalPaymtAmt,
    pageSpecificBalance: pageStats.totalAmt - pageStats.totalPaymtAmt,
    nonNumericCount: totalStats.nonNumericCount,
    pageNonNumericCount: pageStats.nonNumericCount,
    totalClients: totalStats.clientCount,
    pageClients: pageStats.clientCount,
  };
}

async function calculateHrgStats(
  allFilteredClientIds,
  pageClientIds,
  advancedFilterData = {}
) {
  // Determine which date range to apply (priority: HRG Payment -> HRG Campaign -> Adddate)
  let dateField = "recvdate";
  let fromDate = null;
  let toDate = null;

  if (
    advancedFilterData?.hrgPaymentFromDate ||
    advancedFilterData?.hrgPaymentToDate
  ) {
    dateField = "recvdate";
    fromDate = advancedFilterData.hrgPaymentFromDate || null;
    toDate = advancedFilterData.hrgPaymentToDate || null;
  } else if (
    advancedFilterData?.hrgCampaignFromDate ||
    advancedFilterData?.hrgCampaignToDate
  ) {
    dateField = "campaigndate";
    fromDate = advancedFilterData.hrgCampaignFromDate || null;
    toDate = advancedFilterData.hrgCampaignToDate || null;
  } else if (advancedFilterData?.startDate || advancedFilterData?.endDate) {
    dateField = "adddate";
    fromDate = advancedFilterData.startDate || null;
    toDate = advancedFilterData.endDate || null;
  }

  // Determine date format based on the actual data format, not just the field name
  let dateFormat;
  if (dateField === "adddate") {
    dateFormat = "%Y-%m-%d";
  } else if (dateField === "recvdate" || dateField === "campaigndate") {
    // These fields can have mixed formats, so we'll try both
    dateFormat = "%m/%d/%Y %H:%M:%S";
  } else {
    dateFormat = "%m/%d/%Y %H:%M:%S";
  }

  const dateObjField =
    dateField === "recvdate"
      ? "recvDateObj"
      : dateField === "campaigndate"
      ? "campaignDateObj"
      : "addDateObj";

  const basePipeline = [
    {
      $match: {
        clientid: { $exists: true },
      },
    },
    {
      $addFields: {
        [dateObjField]: {
          $let: {
            vars: {
              // Try multiple date formats for recvdate and campaigndate
              date1: {
                $dateFromString: {
                  dateString: `$${dateField}`,
                  format: "%m/%d/%Y %H:%M:%S",
                  onError: null,
                  onNull: null,
                },
              },
              date2: {
                $dateFromString: {
                  dateString: `$${dateField}`,
                  format: "%Y-%m-%d",
                  onError: null,
                  onNull: null,
                },
              },
            },
            in: {
              $cond: [{ $ne: ["$$date1", null] }, "$$date1", "$$date2"],
            },
          },
        },
        convertedPaymtAmt: {
          $cond: [
            { $eq: [{ $type: "$paymtamt" }, "string"] },
            {
              $cond: [
                { $eq: ["$paymtamt", "N/A"] },
                0,
                {
                  $toDouble: {
                    $replaceOne: {
                      input: "$paymtamt",
                      find: ",",
                      replacement: "",
                    },
                  },
                },
              ],
            },
            { $toDouble: "$paymtamt" },
          ],
        },
      },
    },
    // Only include records where date conversion succeeded
    {
      $match: {
        [dateObjField]: { $ne: null },
      },
    },
    {
      $sort: {
        clientid: 1,
        [dateObjField]: -1,
      },
    },
    {
      $group: {
        _id: "$clientid",
        latestRecord: { $first: "$$ROOT" },
      },
    },
    // Apply date range filter AFTER grouping (so we get most recent per client first)
    ...(fromDate || toDate
      ? [
          {
            $match: {
              [`latestRecord.${dateObjField}`]: {
                ...(fromDate ? { $gte: new Date(fromDate) } : {}),
                ...(toDate
                  ? {
                      $lte: new Date(
                        new Date(toDate).setHours(23, 59, 59, 999)
                      ),
                    }
                  : {}),
              },
            },
          },
        ]
      : []),
  ];

  // For total calculation
  const totalPipeline = [
    {
      $match: {
        clientid: { $in: allFilteredClientIds },
      },
    },
    ...basePipeline,
    {
      $group: {
        _id: null,
        totalAmt: { $sum: "$latestRecord.convertedPaymtAmt" },
        clientCount: {
          $sum: {
            $cond: [
              { $not: [{ $in: ["$latestRecord.unsubscribe", [true, 1]] }] },
              1,
              0,
            ],
          },
        },
      },
    },
  ];

  // For page-specific calculation
  const pagePipeline = [
    {
      $match: {
        clientid: { $in: pageClientIds },
      },
    },
    ...basePipeline,
    {
      $group: {
        _id: null,
        totalAmt: { $sum: "$latestRecord.convertedPaymtAmt" },
        clientCount: {
          $sum: {
            $cond: [
              { $not: [{ $in: ["$latestRecord.unsubscribe", [true, 1]] }] },
              1,
              0,
            ],
          },
        },
      },
    },
  ];

  const [totalResult, pageResult] = await Promise.all([
    HrgModel.aggregate(totalPipeline),
    HrgModel.aggregate(pagePipeline),
  ]);

  return {
    totalAmt: totalResult[0]?.totalAmt || 0,
    pageSpecificAmt: pageResult[0]?.totalAmt || 0,
    totalClients: totalResult[0]?.clientCount || 0,
    pageClients: pageResult[0]?.clientCount || 0,
    nonNumericCount: 0,
    pageNonNumericCount: 0,
  };
}

async function calculateFomStats(allFilteredClientIds, pageClientIds) {
  const basePipeline = [
    {
      $match: {
        clientid: { $exists: true },
      },
    },
    {
      $addFields: {
        paymtDateObj: {
          $dateFromString: {
            dateString: "$recvdate",
            format: "%m/%d/%Y %H:%M:%S",
            onError: null,
            onNull: null,
          },
        },
        isNonNumericPayment: {
          $and: [
            { $eq: [{ $type: "$paymtamt" }, "string"] },
            { $ne: ["$paymtamt", "N/A"] },
            {
              $eq: [
                {
                  $type: {
                    $toDouble: {
                      $replaceOne: {
                        input: "$paymtamt",
                        find: ",",
                        replacement: "",
                      },
                    },
                  },
                },
                "double",
              ],
            },
          ],
        },
        convertedPaymtAmt: {
          $cond: [
            { $eq: [{ $type: "$paymtamt" }, "string"] },
            {
              $cond: [
                { $eq: ["$paymtamt", "N/A"] },
                0,
                {
                  $toDouble: {
                    $replaceOne: {
                      input: "$paymtamt",
                      find: ",",
                      replacement: "",
                    },
                  },
                },
              ],
            },
            { $toDouble: "$paymtamt" },
          ],
        },
      },
    },
    {
      $sort: {
        clientid: 1,
        paymtDateObj: -1,
      },
    },
    {
      $group: {
        _id: "$clientid",
        latestPayment: { $first: "$$ROOT" },
      },
    },
  ];

  // For total calculation
  const totalPipeline = [
    {
      $match: {
        clientid: { $in: allFilteredClientIds },
      },
    },
    ...basePipeline,
    {
      $group: {
        _id: null,
        totalAmt: { $sum: "$latestPayment.convertedPaymtAmt" },
        nonNumericCount: {
          $sum: { $cond: ["$latestPayment.isNonNumericPayment", 1, 0] },
        },
        clientCount: {
          $sum: {
            $cond: [
              { $not: [{ $in: ["$latestPayment.unsubscribe", [true, 1]] }] },
              1,
              0,
            ],
          },
        },
      },
    },
  ];

  // For page-specific calculation
  const pagePipeline = [
    {
      $match: {
        clientid: { $in: pageClientIds },
      },
    },
    ...basePipeline,
    {
      $group: {
        _id: null,
        totalAmt: { $sum: "$latestPayment.convertedPaymtAmt" },
        nonNumericCount: {
          $sum: { $cond: ["$latestPayment.isNonNumericPayment", 1, 0] },
        },
        clientCount: {
          $sum: {
            $cond: [
              { $not: [{ $in: ["$latestPayment.unsubscribe", [true, 1]] }] },
              1,
              0,
            ],
          },
        },
      },
    },
  ];

  const [totalResult, pageResult] = await Promise.all([
    FomModel.aggregate(totalPipeline),
    FomModel.aggregate(pagePipeline),
  ]);

  return {
    totalAmt: totalResult[0]?.totalAmt || 0,
    pageSpecificAmt: pageResult[0]?.totalAmt || 0,
    totalClients: totalResult[0]?.clientCount || 0,
    pageClients: pageResult[0]?.clientCount || 0,
    nonNumericCount: totalResult[0]?.nonNumericCount || 0,
    pageNonNumericCount: pageResult[0]?.nonNumericCount || 0,
  };
}

async function calculatePromoStats(allFilteredClientIds, pageClientIds) {
  const pipeline = [
    {
      $match: {
        clientid: { $exists: true },
        copies: { $exists: true },
      },
    },
    {
      $addFields: {
        subsDateObj: {
          $cond: {
            if: {
              $regexMatch: { input: "$subsdate", regex: /^\d{4}-\d{2}-\d{2}$/ },
            },
            then: {
              $dateFromString: {
                dateString: "$subsdate",
                format: "%Y-%m-%d",
                onError: null,
                onNull: null,
              },
            },
            else: {
              $dateFromString: {
                dateString: "$subsdate",
                format: "%m/%d/%Y %H:%M:%S",
                onError: null,
                onNull: null,
              },
            },
          },
        },
        endDateObj: {
          $cond: {
            if: {
              $regexMatch: { input: "$enddate", regex: /^\d{4}-\d{2}-\d{2}$/ },
            },
            then: {
              $dateFromString: {
                dateString: "$enddate",
                format: "%Y-%m-%d",
                onError: null,
                onNull: null,
              },
            },
            else: {
              $dateFromString: {
                dateString: "$enddate",
                format: "%m/%d/%Y %H:%M:%S",
                onError: null,
                onNull: null,
              },
            },
          },
        },
        copiesNum: {
          $convert: {
            input: "$copies",
            to: "int",
            onError: 0,
            onNull: 0,
          },
        },
      },
    },
    {
      $match: {
        copiesNum: { $gt: 0 },
        $or: [
          { endDateObj: { $exists: true, $ne: null } },
          { subsDateObj: { $exists: true, $ne: null } },
        ],
      },
    },
    {
      $sort: {
        clientid: 1,
        subsDateObj: -1, // Sort by subscription date (newest first)
      },
    },
    {
      $group: {
        _id: "$clientid",
        recentCopies: { $first: "$copiesNum" },
        subsdate: { $first: "$subsdate" },
        enddate: { $first: "$enddate" },
      },
    },
  ];

  const totalPipeline = [
    { $match: { clientid: { $in: allFilteredClientIds } } },
    ...pipeline,
    {
      $group: {
        _id: null,
        totalCopies: { $sum: "$recentCopies" },
        clientCount: { $sum: 1 },
      },
    },
  ];

  const pagePipeline = [
    { $match: { clientid: { $in: pageClientIds } } },
    ...pipeline,
    {
      $group: {
        _id: null,
        totalCopies: { $sum: "$recentCopies" },
        clientCount: { $sum: 1 },
      },
    },
  ];

  const [totalResult, pageResult] = await Promise.all([
    PromoModel.aggregate(totalPipeline),
    PromoModel.aggregate(pagePipeline),
  ]);

  return {
    totalCopies: totalResult[0]?.totalCopies || 0,
    pageSpecificCopies: pageResult[0]?.totalCopies || 0,
    totalClients: totalResult[0]?.clientCount || 0,
    pageClients: pageResult[0]?.clientCount || 0,
  };
}

async function calculateComplimentaryStats(
  allFilteredClientIds,
  pageClientIds
) {
  const pipeline = [
    {
      $match: {
        clientid: { $exists: true },
        copies: { $exists: true },
      },
    },
    {
      $addFields: {
        subsDateObj: {
          $cond: {
            if: {
              $regexMatch: {
                input: "$subsdate",
                regex: /^\\d{4}-\\d{2}-\\d{2}$/,
              },
            },
            then: {
              $dateFromString: {
                dateString: "$subsdate",
                format: "%Y-%m-%d",
                onError: null,
                onNull: null,
              },
            },
            else: {
              $dateFromString: {
                dateString: "$subsdate",
                format: "%m/%d/%Y %H:%M:%S",
                onError: null,
                onNull: null,
              },
            },
          },
        },
        endDateObj: {
          $cond: {
            if: {
              $regexMatch: {
                input: "$enddate",
                regex: /^\\d{4}-\\d{2}-\\d{2}$/,
              },
            },
            then: {
              $dateFromString: {
                dateString: "$enddate",
                format: "%Y-%m-%d",
                onError: null,
                onNull: null,
              },
            },
            else: {
              $dateFromString: {
                dateString: "$enddate",
                format: "%m/%d/%Y %H:%M:%S",
                onError: null,
                onNull: null,
              },
            },
          },
        },
        copiesNum: {
          $convert: {
            input: "$copies",
            to: "int",
            onError: 0,
            onNull: 0,
          },
        },
      },
    },
    {
      $match: {
        copiesNum: { $gt: 0 },
        endDateObj: { $exists: true },
      },
    },
    {
      $sort: {
        clientid: 1,
        subsDateObj: -1,
      },
    },
    {
      $group: {
        _id: "$clientid",
        recentCopies: { $first: "$copiesNum" },
        subsdate: { $first: "$subsdate" },
        enddate: { $first: "$enddate" },
      },
    },
  ];

  const totalPipeline = [
    { $match: { clientid: { $in: allFilteredClientIds } } },
    ...pipeline,
    {
      $group: {
        _id: null,
        totalCopies: { $sum: "$recentCopies" },
        clientCount: { $sum: 1 },
      },
    },
  ];

  const pagePipeline = [
    { $match: { clientid: { $in: pageClientIds } } },
    ...pipeline,
    {
      $group: {
        _id: null,
        totalCopies: { $sum: "$recentCopies" },
        clientCount: { $sum: 1 },
      },
    },
  ];

  const [totalResult, pageResult] = await Promise.all([
    ComplimentaryModel.aggregate(totalPipeline),
    ComplimentaryModel.aggregate(pagePipeline),
  ]);

  return {
    totalCopies: totalResult[0]?.totalCopies || 0,
    pageSpecificCopies: pageResult[0]?.totalCopies || 0,
    totalClients: totalResult[0]?.clientCount || 0,
    pageClients: pageResult[0]?.clientCount || 0,
  };
}

function parseNumeric(value) {
  if (typeof value === "string") {
    return parseFloat(value.replace(/[^\d.-]/g, "")) || 0;
  }
  return typeof value === "number" ? value : 0;
}

// New functions to calculate statistics from pre-filtered data
function calculateWmmStatsFromData(combinedData, pageClientIds) {
  let totalCopies = 0;
  let pageSpecificCopies = 0;
  let totalClients = 0;
  let pageClients = 0;

  combinedData.forEach((client) => {
    // Determine which subscription data to use based on subscriptionType
    let subscriptionData = null;
    if (client.subscriptionType === "Promo") {
      subscriptionData = client.promoData;
    } else if (client.subscriptionType === "Complimentary") {
      subscriptionData = client.compData;
    } else {
      // Default to WMM
      subscriptionData = client.wmmData;
    }

    if (subscriptionData) {
      // Use filtered records if available, otherwise use regular records
      const records =
        subscriptionData.filteredRecords || subscriptionData.records || [];

      if (records.length > 0) {
        // Get the most recent record (first in the array since they're sorted by date)
        const latestRecord = records[0];
        const copies = parseInt(latestRecord.copies) || 0;

        if (copies > 0) {
          totalCopies += copies;
          totalClients++;

          if (pageClientIds.includes(client.id)) {
            pageSpecificCopies += copies;
            pageClients++;
          }
        }
      } else if (subscriptionData.recentCopies) {
        // Fallback to aggregated data if no records available
        const copies = parseInt(subscriptionData.recentCopies) || 0;
        if (copies > 0) {
          totalCopies += copies;
          totalClients++;

          if (pageClientIds.includes(client.id)) {
            pageSpecificCopies += copies;
            pageClients++;
          }
        }
      }
    }
  });

  return {
    totalCopies,
    pageSpecificCopies,
    totalClients,
    pageClients,
  };
}

function calculateCalStatsFromData(combinedData, pageClientIds) {
  let totalQty = 0;
  let totalAmt = 0;
  let totalPaymtAmt = 0;
  let nonNumericCount = 0;
  let totalClients = 0;
  let pageSpecificQty = 0;
  let pageSpecificAmt = 0;
  let pageSpecificPaymtAmt = 0;
  let pageNonNumericCount = 0;
  let pageClients = 0;

  // Get current year for calendar type
  const currentYear = new Date().getFullYear();
  const currentCalType = `WALL CALENDAR ${currentYear}`;

  combinedData.forEach((client) => {
    const calData = client.calData;
    if (calData && calData.records) {
      // Use filtered records if available, otherwise use regular records
      const records = calData.filteredRecords || calData.records;

      if (records.length > 0) {
        // Get the most recent record
        const latestRecord = records[0];
        const qty = parseInt(latestRecord.calqty) || 0;
        const unitAmt = parseNumeric(latestRecord.calunit);
        const amt = qty * unitAmt;

        // Calculate payment amount
        const paymtAmt = parseNumeric(latestRecord.paymtamt);

        // Check for non-numeric payments
        if (
          typeof latestRecord.paymtamt === "string" &&
          latestRecord.paymtamt !== "N/A"
        ) {
          const numericValue = parseFloat(
            latestRecord.paymtamt.replace(/[^\d.-]/g, "")
          );
          if (isNaN(numericValue)) {
            nonNumericCount++;
          }
        }

        totalQty += qty;
        totalAmt += amt;
        totalPaymtAmt += paymtAmt;
        totalClients++;

        if (pageClientIds.includes(client.id)) {
          pageSpecificQty += qty;
          pageSpecificAmt += amt;
          pageSpecificPaymtAmt += paymtAmt;
          pageClients++;

          if (
            typeof latestRecord.paymtamt === "string" &&
            latestRecord.paymtamt !== "N/A"
          ) {
            const numericValue = parseFloat(
              latestRecord.paymtamt.replace(/[^\d.-]/g, "")
            );
            if (isNaN(numericValue)) {
              pageNonNumericCount++;
            }
          }
        }
      }
    }
  });

  return {
    currentCalType,
    totalQty,
    totalAmt,
    totalPaymtAmt,
    totalBalance: totalAmt - totalPaymtAmt,
    pageSpecificQty,
    pageSpecificAmt,
    pageSpecificPaymtAmt,
    pageSpecificBalance: pageSpecificAmt - pageSpecificPaymtAmt,
    nonNumericCount,
    pageNonNumericCount,
    totalClients,
    pageClients,
  };
}

function calculateHrgStatsFromData(combinedData, pageClientIds) {
  let totalAmt = 0;
  let pageSpecificAmt = 0;
  let totalClients = 0;
  let pageClients = 0;
  let nonNumericCount = 0;
  let pageNonNumericCount = 0;

  combinedData.forEach((client) => {
    const hrgData = client.hrgData;
    if (hrgData && hrgData.records) {
      // Use filtered records if available, otherwise use regular records
      const records = hrgData.filteredRecords || hrgData.records;

      if (records.length > 0) {
        // Get the most recent record
        const latestRecord = records[0];
        const paymtAmt = parseNumeric(latestRecord.paymtamt);

        // Check for non-numeric payments
        if (
          typeof latestRecord.paymtamt === "string" &&
          latestRecord.paymtamt !== "N/A"
        ) {
          const numericValue = parseFloat(
            latestRecord.paymtamt.replace(/[^\d.-]/g, "")
          );
          if (isNaN(numericValue)) {
            nonNumericCount++;
          }
        }

        // Only count if not unsubscribed
        if (
          latestRecord.unsubscribe !== 1 &&
          latestRecord.unsubscribe !== true
        ) {
          totalAmt += paymtAmt;
          totalClients++;

          if (pageClientIds.includes(client.id)) {
            pageSpecificAmt += paymtAmt;
            pageClients++;

            if (
              typeof latestRecord.paymtamt === "string" &&
              latestRecord.paymtamt !== "N/A"
            ) {
              const numericValue = parseFloat(
                latestRecord.paymtamt.replace(/[^\d.-]/g, "")
              );
              if (isNaN(numericValue)) {
                pageNonNumericCount++;
              }
            }
          }
        }
      }
    }
  });

  return {
    totalAmt,
    pageSpecificAmt,
    totalClients,
    pageClients,
    nonNumericCount,
    pageNonNumericCount,
  };
}

function calculateFomStatsFromData(combinedData, pageClientIds) {
  let totalAmt = 0;
  let pageSpecificAmt = 0;
  let totalClients = 0;
  let pageClients = 0;
  let nonNumericCount = 0;
  let pageNonNumericCount = 0;

  combinedData.forEach((client) => {
    const fomData = client.fomData;
    if (fomData && fomData.records) {
      // Use filtered records if available, otherwise use regular records
      const records = fomData.filteredRecords || fomData.records;

      if (records.length > 0) {
        // Get the most recent record
        const latestRecord = records[0];
        const paymtAmt = parseNumeric(latestRecord.paymtamt);

        // Check for non-numeric payments
        if (
          typeof latestRecord.paymtamt === "string" &&
          latestRecord.paymtamt !== "N/A"
        ) {
          const numericValue = parseFloat(
            latestRecord.paymtamt.replace(/[^\d.-]/g, "")
          );
          if (isNaN(numericValue)) {
            nonNumericCount++;
          }
        }

        // Always include amount; member count only if not unsubscribed
        totalAmt += paymtAmt;
        if (
          latestRecord.unsubscribe !== true &&
          latestRecord.unsubscribe !== 1
        ) {
          totalClients++;
        }

        if (pageClientIds.includes(client.id)) {
          pageSpecificAmt += paymtAmt;
          if (
            latestRecord.unsubscribe !== true &&
            latestRecord.unsubscribe !== 1
          ) {
            pageClients++;
          }

          if (
            typeof latestRecord.paymtamt === "string" &&
            latestRecord.paymtamt !== "N/A"
          ) {
            const numericValue = parseFloat(
              latestRecord.paymtamt.replace(/[^\d.-]/g, "")
            );
            if (isNaN(numericValue)) {
              pageNonNumericCount++;
            }
          }
        }
      }
    }
  });

  return {
    totalAmt,
    pageSpecificAmt,
    totalClients,
    pageClients,
    nonNumericCount,
    pageNonNumericCount,
  };
}

function calculatePromoStatsFromData(combinedData, pageClientIds) {
  let totalCopies = 0;
  let pageSpecificCopies = 0;
  let totalClients = 0;
  let pageClients = 0;

  combinedData.forEach((client) => {
    const promoData = client.promoData;
    if (promoData) {
      // Use filtered records if available, otherwise use regular records
      const records = promoData.filteredRecords || promoData.records || [];

      if (records.length > 0) {
        // Get the most recent record (first in the array since they're sorted by date)
        const latestRecord = records[0];
        const copies = parseInt(latestRecord.copies) || 0;

        if (copies > 0) {
          totalCopies += copies;
          totalClients++;

          if (pageClientIds.includes(client.id)) {
            pageSpecificCopies += copies;
            pageClients++;
          }
        }
      } else if (promoData.recentCopies) {
        // Fallback to aggregated data if no records available
        const copies = parseInt(promoData.recentCopies) || 0;
        if (copies > 0) {
          totalCopies += copies;
          totalClients++;

          if (pageClientIds.includes(client.id)) {
            pageSpecificCopies += copies;
            pageClients++;
          }
        }
      }
    }
  });

  return {
    totalCopies,
    pageSpecificCopies,
    totalClients,
    pageClients,
  };
}

function calculateComplimentaryStatsFromData(combinedData, pageClientIds) {
  let totalCopies = 0;
  let pageSpecificCopies = 0;
  let totalClients = 0;
  let pageClients = 0;

  combinedData.forEach((client) => {
    const compData = client.compData;
    if (compData) {
      // Use filtered records if available, otherwise use regular records
      const records = compData.filteredRecords || compData.records || [];

      if (records.length > 0) {
        // Get the most recent record (first in the array since they're sorted by date)
        const latestRecord = records[0];
        const copies = parseInt(latestRecord.copies) || 0;

        if (copies > 0) {
          totalCopies += copies;
          totalClients++;

          if (pageClientIds.includes(client.id)) {
            pageSpecificCopies += copies;
            pageClients++;
          }
        }
      } else if (compData.recentCopies) {
        // Fallback to aggregated data if no records available
        const copies = parseInt(compData.recentCopies) || 0;
        if (copies > 0) {
          totalCopies += copies;
          totalClients++;

          if (pageClientIds.includes(client.id)) {
            pageSpecificCopies += copies;
            pageClients++;
          }
        }
      }
    }
  });

  return {
    totalCopies,
    pageSpecificCopies,
    totalClients,
    pageClients,
  };
}
