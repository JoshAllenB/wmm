import WmmModel from '../../../models/wmm.mjs';
import HrgModel from '../../../models/hrg.mjs';
import FomModel from '../../../models/fom.mjs';
import CalModel from '../../../models/cal.mjs';
import ClientModel from '../../../models/clients.mjs';
import { aggregateClientData } from './dataAggregator.mjs';

export async function calculateStatistics(filterQuery, pageClientIds = [], page = 1, limit = 20) {
  try {
    // Ensure pageClientIds is always an array
    const validPageClientIds = Array.isArray(pageClientIds) ? pageClientIds : [];
    
    // Initialize stats array with structured data
    const stats = {
      clientCount: {
        total: 0,  // This will be ALL clients in database
        filtered: 0,  // This will be filtered count
        page: 0
      },
      serviceClientCounts: {
        wmm: {
          total: 0,
          page: 0
        },
        hrgOnly: {
          total: 0,
          page: 0
        },
        fomOnly: {
          total: 0,
          page: 0
        }
      },
      metrics: [
        {
          service: 'WMM',
          label: 'Copies',
          total: 0,
          page: 0,
          unit: '',
          clientsFound: {
            total: 0,
            page: 0
          }
        },
        {
          service: 'CAL',
          metrics: [
            {
              label: 'Quantity',
              total: 0,
              page: 0,
              unit: ''
            },
            {
              label: 'Amount',
              total: 0,
              page: 0,
              unit: 'Php'
            },
            {
              label: 'Payments',
              total: 0,
              page: 0,
              unit: 'Php',
              tooltip: 'Includes only payments with reference, date and form'
            },
            {
              label: 'Balance',
              total: 0,
              page: 0,
              unit: 'Php',
              tooltip: 'Expected amount minus received payments'
            },
            {
              label: 'Non-numeric Payments',
              total: 0,
              page: 0,
              unit: 'count',
              tooltip: 'Number of records with non-numeric payment amounts'
            }
          ],
          currentCalType: '',
          clientsFound: {
            total: 0,
            page: 0
          }
        },
        {
          service: 'HRG',
          label: 'Payment',
          total: 0,
          page: 0,
          unit: 'Php',
          tooltip: 'Totals from most recent records based on receive date',
          clientsFound: {
            total: 0,
            page: 0
          }
        },
        {
          service: 'FOM',
          label: 'Payment',
          total: 0,
          page: 0,
          unit: 'Php',
          tooltip: 'Totals from most recent records based on receive date',
          clientsFound: {
            total: 0,
            page: 0
          }
        }
      ],
      dataQuality: {
        hrg: {
          nonNumericPayments: {
            total: 0,
            page: 0
          }
        },
        fom: {
          nonNumericPayments: {
            total: 0,
            page: 0
          }
        },
        cal: {
          nonNumericPayments: {
            total: 0,
            page: 0
          }
        }
      }
    };

    // Get total clients in database (unfiltered)
    const totalClientsInDb = await ClientModel.countDocuments();
    stats.clientCount.total = totalClientsInDb;

    // Get filtered clients count
    const filteredClientsCount = await ClientModel.countDocuments(filterQuery);
    stats.clientCount.filtered = filteredClientsCount;
    stats.clientCount.page = validPageClientIds.length;

    // Get filtered client IDs for service calculations
    const filteredClients = await ClientModel.find(filterQuery).select('id').lean();
    const filteredIds = filteredClients.map(client => client.id);

    // Ensure we have valid arrays for calculations
    if (!Array.isArray(filteredIds) || filteredIds.length === 0) {
      return stats; // Return empty stats if no filtered IDs
    }

    // Calculate service-specific statistics using filtered client IDs
    const wmmStats = await calculateWmmStats(filteredIds, validPageClientIds);
    stats.metrics[0].total = wmmStats.totalCopies;
    stats.metrics[0].page = wmmStats.pageSpecificCopies;
    stats.metrics[0].clientsFound.total = wmmStats.totalClients;
    stats.metrics[0].clientsFound.page = wmmStats.pageClients;
    stats.serviceClientCounts.wmm.total = wmmStats.totalClients;
    stats.serviceClientCounts.wmm.page = wmmStats.pageClients;

    // Calculate CAL statistics with current year focus
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

    // Calculate HRG statistics
    const hrgStats = await calculateHrgStats(filteredIds, validPageClientIds);
    stats.metrics[2].total = hrgStats.totalAmt;
    stats.metrics[2].page = hrgStats.pageSpecificAmt;
    stats.metrics[2].clientsFound.total = hrgStats.totalClients;
    stats.metrics[2].clientsFound.page = hrgStats.pageClients;
    stats.serviceClientCounts.hrgOnly.total = hrgStats.totalClients;
    stats.serviceClientCounts.hrgOnly.page = hrgStats.pageClients;
    stats.dataQuality.hrg.nonNumericPayments.total = hrgStats.nonNumericCount;
    stats.dataQuality.hrg.nonNumericPayments.page = hrgStats.pageNonNumericCount;

    // Calculate FOM statistics
    const fomStats = await calculateFomStats(filteredIds, validPageClientIds);
    stats.metrics[3].total = fomStats.totalAmt;
    stats.metrics[3].page = fomStats.pageSpecificAmt;
    stats.metrics[3].clientsFound.total = fomStats.totalClients;
    stats.metrics[3].clientsFound.page = fomStats.pageClients;
    stats.serviceClientCounts.fomOnly.total = fomStats.totalClients;
    stats.serviceClientCounts.fomOnly.page = fomStats.pageClients;
    stats.dataQuality.fom.nonNumericPayments.total = fomStats.nonNumericCount;
    stats.dataQuality.fom.nonNumericPayments.page = fomStats.pageNonNumericCount;

    return stats;
  } catch (error) {
    console.error('Error calculating statistics:', error);
    throw error;
  }
}

