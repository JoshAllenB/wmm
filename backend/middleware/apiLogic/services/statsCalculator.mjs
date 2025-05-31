import WmmModel from '../../../models/wmm.mjs';
import HrgModel from '../../../models/hrg.mjs';
import FomModel from '../../../models/fom.mjs';
import CalModel from '../../../models/cal.mjs';
import ClientModel from '../../../models/clients.mjs';

export async function calculateStatistics(filterQuery = {}, page = 1, limit = 20) {
  try {
    const stats = {
      totalCopies: 0,
      totalCalQty: 0,
      totalCalAmt: 0,
      hrgTotalAmt: 0,
      fomTotalAmt: 0,
      calTotalPaymtAmt: 0,
      pageSpecificCopies: 0,
      pageSpecificCalQty: 0,
      pageSpecificCalAmt: 0,
      pageSpecificHrgAmt: 0,
      pageSpecificFomAmt: 0,
      pageSpecificCalPaymtAmt: 0,
      totalClients: 0
    };

    // Get total client count - use filter if provided
    stats.totalClients = await ClientModel.countDocuments(filterQuery);

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Get filtered client IDs for the current page only
    const pageClients = await ClientModel.find(filterQuery || {})
      .select('id')
      .sort({ id: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Convert client IDs to numbers
    const pageClientIds = pageClients.map(client => Number(client.id));
    
    console.log('Page client IDs:', pageClientIds); // Debug log

    // Calculate WMM statistics
    const wmmStats = await calculateWmmStats(pageClientIds);
    stats.totalCopies = wmmStats.totalCopies;
    stats.pageSpecificCopies = wmmStats.pageSpecificCopies;

    // Calculate CAL statistics
    const calStats = await calculateCalStats(pageClientIds);
    stats.totalCalQty = calStats.totalQty;
    stats.totalCalAmt = calStats.totalAmt;
    stats.calTotalPaymtAmt = calStats.totalPaymtAmt;
    stats.pageSpecificCalQty = calStats.pageSpecificQty;
    stats.pageSpecificCalAmt = calStats.pageSpecificAmt;
    stats.pageSpecificCalPaymtAmt = calStats.pageSpecificPaymtAmt;

    // Calculate HRG statistics
    const hrgStats = await calculateHrgStats(pageClientIds);
    stats.hrgTotalAmt = hrgStats.totalAmt;
    stats.pageSpecificHrgAmt = hrgStats.pageSpecificAmt;

    // Calculate FOM statistics
    const fomStats = await calculateFomStats(pageClientIds);
    stats.fomTotalAmt = fomStats.totalAmt;
    stats.pageSpecificFomAmt = fomStats.pageSpecificAmt;

    return stats;
  } catch (error) {
    console.error('Error calculating statistics:', error);
    throw error;
  }
}

async function calculateWmmStats(filteredClientIds) {
  console.log('WMM - Filtered client IDs:', filteredClientIds); // Debug log
  
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

  console.log('WMM - Total result:', totalResult); // Debug log
  console.log('WMM - Page result:', pageResult); // Debug log

  return {
    totalCopies: totalResult[0]?.totalCopies || 0,
    pageSpecificCopies: pageResult[0]?.totalCopies || 0
  };
}

async function calculateCalStats(filteredClientIds) {
  console.log('CAL - Filtered client IDs:', filteredClientIds); // Debug log
  
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

  console.log('CAL - Total result:', totalResult); // Debug log
  console.log('CAL - Page result:', pageResult); // Debug log

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
  console.log('HRG - Filtered client IDs:', filteredClientIds); // Debug log
  
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

  console.log('HRG - Total result:', totalResult); // Debug log
  console.log('HRG - Page result:', pageResult); // Debug log

  return {
    totalAmt: totalResult[0]?.totalAmt || 0,
    pageSpecificAmt: pageResult[0]?.totalAmt || 0
  };
}

async function calculateFomStats(filteredClientIds) {
  console.log('FOM - Filtered client IDs:', filteredClientIds); // Debug log
  
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

  console.log('FOM - Total result:', totalResult); // Debug log
  console.log('FOM - Page result:', pageResult); // Debug log

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