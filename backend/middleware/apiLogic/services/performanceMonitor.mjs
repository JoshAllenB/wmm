/**
 * Performance monitoring utility for batch processing
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.startTimes = new Map();
  }

  /**
   * Start timing a batch operation
   * @param {string} operationId - Unique identifier for the operation
   * @param {Object} metadata - Additional metadata about the operation
   */
  startTiming(operationId, metadata = {}) {
    this.startTimes.set(operationId, {
      startTime: Date.now(),
      metadata,
    });
  }

  /**
   * End timing and record metrics for a batch operation
   * @param {string} operationId - Unique identifier for the operation
   * @param {Object} results - Results of the operation
   */
  endTiming(operationId, results = {}) {
    const startData = this.startTimes.get(operationId);
    if (!startData) {
      console.warn(`No start time found for operation: ${operationId}`);
      return;
    }

    const endTime = Date.now();
    const duration = endTime - startData.startTime;

    const metrics = {
      operationId,
      duration,
      startTime: startData.startTime,
      endTime,
      metadata: startData.metadata,
      results,
      timestamp: new Date().toISOString(),
    };

    this.metrics.set(operationId, metrics);
    this.startTimes.delete(operationId);

    // Log performance metrics
    this.logMetrics(metrics);

    return metrics;
  }

  /**
   * Log performance metrics
   * @param {Object} metrics - Performance metrics
   */
  logMetrics(metrics) {
    const { operationId, duration, metadata, results } = metrics;

    console.log(`Performance: ${operationId} completed in ${duration}ms`);

    if (metadata.batchSize && results.processedCount) {
      const rate = Math.round((results.processedCount / duration) * 1000);
      console.log(`  Processing rate: ${rate} records/second`);
    }

    if (metadata.totalBatches && results.currentBatch) {
      console.log(
        `  Batch ${results.currentBatch}/${metadata.totalBatches} completed`
      );
    }
  }

  /**
   * Get performance summary for batch processing
   * @param {string} operationId - Operation identifier
   * @returns {Object} Performance summary
   */
  getSummary(operationId) {
    const metrics = this.metrics.get(operationId);
    if (!metrics) return null;

    const { duration, metadata, results } = metrics;

    return {
      operationId,
      totalDuration: duration,
      averageBatchTime: metadata.totalBatches
        ? duration / metadata.totalBatches
        : duration,
      processingRate: results.processedCount
        ? Math.round((results.processedCount / duration) * 1000)
        : 0,
      successRate:
        results.processedCount && metadata.totalCount
          ? (results.processedCount / metadata.totalCount) * 100
          : 100,
      memoryUsage: process.memoryUsage(),
      timestamp: metrics.timestamp,
    };
  }

  /**
   * Get all performance metrics
   * @returns {Array} Array of all performance metrics
   */
  getAllMetrics() {
    return Array.from(this.metrics.values());
  }

  /**
   * Clear old metrics (keep only last 100)
   */
  cleanup() {
    const metricsArray = Array.from(this.metrics.entries());
    if (metricsArray.length > 100) {
      // Keep only the most recent 100 metrics
      const sortedMetrics = metricsArray
        .sort((a, b) => b[1].timestamp.localeCompare(a[1].timestamp))
        .slice(0, 100);

      this.metrics.clear();
      sortedMetrics.forEach(([key, value]) => {
        this.metrics.set(key, value);
      });
    }
  }

  /**
   * Monitor memory usage
   * @returns {Object} Memory usage statistics
   */
  getMemoryUsage() {
    const memUsage = process.memoryUsage();
    return {
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024), // MB
      arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024), // MB
    };
  }

  /**
   * Check if memory usage is high
   * @param {number} thresholdMB - Memory threshold in MB (default: 500MB)
   * @returns {boolean} True if memory usage is above threshold
   */
  isMemoryUsageHigh(thresholdMB = 500) {
    const memUsage = this.getMemoryUsage();
    return memUsage.heapUsed > thresholdMB;
  }
}

// Create and export a singleton instance
const performanceMonitor = new PerformanceMonitor();
export default performanceMonitor;
