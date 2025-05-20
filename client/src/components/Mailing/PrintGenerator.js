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
  fontSize,
  labelHeight,
  selectedFields
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
        <div class="address-container" style="left: ${
          columnIndex * (columnWidth + horizontalSpacing)
        }px; top: ${
            topPosition + rowIndex * labelHeight
          }px; font-size: ${fontSize}px; width: ${columnWidth}px; word-wrap: break-word; white-space: normal; overflow-wrap: break-word;">
          <p>${
            actualRowData?.original?.id || ""
          } - ${enddate} - ${copies}cps/${
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

  // Generate raw printer data (for direct printing to dot matrix)
  let rawPrinterData = "";
  
  // Add printer initialization sequence
  if (template.init) {
    rawPrinterData += template.init.replace(/\\(\d+)/g, (match, code) => 
      String.fromCharCode(parseInt(code, 8))
    );
  }
  
  // Process rows for raw printer output
  columnArray.forEach((column, columnIndex) => {
    column.forEach((row, rowIndex) => {
      // Skip rendering the placeholder if it exists
      if (row === null) return;

      // Calculate the actual data row index
      const dataRowIndex = columnIndex * rowsPerColumn + rowIndex - emptySlots;
      const actualRowData = filteredRows[dataRowIndex];
      if (!actualRowData) return;

      // Get the subscription data
      const wmmData = actualRowData?.original?.wmmData;
      const subscription = wmmData?.records?.[0] || wmmData || {};
      const copies = subscription.copies ?? "N/A";
      const expdate = subscription.enddate || "";
      
      // Extract all the needed data
      const id = formatIdLegacy(actualRowData?.original?.id);
      const formattedDate = formatDateLegacy(expdate);
      const acode = actualRowData?.original?.acode || "";
      const title = actualRowData?.original?.title || "";
      const lname = actualRowData?.original?.lname || "";
      const fname = actualRowData?.original?.fname || "";
      const mname = actualRowData?.original?.mname || "";
      const company = actualRowData?.original?.company || "";
      const address = actualRowData?.original?.address || "";
      const contactNumber = getContactNumber(actualRowData?.original || {});
      const cellno = actualRowData?.original?.cellno || "";
      
      // Create a format string dynamically based on the template format
      // This is a simplified version that focuses on the key parts visible in the UI
      let formatString = template.format || "";
      
      // For actual implementation, we'd need to parse and process the full format string
      // with all the special functions like TRANSFORM, STR_Check, etc.
      // For now, we'll create a simplified output
      
      let labelText = '';
      if (columnIndex === 0) {
        labelText = `${id}-S-${formattedDate}-${copies}cps/${acode}\r\n`;
        labelText += `${getFullName(actualRowData?.original || {})}\r\n`;
        labelText += `${address}\r\n`;
        
        if (selectedFields.includes("contactnos")) {
          labelText += `Cell# ${cellno}\r\n`;
        }
        
        // Add extra line feeds to move to next label
        labelText += "\r\n\r\n";
      } else {
        // Similar format for second column but with appropriate spacing
        // This would need to be adjusted based on the actual printer requirements
        labelText = `${id}-S-${formattedDate}-${copies}cps/${acode}\r\n`;
        labelText += `${getFullName(actualRowData?.original || {})}\r\n`;
        labelText += `${address}\r\n`;
        
        if (selectedFields.includes("contactnos")) {
          labelText += `Cell# ${cellno}\r\n`;
        }
        
        // Add extra line feeds to move to next row
        labelText += "\r\n\r\n\r\n\r\n\r\n";
      }
      
      rawPrinterData += labelText;
    });
  });
  
  // Add printer reset sequence at the end
  if (template.reset) {
    rawPrinterData += template.reset.replace(/\\(\d+)/g, (match, code) => 
      String.fromCharCode(parseInt(code, 8))
    );
  }

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

  // Encode the raw printer data for download
  const base64Data = btoa(unescape(encodeURIComponent(rawPrinterData)));
  
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
          .download-section {
            margin: 20px 0;
            padding: 10px;
            background-color: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 5px;
          }
          .download-btn {
            display: inline-block;
            padding: 8px 16px;
            background-color: #4a5568;
            color: white;
            border-radius: 4px;
            text-decoration: none;
            margin-right: 10px;
            cursor: pointer;
          }
          .printer-info {
            margin-top: 8px;
            font-size: 12px;
            color: #666;
          }
       </style>
     </head>
     <body>
       <div class="download-section">
         <h3>Legacy Dot Matrix Printer Format</h3>
         <p>These labels are formatted for: <strong>${template.printer || "Dot Matrix Printer"}</strong></p>
         <p>For direct printing to dot matrix printer, download the raw printer data:</p>
         <a href="data:application/octet-stream;base64,${base64Data}" download="label_print_data.prn" class="download-btn">
           Download Raw Printer Data (.prn)
         </a>
         <div class="printer-info">
           <strong>Note:</strong> Send the downloaded .prn file directly to your ${template.printer} printer
         </div>
       </div>
       
       <h3>Preview (simplified display)</h3>
       <div class="legacy-labels-container">
         ${labelContent}
       </div>
       <script>
          // Don't auto-print, let user choose to download or print
          // window.print();
          // window.close();
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