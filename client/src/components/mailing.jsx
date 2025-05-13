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
  const [modalOpen, setModalOpen] = useState(false);
  const [leftPosition, setLeftPosition] = useState(10);
  const [topPosition, setTopPosition] = useState(10);
  const [columnWidth, setColumnWidth] = useState(300);
  const [fontSize, setFontSize] = useState(12);
  const [labelHeight, setLabelHeight] = useState(100);
  const [horizontalSpacing, setHorizontalSpacing] = useState(20);
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

  // State for A4 preview layout adjustments
  const [renewalLeftMargin, setRenewalLeftMargin] = useState(40);
  const [renewalTopMargin, setRenewalTopMargin] = useState(40);
  const [renewalRightColumnPosition, setRenewalRightColumnPosition] =
    useState(400);
  const [renewalFontSize, setRenewalFontSize] = useState(14);

  // Additional Thank You Letter settings
  const [thankYouTopMargin, setThankYouTopMargin] = useState(60);
  const [thankYouLeftMargin, setThankYouLeftMargin] = useState(60);
  const [thankYouFontSize, setThankYouFontSize] = useState(14);
  const [thankYouLineSpacing, setThankYouLineSpacing] = useState(16);
  const [thankYouWidth, setThankYouWidth] = useState(400); // New width setting
  const [thankYouDateSpacing, setThankYouDateSpacing] = useState(40);
  const [thankYouGreetingSpacing, setThankYouGreetingSpacing] = useState(30);
  const [thankYouContentSpacing, setThankYouContentSpacing] = useState(20);

  // Additional precise controls for renewal notice
  const [leftColumnLineSpacing, setLeftColumnLineSpacing] = useState(8);
  const [rightColumnLineSpacing, setRightColumnLineSpacing] = useState(12);
  const [nameAddressSpacing, setNameAddressSpacing] = useState(24); // Space between name and address
  const [addressContactSpacing, setAddressContactSpacing] = useState(30); // Space between address and contact info
  const [rightColumnItemSpacing, setRightColumnItemSpacing] = useState(16); // Space between each item in right column

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
    const numRowsToPrint = filteredRows.length;
    let layoutRows = [...filteredRows];
    let emptySlots = 0;

    // If starting on the right, add a placeholder at the beginning
    if (startColumn === "right" && numRowsToPrint > 0) {
      layoutRows.unshift(null); // Add placeholder for the first slot
      emptySlots = 1;
    }

    const addressPerColumn = Math.ceil(layoutRows.length / 2);
    const column1 = layoutRows.slice(0, addressPerColumn);
    const column2 = layoutRows.slice(addressPerColumn);

    const labelHtml = [column1, column2]
      .map((column, columnIndex) => {
        return column
          .map((row, rowIndex) => {
            // Skip rendering the placeholder if it exists
            if (row === null) {
              return "<!-- Placeholder -->";
            }

            // Calculate the actual data row index (needed if placeholder was added)
            const dataRowIndex =
              columnIndex * addressPerColumn + rowIndex - emptySlots;
            const actualRowData = filteredRows[dataRowIndex];

            if (!actualRowData) {
              console.error(
                "Mismatch finding actual row data for index",
                dataRowIndex
              );
              return "<!-- Error -->";
            }

            // Access data directly from the wmmData object
            const wmmData = actualRowData?.original?.wmmData; // Get the object
            const copies = wmmData?.records?.[0]?.copies ?? "N/A"; // Use copies from first record, fallback N/A
            let subsdate = "N/A";
            if (wmmData?.records?.[0]?.subsdate) {
              // Check for subsdate directly on the first record
              const date = new Date(wmmData.records[0].subsdate);
              if (!isNaN(date.getTime())) {
                subsdate = date.toLocaleDateString();
              }
            }

            return `
          <div class="address-container" style="left: ${
            columnIndex * (columnWidth + horizontalSpacing)
          }px; top: ${
              topPosition + rowIndex * labelHeight
            }px; font-size: ${fontSize}px; width: ${columnWidth}px; word-wrap: break-word; white-space: normal; overflow-wrap: break-word;">
            <p>${
              actualRowData?.original?.id || ""
            } - ${subsdate} - ${copies}cps/${
              actualRowData?.original?.acode || ""
            }</p>
            <p>${getFullName(actualRowData?.original || {})}</p>
            <p>${actualRowData?.original?.address || ""}</p>
            ${
              selectedFields.includes("contactnos")
                ? `<p>${getContactNumber(actualRowData?.original || {})}</p>`
                : "" /* Render contact paragraph conditionally */
            }
          </div>
        `;
          })
          .join("");
      })
      .join("");

    return `
      <html>
      <head>
         <title>Mailing Labels (${startId || "Start"} to ${
      endId || "End"
    })</title>
          <style>
            body { font-family: Arial, sans-serif; }
            .mailing-label {
              position: relative;
              width: ${columnWidth * 2 + horizontalSpacing}px;
              height: ${topPosition + labelHeight * addressPerColumn}px;
            }
            .address-container {
              position: absolute;
              margin-bottom: 20px;
            }
            .address-container p {
              margin: 0;
              padding: 0;
              font-size: ${fontSize}px;
              color: black;
              width: ${columnWidth}px;
              word-wrap: break-word;
              white-space: normal;
              overflow-wrap: break-word;
            }
             @media print {
               body { margin: ${topPosition}px 0 0 ${leftPosition}px !important; }
             }
          </style>
        </head>
        <body>
          <div class="mailing-label" style="position: absolute; left: ${leftPosition}px; top: ${topPosition}px;">
              ${labelHtml}
          </div>
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
              <p class="name">${getFullName(subscriber)}</p>
              <p class="address">${subscriber.address || ""}</p>
              <p class="contact">${getContactNumber(subscriber)}</p>
            </div>
            
            <!-- Right column: Subscriber ID, Expiry Date, Last Issue -->
            <div class="right-column">
              <p class="id">${subscriber.id || ""}</p>
              <p class="expiry">${expiryDate}</p>
              <p class="last-issue">${lastIssue}</p>
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
            size: A4;
            margin: 0;
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
          }
          .renewal-page {
            box-sizing: border-box;
            page-break-after: always;
            position: relative;
            width: 210mm;
            height: 297mm;
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
            width: ${210 * 3.78 - renewalRightColumnPosition - 40}px;
          }
          
          /* Specific spacing for each element */
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
              width: 210mm;
              height: 297mm;
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
              <p>${subscriber.id || ""} - ${subsdate} - ${
          subscription.copies || "N/A"
        }cps/${subscriber.acode || ""}</p>
              <p>${getFullName(subscriber)}</p>
              <p>${subscriber.address || ""}</p>
              ${
                selectedFields.includes("contactnos")
                  ? `<p>${getContactNumber(subscriber)}</p>`
                  : ""
              }
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
            size: A4;
            margin: 0;
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
          }
          .thankyou-page {
            box-sizing: border-box;
            page-break-after: always;
            position: relative;
            width: 210mm;
            height: 297mm;
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
            overflow-wrap: break-word;
          }
          
          .address-container p {
            margin: 0 0 ${thankYouLineSpacing}px 0;
            padding: 0;
            font-size: ${thankYouFontSize}px;
            color: black;
            width: ${thankYouWidth}px;
            word-wrap: break-word;
            white-space: normal;
            overflow-wrap: break-word;
          }
          
          @media print {
            body {
              width: 210mm;
              height: 297mm;
              margin: ${thankYouTopMargin}px 0 0 ${thankYouLeftMargin}px !important;
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

        // Thank you letter settings
        thankYouFontSize,
        thankYouTopMargin,
        thankYouLeftMargin,
        thankYouLineSpacing,
        thankYouWidth,
        thankYouDateSpacing,
        thankYouGreetingSpacing,
        thankYouContentSpacing,
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
      </div>
      <Modal isOpen={modalOpen} onClose={closeModal}>
        <h2 className="flex justify-center text-xl font-bold text-black mb-2">
          {previewType === "standard"
            ? "Mailing Label Options"
            : previewType === "renewal"
            ? "Renewal Notice Options"
            : "Thank You Letter Options"}
        </h2>

        <p className="text-center text-sm text-gray-500 mb-4">
          {getRowCount()} {getRowCount() === 1 ? "subscriber" : "subscribers"}{" "}
          {getDataSourceLabel()}
        </p>

        <div className="flex flex-col items-center ">
          {/* Data Source Selection */}
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
            {dataSource === "selected" &&
              table.getSelectedRowModel().rows.length === 0 && (
                <p className="text-xs text-red-500">
                  No rows selected. Please select rows in the table first.
                </p>
              )}
          </div>

          {/* Configuration Toggle and Checklist Button */}
          <div className="flex justify-center gap-2 mb-4">
            <Button onClick={toggleShowInputs} variant="outline">
              {showInputs ? "Hide Configuration" : "Show Configuration"}
            </Button>
            <Button
              onClick={handlePrintChecklist}
              variant="outline"
              disabled={!hasData}
            >
              Print Checklist
            </Button>
          </div>

          {/* Preview Type Selection */}
          <div className="flex justify-center mb-4 w-full max-w-lg">
            <div className="w-full border rounded overflow-hidden">
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

              {/* Template Selection - now inside the tabbed interface */}
              <div className="p-3 bg-white border-t">
                <div className="flex flex-col mb-3">
                  <label className="text-sm font-medium mb-1 text-gray-700">
                    Select Template:
                  </label>
                  <select
                    onChange={handleTemplateSelect}
                    value={selectedTemplate?.name || ""}
                    className="border border-gray-300 rounded p-2 w-full"
                  >
                    <option value="" disabled>
                      Choose a template...
                    </option>
                    {savedTemplates
                      .filter(
                        (template) =>
                          template.previewType === previewType ||
                          !template.previewType
                      )
                      .map((template) => (
                        <option key={template.name} value={template.name}>
                          {template.name}
                        </option>
                      ))}
                  </select>
                  {selectedTemplate && (
                    <div className="mt-1">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        {selectedTemplate.previewType === "renewal"
                          ? "Renewal Notice Template"
                          : selectedTemplate.previewType === "thankyou"
                          ? "Thank You Letter Template"
                          : "Standard Label Template"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Client ID Range Input - improved UI */}
          {dataSource === "range" && (
            <div className="flex flex-col items-center p-4 border rounded mb-4 w-full max-w-lg bg-gray-50">
              <h3 className="text-lg font-semibold mb-2">
                Print Range & Position
              </h3>

              <div className="bg-blue-50 p-2 rounded mb-3 w-full text-xs text-blue-700">
                {previewType === "standard"
                  ? "Specify which labels to print using Client IDs. Useful for continuing after a paper jam."
                  : "Specify which subscribers to include using Client IDs. Each subscriber gets their own page."}
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

              {previewType === "standard" && (
                <div className="flex items-center justify-center space-x-4 w-full bg-white p-2 rounded">
                  <span className="text-sm font-medium text-gray-600">
                    Start Printing At:
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
                      Label 1 (Left)
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
                      Label 2 (Right)
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Configuration Inputs (Initially Hidden) */}
          {showInputs && (
            <div className="flex flex-col items-center p-4 border rounded mb-4 w-full max-w-lg bg-gray-50">
              <h3 className="text-lg font-semibold mb-3">
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
                          Label Height (Vertical Space):
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
                          Horizontal Spacing:
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

                    {/* Field Selection - Better organized */}
                    <div className="mb-4 w-full bg-gray-100 p-2 rounded mt-3">
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
                <>
                  {/* Renewal Notice A4 Settings - Improved organization */}
                  <div className="w-full">
                    <div className="bg-blue-50 p-2 rounded mb-3 text-xs text-blue-700">
                      These settings control how renewal notices appear on A4
                      paper. Each subscriber will get their own page.
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
                          Between Name & Address:
                        </label>
                        <input
                          type="number"
                          value={nameAddressSpacing}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                            setNameAddressSpacing(
                              parseInt(e.target.value, 10) || 24
                            )
                          }
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                          Between Address & Contact:
                        </label>
                        <input
                          type="number"
                          value={addressContactSpacing}
                          className="border border-gray-300 rounded p-1 text-center w-full"
                          onChange={(e) =>
                            setAddressContactSpacing(
                              parseInt(e.target.value, 10) || 30
                            )
                          }
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                          Line Spacing:
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
                          Between Items:
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
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-600 mb-1">
                          Line Spacing:
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
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                // Thank You Letter Settings - Improved organization
                <>
                  <div className="w-full">
                    <div className="bg-blue-50 p-2 rounded mb-3 text-xs text-blue-700">
                      These settings control how thank you letters appear on A4
                      paper. Each subscriber will get their own page.
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

                    {/* Field Selection for Thank You Letter */}
                    <div className="mb-4 w-full bg-gray-100 p-2 rounded mt-3">
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

              {/* Template Saving (for both types) */}
              <div className="w-full border-t mt-4 pt-4">
                <h4 className="text-md font-semibold mb-3">Save Template</h4>
                <div className="flex flex-col">
                  <Button
                    onClick={handleSaveClick}
                    variant="secondary"
                    className="w-full mb-2"
                  >
                    Save Current{" "}
                    {previewType === "standard"
                      ? "Label"
                      : previewType === "renewal"
                      ? "Renewal Notice"
                      : "Thank You Letter"}{" "}
                    Settings as Template
                  </Button>
                  {showTemplateNameInput && (
                    <div className="flex flex-col items-center mt-1 bg-gray-100 p-3 rounded">
                      <p className="text-xs text-gray-600 mb-2">
                        This will save a template specifically for{" "}
                        {previewType === "standard"
                          ? "standard mailing labels"
                          : previewType === "renewal"
                          ? "renewal notices"
                          : "thank you letters"}
                        .
                      </p>
                      <input
                        type="text"
                        value={templateName}
                        onChange={handleTemplateNameChange}
                        placeholder={`Enter template name for ${previewType} format`}
                        className="border border-gray-300 rounded p-2 text-center mb-3 w-full"
                      />
                      <div className="flex space-x-2 w-full">
                        <Button onClick={saveTemplate} className="w-full">
                          Save Template
                        </Button>
                        <Button
                          onClick={() => {
                            setShowTemplateNameInput(false);
                            setTemplateName("");
                          }}
                          variant="outline"
                          className="w-full"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Preview Area */}
          <div className="mb-4">
            <h3 className="text-center font-semibold mb-1">
              {previewType === "standard"
                ? "Standard Mailing Labels Preview"
                : previewType === "renewal"
                ? "Renewal Notice Preview (A4)"
                : "Thank You Letter Preview (A4)"}
            </h3>

            {previewType === "standard" ? (
              // Standard Mailing Labels Preview
              <div
                className="mailing-label-preview border border-dashed border-gray-400 relative bg-white"
                style={{
                  width: `${columnWidth * 2 + horizontalSpacing}px`,
                  height: `${topPosition + labelHeight * 1.5}px`,
                }}
              >
                {/* Preview box 1 with actual data from first selected row */}
                <div
                  className="address-container-preview border border-gray-300 absolute"
                  style={{
                    left: `${leftPosition}px`,
                    top: `${topPosition}px`,
                    width: `${columnWidth}px`,
                    height: `${labelHeight}px`,
                    fontSize: `${fontSize}px`,
                    padding: "2px",
                    overflow: "hidden",
                  }}
                >
                  {selectedRows.length > 0 ? (
                    <>
                      <p style={{ margin: 0, fontSize: `${fontSize}px` }}>
                        {selectedRows[0]?.original?.id || ""}
                        {selectedRows[0]?.original?.wmmData?.records?.[0]
                          ?.subsdate
                          ? ` - ${new Date(
                              selectedRows[0].original.wmmData.records[0].subsdate
                            ).toLocaleDateString()}`
                          : ""}
                        {selectedRows[0]?.original?.wmmData?.records?.[0]
                          ?.copies
                          ? ` - ${selectedRows[0].original.wmmData.records[0].copies}cps`
                          : ""}
                        /{selectedRows[0]?.original?.acode || ""}
                      </p>
                      <p style={{ margin: 0, fontSize: `${fontSize}px` }}>
                        {getFullName(selectedRows[0]?.original || {})}
                      </p>
                      <p style={{ margin: 0, fontSize: `${fontSize}px` }}>
                        {selectedRows[0]?.original?.address || ""}
                      </p>
                      {selectedFields.includes("contactnos") && (
                        <p style={{ margin: 0, fontSize: `${fontSize}px` }}>
                          {getContactNumber(selectedRows[0]?.original || {})}
                        </p>
                      )}
                    </>
                  ) : (
                    <p>No data available</p>
                  )}
                </div>

                {/* Preview box 2 with actual data from second selected row */}
                <div
                  className="address-container-preview border border-gray-300 absolute"
                  style={{
                    left: `${leftPosition + columnWidth + horizontalSpacing}px`,
                    top: `${topPosition}px`,
                    width: `${columnWidth}px`,
                    height: `${labelHeight}px`,
                    fontSize: `${fontSize}px`,
                    padding: "2px",
                    overflow: "hidden",
                  }}
                >
                  {selectedRows.length > 1 ? (
                    <>
                      <p style={{ margin: 0, fontSize: `${fontSize}px` }}>
                        {selectedRows[1]?.original?.id || ""}
                        {selectedRows[1]?.original?.wmmData?.records?.[0]
                          ?.subsdate
                          ? ` - ${new Date(
                              selectedRows[1].original.wmmData.records[0].subsdate
                            ).toLocaleDateString()}`
                          : ""}
                        {selectedRows[1]?.original?.wmmData?.records?.[0]
                          ?.copies
                          ? ` - ${selectedRows[1].original.wmmData.records[0].copies}cps`
                          : ""}
                        /{selectedRows[1]?.original?.acode || ""}
                      </p>
                      <p style={{ margin: 0, fontSize: `${fontSize}px` }}>
                        {getFullName(selectedRows[1]?.original || {})}
                      </p>
                      <p style={{ margin: 0, fontSize: `${fontSize}px` }}>
                        {selectedRows[1]?.original?.address || ""}
                      </p>
                      {selectedFields.includes("contactnos") && (
                        <p style={{ margin: 0, fontSize: `${fontSize}px` }}>
                          {getContactNumber(selectedRows[1]?.original || {})}
                        </p>
                      )}
                    </>
                  ) : startPosition === "right" && selectedRows.length > 0 ? (
                    <>
                      <p style={{ margin: 0, fontSize: `${fontSize}px` }}>
                        {selectedRows[0]?.original?.id || ""}
                        {selectedRows[0]?.original?.wmmData?.records?.[0]
                          ?.subsdate
                          ? ` - ${new Date(
                              selectedRows[0].original.wmmData.records[0].subsdate
                            ).toLocaleDateString()}`
                          : ""}
                        {selectedRows[0]?.original?.wmmData?.records?.[0]
                          ?.copies
                          ? ` - ${selectedRows[0].original.wmmData.records[0].copies}cps`
                          : ""}
                        /{selectedRows[0]?.original?.acode || ""}
                      </p>
                      <p style={{ margin: 0, fontSize: `${fontSize}px` }}>
                        {getFullName(selectedRows[0]?.original || {})}
                      </p>
                      <p style={{ margin: 0, fontSize: `${fontSize}px` }}>
                        {selectedRows[0]?.original?.address || ""}
                      </p>
                      {selectedFields.includes("contactnos") && (
                        <p style={{ margin: 0, fontSize: `${fontSize}px` }}>
                          {getContactNumber(selectedRows[0]?.original || {})}
                        </p>
                      )}
                    </>
                  ) : (
                    <p>No data available</p>
                  )}
                </div>
              </div>
            ) : previewType === "renewal" ? (
              // A4 Renewal Notice Preview
              <div
                className="renewal-preview border border-dashed border-gray-400 relative bg-white mx-auto"
                style={{
                  width: "215.9mm",
                  height: "279.4mm",
                  padding: "0.5in",
                  maxWidth: "650px",
                  maxHeight: "900px",
                  transform: "scale(0.7)",
                  transformOrigin: "top center",
                  overflow: "hidden",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  margin: "0 auto 50px auto",
                }}
              >
                {selectedRows.length > 0 ? (
                  <>
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
                          padding: 0,
                        }}
                      >
                        {getFullName(selectedRows[0]?.original || {})}
                      </p>
                      <p
                        style={{
                          fontSize: `${renewalFontSize}px`,
                          margin: `0 0 ${addressContactSpacing}px 0`,
                          padding: 0,
                          whiteSpace: "pre-line",
                        }}
                      >
                        {selectedRows[0]?.original?.address || ""}
                      </p>
                      <p
                        style={{
                          fontSize: `${renewalFontSize}px`,
                          margin: `0 0 ${leftColumnLineSpacing}px 0`,
                          padding: 0,
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
                          210 * 3.78 - renewalRightColumnPosition - 40
                        }px`,
                      }}
                    >
                      <p
                        style={{
                          fontSize: `${renewalFontSize}px`,
                          margin: `0 0 ${rightColumnItemSpacing}px 0`,
                          padding: 0,
                        }}
                      >
                        {selectedRows[0]?.original?.id || ""}
                      </p>
                      <p
                        style={{
                          fontSize: `${renewalFontSize}px`,
                          margin: `0 0 ${rightColumnItemSpacing}px 0`,
                          padding: 0,
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
                          padding: 0,
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
                  </>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "100%",
                    }}
                  >
                    <p style={{ fontSize: "20px" }}>
                      Select a row to preview renewal notice
                    </p>
                  </div>
                )}
              </div>
            ) : (
              // Thank You Letter Preview
              <div
                className="thankyou-preview border border-dashed border-gray-400 relative bg-white mx-auto"
                style={{
                  width: "215.9mm",
                  height: "279.4mm",
                  padding: "0.5in",
                  maxWidth: "650px",
                  maxHeight: "900px",
                  transform: "scale(0.7)",
                  transformOrigin: "top center",
                  overflow: "hidden",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  margin: "0 auto 50px auto",
                }}
              >
                {selectedRows.length > 0 ? (
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
                        padding: 0,
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
                        padding: 0,
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
                        padding: 0,
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
                          padding: 0,
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
                ) : (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "100%",
                    }}
                  >
                    <p style={{ fontSize: "20px" }}>
                      Select a row to preview label
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="text-center text-xs text-gray-500 mt-1">
              {previewType === "standard" &&
                (startPosition === "right"
                  ? "First label will start on right side"
                  : "First label will start on left side")}
            </div>
          </div>

          {/* Action Buttons - improved UI */}
          <div className="flex justify-center space-x-4 w-full max-w-lg">
            <Button
              onClick={handlePrintWithRange}
              className="bg-green-600 hover:bg-green-700 text-white flex-grow"
              disabled={!hasData}
            >
              {previewType === "standard"
                ? `Print Mailing Labels (${getRowCount()})`
                : previewType === "renewal"
                ? `Print Renewal Notices (${getRowCount()})`
                : `Print Thank You Letters (${getRowCount()})`}
            </Button>
            <Button
              onClick={closeModal}
              variant="secondary"
              className="flex-grow"
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
