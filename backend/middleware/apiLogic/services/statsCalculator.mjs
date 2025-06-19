import WmmModel from '../../../models/wmm.mjs';
import HrgModel from '../../../models/hrg.mjs';
import FomModel from '../../../models/fom.mjs';
import CalModel from '../../../models/cal.mjs';
import ClientModel from '../../../models/clients.mjs';
import { aggregateClientData } from './dataAggregator.mjs';

export async function calculateStatistics(filterQuery = {}, page = 1, limit = 20, filteredClientIds = []) {
  try {
    // Initialize stats array with structured data
    const stats = {
      clientCount: {
        total: 0,
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
          unit: ''
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
          currentCalType: ''
        },
        {
          service: 'HRG',
          label: 'Payment',
          total: 0,
          page: 0,
          unit: 'Php',
          tooltip: 'Totals from most recent records based on receive date'
        },
        {
          service: 'FOM',
          label: 'Payment',
          total: 0,
          page: 0,
          unit: 'Php',
          tooltip: 'Totals from most recent records based on receive date'
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

    // Get total client count for filtered clients
    const totalFilteredClients = await ClientModel.find(filterQuery).countDocuments();
    stats.clientCount.total = totalFilteredClients;

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Get filtered clients for the current page only
    const pageClients = await ClientModel.find(filterQuery)
      .sort({ id: 1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();
    
    // Set page-specific client count
    stats.clientCount.page = pageClients.length;

    // Get all filtered client IDs
    const allFilteredClients = await ClientModel.find(filterQuery)
      .select('id')
      .lean()
      .exec();
    
    const allFilteredClientIds = allFilteredClients.map(client => client.id);
    const pageClientIds = pageClients.map(client => client.id);

    // Aggregate data for all filtered clients
    const { combinedData: allCombinedData } = await aggregateClientData(
      allFilteredClients,
      ['WMMModel', 'HRGModel', 'FOMModel', 'CALModel']
    );

    // Aggregate data for page clients
    const { combinedData: pageCombinedData } = await aggregateClientData(
      pageClients,
      ['WMMModel', 'HRGModel', 'FOMModel', 'CALModel']
    );

    // Function to count services based on aggregated data
    const countServices = (clients) => {
      const counts = {
        wmm: 0,
        hrg: 0,
        fom: 0
      };

      clients.forEach(client => {
        // Check if client has active records for each service
        const hasWMM = client.wmmData?.records?.length > 0;
        const hasHRG = client.hrgData?.records?.length > 0;
        const hasFOM = client.fomData?.records?.length > 0;

        // Simple counting - if they have the service, count them
        if (hasWMM) counts.wmm++;
        if (hasHRG) counts.hrg++;
        if (hasFOM) counts.fom++;
      });

      return counts;
    };

    // Calculate total service counts
    const totalCounts = countServices(allCombinedData);
    stats.serviceClientCounts.wmm.total = totalCounts.wmm;
    stats.serviceClientCounts.hrgOnly.total = totalCounts.hrg;
    stats.serviceClientCounts.fomOnly.total = totalCounts.fom;

    // Calculate page-specific service counts
    const pageCounts = countServices(pageCombinedData);
    stats.serviceClientCounts.wmm.page = pageCounts.wmm;
    stats.serviceClientCounts.hrgOnly.page = pageCounts.hrg;
    stats.serviceClientCounts.fomOnly.page = pageCounts.fom;

    // Calculate service-specific statistics using filtered client IDs
    const wmmStats = await calculateWmmStats(allFilteredClientIds, pageClientIds);
    stats.metrics[0].total = wmmStats.totalCopies;
    stats.metrics[0].page = wmmStats.pageSpecificCopies;

    // Calculate CAL statistics with current year focus
    const calStats = await calculateCalStats(allFilteredClientIds, pageClientIds);
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

    // Calculate HRG statistics
    const hrgStats = await calculateHrgStats(allFilteredClientIds, pageClientIds);
    stats.metrics[2].total = hrgStats.totalAmt;
    stats.metrics[2].page = hrgStats.pageSpecificAmt;
    stats.dataQuality.hrg.nonNumericPayments.total = hrgStats.nonNumericCount;
    stats.dataQuality.hrg.nonNumericPayments.page = hrgStats.pageNonNumericCount;

    // Calculate FOM statistics
    const fomStats = await calculateFomStats(allFilteredClientIds, pageClientIds);
    stats.metrics[3].total = fomStats.totalAmt;
    stats.metrics[3].page = fomStats.pageSpecificAmt;
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
        clientid: { $exists: true }
      }
    },
    {
      $addFields: {
        subsDateObj: {
          $dateFromString: {
            dateString: "$subsdate",
            format: "%m/%d/%Y %H:%M:%S",
            onError: null,
            onNull: null
          }
        }
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
        recentCopies: { $first: "$copies" },
        subsdate: { $first: "$subsdate" },
        enddate: { $first: "$enddate" },
        allRecords: { 
          $push: { 
            copies: "$copies",
            subsdate: "$subsdate",
            enddate: "$enddate"
          }
        }
      }
    },
    {
      $project: {
        _id: 1,
        recentCopies: 1,
        subsdate: 1,
        enddate: 1,
        allRecords: 1,
        clientId: "$_id"
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
        totalCopies: {
          $sum: {
            $convert: {
              input: "$recentCopies",
              to: "double",
              onError: 0,
              onNull: 0
            }
          }
        },
        details: { 
          $push: { 
            clientId: "$clientId", 
            copies: "$recentCopies",
            subsdate: "$subsdate",
            enddate: "$enddate",
            allRecords: "$allRecords"
          }
        }
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
        totalCopies: {
          $sum: {
            $convert: {
              input: "$recentCopies",
              to: "double",
              onError: 0,
              onNull: 0
            }
          }
        },
        details: { 
          $push: { 
            clientId: "$clientId", 
            copies: "$recentCopies",
            subsdate: "$subsdate",
            enddate: "$enddate",
            allRecords: "$allRecords"
          }
        }
      }
    }
  ];

  const [totalResult, pageResult] = await Promise.all([
    WmmModel.aggregate(totalPipeline),
    WmmModel.aggregate(pagePipeline)
  ]);

  return {
    totalCopies: totalResult[0]?.totalCopies || 0,
    pageSpecificCopies: pageResult[0]?.totalCopies || 0
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
        nonNumericCount: { $sum: { $cond: ["$isNonNumericPayment", 1, 0] } }
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
        nonNumericCount: { $sum: { $cond: ["$isNonNumericPayment", 1, 0] } }
      }
    }
  ];

  const [totalResult, pageResult] = await Promise.all([
    CalModel.aggregate(totalPipeline),
    CalModel.aggregate(pagePipeline)
  ]);

  const totalStats = totalResult[0] || {totalQty: 0, totalAmt: 0, totalPaymtAmt: 0, nonNumericCount: 0};
  const pageStats = pageResult[0] || {totalQty: 0, totalAmt: 0, totalPaymtAmt: 0, nonNumericCount: 0};

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
    pageNonNumericCount: pageStats.nonNumericCount
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
    },
    {
      $project: {
        _id: 0,
        clientid: "$_id",
        paymtAmt: "$latestPayment.convertedPaymtAmt"
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
        totalAmt: { $sum: "$paymtAmt" },
        clientCount: { $sum: 1 },
        nonNumericCount: { $sum: { $cond: ["$isNonNumericPayment", 1, 0] } }
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
        totalAmt: { $sum: "$paymtAmt" },
        clientCount: { $sum: 1 },
        nonNumericCount: { $sum: { $cond: ["$isNonNumericPayment", 1, 0] } }
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
    },
    {
      $project: {
        _id: 0,
        clientid: "$_id",
        paymtAmt: "$latestPayment.convertedPaymtAmt"
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
        totalAmt: { $sum: "$paymtAmt" },
        clientCount: { $sum: 1 },
        nonNumericCount: { $sum: { $cond: ["$isNonNumericPayment", 1, 0] } }
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
        totalAmt: { $sum: "$paymtAmt" },
        clientCount: { $sum: 1 },
        nonNumericCount: { $sum: { $cond: ["$isNonNumericPayment", 1, 0] } }
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