async function calculateWmmStats(allFilteredClientIds, pageClientIds) {
  const pipeline = [
    {
      $match: {
        clientid: { $exists: true },
        copies: { $exists: true }
      }
    },
    {
      $addFields: {
        subsDateObj: {
          $cond: {
            if: { $regexMatch: { input: "$subsdate", regex: /^\d{4}-\d{2}-\d{2}$/ } },
            then: { $dateFromString: { dateString: "$subsdate", format: "%Y-%m-%d", onError: null, onNull: null } },
            else: { $dateFromString: { dateString: "$subsdate", format: "%m/%d/%Y %H:%M:%S", onError: null, onNull: null } }
          }
        },
        endDateObj: {
          $cond: {
            if: { $regexMatch: { input: "$enddate", regex: /^\d{4}-\d{2}-\d{2}$/ } },
            then: { $dateFromString: { dateString: "$enddate", format: "%Y-%m-%d", onError: null, onNull: null } },
            else: { $dateFromString: { dateString: "$enddate", format: "%m/%d/%Y %H:%M:%S", onError: null, onNull: null } }
          }
        },
        copiesNum: { 
          $convert: {
            input: "$copies",
            to: "int",
            onError: 0,
            onNull: 0
          }
        }
      }
    },
    {
      $match: {
        copiesNum: { $gt: 0 },
        endDateObj: { $exists: true }
      }
    },
    {
      $sort: { 
        clientid: 1, 
        subsDateObj: -1  // Sort by the converted date object
      }
    },
    {
      $group: {
        _id: "$clientid",
        recentCopies: { $first: "$copiesNum" },  // Use converted numeric copies
        subsdate: { $first: "$subsdate" },
        enddate: { $first: "$enddate" }
      }
    }
  ];

  // For total copies - use the same pipeline but with filtered client IDs
  const totalPipeline = [
    {
      $match: {
        clientid: { $in: allFilteredClientIds }
      }
    },
    ...pipeline,
    {
      $group: {
        _id: null,
        totalCopies: { $sum: "$recentCopies" },  // Sum the already converted copies
        clientCount: { $sum: 1 }  // Count unique clients
      }
    }
  ];

  // For page-specific calculation - use the same pipeline with page client IDs
  const pagePipeline = [
    {
      $match: {
        clientid: { $in: pageClientIds }
      }
    },
    ...pipeline,
    {
      $group: {
        _id: null,
        totalCopies: { $sum: "$recentCopies" },  // Sum the already converted copies
        clientCount: { $sum: 1 }  // Count unique clients
      }
    }
  ];

  const [totalResult, pageResult] = await Promise.all([
    WmmModel.aggregate(totalPipeline),
    WmmModel.aggregate(pagePipeline)
  ]);

  return {
    totalCopies: totalResult[0]?.totalCopies || 0,
    pageSpecificCopies: pageResult[0]?.totalCopies || 0,
    totalClients: totalResult[0]?.clientCount || 0,
    pageClients: pageResult[0]?.clientCount || 0
  };
}

