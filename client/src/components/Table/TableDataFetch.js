import { useState, useEffect } from "react";
import { useSocket } from "../../utils/Websocket/useSocket";

export function useDataFetching(fetchFunction, page, pageSize) {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchFunction(setData, page, pageSize);
        setData(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [fetchFunction, page, pageSize]);

  useEffect(() => {
    const handleDataUpdate = (updateData) => {
      setData(prevData => {
        switch (updateData.type) {
          case "add":
            if (!prevData.some(item => item.id === updateData.data.id)) {
              return [updateData.data, ...prevData];
            }
            return prevData;
          case "update":
            return prevData.map(item =>
              item.id === updateData.data.id ? updateData.data : item
            );
          case "delete":
            return prevData.filter(item => item.id !== updateData.data.id);
          case "filter-update":
            return updateData.data.combinedData || prevData;
          default:
            return prevData;
        }
      });
    };

    // Subscribe to WebSocket events using the context
    socket.subscribe("data-update", handleDataUpdate);
    socket.subscribe("hrg-update", handleDataUpdate);
    socket.subscribe("user-update", handleDataUpdate);

    return () => {
      socket.unsubscribe("data-update", handleDataUpdate);
      socket.unsubscribe("hrg-update", handleDataUpdate);
      socket.unsubscribe("user-update", handleDataUpdate);
    };
  }, [socket]);

  return { data, setData, error, loading };
}