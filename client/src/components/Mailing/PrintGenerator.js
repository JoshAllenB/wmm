// Helper functions
export const getFullName = (data) => {
  const title = data.title || "";
  const fname = data.fname || "";
  const mname = data.mname || "";
  const lname = data.lname || "";
  const sname = data.sname || "";
  const company = data.company || "";

  if (company) {
    return company;
  }

  return [title, fname, mname, lname, sname]
    .filter((part) => part && part.trim())
    .join(" ");
};

export const getContactNumber = (data) => {
  const contactnos = data.contactnos || "";
  const cellno = data.cellno || "";
  const officeno = data.officeno || "";

  if (contactnos) return contactnos;
  if (cellno || officeno) {
    return [cellno, officeno].filter((num) => num).join(" / ");
  }
  return "";
};

export const generateLabelContent = (
  data,
  selectedFields = [],
  userRole,
  subscriptionType
) => {
  if (!data) return "";

  // Ensure selectedFields is always an array
  const fields = Array.isArray(selectedFields) ? selectedFields : [];

  // Get the appropriate subscription data based on type
  let subscriptionData;
  switch (subscriptionType) {
    case "Promo":
      subscriptionData = data.promoData;
      break;
    case "Complimentary":
      subscriptionData = data.compData;
      break;
    default: // WMM
      subscriptionData = data.wmmData;
  }

  const subscription = subscriptionData?.records?.[0] || subscriptionData || {};
  const copies = subscription.copies ?? "N/A";
  let enddate = "N/A";

  if (subscription.enddate) {
    const date = new Date(subscription.enddate);
    if (!isNaN(date.getTime())) {
      enddate = date.toLocaleDateString();
    }
  }

  // Check if user role should hide expiry and copies
  const shouldHideExpiryAndCopies =
    ["HRG", "FOM", "CAL"].some((role) => userRole?.includes(role)) ||
    subscriptionType === "Promo" ||
    subscriptionType === "Complimentary";

  const isSpecialRole = ["HRG", "FOM", "CAL"].some((role) =>
    userRole?.includes(role)
  );
  const group = (data.group || "").toUpperCase();
  const isCMCGroup = group === "CMC" || group.includes("CMC");

  const idLine = data.id || "";
  const expiryAndCopies = !shouldHideExpiryAndCopies
    ? ` - ${enddate} - ${copies}cps/${data.acode || ""}`
    : isSpecialRole && isCMCGroup
    ? `/${group}/${data.acode || ""}`
    : data.acode
    ? `/${data.acode}`
    : "";

  // Handle name and company display
  let nameLines = [];
  const fullName = getFullName(data);
  const company = data.company || "";

  if (fullName && company && fullName !== company) {
    // Both name and company exist and they're different
    nameLines.push(fullName);
    nameLines.push(company);
  } else {
    // Either name or company or neither, or they're the same
    const displayName = fullName || company;
    if (displayName) {
      nameLines.push(displayName);
    }
  }

  // Clean up address by removing empty lines and extra whitespace while preserving valid line breaks
  const address = data.address
    ? data.address
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join("<br />")
    : "";
  const contact = fields.includes("contactnos") ? getContactNumber(data) : "";

  // Build content with consistent spacing
  const commonStyle = "margin: 0; padding: 0;";

  return `
    <div>
      <p style="${commonStyle}">${idLine}${expiryAndCopies}</p>
      ${nameLines
        .map((line) => `<p style="${commonStyle}">${line}</p>`)
        .join("")}
      ${address ? `<p style="${commonStyle}">${address}</p>` : ""}
      ${contact ? `<p style="${commonStyle}">${contact}</p>` : ""}
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
  userRole,
  subscriptionType
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
    if (
      isNaN(numericClientId) ||
      (numericStartId && isNaN(numericStartId)) ||
      (numericEndId && isNaN(numericEndId))
    ) {
      return false;
    }

    const isAfterStart = numericStartId
      ? numericClientId >= numericStartId
      : true;
    const isBeforeEnd = numericEndId ? numericClientId <= numericEndId : true;
    return isAfterStart && isBeforeEnd;
  });

  if (filteredRows.length === 0) {
    return `
      <html>
        <head>
          <title>No Labels to Print</title>
          <style>
            body { padding: 20px; }
          </style>
        </head>
        <body>
          <h1>No labels found</h1>
          <p>Please check your selection and ID range if specified.</p>
        </body>
      </html>
    `;
  }

  // Calculate the number of labels per page
  const labelsPerPage = 6; // 2 columns × 3 rows
  const totalPages = Math.ceil(filteredRows.length / labelsPerPage);

  // Create HTML content
  let html = `
    <html>
      <head>
        <title>Mailing Labels</title>
        <style>
          @page {
            size: letter;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            position: relative;
          }
          .page {
            width: 8.5in;
            height: 11in;
            position: relative;
            page-break-after: always;
          }
          .page:last-child {
            page-break-after: auto;
          }
          .label {
            position: absolute;
            width: ${columnWidth}px;
          }
          @media print {
            body { margin: 0; }
            .page { page-break-after: always; }
          }
        </style>
      </head>
      <body>
  `;

  // Process each page
  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    html += '<div class="page">';

    // Process labels for this page
    const startIndex = pageIndex * labelsPerPage;
    const endIndex = Math.min(startIndex + labelsPerPage, filteredRows.length);

    for (let i = startIndex; i < endIndex; i++) {
      const row = filteredRows[i];
      const data = row.original;

      // Calculate position
      const positionInPage = i % labelsPerPage;
      const column = positionInPage % 2;
      const rowInPage = Math.floor(positionInPage / 2);

      // Adjust starting position based on user preference
      const startFromRight =
        startPosition === "right" && pageIndex === 0 && i === startIndex;
      const effectiveColumn = startFromRight ? 1 : column;

      const xPos =
        leftPosition + effectiveColumn * (columnWidth + horizontalSpacing);
      const yPos = topPosition + rowInPage * rowSpacing;

      // Generate label content with subscription type
      html += `
        <div class="label" style="left: ${xPos}px; top: ${yPos}px;">
          ${generateLabelContent(
            data,
            selectedFields,
            userRole,
            data.subscriptionType || subscriptionType
          )}
        </div>
      `;
    }

    html += "</div>"; // Close page div
  }

  html += `
      </body>
    </html>
  `;

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
