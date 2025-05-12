import axios from "axios";

export const clientData = []; // Initialize as empty array

// Keep track of in-flight requests to prevent race conditions
const pendingRequests = new Map();

export const fetchClients = async (
  page = 1,
  pageSize = 20,
  filter = "",
  group = "",
  advancedFilterData = {}
) => {
  try {
    // Normalize filter parameters
    const normalizedParams = {
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
      filter: filter || "",
      group: group || ""
    };

    // Process advanced filter data to ensure proper types
    const processedAdvancedData = { ...advancedFilterData };
    
    // Ensure services is always an array
    if (processedAdvancedData.services) {
      if (typeof processedAdvancedData.services === 'string') {
        processedAdvancedData.services = processedAdvancedData.services
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
      } else if (!Array.isArray(processedAdvancedData.services)) {
        processedAdvancedData.services = [];
      }
    }
    
    // Create a request ID based on the parameters to detect duplicates
    const requestId = JSON.stringify({ 
      ...normalizedParams, 
      ...processedAdvancedData 
    });
    
    // Cancel previous request with same parameters if it exists
    if (pendingRequests.has(requestId)) {
      const controller = pendingRequests.get(requestId);
      controller.abort();
      pendingRequests.delete(requestId);
    }
    
    // Create abort controller for this request
    const controller = new AbortController();
    pendingRequests.set(requestId, controller);
    
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
        value.forEach(item => {
          queryParams.append(key, item);
        });
      } else if (value !== null && value !== undefined) {
        queryParams.append(key, value);
      }
    });
    
    // Make the request
    const response = await axios.get(
      `${baseUrl}?${queryParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        signal: controller.signal
      }
    );
    
    // Remove request from pending list
    pendingRequests.delete(requestId);

    const {
      totalPages,
      combinedData,
      data,
      totalCopies,
      pageSpecificCopies,
      totalCalQty,
      totalCalAmt,
      pageSpecificCalQty,
      pageSpecificCalAmt,
      totalHrgAmt,
      totalFomAmt,
      totalCalPaymtAmt,
      pageSpecificHrgAmt,
      pageSpecificFomAmt,
      pageSpecificCalPaymtAmt,
      totalClients,
      pageSpecificClients,
      filteredTotalCopies,
      filteredTotalClients,
      absoluteTotalClients,
      absoluteTotalCopies,
      totalCount,
      noData,
    } = response.data;

    // Use either combinedData or data, whichever is available
    const clientsData = combinedData || data;

    if (noData) {
      return {
        data: [],
        totalPages: 0,
        totalCopies: 0,
        pageSpecificCopies: 0,
        totalCalQty: 0,
        totalCalAmt: 0,
        pageSpecificCalQty: 0,
        pageSpecificCalAmt: 0,
        totalHrgAmt: 0,
        totalFomAmt: 0,
        totalCalPaymtAmt: 0,
        pageSpecificHrgAmt: 0,
        pageSpecificFomAmt: 0, 
        pageSpecificCalPaymtAmt: 0,
        totalClients: 0,
        pageSpecificClients: 0,
        absoluteTotalClients: 0,
        absoluteTotalCopies: 0,
        noData: true,
      };
    }

    if (!clientsData || !Array.isArray(clientsData)) {
      console.error("Invalid data format received:", response.data);
      
      // Instead of throwing an error, return a valid object with empty data
      return {
        data: [],
        totalPages: 0,
        totalCopies: 0,
        pageSpecificCopies: 0,
        totalCalQty: 0,
        totalCalAmt: 0,
        pageSpecificCalQty: 0,
        pageSpecificCalAmt: 0,
        totalHrgAmt: 0,
        totalFomAmt: 0,
        totalCalPaymtAmt: 0,
        pageSpecificHrgAmt: 0,
        pageSpecificFomAmt: 0, 
        pageSpecificCalPaymtAmt: 0,
        totalClients: 0,
        pageSpecificClients: 0,
        absoluteTotalClients: 0,
        absoluteTotalCopies: 0,
        noData: true,
      };
    }

    const processedData = clientsData.map((client) => ({
      ...client,
      servicesString: client.services ? client.services.join(", ") : "",
    }));

    return {
      data: processedData,
      totalPages,
      totalCopies,
      pageSpecificCopies,
      totalCalQty,
      totalCalAmt,
      pageSpecificCalQty,
      pageSpecificCalAmt,
      totalHrgAmt,
      totalFomAmt,
      totalCalPaymtAmt,
      pageSpecificHrgAmt,
      pageSpecificFomAmt,
      pageSpecificCalPaymtAmt,
      totalClients: totalClients || totalCount || processedData.length,
      pageSpecificClients: pageSpecificClients || processedData.length,
      filteredTotalCopies: filteredTotalCopies || totalCopies || 0,
      filteredTotalClients: filteredTotalClients || totalClients || totalCount || processedData.length,
      absoluteTotalClients: absoluteTotalClients || 0,
      absoluteTotalCopies: absoluteTotalCopies || 0,
      noData: false,
    };
  } catch (e) {
    // Handle aborted requests (don't treat as errors)
    if (e.name === 'AbortError' || e.name === 'CanceledError') {
      console.log('Request was canceled due to a newer request');
      return null;
    }
    
    console.error("Error fetching client data:", e);
    throw e;
  }
};
