import React, { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Input } from "../ShadCN/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ShadCN/select";
import logsService from "../../../services/logsService";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";

const LogsView = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    clientId: "",
    action: "all",
    startDate: "",
    endDate: "",
  });

  // Initialize socket connection
  useEffect(() => {
    const socket = io(`http://${import.meta.env.VITE_IP_ADDRESS}:3001`);

    socket.on("connect", () => {
      console.log("Connected to WebSocket");
    });

    socket.on("data-update", (data) => {
      // Refresh logs when any client data is updated
      fetchLogs();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await logsService.getAllLogs({
        page,
        ...filters,
      });

      setLogs(response.logs);
      setTotalPages(response.pagination.pages);
    } catch (err) {
      setError("Failed to fetch logs");
      toast.error("Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (key, value) => {
    if (key === "action" && value === "all") {
      const { action, ...restFilters } = filters;
      setFilters({ ...restFilters, action: "all" });
    } else {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
      }));
    }
    setPage(1);
  };

  const getActionColor = (action) => {
    switch (action) {
      case "create":
        return "text-green-600";
      case "update":
        return "text-blue-600";
      case "delete":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const renderChanges = (changes, action) => {
    if (action === "create") {
      return changes.map((change, index) => (
        <div key={index} className="text-sm">
          <span className="font-medium">{change.field}:</span>{" "}
          {change.newValue ? (
            <span className="text-green-500">{change.newValue}</span>
          ) : (
            <span className="text-gray-400 italic">not set</span>
          )}
        </div>
      ));
    }

    return changes.map((change, index) => (
      <div key={index} className="text-sm">
        <span className="font-medium">{change.field}:</span>{" "}
        {change.oldValue !== undefined && (
          <>
            {change.oldValue ? (
              <span className="text-red-500">{change.oldValue}</span>
            ) : (
              <span className="text-gray-400 italic">not set</span>
            )}{" "}
            <span className="text-gray-500">→</span>{" "}
          </>
        )}
        {change.newValue ? (
          <span className="text-green-500">{change.newValue}</span>
        ) : (
          <span className="text-gray-400 italic">not set</span>
        )}
      </div>
    ));
  };
  return (
    <div className="space-y-4 h-[750px] flex flex-col">
      <div className="flex flex-wrap gap-4 mb-4">
        <Input
          type="text"
          placeholder="Client ID"
          value={filters.clientId}
          onChange={(e) => handleFilterChange("clientId", e.target.value)}
          className="w-[150px]"
        />

        <Select
          value={filters.action}
          onValueChange={(value) => handleFilterChange("action", value)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={filters.startDate}
          onChange={(e) => handleFilterChange("startDate", e.target.value)}
          className="w-[150px]"
        />

        <Input
          type="date"
          value={filters.endDate}
          onChange={(e) => handleFilterChange("endDate", e.target.value)}
          className="w-[150px]"
        />
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Scrollable logs container */}
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            {logs.map((log) => (
              <div
                key={log._id}
                className="bg-white rounded-lg shadow p-4 border-l-4 hover:shadow-md transition-shadow"
                style={{
                  borderLeftColor:
                    log.action === "create"
                      ? "#10B981"
                      : log.action === "update"
                      ? "#3B82F6"
                      : "#EF4444",
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span
                      className={`font-semibold ${getActionColor(
                        log.action
                      )} capitalize`}
                    >
                      {log.action}
                    </span>
                    <span className="text-gray-600 ml-2">
                      Client ID: {log.clientId}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {format(new Date(log.timestamp), "MMM d, yyyy HH:mm:ss")}
                  </div>
                </div>

                <div className="text-sm text-gray-600 mb-2">
                  By: {log.userInfo?.username || "Unknown User"}
                </div>

                <div className="bg-gray-50 rounded p-2">
                  {renderChanges(log.changes, log.action)}
                </div>
              </div>
            ))}

            {logs.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No logs found
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-100 rounded-md disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-gray-100 rounded-md disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogsView;
