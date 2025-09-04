import { useState, useCallback } from "react";
import DataTable from "../../Table/DataTable";
import { useAccountingColumns } from "../../Table/Structure/accountingColumn";
import { Input } from "../ShadCN/input";
import { Button } from "../ShadCN/button";
import useDebounce from "../../../utils/Hooks/useDebounce";
import {
  fetchAccounting,
  fetchAllAccounting,
} from "../../Table/Data/accountingData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ShadCN/dialog";
import { toast } from "../ShadCN/hooks/use-toast";

const Accounting = () => {
  const [filtering, setFiltering] = useState("");
  const [startYear, setStartYear] = useState("");
  const [endYear, setEndYear] = useState("");
  const [yearError, setYearError] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState([]);
  const [sorting, setSorting] = useState([{ id: "Date", desc: true }]);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [csvFilename, setCsvFilename] = useState("");
  const [selectedFields, setSelectedFields] = useState([
    "ID No.",
    "Client Name",
    "Amount",
    "Date",
    "PaymentRef/Mode of Payment",
    "Payment OR",
    "Services",
  ]);
  const [exportMode, setExportMode] = useState("current");
  const [isExporting, setIsExporting] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const debouncedFiltering = useDebounce(filtering, 500);

  const columns = useAccountingColumns();

  // Validate year range
  const validateYearRange = useCallback(() => {
    const start = startYear ? parseInt(startYear) : null;
    const end = endYear ? parseInt(endYear) : null;

    // Clear error if both fields are empty
    if (!start && !end) {
      setYearError("");
      return true;
    }

    // Validate year format and range
    const currentYear = new Date().getFullYear();
    const minYear = 1900;

    if (
      start &&
      (isNaN(start) || start < minYear || start > currentYear + 100)
    ) {
      setYearError(
        `Start year must be between ${minYear} and ${currentYear + 100}`
      );
      return false;
    }

    if (end && (isNaN(end) || end < minYear || end > currentYear + 100)) {
      setYearError(
        `End year must be between ${minYear} and ${currentYear + 100}`
      );
      return false;
    }

    if (start && end && start > end) {
      setYearError("Start year cannot be greater than end year");
      return false;
    }

    setYearError("");
    return true;
  }, [startYear, endYear]);

  const handleFetch = useCallback(
    async (page, pageSize, searchTerm, selectedGroup, advancedFilterData) => {
      if (!validateYearRange()) {
        return { data: [], totalPages: 0, totalRecords: 0 };
      }

      setIsLoading(true);
      try {
        // Only update page/pageSize if they're different from current state
        if (page !== undefined && page !== page) {
          setPage(page);
        }
        if (pageSize !== undefined && pageSize !== pageSize) {
          setPageSize(pageSize);
          // Reset to page 1 when changing page size
          if (page !== 1) {
            setPage(1);
            page = 1;
          }
        }

        const result = await fetchAccounting(
          page,
          pageSize,
          searchTerm,
          selectedGroup,
          {
            ...advancedFilterData,
            sortId: sorting[0]?.id,
            sortDesc: sorting[0]?.desc,
            startYear,
            endYear,
            // include model filter
            modelType: selectedModel || undefined,
          }
        );

        setData(result.data || []);
        setTotalPages(result.totalPages || 0);
        setTotalRecords(result.totalRecords || 0);
        return result;
      } catch (error) {
        console.error("Error fetching accounting data:", error);
        setData([]);
        setTotalPages(0);
        return { data: [], totalPages: 0, totalRecords: 0 };
      } finally {
        setIsLoading(false);
      }
    },
    [sorting, startYear, endYear, selectedModel, validateYearRange]
  );

  // Memoize the search handler to prevent unnecessary re-renders
  const handleSearchChange = useCallback((e) => {
    setFiltering(e.target.value);
    // Reset to page 1 when searching
    setPage(1);
  }, []);

  // Memoize the year change handler
  const handleYearChange = useCallback((e, type) => {
    const value = e.target.value;
    if (value === "" || /^\d{0,4}$/.test(value)) {
      if (type === "start") {
        setStartYear(value);
      } else {
        setEndYear(value);
      }
      // Reset to page 1 when changing year filters
      setPage(1);
    }
  }, []);

  // Memoize the refresh handler
  const handleRefresh = useCallback(() => {
    handleFetch(1, pageSize, debouncedFiltering, "", {});
  }, [pageSize, debouncedFiltering, handleFetch]);

  const generateCSV = (dataToExport) => {
    if (!dataToExport || dataToExport.length === 0) {
      toast({
        title: "No Data",
        description: "There is no data to export",
        variant: "destructive",
      });
      return null;
    }
    const headers = [];
    const fieldMap = {
      "ID No.": "ID No.",
      "Client Name": "Client Name",
      Amount: "Amount",
      Date: "Date",
      "PaymentRef/Mode of Payment": "PaymentRef/Mode of Payment",
      "Payment OR": "Payment OR",
      Services: "Services",
    };

    selectedFields.forEach((field) => {
      if (fieldMap[field]) {
        headers.push(fieldMap[field]);
      }
    });

    // Create CSV content
    let csvContent = headers.join(",") + "\n";

    dataToExport.forEach((row) => {
      const rowData = [];

      selectedFields.forEach((field) => {
        switch (field) {
          case "ID No.": {
            rowData.push(row.clientId || "");
            break;
          }
          case "Client Name": {
            const clientName =
              row.clientName === ""
                ? row.company || ""
                : row.clientName || row.company || "";
            rowData.push(`"${clientName.replace(/"/g, '""')}"`);
            break;
          }
          case "Amount": {
            rowData.push(row.paymtamt !== undefined && row.paymtamt !== null && row.paymtamt !== "" ? `${row.paymtamt}` : "N/A");
            break;
          }
          case "Date": {
            const date = row.date
              ? new Date(row.date).toLocaleDateString("en-US")
              : "";
            rowData.push(date);
            break;
          }
          case "PaymentRef/Mode of Payment": {
            const isWmm = row.modelType === "WMM";
            if (isWmm) {
              const ref = row.paymtref || "";
              const form = row.paymtform ? ` - ${row.paymtform}` : "";
              rowData.push(`"${(ref + form).replace(/"/g, '""')}"`);
            } else {
              rowData.push("");
            }
            break;
          }
          case "Payment OR": {
            const isWmm = row.modelType === "WMM";
            const ref = row.paymtref || "";
            rowData.push(isWmm ? "" : ref);
            break;
          }
          case "Services": {
            const model = row.modelType || "";
            rowData.push(model);
            break;
          }
          default: {
            rowData.push("");
          }
        }
      });

      csvContent += rowData.join(",") + "\n";
    });

    return csvContent;
  };

  // Handle CSV Export
  const handleExportCSV = async () => {
    setIsExporting(true);

    try {
      console.log("Starting export process...");

      let dataToExport;
      if (exportMode === "current") {
        console.log("Exporting current page data", data);
        dataToExport = data;
      } else {
        console.log("Fetching all data for export...");
        dataToExport = await fetchAllAccounting(debouncedFiltering, {
          sortId: sorting[0]?.id,
          sortDesc: sorting[0]?.desc,
          startYear,
          endYear,
          modelType: selectedModel || undefined,
        });
        console.log("Fetched all data:", dataToExport);
      }

      const csvContent = generateCSV(dataToExport);
      if (!csvContent) {
        console.warn("No CSV content generated");
        return;
      }

      const defaultFilename = `accounting_export_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      const filename = csvFilename.trim() || defaultFilename;
      const finalFilename = filename.endsWith(".csv")
        ? filename
        : `${filename}.csv`;

      console.log("Creating blob with content length:", csvContent.length);
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      console.log("Created object URL:", url);

      // Create and trigger download
      console.log("Creating download link...");
      const link = document.createElement("a");
      link.href = url;
      link.download = finalFilename;
      link.style.position = "absolute";
      link.style.left = "-9999px";

      console.log("Appending link to body...");
      document.body.appendChild(link);

      console.log("Triggering click...");
      link.click();

      // Cleanup
      setTimeout(() => {
        console.log("Cleaning up...");
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      console.log("Showing success toast...");
      setCsvFilename("");
      setShowExportDialog(false);
      toast({
        title: "Export Successful",
        description: "CSV File has been downloaded",
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export data",
        variant: "destructive",
      });
    } finally {
      console.log("Export process complete");
      setIsExporting(false);
    }
  };

  // Toggle field selection
  const toggleField = (field) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  return (
    <div className="mr-[10px] ml-[10px] mt-[10px]">
      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Input
              placeholder="Search by name, OR#/MS/GCASH numbers (e.g., 'OR# 45424', 'MS 001615', or just numbers)"
              value={filtering}
              onChange={handleSearchChange}
              className="pr-8"
            />
            {isLoading && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex gap-2 items-center">
              <Input
                type="text"
                placeholder="Start Year"
                value={startYear}
                onChange={(e) => handleYearChange(e, "start")}
                className="w-24 text-base text-bold"
                maxLength={4}
              />
              <span className="self-center">-</span>
              <Input
                type="text"
                placeholder="End Year"
                value={endYear}
                onChange={(e) => handleYearChange(e, "end")}
                className="w-24 text-base text-bold"
                maxLength={4}
              />
            </div>
            {yearError && (
              <span className="text-base text-red-500">{yearError}</span>
            )}
          </div>
          <div className="flex items-center">
            <select
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                setPage(1);
                // trigger refresh with new filter
                handleFetch(1, pageSize, debouncedFiltering, "", {});
              }}
              className="border px-2 py-1 h-[40px] text-base"
            >
              <option value="">All</option>
              <option value="WMM">WMM</option>
              <option value="HRG">HRG</option>
              <option value="FOM">FOM</option>
              <option value="CAL">CAL</option>
            </select>
          </div>

          <Button
            onClick={handleRefresh}
            className="bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200"
            disabled={isLoading || !!yearError}
          >
            {isLoading ? "Loading..." : "Refresh"}
          </Button>
          <Button
            onClick={() => setShowExportDialog(true)}
            className="bg-green-100 text-green-800 border border-green-300 hover:bg-green-200"
            disabled={isLoading || data.length === 0}
          >
            Export CSV
          </Button>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={data}
        fetchFunction={handleFetch}
        initialPageSize={pageSize}
        initialPage={page}
        totalPages={totalPages}
        totalRecords={totalRecords}
        usePagination={true}
        searchTerm={debouncedFiltering}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        isLoading={isLoading}
        sorting={sorting}
        onSortingChange={setSorting}
        enableSorting={true}
      />
      {data.length > 0 && (
        <div className="text-sm text-gray-600 self-center whitespace-nowrap">
          Showing {data.length} of {totalRecords} records
        </div>
      )}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export Accounting Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Filename</label>
              <Input
                type="text"
                value={csvFilename}
                onChange={(e) => setCsvFilename(e.target.value)}
                placeholder={`accounting_export_${new Date()
                  .toISOString()
                  .slice(0, 10)}`}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to use default filename
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Export Mode
              </label>
              <div className="flex gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={exportMode === "current"}
                    onChange={() => setExportMode("current")}
                  />
                  <span>Current Page ({data.length} records)</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={exportMode === "all"}
                    onChange={() => setExportMode("all")}
                  />
                  <span>All Filtered Records</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Select Fields to Export
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "ID No.",
                  "Client Name",
                  "Amount",
                  "Date",
                  "PaymentRef/Mode of Payment",
                  "Payment OR",
                  "Services",
                ].map((field) => (
                  <div key={field} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`field-${field}`}
                      checked={selectedFields.includes(field)}
                      onChange={() => toggleField(field)}
                      className="mr-2"
                    />
                    <label htmlFor={`field-${field}`} className="text-sm">
                      {field}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowExportDialog(false)}
                disabled={isExporting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleExportCSV}
                disabled={selectedFields.length === 0 || isExporting}
              >
                {isExporting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Exporting...
                  </div>
                ) : (
                  "Export CSV"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Accounting;