async function calculateCalStats(allFilteredClientIds, pageClientIds) {
  // Get current year and next year
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  
  // Find the most relevant calendar type
  const calTypes = await CalModel.distinct('caltype');
  const validCalTypes = calTypes.filter(t => t && typeof t === 'string');
  const currentCalType = validCalTypes.find(t => t.includes(String(nextYear))) || 
                        validCalTypes.find(t => t.includes(String(currentYear))) || 
                        `WALL CALENDAR ${currentYear}`;

  // Base pipeline stages for getting most recent records per client
  const basePipeline = [
    {
      $match: {
        caltype: currentCalType,
        clientid: { $exists: true }
      }
    },
    {
      $addFields: {
        paymtDateObj: {
          $dateFromString: {
            dateString: "$paymtdate",
            format: "%m/%d/%Y %H:%M:%S",
            onError: null,
            onNull: null
          }
        },
        convertedQty: { $toInt: "$calqty" },
        convertedUnitAmt: {
          $cond: [
            { $eq: [{ $type: "$calamt" }, "string"] },
            { $toDouble: { $replaceOne: { input: "$calamt", find: ",", replacement: "" } } },
            { $toDouble: "$calamt" }
          ]
        },
        isNonNumericPayment: {
          $and: [
            { $eq: [{ $type: "$paymtamt" }, "string"] },
            { $ne: ["$paymtamt", "N/A"] },
            { $eq: [{ $type: { $toDouble: { $replaceOne: { input: "$paymtamt", find: ",", replacement: "" } } } }, "double"] }
          ]
        },
        convertedPaymtAmt: {
          $cond: [
            { $and: [
              "$paymtref",
              "$paymtdate",
              "$paymtform",
              { $gt: ["$paymtamt", 0] }
            ]},
            { $cond: [
              { $eq: [{ $type: "$paymtamt" }, "string"] },
              { $cond: [
                { $eq: ["$paymtamt", "N/A"] },
                0,
                { $toDouble: { $replaceOne: { input: "$paymtamt", find: ",", replacement: "" } } }
              ]},
              { $toDouble: "$paymtamt" }
            ]},
            0
          ]
        }
      }
    },
    {
      $sort: {
        clientid: 1,
        paymtDateObj: -1
      }
    },
    {
      $group: {
        _id: "$clientid",
        qty: { $first: "$convertedQty" },
        amt: { $first: { $multiply: ["$convertedQty", "$convertedUnitAmt"] } },
        paymtAmt: { $first: "$convertedPaymtAmt" }
      }
    }
  ];
  
  // For total calulcation (all clients)
  const totalPipeline = [
    {
      $match: {
        caltype: currentCalType,
        clientid: { $in: allFilteredClientIds }
      }
    },
    ...basePipeline,
    {
      $group: {
        _id: null,
        totalQty: { $sum: { $convert: { input: "$qty", to: "double", onError: 0, onNull: 0 } } },
        totalAmt: { $sum: "$amt" },
        totalPaymtAmt: { $sum: "$paymtAmt" },
        nonNumericCount: { $sum: { $cond: ["$isNonNumericPayment", 1, 0] } },
        clientCount: { $sum: 1 }  // Count unique clients
      }
    }
  ];

  // For page-specific calculation (filtered Clients)
  const pagePipeline = [
    {
      $match: {
        caltype: currentCalType,
        clientid: { $in: pageClientIds }
      }
    },
    ...basePipeline,
    {
      $group: {
        _id: null,
        totalQty: { $sum: { $convert: { input: "$qty", to: "double", onError: 0, onNull: 0 } } },
        totalAmt: { $sum: "$amt" },
        totalPaymtAmt: { $sum: "$paymtAmt" },
        nonNumericCount: { $sum: { $cond: ["$isNonNumericPayment", 1, 0] } },
        clientCount: { $sum: 1 }  // Count unique clients
      }
    }
  ];

  const [totalResult, pageResult] = await Promise.all([
    CalModel.aggregate(totalPipeline),
    CalModel.aggregate(pagePipeline)
  ]);

  const totalStats = totalResult[0] || {totalQty: 0, totalAmt: 0, totalPaymtAmt: 0, nonNumericCount: 0, clientCount: 0};
  const pageStats = pageResult[0] || {totalQty: 0, totalAmt: 0, totalPaymtAmt: 0, nonNumericCount: 0, clientCount: 0};

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
    pageClients: pageStats.clientCount
  };
}

