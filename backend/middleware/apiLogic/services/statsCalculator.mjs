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

    // Get total client count regardless of service
    stats.clientCount.total = await ClientModel.countDocuments(filterQuery);

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Get all clients for total counts - don't apply pagination here
    const allClients = await ClientModel.find(filterQuery)
      .lean()
      .exec();

    // Get filtered client IDs for the current page only
    const pageClients = await ClientModel.find(filterQuery)
      .sort({ id: 1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();
    
    // Set page-specific client count
    stats.clientCount.page = pageClients.length;

    // Aggregate data for all clients
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
        hrgOnly: 0,
        fomOnly: 0
      };

      clients.forEach(client => {
        const hasWMM = client.wmmData?.records?.length > 0;
        const hasHRG = client.hrgData?.records?.length > 0;
        const hasFOM = client.fomData?.records?.length > 0;

        // Check for WMM service
        if (hasWMM) {
          counts.wmm++;
        }

        // Check for HRG (can have WMM but not FOM)
        if (hasHRG && !hasFOM) {
          counts.hrgOnly++;
        }

        // Check for FOM (can have WMM but not HRG)
        if (hasFOM && !hasHRG) {
          counts.fomOnly++;
        }
      });


      return counts;
    };

    // Calculate total service counts
    const totalCounts = countServices(allCombinedData);
    stats.serviceClientCounts.wmm.total = totalCounts.wmm;
    stats.serviceClientCounts.hrgOnly.total = totalCounts.hrgOnly;
    stats.serviceClientCounts.fomOnly.total = totalCounts.fomOnly;

    // Calculate page-specific service counts
    const pageCounts = countServices(pageCombinedData);
    stats.serviceClientCounts.wmm.page = pageCounts.wmm;
    stats.serviceClientCounts.hrgOnly.page = pageCounts.hrgOnly;
    stats.serviceClientCounts.fomOnly.page = pageCounts.fomOnly;

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
  
  // Calculate total copies from all clients
  const totalPipeline = [
    // Sort by clientid and subsdate in descending order to get most recent first
    { $sort: { clientid: 1, subsdate: -1 } },
    // Group by clientid to get only the most recent record for each client
    {
      $group: {
        _id: "$clientid",
        recentCopies: { $first: "$copies" }
      }
    },
    // Convert copies to numeric value
    {
      $addFields: {
        numericCopies: {
          $convert: {
            input: "$recentCopies",
            to: "double",
            onError: 0,
            onNull: 0
          }
        }
      }
    },
    // Sum up all copies
    {
      $group: {
        _id: null,
        totalCopies: { $sum: "$numericCopies" }
      }
    }
  ];

  // Calculate page-specific copies
  const pagePipeline = [
    // Match only filtered clients if there are any
    ...(filteredClientIds.length > 0 ? [{
      $match: {
        clientid: { $in: filteredClientIds }
      }
    }] : []),
    ...totalPipeline
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
    `WALL CALENDAR ${currentYear}`; // fallback only if no calendar types found
  
  // Calculate totals pipeline
  const totalPipeline = [
    {
      $match: {
        caltype: currentCalType
      }
    },
    {
      $sort: { clientid: 1, recvdate: -1 }
    },
    {
      $group: {
        _id: "$clientid",
        recentRecord: { $first: "$$ROOT" }
      }
    },
    {
      $group: {
        _id: null,
        totalQty: {
          $sum: {
            $convert: {
              input: "$recentRecord.calqty",
              to: "double",
              onError: 0,
              onNull: 0
            }
          }
        },
        records: { $push: "$recentRecord" }
      }
    }
  ];

  // Calculate page-specific totals
  const pagePipeline = [
    {
      $match: {
        clientid: { $in: filteredClientIds },
        caltype: currentCalType
      }
    },
    {
      $sort: { clientid: 1, recvdate: -1 }
    },
    {
      $group: {
        _id: "$clientid",
        recentRecord: { $first: "$$ROOT" }
      }
    },
    {
      $group: {
        _id: null,
        totalQty: {
          $sum: {
                $convert: {
                  input: "$recentRecord.calqty",
                  to: "double",
                  onError: 0,
                  onNull: 0
                }
          }
        },
        records: { $push: "$recentRecord" }
      }
    }
  ];

  const [totalResult, pageResult] = await Promise.all([
    CalModel.aggregate(totalPipeline),
    CalModel.aggregate(pagePipeline)
  ]);

  // Calculate total amounts and payments
  const calculateAmounts = (records) => {
    let totalQty = 0;
    let totalAmt = 0;
    let totalPaymtAmt = 0;

    records.forEach(record => {
      const qty = parseFloat(record.calqty) || 0;
      const amt = parseFloat(record.calamt?.replace(/[^\d.-]/g, '')) || 0;
      const paymtAmt = parseFloat(record.paymtamt?.replace(/[^\d.-]/g, '')) || 0;

      totalQty += qty;
      totalAmt += qty * amt;

      // Only count payments with reference, date, and form
      if (record.paymtref && record.paymtdate && record.paymtform) {
        totalPaymtAmt += paymtAmt;
      }
    });

    const balance = totalAmt - totalPaymtAmt;

    return {
      qty: totalQty,
      amt: totalAmt,
      paymtAmt: totalPaymtAmt,
      balance: balance
    };
  };

  const totalAmounts = calculateAmounts(totalResult[0]?.records || []);
  const pageAmounts = calculateAmounts(pageResult[0]?.records || []);

  return {
    currentCalType,
    totalQty: totalAmounts.qty,
    totalAmt: totalAmounts.amt,
    totalPaymtAmt: totalAmounts.paymtAmt,
    totalBalance: totalAmounts.balance,
    pageSpecificQty: pageAmounts.qty,
    pageSpecificAmt: pageAmounts.amt,
    pageSpecificPaymtAmt: pageAmounts.paymtAmt,
    pageSpecificBalance: pageAmounts.balance
  };
}

