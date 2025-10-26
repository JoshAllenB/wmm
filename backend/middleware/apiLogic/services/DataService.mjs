import { buildFilterQuery } from "./filterBuilder.mjs";
import { aggregateClientData } from "./dataAggregator.mjs";
import { calculateStatistics } from "./statsCalculator.mjs";
import {
  validatePaginationParams,
  parseDate,
  adjustModelNamesForSubscription,
} from "./helpers.mjs";
import performanceMonitor from "./performanceMonitor.mjs";
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
      advancedFilterData = {},
      enableBatchProcessing = false,
      batchSize = this.DEFAULT_BATCH_SIZE,
      userRoles = [],
    } = params;

    try {
      // Ensure subscription type is set
      const subscriptionType = advancedFilterData.subscriptionType || "WMM";

      // Check if this is a search query
      const isSearchQuery = filter && filter.trim() !== "";
      const isPaymentRefSearch =
        isSearchQuery && filter.toLowerCase().startsWith("ref:");
      const isClientIdSearch = isSearchQuery && !isNaN(Number(filter));
      const isNameSearch =
        isSearchQuery && !isPaymentRefSearch && !isClientIdSearch;

      // Check if there are any filters besides services
      const hasNonServiceFilters = Object.keys(advancedFilterData).some(
        (key) =>
          key !== "services" &&
          key !== "subscriptionType" &&
          advancedFilterData[key] !== undefined &&
          advancedFilterData[key] !== null &&
          advancedFilterData[key] !== ""
      );

      // Validate pagination parameters
      const { validPage, validLimit, skip } = validatePaginationParams(
        page,
        limit
      );

      // Build filter query with subscription type
      const filterQuery = await buildFilterQuery(filter, group, {
        ...advancedFilterData,
        subscriptionType,
      });

      // Get total count first
      const totalCount = await ClientModel.countDocuments(filterQuery);

      // Decide whether to use batch processing
      // Since we now process page-specific data, only use batch processing for very large datasets
      // or when explicitly enabled
      const shouldUseBatchProcessing =
        enableBatchProcessing || totalCount > batchSize * 5; // Only for datasets > 5000 clients

      if (shouldUseBatchProcessing) {
        return await this._fetchDataWithBatching({
          filterQuery,
          validPage,
          validLimit,
          skip,
          totalCount,
          modelNames,
          advancedFilterData,
          subscriptionType,
          isSearchQuery,
          hasNonServiceFilters,
          batchSize,
          userRoles,
        });
      } else {
        return await this._fetchDataDirectly({
          filterQuery,
          validPage,
          validLimit,
          skip,
          totalCount,
          modelNames,
          advancedFilterData,
          subscriptionType,
          isSearchQuery,
          hasNonServiceFilters,
          userRoles,
        });
      }
    } catch (error) {
      console.error("Error in DataService.fetchData:", error);
      throw error;
    }
  }

  async _fetchDataDirectly({
    filterQuery,
    validPage,
    validLimit,
    skip,
    totalCount,
    modelNames,
    advancedFilterData,
    subscriptionType,
    isSearchQuery,
    hasNonServiceFilters,
    userRoles,
  }) {
    // Get ALL filtered clients for statistics calculation (unpaginated)
    const allFilteredClients = await this._getFilteredClients(
      filterQuery,
      0, // No skip - get all clients
      totalCount // Get all clients
    );

    // Get paginated clients for display
    const pageClients = await this._getFilteredClients(
      filterQuery,
      skip,
      validLimit
    );
    const pageClientIds = pageClients.map((client) => client.id);

    // For search queries, use ALL models regardless of user roles
    let adjustedModelNames;
    if (isSearchQuery) {
      // Use all available models for search queries
      adjustedModelNames = [
        "WmmModel",
        "HrgModel",
        "FomModel",
        "CalModel",
        "PromoModel",
        "ComplimentaryModel",
      ];
    } else {
      // Use role-based models for non-search queries
      adjustedModelNames = adjustModelNamesForSubscription(
        modelNames,
        subscriptionType
      );
    }

    // Get ALL filtered data for statistics calculation (unpaginated)
    const { combinedData: allFilteredData } = await aggregateClientData(
      allFilteredClients,
      adjustedModelNames,
      {
        ...advancedFilterData,
        subscriptionType,
      }
    );

    // Get paginated data for display with subscription type
    const { combinedData: pageData } = await aggregateClientData(
      pageClients,
      adjustedModelNames,
      {
        ...advancedFilterData,
        subscriptionType,
      }
    );

    // Add hasNonServiceFilters flag and subscription type to each client in pageData
    const enrichedData = pageData.map((client) => {
      // Start with base client data
      const enrichedClient = {
        ...client,
        hasNonServiceFilters,
        subscriptionType,
      };

      // If this is a search query (no subscription type), keep ALL subscription data
      if (!subscriptionType || subscriptionType === "undefined" || isSearchQuery) {
        // Keep all subscription data for search queries
        if (client.wmmData) enrichedClient.wmmData = client.wmmData;
        if (client.promoData) enrichedClient.promoData = client.promoData;
        if (client.compData) enrichedClient.compData = client.compData;
      } else {
        // Only include the relevant subscription data based on type
        switch (subscriptionType) {
          case "Promo":
            enrichedClient.promoData = client.promoData || null;
            delete enrichedClient.wmmData;
            delete enrichedClient.compData;
            break;
          case "Complimentary":
            enrichedClient.compData = client.compData || null;
            delete enrichedClient.wmmData;
            delete enrichedClient.promoData;
            break;
          default: // WMM
            enrichedClient.wmmData = client.wmmData || null;
            delete enrichedClient.promoData;
            delete enrichedClient.compData;
        }
      }

      // Always keep other service data (HRG, FOM, CAL)
      if (client.hrgData) enrichedClient.hrgData = client.hrgData;
      if (client.fomData) enrichedClient.fomData = client.fomData;
      if (client.calData) enrichedClient.calData = client.calData;

      return enrichedClient;
    });

    // Calculate statistics using ALL filtered data (unpaginated) for accurate totals
    const stats = await calculateStatistics(
      filterQuery,
      pageClientIds,
      validPage,
      validLimit,
      advancedFilterData,
      { combinedData: allFilteredData }, // Pass ALL filtered data for statistics
      userRoles // Pass user roles for role-based calculations
    );

    // Build client services based on subscription type (using page data for display)
    const clientServices = this._buildClientServices(
      enrichedData,
      subscriptionType,
      isSearchQuery
    );

    // Prepare response
    const response = {
      stats,
      totalPages: Math.ceil(totalCount / validLimit),
      currentPage: validPage,
      pageSize: validLimit,
      combinedData: enrichedData,
      clientServices,
      subscriptionType, // Include subscription type in response
    };

    return response;
  }

  async _fetchDataWithBatching({
    filterQuery,
    validPage,
    validLimit,
    skip,
    totalCount,
    modelNames,
    advancedFilterData,
    subscriptionType,
    isSearchQuery,
    hasNonServiceFilters,
    batchSize,
    userRoles,
  }) {
    const operationId = `fetch_data_batch_${Date.now()}`;

    // Start performance monitoring
    performanceMonitor.startTiming(operationId, {
      totalCount,
      batchSize,
      currentPage: validPage,
      pageSize: validLimit,
      skip,
      modelNames,
      subscriptionType,
    });

    // Optimize batch size based on total count and memory constraints
    const adjustedBatchSize = this._calculateOptimalBatchSize(
      totalCount,
      batchSize
    );

    // For search queries, use ALL models regardless of user roles
    let adjustedModelNames;
    if (isSearchQuery) {
      adjustedModelNames = [
        "WmmModel",
        "HrgModel",
        "FomModel",
        "CalModel",
        "PromoModel",
        "ComplimentaryModel",
      ];
    } else {
      adjustedModelNames = adjustModelNamesForSubscription(
        modelNames,
        subscriptionType
      );
    }

    const startTime = Date.now();

    try {
      // Use streaming approach for large datasets
      if (totalCount > adjustedBatchSize * 2) {
        return await this._processWithStreaming({
          filterQuery,
          validPage,
          validLimit,
          skip,
          totalCount,
          adjustedModelNames,
          advancedFilterData,
          subscriptionType,
          isSearchQuery,
          hasNonServiceFilters,
          userRoles,
          operationId,
          startTime,
        });
      }

      // For smaller datasets, use optimized parallel processing
      return await this._processWithParallelBatching({
        filterQuery,
        validPage,
        validLimit,
        skip,
        totalCount,
        adjustedModelNames,
        advancedFilterData,
        subscriptionType,
        isSearchQuery,
        hasNonServiceFilters,
        userRoles,
        operationId,
        startTime,
        adjustedBatchSize,
      });
    } catch (error) {
      console.error(`Error processing page ${validPage}:`, error);

      performanceMonitor.endTiming(operationId, {
        processedCount: 0,
        totalCount,
        successRate: 0,
        totalDuration: Date.now() - startTime,
        error: error.message,
        memoryUsage: performanceMonitor.getMemoryUsage(),
      });

      throw error;
    }
  }

  /**
   * Calculate optimal batch size based on total count and memory constraints
   */
  _calculateOptimalBatchSize(totalCount, requestedBatchSize) {
    const memoryUsage = performanceMonitor.getMemoryUsage();
    const isHighMemory = memoryUsage.heapUsed > 300; // 300MB threshold

    // Dynamic batch sizing based on dataset size and memory usage
    let optimalBatchSize;

    if (totalCount > 50000) {
      // Very large datasets - use smaller batches
      optimalBatchSize = Math.min(1000, requestedBatchSize);
    } else if (totalCount > 20000) {
      // Large datasets - moderate batch size
      optimalBatchSize = Math.min(2000, requestedBatchSize);
    } else if (totalCount > 10000) {
      // Medium datasets - standard batch size
      optimalBatchSize = Math.min(3000, requestedBatchSize);
    } else {
      // Small datasets - can use larger batches
      optimalBatchSize = Math.min(5000, requestedBatchSize);
    }

    // Reduce batch size if memory usage is high
    if (isHighMemory) {
      optimalBatchSize = Math.floor(optimalBatchSize * 0.5);
    }

    return Math.max(100, optimalBatchSize); // Minimum batch size of 100
  }

  /**
   * Process data using streaming approach for very large datasets
   */
  async _processWithStreaming({
    filterQuery,
    validPage,
    validLimit,
    skip,
    totalCount,
    adjustedModelNames,
    advancedFilterData,
    subscriptionType,
    isSearchQuery,
    hasNonServiceFilters,
    userRoles,
    operationId,
    startTime,
  }) {
    console.log(`Using streaming approach for ${totalCount} clients`);

    // Get page clients first
    const pageClients = await ClientModel.find(filterQuery)
      .sort({ id: 1 })
      .skip(skip)
      .limit(validLimit)
      .lean();

    if (pageClients.length === 0) {
      return this._createEmptyResponse(
        validPage,
        validLimit,
        totalCount,
        subscriptionType,
        operationId,
        startTime
      );
    }

    const pageClientIds = pageClients.map((client) => client.id);

    // Use optimized aggregation for statistics calculation
    const stats = await this._calculateStatisticsOptimized(
      filterQuery,
      pageClientIds,
      validPage,
      validLimit,
      advancedFilterData,
      adjustedModelNames,
      subscriptionType,
      userRoles
    );

    // Process page data with streaming aggregation
    const { combinedData: pageData } = await this._aggregateDataStreaming(
      pageClients,
      adjustedModelNames,
      advancedFilterData,
      subscriptionType
    );

    const enrichedData = this._enrichClientData(
      pageData,
      hasNonServiceFilters,
      subscriptionType
    );

    const clientServices = this._buildClientServices(
      enrichedData,
      subscriptionType,
      isSearchQuery
    );

    const totalDuration = Date.now() - startTime;
    performanceMonitor.endTiming(operationId, {
      processedCount: pageClients.length,
      totalCount,
      successRate: pageClients.length / validLimit,
      totalDuration,
      memoryUsage: performanceMonitor.getMemoryUsage(),
    });

    return {
      stats,
      totalPages: Math.ceil(totalCount / validLimit),
      currentPage: validPage,
      pageSize: validLimit,
      combinedData: enrichedData,
      clientServices,
      subscriptionType,
      processingInfo: {
        totalClients: totalCount,
        processedClients: pageClients.length,
        batchSize: 0, // Streaming doesn't use traditional batches
        totalBatches: 1,
        processingTime: totalDuration,
        successRate: pageClients.length / validLimit,
        performanceMetrics: performanceMonitor.getSummary(operationId),
        batchProcessingEnabled: true,
        optimization: "streaming processing",
      },
    };
  }

  /**
   * Process data using parallel batching for medium datasets
   */
  async _processWithParallelBatching({
    filterQuery,
    validPage,
    validLimit,
    skip,
    totalCount,
    adjustedModelNames,
    advancedFilterData,
    subscriptionType,
    isSearchQuery,
    hasNonServiceFilters,
    userRoles,
    operationId,
    startTime,
    adjustedBatchSize,
  }) {
    console.log(`Using parallel batching for ${totalCount} clients`);

    // Get page clients
    const pageClients = await ClientModel.find(filterQuery)
      .sort({ id: 1 })
      .skip(skip)
      .limit(validLimit)
      .lean();

    if (pageClients.length === 0) {
      return this._createEmptyResponse(
        validPage,
        validLimit,
        totalCount,
        subscriptionType,
        operationId,
        startTime
      );
    }

    const pageClientIds = pageClients.map((client) => client.id);

    // Parallel processing: Get statistics and page data simultaneously
    const [stats, { combinedData: pageData }] = await Promise.all([
      this._calculateStatisticsOptimized(
        filterQuery,
        pageClientIds,
        validPage,
        validLimit,
        advancedFilterData,
        adjustedModelNames,
        subscriptionType,
        userRoles
      ),
      this._aggregateDataParallel(
        pageClients,
        adjustedModelNames,
        advancedFilterData,
        subscriptionType
      ),
    ]);

    const enrichedData = this._enrichClientData(
      pageData,
      hasNonServiceFilters,
      subscriptionType
    );

    const clientServices = this._buildClientServices(
      enrichedData,
      subscriptionType,
      isSearchQuery
    );

    const totalDuration = Date.now() - startTime;
    performanceMonitor.endTiming(operationId, {
      processedCount: pageClients.length,
      totalCount,
      successRate: pageClients.length / validLimit,
      totalDuration,
      memoryUsage: performanceMonitor.getMemoryUsage(),
    });

    return {
      stats,
      totalPages: Math.ceil(totalCount / validLimit),
      currentPage: validPage,
      pageSize: validLimit,
      combinedData: enrichedData,
      clientServices,
      subscriptionType,
      processingInfo: {
        totalClients: totalCount,
        processedClients: pageClients.length,
        batchSize: adjustedBatchSize,
        totalBatches: 1,
        processingTime: totalDuration,
        successRate: pageClients.length / validLimit,
        performanceMetrics: performanceMonitor.getSummary(operationId),
        batchProcessingEnabled: true,
        optimization: "parallel processing",
      },
    };
  }

  /**
   * Create empty response for when no clients are found
   */
  _createEmptyResponse(
    validPage,
    validLimit,
    totalCount,
    subscriptionType,
    operationId,
    startTime
  ) {
    const totalDuration = Date.now() - startTime;

    performanceMonitor.endTiming(operationId, {
      processedCount: 0,
      totalCount,
      successRate: 0,
      totalDuration,
      memoryUsage: performanceMonitor.getMemoryUsage(),
    });

    return {
      stats: { clientCount: { total: totalCount, page: 0 }, metrics: [] },
      totalPages: Math.ceil(totalCount / validLimit),
      currentPage: validPage,
      pageSize: validLimit,
      combinedData: [],
      clientServices: [],
      subscriptionType,
      processingInfo: {
        totalClients: totalCount,
        processedClients: 0,
        batchSize: 0,
        totalBatches: 0,
        processingTime: totalDuration,
        successRate: 0,
        performanceMetrics: performanceMonitor.getSummary(operationId),
        batchProcessingEnabled: true,
        optimization: "empty result",
      },
    };
  }

  /**
   * Enrich client data with subscription type and filters
   */
  _enrichClientData(pageData, hasNonServiceFilters, subscriptionType) {
    return pageData.map((client) => {
      const enrichedClient = {
        ...client,
        hasNonServiceFilters,
        subscriptionType,
      };

      // If no subscription type specified (search query), keep ALL subscription data
      if (!subscriptionType || subscriptionType === "undefined") {
        // Keep all subscription data for search queries
        if (client.wmmData) enrichedClient.wmmData = client.wmmData;
        if (client.promoData) enrichedClient.promoData = client.promoData;
        if (client.compData) enrichedClient.compData = client.compData;
      } else {
        // Only include the relevant subscription data based on type
        switch (subscriptionType) {
          case "Promo":
            enrichedClient.promoData = client.promoData || null;
            delete enrichedClient.wmmData;
            delete enrichedClient.compData;
            break;
          case "Complimentary":
            enrichedClient.compData = client.compData || null;
            delete enrichedClient.wmmData;
            delete enrichedClient.promoData;
            break;
          default: // WMM
            enrichedClient.wmmData = client.wmmData || null;
            delete enrichedClient.promoData;
            delete enrichedClient.compData;
        }
      }

      // Always keep other service data (HRG, FOM, CAL)
      if (client.hrgData) enrichedClient.hrgData = client.hrgData;
      if (client.fomData) enrichedClient.fomData = client.fomData;
      if (client.calData) enrichedClient.calData = client.calData;

      return enrichedClient;
    });
  }

  /**
   * Optimized statistics calculation using direct aggregation
   */
  async _calculateStatisticsOptimized(
    filterQuery,
    pageClientIds,
    validPage,
    validLimit,
    advancedFilterData,
    adjustedModelNames,
    subscriptionType,
    userRoles
  ) {
    // Use the existing calculateStatistics function but with optimized parameters
    return await calculateStatistics(
      filterQuery,
      pageClientIds,
      validPage,
      validLimit,
      advancedFilterData,
      null, // No pre-filtered data for optimized calculation
      userRoles
    );
  }

  /**
   * Streaming aggregation for large datasets
   */
  async _aggregateDataStreaming(
    clients,
    modelNames,
    advancedFilterData,
    subscriptionType
  ) {
    // For streaming, we'll use the existing aggregateClientData but with memory optimization
    const result = await aggregateClientData(clients, modelNames, {
      ...advancedFilterData,
      subscriptionType,
    });

    // Force garbage collection if available
    if (global.gc && clients.length > 1000) {
      global.gc();
    }

    return result;
  }

  /**
   * Parallel aggregation for medium datasets
   */
  async _aggregateDataParallel(
    clients,
    modelNames,
    advancedFilterData,
    subscriptionType
  ) {
    // Use the existing aggregateClientData with parallel processing
    return await aggregateClientData(clients, modelNames, {
      ...advancedFilterData,
      subscriptionType,
    });
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
    return combinedData.map((client) => {
      const services = [];

      // For search queries, include all available services
      if (isSearchQuery) {
        // Add all subscription services that exist
        if (client.wmmData) services.push("WMM");
        if (client.promoData) services.push("PROMO");
        if (client.compData) services.push("COMP");
        if (client.hrgData) services.push("HRG");
        if (client.fomData) services.push("FOM");
        if (client.calData) services.push("CAL");
      } else {
        // Add subscription service based on type
        switch (subscriptionType) {
          case "Promo":
            if (client.promoData) services.push("PROMO");
            break;
          case "Complimentary":
            if (client.compData) services.push("COMP");
            break;
          default:
            if (client.wmmData) services.push("WMM");
        }

        // Add other services
        if (client.hrgData) services.push("HRG");
        if (client.fomData) services.push("FOM");
        if (client.calData) services.push("CAL");
      }

      // Add group-based services
      if (client.group) {
        const group = client.group.toUpperCase();
        if (group === "DCS") services.push("DCS");
        if (group === "MCCJ-ASIA") services.push("MCCJ-ASIA");
        if (group === "MCCJ") services.push("MCCJ");
      }

      return {
        clientId: client.id,
        services,
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
      batchSize = this.DEFAULT_BATCH_SIZE,
      userRoles = [],
    } = params;

    try {
      // Check if this is a search query
      const isSearchQuery = filter && filter.trim() !== "";
      const isPaymentRefSearch =
        isSearchQuery && filter.toLowerCase().startsWith("ref:");
      const isClientIdSearch = isSearchQuery && !isNaN(Number(filter));
      const isNameSearch =
        isSearchQuery && !isPaymentRefSearch && !isClientIdSearch;

      // For search queries, use ALL models regardless of user roles
      let validModelNames;
      if (isSearchQuery) {
        // Use all available models for search queries
        validModelNames = [
          "WmmModel",
          "HrgModel",
          "FomModel",
          "CalModel",
          "PromoModel",
          "ComplimentaryModel",
        ];
      } else {
        // Use role-based models for non-search queries
        validModelNames = Array.isArray(modelNames) ? modelNames : [];
        if (validModelNames.length === 0) {
          throw new Error("No valid model names provided");
        }
      }

      // Build filter query
      let filterQuery = await buildFilterQuery(
        filter,
        group,
        advancedFilterData
      );

      // Add clientIds filter if provided and ensure it's a valid array
      if (clientIds) {
        const validClientIds = Array.isArray(clientIds)
          ? clientIds.filter((id) => id !== null && id !== undefined)
          : [];
        if (validClientIds.length > 0) {
          filterQuery = {
            ...filterQuery,
            id: { $in: validClientIds.map((id) => parseInt(id) || id) },
          };
        }
      }

      // Get total count first
      const totalCount = await ClientModel.countDocuments(filterQuery);

      // If the dataset is small enough, process it normally
      if (totalCount <= batchSize) {
        return await this._processAllDataDirectly(
          filterQuery,
          validModelNames,
          advancedFilterData,
          isSearchQuery,
          userRoles
        );
      }

      // Process in batches for large datasets
      return await this._processAllDataInBatches(
        filterQuery,
        validModelNames,
        advancedFilterData,
        isSearchQuery,
        totalCount,
        batchSize,
        userRoles
      );
    } catch (error) {
      console.error("Error in DataService.fetchAllData:", error);
      throw error;
    }
  }

  async _processAllDataDirectly(
    filterQuery,
    validModelNames,
    advancedFilterData,
    isSearchQuery,
    userRoles
  ) {
    // Get ALL clients without pagination
    const clients = await ClientModel.find(filterQuery).sort({ id: 1 }).lean();

    // Get all data without pagination
    const { combinedData } = await aggregateClientData(
      clients,
      validModelNames,
      advancedFilterData
    );

    // Calculate statistics for the entire dataset
    const stats = await calculateStatistics(
      filterQuery,
      clients.map((c) => c.id),
      1,
      clients.length,
      advancedFilterData,
      { combinedData },
      userRoles
    );

    // Prepare response
    const response = {
      stats,
      combinedData,
      clientServices: this._buildClientServices(
        combinedData,
        advancedFilterData.subscriptionType || "WMM",
        isSearchQuery
      ),
    };

    return response;
  }

  async _processAllDataInBatches(
    filterQuery,
    validModelNames,
    advancedFilterData,
    isSearchQuery,
    totalCount,
    batchSize,
    userRoles
  ) {
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
        skip,
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
        const { combinedData } = await aggregateClientData(
          clients,
          validModelNames,
          advancedFilterData
        );

        // Add to results
        allCombinedData.push(...combinedData);
        allClientIds.push(...clients.map((c) => c.id));
        processedCount += clients.length;

        const batchEndTime = Date.now();
        const batchDuration = batchEndTime - batchStartTime;

        // Track batch performance
        performanceMonitor.endTiming(batchOperationId, {
          processedCount: clients.length,
          currentBatch,
          batchDuration,
          memoryUsage: performanceMonitor.getMemoryUsage(),
        });

        // Optional: Add a small delay between batches to prevent overwhelming the database
        if (skip + adjustedBatchSize < totalCount) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        // Memory management: Clear some references to help garbage collection
        if (allCombinedData.length > 5000) {
          // Reduced threshold for more frequent GC
          // Force garbage collection if available (Node.js with --expose-gc flag)
          if (global.gc) {
            global.gc();
          }

          // Log memory usage after GC
          const memUsage = performanceMonitor.getMemoryUsage();
        }

        // Check memory usage and warn if high
        if (performanceMonitor.isMemoryUsageHigh(400)) {
          // Reduced threshold to 400MB
          console.warn(
            `High memory usage detected during batch processing. Consider reducing batch size. Current: ${
              performanceMonitor.getMemoryUsage().heapUsed
            }MB`
          );
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

    // Calculate statistics for the entire dataset
    const stats = await calculateStatistics(
      filterQuery,
      allClientIds,
      1,
      processedCount,
      advancedFilterData,
      { combinedData: allCombinedData },
      userRoles
    );

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
      clientServices: this._buildClientServices(
        allCombinedData,
        advancedFilterData.subscriptionType || "WMM",
        isSearchQuery
      ),
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
   * Fetch data with configurable batch processing
   * @param {Object} params - Parameters for fetching data
   * @param {number} params.batchSize - Size of each batch (default: 1000, max: 5000)
   * @param {boolean} params.enableBatchProcessing - Force batch processing even for small datasets
   * @param {number} params.maxMemoryUsage - Maximum memory usage in MB before forcing GC
   * @returns {Object} Processed data with batch processing information
   */
  async fetchDataWithBatching(params) {
    const {
      batchSize = this.DEFAULT_BATCH_SIZE,
      enableBatchProcessing = false,
      maxMemoryUsage = 500, // 500MB default
      ...otherParams
    } = params;

    // Validate batch size
    const validatedBatchSize = Math.min(
      Math.max(batchSize, 100),
      this.MAX_BATCH_SIZE
    );

    // Get total count to decide processing strategy
    const { modelNames, filter, group, advancedFilterData = {} } = otherParams;
    let filterQuery = await buildFilterQuery(filter, group, advancedFilterData);
    const totalCount = await ClientModel.countDocuments(filterQuery);

    // Use batch processing if explicitly enabled or if dataset is large
    if (enableBatchProcessing || totalCount > validatedBatchSize) {
      return await this.fetchData({
        ...otherParams,
        batchSize: validatedBatchSize,
      });
    } else {
      // Use direct processing for smaller datasets
      return await this.fetchData(otherParams);
    }
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
    const validatedBatchSize = Math.min(
      Math.max(batchSize, 100),
      this.MAX_BATCH_SIZE
    );

    // Get total count to decide processing strategy
    const { modelNames, filter, group, advancedFilterData = {} } = otherParams;
    let filterQuery = await buildFilterQuery(filter, group, advancedFilterData);
    const totalCount = await ClientModel.countDocuments(filterQuery);

    // Use batch processing if explicitly enabled or if dataset is large
    if (enableBatchProcessing || totalCount > validatedBatchSize) {
      return await this.fetchAllData({
        ...otherParams,
        batchSize: validatedBatchSize,
      });
    } else {
      // Use direct processing for smaller datasets
      return await this._processAllDataDirectly(
        filterQuery,
        modelNames,
        advancedFilterData,
        false
      );
    }
  }
}

// Create and export a singleton instance
const dataService = new DataService();
export default dataService;