async function calculateHrgStats(allFilteredClientIds, pageClientIds) {
  const basePipeline = [
    {
      $match: {
        paymtamt: { $gt: 0 },
        clientid: { $exists: true }
      }
    },
    {
      $addFields: {
        paymtDateObj: {
          $dateFromString: {
            dateString: "$recvdate",
            format: "%m/%d/%Y %H:%M:%S",
            onError: null,
            onNull: null
          }
        },
        isNonNumericPayment: {
          $and: [
            { $eq: [{ $type: "$paymtamt" }, "string"] },
            { $ne: ["$paymtamt", "N/A"] },
            { $eq: [{ $type: { $toDouble: { $replaceOne: { input: "$paymtamt", find: ",", replacement: "" } } } }, "double"] }
          ]
        },
        convertedPaymtAmt: {
          $cond: [
            { $eq: [{ $type: "$paymtamt" }, "string"] },
            { $cond: [
              { $eq: ["$paymtamt", "N/A"] },
              0,
              { $toDouble: { $replaceOne: { input: "$paymtamt", find: ",", replacement: "" } } }
            ]},
            { $toDouble: "$paymtamt" }
          ]
        }
      }
    },
    {
      $sort: {
        clientid: 1,
        paymtDateObj: -1
      }
    },
    {
      $group: {
        _id: "$clientid",
        latestPayment: { $first: "$$ROOT" }
      }
    }
  ];

  // For total calculation
  const totalPipeline = [
    {
      $match: {
        clientid: { $in: allFilteredClientIds }
      }
    },
    ...basePipeline,
    {
      $group: {
        _id: null,
        totalAmt: { $sum: "$latestPayment.convertedPaymtAmt" },
        nonNumericCount: { $sum: { $cond: ["$latestPayment.isNonNumericPayment", 1, 0] } },
        clientCount: { $sum: 1 }  // Count unique clients
      }
    }
  ];

  // For page-specific calculation
  const pagePipeline = [
    {
      $match: {
        clientid: { $in: pageClientIds }
      }
    },
    ...basePipeline,
    {
      $group: {
        _id: null,
        totalAmt: { $sum: "$latestPayment.convertedPaymtAmt" },
        nonNumericCount: { $sum: { $cond: ["$latestPayment.isNonNumericPayment", 1, 0] } },
        clientCount: { $sum: 1 }  // Count unique clients
      }
    }
  ];

  const [totalResult, pageResult] = await Promise.all([
    HrgModel.aggregate(totalPipeline),
    HrgModel.aggregate(pagePipeline)
  ]);

  return {
    totalAmt: totalResult[0]?.totalAmt || 0,
    pageSpecificAmt: pageResult[0]?.totalAmt || 0,
    totalClients: totalResult[0]?.clientCount || 0,
    pageClients: pageResult[0]?.clientCount || 0,
    nonNumericCount: totalResult[0]?.nonNumericCount || 0,
    pageNonNumericCount: pageResult[0]?.nonNumericCount || 0
  };
}

