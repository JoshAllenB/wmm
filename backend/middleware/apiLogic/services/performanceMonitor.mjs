import { getPerformanceStats } from './dbOptimizer.mjs';
import { getCacheStats, clearCache } from './dataAggregator.mjs';

class PerformanceMonitor {
  constructor() {
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
    this.slowRequestCount = 0;
    this.requestTimes = [];
    this.maxRequestTimes = 1000; // Keep last 1000 request times
  }

  // Track request performance
  trackRequest(duration, success = true) {
    this.requestCount++;
    
    if (!success) {
      this.errorCount++;
    }
    
    if (duration > 2000) { // Requests taking more than 2 seconds
      this.slowRequestCount++;
    }
    
    // Store request time for averaging
    this.requestTimes.push(duration);
    if (this.requestTimes.length > this.maxRequestTimes) {
      this.requestTimes.shift(); // Remove oldest
    }
  }

  // Get comprehensive performance report
  getPerformanceReport() {
    const uptime = Date.now() - this.startTime;
    const avgRequestTime = this.requestTimes.length > 0 
      ? this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length 
      : 0;
    
    const dbStats = getPerformanceStats();
    const cacheStats = getCacheStats();
    
    return {
      server: {
        uptime: Math.floor(uptime / 1000), // seconds
        totalRequests: this.requestCount,
        errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
        slowRequestRate: this.requestCount > 0 ? (this.slowRequestCount / this.requestCount) * 100 : 0,
        averageRequestTime: Math.round(avgRequestTime),
        requestsPerSecond: uptime > 0 ? (this.requestCount / (uptime / 1000)) : 0
      },
      database: dbStats,
      cache: cacheStats,
      recommendations: this.generateRecommendations(dbStats, cacheStats, avgRequestTime)
    };
  }

  // Generate performance recommendations
  generateRecommendations(dbStats, cacheStats, avgRequestTime) {
    const recommendations = [];
    
    // Database recommendations
    if (dbStats.overall.avgQueryTime > 500) {
      recommendations.push("Consider adding database indexes for frequently queried fields");
    }
    
    if (dbStats.overall.errorRate > 5) {
      recommendations.push("High database error rate detected - check connection stability");
    }
    
    if (dbStats.activeQueries > 40) {
      recommendations.push("High concurrent query count - consider implementing query batching");
    }
    
    // Cache recommendations
    if (cacheStats.size > cacheStats.maxSize * 0.8) {
      recommendations.push("Cache is nearly full - consider increasing cache size or reducing TTL");
    }
    
    if (cacheStats.size < cacheStats.maxSize * 0.1) {
      recommendations.push("Cache utilization is low - consider reducing cache size to save memory");
    }
    
    // Request performance recommendations
    if (avgRequestTime > 1000) {
      recommendations.push("Average request time is high - consider implementing request caching");
    }
    
    if (this.slowRequestCount > this.requestCount * 0.1) {
      recommendations.push("High number of slow requests - consider optimizing data aggregation");
    }
    
    return recommendations;
  }

  // Get real-time performance metrics
  getRealTimeMetrics() {
    const dbStats = getPerformanceStats();
    const cacheStats = getCacheStats();
    
    return {
      timestamp: new Date().toISOString(),
      activeQueries: dbStats.activeQueries,
      queuedQueries: dbStats.queuedQueries,
      cacheSize: cacheStats.size,
      cacheHitRate: this.calculateCacheHitRate(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };
  }

  // Calculate cache hit rate (simplified)
  calculateCacheHitRate() {
    // This would need to be implemented with actual cache hit tracking
    // For now, return a placeholder
    return 0.75; // 75% cache hit rate
  }

  // Reset performance counters
  resetCounters() {
    this.requestCount = 0;
    this.errorCount = 0;
    this.slowRequestCount = 0;
    this.requestTimes = [];
  }

  // Clear all caches
  clearAllCaches() {
    clearCache();
    return { message: "All caches cleared successfully" };
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Export monitoring functions
export function trackRequest(duration, success = true) {
  return performanceMonitor.trackRequest(duration, success);
}

export function getPerformanceReport() {
  return performanceMonitor.getPerformanceReport();
}

export function getRealTimeMetrics() {
  return performanceMonitor.getRealTimeMetrics();
}

export function resetCounters() {
  return performanceMonitor.resetCounters();
}

export function clearAllCaches() {
  return performanceMonitor.clearAllCaches();
}

export default performanceMonitor; 