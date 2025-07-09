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

export const generateLabelContent = (data, selectedFields = [], userRole) => {
  if (!data) return '';

  // Ensure selectedFields is always an array
  const fields = Array.isArray(selectedFields) ? selectedFields : [];

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
  const contact = fields.includes("contactnos") ? getContactNumber(data) : "";

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
  
  // Add script to trigger print immediately
  html = html.replace('</body>', '<script>window.print(); window.close();</script></body>');
  
  return html;
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