async function calculateFomStats(allFilteredClientIds, pageClientIds) {
  const basePipeline = [
    {
      $match: {
        paymtamt: { $gt: 0 },
        clientid: { $exists: true }
      }
    },
    {
      $addFields: {
        paymtDateObj: {
          $dateFromString: {
            dateString: "$recvdate",
            format: "%m/%d/%Y %H:%M:%S",
            onError: null,
            onNull: null
          }
        },
        isNonNumericPayment: {
          $and: [
            { $eq: [{ $type: "$paymtamt" }, "string"] },
            { $ne: ["$paymtamt", "N/A"] },
            { $eq: [{ $type: { $toDouble: { $replaceOne: { input: "$paymtamt", find: ",", replacement: "" } } } }, "double"] }
          ]
        },
        convertedPaymtAmt: {
          $cond: [
            { $eq: [{ $type: "$paymtamt" }, "string"] },
            { $cond: [
              { $eq: ["$paymtamt", "N/A"] },
              0,
              { $toDouble: { $replaceOne: { input: "$paymtamt", find: ",", replacement: "" } } }
            ]},
            { $toDouble: "$paymtamt" }
          ]
        }
      }
    },
    {
      $sort: {
        clientid: 1,
        paymtDateObj: -1
      }
    },
    {
      $group: {
        _id: "$clientid",
        latestPayment: { $first: "$$ROOT" }
      }
    }
  ];

  // For total calculation
  const totalPipeline = [
    {
      $match: {
        clientid: { $in: allFilteredClientIds }
      }
    },
    ...basePipeline,
    {
      $group: {
        _id: null,
        totalAmt: { $sum: "$latestPayment.convertedPaymtAmt" },
        nonNumericCount: { $sum: { $cond: ["$latestPayment.isNonNumericPayment", 1, 0] } },
        clientCount: { $sum: 1 }  // Count unique clients
      }
    }
  ];

  // For page-specific calculation
  const pagePipeline = [
    {
      $match: {
        clientid: { $in: pageClientIds }
      }
    },
    ...basePipeline,
    {
      $group: {
        _id: null,
        totalAmt: { $sum: "$latestPayment.convertedPaymtAmt" },
        nonNumericCount: { $sum: { $cond: ["$latestPayment.isNonNumericPayment", 1, 0] } },
        clientCount: { $sum: 1 }  // Count unique clients
      }
    }
  ];

  const [totalResult, pageResult] = await Promise.all([
    FomModel.aggregate(totalPipeline),
    FomModel.aggregate(pagePipeline)
  ]);

  return {
    totalAmt: totalResult[0]?.totalAmt || 0,
    pageSpecificAmt: pageResult[0]?.totalAmt || 0,
    totalClients: totalResult[0]?.clientCount || 0,
    pageClients: pageResult[0]?.clientCount || 0,
    nonNumericCount: totalResult[0]?.nonNumericCount || 0,
    pageNonNumericCount: pageResult[0]?.nonNumericCount || 0
  };
}

function parseNumeric(value) {
  if (typeof value === 'string') {
    return parseFloat(value.replace(/[^\d.-]/g, '')) || 0;
  }
  return typeof value === 'number' ? value : 0;
} 