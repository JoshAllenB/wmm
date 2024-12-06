import { useState, useEffect } from "react";

export function useDataFetching(fetchFunction, page, pageSize) {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

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
      handleDataUpdate(updateData);
    };

    const socket = webSocketService;
    socket.subscribe("data-update", handleDataUpdate);
    socket.subscribe("hrg-update", handleDataUpdate);
    socket.subscribe("user-update", handleDataUpdate);

    return () => {
      socket.unsubscribe("data-update", handleDataUpdate);
      socket.unsubscribe("hrg-update", handleDataUpdate);
      socket.unsubscribe("user-update", handleDataUpdate);
    };
  }, []);

  return { data, setData, error, loading };
}
