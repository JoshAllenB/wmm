import React, { useState } from "react";
import { Button } from "../UI/ShadCN/button";
import { toast } from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../UI/ShadCN/dialog";

const CsvExport = ({
  selectedRows,
  dataSource,
  startClientId,
  endClientId,
  setDataSource,
  setStartClientId,
  setEndClientId,
  getRowCount,
  table,
  allData,
  useAllData,
  setUseAllData,
  onClose,
  onRefreshAllData,
  isOpen = false,
  subscriptionType = "WMM", // Add default subscription type
}) => {
  // State for custom filename
  const [csvFilename, setCsvFilename] = useState("");
  // Fields to include in CSV
  const [csvIncludeFields, setCsvIncludeFields] = useState([
    // Basic fields (All users)
    "id", // ClientID
    "name", // Name
    "address", // Address
    "contactnos", // Contact Number
    "acode", // AreaCode

    // WMM fields
    "company", // Company Name
    "copies", // Copies
    "enddate", // Expiry Date
    "subsclass", // Subscription Class
    "subsdate", // Subscription Date

    // Service-specific fields
    "hrgData", // HRG Data
    "fomData", // FOM Data
    "calData", // CAL Data

    // Promo-specific fields
    "referralid", // Referral ID
  ]);

  // Add loading state
  const [isLoadingAllRecords, setIsLoadingAllRecords] = useState(false);

  // Get data source label
  const getDataSourceLabel = () => {
    if (dataSource === "all") {
      return "all matching";
    } else if (dataSource === "selected") {
      return "selected";
    } else {
      return "range";
    }
  };

  // Handle data source change
  const handleDataSourceChange = (source) => {
    setDataSource(source);
  };

  // Enhanced refresh function with progress tracking
  const handleRefreshAllData = async () => {
    setIsLoadingAllRecords(true);

    try {
      const result = await onRefreshAllData?.();

      // Handle the new response format that includes both data and processing info
      if (result) {
        // Return the data part for compatibility
        return result.data || result;
      }

      return result;
    } catch (error) {
      console.error("Error fetching all data:", error);
      toast.error(
        error.message ||
          "Failed to fetch all records. Using table data instead."
      );
      throw error;
    } finally {
      setIsLoadingAllRecords(false);
    }
  };

  // Get the maximum number of address lines used in the dataset
  const getMaxAddressLines = () => {
    let maxLines = 0;
    selectedRows.forEach((row) => {
      const addressLines = row?.original?.address?.split("\n") || [];
      // Only count non-empty lines
      const nonEmptyLines = addressLines.filter(
        (line) => line.trim().length > 0
      ).length;
      maxLines = Math.max(maxLines, nonEmptyLines);
    });
    return maxLines;
  };

  // Analyze dataset to find which fields have data
  const getFieldsWithData = () => {
    const fieldsWithData = {
      id: false,
      title: false,
      lname: false,
      fname: false,
      mname: false,
      company: false,
      address: false,
      cellno: false,
      officeno: false,
      copies: false,
      acode: false,
      enddate: false,
      subsdate: false,
      subsclass: false,
      email: false,
      referralid: false, // Add referralID field
      // Add service-specific data fields
      hrgData: false,
      fomData: false,
      calData: false,
    };

    // Track address lines separately
    const addressLinesUsed = new Set();

    selectedRows.forEach((row) => {
      const subscriber = row.original;

      // Get the appropriate subscription data based on type
      let subscriptionData;
      switch (subscriptionType) {
        case "Promo":
          subscriptionData = subscriber?.promoData;
          break;
        case "Complimentary":
          subscriptionData = subscriber?.compData;
          break;
        default: // WMM
          subscriptionData = subscriber?.wmmData;
      }

      const subscription = subscriptionData?.records?.[0] || {};

      // Check each field for non-empty values
      if (subscriber.id) fieldsWithData.id = true;
      if (typeof subscriber.title === "string" && subscriber.title.trim())
        fieldsWithData.title = true;
      if (typeof subscriber.lname === "string" && subscriber.lname.trim())
        fieldsWithData.lname = true;
      if (typeof subscriber.fname === "string" && subscriber.fname.trim())
        fieldsWithData.fname = true;
      if (typeof subscriber.mname === "string" && subscriber.mname.trim())
        fieldsWithData.mname = true;
      if (typeof subscriber.company === "string" && subscriber.company.trim())
        fieldsWithData.company = true;
      if (typeof subscriber.cellno === "string" && subscriber.cellno.trim())
        fieldsWithData.cellno = true;
      if (typeof subscriber.officeno === "string" && subscriber.officeno.trim())
        fieldsWithData.officeno = true;
      if (subscription.copies) fieldsWithData.copies = true;
      if (subscriber.acode !== undefined && subscriber.acode !== null)
        fieldsWithData.acode = true;
      if (typeof subscriber.email === "string" && subscriber.email.trim())
        fieldsWithData.email = true;
      if (
        typeof subscription.subsclass === "string" &&
        subscription.subsclass.trim()
      )
        fieldsWithData.subsclass = true;
      if (subscription.referralid) fieldsWithData.referralid = true; // Check referralID

      // Check dates
      if (subscription.enddate) {
        const date = new Date(subscription.enddate);
        if (!isNaN(date.getTime())) fieldsWithData.enddate = true;
      }
      if (subscription.subsdate) {
        const date = new Date(subscription.subsdate);
        if (!isNaN(date.getTime())) fieldsWithData.subsdate = true;
      }

      // Check service-specific data
      if (subscriber.hrgData?.records?.length > 0) {
        fieldsWithData.hrgData = true;
      }
      if (subscriber.fomData?.records?.length > 0) {
        fieldsWithData.fomData = true;
      }
      if (subscriber.calData?.records?.length > 0) {
        fieldsWithData.calData = true;
      }

      // Check address lines
      const addressLines =
        typeof subscriber.address === "string"
          ? subscriber.address.split("\n")
          : [];
      addressLines.forEach((line, index) => {
        if (line.trim()) {
          addressLinesUsed.add(index);
          fieldsWithData.address = true;
        }
      });
    });

    return {
      fieldsWithData,
      addressLinesUsed: Array.from(addressLinesUsed).sort((a, b) => a - b),
    };
  };

  // Update generateCSV function to handle different subscription types
  const generateCSV = () => {
    // Filter rows based on start/end Client IDs
    const filteredRows = selectedRows.filter((row) => {
      const clientId = row?.original?.id?.toString();
      if (!clientId) {
        return false;
      }

      // Only apply range filtering if dataSource is "range"
      if (dataSource === "range") {
        const trimmedStartId = startClientId?.trim();
        const trimmedEndId = endClientId?.trim();

        // Convert to numbers for comparison if they look like numbers
        const numericClientId = parseInt(clientId, 10);
        const numericStartId = trimmedStartId
          ? parseInt(trimmedStartId, 10)
          : null;
        const numericEndId = trimmedEndId ? parseInt(trimmedEndId, 10) : null;

        // If all IDs are valid numbers, use numeric comparison
        if (
          !isNaN(numericClientId) &&
          (numericStartId === null || !isNaN(numericStartId)) &&
          (numericEndId === null || !isNaN(numericEndId))
        ) {
          const isAfterStart = numericStartId
            ? numericClientId >= numericStartId
            : true;
          const isBeforeEnd = numericEndId
            ? numericClientId <= numericEndId
            : true;

          return isAfterStart && isBeforeEnd;
        } else {
          // Fallback to string comparison if any ID is not a valid number
          const isAfterStart = trimmedStartId
            ? clientId >= trimmedStartId
            : true;
          const isBeforeEnd = trimmedEndId ? clientId <= trimmedEndId : true;

          return isAfterStart && isBeforeEnd;
        }
      }

      // If not using range filtering, include all rows
      return true;
    });

    if (filteredRows.length === 0) {
      alert("No data found for the specified criteria.");
      return null;
    }

    // Get fields that have data
    const { fieldsWithData, addressLinesUsed } = getFieldsWithData();

    // Define CSV headers based on selected fields and data presence
    const headers = [];

    // Add default fields to headers only if they have data
    if (csvIncludeFields.includes("id") && fieldsWithData.id)
      headers.push("Client ID");
    if (csvIncludeFields.includes("name")) {
      if (fieldsWithData.title) headers.push("Title");
      if (fieldsWithData.lname) headers.push("Last Name");
      if (fieldsWithData.fname) headers.push("First Name");
    }
    if (csvIncludeFields.includes("company") && fieldsWithData.company)
      headers.push("Company");
    if (csvIncludeFields.includes("address") && fieldsWithData.address) {
      // Add address headers based on actual used lines
      addressLinesUsed.forEach((index) => {
        headers.push(`Address Line ${index + 1}`);
      });
    }
    if (csvIncludeFields.includes("contactnos")) {
      if (fieldsWithData.cellno) headers.push("Cell Number");
      if (fieldsWithData.officeno) headers.push("Telephone Number");
    }
    if (csvIncludeFields.includes("copies") && fieldsWithData.copies)
      headers.push("Copies");
    if (csvIncludeFields.includes("acode") && fieldsWithData.acode)
      headers.push("Area Code");
    if (csvIncludeFields.includes("enddate") && fieldsWithData.enddate)
      headers.push("Expiry Date");
    if (csvIncludeFields.includes("subsdate") && fieldsWithData.subsdate)
      headers.push("Subscription Date");
    if (csvIncludeFields.includes("subsclass") && fieldsWithData.subsclass)
      headers.push("Subscription Class");
    if (subscriptionType === "Promo" && fieldsWithData.referralid)
      headers.push("Referral ID");

    // Create CSV content
    let csvContent = headers.join(",") + "\n";
    let processedRows = 0;
    let skippedRows = 0;

    filteredRows.forEach((row, index) => {
      const subscriber = row.original;

      // Get the appropriate subscription data based on type
      let subscriptionData;
      switch (subscriptionType) {
        case "Promo":
          subscriptionData = subscriber?.promoData;
          break;
        case "Complimentary":
          subscriptionData = subscriber?.compData;
          break;
        default: // WMM
          subscriptionData = subscriber?.wmmData;
      }

      const subscription = subscriptionData?.records?.[0] || {};
      const rowData = [];

      try {
        // Add data only for fields that have content
        if (csvIncludeFields.includes("id") && fieldsWithData.id)
          rowData.push(`"${subscriber.id || ""}"`);
        if (csvIncludeFields.includes("name")) {
          if (fieldsWithData.title)
            rowData.push(
              `"${
                typeof subscriber.title === "string" ? subscriber.title : ""
              }"`
            );
          if (fieldsWithData.lname)
            rowData.push(
              `"${
                typeof subscriber.lname === "string" ? subscriber.lname : ""
              }"`
            );
          if (fieldsWithData.fname)
            rowData.push(
              `"${
                typeof subscriber.fname === "string" ? subscriber.fname : ""
              }"`
            );
        }
        if (csvIncludeFields.includes("company") && fieldsWithData.company)
          rowData.push(
            `"${
              typeof subscriber.company === "string" ? subscriber.company : ""
            }"`
          );
        if (csvIncludeFields.includes("address") && fieldsWithData.address) {
          const addressLines =
            typeof subscriber.address === "string"
              ? subscriber.address.split("\n")
              : [];
          addressLinesUsed.forEach((index) => {
            rowData.push(`"${(addressLines[index] || "").trim()}"`);
          });
        }
        if (csvIncludeFields.includes("contactnos")) {
          if (fieldsWithData.cellno)
            rowData.push(
              `"${
                typeof subscriber.cellno === "string" ? subscriber.cellno : ""
              }"`
            );
          if (fieldsWithData.officeno)
            rowData.push(
              `"${
                typeof subscriber.officeno === "string"
                  ? subscriber.officeno
                  : ""
              }"`
            );
        }
        if (csvIncludeFields.includes("copies") && fieldsWithData.copies)
          rowData.push(`"${subscription.copies || ""}"`);
        if (csvIncludeFields.includes("acode") && fieldsWithData.acode)
          rowData.push(
            `"${subscriber.acode !== undefined ? subscriber.acode : ""}"`
          );

        // Format and add dates if they exist
        if (csvIncludeFields.includes("enddate") && fieldsWithData.enddate) {
          let enddate = "";
          if (subscription.enddate) {
            const date = new Date(subscription.enddate);
            if (!isNaN(date.getTime())) {
              enddate = date.toLocaleDateString();
            }
          }
          rowData.push(`"${enddate}"`);
        }

        if (csvIncludeFields.includes("subsdate") && fieldsWithData.subsdate) {
          let subsdate = "";
          if (subscription.subsdate) {
            const date = new Date(subscription.subsdate);
            if (!isNaN(date.getTime())) {
              subsdate = date.toLocaleDateString();
            }
          }
          rowData.push(`"${subsdate}"`);
        }

        if (csvIncludeFields.includes("subsclass") && fieldsWithData.subsclass)
          rowData.push(`"${subscription.subsclass || ""}"`);

        // Add referral ID for promo subscriptions
        if (subscriptionType === "Promo" && fieldsWithData.referralid)
          rowData.push(`"${subscription.referralid || ""}"`);

        if (rowData.length === headers.length) {
          csvContent += rowData.join(",") + "\n";
          processedRows++;
        } else {
          console.warn(`Row ${index + 1} has mismatched columns:`, {
            expected: headers.length,
            got: rowData.length,
            rowData,
            subscriber,
          });
          skippedRows++;
        }
      } catch (error) {
        console.error(`Error processing row ${index + 1}:`, error, subscriber);
        skippedRows++;
      }
    });

    return csvContent;
  };

  // Update the field labels to show if they contain data
  const renderFieldLabel = (field, label) => {
    const { fieldsWithData } = getFieldsWithData();
    if (!fieldsWithData[field]) {
      return <span className="text-gray-400">{label} (No Data)</span>;
    }
    return label;
  };

  // Update the CSV Fields Selection UI to show which fields have data
  const renderAddressFieldLabel = () => {
    const maxLines = getMaxAddressLines();
    if (maxLines === 0) return "Address";
    if (maxLines === 1) return "Address";
    return `Address (Line 1${maxLines > 1 ? ` to ${maxLines}` : ""})`;
  };

  // Handle CSV export
  const handleExportCSV = () => {
    try {
      const csvContent = generateCSV();
      if (!csvContent) {
        toast.error("No data to export");
        return;
      }

      // Generate default filename if custom filename is empty
      const defaultFilename = `subscribers_export_${new Date()
        .toISOString()
        .slice(0, 10)}`;
      const filename = csvFilename.trim() || defaultFilename;

      // Ensure filename ends with .csv
      const finalFilename = filename.endsWith(".csv")
        ? filename
        : `${filename}.csv`;

      // Create a Blob for better memory management
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link element
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", finalFilename);

      // Add to body, click, and remove
      document.body.appendChild(link);

      // Use a Promise to handle the download completion
      const downloadPromise = new Promise((resolve) => {
        link.onclick = () => {
          // Give browser time to start the download
          setTimeout(resolve, 1000);
        };

        link.click();

        // Fallback in case click event doesn't fire
        setTimeout(resolve, 2000);
      });

      // Wait for download to start before cleanup
      downloadPromise.then(() => {
        // Clean up
        if (link.parentNode === document.body) {
          document.body.removeChild(link);
        }
        window.URL.revokeObjectURL(url);

        // Only update state after cleanup
        setCsvFilename(""); // Reset filename after download
        onClose();
        toast.success("CSV exported successfully");
      });
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast.error("Failed to export CSV. Please try again.");

      // Attempt cleanup of any lingering elements
      try {
        const links = document.querySelectorAll("a[download]");
        links.forEach((link) => {
          if (link.parentNode === document.body) {
            document.body.removeChild(link);
          }
        });
      } catch (cleanupError) {
        console.error("Error during cleanup:", cleanupError);
      }
    }
  };

  // Toggle CSV field selection
  const toggleCsvField = (field) => {
    setCsvIncludeFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const hasData = selectedRows.length > 0;

  // Update data source toggle UI
  const DataSourceToggle = () => (
    <div className="flex flex-col gap-2 mb-4">
      <h3 className="text-sm font-medium">Data Source</h3>
      <div className="flex gap-2">
        <Button
          onClick={() => setUseAllData(false)}
          variant={useAllData ? "outline" : "default"}
          className={`flex-1 ${!useAllData ? "bg-blue-600 text-white" : ""}`}
        >
          Selected ({selectedRows.length})
        </Button>
        <Button
          onClick={async () => {
            setUseAllData(true);
            setIsLoadingAllRecords(true);
            try {
              // Trigger parent component to fetch new data
              await handleRefreshAllData();
            } catch (error) {
              console.error("Error fetching all data:", error);
              toast({
                title: "Error",
                description:
                  "Failed to fetch all records. Using table data instead.",
                variant: "destructive",
              });
            } finally {
              setIsLoadingAllRecords(false);
            }
          }}
          variant={useAllData ? "default" : "outline"}
          className={`flex-1 ${useAllData ? "bg-blue-600 text-white" : ""}`}
        >
          {isLoadingAllRecords ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Loading...</span>
            </div>
          ) : (
            `All Records (${allData?.length || 0})`
          )}
        </Button>
      </div>
      {isLoadingAllRecords && (
        <p className="text-xs text-blue-700">Fetching all records...</p>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[30vw]">
        <DialogHeader>
          <DialogTitle>Export CSV</DialogTitle>
        </DialogHeader>
        <div className="w-full">
          <h2 className="flex justify-center text-xl font-bold text-black mb-2">
            Export Subscriber Data to CSV
          </h2>

          <p className="text-center text-sm text-gray-500 mb-4">
            {getRowCount()} {getRowCount() === 1 ? "subscriber" : "subscribers"}{" "}
            {getDataSourceLabel()}
          </p>

          <div className="flex flex-col items-center">
            <DataSourceToggle />

            {/* Filename Input */}
            <div className="w-full max-w-lg p-3 mb-4 bg-gray-50 rounded border">
              <h3 className="text-sm font-semibold mb-2">File Name:</h3>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={csvFilename}
                  onChange={(e) => setCsvFilename(e.target.value)}
                  placeholder={`subscribers_export_${new Date()
                    .toISOString()
                    .slice(0, 10)}`}
                  className="border border-gray-300 rounded p-2 w-full"
                />
                <span className="text-sm text-gray-500">.csv</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to use default filename
              </p>
            </div>

            {/* Data Range Selection */}
            <div className="w-full max-w-lg p-3 mb-4 bg-gray-50 rounded border">
              <h3 className="text-sm font-semibold mb-2">Select Data Range:</h3>
              <div className="flex flex-wrap gap-2 mb-2">
                <Button
                  onClick={() => handleDataSourceChange("all")}
                  variant={dataSource === "all" ? "default" : "outline"}
                  className="flex-1"
                >
                  All Records
                </Button>
                <Button
                  onClick={() => handleDataSourceChange("selected")}
                  variant={dataSource === "selected" ? "default" : "outline"}
                  className="flex-1"
                  disabled={table.getSelectedRowModel().rows.length === 0}
                >
                  Selected Only
                </Button>
                <Button
                  onClick={() => handleDataSourceChange("range")}
                  variant={dataSource === "range" ? "default" : "outline"}
                  className="flex-1"
                >
                  ID Range
                </Button>
              </div>
            </div>

            {/* Client ID Range Input - if range is selected */}
            {dataSource === "range" && (
              <div className="flex flex-col items-center p-4 border rounded mb-4 w-full max-w-lg bg-gray-50">
                <h3 className="text-lg font-semibold mb-2">Export Range</h3>

                <div className="bg-blue-50 p-2 rounded mb-3 w-full text-xs text-blue-700">
                  Specify which subscribers to include using Client IDs.
                </div>

                <div className="flex items-center space-x-2 w-full mb-2">
                  <label
                    htmlFor="startId"
                    className="text-sm w-28 text-right font-medium text-gray-600"
                  >
                    Start Client ID:
                  </label>
                  <input
                    type="text"
                    id="startId"
                    value={startClientId}
                    onChange={(e) => setStartClientId(e.target.value)}
                    placeholder={`First: ${
                      table.getFilteredRowModel().rows[0]?.original?.id || "N/A"
                    }`}
                    className="border border-gray-300 rounded p-2 w-full"
                  />
                </div>
                <div className="flex items-center space-x-2 w-full mb-3">
                  <label
                    htmlFor="endId"
                    className="text-sm w-28 text-right font-medium text-gray-600"
                  >
                    End Client ID:
                  </label>
                  <input
                    type="text"
                    id="endId"
                    value={endClientId}
                    onChange={(e) => setEndClientId(e.target.value)}
                    placeholder={`Last: ${
                      table.getFilteredRowModel().rows[
                        table.getFilteredRowModel().rows.length - 1
                      ]?.original?.id || "N/A"
                    }`}
                    className="border border-gray-300 rounded p-2 w-full"
                  />
                </div>
              </div>
            )}

            {/* CSV Fields Selection */}
            <div className="w-full max-w-lg p-3 mb-4 bg-gray-50 rounded border">
              <h3 className="text-sm font-semibold mb-2">
                Select Fields to Include:
              </h3>

              {/* Basic Fields (All Users) */}
              <div className="mb-4">
                <h4 className="text-xs font-medium text-gray-600 mb-2">
                  Basic Information (All Users):
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="csv-id"
                      checked={csvIncludeFields.includes("id")}
                      onChange={() => toggleCsvField("id")}
                      className="mr-2"
                      disabled
                    />
                    <label htmlFor="csv-id" className="text-sm">
                      Client ID
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="csv-name"
                      checked={csvIncludeFields.includes("name")}
                      onChange={() => toggleCsvField("name")}
                      className="mr-2"
                      disabled
                    />
                    <label htmlFor="csv-name" className="text-sm">
                      Name
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="csv-address"
                      checked={csvIncludeFields.includes("address")}
                      onChange={() => toggleCsvField("address")}
                      className="mr-2"
                      disabled
                    />
                    <label htmlFor="csv-address" className="text-sm">
                      Address
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="csv-acode"
                      checked={csvIncludeFields.includes("acode")}
                      onChange={() => toggleCsvField("acode")}
                      className="mr-2"
                      disabled
                    />
                    <label htmlFor="csv-acode" className="text-sm">
                      Area Code
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="csv-contactnos"
                      checked={csvIncludeFields.includes("contactnos")}
                      onChange={() => toggleCsvField("contactnos")}
                      className="mr-2"
                      disabled
                    />
                    <label htmlFor="csv-contactnos" className="text-sm">
                      Contact Numbers
                    </label>
                  </div>
                </div>
              </div>

              {/* WMM Fields */}
              <div className="mb-4">
                <h4 className="text-xs font-medium text-gray-600 mb-2">
                  WMM Information:
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="csv-company"
                      checked={csvIncludeFields.includes("company")}
                      onChange={() => toggleCsvField("company")}
                      className="mr-2"
                    />
                    <label htmlFor="csv-company" className="text-sm">
                      {renderFieldLabel("company", "Company")}
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="csv-copies"
                      checked={csvIncludeFields.includes("copies")}
                      onChange={() => toggleCsvField("copies")}
                      className="mr-2"
                    />
                    <label htmlFor="csv-copies" className="text-sm">
                      {renderFieldLabel("copies", "Copies")}
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="csv-enddate"
                      checked={csvIncludeFields.includes("enddate")}
                      onChange={() => toggleCsvField("enddate")}
                      className="mr-2"
                    />
                    <label htmlFor="csv-enddate" className="text-sm">
                      {renderFieldLabel("enddate", "Expiry Date")}
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="csv-subsclass"
                      checked={csvIncludeFields.includes("subsclass")}
                      onChange={() => toggleCsvField("subsclass")}
                      className="mr-2"
                    />
                    <label htmlFor="csv-subsclass" className="text-sm">
                      {renderFieldLabel("subsclass", "Subscription Class")}
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="csv-subsdate"
                      checked={csvIncludeFields.includes("subsdate")}
                      onChange={() => toggleCsvField("subsdate")}
                      className="mr-2"
                    />
                    <label htmlFor="csv-subsdate" className="text-sm">
                      {renderFieldLabel("subsdate", "Subscription Date")}
                    </label>
                  </div>
                </div>
              </div>

              {/* Service-specific Fields */}
              <div>
                <h4 className="text-xs font-medium text-gray-600 mb-2">
                  Service-specific Information:
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="csv-hrgData"
                      checked={csvIncludeFields.includes("hrgData")}
                      onChange={() => toggleCsvField("hrgData")}
                      className="mr-2"
                    />
                    <label htmlFor="csv-hrgData" className="text-sm">
                      {renderFieldLabel(
                        "hrgData",
                        "HRG Data (Campaign Date, Payment Amount, Reference, Date, Form)"
                      )}
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="csv-fomData"
                      checked={csvIncludeFields.includes("fomData")}
                      onChange={() => toggleCsvField("fomData")}
                      className="mr-2"
                    />
                    <label htmlFor="csv-fomData" className="text-sm">
                      {renderFieldLabel(
                        "fomData",
                        "FOM Data (Payment Details + Unsubscribe Status)"
                      )}
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="csv-calData"
                      checked={csvIncludeFields.includes("calData")}
                      onChange={() => toggleCsvField("calData")}
                      className="mr-2"
                    />
                    <label htmlFor="csv-calData" className="text-sm">
                      {renderFieldLabel(
                        "calData",
                        "CAL Data (Type, Quantity, Unit Amount + Payment Details)"
                      )}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4 w-full max-w-lg">
              <Button
                onClick={handleExportCSV}
                className="bg-blue-600 hover:bg-blue-700 text-white flex-grow"
                disabled={!hasData || csvIncludeFields.length === 0}
              >
                Export CSV
              </Button>
              <Button
                onClick={onClose}
                variant="secondary"
                className="flex-grow"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CsvExport;
