import React, { useState } from "react";
import { Button } from "../UI/ShadCN/button";
import Modal from "../modal";

const CsvExport = ({ 
  selectedRows,
  dataSource,
  startClientId,
  endClientId,
  setDataSource,
  setStartClientId,
  setEndClientId,
  getRowCount,
  table
}) => {
  // State for CSV export modal
  const [csvExportModal, setCsvExportModal] = useState(false);
  // Fields to include in CSV
  const [csvIncludeFields, setCsvIncludeFields] = useState([
    "id",           // ClientID
    "name",         // Name
    "address",      // Address
    "contactnos",   // Contact Number
    "copies",       // Copies
    "acode",        // AreaCode
    "enddate",      // Expiry Date
    // Add new service-specific fields
    "subsclass",    // Subscription Class (WMM)
    "hrgData",      // HRG Data
    "fomData",      // FOM Data
    "calData"       // CAL Data
  ]);

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

  // Get the maximum number of address lines used in the dataset
  const getMaxAddressLines = () => {
    let maxLines = 0;
    selectedRows.forEach((row) => {
      const addressLines = row?.original?.address?.split('\n') || [];
      // Only count non-empty lines
      const nonEmptyLines = addressLines.filter(line => line.trim().length > 0).length;
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
      address: false,
      cellno: false,
      officeno: false,
      copies: false,
      acode: false,
      enddate: false,
      subsdate: false,
      subsclass: false,
      email: false,
      // Add service-specific data fields
      hrgData: false,
      fomData: false,
      calData: false
    };

    // Track address lines separately
    const addressLinesUsed = new Set();

    selectedRows.forEach((row) => {
      const subscriber = row.original;
      const wmmData = subscriber?.wmmData;
      const subscription = wmmData?.records?.[0] || {};

      // Check each field for non-empty values
      if (subscriber.id) fieldsWithData.id = true;
      if (typeof subscriber.title === 'string' && subscriber.title.trim()) fieldsWithData.title = true;
      if (typeof subscriber.lname === 'string' && subscriber.lname.trim()) fieldsWithData.lname = true;
      if (typeof subscriber.fname === 'string' && subscriber.fname.trim()) fieldsWithData.fname = true;
      if (typeof subscriber.mname === 'string' && subscriber.mname.trim()) fieldsWithData.mname = true;
      if (typeof subscriber.cellno === 'string' && subscriber.cellno.trim()) fieldsWithData.cellno = true;
      if (typeof subscriber.officeno === 'string' && subscriber.officeno.trim()) fieldsWithData.officeno = true;
      if (subscription.copies) fieldsWithData.copies = true;
      if (subscriber.acode !== undefined && subscriber.acode !== null) fieldsWithData.acode = true;
      if (typeof subscriber.email === 'string' && subscriber.email.trim()) fieldsWithData.email = true;
      if (typeof subscription.subsclass === 'string' && subscription.subsclass.trim()) fieldsWithData.subsclass = true;

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
      if (subscriber.hrgData && Object.keys(subscriber.hrgData).length > 0) {
        fieldsWithData.hrgData = true;
      }
      if (subscriber.fomData && Object.keys(subscriber.fomData).length > 0) {
        fieldsWithData.fomData = true;
      }
      if (subscriber.calData && Object.keys(subscriber.calData).length > 0) {
        fieldsWithData.calData = true;
      }

      // Check address lines
      const addressLines = typeof subscriber.address === 'string' ? subscriber.address.split('\n') : [];
      addressLines.forEach((line, index) => {
        if (line.trim()) {
          addressLinesUsed.add(index);
          fieldsWithData.address = true;
        }
      });
    });

    return {
      fieldsWithData,
      addressLinesUsed: Array.from(addressLinesUsed).sort((a, b) => a - b)
    };
  };

  // Generate CSV content from the selected data
  const generateCSV = () => {
    // Filter rows based on start/end Client IDs
    const filteredRows = selectedRows.filter((row) => {
      const clientId = row?.original?.id?.toString();
      if (!clientId) {
        return false;
      }
      const trimmedStartId = startClientId?.trim();
      const trimmedEndId = endClientId?.trim();

      const isAfterStart = trimmedStartId ? clientId >= trimmedStartId : true;
      const isBeforeEnd = trimmedEndId ? clientId <= trimmedEndId : true;
      return isAfterStart && isBeforeEnd;
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
    if (csvIncludeFields.includes("address") && fieldsWithData.address) {
      // Add address headers based on actual used lines
      addressLinesUsed.forEach(index => {
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

    // Add optional fields to headers only if they have data
    if (csvIncludeFields.includes("mname") && fieldsWithData.mname)
      headers.push("Middle Name");
    if (csvIncludeFields.includes("subsdate") && fieldsWithData.subsdate)
      headers.push("Subscription Date");
    if (csvIncludeFields.includes("subsclass") && fieldsWithData.subsclass)
      headers.push("Subscription Class");
    if (csvIncludeFields.includes("email") && fieldsWithData.email)
      headers.push("Email");

    // Add service-specific headers if included and data exists
    if (csvIncludeFields.includes("hrgData") && fieldsWithData.hrgData) {
      headers.push("HRG Quantity");
      headers.push("HRG Total Amount");
      headers.push("HRG Last Payment Date");
    }
    
    if (csvIncludeFields.includes("fomData") && fieldsWithData.fomData) {
      headers.push("FOM Quantity");
      headers.push("FOM Total Amount");
      headers.push("FOM Last Payment Date");
    }
    
    if (csvIncludeFields.includes("calData") && fieldsWithData.calData) {
      headers.push("CAL Quantity");
      headers.push("CAL Total Amount");
      headers.push("CAL Last Payment Date");
    }

    // Create CSV content
    let csvContent = headers.join(",") + "\n";

    filteredRows.forEach((row) => {
      const subscriber = row.original;
      const wmmData = subscriber?.wmmData;
      const subscription = wmmData?.records?.[0] || {};
      const rowData = [];

      // Add data only for fields that have content
      if (csvIncludeFields.includes("id") && fieldsWithData.id)
        rowData.push(`"${subscriber.id || ""}"`);
      if (csvIncludeFields.includes("name")) {
        if (fieldsWithData.title) rowData.push(`"${typeof subscriber.title === 'string' ? subscriber.title : ""}"`);
        if (fieldsWithData.lname) rowData.push(`"${typeof subscriber.lname === 'string' ? subscriber.lname : ""}"`);
        if (fieldsWithData.fname) rowData.push(`"${typeof subscriber.fname === 'string' ? subscriber.fname : ""}"`);
      }
      if (csvIncludeFields.includes("address") && fieldsWithData.address) {
        const addressLines = typeof subscriber.address === 'string' ? subscriber.address.split("\n") : [];
        addressLinesUsed.forEach(index => {
          rowData.push(`"${(addressLines[index] || "").trim()}"`);
        });
      }
      if (csvIncludeFields.includes("contactnos")) {
        if (fieldsWithData.cellno) rowData.push(`"${typeof subscriber.cellno === 'string' ? subscriber.cellno : ""}"`);
        if (fieldsWithData.officeno) rowData.push(`"${typeof subscriber.officeno === 'string' ? subscriber.officeno : ""}"`);
      }
      if (csvIncludeFields.includes("copies") && fieldsWithData.copies)
        rowData.push(`"${subscription.copies || ""}"`);
      if (csvIncludeFields.includes("acode") && fieldsWithData.acode)
        rowData.push(`"${subscriber.acode !== undefined ? subscriber.acode : ""}"`);

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
        rowData.push(`"${typeof subscription.subsclass === 'string' ? subscription.subsclass : ""}"`);
      if (csvIncludeFields.includes("email") && fieldsWithData.email)
        rowData.push(`"${typeof subscriber.email === 'string' ? subscriber.email : ""}"`);

      // Add service-specific data if included and data exists
      if (csvIncludeFields.includes("hrgData") && fieldsWithData.hrgData) {
        const hrgData = subscriber.hrgData || {};
        rowData.push(`"${hrgData.quantity || 0}"`);
        rowData.push(`"${hrgData.totalAmount || 0}"`);
        
        let lastPaymentDate = "";
        if (hrgData.lastPaymentDate) {
          const date = new Date(hrgData.lastPaymentDate);
          if (!isNaN(date.getTime())) {
            lastPaymentDate = date.toLocaleDateString();
          }
        }
        rowData.push(`"${lastPaymentDate}"`);
      }
      
      if (csvIncludeFields.includes("fomData") && fieldsWithData.fomData) {
        const fomData = subscriber.fomData || {};
        rowData.push(`"${fomData.quantity || 0}"`);
        rowData.push(`"${fomData.totalAmount || 0}"`);
        
        let lastPaymentDate = "";
        if (fomData.lastPaymentDate) {
          const date = new Date(fomData.lastPaymentDate);
          if (!isNaN(date.getTime())) {
            lastPaymentDate = date.toLocaleDateString();
          }
        }
        rowData.push(`"${lastPaymentDate}"`);
      }
      
      if (csvIncludeFields.includes("calData") && fieldsWithData.calData) {
        const calData = subscriber.calData || {};
        rowData.push(`"${calData.quantity || 0}"`);
        rowData.push(`"${calData.totalAmount || 0}"`);
        
        let lastPaymentDate = "";
        if (calData.lastPaymentDate) {
          const date = new Date(calData.lastPaymentDate);
          if (!isNaN(date.getTime())) {
            lastPaymentDate = date.toLocaleDateString();
          }
        }
        rowData.push(`"${lastPaymentDate}"`);
      }

      csvContent += rowData.join(",") + "\n";
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
    const csvContent = generateCSV();
    if (!csvContent) return;

    // Create a Blob with the CSV content
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    // Create a download link
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    // Set link properties
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `subscribers_export_${new Date().toISOString().slice(0, 10)}.csv`
    );

    // Append to body, click, and clean up
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);

    setCsvExportModal(false);
  };

  // Toggle CSV field selection
  const toggleCsvField = (field) => {
    setCsvIncludeFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const hasData = selectedRows.length > 0;

  return (
    <>
      <Button
        onClick={() => setCsvExportModal(true)}
        className="text-sm bg-blue-600 hover:bg-blue-800 text-white"
      >
        Export CSV
      </Button>

      {/* CSV Export Modal */}
      <Modal isOpen={csvExportModal} onClose={() => setCsvExportModal(false)}>
        <h2 className="flex justify-center text-xl font-bold text-black mb-2">
          Export Subscriber Data to CSV
        </h2>

        <p className="text-center text-sm text-gray-500 mb-4">
          {getRowCount()} {getRowCount() === 1 ? "subscriber" : "subscribers"}{" "}
          {getDataSourceLabel()}
        </p>

        <div className="flex flex-col items-center">
          {/* Data Source Selection - reuse the same as the print modal */}
          <div className="w-full max-w-lg p-3 mb-4 bg-gray-50 rounded border">
            <h3 className="text-sm font-semibold mb-2">Select Data Source:</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              <Button
                onClick={() => handleDataSourceChange("all")}
                variant={dataSource === "all" ? "default" : "outline"}
                className="flex-1"
              >
                All Records ({table.getFilteredRowModel().rows.length})
              </Button>
              <Button
                onClick={() => handleDataSourceChange("selected")}
                variant={dataSource === "selected" ? "default" : "outline"}
                className="flex-1"
                disabled={table.getSelectedRowModel().rows.length === 0}
              >
                Selected Rows ({table.getSelectedRowModel().rows.length})
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

            {/* Default Fields */}
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-600 mb-2">Default Fields:</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="csv-id"
                    checked={csvIncludeFields.includes("id")}
                    onChange={() => toggleCsvField("id")}
                    className="mr-2"
                  />
                  <label htmlFor="csv-id" className="text-sm">
                    {renderFieldLabel("id", "Client ID")}
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="csv-name"
                    checked={csvIncludeFields.includes("name")}
                    onChange={() => toggleCsvField("name")}
                    className="mr-2"
                  />
                  <label htmlFor="csv-name" className="text-sm">
                    {renderFieldLabel("name", "Name (Title, Last, First)")}
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="csv-address"
                    checked={csvIncludeFields.includes("address")}
                    onChange={() => toggleCsvField("address")}
                    className="mr-2"
                  />
                  <label htmlFor="csv-address" className="text-sm">
                    {renderAddressFieldLabel()}
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="csv-contactnos"
                    checked={csvIncludeFields.includes("contactnos")}
                    onChange={() => toggleCsvField("contactnos")}
                    className="mr-2"
                  />
                  <label htmlFor="csv-contactnos" className="text-sm">
                    {renderFieldLabel("contactnos", "Contact Numbers (Cell, Telephone)")}
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
                    id="csv-acode"
                    checked={csvIncludeFields.includes("acode")}
                    onChange={() => toggleCsvField("acode")}
                    className="mr-2"
                  />
                  <label htmlFor="csv-acode" className="text-sm">
                    {renderFieldLabel("acode", "Area Code")}
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
              </div>
            </div>

            {/* Optional Fields */}
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-600 mb-2">Optional Fields:</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="csv-mname"
                    checked={csvIncludeFields.includes("mname")}
                    onChange={() => toggleCsvField("mname")}
                    className="mr-2"
                  />
                  <label htmlFor="csv-mname" className="text-sm">
                    {renderFieldLabel("mname", "Middle Name")}
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
                    id="csv-email"
                    checked={csvIncludeFields.includes("email")}
                    onChange={() => toggleCsvField("email")}
                    className="mr-2"
                  />
                  <label htmlFor="csv-email" className="text-sm">
                    {renderFieldLabel("email", "Email")}
                  </label>
                </div>
              </div>
            </div>

            {/* Service-specific Fields */}
            <div>
              <h4 className="text-xs font-medium text-gray-600 mb-2">Service-specific Data:</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="csv-hrgData"
                    checked={csvIncludeFields.includes("hrgData")}
                    onChange={() => toggleCsvField("hrgData")}
                    className="mr-2"
                  />
                  <label htmlFor="csv-hrgData" className="text-sm">
                    {renderFieldLabel("hrgData", "HRG Data")}
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
                    {renderFieldLabel("fomData", "FOM Data")}
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
                    {renderFieldLabel("calData", "CAL Data")}
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
              onClick={() => setCsvExportModal(false)}
              variant="secondary"
              className="flex-grow"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default CsvExport; 