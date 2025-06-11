import WmmModel from '../../../models/wmm.mjs';
import HrgModel from '../../../models/hrg.mjs';
import FomModel from '../../../models/fom.mjs';
import CalModel from '../../../models/cal.mjs';
import ClientModel from '../../../models/clients.mjs';
import { aggregateClientData } from './dataAggregator.mjs';

export async function calculateStatistics(filterQuery = {}, page = 1, limit = 20) {
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
      ]
    };

    // Get total client count without any filters
    stats.clientCount.total = await ClientModel.countDocuments({});

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

    // Get all clients that match the filter for total counts
    const allClients = await ClientModel.find(filterQuery)
      .lean()
      .exec();

    // Aggregate data for all filtered clients
    const { combinedData: allCombinedData } = await aggregateClientData(
      allClients,
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

    // Convert client IDs to numbers for other calculations
    const pageClientIds = pageClients.map(client => Number(client.id));

    // Calculate WMM statistics
    const wmmStats = await calculateWmmStats(pageClientIds);
    stats.metrics[0].total = wmmStats.totalCopies;
    stats.metrics[0].page = wmmStats.pageSpecificCopies;

    // Calculate CAL statistics with current year focus
    const calStats = await calculateCalStats(pageClientIds);
    stats.metrics[1].currentCalType = calStats.currentCalType;
    stats.metrics[1].metrics[0].total = calStats.totalQty;
    stats.metrics[1].metrics[0].page = calStats.pageSpecificQty;
    stats.metrics[1].metrics[1].total = calStats.totalAmt;
    stats.metrics[1].metrics[1].page = calStats.pageSpecificAmt;
    stats.metrics[1].metrics[2].total = calStats.totalPaymtAmt;
    stats.metrics[1].metrics[2].page = calStats.pageSpecificPaymtAmt;
    stats.metrics[1].metrics[3].total = calStats.totalBalance;
    stats.metrics[1].metrics[3].page = calStats.pageSpecificBalance;

    // Calculate HRG statistics
    const hrgStats = await calculateHrgStats(pageClientIds);
    stats.metrics[2].total = hrgStats.totalAmt;
    stats.metrics[2].page = hrgStats.pageSpecificAmt;

    // Calculate FOM statistics
    const fomStats = await calculateFomStats(pageClientIds);
    stats.metrics[3].total = fomStats.totalAmt;
    stats.metrics[3].page = fomStats.pageSpecificAmt;

    return stats;
  } catch (error) {
    console.error('Error calculating statistics:', error);
    throw error;
  }
}

async function calculateWmmStats(filteredClientIds) {
  // Calculate total copies from filtered clients
  const pipeline = [
    ...(filteredClientIds.length > 0 ? [{
      $match: {
        clientid: { $in: filteredClientIds }
      }
    }] : []),
    {
      $group: {
        _id: "$clientid",
        copies: { $first: "$copies" }
      }
    },
    {
      $group: {
        _id: null,
        totalCopies: {
          $sum: {
            $convert: {
              input: "$copies",
              to: "double",
              onError: 0,
              onNull: 0
            }
          }
        }
      }
    }
  ];

  const result = await WmmModel.aggregate(pipeline);

  return {
    totalCopies: result[0]?.totalCopies || 0,
    pageSpecificCopies: result[0]?.totalCopies || 0  // Same as total since we're already filtering
  };
}

