// Response cache to store recent query results (LRU cache)
const responseCache = new Map();
const MAX_CACHE_SIZE = 20;

export function getCachedResponse(cacheKey) {
  return responseCache.get(cacheKey);
}

export function setCachedResponse(cacheKey, result) {
  responseCache.set(cacheKey, result);

  // If cache is too large, remove oldest entry (LRU implementation)
  if (responseCache.size > MAX_CACHE_SIZE) {
    const oldestKey = responseCache.keys().next().value;
    responseCache.delete(oldestKey);
  }
}

export function clearCache() {
  responseCache.clear();
} 