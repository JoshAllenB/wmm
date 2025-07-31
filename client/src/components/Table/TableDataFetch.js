import { useState, useEffect, useCallback } from "react";
import { useSocket } from "../../utils/Websocket/useSocket";

export function useDataFetching(fetchFunction, page, pageSize) {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const { subscribe, unsubscribe } = useSocket();

  // Create a stable fetchData function
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFunction(setData, page, pageSize);
      if (result && result.data) {
        setData(result.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, page, pageSize]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Socket update handler
  useEffect(() => {
    const handleDataUpdate = (updateData) => {
      console.log("[TableDataFetch] Raw update data:", updateData);
      
      // Handle array format by taking the first item
      const processedData = Array.isArray(updateData) ? updateData[0] : updateData;
      console.log("[TableDataFetch] Processed update data:", processedData);
      
      if (!processedData || !processedData.type) {
        console.warn("[TableDataFetch] Invalid update data received");
        return;
      }

      setData(prevData => {
        if (!Array.isArray(prevData)) {
          console.warn("[TableDataFetch] Previous data is not an array:", prevData);
          return prevData;
        }

        console.log("[TableDataFetch] Previous data:", prevData);
        
        switch (processedData.type) {
          case "add":
            if (!prevData.some(item => item.id === processedData.data.id)) {
              const newData = [processedData.data, ...prevData];
              console.log("[TableDataFetch] Added new item:", newData);
              return newData;
            }
            return prevData;
            
          case "update":
            const updatedData = prevData.map(item => {
              if (item.id === processedData.data.id) {
                const updatedItem = {
                  ...item,
                  ...processedData.data,
                  wmmData: processedData.data.wmmData || item.wmmData,
                  hrgData: processedData.data.hrgData || item.hrgData,
                  fomData: processedData.data.fomData || item.fomData,
                  calData: processedData.data.calData || item.calData,
                  promoData: processedData.data.promoData || item.promoData,
                  compData: processedData.data.compData || item.compData,
                  services: Array.from(new Set([
                    ...(item.services || []),
                    ...(processedData.data.services || [])
                  ]))
                };
                console.log("[TableDataFetch] Updated item:", updatedItem);
                return updatedItem;
              }
              return item;
            });
            console.log("[TableDataFetch] Updated data:", updatedData);
            return updatedData;
            
          case "delete":
            const filteredData = prevData.filter(item => item.id !== processedData.data.id);
            console.log("[TableDataFetch] After delete:", filteredData);
            return filteredData;
            
          case "filter-update":
            // If we have combinedData, merge it with current filters
            if (Array.isArray(processedData.data.combinedData)) {
              console.log("[TableDataFetch] Filter update with current filters");
              // Return the filtered data while preserving current filter state
              return processedData.data.combinedData.filter(item => {
                // Apply any active filters here
                const matchesFilter = true; // This will be replaced by actual filter logic
                return matchesFilter;
              });
            }
            return prevData;
            
          case "sync-complete":
            // Trigger a full data refresh
            fetchData();
            return prevData;
            
          default:
            return prevData;
        }
      });
    };

    // Subscribe to all relevant events
    const unsubscribers = [
      subscribe("data-update", handleDataUpdate),
      subscribe("hrg-update", handleDataUpdate),
      subscribe("user-update", handleDataUpdate)
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [subscribe, unsubscribe, fetchData]); // Add fetchData to dependencies

  return { data, setData, error, loading, refetch: fetchData };
}