async function calculateCalStats(filteredClientIds) {
  // Get current year and next year
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  
  // Find the most recent calendar type that contains the next year
  const nextYearCalType = await CalModel.findOne({
    caltype: { $regex: String(nextYear) }
  })
  .sort({ caltype: -1 })
  .select('caltype')
  .lean();

  // If no next year calendar exists, find the most recent one with current year
  const currentCalType = nextYearCalType?.caltype || 
    (await CalModel.findOne({
      caltype: { $regex: String(currentYear) }
    })
    .sort({ caltype: 1 })
    .select('caltype')
    .lean())?.caltype || 
    `WALL CALENDAR ${currentYear}`; // fallback

  // Calculate totals pipeline
  const pipeline = [
    {
      $match: {
        caltype: currentCalType,
        ...(filteredClientIds.length > 0 ? { clientid: { $in: filteredClientIds } } : {})
      }
    },
    {
      $group: {
        _id: "$clientid",
        qty: { $first: "$calqty" },
        amt: { 
          $first: {
            $multiply: [
              { $convert: { input: "$calqty", to: "double", onError: 0, onNull: 0 } },
              { $convert: { input: "$calamt", to: "double", onError: 0, onNull: 0 } }
            ]
          }
        },
        paymtAmt: {
          $first: {
            $cond: [
              { $and: [
                { $ne: ["$paymtref", null] },
                { $ne: ["$paymtdate", null] },
                { $ne: ["$paymtform", null] }
              ]},
              { $convert: { input: "$paymtamt", to: "double", onError: 0, onNull: 0 } },
              0
            ]
          }
        }
      }
    },
    {
      $group: {
        _id: null,
        totalQty: { $sum: { $convert: { input: "$qty", to: "double", onError: 0, onNull: 0 } } },
        totalAmt: { $sum: "$amt" },
        totalPaymtAmt: { $sum: "$paymtAmt" }
      }
    }
  ];

  const result = await CalModel.aggregate(pipeline);
  const stats = result[0] || { totalQty: 0, totalAmt: 0, totalPaymtAmt: 0 };

  return {
    currentCalType,
    totalQty: stats.totalQty,
    totalAmt: stats.totalAmt,
    totalPaymtAmt: stats.totalPaymtAmt,
    totalBalance: stats.totalAmt - stats.totalPaymtAmt,
    pageSpecificQty: stats.totalQty,
    pageSpecificAmt: stats.totalAmt,
    pageSpecificPaymtAmt: stats.totalPaymtAmt,
    pageSpecificBalance: stats.totalAmt - stats.totalPaymtAmt
  };
}

async function calculateHrgStats(filteredClientIds) {
  // Calculate totals from filtered clients
  const pipeline = [
    ...(filteredClientIds.length > 0 ? [{
      $match: {
        clientid: { $in: filteredClientIds }
      }
    }] : []),
    {
      $group: {
        _id: "$clientid",
        paymtAmt: { $first: "$paymtamt" }
      }
    },
    {
      $group: {
        _id: null,
        totalAmt: {
          $sum: {
            $convert: {
              input: "$paymtAmt",
              to: "double",
              onError: 0,
              onNull: 0
            }
          }
        }
      }
    }
  ];

  const result = await HrgModel.aggregate(pipeline);

  return {
    totalAmt: result[0]?.totalAmt || 0,
    pageSpecificAmt: result[0]?.totalAmt || 0  // Same as total since we're already filtering
  };
}

async function calculateFomStats(filteredClientIds) {
  // Calculate totals from filtered clients
  const pipeline = [
    ...(filteredClientIds.length > 0 ? [{
      $match: {
        clientid: { $in: filteredClientIds }
      }
    }] : []),
    {
      $group: {
        _id: "$clientid",
        paymtAmt: { $first: "$paymtamt" }
      }
    },
    {
      $group: {
        _id: null,
        totalAmt: {
          $sum: {
            $convert: {
              input: "$paymtAmt",
              to: "double",
              onError: 0,
              onNull: 0
            }
          }
        }
      }
    }
  ];

  const result = await FomModel.aggregate(pipeline);

  return {
    totalAmt: result[0]?.totalAmt || 0,
    pageSpecificAmt: result[0]?.totalAmt || 0  // Same as total since we're already filtering
  };
}

function parseNumeric(value) {
  if (typeof value === 'string') {
    return parseFloat(value.replace(/[^\d.-]/g, '')) || 0;
  }
  return typeof value === 'number' ? value : 0;
} 