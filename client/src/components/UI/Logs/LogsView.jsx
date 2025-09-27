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
import userService from "../../../services/userService";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";

const LogsView = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [users, setUsers] = useState([]);
  const [goToPageInput, setGoToPageInput] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({
    clientId: "",
    action: "all",
    startDate: "",
    endDate: "",
    userId: "all",
  });

  // Fetch users for filter dropdown
  const fetchUsers = useCallback(async () => {
    try {
      const usersData = await userService.getUsers(1, 1000); // Get all users
      setUsers(usersData);
    } catch (err) {
      console.error("Error fetching users:", err);
      toast.error("Failed to fetch users");
    }
  }, []);

  // Initialize socket connection and fetch users
  useEffect(() => {
    const socket = io(`http://${import.meta.env.VITE_IP_ADDRESS}:3001`);

    socket.on("connect", () => {
      console.log("Connected to WebSocket");
    });

    socket.on("data-update", (data) => {
      // Refresh logs when any client data is updated
      fetchLogs();
    });

    // Fetch users on component mount
    fetchUsers();

    return () => {
      socket.disconnect();
    };
  }, [fetchUsers]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await logsService.getAllLogs({
        page,
        limit: pageSize,
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
  }, [page, pageSize, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (key, value) => {
    if ((key === "action" || key === "userId") && value === "all") {
      setFilters((prev) => ({
        ...prev,
        [key]: "all",
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
      }));
    }
    setPage(1);
  };

  const handleGoToPage = () => {
    const pageNumber = parseInt(goToPageInput);
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setPage(pageNumber);
      setGoToPageInput("");
    } else {
      toast.error(`Please enter a page number between 1 and ${totalPages}`);
    }
  };

  const handleGoToFirst = () => {
    setPage(1);
  };

  const handleGoToLast = () => {
    setPage(totalPages);
  };

  const handlePageInputChange = (e) => {
    const value = e.target.value;
    if (
      value === "" ||
      (Number.isInteger(Number(value)) && Number(value) > 0)
    ) {
      setGoToPageInput(value);
    }
  };

  const handlePageInputKeyPress = (e) => {
    if (e.key === "Enter") {
      handleGoToPage();
    }
  };

  const handlePageSizeChange = (value) => {
    setPageSize(parseInt(value));
    setPage(1); // Reset to first page when changing page size
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

        <Select
          value={filters.userId}
          onValueChange={(value) => handleFilterChange("userId", value)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by user" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {users.map((user) => (
              <SelectItem key={user._id} value={user._id}>
                {user.username}
              </SelectItem>
            ))}
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

        <Select
          value={pageSize.toString()}
          onValueChange={handlePageSizeChange}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Rows per page" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5 rows</SelectItem>
            <SelectItem value="10">10 rows</SelectItem>
            <SelectItem value="25">25 rows</SelectItem>
            <SelectItem value="50">50 rows</SelectItem>
            <SelectItem value="100">100 rows</SelectItem>
          </SelectContent>
        </Select>
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

          <div className="flex flex-col sm:flex-row justify-between items-center mt-4 pt-4 border-t gap-4">
            {/* Left side - Navigation buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleGoToFirst}
                disabled={page === 1}
                className="px-3 py-2 bg-blue-500 text-white hover:text-white rounded-md disabled:opacity-50 hover:bg-blue-600 transition-colors"
                title="Go to first page"
              >
                ««
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50 hover:bg-blue-600 transition-colors"
                title="Previous page"
              >
                ‹
              </button>
            </div>

            {/* Center - Page info and go to page input */}
            <div className="flex items-center gap-4">
              <span className="text-gray-600 text-sm">
                Page {page} of {totalPages} ({pageSize} rows per page)
              </span>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Go to:</span>
                  <Input
                    type="text"
                    value={goToPageInput}
                    onChange={handlePageInputChange}
                    onKeyPress={handlePageInputKeyPress}
                    placeholder="Page #"
                    className="w-16 h-8 text-center text-sm"
                  />
                  <button
                    onClick={handleGoToPage}
                    disabled={!goToPageInput}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm disabled:opacity-50 hover:bg-blue-600 transition-colors"
                  >
                    Go
                  </button>
                </div>
              )}
            </div>

            {/* Right side - Navigation buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50 hover:bg-blue-600 transition-colors"
                title="Next page"
              >
                ›
              </button>
              <button
                onClick={handleGoToLast}
                disabled={page === totalPages}
                className="px-3 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50 hover:bg-blue-600 transition-colors"
                title="Go to last page"
              >
                »»
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogsView;
