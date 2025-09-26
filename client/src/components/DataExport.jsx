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
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [downloadFilename, setDownloadFilename] = useState("");
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

      // Set default filename when export completes
      if (status.filename && !status.inProgress) {
        setDownloadFilename(status.filename.replace(".xlsx", ""));
      }
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
      setShowDownloadDialog(false);
      setDownloadFilename("");

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
      setShowDownloadDialog(false);
    } catch (err) {
      console.error("Download error:", err);
      setError(err.message || "Failed to download file. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadWithCustomName = async () => {
    if (!exportStatus.filename) {
      setError("No file available for download");
      return;
    }

    if (!downloadFilename.trim()) {
      setError("Please enter a filename");
      return;
    }

    try {
      setIsDownloading(true);
      setError(null);

      const customFilename = downloadFilename.endsWith(".xlsx")
        ? downloadFilename
        : `${downloadFilename}.xlsx`;

      // Use the service method for consistent download handling
      await dataExportService.downloadFileWithCustomName(
        exportStatus.filename,
        exportType,
        customFilename
      );

      setShowDownloadDialog(false);
    } catch (err) {
      setError(err.message || "Failed to download file");
    } finally {
      setIsDownloading(false);
    }
  };

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
                  You don't have access to any report types. Please contact your
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
                onClick={() => setShowDownloadDialog(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium"
                disabled={isDownloading}
              >
                📥 Download Report
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
                disabled={isDownloading}
              >
                {isDownloading ? "Downloading..." : "Quick Download"}
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              If download doesn't start, try the "Download Report" button or
              check your browser's download settings.
            </div>
            {exportStatus.filename && (
              <div className="mt-3 flex justify-center">
                <button
                  onClick={() => {
                    const downloadUrl = `${
                      import.meta.env.VITE_IP_ADDRESS
                        ? `http://${import.meta.env.VITE_IP_ADDRESS}:3001`
                        : "http://localhost:3001"
                    }/data-export/${
                      exportType === "HRG"
                        ? "download-hrg"
                        : exportType === "FOM"
                        ? "download-fom-quarterly"
                        : "download"
                    }/${exportStatus.filename}`;
                    window.open(downloadUrl, "_blank");
                  }}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 transition-colors"
                >
                  Manual Download
                </button>
              </div>
            )}
          </div>
        )}

      {/* Download Dialog Modal */}
      {showDownloadDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Download Report</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filename (without extension)
              </label>
              <input
                type="text"
                value={downloadFilename}
                onChange={(e) => setDownloadFilename(e.target.value)}
                placeholder={
                  exportStatus.filename
                    ? exportStatus.filename.replace(".xlsx", "")
                    : ""
                }
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isDownloading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Default:{" "}
                {exportStatus.filename
                  ? exportStatus.filename.replace(".xlsx", "")
                  : "report"}
              </p>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                The file will be downloaded to your default download location.
                You can choose where to save it when the download dialog
                appears.
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowDownloadDialog(false);
                  setDownloadFilename("");
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={isDownloading}
              >
                Cancel
              </button>
              <button
                onClick={handleDownloadWithCustomName}
                disabled={isDownloading || !downloadFilename.trim()}
                className={`px-4 py-2 rounded-md text-white font-medium ${
                  isDownloading || !downloadFilename.trim()
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isDownloading ? "Downloading..." : "Download"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataExport;
