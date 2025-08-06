import { buildFilterQuery } from './filterBuilder.mjs';
import { aggregateClientData } from './dataAggregator.mjs';
import { calculateStatistics } from './statsCalculator.mjs';
import { validatePaginationParams, parseDate, adjustModelNamesForSubscription } from './helpers.mjs';
import performanceMonitor from './performanceMonitor.mjs';
import ClientModel from "../../../models/clients.mjs";

class DataService {
  constructor() {
    // Initialize any service-wide configurations here
    this.DEFAULT_BATCH_SIZE = 1000; // Process 1000 clients at a time
    this.MAX_BATCH_SIZE = 5000; // Maximum batch size to prevent memory issues
  }

  async fetchData(params) {
    const {
      modelNames,
      filter,
      page,
      limit,
      pageSize,
      group,
      clientIds = null,
      advancedFilterData = {}
    } = params;

    try {
      // Ensure subscription type is set
      const subscriptionType = advancedFilterData.subscriptionType || 'WMM';

      // Check if this is a search query
      const isSearchQuery = filter && filter.trim() !== "";
      const isPaymentRefSearch = isSearchQuery && filter.toLowerCase().startsWith("ref:");
      const isClientIdSearch = isSearchQuery && !isNaN(Number(filter));
      const isNameSearch = isSearchQuery && !isPaymentRefSearch && !isClientIdSearch;

      // Check if there are any filters besides services
      const hasNonServiceFilters = Object.keys(advancedFilterData).some(key => 
        key !== 'services' && 
        key !== 'subscriptionType' && 
        advancedFilterData[key] !== undefined && 
        advancedFilterData[key] !== null && 
        advancedFilterData[key] !== ''
      );

      // Validate pagination parameters
      const { validPage, validLimit, skip } = validatePaginationParams(page, limit);

      // Build filter query with subscription type
      const filterQuery = await buildFilterQuery(filter, group, {
        ...advancedFilterData,
        subscriptionType
      });

      // Get filtered clients with pagination for display
      const clients = await this._getFilteredClients(filterQuery, skip, validLimit);
      const pageClientIds = clients.map(client => client.id);
      const totalCount = await ClientModel.countDocuments(filterQuery);

      // Get all filtered client IDs
      const allFilteredClientIds = await ClientModel.find(filterQuery)
        .select('id')
        .lean()
        .exec();
      const filteredIds = allFilteredClientIds.map(client => client.id);

      // For search queries, use ALL models regardless of user roles
      let adjustedModelNames;
      if (isSearchQuery) {
        // Use all available models for search queries
        adjustedModelNames = ["WmmModel", "HrgModel", "FomModel", "CalModel", "PromoModel", "ComplimentaryModel"];
        console.log("Using all models for search query:", filter);
      } else {
        // Use role-based models for non-search queries
        adjustedModelNames = adjustModelNamesForSubscription(modelNames, subscriptionType);
      }

      // Get paginated data for display with subscription type
      const { combinedData } = await aggregateClientData(clients, adjustedModelNames, {
        ...advancedFilterData,
        subscriptionType
      });

      // Add hasNonServiceFilters flag and subscription type to each client in combinedData
      const enrichedData = combinedData.map(client => {
        // Start with base client data
        const enrichedClient = {
          ...client,
          hasNonServiceFilters,
          subscriptionType
        };

        // Only include the relevant subscription data based on type
        switch(subscriptionType) {
          case 'Promo':
            enrichedClient.promoData = client.promoData || null;
            delete enrichedClient.wmmData;
            delete enrichedClient.compData;
            break;
          case 'Complimentary':
            enrichedClient.compData = client.compData || null;
            delete enrichedClient.wmmData;
            delete enrichedClient.promoData;
            break;
          default: // WMM
            enrichedClient.wmmData = client.wmmData || null;
            delete enrichedClient.promoData;
            delete enrichedClient.compData;
        }

        // Keep other service data
        if (client.hrgData) enrichedClient.hrgData = client.hrgData;
        if (client.fomData) enrichedClient.fomData = client.fomData;
        if (client.calData) enrichedClient.calData = client.calData;

        return enrichedClient;
      });

      // Calculate statistics using filter query and current page info
      const stats = await calculateStatistics(filterQuery, pageClientIds, validPage, validLimit);

      // Build client services based on subscription type
      const clientServices = this._buildClientServices(enrichedData, subscriptionType, isSearchQuery);

      // Prepare response
      const response = {
        stats,
        totalPages: Math.ceil(totalCount / validLimit),
        currentPage: validPage,
        pageSize: validLimit,
        combinedData: enrichedData,
        clientServices,
        subscriptionType // Include subscription type in response
      };

      return response;
    } catch (error) {
      console.error('Error in DataService.fetchData:', error);
      throw error;
    }
  }

