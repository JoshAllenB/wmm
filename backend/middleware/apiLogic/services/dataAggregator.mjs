import { getModelInstance } from './modelManager.mjs';

export async function aggregateClientData(clients, modelNames, advancedFilterData = {}) {
  const modelDataMap = new Map();
  
  // Process model data in parallel
  const modelDataArrays = await Promise.all(
    modelNames.map(async (modelName) => {
      const Model = await getModelInstance(modelName);
      const clientIds = clients.map(c => c.id);

      // Build aggregation pipeline based on model type
      const pipeline = buildAggregationPipeline(Model.modelName, clientIds, advancedFilterData);
      return Model.aggregate(pipeline);
    })
  );

  // Process and map the aggregated data
  modelDataArrays.forEach((modelData, index) => {
    modelData.forEach(item => {
      const clientId = item._id || item.clientid;
      if (!modelDataMap.has(clientId)) {
        modelDataMap.set(clientId, {});
      }

      const dataObject = {
        ...item,
        records: filterRecords(item.records || [], advancedFilterData, modelNames[index])
      };

      // Set the data for this model with consistent service type naming
      const serviceType = normalizeServiceType(modelNames[index]);
      modelDataMap.get(clientId)[serviceType] = dataObject;
    });
  });

  // Create combinedData by merging client data with model data
  const combinedData = clients.map(client => {
    const clientData = {
      ...client,
      ...modelDataMap.get(client.id)
    };

    // Add DCS and MCCJ services if they match the client's group
    if (client.group) {
      const group = client.group.toUpperCase();
      if (group === 'DCS') {
        clientData.dcsData = { isService: true, group: 'DCS' };
      } else if (group === 'MCCJ-ASIA') {
        clientData.mccjAsiaData = { isService: true, group: 'MCCJ-ASIA' };
      } else if (group === 'MCCJ') {
        clientData.mccjData = { isService: true, group: 'MCCJ' };
      }
    }

    return clientData;
  });

  return {
    combinedData,
    modelDataMap
  };
}

function buildAggregationPipeline(modelName, clientIds, advancedFilterData) {
  const baseMatch = {
    clientid: { $in: clientIds.map(id => parseInt(id)) }
  };

  // Add model-specific pipeline stages
  switch(modelName.toLowerCase()) {
    case 'wmm':
      return [
        { $match: baseMatch },
        { $sort: { clientid: 1, subsdate: -1 } },
        {
          $group: {
            _id: "$clientid",
            recentCopies: { $first: "$copies" },
            totalCopies: { $sum: { $toInt: "$copies" } },
            subsclass: { $first: "$subsclass" },
            subsdate: { $first: "$subsdate" },
            enddate: { $first: "$enddate" },
            records: { $push: "$$ROOT" }
          }
        }
      ];

    case 'cal':
      return [
        { $match: baseMatch },
        {
          $addFields: {
            numericCalQty: { $toInt: "$calqty" },
            numericCalAmt: { $toDouble: "$calamt" },
            lineTotal: {
              $multiply: [
                { $toInt: { $ifNull: ["$calqty", 0] } },
                { $toDouble: { $ifNull: ["$calamt", 0] } }
              ]
            }
          }
        },
        {
          $group: {
            _id: "$clientid",
            totalCalQty: { $sum: "$numericCalQty" },
            totalCalAmt: { $sum: "$lineTotal" },
            records: { $push: "$$ROOT" }
          }
        }
      ];

    default:
      return [
        { $match: baseMatch },
        { $sort: { clientid: 1, recvdate: -1 } },
        {
          $group: {
            _id: "$clientid",
            records: { $push: "$$ROOT" }
          }
        }
      ];
  }
}

function filterRecords(records, advancedFilterData, modelName) {
  if (!records.length) return records;

  let filteredRecords = [...records];

  // Apply username filter if present
  if (advancedFilterData.usernameFilter) {
    const username = advancedFilterData.usernameFilter;
    filteredRecords = filteredRecords.filter(record => 
      record.adduser === username || 
      (typeof record.adduser === 'string' && 
       record.adduser.toLowerCase() === username.toLowerCase())
    );
  }

  // Apply active/unsubscribed filter for HRG and FOM
  const modelType = modelName.toLowerCase();
  if ((modelType.includes('hrg') || modelType.includes('fom'))) {
    if (advancedFilterData.showActiveOnly) {
      filteredRecords = filteredRecords.filter(record => 
        record.unsubscribe !== 1 && record.unsubscribe !== true
      );
    } else if (advancedFilterData.subscriptionStatus === 'unsubscribed') {
      filteredRecords = filteredRecords.filter(record => 
        record.unsubscribe === 1 || record.unsubscribe === true
      );
    }
  }

  return filteredRecords;
}

function normalizeServiceType(modelName) {
  const modelNameLower = modelName.toLowerCase();
  
  if (modelNameLower.includes('wmm')) return 'wmmData';
  if (modelNameLower.includes('hrg')) return 'hrgData';
  if (modelNameLower.includes('fom')) return 'fomData';
  if (modelNameLower.includes('cal')) return 'calData';
  if (modelNameLower.includes('dcs')) return 'dcsData';
  if (modelNameLower.includes('mccj-asia')) return 'mccjAsiaData';
  if (modelNameLower.includes('mccj')) return 'mccjData';
  
  return modelNameLower.replace('model', '') + 'Data';
} 