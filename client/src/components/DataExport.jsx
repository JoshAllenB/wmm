import React, { useState, useEffect } from "react";
import { dataExportService } from "../services/DataExportService";
import { useUser } from "../utils/Hooks/userProvider";

const DataExport = () => {
  const { userData, hasRole } = useUser();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [exportStatus, setExportStatus] = useState(
    dataExportService.getExportStatus()
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [exportType, setExportType] = useState("");
  // Removed custom download dialog and filename state
  const [isDownloading, setIsDownloading] = useState(false);

  // FOM-specific state
  const [reportDate, setReportDate] = useState("");

  // Determine available export types based on user roles
  const availableExportTypes = React.useMemo(() => {
    const types = [];
    if (hasRole("WMM")) {
      types.push("WMM");
    }
    if (hasRole("HRG")) {
      types.push("HRG");
    }
    if (hasRole("FOM")) {
      types.push("FOM");
    }
    return types;
  }, [hasRole]);

  // Set initial export type based on available types
  useEffect(() => {
    if (availableExportTypes.length === 1) {
      setExportType(availableExportTypes[0]);
    } else if (availableExportTypes.length > 1) {
      // Default to WMM if user has WMM role, otherwise first available
      setExportType(
        availableExportTypes.includes("WMM") ? "WMM" : availableExportTypes[0]
      );
    } else {
      setExportType(""); // Clear export type if no roles available
      setError("You don't have permission to generate any reports");
    }
  }, [availableExportTypes]);

  // Set default report date when FOM is selected
  useEffect(() => {
    if (exportType === "FOM" && !reportDate) {
      const today = new Date();
      const day = today.getDate();
      const monthNames = [
        "Jan.",
        "Feb.",
        "Mar.",
        "Apr.",
        "May",
        "Jun.",
        "Jul.",
        "Aug.",
        "Sep.",
        "Oct.",
        "Nov.",
        "Dec.",
      ];
      const month = monthNames[today.getMonth()];
      const year = today.getFullYear();
      setReportDate(`${day} ${month} ${year}`);
    }
  }, [exportType, reportDate]);

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

  const years = Array.from(
    { length: 6 },
    (_, i) => new Date().getFullYear() - i
  );

  useEffect(() => {
    const handleStatusUpdate = (status) => {
      setExportStatus(status);
      setIsGenerating(status.inProgress);
      setError(status.error);

      // No longer setting download filename for dialog
    };

    if (userData?.id) {
      dataExportService.subscribeToExportStatus(
        userData.id,
        handleStatusUpdate
      );
    }

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

    if (!exportType) {
      setError("Please select a report type");
      return;
    }

    // Validate FOM-specific requirements
    if (exportType === "FOM" && !reportDate.trim()) {
      setError("Please enter a report date for FOM quarterly report");
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      setIsDownloading(false);
      // Removed dialog and filename reset

      if (exportType === "FOM") {
        await dataExportService.generateFomQuarterlyReport(
          year,
          reportDate,
          userData.id,
          userData.username
        );
      } else {
        await dataExportService.generateMonthlyReport(
          month,
          year,
          userData.id,
          userData.username,
          exportType
        );
      }
    } catch (err) {
      setError(err.message || "Failed to generate report");
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!exportStatus.filename) {
      setError("No file available for download");
      return;
    }

    try {
      setIsDownloading(true);
      setError(null);
      await dataExportService.downloadFile(exportStatus.filename, exportType);
      // Removed dialog close
    } catch (err) {
      console.error("Download error:", err);
      setError(err.message || "Failed to download file. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Removed unused handleDownloadWithCustomName function

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        {exportType === "FOM"
          ? "FOM Quarterly Report Export"
          : "Monthly Report Export"}
      </h2>
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {availableExportTypes.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Type
              </label>
              <select
                value={exportType}
                onChange={(e) => setExportType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isGenerating}
              >
                {availableExportTypes.map((type) => (
                  <option key={type} value={type}>
                    {type} Report
                  </option>
                ))}
              </select>
            </div>
          )}

          {availableExportTypes.length > 0 ? (
            <>
              {exportType !== "FOM" && (
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
              )}

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

              {exportType === "FOM" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Report Date
                  </label>
                  <input
                    type="text"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    placeholder="e.g., 23 Sept. 2025"
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isGenerating}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Format: Day Month Year (e.g., 23 Sept. 2025)
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="col-span-3">
              <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-md">
                <p>
                  You can&apos;t access any report types. Please contact your
                  administrator to get the necessary permissions.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          {availableExportTypes.length > 0 && (
            <button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className={`px-4 py-2 rounded-md text-white font-medium ${
                isGenerating
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isGenerating ? "Generating..." : `Generate ${exportType} Report`}
            </button>
          )}
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
      {/* Success message */}
      {exportStatus.message &&
        exportStatus.message.includes("completed successfully") &&
        !exportStatus.inProgress && (
          <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
            <p className="font-medium">✅ Report Generated Successfully!</p>
            <p className="mt-2">
              Your {exportType} {exportType === "FOM" ? "quarterly" : ""} report
              is ready for download.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
                disabled={isDownloading}
              >
                {isDownloading ? "Downloading..." : "Download"}
              </button>
            </div>
          </div>
        )}
    </div>
  );
};

export default DataExport;
