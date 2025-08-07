import React, { useState } from "react";
import { Button } from "../UI/ShadCN/button";
import { toast } from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../UI/ShadCN/dialog";
import { Checkbox } from "../UI/ShadCN/checkbox";
import { Label } from "../UI/ShadCN/label";
import { Input } from "../UI/ShadCN/input";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "../UI/ShadCN/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";

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

  // Add state for collapsible sections
  const [openSections, setOpenSections] = useState({
    basicInfo: true,
    wmmInfo: true,
    serviceInfo: true,
  });

  // Function to toggle collapsible sections
  const toggleSection = (sectionName) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

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

    // Add service-specific headers
    if (csvIncludeFields.includes("hrgData") && fieldsWithData.hrgData) {
      headers.push(
        "HRG Campaign Date",
        "HRG Payment Amount",
        "HRG Payment Reference",
        "HRG Received Date",
        "HRG Form"
      );
    }
    if (csvIncludeFields.includes("fomData") && fieldsWithData.fomData) {
      headers.push(
        "FOM Payment Amount",
        "FOM Payment Reference",
        "FOM Payment Form",
        "FOM Received Date",
        "FOM Unsubscribe Status"
      );
    }
    if (csvIncludeFields.includes("calData") && fieldsWithData.calData) {
      headers.push(
        "CAL Type",
        "CAL Quantity",
        "CAL Unit Amount",
        "CAL Payment Reference",
        "CAL Payment Amount",
        "CAL Payment Form",
        "CAL Payment Date"
      );
    }

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

        // Add service-specific data
        if (csvIncludeFields.includes("hrgData") && fieldsWithData.hrgData) {
          const hrgRecord = subscriber.hrgData?.records?.[0] || {};

          // Format campaign date to show only date without time
          let formattedCampaignDate = "";
          if (hrgRecord.campaigndate) {
            const date = new Date(hrgRecord.campaigndate);
            if (!isNaN(date.getTime())) {
              // Keep YYYY-MM-DD format, remove time
              formattedCampaignDate = date.toISOString().split("T")[0];
            }
          }

          rowData.push(
            `"${formattedCampaignDate}"`,
            `"${hrgRecord.paymtamt || ""}"`,
            `"${hrgRecord.paymtref || ""}"`,
            `"${hrgRecord.recvdate || ""}"`,
            `"${hrgRecord.paymtform || ""}"`
          );
        }
        if (csvIncludeFields.includes("fomData") && fieldsWithData.fomData) {
          const fomRecord = subscriber.fomData?.records?.[0] || {};
          rowData.push(
            `"${fomRecord.paymtamt || ""}"`,
            `"${fomRecord.paymtref || ""}"`,
            `"${fomRecord.paymtform || ""}"`,
            `"${fomRecord.recvdate || ""}"`,
            `"${fomRecord.unsubscribe ? "Unsubscribed" : "Active"}"`
          );
        }
        if (csvIncludeFields.includes("calData") && fieldsWithData.calData) {
          const calRecord = subscriber.calData?.records?.[0] || {};
          rowData.push(
            `"${calRecord.caltype || ""}"`,
            `"${calRecord.calqty || ""}"`,
            `"${calRecord.calamt || ""}"`,
            `"${calRecord.paymtref || ""}"`,
            `"${calRecord.paymtamt || ""}"`,
            `"${calRecord.paymtform || ""}"`,
            `"${calRecord.paymtdate || ""}"`
          );
        }

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
      <DialogContent className="max-w-[32rem] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            Export Subscriber Data
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Data source selection */}
          <div className="space-y-2">
            <Label>Data Source</Label>
            <div className="flex gap-2">
              <Button
                onClick={() => setUseAllData(false)}
                variant={useAllData ? "outline" : "default"}
                className={`flex-1 ${
                  !useAllData
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "border-blue-600 text-blue-600 hover:bg-blue-50"
                }`}
              >
                Selected ({selectedRows.length})
              </Button>
              <Button
                onClick={async () => {
                  setUseAllData(true);
                  setIsLoadingAllRecords(true);
                  try {
                    await handleRefreshAllData();
                  } catch (error) {
                    console.error("Error fetching all data:", error);
                    toast.error(
                      "Failed to fetch all records. Using table data instead."
                    );
                  } finally {
                    setIsLoadingAllRecords(false);
                  }
                }}
                variant={useAllData ? "default" : "outline"}
                className={`flex-1 ${
                  useAllData
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "border-blue-600 text-blue-600 hover:bg-blue-50"
                }`}
              >
                {isLoadingAllRecords ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Loading...
                  </span>
                ) : (
                  `All Records (${allData?.length || 0})`
                )}
              </Button>
            </div>
            {isLoadingAllRecords && (
              <p className="text-xs text-muted-foreground">
                Fetching all records...
              </p>
            )}
          </div>

          {/* File name input */}
          <div className="space-y-2">
            <Label>File Name</Label>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={csvFilename}
                onChange={(e) => setCsvFilename(e.target.value)}
                placeholder={`subscribers_export_${new Date()
                  .toISOString()
                  .slice(0, 10)}`}
              />
              <span className="text-sm text-muted-foreground">.csv</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave blank to use default filename
            </p>
          </div>

          {/* Data range selection */}
          <div className="space-y-2">
            <Label>Data Range</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => handleDataSourceChange("all")}
                variant={dataSource === "all" ? "default" : "outline"}
                className="flex-1 min-w-[100px]"
              >
                All Records
              </Button>
              <Button
                onClick={() => handleDataSourceChange("selected")}
                variant={dataSource === "selected" ? "default" : "outline"}
                className="flex-1 min-w-[100px]"
                disabled={table.getSelectedRowModel().rows.length === 0}
              >
                Selected Only
              </Button>
              <Button
                onClick={() => handleDataSourceChange("range")}
                variant={dataSource === "range" ? "default" : "outline"}
                className="flex-1 min-w-[100px]"
              >
                ID Range
              </Button>
            </div>
          </div>

          {/* Client ID range inputs */}
          {dataSource === "range" && (
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <h4 className="font-medium">Export Range</h4>
              <p className="text-sm text-muted-foreground">
                Specify which subscribers to include using Client IDs
              </p>

              <div className="space-y-2">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="startId">Start Client ID</Label>
                    <Input
                      type="text"
                      id="startId"
                      value={startClientId}
                      onChange={(e) => setStartClientId(e.target.value)}
                      placeholder={`First: ${
                        table.getFilteredRowModel().rows[0]?.original?.id ||
                        "N/A"
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="endId">End Client ID</Label>
                    <Input
                      type="text"
                      id="endId"
                      value={endClientId}
                      onChange={(e) => setEndClientId(e.target.value)}
                      placeholder={`Last: ${
                        table.getFilteredRowModel().rows[
                          table.getFilteredRowModel().rows.length - 1
                        ]?.original?.id || "N/A"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fields selection */}
          <div className="space-y-4">
            <h3 className="font-medium">Fields to Include</h3>

            {/* Basic Information */}
            <Collapsible
              open={openSections.basicInfo}
              onOpenChange={() => toggleSection("basicInfo")}
              className="space-y-2"
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded hover:bg-muted">
                <span className="font-medium">Basic Information</span>
                {openSections.basicInfo ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pl-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="csv-id"
                      checked={csvIncludeFields.includes("id")}
                      onCheckedChange={() => toggleCsvField("id")}
                      disabled
                    />
                    <Label htmlFor="csv-id" className="font-normal">
                      Client ID
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="csv-name"
                      checked={csvIncludeFields.includes("name")}
                      onCheckedChange={() => toggleCsvField("name")}
                      disabled
                    />
                    <Label htmlFor="csv-name" className="font-normal">
                      Name
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="csv-address"
                      checked={csvIncludeFields.includes("address")}
                      onCheckedChange={() => toggleCsvField("address")}
                      disabled
                    />
                    <Label htmlFor="csv-address" className="font-normal">
                      Address
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="csv-contactnos"
                      checked={csvIncludeFields.includes("contactnos")}
                      onCheckedChange={() => toggleCsvField("contactnos")}
                      disabled
                    />
                    <Label htmlFor="csv-contactnos" className="font-normal">
                      Contact Numbers
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="csv-acode"
                      checked={csvIncludeFields.includes("acode")}
                      onCheckedChange={() => toggleCsvField("acode")}
                      disabled
                    />
                    <Label htmlFor="csv-acode" className="font-normal">
                      Area Code
                    </Label>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* WMM Information */}
            <Collapsible
              open={openSections.wmmInfo}
              onOpenChange={() => toggleSection("wmmInfo")}
              className="space-y-2"
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded hover:bg-muted">
                <span className="font-medium">WMM Information</span>
                {openSections.wmmInfo ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pl-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="csv-company"
                      checked={csvIncludeFields.includes("company")}
                      onCheckedChange={() => toggleCsvField("company")}
                    />
                    <Label htmlFor="csv-company" className="font-normal">
                      {renderFieldLabel("company", "Company")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="csv-copies"
                      checked={csvIncludeFields.includes("copies")}
                      onCheckedChange={() => toggleCsvField("copies")}
                    />
                    <Label htmlFor="csv-copies" className="font-normal">
                      {renderFieldLabel("copies", "Copies")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="csv-enddate"
                      checked={csvIncludeFields.includes("enddate")}
                      onCheckedChange={() => toggleCsvField("enddate")}
                    />
                    <Label htmlFor="csv-enddate" className="font-normal">
                      {renderFieldLabel("enddate", "Expiry Date")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="csv-subsclass"
                      checked={csvIncludeFields.includes("subsclass")}
                      onCheckedChange={() => toggleCsvField("subsclass")}
                    />
                    <Label htmlFor="csv-subsclass" className="font-normal">
                      {renderFieldLabel("subsclass", "Subscription Class")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="csv-subsdate"
                      checked={csvIncludeFields.includes("subsdate")}
                      onCheckedChange={() => toggleCsvField("subsdate")}
                    />
                    <Label htmlFor="csv-subsdate" className="font-normal">
                      {renderFieldLabel("subsdate", "Subscription Date")}
                    </Label>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Service Information */}
            <Collapsible
              open={openSections.serviceInfo}
              onOpenChange={() => toggleSection("serviceInfo")}
              className="space-y-2"
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded hover:bg-muted">
                <span className="font-medium">Service Information</span>
                {openSections.serviceInfo ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pl-2">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="csv-hrgData"
                      checked={csvIncludeFields.includes("hrgData")}
                      onCheckedChange={() => toggleCsvField("hrgData")}
                    />
                    <Label htmlFor="csv-hrgData" className="font-normal">
                      {renderFieldLabel(
                        "hrgData",
                        "HRG Data (Campaign Date, Payment Details)"
                      )}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="csv-fomData"
                      checked={csvIncludeFields.includes("fomData")}
                      onCheckedChange={() => toggleCsvField("fomData")}
                    />
                    <Label htmlFor="csv-fomData" className="font-normal">
                      {renderFieldLabel(
                        "fomData",
                        "FOM Data (Payment Details + Status)"
                      )}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="csv-calData"
                      checked={csvIncludeFields.includes("calData")}
                      onCheckedChange={() => toggleCsvField("calData")}
                    />
                    <Label htmlFor="csv-calData" className="font-normal">
                      {renderFieldLabel(
                        "calData",
                        "CAL Data (Type, Quantity + Payment Details)"
                      )}
                    </Label>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExportCSV}
              className={`flex-1 ${
                !hasData || csvIncludeFields.length === 0
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
              disabled={!hasData || csvIncludeFields.length === 0}
            >
              Export CSV
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CsvExport;
