import { useState, useCallback, useEffect } from "react";
import Modal from "./modal";
import { Button } from "./UI/ShadCN/button";
import { useColumns } from "./Table/Structure/clientColumn";
import axios from "axios";

const Mailing = ({
  table,
  id,
  address,
  acode,
  zipcode,
  lname,
  fname,
  mname,
  contactnos,
  cellno,
  officeno,
  copies,
}) => {
  // Define the fields at component level
  const defaultFields = [
    "id",
    "name",
    "address",
    "contactnos",
    "copies",
    "acode",
    "enddate"
  ];
  const optionalFields = ["mname", "subsdate", "subsclass", "email"];

  const [modalOpen, setModalOpen] = useState(false);
  const [leftPosition, setLeftPosition] = useState(-40);
  const [topPosition, setTopPosition] = useState(-10);
  const [columnWidth, setColumnWidth] = useState(300);
  const [fontSize, setFontSize] = useState(15);
  const [labelHeight, setLabelHeight] = useState(85);
  const [horizontalSpacing, setHorizontalSpacing] = useState(10);
  const [selectedFields, setSelectedFields] = useState(["contactnos"]);
  const [showInputs, setShowInputs] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [inputModalOpen, setInputModalOpen] = useState(false);
  const [showTemplateNameInput, setShowTemplateNameInput] = useState(false);
  const [previewType, setPreviewType] = useState("standard"); // "standard", "renewal", or "thankyou"
  const [lineSpacing, setLineSpacing] = useState(8); // For renewal notice, spacing between lines
  const [dataSource, setDataSource] = useState("all"); // "all", "selected", or "range"
  const [startClientId, setStartClientId] = useState("");
  const [endClientId, setEndClientId] = useState("");
  const [startPosition, setStartPosition] = useState("left"); // 'left' or 'right'
  const [csvExportModal, setCsvExportModal] = useState(false); // New state for CSV export modal
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
  ]); // Fields to include in CSV

  // State for A4 preview layout adjustments
  const [renewalLeftMargin, setRenewalLeftMargin] = useState(40);
  const [renewalTopMargin, setRenewalTopMargin] = useState(50);
  const [renewalRightColumnPosition, setRenewalRightColumnPosition] =
    useState(400);
  const [renewalFontSize, setRenewalFontSize] = useState(14);

  // Additional Thank You Letter settings
  const [thankYouTopMargin, setThankYouTopMargin] = useState(60);
  const [thankYouLeftMargin, setThankYouLeftMargin] = useState(60);
  const [thankYouFontSize, setThankYouFontSize] = useState(14);
  const [thankYouLineSpacing, setThankYouLineSpacing] = useState(1);
  const [thankYouWidth, setThankYouWidth] = useState(250); // New width setting
  const [thankYouDateSpacing, setThankYouDateSpacing] = useState(1);
  const [thankYouGreetingSpacing, setThankYouGreetingSpacing] = useState(30);
  const [thankYouContentSpacing, setThankYouContentSpacing] = useState(20);
  const [thankYouGreetingTopSpacing, setThankYouGreetingTopSpacing] = useState(165); // Add this for greeting position

  // Additional precise controls for renewal notice
  const [leftColumnLineSpacing, setLeftColumnLineSpacing] = useState(8);
  const [rightColumnLineSpacing, setRightColumnLineSpacing] = useState(12);
  const [nameAddressSpacing, setNameAddressSpacing] = useState(1); // Space between name and address
  const [addressContactSpacing, setAddressContactSpacing] = useState(1); // Space between address and contact info
  const [rightColumnItemSpacing, setRightColumnItemSpacing] = useState(10); // Space between each item in right column
  const [greetingTopSpacing, setGreetingTopSpacing] = useState(165); // Space above the greeting line

  // State variables for spacing between data
  const [dataVerticalSpacing, setDataVerticalSpacing] = useState(2);
  const [dataHorizontalSpacing, setDataHorizontalSpacing] = useState(0);
  const [contentLeftMargin, setContentLeftMargin] = useState(-40);
  const [contentRightMargin, setContentRightMargin] = useState(4);
  const [contentTopMargin, setContentTopMargin] = useState(1);
  const [labelsToSkip, setLabelsToSkip] = useState(0);
  const [labelsPerPage, setLabelsPerPage] = useState(16); // Default 8 rows of 2 labels
  const [verticalGap, setVerticalGap] = useState(3); // Gap between rows of labels
  const [fixedLabelWidth, setFixedLabelWidth] = useState(408); // 2 inches at 96dpi
  const [fixedLabelHeight, setFixedLabelHeight] = useState(336); // 1 inch at 96dpi
  const [showFixedLabels, setShowFixedLabels] = useState(true); // Toggle fixed label boundaries

  const fields = [{ label: "Contact Numbers", value: "contactnos" }];

  const columns = useColumns();
  const filteredColumns = columns.filter(
    (column) => column.id !== "addedBy" && column.id !== "Added Info"
  );

  // Get rows based on current data source
  const getSelectedRows = useCallback(() => {
    if (!table) return [];

    try {
      if (dataSource === "all") {
        // Use all filtered rows from the table
        return table.getFilteredRowModel().rows;
      } else if (dataSource === "selected") {
        // Get only selected rows
        if (typeof table.getSelectedRowModel !== "function") return [];
        const selectedRows = table.getSelectedRowModel().rows;
        return Array.isArray(selectedRows) ? selectedRows : [];
      } else if (dataSource === "range" && startClientId && endClientId) {
        // Filter rows by client ID range
        const start = parseInt(startClientId, 10);
        const end = parseInt(endClientId, 10);

        if (isNaN(start) || isNaN(end)) {
          // Try string comparison if not valid numbers
          return table.getFilteredRowModel().rows.filter((row) => {
            const id = row.original.id.toString();
            return id >= startClientId && id <= endClientId;
          });
        }

        return table.getFilteredRowModel().rows.filter((row) => {
          const id = parseInt(row.original.id, 10);
          return !isNaN(id) && id >= start && id <= end;
        });
      }

      // Default fallback
      return table.getFilteredRowModel().rows;
    } catch (error) {
      console.error("Error getting rows:", error);
      return [];
    }
  }, [table, dataSource, startClientId, endClientId]);

  const selectedRows = getSelectedRows();
  const hasData = selectedRows.length > 0;

  // Set default start/end IDs when data changes
  useEffect(() => {
    if (selectedRows.length > 0) {
      const firstId = selectedRows[0]?.original?.id?.toString() || "";
      const lastId =
        selectedRows[selectedRows.length - 1]?.original?.id?.toString() || "";

      // Ensure startId <= endId for the default range
      if (firstId && lastId) {
        // Attempt numeric comparison first, fallback to string
        const firstNum = parseInt(firstId, 10);
        const lastNum = parseInt(lastId, 10);
        if (!isNaN(firstNum) && !isNaN(lastNum)) {
          setStartClientId(Math.min(firstNum, lastNum).toString());
          setEndClientId(Math.max(firstNum, lastNum).toString());
        } else {
          // Fallback to string comparison
          if (firstId <= lastId) {
            setStartClientId(firstId);
            setEndClientId(lastId);
          } else {
            setStartClientId(lastId);
            setEndClientId(firstId);
          }
        }
      } else {
        // Handle cases where one or both IDs might be missing
        setStartClientId(firstId || lastId); // Use whichever one exists
        setEndClientId(lastId || firstId);
      }
    } else {
      setStartClientId("");
      setEndClientId("");
    }
  }, [selectedRows]); // Rerun when selection changes

  // Handle data source change
  const handleDataSourceChange = (source) => {
    setDataSource(source);
  };

  // Generate a label showing the current data source
  const getDataSourceLabel = () => {
    if (dataSource === "all") {
      return "all matching";
    } else if (dataSource === "selected") {
      return "selected";
    } else {
      return "range";
    }
  };

  // Get the total count of subscribers
  const getRowCount = () => {
    return selectedRows.length;
  };

  // Get all table rows (filtered by current criteria)
  const getAllTableRows = () => {
    if (!table) return [];
    return table.getFilteredRowModel().rows;
  };

  const getFullName = (row) => {
    const title = row.title ? `${row.title} ` : "";
    return [title, row.fname, row.mname, row.lname].filter(Boolean).join(" ");
  };

  const getContactNumber = (row) => {
    return row.contactnos || row.cellno || row.ofcno || "";
  };

  // Generate HTML for a specific range of Client IDs and starting position
  const generatePrintHTML = (startId, endId, startColumn) => {
    // Filter rows based on start/end Client IDs
    const filteredRows = selectedRows.filter((row) => {
      const clientId = row?.original?.id?.toString();
      if (!clientId) {
        return false;
      }
      const trimmedStartId = startId?.trim();
      const trimmedEndId = endId?.trim();

      const isAfterStart = trimmedStartId ? clientId >= trimmedStartId : true;
      const isBeforeEnd = trimmedEndId ? clientId <= trimmedEndId : true;
      return isAfterStart && isBeforeEnd;
    });

    if (filteredRows.length === 0) {
      return "<html><body>No labels found for the specified Client ID range. Check IDs and selection.</body></html>";
    }

    // Calculate layout based on filtered rows
    let layoutRows = [...filteredRows];
    let emptySlots = 0;

    // If starting on the right, add a placeholder at the beginning
    if (startColumn === "right" && layoutRows.length > 0) {
      layoutRows.unshift(null); // Add placeholder for the first slot
      emptySlots = 1;
    }

    // If we need to skip labels at the beginning, add empty placeholders
    if (labelsToSkip > 0) {
      const placeholders = Array(labelsToSkip).fill(null);
      layoutRows = [...placeholders, ...layoutRows];
      emptySlots += labelsToSkip;
    }

    // Group labels into pairs (one row with two labels)
    const labelRows = [];
    for (let i = 0; i < layoutRows.length; i += 2) {
      const leftLabel = layoutRows[i];
      const rightLabel = i + 1 < layoutRows.length ? layoutRows[i + 1] : null;
      labelRows.push([leftLabel, rightLabel]);
    }

    // Split rows into pages based on labelsPerPage
    const labelsPerRow = 2; // We have 2 labels per row
    const rowsPerPage = labelsPerPage / labelsPerRow;
    const pages = [];
    for (let i = 0; i < labelRows.length; i += rowsPerPage) {
      pages.push(labelRows.slice(i, i + rowsPerPage));
    }

    // Determine label dimensions based on settings
    const labelWidth = showFixedLabels ? fixedLabelWidth : columnWidth;
    const labelHeight = showFixedLabels ? fixedLabelHeight : labelHeight;

    // Generate HTML for each page
    const pagesHtml = pages
      .map((page, pageIndex) => {
        const pageHtml = page
          .map((row, rowIndex) => {
            const [leftLabel, rightLabel] = row;
            
            // Generate HTML for left label
            const leftLabelHtml = leftLabel 
              ? `<div class="label left-label" style="${showFixedLabels ? 'position: relative;' : ''}">
                  ${showFixedLabels 
                    ? `<div class="content-container">
                        <div class="id-line">${leftLabel?.original?.id || ""} - ${leftLabel?.original?.wmmData?.records?.[0]?.subsdate ? new Date(leftLabel.original.wmmData.records[0].subsdate).toLocaleDateString() : ""} - ${leftLabel?.original?.wmmData?.records?.[0]?.copies || ""}cps/${leftLabel?.original?.acode || ""}</div>
                        <div class="name-line">${getFullName(leftLabel?.original || {})}</div>
                        <div class="address-line">${leftLabel?.original?.address || ""}</div>
                        ${selectedFields.includes("contactnos") ? `<div class="contact-line">${getContactNumber(leftLabel?.original || {})}</div>` : ""}
                      </div>`
                    : `<div style="padding: ${contentTopMargin}px ${contentRightMargin}px ${dataVerticalSpacing}px ${contentLeftMargin}px;">
                        <div class="id-line">${leftLabel?.original?.id || ""} - ${leftLabel?.original?.wmmData?.records?.[0]?.subsdate ? new Date(leftLabel.original.wmmData.records[0].subsdate).toLocaleDateString() : ""} - ${leftLabel?.original?.wmmData?.records?.[0]?.copies || ""}cps/${leftLabel?.original?.acode || ""}</div>
                        <div class="name-line">${getFullName(leftLabel?.original || {})}</div>
                        <div class="address-line">${leftLabel?.original?.address || ""}</div>
                        ${selectedFields.includes("contactnos") ? `<div class="contact-line">${getContactNumber(leftLabel?.original || {})}</div>` : ""}
                      </div>`
                  }
                </div>` 
              : `<div class="label left-label empty"></div>`;
            
            // Generate HTML for right label
            const rightLabelHtml = rightLabel 
              ? `<div class="label right-label" style="${showFixedLabels ? 'position: relative;' : ''}">
                  ${showFixedLabels 
                    ? `<div class="content-container">
                        <div class="id-line">${rightLabel?.original?.id || ""} - ${rightLabel?.original?.wmmData?.records?.[0]?.subsdate ? new Date(rightLabel.original.wmmData.records[0].subsdate).toLocaleDateString() : ""} - ${rightLabel?.original?.wmmData?.records?.[0]?.copies || ""}cps/${rightLabel?.original?.acode || ""}</div>
                        <div class="name-line">${getFullName(rightLabel?.original || {})}</div>
                        <div class="address-line">${rightLabel?.original?.address || ""}</div>
                        ${selectedFields.includes("contactnos") ? `<div class="contact-line">${getContactNumber(rightLabel?.original || {})}</div>` : ""}
                      </div>`
                    : `<div style="padding: ${contentTopMargin}px ${contentRightMargin}px ${dataVerticalSpacing}px ${contentLeftMargin}px;">
                        <div class="id-line">${rightLabel?.original?.id || ""} - ${rightLabel?.original?.wmmData?.records?.[0]?.subsdate ? new Date(rightLabel.original.wmmData.records[0].subsdate).toLocaleDateString() : ""} - ${rightLabel?.original?.wmmData?.records?.[0]?.copies || ""}cps/${rightLabel?.original?.acode || ""}</div>
                        <div class="name-line">${getFullName(rightLabel?.original || {})}</div>
                        <div class="address-line">${rightLabel?.original?.address || ""}</div>
                        ${selectedFields.includes("contactnos") ? `<div class="contact-line">${getContactNumber(rightLabel?.original || {})}</div>` : ""}
                      </div>`
                  }
                </div>` 
              : `<div class="label right-label empty"></div>`;
            
            // Return the complete row
            return `
              <div class="label-row">
                ${leftLabelHtml}
                <div class="spacer"></div>
                ${rightLabelHtml}
          </div>
        `;
          })
          .join("");

        return `
          <div class="page">
            ${pageHtml}
          </div>
        `;
      })
      .join("");

    // Information about the label sheet
    const labelInfo = `
      <div class="label-info">
        Label Configuration: ${labelsPerPage} labels per page (${labelsPerPage/2} rows × 2 columns)
        ${labelsToSkip > 0 ? `• Skipped first ${labelsToSkip} labels` : ''}
        • ${filteredRows.length} addresses printed
        • Physical Size: ${(fixedLabelWidth/96).toFixed(2)}″×${(fixedLabelHeight/96).toFixed(2)}″
        • Generated on ${new Date().toLocaleString()}
      </div>
    `;

    return `
      <html>
      <head>
        <title>Mailing Labels (${startId || "Start"} to ${endId || "End"})</title>
          <style>
            @page {
              size: auto;
              margin: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body {
              font-family: "Arial", sans-serif;
              margin: 0;
              padding: 0;
            }
            .mailing-container {
              margin-top: ${topPosition}px;
              margin-left: ${leftPosition}px;
              position: relative;
              width: ${(showFixedLabels ? (fixedLabelWidth * 2) : (columnWidth * 2)) + horizontalSpacing}px;
            }
            .page {
              page-break-after: always;
            }
            .label-row {
              clear: both;
              page-break-inside: avoid;
              white-space: nowrap;
              margin-bottom: ${verticalGap}px;
              display: flex;
              flex-direction: row;
              justify-content: space-between;
              align-items: flex-start;
            }
            .label {
              box-sizing: border-box;
              overflow: hidden;
              width: ${labelWidth}px;
              height: ${labelHeight}px;
              display: inline-block;
              vertical-align: top;
              ${showFixedLabels ? '' : `padding: ${dataHorizontalSpacing}px;`}
            }
            .content-container {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: ${columnWidth}px;
              text-align: center;
              border: 1px dotted #ccc;
              padding: ${contentTopMargin}px ${contentRightMargin}px ${dataVerticalSpacing}px ${contentLeftMargin}px;
            }
            .left-label .content-container, .right-label .content-container {
              left: 50%;
              transform: translate(-50%, -50%);
            }
            .spacer {
              display: none; /* Hide the spacer since we're using space-between */
            }
            .id-line, .name-line, .address-line, .contact-line {
              margin: 0 0 ${dataVerticalSpacing}px 0;
              padding: 0;
              font-size: ${fontSize}px;
              color: #000000;
              font-weight: 600;
              word-wrap: break-word;
              white-space: normal;
              overflow-wrap: break-word;
              text-align: center;
            }
            .name-line {
              font-weight: 700;
            }
            .contact-line {
              margin-bottom: 0;
            }
            .label-info {
              font-size: 9px;
              color: #999;
              text-align: center;
              margin-top: 5px;
              page-break-before: always;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
                font-family: "Arial", sans-serif;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .mailing-container {
                margin-top: ${topPosition}px;
                margin-left: ${leftPosition}px;
                width: ${(showFixedLabels ? (fixedLabelWidth * 2) : (columnWidth * 2)) + horizontalSpacing}px;
              }
              .label-row {
                justify-content: space-between;
                width: 100%;
              }
              .id-line, .name-line, .address-line, .contact-line {
                color: #000000 !important;
                font-weight: 600 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .name-line {
                font-weight: 700 !important;
              }
              .left-label, .right-label {
                position: relative !important;
              }
              .left-label .content-container, .right-label .content-container {
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
              }
              .content-container {
                padding: ${contentTopMargin}px ${contentRightMargin}px ${dataVerticalSpacing}px ${contentLeftMargin}px !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="mailing-container">
            ${pagesHtml}
          </div>
          ${labelInfo}
          <script>
             window.print();
             window.close();
          </script>
        </body>
      </html>
    `;
  };

  // Generate HTML for renewal notice format
  const generateRenewalHTML = (startId, endId) => {
    // Filter rows based on start/end Client IDs
    const filteredRows = selectedRows.filter((row) => {
      const clientId = row?.original?.id?.toString();
      if (!clientId) {
        return false;
      }
      const trimmedStartId = startId?.trim();
      const trimmedEndId = endId?.trim();

      const isAfterStart = trimmedStartId ? clientId >= trimmedStartId : true;
      const isBeforeEnd = trimmedEndId ? clientId <= trimmedEndId : true;
      return isAfterStart && isBeforeEnd;
    });

    if (filteredRows.length === 0) {
      return "<html><body>No data found for the specified Client ID range. Check IDs and selection.</body></html>";
    }

    const renewalHtml = filteredRows
      .map((row) => {
        const subscriber = row.original;
        const wmmData = subscriber?.wmmData;
        const subscription = wmmData?.records?.[0] || {};

        // Format expiry date
        let expiryDate = "N/A";
        let lastIssue = "N/A";

        if (subscription.enddate) {
          const date = new Date(subscription.enddate);
          if (!isNaN(date.getTime())) {
            expiryDate = date.toLocaleDateString();

            // Format last issue as month and year from expiry date
            const month = date.toLocaleString("default", { month: "long" });
            const year = date.getFullYear();
            lastIssue = `${month} ${year}`;
          }
        }

        // Get subscription class/type
        const subscriptionType = subscription.subsclass || "N/A";

        // Define exact pixel values for spacing to ensure consistency
        const nameAddressSpacingPx = nameAddressSpacing;
        const addressContactSpacingPx = addressContactSpacing;
        const leftColumnLineSpacingPx = leftColumnLineSpacing;
        const rightColumnItemSpacingPx = rightColumnItemSpacing;
        const rightColumnLineSpacingPx = rightColumnLineSpacing;

        return `
          <div class="renewal-page">
            <!-- Left column: Name, Address, Contact -->
            <div class="left-column">
              <p class="name" style="margin-bottom: ${nameAddressSpacing}px !important; padding-left: ${dataHorizontalSpacing}px; padding-right: ${dataHorizontalSpacing}px;">${getFullName(subscriber)}</p>
              <p class="address" style="margin-bottom: ${addressContactSpacing}px !important; padding-left: ${dataHorizontalSpacing}px; padding-right: ${dataHorizontalSpacing}px;">${subscriber.address || ""}</p>
              <p class="contact" style="margin-bottom: ${leftColumnLineSpacing}px !important; padding-left: ${dataHorizontalSpacing}px; padding-right: ${dataHorizontalSpacing}px;">${getContactNumber(subscriber)}</p>
            </div>
            
            <!-- Right column: Subscriber ID, Expiry Date, Last Issue -->
            <div class="right-column">
              <p class="id" style="margin-bottom: ${rightColumnItemSpacing}px !important; padding-left: ${dataHorizontalSpacing}px; padding-right: ${dataHorizontalSpacing}px;">${subscriber.id || ""}</p>
              <p class="expiry" style="margin-bottom: ${rightColumnItemSpacing}px !important; padding-left: ${dataHorizontalSpacing}px; padding-right: ${dataHorizontalSpacing}px;">${expiryDate}</p>
              <p class="last-issue" style="margin-bottom: ${rightColumnLineSpacing}px !important; padding-left: ${dataHorizontalSpacing}px; padding-right: ${dataHorizontalSpacing}px;">${lastIssue}</p>
            </div>
            
            <!-- Greeting Line at Bottom -->
            <div class="greeting" style="position: absolute; left: ${renewalLeftMargin}px; top: ${renewalTopMargin + greetingTopSpacing}px; width: 80%;">
              <p style="font-size: ${renewalFontSize}px; padding-left: ${dataHorizontalSpacing}px; padding-right: ${dataHorizontalSpacing}px;">
                Dear ${subscriber.title ? `${subscriber.title} ` : ""}${subscriber.fname ? `${subscriber.fname} ` : ""}${subscriber.lname || ""}
              </p>
            </div>
          </div>
        `;
      })
      .join("");

    return `
      <html>
      <head>
        <title>Renewal Notices (${startId || "Start"} to ${
      endId || "End"
    })</title>
        <style>
          @page {
            size: letter; /* US Letter (8.5in × 11in) */
            margin: 0;
          }
          body {
            font-family: "Arial", sans-serif;
            margin: 0;
            padding: 0;
          }
          .renewal-page {
            box-sizing: border-box;
            page-break-after: always;
            position: relative;
            width: 215.9mm; /* Letter width (8.5 inches) */
            height: 279.4mm; /* Letter height (11 inches) */
            overflow: hidden;
            padding: 0.5in;
          }
          /* Reset all margins and paddings */
          p {
            margin: 0;
            padding: 0;
            font-size: ${renewalFontSize}px;
          }
          
          /* Left column positioning */
          .left-column {
            position: absolute;
            left: ${renewalLeftMargin}px;
            top: ${renewalTopMargin}px;
            width: ${renewalRightColumnPosition - renewalLeftMargin - 20}px;
          }
          
          /* Right column positioning */
          .right-column {
            position: absolute;
            left: ${renewalRightColumnPosition}px;
            top: ${renewalTopMargin}px;
            width: ${215.9 * 3.78 - renewalRightColumnPosition - 40}px;
          }
          
          /* Specific spacing for each element - will be overridden by inline styles */
          .name, .address, .contact, .id, .expiry, .last-issue {
            padding-left: ${dataHorizontalSpacing}px !important;
            padding-right: ${dataHorizontalSpacing}px !important;
          }
          
          .name {
            margin-bottom: ${nameAddressSpacing}px !important;
          }
          
          .address {
            margin-bottom: ${addressContactSpacing}px !important;
            white-space: pre-line;
          }
          
          .contact {
            margin-bottom: ${leftColumnLineSpacing}px !important;
          }
          
          .id, .expiry {
            margin-bottom: ${rightColumnItemSpacing}px !important;
          }
          
          .last-issue {
            margin-bottom: ${rightColumnLineSpacing}px !important;
          }
          
          @media print {
            body {
              width: 215.9mm;
              height: 279.4mm;
              font-family: "Arial", sans-serif;
            }
            .renewal-page {
              margin: 0;
              border: initial;
              border-radius: initial;
              width: initial;
              min-height: initial;
              box-shadow: initial;
              background: initial;
              page-break-after: always;
            }
            
            /* Reinforce spacing in print mode */
            .name, .address, .contact, .id, .expiry, .last-issue {
              padding-left: ${dataHorizontalSpacing}px !important;
              padding-right: ${dataHorizontalSpacing}px !important;
            }
            
            .name {
              margin-bottom: ${nameAddressSpacing}px !important;
            }
            
            .address {
              margin-bottom: ${addressContactSpacing}px !important;
            }
            
            .contact {
              margin-bottom: ${leftColumnLineSpacing}px !important;
            }
            
            .id, .expiry {
              margin-bottom: ${rightColumnItemSpacing}px !important;
            }
            
            .last-issue {
              margin-bottom: ${rightColumnLineSpacing}px !important;
            }
          }
        </style>
      </head>
      <body>
        ${renewalHtml}
        <script>
          window.print();
          window.close();
        </script>
      </body>
      </html>
    `;
  };

  // Generate HTML for thank you letter format
  const generateThankYouHTML = (startId, endId) => {
    // Filter rows based on start/end Client IDs
    const filteredRows = selectedRows.filter((row) => {
      const clientId = row?.original?.id?.toString();
      if (!clientId) {
        return false;
      }
      const trimmedStartId = startId?.trim();
      const trimmedEndId = endId?.trim();

      const isAfterStart = trimmedStartId ? clientId >= trimmedStartId : true;
      const isBeforeEnd = trimmedEndId ? clientId <= trimmedEndId : true;
      return isAfterStart && isBeforeEnd;
    });

    if (filteredRows.length === 0) {
      return "<html><body>No data found for the specified Client ID range. Check IDs and selection.</body></html>";
    }

    const thankYouHtml = filteredRows
      .map((row) => {
        const subscriber = row.original;
        const wmmData = subscriber?.wmmData;
        const subscription = wmmData?.records?.[0] || {};

        // Format date if needed
        let subsdate = "N/A";
        if (subscription.subsdate) {
          const date = new Date(subscription.subsdate);
          if (!isNaN(date.getTime())) {
            subsdate = date.toLocaleDateString();
          }
        }

        return `
          <div class="thankyou-page">
            <div class="address-container">
              <p class="id-line" style="margin-bottom: ${dataVerticalSpacing}px; padding-left: ${dataHorizontalSpacing}px; padding-right: ${dataHorizontalSpacing}px;">${subscriber.id || ""} - ${subsdate} - ${
          subscription.copies || "N/A"
        }cps/${subscriber.acode || ""}</p>
              <p class="name-line" style="margin-bottom: ${dataVerticalSpacing}px; padding-left: ${dataHorizontalSpacing}px; padding-right: ${dataHorizontalSpacing}px; font-weight: bold;">${getFullName(subscriber)}</p>
              <p class="address-line" style="margin-bottom: ${dataVerticalSpacing}px; padding-left: ${dataHorizontalSpacing}px; padding-right: ${dataHorizontalSpacing}px;">${subscriber.address || ""}</p>
              ${
                selectedFields.includes("contactnos")
                  ? `<p class="contact-line" style="padding-left: ${dataHorizontalSpacing}px; padding-right: ${dataHorizontalSpacing}px;">${getContactNumber(subscriber)}</p>`
                  : ""
              }
            </div>
            
            <!-- Add greeting line -->
            <div class="greeting" style="position: absolute; left: ${thankYouLeftMargin}px; top: ${thankYouTopMargin + thankYouGreetingTopSpacing}px; width: 80%;">
              <p style="font-size: ${thankYouFontSize}px; padding-left: ${dataHorizontalSpacing}px; padding-right: ${dataHorizontalSpacing}px;">
                Dear ${subscriber.title ? `${subscriber.title} ` : ""}${subscriber.fname ? `${subscriber.fname} ` : ""}${subscriber.lname || ""}
              </p>
            </div>
          </div>
        `;
      })
      .join("");

    return `
      <html>
      <head>
        <title>Thank You Letters (${startId || "Start"} to ${
      endId || "End"
    })</title>
        <style>
          @page {
            size: letter; /* US Letter (8.5in × 11in) */
            margin: 0;
          }
          body {
            font-family: "Arial", sans-serif;
            margin: 0;
            padding: 0;
          }
          .thankyou-page {
            box-sizing: border-box;
            page-break-after: always;
            position: relative;
            width: 215.9mm; /* Letter width (8.5 inches) */
            height: 279.4mm; /* Letter height (11 inches) */
            overflow: hidden;
            padding: 0.5in;
          }
          
          .address-container {
            position: absolute;
            left: ${thankYouLeftMargin}px;
            top: ${thankYouTopMargin}px;
            width: ${thankYouWidth}px;
            word-wrap: break-word;
            white-space: normal;
            overflowWrap: break-word;
          }
          
          .address-container p {
            margin: 0;
            padding: 0;
            font-size: ${thankYouFontSize}px;
            color: black;
            width: ${thankYouWidth}px;
            word-wrap: break-word;
            white-space: normal;
            overflowWrap: break-word;
          }
          
          .address-container p:last-child {
            margin-bottom: 0 !important;
          }
          
          @media print {
            body {
              width: 215.9mm;
              height: 279.4mm;
              margin: ${thankYouTopMargin}px 0 0 ${thankYouLeftMargin}px !important;
              font-family: "Arial", sans-serif;
            }
            .thankyou-page {
              margin: 0;
              border: initial;
              border-radius: initial;
              width: initial;
              min-height: initial;
              box-shadow: initial;
              background: initial;
              page-break-after: always;
            }
          }
        </style>
      </head>
      <body>
        ${thankYouHtml}
        <script>
          window.print();
          window.close();
        </script>
      </body>
      </html>
    `;
  };

  // Handle printing with the specified template and range
  const handlePrintWithRange = () => {
    let htmlContent;
    if (previewType === "renewal") {
      htmlContent = generateRenewalHTML(startClientId, endClientId);
    } else if (previewType === "thankyou") {
      htmlContent = generateThankYouHTML(startClientId, endClientId);
    } else {
      htmlContent = generatePrintHTML(
        startClientId,
        endClientId,
        startPosition
      );
    }

    const printWindow = window.open("", "_blank", "height=600,width=800");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } else {
      alert(
        "Could not open print window. Please check your pop-up blocker settings."
      );
    }
  };

  const toggleModal = () => {
    setModalOpen(!modalOpen);
  };

  const closeModal = () => {
    setModalOpen(false);
    // Reset start/end IDs when closing (optional, could retain)
    // if (hasSelectedRows) {
    //     setStartClientId(selectedRows[0]?.original?.id?.toString() || "");
    //     setEndClientId(selectedRows[selectedRows.length - 1]?.original?.id?.toString() || "");
    // }
  };

  const handleLeftPositionChange = (event) => {
    setLeftPosition(parseInt(event.target.value, 10));
  };

  const handleTopPositionChange = (event) => {
    setTopPosition(parseInt(event.target.value, 10));
  };

  const handleColumnWidthChange = (event) => {
    setColumnWidth(parseInt(event.target.value, 10));
  };

  const handleFontSize = (event) => {
    setFontSize(parseInt(event.target.value, 10));
  };

  const handleFieldChange = (field) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const handleSave = () => {
    setShowInputs(false);
    setModalOpen(true);
  };

  const handleSaveClick = () => {
    setShowTemplateNameInput(true);
  };

  const handleTemplateNameChange = (event) => {
    setTemplateName(event.target.value);
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      alert("Please enter a template name.");
      return;
    }

    try {
      // Create a template name that includes the type for clarity
      const formattedTemplateName = templateName.trim();

      // Always save all settings regardless of current preview type
      // This ensures complete configuration preservation when switching between modes
      const layoutSettings = {
        // Standard mailing label settings
        fontSize,
        leftPosition,
        topPosition,
        columnWidth,
        labelHeight,
        horizontalSpacing,
        dataVerticalSpacing,
        contentLeftMargin,
        contentRightMargin,
        contentTopMargin,
        labelsToSkip,
        labelsPerPage,
        verticalGap,
        fixedLabelWidth,
        fixedLabelHeight,
        showFixedLabels,

        // Renewal notice settings
        renewalFontSize,
        renewalLeftMargin,
        renewalTopMargin,
        renewalRightColumnPosition,
        leftColumnLineSpacing,
        rightColumnLineSpacing,
        nameAddressSpacing,
        addressContactSpacing,
        rightColumnItemSpacing,
        lineSpacing,
        greetingTopSpacing,

        // Thank you letter settings
        thankYouFontSize,
        thankYouTopMargin,
        thankYouLeftMargin,
        thankYouLineSpacing,
        thankYouWidth,
        thankYouDateSpacing,
        thankYouGreetingSpacing,
        thankYouContentSpacing,
        thankYouGreetingTopSpacing,
      };

      const newTemplate = {
        name: formattedTemplateName,
        layout: layoutSettings,
        selectedFields,
        previewType, // Current active preview type - this ensures templates are categorized
      };

      const response = await axios.post(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/templates-add`,
        newTemplate,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (response.status === 201) {
        alert(
          `Template saved successfully as ${
            previewType === "standard"
              ? "Standard Label"
              : previewType === "renewal"
              ? "Renewal Notice"
              : "Thank You Letter"
          } template!`
        );
        setSavedTemplates([...savedTemplates, newTemplate]);
        setShowTemplateNameInput(false);
        setTemplateName("");
      } else {
        alert("Failed to save template. Please try again.");
      }
    } catch (error) {
      console.error("Error saving template:", error);
      alert(
        `Error: ${error.response?.data?.error || "Failed to save template"}`
      );
    }
  };

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await axios.get(
          `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/templates`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }
        );
        setSavedTemplates(response.data);
      } catch (error) {
        console.error("Error fetching templates:", error);
      }
    };

    fetchTemplates();
  }, []);

  const handleTemplateSelect = (event) => {
    // Only consider templates that match the current preview type to avoid confusion
    const templateName = event.target.value;
    const selected = savedTemplates.find(
      (template) =>
        template.name === templateName &&
        (template.previewType === previewType || !template.previewType)
    );

    if (selected) {
      // Set common settings first
      setFontSize(selected.layout.fontSize);
      setLeftPosition(selected.layout.leftPosition);
      setTopPosition(selected.layout.topPosition);
      setColumnWidth(selected.layout.columnWidth);
      setLabelHeight(selected.layout.labelHeight || 100);
      setHorizontalSpacing(selected.layout.horizontalSpacing || 20);
      setSelectedFields(selected.selectedFields);
      
      // Set data spacing settings if they exist
      if (selected.layout.dataVerticalSpacing !== undefined)
        setDataVerticalSpacing(selected.layout.dataVerticalSpacing);
      if (selected.layout.contentLeftMargin !== undefined)
        setContentLeftMargin(selected.layout.contentLeftMargin);
      if (selected.layout.contentRightMargin !== undefined)
        setContentRightMargin(selected.layout.contentRightMargin);
      if (selected.layout.contentTopMargin !== undefined)
        setContentTopMargin(selected.layout.contentTopMargin);
        
      // Set advanced label controls if they exist
      if (selected.layout.labelsToSkip !== undefined)
        setLabelsToSkip(selected.layout.labelsToSkip);
      if (selected.layout.labelsPerPage !== undefined)
        setLabelsPerPage(selected.layout.labelsPerPage);
      if (selected.layout.verticalGap !== undefined)
        setVerticalGap(selected.layout.verticalGap);
      if (selected.layout.fixedLabelWidth !== undefined)
        setFixedLabelWidth(selected.layout.fixedLabelWidth);
      if (selected.layout.fixedLabelHeight !== undefined)
        setFixedLabelHeight(selected.layout.fixedLabelHeight);
      if (selected.layout.showFixedLabels !== undefined)
        setShowFixedLabels(selected.layout.showFixedLabels);

      // Also update renewal notice settings if they exist in the template
      if (selected.layout.renewalFontSize)
        setRenewalFontSize(selected.layout.renewalFontSize);
      if (selected.layout.renewalLeftMargin)
        setRenewalLeftMargin(selected.layout.renewalLeftMargin);
      if (selected.layout.renewalTopMargin)
        setRenewalTopMargin(selected.layout.renewalTopMargin);
      if (selected.layout.renewalRightColumnPosition)
        setRenewalRightColumnPosition(
          selected.layout.renewalRightColumnPosition
        );
      if (selected.layout.leftColumnLineSpacing)
        setLeftColumnLineSpacing(selected.layout.leftColumnLineSpacing);
      if (selected.layout.rightColumnLineSpacing)
        setRightColumnLineSpacing(selected.layout.rightColumnLineSpacing);
      if (selected.layout.nameAddressSpacing)
        setNameAddressSpacing(selected.layout.nameAddressSpacing);
      if (selected.layout.addressContactSpacing)
        setAddressContactSpacing(selected.layout.addressContactSpacing);
      if (selected.layout.rightColumnItemSpacing)
        setRightColumnItemSpacing(selected.layout.rightColumnItemSpacing);
      if (selected.layout.lineSpacing)
        setLineSpacing(selected.layout.lineSpacing);
      if (selected.layout.greetingTopSpacing)
        setGreetingTopSpacing(selected.layout.greetingTopSpacing);

      // Update thank you letter settings if they exist in the template
      if (selected.layout.thankYouFontSize)
        setThankYouFontSize(selected.layout.thankYouFontSize);
      if (selected.layout.thankYouTopMargin)
        setThankYouTopMargin(selected.layout.thankYouTopMargin);
      if (selected.layout.thankYouLeftMargin)
        setThankYouLeftMargin(selected.layout.thankYouLeftMargin);
      if (selected.layout.thankYouLineSpacing)
        setThankYouLineSpacing(selected.layout.thankYouLineSpacing);
      if (selected.layout.thankYouWidth)
        setThankYouWidth(selected.layout.thankYouWidth);
      if (selected.layout.thankYouDateSpacing)
        setThankYouDateSpacing(selected.layout.thankYouDateSpacing);
      if (selected.layout.thankYouGreetingSpacing)
        setThankYouGreetingSpacing(selected.layout.thankYouGreetingSpacing);
      if (selected.layout.thankYouContentSpacing)
        setThankYouContentSpacing(selected.layout.thankYouContentSpacing);
      if (selected.layout.thankYouGreetingTopSpacing)
        setThankYouGreetingTopSpacing(selected.layout.thankYouGreetingTopSpacing);
    }
    setSelectedTemplate(selected);
  };

  const toggleInputModal = () => {
    setInputModalOpen(!inputModalOpen);
  };

  const toggleShowInputs = () => {
    setShowInputs(!showInputs);
  };

  const generateChecklistHTML = (columns, selectedRows) => {
    const checklistHtml = selectedRows
      .map((row) => {
        const rowData = columns
          .map((column) => {
            if (
              column.id === "Client Name" ||
              column.id === "Address" ||
              column.id === "Contact Info"
            ) {
              // Skip individual rendering for these columns
              return null;
            } else if (
              column.id === "Subscription" &&
              Array.isArray(column.accessorFn(row.original))
            ) {
              // Handle the Subscription column
              const subscriptionData = column.accessorFn(row.original);
              return `
              <td class="checklist-data" style="width: ${
                column.size
              }px; padding-left: 10px;">
                <ul class="max-h-[200px] max-w-[350px] overflow-y-auto scrollbar-hide" style="font-size: 12px;">
                  ${subscriptionData
                    .map(
                      (sub, index) => `
                    <li key=${index} class="text-left border-b border-gray-500 last:border-none pb-2 mb-2">
                      ${sub.subsclass}: ${sub.subsdate} - ${sub.enddate}, Cps: ${sub.copies}
                    </li>
                  `
                    )
                    .join("")}
                </ul>
              </td>
            `;
            }
          })
          .filter(Boolean); // Remove null values

        // Add the ID as the first column
        const idColumn = `<td class="checklist-data" style="width: 50px; border-right: 1px solid #ccc;">${row.original.id}</td>`;
        const servicesColumn = `<td class="checklist-data" style="width: 50px; border-right: 1px solid #ccc;">${row.original.services.join(
          ", "
        )}</td>`;

        // Combine Client Name, Address, and Contact Info into one column
        const clientName = columns
          .find((col) => col.id === "Client Name")
          ?.accessorFn(row.original);

        const address = columns
          .find((col) => col.id === "Address")
          ?.accessorFn(row.original);

        const contactInfo = columns
          .find((col) => col.id === "Contact Info")
          ?.accessorFn(row.original);

        // Extract the type part from the clientName
        const [namePart, typePart] = clientName.split("<br>");

        // Combine the data
        const combinedData = [
          namePart,
          address,
          contactInfo,
          typePart ? `<br><strong>${typePart}</strong>` : "",
        ]
          .filter(Boolean)
          .join(", ");

        // Add the combined data as a single column
        const combinedColumn = `<td class="checklist-data" style="width: 1000px; border-right: 1px solid #ccc;">${combinedData}</td>`;

        // Prepend the ID column and combined data column to the rowData
        rowData.unshift(servicesColumn);
        rowData.unshift(combinedColumn);
        rowData.unshift(idColumn);
        return `<tr class="checklist-row">${rowData.join("")}</tr>`;
      })
      .join("");

    return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          .checklist-row {
            border-bottom: 1px solid #ccc;
          }
          .checklist-item {
            width: 950px;
            border-right: 1px solid #ccc;
          }
          .checklist-item, .checklist-data {
            border: 1px solid #ccc;
            padding: 8px;
            text-align: left;
            vertical-align: top;
            font-size: 12px;
          }
          .checklist-data ul {
            list-style-type: none;
            padding: 0;
            margin: 0;
          }
          .checklist-data li {
            font-size: 12px;
            margin-bottom: 1px;
          }
        </style>
      </head>
      <body>
        <table class="checklist">
          ${checklistHtml}
        </table>
        <script>
          window.print();
          window.close();
        </script>
      </body>
    </html>
    `;
  };

  const handlePrintChecklist = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.open();
    printWindow.document.write(
      generateChecklistHTML(filteredColumns, selectedRows)
    );
    printWindow.document.close();
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

  if (!table) return null;

  return (
    <div className="flex justify-between">
      <div className="flex gap-2">
        <Button
          onClick={toggleModal}
          className="text-sm bg-green-600 hover:bg-green-800 text-white"
        >
          Print Mailing Labels{" "}
          {dataSource === "all"
            ? `(All ${table.getFilteredRowModel().rows.length})`
            : dataSource === "selected"
            ? `(${table.getSelectedRowModel().rows.length} Selected)`
            : "(Custom Range)"}
        </Button>
        <Button
          onClick={() => setCsvExportModal(true)}
          className="text-sm bg-blue-600 hover:bg-blue-800 text-white"
        >
          Export CSV
        </Button>
      </div>

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

      {/* Existing Print Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal}>
        <h2 className="flex justify-center text-xl font-bold text-black mb-2">
          Mailing & Print Options
        </h2>

        <p className="text-center text-sm text-gray-500 mb-4">
          {getRowCount()} {getRowCount() === 1 ? "subscriber" : "subscribers"}{" "}
          {getDataSourceLabel()}
        </p>

        <div className="flex flex-col items-center">
          {/* Main Tabs Navigation */}
          <div className="w-full max-w-xl mb-4 border rounded overflow-hidden">
              <div className="flex w-full bg-gray-100">
                <button
                  className={`flex-1 py-2 font-medium text-sm ${
                    previewType === "standard"
                      ? "bg-white text-blue-600"
                      : "text-gray-600 hover:bg-gray-200"
                  }`}
                  onClick={() => setPreviewType("standard")}
                >
                  Standard Labels
                </button>
                <button
                  className={`flex-1 py-2 font-medium text-sm ${
                    previewType === "renewal"
                      ? "bg-white text-blue-600"
                      : "text-gray-600 hover:bg-gray-200"
                  }`}
                  onClick={() => setPreviewType("renewal")}
                >
                  Renewal Notice
                </button>
                <button
                  className={`flex-1 py-2 font-medium text-sm ${
                    previewType === "thankyou"
                      ? "bg-white text-blue-600"
                      : "text-gray-600 hover:bg-gray-200"
                  }`}
                  onClick={() => setPreviewType("thankyou")}
                >
                  Thank You Letter
                </button>
            </div>
              </div>

          {/* Secondary Tabs Navigation for each section */}
          <div className="w-full max-w-xl mb-4">
            <div className="flex border-b">
              <button
                className={`px-4 py-2 font-medium text-sm border-b-2 ${
                  !showInputs
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setShowInputs(false)}
              >
                Print Options
              </button>
              <button
                className={`px-4 py-2 font-medium text-sm border-b-2 ${
                  showInputs
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setShowInputs(true)}
              >
                Configuration
              </button>
              <button
                className="px-4 py-2 font-medium text-sm border-b-2 border-transparent text-gray-500 hover:text-gray-700 ml-auto"
                onClick={handlePrintChecklist}
                disabled={!hasData}
              >
                Print Checklist
              </button>
            </div>
          </div>

          {/* Template Selection - Improved UI */}
          <div className="w-full max-w-xl p-4 mb-4 border rounded bg-white">
            <h3 className="text-sm font-semibold mb-3 text-gray-700">
              Template Selection
            </h3>
            
            <div className="grid grid-cols-1 gap-3">
              {savedTemplates.filter(
                template => template.previewType === previewType || !template.previewType
              ).length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {savedTemplates
                      .filter(
                        template => template.previewType === previewType || !template.previewType
                      )
                      .map((template) => (
                        <button
                          key={template.name}
                          onClick={() => {
                            const event = { target: { value: template.name } };
                            handleTemplateSelect(event);
                          }}
                          className={`px-3 py-2 text-sm rounded-md border ${
                            selectedTemplate?.name === template.name
                              ? "bg-blue-50 border-blue-300 text-blue-700"
                              : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {template.name}
                        </button>
                      ))}
                  </div>
                  
                  {selectedTemplate && (
                    <div className="mt-1 bg-blue-50 p-2 rounded-md">
                      <p className="text-xs text-blue-700">
                        <strong>Using:</strong> {selectedTemplate.name} 
                        <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                        {selectedTemplate.previewType === "renewal"
                            ? "Renewal Notice"
                          : selectedTemplate.previewType === "thankyou"
                            ? "Thank You Letter"
                            : "Standard Label"}
                      </span>
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500 italic">No templates available for this format. Configure settings and save a template.</p>
              )}
              
              <div className="mt-2">
                <Button
                  onClick={handleSaveClick}
                  variant="outline"
                  className="w-full text-sm"
                >
                  Save Current Settings as Template
                </Button>
                </div>
              
              {showTemplateNameInput && (
                <div className="flex flex-col mt-2 bg-gray-50 p-3 rounded-md border">
                  <input
                    type="text"
                    value={templateName}
                    onChange={handleTemplateNameChange}
                    placeholder={`Enter template name`}
                    className="border border-gray-300 rounded p-2 text-sm mb-3 w-full"
                  />
                  <div className="flex space-x-2 w-full">
                    <Button onClick={saveTemplate} className="w-full text-sm">
                      Save
                    </Button>
                    <Button
                      onClick={() => {
                        setShowTemplateNameInput(false);
                        setTemplateName("");
                      }}
                      variant="outline"
                      className="w-full text-sm"
                    >
                      Cancel
                    </Button>
              </div>
                </div>
              )}
            </div>
          </div>

          {/* Data Source Selection */}
          {!showInputs && (
            <div className="w-full max-w-xl p-4 mb-4 bg-white rounded border">
              <h3 className="text-sm font-semibold mb-3 text-gray-700">Data Source</h3>
              <div className="flex flex-wrap gap-2 mb-2">
                <Button
                  onClick={() => handleDataSourceChange("all")}
                  variant={dataSource === "all" ? "default" : "outline"}
                  className="flex-1 text-sm"
                >
                  All Records ({table.getFilteredRowModel().rows.length})
                </Button>
                <Button
                  onClick={() => handleDataSourceChange("selected")}
                  variant={dataSource === "selected" ? "default" : "outline"}
                  className="flex-1 text-sm"
                  disabled={table.getSelectedRowModel().rows.length === 0}
                >
                  Selected ({table.getSelectedRowModel().rows.length})
                </Button>
                <Button
                  onClick={() => handleDataSourceChange("range")}
                  variant={dataSource === "range" ? "default" : "outline"}
                  className="flex-1 text-sm"
                >
                  ID Range
                </Button>
              </div>
              {dataSource === "selected" &&
                table.getSelectedRowModel().rows.length === 0 && (
                  <p className="text-xs text-red-500">
                    No rows selected. Please select rows in the table first.
                  </p>
                )}
            </div>
          )}

          {/* Client ID Range Input - improved UI */}
          {!showInputs && dataSource === "range" && (
            <div className="w-full max-w-xl p-4 mb-4 bg-white rounded border">
              <h3 className="text-sm font-semibold mb-3 text-gray-700">ID Range Selection</h3>

              <div className="flex items-center space-x-3 w-full mb-3">
                <label
                  htmlFor="startId"
                  className="text-sm w-24 text-right font-medium text-gray-600"
                >
                  Start ID:
                </label>
                <input
                  type="text"
                  id="startId"
                  value={startClientId}
                  onChange={(e) => setStartClientId(e.target.value)}
                  placeholder={`First: ${
                    table.getFilteredRowModel().rows[0]?.original?.id || "N/A"
                  }`}
                  className="border border-gray-300 rounded p-2 w-full text-sm"
                />
              </div>
              <div className="flex items-center space-x-3 w-full mb-3">
                <label
                  htmlFor="endId"
                  className="text-sm w-24 text-right font-medium text-gray-600"
                >
                  End ID:
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
                  className="border border-gray-300 rounded p-2 w-full text-sm"
                />
              </div>

              {previewType === "standard" && (
                <div className="flex items-center justify-center space-x-4 w-full bg-gray-50 p-3 rounded mt-3">
                  <span className="text-sm font-medium text-gray-600">
                    Start Position:
                  </span>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="startLeft"
                      name="startPosition"
                      value="left"
                      checked={startPosition === "left"}
                      onChange={(e) => setStartPosition(e.target.value)}
                      className="mr-1 text-blue-600"
                    />
                    <label htmlFor="startLeft" className="text-sm">
                      Left
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="startRight"
                      name="startPosition"
                      value="right"
                      checked={startPosition === "right"}
                      onChange={(e) => setStartPosition(e.target.value)}
                      className="mr-1 text-blue-600"
                    />
                    <label htmlFor="startRight" className="text-sm">
                      Right
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Configuration Inputs (in dedicated tab) */}
          {showInputs && (
            <div className="w-full max-w-xl">
              {/* Show a condensed configuration UI based on the previewType */}
              <div className="p-4 border rounded mb-4 w-full bg-white">
                <h3 className="text-md font-semibold mb-3 text-gray-700">
                {previewType === "standard"
                  ? "Standard Label Settings"
                  : previewType === "renewal"
                  ? "Renewal Notice Settings"
                  : "Thank You Letter Settings"}
              </h3>

              {previewType === "standard" ? (
                <>
                  {/* Standard Mailing Label Settings - improved organization */}
                  <div className="w-full">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3 w-full">
                      <div className="col-span-2 mb-1">
                        <h4 className="text-sm font-semibold text-gray-700">
                          Label Size & Position
                        </h4>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                          Font Size:
                        </label>
                        <input
                          type="number"
                          value={fontSize}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={handleFontSize}
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                          Column Width (px):
                        </label>
                        <input
                          type="number"
                          value={columnWidth}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={handleColumnWidthChange}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3 w-full">
                      <div className="col-span-2 mb-1">
                        <h4 className="text-sm font-semibold text-gray-700">
                          Margins & Spacing
                        </h4>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                          Left Margin (px):
                        </label>
                        <input
                          type="number"
                          value={leftPosition}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={handleLeftPositionChange}
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                          Top Margin (px):
                        </label>
                        <input
                          type="number"
                          value={topPosition}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={handleTopPositionChange}
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                            Label Height (px):
                        </label>
                        <input
                          type="number"
                          value={labelHeight}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                            setLabelHeight(parseInt(e.target.value, 10) || 100)
                          }
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                            Horizontal Spacing (px):
                        </label>
                        <input
                          type="number"
                          value={horizontalSpacing}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                            setHorizontalSpacing(
                              parseInt(e.target.value, 10) || 20
                            )
                          }
                        />
                      </div>
                    </div>

                      {/* Data Spacing Controls - New section */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3 w-full">
                      <div className="col-span-2 mb-1">
                        <h4 className="text-sm font-semibold text-gray-700">
                            Content Positioning
                        </h4>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                            Left Margin (px):
                        </label>
                        <input
                          type="number"
                            min="0"
                            value={contentLeftMargin}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                              setContentLeftMargin(parseInt(e.target.value, 10) || 4)
                          }
                        />
                          <p className="text-xs text-gray-500 mt-1">Space on the left side of content</p>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                            Right Margin (px):
                        </label>
                        <input
                          type="number"
                            min="0"
                            value={contentRightMargin}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                              setContentRightMargin(parseInt(e.target.value, 10) || 4)
                          }
                        />
                          <p className="text-xs text-gray-500 mt-1">Space on the right side of content</p>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                          Top Margin (px):
                        </label>
                        <input
                          type="number"
                            min="0"
                            value={contentTopMargin}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                              setContentTopMargin(parseInt(e.target.value, 10) || 4)
                          }
                        />
                          <p className="text-xs text-gray-500 mt-1">Space at the top of content</p>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                            Line Spacing (px):
                        </label>
                        <input
                          type="number"
                            min="0"
                            value={dataVerticalSpacing}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                              setDataVerticalSpacing(parseInt(e.target.value, 10) || 1)
                          }
                        />
                          <p className="text-xs text-gray-500 mt-1">Space between lines of data</p>
                      </div>
                    </div>

                      {/* Advanced Label Controls - New section */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3 w-full">
                      <div className="col-span-2 mb-1">
                        <h4 className="text-sm font-semibold text-gray-700">
                            Advanced Label Controls
                        </h4>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                            Skip First Labels:
                        </label>
                        <input
                          type="number"
                            min="0"
                            value={labelsToSkip}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                              setLabelsToSkip(parseInt(e.target.value, 10) || 0)
                          }
                        />
                          <p className="text-xs text-gray-500 mt-1">Labels to skip at the beginning (for partially used sheets)</p>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                            Labels Per Page:
                        </label>
                        <input
                          type="number"
                            min="2"
                            step="2"
                            value={labelsPerPage}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                              setLabelsPerPage(Math.max(2, parseInt(e.target.value, 10) || 16))
                          }
                        />
                          <p className="text-xs text-gray-500 mt-1">Total labels per page (must be even)</p>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                            Horizontal Spacing (px):
                        </label>
                        <input
                          type="number"
                            min="0"
                            value={horizontalSpacing}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                              setHorizontalSpacing(parseInt(e.target.value, 10) || 20)
                            }
                          />
                          <p className="text-xs text-gray-500 mt-1">Space between columns</p>
                        </div>
                        <div className="flex flex-col">
                          <label className="text-xs text-gray-600 mb-1">
                            Vertical Gap (px):
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={verticalGap}
                            className="border border-gray-300 rounded p-1 text-center w-full"
                            onChange={(e) =>
                              setVerticalGap(parseInt(e.target.value, 10) || 0)
                            }
                          />
                          <p className="text-xs text-gray-500 mt-1">Space between rows</p>
                      </div>
                    </div>

                      {/* Physical Label Size Controls - New section */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3 w-full">
                      <div className="col-span-2 mb-1">
                        <h4 className="text-sm font-semibold text-gray-700">
                            Physical Label Size
                        </h4>
                      </div>
                        <div className="col-span-2 mb-2">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="show-fixed-labels"
                              checked={showFixedLabels}
                              onChange={() => setShowFixedLabels(!showFixedLabels)}
                              className="mr-2"
                            />
                            <label htmlFor="show-fixed-labels" className="text-sm text-gray-700">
                              Show fixed label boundaries in preview
                            </label>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Enable to see the physical label size separate from content area</p>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                            Fixed Label Width (px):
                        </label>
                        <input
                          type="number"
                            min="96"
                            value={fixedLabelWidth}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                              setFixedLabelWidth(Math.max(96, parseInt(e.target.value, 10) || 408))
                          }
                        />
                          <p className="text-xs text-gray-500 mt-1">Physical width of each label (≈ {(fixedLabelWidth/96).toFixed(2)} inches)</p>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                            Fixed Label Height (px):
                        </label>
                        <input
                          type="number"
                            min="72"
                            value={fixedLabelHeight}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                              setFixedLabelHeight(Math.max(72, parseInt(e.target.value, 10) || 336))
                            }
                          />
                          <p className="text-xs text-gray-500 mt-1">Physical height of each label (≈ {(fixedLabelHeight/96).toFixed(2)} inches)</p>
                        </div>
                        <div className="col-span-2 mt-1">
                          <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                            The column width setting controls how much space your data occupies within the fixed label size. 
                            This helps match your printing to pre-sized sticker labels.
                          </p>
                        </div>
                      </div>

                      {/* Field Selection - Better organized */}
                      <div className="mb-3 w-full bg-gray-50 p-3 rounded mt-3">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                          Content Options
                        </h4>
                        <div className="flex flex-wrap gap-4 justify-start">
                          {fields.map((field) => (
                            <div
                              key={field.value}
                              className="flex items-center gap-1 text-black text-sm"
                            >
                              <input
                                type="checkbox"
                                id={`field-${field.value}`}
                                checked={selectedFields.includes(field.value)}
                                onChange={() => handleFieldChange(field.value)}
                                className="text-blue-600 border-gray-300 h-4 w-4"
                              />
                              <label htmlFor={`field-${field.value}`}>
                                {field.label}
                              </label>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : previewType === "renewal" ? (
                // Renewal Notice Settings - Added proper configuration UI
                <>
                  <div className="w-full">
                    <div className="bg-blue-50 p-2 rounded mb-3 text-xs text-blue-700">
                      These settings control how renewal notices appear on letter size paper (8.5" × 11"). 
                      Each subscriber will get their own page with two columns.
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3 w-full">
                      <div className="col-span-2 mb-1">
                        <h4 className="text-sm font-semibold text-gray-700">
                          Page Layout Settings
                        </h4>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                          Font Size:
                        </label>
                        <input
                          type="number"
                          value={renewalFontSize}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                            setRenewalFontSize(
                              parseInt(e.target.value, 10) || 14
                            )
                          }
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                          Left Margin (px):
                        </label>
                        <input
                          type="number"
                          value={renewalLeftMargin}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                            setRenewalLeftMargin(
                              parseInt(e.target.value, 10) || 40
                            )
                          }
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                          Top Margin (px):
                        </label>
                        <input
                          type="number"
                          value={renewalTopMargin}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                            setRenewalTopMargin(
                              parseInt(e.target.value, 10) || 40
                            )
                          }
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                          Right Column Position (px):
                        </label>
                        <input
                          type="number"
                          value={renewalRightColumnPosition}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                            setRenewalRightColumnPosition(
                              parseInt(e.target.value, 10) || 400
                            )
                          }
                        />
                        <p className="text-xs text-gray-500 mt-1">Distance from left edge where right column starts</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3 w-full">
                      <div className="col-span-2 mb-1">
                        <h4 className="text-sm font-semibold text-gray-700">
                          Left Column Spacing
                        </h4>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                          Name-Address Spacing (px):
                        </label>
                        <input
                          type="number"
                          value={nameAddressSpacing}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                            setNameAddressSpacing(
                              parseInt(e.target.value, 10) || 1
                            )
                          }
                        />
                        <p className="text-xs text-gray-500 mt-1">Space between name and address</p>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                          Address-Contact Spacing (px):
                        </label>
                        <input
                          type="number"
                          value={addressContactSpacing}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                            setAddressContactSpacing(
                              parseInt(e.target.value, 10) || 1
                            )
                          }
                        />
                        <p className="text-xs text-gray-500 mt-1">Space between address and contact info</p>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                          Left Column Line Spacing (px):
                        </label>
                        <input
                          type="number"
                          value={leftColumnLineSpacing}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                            setLeftColumnLineSpacing(
                              parseInt(e.target.value, 10) || 8
                            )
                          }
                        />
                        <p className="text-xs text-gray-500 mt-1">Space at bottom of contact info</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3 w-full">
                      <div className="col-span-2 mb-1">
                        <h4 className="text-sm font-semibold text-gray-700">
                          Right Column Spacing
                        </h4>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                          Item Spacing (px):
                        </label>
                        <input
                          type="number"
                          value={rightColumnItemSpacing}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                            setRightColumnItemSpacing(
                              parseInt(e.target.value, 10) || 16
                            )
                          }
                        />
                        <p className="text-xs text-gray-500 mt-1">Space between items in right column</p>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                          Line Spacing (px):
                        </label>
                        <input
                          type="number"
                          value={rightColumnLineSpacing}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                            setRightColumnLineSpacing(
                              parseInt(e.target.value, 10) || 12
                            )
                          }
                        />
                        <p className="text-xs text-gray-500 mt-1">Bottom space after last item</p>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                          Horizontal Text Spacing (px):
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={dataHorizontalSpacing}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                            setDataHorizontalSpacing(
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                        />
                        <p className="text-xs text-gray-500 mt-1">Left/right padding for text</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3 w-full">
                      <div className="col-span-2 mb-1">
                        <h4 className="text-sm font-semibold text-gray-700">
                          Greeting Settings
                        </h4>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                          Greeting Top Spacing (px):
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={greetingTopSpacing}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                            setGreetingTopSpacing(
                              parseInt(e.target.value, 10) || 80
                            )
                          }
                        />
                        <p className="text-xs text-gray-500 mt-1">Space above the "Dear" greeting</p>
                      </div>
                    </div>

                    {/* Field Selection for Renewal Notice */}
                    <div className="mb-3 w-full bg-gray-50 p-3 rounded mt-3">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        Content Options
                      </h4>
                      <div className="flex flex-wrap gap-4 justify-start">
                        {fields.map((field) => (
                          <div
                            key={field.value}
                            className="flex items-center gap-1 text-black text-sm"
                          >
                            <input
                              type="checkbox"
                              id={`field-renewal-${field.value}`}
                              checked={selectedFields.includes(field.value)}
                              onChange={() => handleFieldChange(field.value)}
                              className="text-blue-600 border-gray-300 h-4 w-4"
                            />
                            <label htmlFor={`field-renewal-${field.value}`}>
                              {field.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                // Thank You Letter Settings - Improved organization
                <>
                  <div className="w-full">
                    <div className="bg-blue-50 p-2 rounded mb-3 text-xs text-blue-700">
                      These settings control how thank you letters appear on letter size paper (8.5" × 11").
                      Each subscriber will get their own page.
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3 w-full">
                      <div className="col-span-2 mb-1">
                        <h4 className="text-sm font-semibold text-gray-700">
                          Basic Settings
                        </h4>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                          Font Size:
                        </label>
                        <input
                          type="number"
                          value={thankYouFontSize}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                            setThankYouFontSize(
                              parseInt(e.target.value, 10) || 14
                            )
                          }
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                          Width (px):
                        </label>
                        <input
                          type="number"
                          value={thankYouWidth}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                            setThankYouWidth(
                              parseInt(e.target.value, 10) || 400
                            )
                          }
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                          Top Margin (px):
                        </label>
                        <input
                          type="number"
                          value={thankYouTopMargin}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                            setThankYouTopMargin(
                              parseInt(e.target.value, 10) || 60
                            )
                          }
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                          Left Margin (px):
                        </label>
                        <input
                          type="number"
                          value={thankYouLeftMargin}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                            setThankYouLeftMargin(
                              parseInt(e.target.value, 10) || 60
                            )
                          }
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                          Line Spacing (px):
                        </label>
                        <input
                          type="number"
                          value={thankYouLineSpacing}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                            setThankYouLineSpacing(
                              parseInt(e.target.value, 10) || 16
                            )
                          }
                        />
                      </div>
                    </div>
                    
                    {/* Greeting Settings for Thank You Letter - added from renewal */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3 w-full">
                      <div className="col-span-2 mb-1">
                        <h4 className="text-sm font-semibold text-gray-700">
                          Greeting Settings
                        </h4>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                          Greeting Top Spacing (px):
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={thankYouGreetingTopSpacing}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                            setThankYouGreetingTopSpacing(
                              parseInt(e.target.value, 10) || 165
                            )
                          }
                        />
                        <p className="text-xs text-gray-500 mt-1">Space above the "Dear" greeting</p>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                          Horizontal Text Spacing (px):
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={dataHorizontalSpacing}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                            setDataHorizontalSpacing(
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                        />
                        <p className="text-xs text-gray-500 mt-1">Left/right padding for text</p>
                      </div>
                    </div>

                    {/* Field Selection for Thank You Letter */}
                    <div className="mb-3 w-full bg-gray-50 p-3 rounded mt-3">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        Content Options
                      </h4>
                      <div className="flex flex-wrap gap-4 justify-start">
                        {fields.map((field) => (
                          <div
                            key={field.value}
                            className="flex items-center gap-1 text-black text-sm"
                          >
                            <input
                              type="checkbox"
                              id={`field-ty-${field.value}`}
                              checked={selectedFields.includes(field.value)}
                              onChange={() => handleFieldChange(field.value)}
                              className="text-blue-600 border-gray-300 h-4 w-4"
                            />
                            <label htmlFor={`field-ty-${field.value}`}>
                              {field.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
                )}
              </div>
            </div>
          )}

          {/* Preview Area */}
          <div className="w-full max-w-xl mb-4 border rounded bg-white">
            <h3 className="text-md font-semibold p-3 border-b text-gray-700">Preview</h3>
            
            {previewType === "standard" ? (
              // Standard Mailing Labels Preview - Updated to match continuous feed sticker paper
              <div
                style={{
                  padding: "20px",
                  width: "100%",
                  boxSizing: "border-box",
                  position: "relative",
                  fontFamily: "Arial, sans-serif"
                }}
              >
                {/* Measurement indicators */}
                <div className="measurement-indicators" style={{ marginBottom: "10px", fontSize: "11px", color: "#555" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span className="font-semibold">Left margin:</span> {leftPosition}px
                      </div>
                    <div>
                      <span className="font-semibold">Column width:</span> {columnWidth}px
                    </div>
                    <div>
                      <span className="font-semibold">Spacing:</span> {horizontalSpacing}px
                </div>
              </div>
                  <div style={{ display: "flex", alignItems: "center", marginTop: "4px", flexWrap: "wrap" }}>
                    <span className="font-semibold mr-1">Top margin:</span> {topPosition}px
                    <span className="mx-3">|</span>
                    <span className="font-semibold mr-1">Label height:</span> {labelHeight}px
                    <span className="mx-3">|</span>
                    <span className="font-semibold mr-1">Font size:</span> {fontSize}px
                    <span className="mx-3">|</span>
                    <span className="font-semibold mr-1">Vertical gap:</span> {verticalGap}px
            </div>
                  <div style={{ display: "flex", alignItems: "center", marginTop: "4px", flexWrap: "wrap", fontSize: "10px", color: "#666" }}>
                    <span>Content margins: L:{contentLeftMargin}px R:{contentRightMargin}px T:{contentTopMargin}px | Line spacing: {dataVerticalSpacing}px</span>
                  </div>
                </div>

                {/* Container with dashed border to represent continuous feed paper */}
                <div 
                style={{
                    border: "1px solid #ccc", 
                    borderRadius: "0",
                    position: "relative",
                    width: "100%",
                    height: "380px",
                    boxSizing: "border-box",
                    overflow: "hidden",
                    backgroundColor: "#fff",
                    fontFamily: "Arial, sans-serif"
                  }}
                >
                  {/* Left perforation marks */}
                  <div style={{ position: "absolute", left: "0", top: "0", width: "15px", height: "100%", borderRight: "1px dashed #aaa" }}>
                    {Array.from({ length: 15 }).map((_, i) => (
                      <div key={`left-${i}`} style={{ 
                        position: "absolute", 
                        left: "0", 
                        top: `${i * 25}px`, 
                        width: "10px", 
                        height: "5px", 
                        backgroundColor: "#ddd",
                        borderRadius: "50%"
                      }}></div>
                    ))}
                  </div>
                  
                  {/* Right perforation marks */}
                  <div style={{ position: "absolute", right: "0", top: "0", width: "15px", height: "100%", borderLeft: "1px dashed #aaa" }}>
                    {Array.from({ length: 15 }).map((_, i) => (
                      <div key={`right-${i}`} style={{ 
                        position: "absolute", 
                        right: "0", 
                        top: `${i * 25}px`, 
                        width: "10px", 
                        height: "5px", 
                        backgroundColor: "#ddd",
                        borderRadius: "50%"
                      }}></div>
                    ))}
                  </div>
                  
                  {/* Labels container */}
                  <div style={{ 
                    position: "relative", 
                    width: "calc(100% - 30px)", 
                    height: "100%", 
                    margin: "0 15px",
                    paddingLeft: `${leftPosition}px` // Added left padding for the entire container
                  }}>
                    {/* Guides for the labels - showing multiple rows */}
                    {Array.from({ length: Math.min(8, Math.ceil(labelsPerPage/2)) }).map((_, rowIndex) => {
                      // Calculate the label index for this row (2 labels per row)
                      const leftLabelIndex = rowIndex * 2;
                      const rightLabelIndex = rowIndex * 2 + 1;
                      
                      // Check if this label should be skipped
                      const isLeftSkipped = leftLabelIndex < labelsToSkip;
                      const isRightSkipped = rightLabelIndex < labelsToSkip;
                      
                      // Calculate top margin with vertical gap
                      const topMargin = rowIndex === 0 
                        ? topPosition 
                        : (rowIndex > 0 ? verticalGap : 0);
                      
                      return (
                        <div key={`row-${rowIndex}`} style={{ 
                          display: "flex", 
                          justifyContent: "space-between", // Changed to space-between for equal spacing
                          marginTop: rowIndex > 0 ? `${verticalGap}px` : '0',
                          width: "100%",
                          maxWidth: `${(showFixedLabels ? (fixedLabelWidth * 2) : (columnWidth * 2)) + horizontalSpacing}px`
                        }}>
                          {/* Left column label */}
                          <div
                  style={{
                              width: showFixedLabels ? `${fixedLabelWidth}px` : `${columnWidth}px`,
                              height: showFixedLabels ? `${fixedLabelHeight}px` : `${labelHeight}px`,
                              border: "1px solid #ddd",
                              margin: `${rowIndex === 0 ? topPosition : 0}px 0 0 0`, // Removed left margin
                              padding: "0",
                              position: "relative",
                              backgroundColor: isLeftSkipped ? "#f8f8f8" : "#fff",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                              overflow: "hidden"
                            }}
                          >
                            {/* Content container inside fixed label */}
                            <div style={{ 
                    width: `${columnWidth}px`,
                    height: `${labelHeight}px`,
                              padding: `${contentTopMargin}px ${contentRightMargin}px ${dataVerticalSpacing}px ${contentLeftMargin}px`,
                    fontSize: `${fontSize}px`,
                              position: showFixedLabels ? "absolute" : "static",
                              top: "50%",
                              left: "50%",
                              transform: showFixedLabels ? "translate(-50%, -50%)" : "none",
                              border: showFixedLabels ? "1px dashed #ccc" : "none",
                              boxSizing: "border-box",
                              wordBreak: "break-word",
                              overflow: "hidden"
                            }}>
                              {isLeftSkipped ? (
                                <div className="skipped-label" style={{ 
                                  position: "absolute", 
                                  top: "50%", 
                                  left: "50%", 
                                  transform: "translate(-50%, -50%)",
                                  fontSize: "14px",
                                  color: "#aaa",
                                  fontStyle: "italic",
                                  textAlign: "center"
                                }}>
                                  <span>Skipped</span>
                                  <div style={{ fontSize: "10px", marginTop: "5px" }}>Label #{leftLabelIndex + 1}</div>
                                </div>
                              ) : selectedRows.length > (leftLabelIndex - labelsToSkip) && (leftLabelIndex - labelsToSkip) >= 0 ? (
                                <>
                                  <div style={{ fontSize: `${fontSize}px`, marginBottom: `${dataVerticalSpacing}px` }}>
                                    {selectedRows[leftLabelIndex - labelsToSkip]?.original?.id || ""} - {selectedRows[leftLabelIndex - labelsToSkip]?.original?.wmmData?.records?.[0]?.subsdate ? new Date(selectedRows[leftLabelIndex - labelsToSkip].original.wmmData.records[0].subsdate).toLocaleDateString() : ""} - {selectedRows[leftLabelIndex - labelsToSkip]?.original?.wmmData?.records?.[0]?.copies || ""}cps/{selectedRows[leftLabelIndex - labelsToSkip]?.original?.acode || ""}
                                  </div>
                                  <div style={{ fontSize: `${fontSize}px`, marginBottom: `${dataVerticalSpacing}px` }}>
                                    {getFullName(selectedRows[leftLabelIndex - labelsToSkip]?.original || {})}
                                  </div>
                                  <div style={{ fontSize: `${fontSize}px`, marginBottom: `${dataVerticalSpacing}px` }}>
                                    {selectedRows[leftLabelIndex - labelsToSkip]?.original?.address || ""}
                                  </div>
                      {selectedFields.includes("contactnos") && (
                                    <div style={{ fontSize: `${fontSize}px` }}>
                                      {getContactNumber(selectedRows[leftLabelIndex - labelsToSkip]?.original || {})}
                                    </div>
                      )}
                    </>
                  ) : (
                                <span className="text-xs text-gray-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">[Empty]</span>
                  )}
                </div>

                            {/* Size indicators - only shown when fixed labels are enabled */}
                            {showFixedLabels && (
                              <div style={{ position: "absolute", bottom: "2px", right: "2px", fontSize: "8px", color: "#aaa" }}>
                                {(fixedLabelWidth/96).toFixed(2)}″×{(fixedLabelHeight/96).toFixed(2)}″
                              </div>
                            )}
                          </div>

                          {/* Explicit spacing div */}
                          <div style={{ width: `${horizontalSpacing}px`, height: "1px" }}></div>

                          {/* Right column label */}
                          <div
                  style={{
                              width: showFixedLabels ? `${fixedLabelWidth}px` : `${columnWidth}px`,
                              height: showFixedLabels ? `${fixedLabelHeight}px` : `${labelHeight}px`,
                              border: "1px solid #ddd",
                              margin: `${rowIndex === 0 ? topPosition : 0}px 0 0 0`,
                              padding: "0",
                              position: "relative",
                              backgroundColor: isRightSkipped ? "#f8f8f8" : "#fff",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                              overflow: "hidden"
                            }}
                          >
                            {/* Content container inside fixed label */}
                            <div style={{ 
                    width: `${columnWidth}px`,
                    height: `${labelHeight}px`,
                              padding: `${contentTopMargin}px ${contentRightMargin}px ${dataVerticalSpacing}px ${contentLeftMargin}px`,
                    fontSize: `${fontSize}px`,
                              position: showFixedLabels ? "absolute" : "static",
                              top: "50%",
                              left: "50%",
                              transform: showFixedLabels ? "translate(-50%, -50%)" : "none",
                              border: showFixedLabels ? "1px dashed #ccc" : "none",
                              boxSizing: "border-box",
                              wordBreak: "break-word",
                              overflow: "hidden"
                            }}>
                              {isRightSkipped ? (
                                <div className="skipped-label" style={{ 
                                  position: "absolute", 
                                  top: "50%", 
                                  left: "50%", 
                                  transform: "translate(-50%, -50%)",
                                  fontSize: "14px",
                                  color: "#aaa",
                                  fontStyle: "italic",
                                  textAlign: "center"
                                }}>
                                  <span>Skipped</span>
                                  <div style={{ fontSize: "10px", marginTop: "5px" }}>Label #{rightLabelIndex + 1}</div>
                                </div>
                              ) : selectedRows.length > (rightLabelIndex - labelsToSkip) && (rightLabelIndex - labelsToSkip) >= 0 ? (
                                <>
                                  <div style={{ fontSize: `${fontSize}px`, marginBottom: `${dataVerticalSpacing}px` }}>
                                    {selectedRows[rightLabelIndex - labelsToSkip]?.original?.id || ""} - {selectedRows[rightLabelIndex - labelsToSkip]?.original?.wmmData?.records?.[0]?.subsdate ? new Date(selectedRows[rightLabelIndex - labelsToSkip].original.wmmData.records[0].subsdate).toLocaleDateString() : ""} - {selectedRows[rightLabelIndex - labelsToSkip]?.original?.wmmData?.records?.[0]?.copies || ""}cps/{selectedRows[rightLabelIndex - labelsToSkip]?.original?.acode || ""}
                                  </div>
                                  <div style={{ fontSize: `${fontSize}px`, marginBottom: `${dataVerticalSpacing}px` }}>
                                    {getFullName(selectedRows[rightLabelIndex - labelsToSkip]?.original || {})}
                                  </div>
                                  <div style={{ fontSize: `${fontSize}px`, marginBottom: `${dataVerticalSpacing}px` }}>
                                    {selectedRows[rightLabelIndex - labelsToSkip]?.original?.address || ""}
                                  </div>
                      {selectedFields.includes("contactnos") && (
                                    <div style={{ fontSize: `${fontSize}px` }}>
                                      {getContactNumber(selectedRows[rightLabelIndex - labelsToSkip]?.original || {})}
                                    </div>
                      )}
                    </>
                  ) : (
                                <span className="text-xs text-gray-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">[Empty]</span>
                              )}
                            </div>
                            
                            {/* Size indicators - only shown when fixed labels are enabled */}
                            {showFixedLabels && (
                              <div style={{ position: "absolute", bottom: "2px", right: "2px", fontSize: "8px", color: "#aaa" }}>
                                {(fixedLabelWidth/96).toFixed(2)}″×{(fixedLabelHeight/96).toFixed(2)}″
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Label count indicator */}
                    {labelsPerPage > 16 && (
                      <div style={{ 
                        position: "absolute", 
                        bottom: "-20px", 
                        left: "0", 
                        width: "100%", 
                        textAlign: "center", 
                        fontSize: "11px", 
                        color: "#777"
                      }}>
                        {labelsPerPage} labels per page ({labelsPerPage/2} rows × 2 columns)
                        {labelsToSkip > 0 ? ` • First ${labelsToSkip} labels skipped` : ''}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Simple hint about start position */}
                <div className="text-xs text-gray-500 text-center mt-2 mb-1">
                  Starting on {startPosition}
                </div>
              </div>
            ) : previewType === "renewal" ? (
              // Renewal Letter Preview with constrained height container
              <div className="preview-container" style={{ height: "400px", overflow: "hidden", position: "relative", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
                <div
                  className="renewal-preview border border-dashed border-gray-300 relative bg-white mx-auto"
                  style={{
                    width: "215.9mm", // Letter width (8.5 inches)
                    height: "279.4mm", // Letter height (11 inches)
                    padding: "0",
                    maxWidth: "none",
                    maxHeight: "none",
                    transform: "scale(0.35)",
                    transformOrigin: "top center",
                    overflow: "hidden",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                    margin: "0 auto",
                    display: "block",
                    fontFamily: "Arial, sans-serif"
                  }}
                >
                  {selectedRows.length > 0 ? (
                    <div style={{ padding: "0.5in", width: "100%", height: "100%", position: "relative" }}>
                    {/* Left column */}
                    <div
                      style={{
                        position: "absolute",
                        left: `${renewalLeftMargin}px`,
                        top: `${renewalTopMargin}px`,
                        width: `${
                          renewalRightColumnPosition - renewalLeftMargin - 20
                        }px`,
                      }}
                    >
                      <p
                        style={{
                          fontSize: `${renewalFontSize}px`,
                          margin: `0 0 ${nameAddressSpacing}px 0`,
                          padding: `0 ${dataHorizontalSpacing}px`,
                        }}
                      >
                        {getFullName(selectedRows[0]?.original || {})}
                      </p>
                      <p
                        style={{
                          fontSize: `${renewalFontSize}px`,
                          margin: `0 0 ${addressContactSpacing}px 0`,
                          padding: `0 ${dataHorizontalSpacing}px`,
                          whiteSpace: "pre-line",
                        }}
                      >
                        {selectedRows[0]?.original?.address || ""}
                      </p>
                      <p
                        style={{
                          fontSize: `${renewalFontSize}px`,
                          margin: `0 0 ${leftColumnLineSpacing}px 0`,
                          padding: `0 ${dataHorizontalSpacing}px`,
                        }}
                      >
                        {getContactNumber(selectedRows[0]?.original || {})}
                      </p>
                    </div>

                    {/* Right column */}
                    <div
                      style={{
                        position: "absolute",
                        left: `${renewalRightColumnPosition}px`,
                        top: `${renewalTopMargin}px`,
                        width: `${
                          215.9 * 3.78 - renewalRightColumnPosition - 40
                        }px`,
                      }}
                    >
                      <p
                        style={{
                          fontSize: `${renewalFontSize}px`,
                          margin: `0 0 ${rightColumnItemSpacing}px 0`,
                          padding: `0 ${dataHorizontalSpacing}px`,
                        }}
                      >
                        {selectedRows[0]?.original?.id || ""}
                      </p>
                      <p
                        style={{
                          fontSize: `${renewalFontSize}px`,
                          margin: `0 0 ${rightColumnItemSpacing}px 0`,
                          padding: `0 ${dataHorizontalSpacing}px`,
                        }}
                      >
                        {selectedRows[0]?.original?.wmmData?.records?.[0]
                          ?.enddate
                          ? new Date(
                              selectedRows[0].original.wmmData.records[0].enddate
                            ).toLocaleDateString()
                          : "N/A"}
                      </p>
                      <p
                        style={{
                          fontSize: `${renewalFontSize}px`,
                          margin: `0 0 ${rightColumnLineSpacing}px 0`,
                          padding: `0 ${dataHorizontalSpacing}px`,
                        }}
                      >
                        {selectedRows[0]?.original?.wmmData?.records?.[0]
                          ?.enddate
                          ? (() => {
                              const date = new Date(
                                selectedRows[0].original.wmmData.records[0].enddate
                              );
                              const month = date.toLocaleString("default", {
                                month: "long",
                              });
                              const year = date.getFullYear();
                              return `${month} ${year}`;
                            })()
                          : "N/A"}
                      </p>
                    </div>
                    
                    {/* Greeting Line at Bottom */}
                    <div
                      style={{
                        position: "absolute",
                        left: `${renewalLeftMargin}px`,
                        top: `${renewalTopMargin + greetingTopSpacing}px`,
                        width: "80%",
                      }}
                    >
                      <p
                        style={{
                          fontSize: `${renewalFontSize}px`,
                          padding: `0 ${dataHorizontalSpacing}px`,
                        }}
                      >
                        Dear {selectedRows[0]?.original?.title ? `${selectedRows[0].original.title} ` : ""}{selectedRows[0]?.original?.fname ? `${selectedRows[0].original.fname} ` : ""}{selectedRows[0]?.original?.lname || ""}
                      </p>
                    </div>
                  </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "100%",
                      }}
                    >
                      <p className="text-gray-500">Select a row to preview renewal notice</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Thank You Letter Preview with constrained height container
              <div className="preview-container" style={{ height: "400px", overflow: "hidden", position: "relative", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
                <div
                  className="thankyou-preview border border-dashed border-gray-300 relative bg-white mx-auto"
                  style={{
                    width: "215.9mm", // Letter width (8.5 inches)
                    height: "279.4mm", // Letter height (11 inches)
                    padding: "0",
                    maxWidth: "none",
                    maxHeight: "none",
                    transform: "scale(0.35)",
                    transformOrigin: "top center",
                    overflow: "hidden",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                    margin: "0 auto",
                    display: "block",
                    fontFamily: "Arial, sans-serif"
                  }}
                >
                  {selectedRows.length > 0 ? (
                    <div style={{ padding: "0.5in", width: "100%", height: "100%", position: "relative" }}>
                      <div
                        className="address-container"
                        style={{
                          position: "absolute",
                          left: `${thankYouLeftMargin}px`,
                          top: `${thankYouTopMargin}px`,
                          width: `${thankYouWidth}px`,
                          wordWrap: "break-word",
                          whiteSpace: "normal",
                          overflowWrap: "break-word",
                        }}
                      >
                        <p
                          style={{
                            margin: `0 0 ${thankYouLineSpacing}px 0`,
                            padding: `0 ${dataHorizontalSpacing}px`,
                            fontSize: `${thankYouFontSize}px`,
                            width: `${thankYouWidth}px`,
                            wordWrap: "break-word",
                            whiteSpace: "normal",
                            overflowWrap: "break-word",
                          }}
                        >
                          {selectedRows[0]?.original?.id || ""} -
                          {selectedRows[0]?.original?.wmmData?.records?.[0]
                            ?.subsdate
                            ? new Date(
                                selectedRows[0].original.wmmData.records[0].subsdate
                              ).toLocaleDateString()
                            : "N/A"}{" "}
                          -
                          {selectedRows[0]?.original?.wmmData?.records?.[0]
                            ?.copies || "N/A"}
                          cps/
                          {selectedRows[0]?.original?.acode || ""}
                        </p>

                        <p
                          style={{
                            margin: `0 0 ${thankYouLineSpacing}px 0`,
                            padding: `0 ${dataHorizontalSpacing}px`,
                            fontSize: `${thankYouFontSize}px`,
                            width: `${thankYouWidth}px`,
                            wordWrap: "break-word",
                            whiteSpace: "normal",
                            overflowWrap: "break-word",
                          }}
                        >
                          {getFullName(selectedRows[0]?.original || {})}
                        </p>
                        <p
                          style={{
                            margin: `0 0 ${thankYouLineSpacing}px 0`,
                            padding: `0 ${dataHorizontalSpacing}px`,
                            fontSize: `${thankYouFontSize}px`,
                            width: `${thankYouWidth}px`,
                            wordWrap: "break-word",
                            whiteSpace: "normal",
                            overflowWrap: "break-word",
                          }}
                        >
                          {selectedRows[0]?.original?.address || ""}
                        </p>
                        {selectedFields.includes("contactnos") && (
                          <p
                            style={{
                              margin: `0 0 ${thankYouLineSpacing}px 0`,
                              padding: `0 ${dataHorizontalSpacing}px`,
                              fontSize: `${thankYouFontSize}px`,
                              width: `${thankYouWidth}px`,
                              wordWrap: "break-word",
                              whiteSpace: "normal",
                              overflowWrap: "break-word",
                            }}
                          >
                            {getContactNumber(selectedRows[0]?.original || {})}
                          </p>
                        )}
                      </div>
                      
                      {/* Add greeting to preview */}
                      <div
                        style={{
                          position: "absolute",
                          left: `${thankYouLeftMargin}px`,
                          top: `${thankYouTopMargin + thankYouGreetingTopSpacing}px`,
                          width: "80%",
                        }}
                      >
                        <p
                          style={{
                            fontSize: `${thankYouFontSize}px`,
                            padding: `0 ${dataHorizontalSpacing}px`,
                          }}
                        >
                          Dear {selectedRows[0]?.original?.title ? `${selectedRows[0].original.title} ` : ""}{selectedRows[0]?.original?.fname ? `${selectedRows[0].original.fname} ` : ""}{selectedRows[0]?.original?.lname || ""}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "100%",
                      }}
                    >
                      <p className="text-gray-500">Select a row to preview thank you letter</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons - improved UI */}
          <div className="flex justify-center space-x-3 w-full max-w-xl">
            <Button
              onClick={handlePrintWithRange}
              className="bg-green-600 hover:bg-green-700 text-white flex-grow text-sm"
              disabled={!hasData}
            >
              {previewType === "standard"
                ? `Print Labels (${getRowCount()})`
                : previewType === "renewal"
                ? `Print Notices (${getRowCount()})`
                : `Print Letters (${getRowCount()})`}
            </Button>
            <Button
              onClick={closeModal}
              variant="outline"
              className="flex-grow text-sm"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Mailing;
