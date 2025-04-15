import React, { useState, useEffect } from "react";
import { dataExportService } from "../services/DataExportService";
import { useUser } from "../utils/Hooks/userProvider"; // Use the existing user context

const DataExport = () => {
  const { userData } = useUser(); // Get the current user from user context
  const [month, setMonth] = useState(new Date().getMonth() + 1); // Current month (1-12)
  const [year, setYear] = useState(new Date().getFullYear()); // Current year
  const [exportStatus, setExportStatus] = useState(
    dataExportService.getExportStatus()
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Month names for the dropdown
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Years for the dropdown (current year and 5 years back)
  const years = Array.from(
    { length: 6 },
    (_, i) => new Date().getFullYear() - i
  );

  useEffect(() => {
    // Subscribe to export status updates
    const handleStatusUpdate = (status) => {
      setExportStatus(status);
      setIsGenerating(status.inProgress);
      setError(status.error);
    };

    if (userData?.id) {
      dataExportService.subscribeToExportStatus(
        userData.id,
        handleStatusUpdate
      );
    }

    // Cleanup on unmount
    return () => {
      if (userData?.id) {
        dataExportService.unsubscribeFromExportStatus(userData.id);
      }
    };
  }, [userData]);

  const handleGenerateReport = async () => {
    if (!userData?.id || !userData?.username) {
      setError("User information is missing. Please log in again.");
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      await dataExportService.generateMonthlyReport(
        month,
        year,
        userData.id,
        userData.username
      );
    } catch (err) {
      setError(err.message || "Failed to generate report");
      setIsGenerating(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!exportStatus.filename) {
      setError("No report available to download");
      return;
    }

    try {
      await dataExportService.downloadReport(exportStatus.filename);
    } catch (err) {
      setError(err.message || "Failed to download report");
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Monthly Report Export
      </h2>

      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Month
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isGenerating}
            >
              {monthNames.map((name, index) => (
                <option key={index + 1} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year
            </label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isGenerating}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className={`px-4 py-2 rounded-md text-white font-medium ${
              isGenerating
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isGenerating ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </div>

      {/* Progress indicator */}
      {exportStatus.inProgress && (
        <div className="mb-6">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-medium text-gray-700">
              {exportStatus.progress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${exportStatus.progress}%` }}
            ></div>
          </div>
          <p className="mt-2 text-sm text-gray-600">{exportStatus.message}</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <p>{error}</p>
        </div>
      )}

      {/* Download button */}
      {exportStatus.filename && !exportStatus.inProgress && !error && (
        <div className="mt-6">
          <button
            onClick={handleDownloadReport}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Download Report
          </button>
        </div>
      )}

      {/* Success message */}
      {exportStatus.message &&
        exportStatus.message.includes("completed successfully") &&
        !exportStatus.inProgress && (
          <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
            <p>{exportStatus.message}</p>
          </div>
        )}
    </div>
  );
};

export default DataExport;
