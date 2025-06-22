// Helper function to parse date strings in various formats
export const parseDate = (dateString) => {
  if (!dateString) return null;
    
  try {
    // Handle "YYYY-MM-DD" format (new standard format)
    if (typeof dateString === 'string' && dateString.includes('-')) {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
        const day = parseInt(parts[2], 10);
        
        // Create date using UTC to avoid timezone issues
        const date = new Date(Date.UTC(year, month, day));
        
        // Validation check
        if (
          date.getUTCFullYear() === year &&
          date.getUTCMonth() === month &&
          date.getUTCDate() === day
        ) {
          return date;
        }
      }
    }

    // Legacy support for "MM/DD/YYYY" format
    if (typeof dateString === 'string' && dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const month = parseInt(parts[0], 10) - 1; // JS months are 0-indexed
        const day = parseInt(parts[1], 10);
        let year = parseInt(parts[2], 10);
        
        // Handle 2-digit years
        if (year < 100) {
          year = year < 50 ? 2000 + year : 1900 + year;
        }
        
        // Create date using UTC to avoid timezone issues
        const date = new Date(Date.UTC(year, month, day));
        
        // Validation check
        if (
          date.getUTCFullYear() === year &&
          date.getUTCMonth() === month &&
          date.getUTCDate() === day
        ) {
          return date;
        }
      }
    }
    
    // Try as standard ISO date if not in YYYY-MM-DD or MM/DD/YYYY format
    const date = new Date(dateString);
    
    // For ISO string dates, set the time to noon UTC
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      
      return new Date(Date.UTC(year, month, day, 12, 0, 0));
    }
    
    return null;
  } catch (error) {
    console.error(`Error parsing date ${dateString}:`, error);
    return null;
  }
};

export function validatePaginationParams(page, limit) {
  // Ensure page and limit are numbers
  const validPage = typeof page === "number" && !isNaN(page) ? Math.max(1, page) : 1;
  const validLimit = typeof limit === "number" && !isNaN(limit) ? Math.max(1, limit) : 20;

  // Calculate skip value
  const skip = (validPage - 1) * validLimit;

  return { validPage, validLimit, skip };
}

// Generate cache key from query parameters
export function generateCacheKey(filter, page, limit, group, advancedFilterData) {
  return JSON.stringify({
    filter,
    page,
    limit,
    group,
    advancedFilterData,
  });
}

// Helper to get target service from filter data
export const getTargetServiceFromFilter = (advancedFilterData) => {
  const KNOWN_SERVICES = ['HRG', 'FOM', 'CAL', 'WMM'];
  
  const normalizeServiceArray = (value) => {
    if (!value) return [];
    
    if (typeof value === 'string') {
      return value.split(',')
        .map(s => s.trim().toUpperCase())
        .filter(s => KNOWN_SERVICES.includes(s));
    }
    
    if (Array.isArray(value)) {
      return value
        .filter(s => s)
        .map(s => typeof s === 'string' ? s.trim().toUpperCase() : String(s).toUpperCase())
        .filter(s => KNOWN_SERVICES.includes(s));
    }
    
    return [];
  };

  const exactServices = normalizeServiceArray(advancedFilterData.exactServices);
  const services = normalizeServiceArray(advancedFilterData.services);
  const hasDateRange = !!(advancedFilterData.startDate || advancedFilterData.endDate);
  
  if (exactServices.length > 0) {
    for (const service of KNOWN_SERVICES) {
      if (exactServices.includes(service)) {
        return service;
      }
    }
  }
  
  if (services.length > 0) {
    for (const service of KNOWN_SERVICES) {
      if (services.includes(service)) {
        return service;
      }
    }
  }
  
  if (hasDateRange) {
    return 'HRG';
  }
  
  return null;
}; 