import axios from "axios";

export const clientData = []; // Initialize as empty array

export const fetchClients = async (
  page = 1,
  pageSize = 20,
  filter = "",
  group = "",
  advancedFilterData = {},
  subscriptionType = "WMM"
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 30000); // 30 second timeout
  
  try {
    // Normalize filter parameters
    const normalizedParams = {
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
      filter: filter || "",
      group: group || "",
      subscriptionType: subscriptionType || "WMM", // Add subscription type as standalone parameter
    };

    // Process advanced filter data to ensure proper types
    const processedAdvancedData = { ...advancedFilterData };

    // Ensure services is always an array
    if (processedAdvancedData.services) {
      if (typeof processedAdvancedData.services === "string") {
        processedAdvancedData.services = processedAdvancedData.services
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (!Array.isArray(processedAdvancedData.services)) {
        processedAdvancedData.services = [];
      }
    }

    // Prepare URL and params
    const baseUrl = `http://${import.meta.env.VITE_IP_ADDRESS}:3001/clients`;

    // Build query string with proper URL encoding
    const queryParams = new URLSearchParams();

    // Add base parameters
    Object.entries(normalizedParams).forEach(([key, value]) => {
      queryParams.append(key, value);
    });

    // Add advanced filter parameters
    Object.entries(processedAdvancedData).forEach(([key, value]) => {
      // Handle arrays properly
      if (Array.isArray(value)) {
        value.forEach((item) => {
          queryParams.append(key, item);
        });
      } else if (value !== null && value !== undefined) {
        queryParams.append(key, value);
      }
    });

    // Make the request with timeout protection
    const response = await axios.get(`${baseUrl}?${queryParams.toString()}`, {
      signal: controller.signal,
      timeout: 30000
    });

    // Clear timeout on successful response
    clearTimeout(timeoutId);

    // Extract all relevant values from the response
    const {
      totalPages,
      combinedData,
      data,
      stats,
      totalCount,
      noData,
      processingInfo,
    } = response.data;

    // Use either combinedData or data, whichever is available
    const clientsData = combinedData || data;

    if (noData) {
      return {
        data: [],
        totalPages: 0,
        stats: {
          clientCount: { total: 0, page: 0 },
          metrics: [],
        },
        noData: true,
        processingInfo: null,
      };
    }

    if (!clientsData || !Array.isArray(clientsData)) {
      console.error("Invalid data format received:", response.data);

      // Instead of throwing an error, return a valid object with empty data
      return {
        data: [],
        totalPages: 0,
        stats: {
          clientCount: { total: 0, page: 0 },
          metrics: [],
        },
        noData: true,
        processingInfo: null,
      };
    }

    const processedData = clientsData.map((client) => ({
      ...client,
      servicesString: client.services ? client.services.join(", ") : "",
    }));

    return {
      data: processedData,
      totalPages,
      stats,
      noData: false,
      processingInfo, // Include processing info if available (from automatic batch processing)
    };
  } catch (e) {
    // Clear timeout in case of error
    clearTimeout(timeoutId);
    
    console.error("Error fetching client data:", e);
    
    // Handle different types of errors
    if (e.name === 'AbortError' || e.code === 'ECONNABORTED') {
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ECONNABORTED';
      throw timeoutError;
    }
    
    if (e.code === 'ERR_NETWORK') {
      const networkError = new Error('Network connection failed');
      networkError.code = 'ERR_NETWORK';
      throw networkError;
    }
    
    throw e;
  }
};
