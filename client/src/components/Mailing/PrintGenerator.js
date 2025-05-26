// Helper functions for formatting data
const getFullName = (row) => {
  const title = row.title ? `${row.title} ` : "";
  return [title, row.fname, row.mname, row.lname].filter(Boolean).join(" ");
};

const getContactNumber = (row) => {
  return row.contactnos || row.cellno || row.ofcno || "";
};

// Function to format date for legacy templates (mm/dd/yy format)
const formatDateLegacy = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "N/A";
  
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(2);
  return `${month}/${day}/${year}`;
};

// Function to format ID for legacy templates (padding with left zeros to 6 digits)
const formatIdLegacy = (id) => {
  if (!id) return "";
  return id.toString().padStart(6, '0');
};

// Generate raw printer data for USB printing
const generateRawPrinterData = (data, template) => {
  // Initialize printer commands
  const commands = [];
  
  // Add initialization commands
  commands.push(0x1B, 0x40); // ESC @ - Initialize printer
  
  // Add character set and encoding
  commands.push(0x1B, 0x74, 0x00); // ESC t 0 - Select character code table (PC437)
  
  // Add line spacing
  commands.push(0x1B, 0x33, 0x00); // ESC 3 0 - Set line spacing to 0
  
  // Add data
  const textEncoder = new TextEncoder();
  const textData = textEncoder.encode(data);
  commands.push(...textData);
  
  // Add paper cut command
  commands.push(0x1D, 0x56, 0x41); // GS V A - Full cut
  
  return new Uint8Array(commands);
};

