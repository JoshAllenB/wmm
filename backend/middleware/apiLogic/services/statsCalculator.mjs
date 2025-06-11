import WmmModel from '../../../models/wmm.mjs';
import HrgModel from '../../../models/hrg.mjs';
import FomModel from '../../../models/fom.mjs';
import CalModel from '../../../models/cal.mjs';
import ClientModel from '../../../models/clients.mjs';

export async function calculateStatistics(filterQuery = {}, page = 1, limit = 20) {
  try {
    // Initialize stats array with structured data
    const stats = {
      clientCount: {
        total: 0,
        page: 0
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
              tooltip: 'Includes only payments with reference and either form or date'
            }
          ]
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

    // Get total client count
    stats.clientCount.total = await ClientModel.countDocuments(filterQuery);

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Get filtered client IDs for the current page only
    const pageClients = await ClientModel.find(filterQuery || {})
      .select('id')
      .sort({ id: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Set page-specific client count
    stats.clientCount.page = pageClients.length;
    
    // Convert client IDs to numbers
    const pageClientIds = pageClients.map(client => Number(client.id));
    
    // Calculate WMM statistics
    const wmmStats = await calculateWmmStats(pageClientIds);
    stats.metrics[0].total = wmmStats.totalCopies;
    stats.metrics[0].page = wmmStats.pageSpecificCopies;

    // Calculate CAL statistics
    const calStats = await calculateCalStats(pageClientIds);
    stats.metrics[1].metrics[0].total = calStats.totalQty;
    stats.metrics[1].metrics[0].page = calStats.pageSpecificQty;
    stats.metrics[1].metrics[1].total = calStats.totalAmt;
    stats.metrics[1].metrics[1].page = calStats.pageSpecificAmt;
    stats.metrics[1].metrics[2].total = calStats.totalPaymtAmt;
    stats.metrics[1].metrics[2].page = calStats.pageSpecificPaymtAmt;

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
  
  // Calculate totals from all clients
  const totalPipeline = [
    { $sort: { clientid: 1, recvdate: -1 } },
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
        totalAmt: {
          $sum: {
            $multiply: [
              { 
                $convert: {
                  input: "$recentRecord.calqty",
                  to: "double",
                  onError: 0,
                  onNull: 0
                }
              },
              {
                $convert: {
                  input: "$recentRecord.calamt",
                  to: "double",
                  onError: 0,
                  onNull: 0
                }
              }
            ]
          }
        },
        records: { $push: "$recentRecord" }
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
    CalModel.aggregate(totalPipeline),
    CalModel.aggregate(pagePipeline)
  ]);

  // Calculate payment amounts for total
  const totalPaymtAmt = totalResult[0]?.records.reduce((total, record) => {
    if (record.paymtamt && record.paymtref && (record.paymtdate || record.paymtform)) {
      return total + parseNumeric(record.paymtamt);
    }
    return total;
  }, 0) || 0;

  // Calculate payment amounts for page-specific
  const pagePaymtAmt = pageResult[0]?.records.reduce((total, record) => {
    if (record.paymtamt && record.paymtref && (record.paymtdate || record.paymtform)) {
      return total + parseNumeric(record.paymtamt);
    }
    return total;
  }, 0) || 0;

  return {
    totalQty: totalResult[0]?.totalQty || 0,
    totalAmt: totalResult[0]?.totalAmt || 0,
    totalPaymtAmt,
    pageSpecificQty: pageResult[0]?.totalQty || 0,
    pageSpecificAmt: pageResult[0]?.totalAmt || 0,
    pageSpecificPaymtAmt: pagePaymtAmt
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