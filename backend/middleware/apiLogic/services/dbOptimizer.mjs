import mongoose from 'mongoose';

// Database performance monitoring and optimization
class DatabaseOptimizer {
  constructor() {
    this.queryStats = new Map();
    this.slowQueryThreshold = 1000; // 1 second
    this.maxConcurrentQueries = 50;
    this.activeQueries = 0;
    this.queryQueue = [];
  }

  // Monitor query performance
  async monitorQuery(queryName, queryFunction) {
    const startTime = Date.now();
    this.activeQueries++;
    
    try {
      const result = await queryFunction();
      const duration = Date.now() - startTime;
      
      // Track query statistics
      this.updateQueryStats(queryName, duration, true);
      
      // Log slow queries
      if (duration > this.slowQueryThreshold) {
        console.warn(`Slow query detected: ${queryName} took ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateQueryStats(queryName, duration, false);
      throw error;
    } finally {
      this.activeQueries--;
      this.processQueue();
    }
  }

  // Update query statistics
  updateQueryStats(queryName, duration, success) {
    if (!this.queryStats.has(queryName)) {
      this.queryStats.set(queryName, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        minTime: Infinity,
        maxTime: 0,
        errors: 0,
        lastExecuted: null
      });
    }

    const stats = this.queryStats.get(queryName);
    stats.count++;
    stats.totalTime += duration;
    stats.avgTime = stats.totalTime / stats.count;
    stats.minTime = Math.min(stats.minTime, duration);
    stats.maxTime = Math.max(stats.maxTime, duration);
    stats.lastExecuted = new Date();
    
    if (!success) {
      stats.errors++;
    }
  }

  // Queue management for concurrent query limiting
  async queueQuery(queryFunction) {
    if (this.activeQueries < this.maxConcurrentQueries) {
      return this.executeQuery(queryFunction);
    }

    return new Promise((resolve, reject) => {
      this.queryQueue.push({ queryFunction, resolve, reject });
    });
  }

  async executeQuery(queryFunction) {
    this.activeQueries++;
    try {
      const result = await queryFunction();
      return result;
    } finally {
      this.activeQueries--;
      this.processQueue();
    }
  }

  processQueue() {
    while (this.queryQueue.length > 0 && this.activeQueries < this.maxConcurrentQueries) {
      const { queryFunction, resolve, reject } = this.queryQueue.shift();
      this.executeQuery(queryFunction).then(resolve).catch(reject);
    }
  }

  // Get database performance statistics
  getPerformanceStats() {
    const stats = {
      activeQueries: this.activeQueries,
      queuedQueries: this.queryQueue.length,
      queryStats: Object.fromEntries(this.queryStats),
      connectionPool: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    };

    // Calculate overall performance metrics
    let totalQueries = 0;
    let totalTime = 0;
    let totalErrors = 0;

    for (const [_, queryStat] of this.queryStats) {
      totalQueries += queryStat.count;
      totalTime += queryStat.totalTime;
      totalErrors += queryStat.errors;
    }

    stats.overall = {
      totalQueries,
      totalTime,
      avgQueryTime: totalQueries > 0 ? totalTime / totalQueries : 0,
      errorRate: totalQueries > 0 ? (totalErrors / totalQueries) * 100 : 0,
      successRate: totalQueries > 0 ? ((totalQueries - totalErrors) / totalQueries) * 100 : 0
    };

    return stats;
  }

  // Optimize database connection
  optimizeConnection() {
    // Set connection pool options for better performance
    const connectionOptions = {
      maxPoolSize: 10, // Limit connection pool size for low-spec servers
      minPoolSize: 2,
      maxIdleTimeMS: 30000, // Close idle connections after 30 seconds
      serverSelectionTimeoutMS: 5000, // Faster server selection
      socketTimeoutMS: 45000, // Socket timeout
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false // Disable command buffering
    };

    return connectionOptions;
  }

  // Clear old statistics
  clearOldStats() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [queryName, stats] of this.queryStats) {
      if (stats.lastExecuted && stats.lastExecuted.getTime() < oneHourAgo) {
        this.queryStats.delete(queryName);
      }
    }
  }
}

// Create singleton instance
const dbOptimizer = new DatabaseOptimizer();

// Export optimized query wrapper
export async function optimizedQuery(queryName, queryFunction) {
  return dbOptimizer.monitorQuery(queryName, queryFunction);
}

// Export queue management
export async function queuedQuery(queryFunction) {
  return dbOptimizer.queueQuery(queryFunction);
}

// Export performance monitoring
export function getPerformanceStats() {
  return dbOptimizer.getPerformanceStats();
}

// Export connection optimization
export function getConnectionOptions() {
  return dbOptimizer.optimizeConnection();
}

// Export cleanup function
export function clearOldStats() {
  dbOptimizer.clearOldStats();
}

export default dbOptimizer; 