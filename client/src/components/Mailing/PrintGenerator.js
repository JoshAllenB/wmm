// Helper functions
export const getFullName = (data) => {
  const title = data.title || '';
  const fname = data.fname || '';
  const mname = data.mname || '';
  const lname = data.lname || '';
  const sname = data.sname || '';
  const company = data.company || '';

  if (company) {
    return company;
  }

  return [title, fname, mname, lname, sname]
    .filter(part => part && part.trim())
    .join(' ');
};

export const getContactNumber = (data) => {
  const contactnos = data.contactnos || '';
  const cellno = data.cellno || '';
  const officeno = data.officeno || '';

  if (contactnos) return contactnos;
  if (cellno || officeno) {
    return [cellno, officeno].filter(num => num).join(' / ');
  }
  return '';
};

export const generateLabelContent = (data, selectedFields, userRole) => {
  if (!data) return '';

  const wmmData = data.wmmData;
  const subscription = wmmData?.records?.[0] || wmmData || {};
  const copies = subscription.copies ?? "N/A";
  let enddate = "N/A";
  
  if (subscription.enddate) {
    const date = new Date(subscription.enddate);
    if (!isNaN(date.getTime())) {
      enddate = date.toLocaleDateString();
    }
  }

  // Check if user role should hide expiry and copies
  const shouldHideExpiryAndCopies = ['HRG', 'FOM', 'CAL'].some(role => userRole?.includes(role));

  const idLine = data.id || "";
  const expiryAndCopies = !shouldHideExpiryAndCopies ? 
    ` - ${enddate} - ${copies}cps/${data.acode || ""}` : 
    (data.acode ? `/${data.acode}` : "");
  
  const name = getFullName(data);
  // Clean up address by removing empty lines and extra whitespace while preserving valid line breaks
  const address = data.address ? data.address
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('<br />') : "";
  const contact = selectedFields.includes("contactnos") ? getContactNumber(data) : "";

  return `
    <div style="font-size: inherit; line-height: 1.2;">
      <p style="margin: 0 0 4px 0;">${idLine}${expiryAndCopies}</p>
      ${name ? `<p style="margin: 0 0 4px 0; font-weight: normal;">${name}</p>` : ''}
      ${address ? `<p style="margin: 0 0 4px 0;">${address}</p>` : ''}
      ${contact ? `<p style="margin: 0;">${contact}</p>` : ''}
    </div>
  `;
};

export const generatePrintHTML = (
  startClientId,
  endClientId,
  startPosition,
  rows,
  useLegacyFormat,
  template,
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
  // Filter rows based on start/end Client IDs only if they are specified
  const filteredRows = rows.filter((row) => {
    const clientId = row?.original?.id?.toString();
    if (!clientId) return false;
    
    const trimmedStartId = startClientId?.trim();
    const trimmedEndId = endClientId?.trim();
    
    // If no range is specified, include all rows
    if (!trimmedStartId && !trimmedEndId) return true;
    
    // Convert to numbers for comparison
    const numericClientId = parseInt(clientId, 10);
    const numericStartId = trimmedStartId ? parseInt(trimmedStartId, 10) : null;
    const numericEndId = trimmedEndId ? parseInt(trimmedEndId, 10) : null;
    
    // Check if any conversion resulted in NaN
    if (isNaN(numericClientId) || (numericStartId && isNaN(numericStartId)) || (numericEndId && isNaN(numericEndId))) {
      return false;
    }
    
    const isAfterStart = numericStartId ? numericClientId >= numericStartId : true;
    const isBeforeEnd = numericEndId ? numericClientId <= numericEndId : true;
    return isAfterStart && isBeforeEnd;
  });

  if (filteredRows.length === 0) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Preview</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .error { color: red; text-align: center; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h3>No labels found.</h3>
            <p>Please check your selection${startClientId || endClientId ? ' and ID range' : ''}.</p>
          </div>
        </body>
      </html>
    `;
  }

  // Calculate dimensions
  const pageWidth = 215.9; // US Letter width in mm
  const pageHeight = 279.4; // US Letter height in mm
  
  // Convert mm to px for display
  const pxPerMm = 3.78; // Approximate pixels per mm for 96 DPI
  const pagePxWidth = Math.round(pageWidth * pxPerMm);
  const pagePxHeight = Math.round(pageHeight * pxPerMm);

  // Calculate rows and columns
  const labelsPerRow = 2;
  const rowsPerPage = 3;
  const totalLabelsPerPage = labelsPerRow * rowsPerPage;

  // Start HTML content
  let html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Preview</title>
        <style>
          @page {
            size: letter;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background: white;
          }
          .page {
            width: ${pagePxWidth}px;
            height: ${pagePxHeight}px;
            position: relative;
            page-break-after: always;
            margin: 0 auto;
            background: white;
          }
          .label {
            position: absolute;
            font-size: ${fontSize}pt;
            width: ${columnWidth}px;
            height: ${labelHeight}px;
            overflow: hidden;
            padding: 2mm;
            box-sizing: border-box;
            background: white;
          }
          .preview-info {
            text-align: center;
            padding: 10px;
            margin-bottom: 20px;
            font-size: 12px;
            color: #666;
            background: white;
          }
          @media print {
            .preview-info {
              display: none;
            }
            body, .page, .label {
              background: white !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="preview-info">
          <p>Real-time preview of how labels will print on US Letter (8.5" × 11")</p>
          <p>Label size: ${columnWidth/pxPerMm}mm × ${labelHeight/pxPerMm}mm</p>
          <p>Spacing: H: ${horizontalSpacing/pxPerMm}mm, V: ${rowSpacing/pxPerMm}mm</p>
          <p>Page layout: ${rowsPerPage} rows × ${labelsPerRow} columns (${totalLabelsPerPage} labels per page)</p>
        </div>
  `;

  // Calculate number of pages needed
  const totalPages = Math.ceil(filteredRows.length / totalLabelsPerPage);
  
  // Generate pages
  let currentRow = 0;
  for (let page = 0; page < totalPages; page++) {
    html += '<div class="page">';
    
    for (let row = 0; row < rowsPerPage && currentRow < filteredRows.length; row++) {
      const yPos = topPosition + (row * rowSpacing);
      
      for (let col = 0; col < labelsPerRow && currentRow < filteredRows.length; col++) {
        // Skip first position if starting from right
        if (page === 0 && row === 0 && col === 0 && startPosition === "right") {
          continue;
        }
        
        if (currentRow < filteredRows.length) {
          const xPos = leftPosition + (col * (columnWidth + horizontalSpacing));
          const data = filteredRows[currentRow].original;
          
          html += `
            <div class="label" style="left: ${xPos}px; top: ${yPos}px;">
              ${generateLabelContent(data, selectedFields, userRole)}
            </div>
          `;
          
          currentRow++;
        }
      }
    }
    
    html += '</div>';
  }
  
  html += '</body></html>';
  return html;
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
  const prnContent = generateRawPrinterData(filteredRows, template); // Use generateRawPrinterData
  
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