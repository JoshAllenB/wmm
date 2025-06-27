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

// Function to handle STR_MLINE - splits text into multiple lines of specified width
const handleStrMline = (text, lineNum, width) => {
  if (!text) return "";
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= width) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  // Pad with empty lines if needed
  while (lines.length < lineNum) {
    lines.push("");
  }

  // Return the requested line, padded to width
  return (lines[lineNum - 1] || "").padEnd(width);
};

// Function to handle STR_Name formatting
const handleStrName = (data, format) => {
  const { title, lname, fname, mname, sname } = data;
  
  // Format "T F M L, S" - Title FirstName MiddleName LastName, Suffix
  if (format === "T F M L, S") {
    const parts = [
      title,
      fname,
      mname,
      lname,
      sname ? `, ${sname}` : ""
    ].filter(Boolean);
    return parts.join(" ");
  }
  
  // Default to basic name format if format not recognized
  return [title, fname, mname, lname, sname].filter(Boolean).join(" ");
};

// Function to handle STR_Check - validates and formats data according to conditions
const handleStrCheck = (check, ...args) => {
  if (check !== 1) return ""; // Only handle check=1 for now
  
  // Filter out empty lines and join with newlines
  return args.filter(arg => arg && arg.trim()).join("\n");
};

// Function to convert ESC/P commands from octal to binary
const convertEscPCommands = (command) => {
  if (!command) return '';
  return command.replace(/\\(\d+)/g, (match, code) => 
    String.fromCharCode(parseInt(code, 8))
  );
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

// Function to generate .prn file content for legacy templates
export const generatePrnContent = (template, data) => {
  let content = '';
  
  // Add initialization commands with proper ESC/P conversion
  if (template.init) {
    content += convertEscPCommands(template.init);
  }
  
  // Process each row of data
  data.forEach(row => {
    let rowContent = template.format;
    
    // Replace STR_Check function calls
    rowContent = rowContent.replace(/<<STR_Check\(([^)]+)\)>>/g, (match, params) => {
      const args = params.split(',').map(arg => {
        // Handle nested function calls within STR_Check
        if (arg.includes('STR_MLINE')) {
          const mlineMatch = arg.match(/STR_MLINE\(([^,]+),(\d+),(\d+)\)/);
          if (mlineMatch) {
            const [_, text, lineNum, width] = mlineMatch;
            // Handle STR_Name within STR_MLINE
            if (text.includes('STR_Name')) {
              const nameMatch = text.match(/STR_Name\(([^)]+)\)/);
              if (nameMatch) {
                const nameParams = nameMatch[1].split(',').map(p => p.trim());
                const nameData = {
                  title: row.original[nameParams[0]] || '',
                  lname: row.original[nameParams[1]] || '',
                  fname: row.original[nameParams[2]] || '',
                  mname: row.original[nameParams[3]] || '',
                  sname: row.original[nameParams[4]] || ''
                };
                const nameFormat = nameParams[5]?.replace(/"/g, '');
                return handleStrMline(handleStrName(nameData, nameFormat), parseInt(lineNum), parseInt(width));
              }
            }
            // Handle other text in STR_MLINE
            const fieldName = text.replace(/['"]/g, '');
            return handleStrMline(row.original[fieldName] || '', parseInt(lineNum), parseInt(width));
          }
        }
        return arg;
      });
      return handleStrCheck(...args);
    });
    
    // Replace other placeholders
    rowContent = rowContent.replace(/<<TRANSFORM\(id,"@L 999999"\)>>/g, formatIdLegacy(row.original.id));
    rowContent = rowContent.replace(/<<acode>>/g, row.original.acode || '');
    
    // Convert any ESC/P commands in the row content
    content += convertEscPCommands(rowContent);
  });
  
  // Add reset commands with proper ESC/P conversion
  if (template.reset) {
    content += convertEscPCommands(template.reset);
  }
  
  return content;
};

// Function to generate HTML for a specific range of Client IDs and starting position
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
  rowSpacing,
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

  // Check if user role should hide expiry and copies
  const shouldHideExpiryAndCopies = ['HRG', 'FOM', 'CAL'].some(role => userRole?.includes(role));

  // Use configuration values for dimensions
  const containerWidth = columnWidth * 2 + horizontalSpacing;

  const htmlContent = `
    <html>
    <head>
       <title>Mailing Labels (${startId || "Start"} to ${endId || "End"})</title>
        <style>
          @page {
            size: letter;
            margin: 0;
            padding: 0;
          }
          html {
            width: 8.5in;
            height: 11in;
          }
          body { 
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            min-height: 0;
            height: auto;
            width: 8.5in;
          }
          .page {
            width: 8.5in;
            height: 11in;
            position: relative;
            page-break-after: always;
            overflow: hidden;
          }
          .page:last-child {
            page-break-after: auto;
          }
          .label-container {
            position: absolute;
            width: ${containerWidth}px;
            left: ${leftPosition}px;
            top: ${topPosition}px;
          }
          .address-container {
            box-sizing: border-box;
            border: 1px dashed #bbb;
            background: #fff;
            padding: 8px;
            overflow: hidden;
            word-wrap: break-word;
            white-space: normal;
            border-radius: 4px;
            text-align: left;
            position: absolute;
            width: ${columnWidth}px;
            height: ${labelHeight}px;
          }
          .address-container.left-column {
            padding-right: 24px;
          }
          .address-container p {
            margin: 0;
            padding: 0;
            color: black;
            width: 100%;
            word-wrap: break-word;
            white-space: normal;
            overflow-wrap: break-word;
            text-align: left;
            font-size: ${fontSize}pt;
          }
          .address-container p.address {
            white-space: pre-wrap !important;
          }
          @media print {
            @page {
              size: letter !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            html {
              width: 8.5in !important;
              height: 11in !important;
            }
            body { 
              margin: 0 !important;
              padding: 0 !important;
              min-height: 0 !important;
              height: auto !important;
              width: 8.5in !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .page {
              width: 8.5in !important;
              height: 11in !important;
              position: relative !important;
              page-break-after: always !important;
              overflow: hidden !important;
            }
            .page:last-child {
              page-break-after: auto !important;
            }
            .label-container {
              position: absolute !important;
              width: ${containerWidth}px !important;
              left: ${leftPosition}px !important;
              top: ${topPosition}px !important;
            }
            .address-container {
              box-shadow: none !important;
              border: none !important;
              position: absolute !important;
              width: ${columnWidth}px !important;
              height: ${labelHeight}px !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
              text-align: left !important;
            }
            .address-container p {
              font-size: ${fontSize}pt !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              text-align: left !important;
            }
          }
        </style>
      </head>
      <body>
        ${Array(Math.ceil(filteredRows.length / 6)).fill().map((_, pageIndex) => {
          const pageRows = filteredRows.slice(pageIndex * 6, (pageIndex + 1) * 6);
          return `
            <div class="page">
              <div class="label-container">
                ${pageRows.map((row, index) => {
                  // Calculate position based on index within the page
                  const rowNum = Math.floor(index / 2); // 0, 0, 1, 1, 2, 2
                  const isLeftColumn = index % 2 === 0;
                  const leftOffset = isLeftColumn ? 0 : (containerWidth - columnWidth);
                  const topOffset = rowNum * (labelHeight + rowSpacing);

                  const wmmData = row?.original?.wmmData;
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
                    <div class="address-container${isLeftColumn ? ' left-column' : ''}" style="left: ${leftOffset}px; top: ${topOffset}px;">
                      <p>${row?.original?.id || ""}${!shouldHideExpiryAndCopies ? ` - ${enddate} - ${copies}cps/${row?.original?.acode || ""}` : (row?.original?.acode ? `/${row?.original?.acode}` : "")}</p>
                      <p style="font-weight:normal;">${getFullName(row?.original || {})}</p>
                      <p class="address" style="white-space: pre-wrap;">${(row?.original?.address || "").replace(/\n/g, '<br />')}</p>
                      ${selectedFields.includes("contactnos") ? `<p>${getContactNumber(row?.original || {})}</p>` : ""}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
        <script>
           window.print();
           window.close();
        </script>
      </body>
    </html>
  `;

  return htmlContent;
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
          
          // Add address line - split address into multiple lines if needed
          const addressLines = (address || "").split('\n');
          addressLines.forEach(line => {
            labelText += `${line}\n`;
          });
          
          // Add contact number if needed
          if (selectedFields.includes("contactnos")) {
            labelText += `Cell# ${contactNumber}\n`;
          }
          
          return `<div class="legacy-label" data-col="${columnIndex}" data-row="${rowIndex}">${labelText}</div>`;
        })
        .join("\n");
    })
    .join("\n");

  // Generate .prn content
  const prnContent = generatePrnContent(template, filteredRows);
  
  // Create a Blob with the .prn content
  const prnBlob = new Blob([prnContent], { type: 'application/octet-stream' });
  const prnUrl = URL.createObjectURL(prnBlob);

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
            padding: 20px;
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
            padding: 20px;
            background-color: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 5px;
          }
          .download-btn {
            padding: 12px 24px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin: 10px 0;
            font-size: 16px;
            display: inline-block;
          }
          .download-btn:hover {
            background-color: #45a049;
          }
          .info-text {
            margin: 15px 0;
            line-height: 1.5;
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
         <p class="info-text">
           This template is configured for: <strong>${template.printer || "Dot Matrix Printer"}</strong><br>
           Click the button below to download the .prn file that can be used with your dot matrix printer.
         </p>
         <button onclick="downloadPrnFile()" class="download-btn">
           Download .prn File
         </button>
       </div>
       
       <h3>Preview (simplified display)</h3>
       <div class="legacy-labels-container">
         ${labelContent}
       </div>
       <script>
          // Function to download .prn file
          function downloadPrnFile() {
            const link = document.createElement('a');
            link.href = '${prnUrl}';
            link.download = 'labels.prn';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
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