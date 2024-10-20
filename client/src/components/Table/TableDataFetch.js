import { useState, useEffect } from "react";
import io from "socket.io-client";

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
    const socket = io("http://localhost:3001");

    socket.on("data-update", (updateData) => {
      handleDataUpdate(updateData);
    });

    socket.on("hrg-update", (updateData) => {
      handleDataUpdate(updateData);
    });

    socket.on("user-update", (updateData) => {
      handleDataUpdate(updateData);
    });

    socket.on("user_status_change", ({ userId, status }) => {
      setData((prevData) =>
        prevData.map((user) =>
          user._id === userId ? { ...user, status: { status } } : user,
        ),
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleDataUpdate = (updateData) => {
    setData((prevData) => {
      switch (updateData.type) {
        case "add":
          return [...prevData, updateData.data];
        case "update":
          return prevData.map((item) =>
            item._id === updateData.data._id || item.id === updateData.data.id
              ? updateData.data
              : item,
          );
        case "delete":
          return prevData.filter(
            (item) =>
              item.id !== updateData.data._id && item.id !== updateData.data.id,
          );
        case "init":
          return updateData.data;
        default:
          return prevData;
      }
    });
  };

  return { data, setData, error, loading };
}