// Generate HTML for a specific range of Client IDs and starting position
export const generatePrintHTML = (
  startId, 
  endId, 
  startColumn, 
  availableRows,
  useLegacyFormat,
  selectedTemplate,
  leftPosition,
  topPosition,
  columnWidth,
  horizontalSpacing,
  verticalSpacing,
  fontSize,
  labelHeight,
  selectedFields,
  userRole
) => {
  // Filter rows based on start/end Client IDs
  const filteredRows = availableRows.filter((row) => {
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

  // If using legacy format, generate a different HTML structure
  if (useLegacyFormat && selectedTemplate && selectedTemplate.isLegacy) {
    return generateLegacyPrintHTML(
      filteredRows, 
      startColumn, 
      selectedTemplate,
      selectedFields
    );
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

  // Check if user role should hide expiry and copies
  const shouldHideExpiryAndCopies = ['HRG', 'FOM', 'CAL'].some(role => userRole?.includes(role));

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
          let subscription = wmmData?.records?.[0] || wmmData || {};
          const copies = subscription.copies ?? "N/A";
          let enddate = "N/A";
          if (subscription.enddate) {
            const date = new Date(subscription.enddate);
            if (!isNaN(date.getTime())) {
              enddate = date.toLocaleDateString();
            }
          }

          return `
        <div class="address-container column-${columnIndex + 1}" style="left: ${
          columnIndex * (columnWidth + horizontalSpacing)
        }px; top: ${
            topPosition + rowIndex * (labelHeight + verticalSpacing)
          }px; font-size: ${fontSize}px; width: ${columnWidth}px; word-wrap: break-word; white-space: normal; overflow-wrap: break-word;">
          <p style="width: ${columnWidth}px;">${
            actualRowData?.original?.id || ""
          }${
            !shouldHideExpiryAndCopies ? ` - ${enddate} - ${copies}cps/${actualRowData?.original?.acode || ""}` : 
            (actualRowData?.original?.acode ? `/${actualRowData?.original?.acode}` : "")
          }</p>
          <p style="width: ${columnWidth}px;">${getFullName(actualRowData?.original || {})}</p>
          <p style="width: ${columnWidth}px;">${actualRowData?.original?.address || ""}</p>
          ${
            selectedFields.includes("contactnos")
              ? `<p style="width: ${columnWidth}px;">${getContactNumber(actualRowData?.original || {})}</p>`
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
          body { 
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
          }
          .mailing-label {
            position: relative;
            width: ${columnWidth * 2 + horizontalSpacing}px;
            height: ${topPosition + (labelHeight + verticalSpacing) * addressPerColumn}px;
          }
          .address-container {
            position: absolute;
            margin-bottom: ${verticalSpacing}px;
            width: ${columnWidth}px;
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
            @page {
              margin: 0;
              padding: 0;
            }
            body { 
              margin: ${topPosition}px 0 0 ${leftPosition}px !important;
              padding: 0 !important;
            }
            .mailing-label {
              position: absolute;
              left: ${leftPosition}px;
              top: ${topPosition}px;
              width: ${columnWidth * 2 + horizontalSpacing}px;
            }
            .column-1 {
              left: ${leftPosition}px !important;
              width: ${columnWidth}px !important;
            }
            .column-2 {
              left: ${leftPosition + columnWidth + horizontalSpacing}px !important;
              width: ${columnWidth}px !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="mailing-label">
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

// Generate HTML specifically formatted for legacy dot matrix printers
export const generateLegacyPrintHTML = (filteredRows, startColumn, template, selectedFields) => {
  // Get the column configuration from the template
  const { layout } = template;
  const { columns: numColumns = 2 } = layout;

  let layoutRows = [...filteredRows];
  let emptySlots = 0;

  // If starting on the right, add a placeholder at the beginning
  if (startColumn === "right" && layoutRows.length > 0) {
    layoutRows.unshift(null); // Add placeholder for the first slot
    emptySlots = 1;
  }

  // Distribute rows across columns
  const rowsPerColumn = Math.ceil(layoutRows.length / numColumns);
  const columnArray = Array.from({ length: numColumns }, (_, colIndex) => {
    return layoutRows.slice(colIndex * rowsPerColumn, (colIndex + 1) * rowsPerColumn);
  });

  // Generate labels in the legacy format for HTML preview
  const labelContent = columnArray
    .map((column, columnIndex) => {
      return column
        .map((row, rowIndex) => {
          // Skip rendering the placeholder if it exists
          if (row === null) {
            return ""; // Empty space for placeholder
          }

          // Calculate the actual data row index
          const dataRowIndex = columnIndex * rowsPerColumn + rowIndex - emptySlots;
          const actualRowData = filteredRows[dataRowIndex];

          if (!actualRowData) {
            return ""; // Skip if no data
          }

          // Get the subscription data
          const wmmData = actualRowData?.original?.wmmData;
          const subscription = wmmData?.records?.[0] || wmmData || {};
          const copies = subscription.copies ?? "N/A";
          const expdate = subscription.enddate || "";
          
          // Format the data according to the legacy template
          const id = formatIdLegacy(actualRowData?.original?.id);
          const formattedDate = formatDateLegacy(expdate);
          const acode = actualRowData?.original?.acode || "";
          
          // Full name using legacy format (concatenating parts)
          const title = actualRowData?.original?.title || "";
          const lname = actualRowData?.original?.lname || "";
          const fname = actualRowData?.original?.fname || "";
          const mname = actualRowData?.original?.mname || "";
          const company = actualRowData?.original?.company || "";
          const address = actualRowData?.original?.address || "";
          const contactNumber = getContactNumber(actualRowData?.original || {});

          // Build the label according to the legacy format
          let labelText = `${id}-S-${formattedDate}-${copies}cps/${acode}\n`;
          
          // Add name line
          const fullName = getFullName(actualRowData?.original || {});
          labelText += `${fullName}\n`;
          
          // Add address line
          labelText += `${address}\n`;
          
          // Add contact number if needed
          if (selectedFields.includes("contactnos")) {
            labelText += `Cell# ${contactNumber}\n`;
          }
          
          return `<div class="legacy-label" data-col="${columnIndex}" data-row="${rowIndex}">${labelText}</div>`;
        })
        .join("\n");
    })
    .join("\n");

  // Generate the HTML with styling appropriate for legacy format
  return `
    <html>
    <head>
       <title>Legacy Format Mailing Labels</title>
       <style>
          @page {
            size: letter;
            margin: ${layout.topPosition}px ${layout.leftPosition}px;
          }
          body { 
            font-family: Courier, monospace; 
            font-size: ${layout.fontSize}px;
            line-height: 1.2;
          }
          .legacy-label {
            white-space: pre;
            font-family: Courier, monospace;
            width: ${layout.width}ch;
            margin-bottom: ${layout.height}px;
          }
          .legacy-labels-container {
            display: grid;
            grid-template-columns: repeat(${numColumns}, 1fr);
            column-gap: ${layout.horizontalSpacing || 20}px;
          }
          .printer-info {
            margin: 20px 0;
            padding: 10px;
            background-color: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 5px;
          }
          .printer-status {
            margin-top: 8px;
            font-size: 12px;
            color: #666;
          }
          @media print {
            .printer-info {
              display: none;
            }
            body {
              margin: 0;
              padding: 0;
            }
          }
       </style>
     </head>
     <body>
       <div class="printer-info">
         <h3>Legacy Dot Matrix Printer Format</h3>
         <p>These labels are formatted for: <strong>${template.printer || "Dot Matrix Printer"}</strong></p>
         <p>Click the button below to send directly to printer:</p>
         <button onclick="sendToPrinter()" class="download-btn">
           Send to Printer
         </button>
         <div class="printer-status" id="printerStatus"></div>
       </div>
       
       <h3>Preview (simplified display)</h3>
       <div class="legacy-labels-container">
         ${labelContent}
       </div>
       <script>
          // Function to send to printer via WebUSB
          async function sendToPrinter() {
            const statusDiv = document.getElementById('printerStatus');
            statusDiv.textContent = 'Sending to printer...';
            
            try {
              // Get printer settings from localStorage
              const printerSettings = JSON.parse(localStorage.getItem('dotMatrixPrinterSettings') || '{}');
              
              if (!printerSettings.vendorId || !printerSettings.productId) {
                throw new Error('Printer settings not found. Please configure your printer first.');
              }
              
              // Connect to the printer
              const device = await window.printerWebSocketService.connectToUsbPrinter(
                parseInt(printerSettings.vendorId, 16),
                parseInt(printerSettings.productId, 16)
              );
              
              // Generate raw printer data
              const rawData = generateRawPrinterData(labelContent, template);
              
              // Send data to printer
              await window.printerWebSocketService.sendToUsbPrinter(device, rawData);
              
              statusDiv.textContent = 'Print job sent successfully!';
            } catch (error) {
              statusDiv.textContent = 'Error: ' + error.message;
            }
          }
          
          // Auto-print after a short delay to ensure content is loaded
          setTimeout(() => {
            window.print();
            window.close();
          }, 500);
       </script>
     </body>
    </html>
  `;
};

// Generate HTML for a checklist
export const generateChecklistHTML = (columns, rowsToUse) => {
  const checklistHtml = rowsToUse
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
                    ${sub.subsclass}: ${sub.enddate} - ${sub.enddate}, Cps: ${sub.copies}
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