  async _getFilteredClients(filterQuery, skip, limit) {
    const clients = await ClientModel.find(filterQuery)
      .sort({ id: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
    return clients;
  }

  _buildClientServices(combinedData, subscriptionType, isSearchQuery = false) {
    return combinedData.map(client => {
      const services = [];
      
      // For search queries, include all available services
      if (isSearchQuery) {
        // Add all subscription services that exist
        if (client.wmmData) services.push('WMM');
        if (client.promoData) services.push('PROMO');
        if (client.compData) services.push('COMP');
        if (client.hrgData) services.push('HRG');
        if (client.fomData) services.push('FOM');
        if (client.calData) services.push('CAL');
      } else {
        // Add subscription service based on type
        switch(subscriptionType) {
          case 'Promo':
            if (client.promoData) services.push('PROMO');
            break;
          case 'Complimentary':
            if (client.compData) services.push('COMP');
            break;
          default:
            if (client.wmmData) services.push('WMM');
        }

        // Add other services
        if (client.hrgData) services.push('HRG');
        if (client.fomData) services.push('FOM');
        if (client.calData) services.push('CAL');
      }
      
      // Add group-based services
      if (client.group) {
        const group = client.group.toUpperCase();
        if (group === 'DCS') services.push('DCS');
        if (group === 'MCCJ-ASIA') services.push('MCCJ-ASIA');
        if (group === 'MCCJ') services.push('MCCJ');
      }
      
      return {
        clientId: client.id,
        services
      };
    });
  }

  async fetchAllData(params) {
    const {
      modelNames,
      filter,
      group,
      clientIds = null,
      advancedFilterData = {},
      batchSize = this.DEFAULT_BATCH_SIZE
    } = params;

    try {
      // Check if this is a search query
      const isSearchQuery = filter && filter.trim() !== "";
      const isPaymentRefSearch = isSearchQuery && filter.toLowerCase().startsWith("ref:");
      const isClientIdSearch = isSearchQuery && !isNaN(Number(filter));
      const isNameSearch = isSearchQuery && !isPaymentRefSearch && !isClientIdSearch;

      // For search queries, use ALL models regardless of user roles
      let validModelNames;
      if (isSearchQuery) {
        // Use all available models for search queries
        validModelNames = ["WmmModel", "HrgModel", "FomModel", "CalModel", "PromoModel", "ComplimentaryModel"];
        console.log("Using all models for search query in fetchAllData:", filter);
      } else {
        // Use role-based models for non-search queries
        validModelNames = Array.isArray(modelNames) ? modelNames : [];
        if (validModelNames.length === 0) {
          throw new Error('No valid model names provided');
        }
      }

      // Build filter query
      let filterQuery = await buildFilterQuery(filter, group, advancedFilterData);

      // Add clientIds filter if provided and ensure it's a valid array
      if (clientIds) {
        const validClientIds = Array.isArray(clientIds) ? clientIds.filter(id => id !== null && id !== undefined) : [];
        if (validClientIds.length > 0) {
          filterQuery = {
            ...filterQuery,
            id: { $in: validClientIds.map(id => parseInt(id) || id) }
          };
        }
      }

      // Get total count first
      const totalCount = await ClientModel.countDocuments(filterQuery);
      console.log(`Processing ${totalCount} clients in batches of ${batchSize}`);

      // If the dataset is small enough, process it normally
      if (totalCount <= batchSize) {
        return await this._processAllDataDirectly(filterQuery, validModelNames, advancedFilterData, isSearchQuery);
      }

      // Process in batches for large datasets
      return await this._processAllDataInBatches(
        filterQuery, 
        validModelNames, 
        advancedFilterData, 
        isSearchQuery, 
        totalCount, 
        batchSize
      );

    } catch (error) {
      console.error('Error in DataService.fetchAllData:', error);
      throw error;
    }
  }

  async _processAllDataDirectly(filterQuery, validModelNames, advancedFilterData, isSearchQuery) {
    // Get ALL clients without pagination
    const clients = await ClientModel.find(filterQuery)
      .sort({ id: 1 })
      .lean();

    // Get all data without pagination
    const { combinedData } = await aggregateClientData(clients, validModelNames, advancedFilterData);

    // Calculate statistics for the entire dataset
    const stats = await calculateStatistics(filterQuery, clients.map(c => c.id), 1, clients.length);

    // Prepare response
    const response = {
      stats,
      combinedData,
      clientServices: this._buildClientServices(combinedData, advancedFilterData.subscriptionType || 'WMM', isSearchQuery)
    };

    return response;
  }

  async _processAllDataInBatches(filterQuery, validModelNames, advancedFilterData, isSearchQuery, totalCount, batchSize) {
    const operationId = `batch_processing_${Date.now()}`;
    
    // Start performance monitoring
    performanceMonitor.startTiming(operationId, {
      totalCount,
      batchSize,
      totalBatches: Math.ceil(totalCount / batchSize),
      modelNames: validModelNames,
      subscriptionType: advancedFilterData.subscriptionType || "WMM",
    });

    const allCombinedData = [];
    const allClientIds = [];
    let processedCount = 0;
    const startTime = Date.now();

    // Validate and adjust batch size
    const adjustedBatchSize = Math.min(batchSize, this.MAX_BATCH_SIZE);
    if (adjustedBatchSize !== batchSize) {
      console.log(`Adjusted batch size from ${batchSize} to ${adjustedBatchSize} for better performance`);
    }

    // Process clients in batches
    for (let skip = 0; skip < totalCount; skip += adjustedBatchSize) {
      const batchStartTime = Date.now();
      const currentBatch = Math.floor(skip / adjustedBatchSize) + 1;
      const batchOperationId = `${operationId}_batch_${currentBatch}`;
      
      // Start timing for this specific batch
      performanceMonitor.startTiming(batchOperationId, {
        batchNumber: currentBatch,
        totalBatches: Math.ceil(totalCount / adjustedBatchSize),
        batchSize: adjustedBatchSize,
        skip
      });
      
      try {
        // Get batch of clients
        const clients = await ClientModel.find(filterQuery)
          .sort({ id: 1 })
          .skip(skip)
          .limit(adjustedBatchSize)
          .lean();

        if (clients.length === 0) break;

        // Process this batch
        const { combinedData } = await aggregateClientData(clients, validModelNames, advancedFilterData);
        
        // Add to results
        allCombinedData.push(...combinedData);
        allClientIds.push(...clients.map(c => c.id));
        processedCount += clients.length;

        const batchEndTime = Date.now();
        const batchDuration = batchEndTime - batchStartTime;
        
        console.log(`Processed batch ${currentBatch}/${Math.ceil(totalCount / adjustedBatchSize)}: ${clients.length} clients in ${batchDuration}ms (${processedCount}/${totalCount} total)`);

        // Track batch performance
        performanceMonitor.endTiming(batchOperationId, {
          processedCount: clients.length,
          currentBatch,
          batchDuration,
          memoryUsage: performanceMonitor.getMemoryUsage(),
        });

        // Optional: Add a small delay between batches to prevent overwhelming the database
        if (skip + adjustedBatchSize < totalCount) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Memory management: Clear some references to help garbage collection
        if (allCombinedData.length > 5000) { // Reduced threshold for more frequent GC
          // Force garbage collection if available (Node.js with --expose-gc flag)
          if (global.gc) {
            global.gc();
          }
          
          // Log memory usage after GC
          const memUsage = performanceMonitor.getMemoryUsage();
          console.log(`Memory after GC: ${memUsage.heapUsed}MB (heap), ${memUsage.rss}MB (RSS)`);
        }

        // Check memory usage and warn if high
        if (performanceMonitor.isMemoryUsageHigh(400)) { // Reduced threshold to 400MB
          console.warn(`High memory usage detected during batch processing. Consider reducing batch size. Current: ${performanceMonitor.getMemoryUsage().heapUsed}MB`);
        }

      } catch (error) {
        console.error(`Error processing batch starting at ${skip}:`, error);
        
        // End timing for failed batch
        performanceMonitor.endTiming(batchOperationId, {
          processedCount: 0,
          currentBatch,
          error: error.message,
          memoryUsage: performanceMonitor.getMemoryUsage(),
        });
        
        // Continue with next batch instead of failing completely
        continue;
      }
    }

    const totalDuration = Date.now() - startTime;
    console.log(`Completed processing ${processedCount}/${totalCount} clients in ${totalDuration}ms using batch processing`);

    // Calculate statistics for the entire dataset
    const stats = await calculateStatistics(filterQuery, allClientIds, 1, processedCount);

    // End performance monitoring for the entire operation
    const performanceMetrics = performanceMonitor.endTiming(operationId, {
      processedCount,
      totalCount,
      successRate: processedCount / totalCount,
      totalDuration,
      memoryUsage: performanceMonitor.getMemoryUsage(),
    });

    // Get performance summary
    const performanceSummary = performanceMonitor.getSummary(operationId);

    // Prepare response
    const response = {
      stats,
      combinedData: allCombinedData,
      clientServices: this._buildClientServices(allCombinedData, advancedFilterData.subscriptionType || "WMM", isSearchQuery),
      processingInfo: {
        totalClients: totalCount,
        processedClients: processedCount,
        batchSize: adjustedBatchSize,
        totalBatches: Math.ceil(totalCount / adjustedBatchSize),
        processingTime: totalDuration,
        successRate: processedCount / totalCount,
        performanceMetrics: performanceSummary,
      },
    };

    return response;
  }

  /**
   * Fetch all data with configurable batch processing
   * @param {Object} params - Parameters for fetching data
   * @param {number} params.batchSize - Size of each batch (default: 1000, max: 5000)
   * @param {boolean} params.enableBatchProcessing - Force batch processing even for small datasets
   * @param {number} params.maxMemoryUsage - Maximum memory usage in MB before forcing GC
   * @returns {Object} Processed data with batch processing information
   */
  async fetchAllDataWithBatching(params) {
    const {
      batchSize = this.DEFAULT_BATCH_SIZE,
      enableBatchProcessing = false,
      maxMemoryUsage = 500, // 500MB default
      ...otherParams
    } = params;

    // Validate batch size
    const validatedBatchSize = Math.min(Math.max(batchSize, 100), this.MAX_BATCH_SIZE);
    
    // Get total count to decide processing strategy
    const { modelNames, filter, group, advancedFilterData = {} } = otherParams;
    let filterQuery = await buildFilterQuery(filter, group, advancedFilterData);
    const totalCount = await ClientModel.countDocuments(filterQuery);

    console.log(`Dataset size: ${totalCount} clients, Batch size: ${validatedBatchSize}`);

    // Use batch processing if explicitly enabled or if dataset is large
    if (enableBatchProcessing || totalCount > validatedBatchSize) {
      return await this.fetchAllData({
        ...otherParams,
        batchSize: validatedBatchSize
      });
    } else {
      // Use direct processing for smaller datasets
      return await this._processAllDataDirectly(filterQuery, modelNames, advancedFilterData, false);
    }
  }
}

// Create and export a singleton instance
const dataService = new DataService();
export default dataService; 