async function calculateHrgStats(filteredClientIds) {
  
  // Calculate totals from all clients
  const totalPipeline = [
    { $sort: { clientid: 1, recvdate: -1 } },
    {
      $group: {
        _id: "$clientid",
        recentPaymtAmt: { $first: "$paymtamt" }
      }
    },
    {
      $group: {
        _id: null,
        totalAmt: {
          $sum: {
            $convert: {
              input: "$recentPaymtAmt",
              to: "double",
              onError: 0,
              onNull: 0
            }
          }
        }
      }
    }
  ];

  // Calculate page-specific totals
  const pagePipeline = [
    // Match only filtered clients if there are any
    ...(filteredClientIds.length > 0 ? [{
      $match: {
        clientid: { $in: filteredClientIds }
      }
    }] : []),
    ...totalPipeline
  ];

  const [totalResult, pageResult] = await Promise.all([
    HrgModel.aggregate(totalPipeline),
    HrgModel.aggregate(pagePipeline)
  ]);

  return {
    totalAmt: totalResult[0]?.totalAmt || 0,
    pageSpecificAmt: pageResult[0]?.totalAmt || 0
  };
}

async function calculateFomStats(filteredClientIds) {
  
  // Calculate totals from all clients
  const totalPipeline = [
    { $sort: { clientid: 1, recvdate: -1 } },
    {
      $group: {
        _id: "$clientid",
        recentPaymtAmt: { $first: "$paymtamt" }
      }
    },
    {
      $group: {
        _id: null,
        totalAmt: {
          $sum: {
            $convert: {
              input: "$recentPaymtAmt",
              to: "double",
              onError: 0,
              onNull: 0
            }
          }
        }
      }
    }
  ];

  // Calculate page-specific totals
  const pagePipeline = [
    // Match only filtered clients if there are any
    ...(filteredClientIds.length > 0 ? [{
      $match: {
        clientid: { $in: filteredClientIds }
      }
    }] : []),
    ...totalPipeline
  ];

  const [totalResult, pageResult] = await Promise.all([
    FomModel.aggregate(totalPipeline),
    FomModel.aggregate(pagePipeline)
  ]);

  return {
    totalAmt: totalResult[0]?.totalAmt || 0,
    pageSpecificAmt: pageResult[0]?.totalAmt || 0
  };
}

function parseNumeric(value) {
  if (typeof value === 'string') {
    return parseFloat(value.replace(/[^\d.-]/g, '')) || 0;
  }
  return typeof value === 'number' ? value : 0;
} 