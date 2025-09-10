// === ESC/P constants for LX-300+/LX-300II+ ===
// Updated positioning system using ESC/P absolute positioning for precise dot-based control
// This replaces the old character-based positioning with more accurate dot-based positioning
const DPI_V = 60; // vertical: 60 dots/inch
const DPI_H = 120; // horizontal: 120 dots/inch

// Convert inches to dot counts
const inchesToDotsV = (inches) => Math.round(inches * DPI_V);
const inchesToDotsH = (inches) => Math.round(inches * DPI_H);

// Paper + label specs
const labelWidthIn = 3.5; // per label
const labelHeightIn = 1.5;
const pageWidthIn = 8.0;

const labelWidthDots = inchesToDotsH(labelWidthIn);
const labelHeightDots = inchesToDotsV(labelHeightIn);

// Horizontal positions - set directly in dots for precise control
const col1X = 2;
const col2X = 255; // Set directly to 250 dots for correct positioning

// Helper: wrap text into multiple lines given max width (in characters)
function wrapText(text, maxChars) {
  if (!text) return [];

  // Clean the text: remove \r\n and split by actual line breaks
  const cleanText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = cleanText.split("\n").filter((line) => line.trim() !== "");

  const result = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // If line is already within maxChars, keep it as is
    if (trimmedLine.length <= maxChars) {
      result.push(trimmedLine);
    } else {
      // Wrap this line
      const words = trimmedLine.split(" ").filter((word) => word.length > 0);
      let currentLine = "";

      for (const word of words) {
        if ((currentLine + word).length > maxChars) {
          if (currentLine.trim()) {
            result.push(currentLine.trim());
            currentLine = word;
          } else {
            result.push(word.substring(0, maxChars));
            currentLine = "";
          }
        } else {
          currentLine += currentLine ? " " + word : word;
        }
      }

      if (currentLine.trim()) {
        result.push(currentLine.trim());
      }
    }
  }

  return result;
}

// CP850 character mapping for Spanish characters
const utf8ToCp850Map = {
  Ñ: 0xa5,
  ñ: 0xa4,
  Á: 0xb6,
  á: 0xa0,
  É: 0x90,
  é: 0x82,
  Í: 0xd6,
  í: 0xa1,
  Ó: 0xe0,
  ó: 0xa2,
  Ú: 0xe9,
  ú: 0xa3,
  Ü: 0x9a,
  ü: 0x81,
  "¡": 0xad,
  "¿": 0xa8,
};

// Helper function to convert UTF-8 to CP850 (browser-compatible)
const utf8ToCp850 = (str) => {
  if (!str) return [];

  const bytes = [];

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const charCode = char.charCodeAt(0);

    if (utf8ToCp850Map[char] !== undefined) {
      const cp850Byte = utf8ToCp850Map[char];
      bytes.push(cp850Byte);
    } else if (charCode < 128) {
      // ASCII character
      bytes.push(charCode);
    } else {
      // Fallback for unmapped characters
      bytes.push(0x3f); // Question mark
    }
  }

  return bytes;
};

// Helper function to check if text contains special characters that need CP850 conversion
const needsCp850Conversion = (text) => {
  if (!text) return false;

  const foundChars = Object.keys(utf8ToCp850Map).filter((char) =>
    text.includes(char)
  );
  return foundChars.length > 0;
};

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

// Helper function to clean phone numbers - extract only numeric parts
const cleanPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return "";

  // Convert to string first to handle number inputs
  const phoneStr = String(phoneNumber);

  // Find the first sequence of digits, dashes, spaces, plus signs, and periods
  // This will capture phone numbers like: 0922-9625905, +63 922 962 5905, etc.
  const phoneMatch = phoneStr.match(/^[\d\s\-\+\.]+/);

  if (phoneMatch) {
    // Clean up the matched phone number
    let cleaned = phoneMatch[0]
      // Remove extra spaces
      .replace(/\s+/g, " ")
      // Remove multiple dashes
      .replace(/-+/g, "-")
      // Remove multiple periods
      .replace(/\.+/g, ".")
      // Trim whitespace
      .trim();

    // Remove trailing dashes, periods, or spaces
    cleaned = cleaned.replace(/[\-\s\.]+$/, "");

    return cleaned;
  }

  return "";
};

export const getContactNumber = (data) => {
  const cellno = cleanPhoneNumber(data.cellno);
  const officeno = cleanPhoneNumber(data.officeno);

  if (cellno || officeno) {
    return [cellno, officeno].filter((num) => num).join(" / ");
  }
  return "";
};

// Common function to filter rows based on start/end Client IDs
const filterRowsByClientId = (rows, startClientId, endClientId) => {
  return rows.filter((row) => {
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
};

// Common function to get subscription data
const getSubscriptionData = (data, subscriptionType) => {
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
  return subscriptionData?.records?.[0] || subscriptionData || {};
};

// Common function to generate label content (HTML version)
export const generateLabelContent = (
  data,
  selectedFields = [],
  userRole,
  subscriptionType
) => {
  if (!data) return "";

  // Ensure selectedFields is always an array
  const fields = Array.isArray(selectedFields) ? selectedFields : [];

  const subscription = getSubscriptionData(data, subscriptionType);
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
  const contact = fields.includes("cellno") ? getContactNumber(data) : "";

  // Build content with consistent spacing
  const commonStyle = "margin: 0; padding: 0;";

  return `
    <div>
      <p style="${commonStyle}">${idLine}${expiryAndCopies}</p>
      ${nameLines
        .map((line) => `<p style="${commonStyle}">${line}</p>`)
        .join("")}
      ${
        address
          ? `<p class="multiline" style="${commonStyle}">${address}</p>`
          : ""
      }
      ${contact ? `<p style="${commonStyle}">${contact}</p>` : ""}
    </div>
  `;
};

// Modified label text generator to ensure proper line breaks
const generateLabelTextContent = (
  data,
  selectedFields = [],
  userRole,
  subscriptionType
) => {
  if (!data) return "";

  // Get subscription data
  let subscriptionData;
  switch (subscriptionType) {
    case "Promo":
      subscriptionData = data.promoData;
      break;
    case "Complimentary":
      subscriptionData = data.compData;
      break;
    default:
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

  // ID line with expiry and copies logic
  const idLine = data.id || "";

  const shouldHideExpiryAndCopies =
    ["HRG", "FOM", "CAL"].some((role) => userRole?.includes(role)) ||
    subscriptionType === "Promo" ||
    subscriptionType === "Complimentary";

  const isSpecialRole = ["HRG", "FOM", "CAL"].some((role) =>
    userRole?.includes(role)
  );
  const group = (data.group || "").toUpperCase();
  const isCMCGroup = group === "CMC" || group.includes("CMC");

  const expiryAndCopies = !shouldHideExpiryAndCopies
    ? ` - ${enddate} - ${copies}cps/${data.acode || ""}`
    : isSpecialRole && isCMCGroup
    ? `/${group}/${data.acode || ""}`
    : data.acode
    ? `/${data.acode}`
    : "";

  // Name and company
  const fullName = getFullName(data);
  const company = data.company || "";

  // Address - preserve all lines including empty ones for proper spacing
  const address = data.address
    ? data.address
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0) // Keep only non-empty lines
    : [];

  // Contact info - only include if cellno is selected
  const contact = selectedFields.includes("cellno")
    ? getContactNumber(data)
    : "";

  // Build content with clear line breaks according to specified format
  let content = "";

  // ID line: id-subsdate-cps/acode(area code)
  content += `${idLine}${expiryAndCopies}\r\n`;

  // Name and company logic based on requirements:
  // 1. If both name and company exist and are different: name, then company
  // 2. If no name: company only
  // 3. If no company: name only
  if (fullName && company && fullName !== company) {
    // Both name and company exist and they're different
    content += `${fullName}\r\n`;
    content += `${company}\r\n`;
  } else if (!fullName && company) {
    // No name, but company exists
    content += `${company}\r\n`;
  } else if (fullName && !company) {
    // Name exists, but no company
    content += `${fullName}\r\n`;
  } else if (fullName && company && fullName === company) {
    // Name and company are the same, show only once
    content += `${fullName}\r\n`;
  }

  // Address - one line per address line
  address.forEach((line) => {
    content += `${line}\r\n`;
  });

  // Contact info
  if (contact) content += `${contact}\r\n`;

  return content;
};

// Main HTML generation function
export const generatePrintHTML = (
  startClientId,
  endClientId,
  startPosition,
  rows,
  template,
  leftPosition, // Expected in pixels
  topPosition, // Expected in pixels
  columnWidth, // Expected in pixels
  horizontalSpacing, // Expected in pixels
  rowSpacing, // Expected in pixels
  fontSize, // Expected in points (pt)
  labelHeight, // Expected in pixels
  selectedFields,
  userRole,
  subscriptionType,
  rowsPerPage = 3,
  columnsPerPage = 2
) => {
  // Filter rows based on start/end Client IDs
  const filteredRows = filterRowsByClientId(rows, startClientId, endClientId);

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

  // Calculate the number of labels per page using the dynamic configuration
  const labelsPerPage = rowsPerPage * columnsPerPage;
  const totalPages = Math.ceil(filteredRows.length / labelsPerPage);

  // Create HTML content with more robust styling
  let html = `
    <html>
      <head>
        <title>Mailing Labels</title>
        <style>
          @font-face {
            font-family: 'Quaxiculo';
            src: url('data:font/woff;base64,UklGRqQGAABXQVZFZm10IBAAAAABAAAAEAAAAAABAAgAZGF0YYAGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
            font-weight: normal;
            font-style: normal;
          }
          @page {
            size: letter;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            position: relative;
            font-family: 'Quaxiculo', 'LQMATRIX EliteQ LQN', Arial, sans-serif;
            font-size: ${fontSize}pt;
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
          .label-container {
            position: absolute;
            width: ${columnWidth}px;
            height: ${labelHeight}px;
            overflow: hidden;
            box-sizing: border-box;
            border: 1px solid #ddd; /* Visual border for debugging */
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: flex-start;
            padding: 2px;
          }
          .label-content {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            overflow: hidden;
            justify-content: flex-start;
          }
          .label-content p {
            margin: 0;
            padding: 0;
            line-height: 1.1; /* Tighter line spacing */
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            flex-shrink: 0;
            font-size: ${fontSize}pt;
          }
          .label-content p.multiline {
            white-space: normal;
            display: -webkit-box;
            -webkit-line-clamp: 4; /* Limit address to 4 lines */
            -webkit-box-orient: vertical;
          }
          @media print {
            body { margin: 0; }
            .page { page-break-after: always; }
            .label-container { border: none; } /* Remove borders for printing */
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

      // Calculate position - now with more precise spacing for 2-column layout
      const positionInPage = i % labelsPerPage;
      const column = positionInPage % columnsPerPage; // 0 = left, 1 = right
      const rowInPage = Math.floor(positionInPage / columnsPerPage);

      const startFromRight =
        startPosition === "right" && pageIndex === 0 && i === startIndex;
      const effectiveColumn = startFromRight ? columnsPerPage - 1 : column;

      // Calculate positions using pixel values directly
      // Each label gets its own container with exact width and height
      const xPos =
        leftPosition + effectiveColumn * (columnWidth + horizontalSpacing);
      const yPos = topPosition + rowInPage * (labelHeight + rowSpacing);

      // Generate label content
      const content = generateLabelContent(
        data,
        selectedFields,
        userRole,
        data.subscriptionType || subscriptionType
      );

      // Wrap content in a container with strict width and height control
      html += `
        <div class="label-container" style="left: ${xPos}px; top: ${yPos}px;">
          <div class="label-content">${content}</div>
        </div>
      `;
    }

    html += "</div>";
  }

  html += `
      </body>
    </html>
  `;

  return html;
};

// Generate CP850-compatible raw print content using new ESC/P positioning logic
export const generateCp850RawPrintContent = (
  startClientId,
  endClientId,
  startPosition,
  rows,
  template,
  leftPosition, // Ignored - using new ESC/P positioning
  topPosition, // Ignored - using new ESC/P positioning
  columnWidth, // Ignored - using new ESC/P positioning
  horizontalSpacing, // Ignored - using new ESC/P positioning
  rowSpacing, // Ignored - using new ESC/P positioning
  labelHeight, // Ignored - using new ESC/P positioning
  selectedFields,
  userRole,
  subscriptionType,
  rowsPerPage = 3,
  columnsPerPage = 2, // Always default to 2 columns
  isPrintJobResumed = false,
  useCp850Encoding = true, // Enable CP850 encoding for special characters
  labelAdjustments // Optional: { labelWidthIn, topMargin, rowSpacing, col2X }
) => {
  // Filter rows based on start/end Client IDs
  const filteredRows = rows.filter((row) => {
    const clientId = row?.original?.id?.toString();
    if (!clientId) return false;

    const trimmedStartId = startClientId?.trim();
    const trimmedEndId = endClientId?.trim();

    if (!trimmedStartId && !trimmedEndId) return true;

    const numericClientId = parseInt(clientId, 10);
    const numericStartId = trimmedStartId ? parseInt(trimmedStartId, 10) : null;
    const numericEndId = trimmedEndId ? parseInt(trimmedEndId, 10) : null;

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
    return [];
  }

  // Check if any data needs CP850 conversion
  const needsConversion =
    useCp850Encoding &&
    filteredRows.some((row) => {
      const data = row.original;
      const fullName = getFullName(data);
      const company = data.company || "";
      const address = data.address || "";

      const nameNeeds = needsCp850Conversion(fullName);
      const companyNeeds = needsCp850Conversion(company);
      const addressNeeds = needsCp850Conversion(address);

      return nameNeeds || companyNeeds || addressNeeds;
    });

  // Resolve effective values using provided adjustments or fallbacks to existing defaults
  const effectiveLabelWidthIn =
    labelAdjustments && Number.isFinite(labelAdjustments.labelWidthIn)
      ? labelAdjustments.labelWidthIn
      : labelWidthIn;
  const effectiveTopMarginLines =
    labelAdjustments && Number.isFinite(labelAdjustments.topMargin)
      ? labelAdjustments.topMargin
      : 4;
  const effectiveRowSpacingLines =
    labelAdjustments && Number.isFinite(labelAdjustments.rowSpacing)
      ? labelAdjustments.rowSpacing
      : 14;
  const effectiveCol2X =
    labelAdjustments && Number.isFinite(labelAdjustments.col2X)
      ? labelAdjustments.col2X
      : col2X;

  // Initialize printer with new ESC/P positioning commands
  let rawCommands = [];

  if (needsConversion) {
    // Use CP850 encoding for special characters
    rawCommands = [
      0x1b,
      0x40, // ESC @ (Reset)
      0x1b,
      0x4d, // ESC M (Elite 12 CPI)
      0x1b,
      0x74,
      0x02, // ESC t 2 (PC850)
      0x1b,
      0x52,
      0x07, // ESC R 7 (Spain)
    ];
  } else {
    // Standard ASCII encoding
    rawCommands = [
      0x1b,
      0x40, // ESC @ (Reset)
      0x1b,
      0x4d, // ESC M (Elite 12 CPI)
    ];
  }

  // Set line spacing to 1/6 inch (6 LPI)
  rawCommands.push(0x1b, 0x32); // ESC 2 - Set line spacing to 1/6 inch

  // Add initial spacing
  // rawCommands.push(0x0d, 0x0a); // CRLF
  // feed 8 dots = 1/720 inch per dot on LX-300+ (≈1/216")
  rawCommands.push(0x1b, 0x4a, 0x08); // ESC J 8

  // Apply top margin only for first row of first page and only if not a resumed job
  if (!isPrintJobResumed) {
    // 1 inch top margin = 6 lines at 6 LPI (default 4 lines used here)
    const topMarginLines = effectiveTopMarginLines;
    for (let i = 0; i < topMarginLines; i++) {
      rawCommands.push(0x0d, 0x0a);
    }
    // Top margin applied
  } else {
    // Top margin skipped for resumed print job
  }

  // Calculate column widths for Elite 12 CPI
  const charWidthDots = 12; // 120 DPI / 12 chars per inch = 12 dots per character (Elite 12 CPI)
  const labelWidthDots = inchesToDotsH(effectiveLabelWidthIn); // default 3.5 inches = 420 dots at 120 DPI
  const maxCharsPerCol = Math.floor(labelWidthDots / charWidthDots);

  // Process all rows sequentially
  // If starting from right, first row consumes only 1 item on the right column
  const startFromRightMode = startPosition === "right";
  const totalRows = startFromRightMode
    ? Math.ceil((filteredRows.length + 1) / columnsPerPage)
    : Math.ceil(filteredRows.length / columnsPerPage);

  for (let rowIndex = 0; rowIndex < totalRows; rowIndex++) {
    let effectiveLeftLabel = null;
    let effectiveRightLabel = null;

    if (startFromRightMode) {
      if (rowIndex === 0) {
        // Row 0: print first item on right, leave left blank
        effectiveLeftLabel = null;
        effectiveRightLabel = filteredRows[0] || null;
      } else {
        // Subsequent rows: indices shift by one due to the initial right-only row
        const leftIdx = rowIndex * columnsPerPage - 1; // (rowIndex*2)-1
        const rightIdx = leftIdx + 1; // rowIndex*2
        effectiveLeftLabel =
          leftIdx < filteredRows.length ? filteredRows[leftIdx] : null;
        effectiveRightLabel =
          rightIdx < filteredRows.length ? filteredRows[rightIdx] : null;
      }
    } else {
      // Normal left-first layout
      const leftLabelIndex = rowIndex * columnsPerPage;
      const rightLabelIndex = leftLabelIndex + 1;
      effectiveLeftLabel =
        leftLabelIndex < filteredRows.length
          ? filteredRows[leftLabelIndex]
          : null;
      effectiveRightLabel =
        rightLabelIndex < filteredRows.length
          ? filteredRows[rightLabelIndex]
          : null;
    }

    // Use fixed label height for ESC/P positioning (6 lines = 1 inch at 6 LPI)
    const effectiveLabelHeight = 6; // Fixed at 6 lines for consistent positioning

    // Generate content for both labels
    let leftContent = "";
    if (effectiveLeftLabel) {
      leftContent = generateLabelTextContent(
        effectiveLeftLabel.original,
        selectedFields,
        userRole,
        effectiveLeftLabel.original.subscriptionType || subscriptionType
      );
    }

    let rightContent = "";
    if (effectiveRightLabel) {
      rightContent = generateLabelTextContent(
        effectiveRightLabel.original,
        selectedFields,
        userRole,
        effectiveRightLabel.original.subscriptionType || subscriptionType
      );
    }

    // Process entire content through wrapText, not individual lines
    // Calculate max characters for each column based on actual dot space
    // LX-300+ uses Elite 12 CPI = 12 dots per character
    const charWidthDots = 12; // 120 DPI / 12 chars per inch = 12 dots per character (Elite 12 CPI)
    const labelWidthDots = inchesToDotsH(effectiveLabelWidthIn); // default 3.5 inches = 420 dots at 120 DPI
    const maxLeftChars = Math.floor(labelWidthDots / charWidthDots); // 420 / 12 = 35 chars
    const maxRightChars = Math.floor(labelWidthDots / charWidthDots); // 420 / 12 = 35 chars

    const leftLines = wrapText(leftContent, maxLeftChars);
    const rightLines = wrapText(rightContent, maxRightChars);

    // Process label content

    // Print each line of the row using ESC/P absolute positioning
    // Use the actual content length instead of fixed height
    const maxLines = Math.max(leftLines.length, rightLines.length);

    for (let lineIndex = 0; lineIndex < maxLines; lineIndex++) {
      // Get content for this line
      const leftLine =
        lineIndex < leftLines.length ? leftLines[lineIndex] || "" : "";

      const rightLine =
        lineIndex < rightLines.length && effectiveRightLabel
          ? rightLines[lineIndex] || ""
          : "";

      // Print left column on this line (if it has content)
      if (leftLine && leftLine !== "") {
        rawCommands.push(0x1b, 0x24, col1X % 256, Math.floor(col1X / 256));
        if (needsConversion && needsCp850Conversion(leftLine)) {
          rawCommands.push(...utf8ToCp850(leftLine));
        } else {
          for (let j = 0; j < leftLine.length; j++) {
            rawCommands.push(leftLine.charCodeAt(j));
          }
        }
      }

      // Print right column on this line (if it has content)
      if (rightLine && rightLine !== "") {
        rawCommands.push(
          0x1b,
          0x24,
          effectiveCol2X % 256,
          Math.floor(effectiveCol2X / 256)
        );
        if (needsConversion && needsCp850Conversion(rightLine)) {
          rawCommands.push(...utf8ToCp850(rightLine));
        } else {
          for (let j = 0; j < rightLine.length; j++) {
            rawCommands.push(rightLine.charCodeAt(j));
          }
        }
      }

      // Move to next line
      rawCommands.push(0x0d, 0x0a);
    }

    // NORMALIZE ROW HEIGHT - Make each row exactly the same height
    const fixedRowHeight = 8; // 8 lines = ~1.33 inches at 6 LPI
    const actualLinesPrinted = maxLines;
    const paddingLines = Math.max(0, fixedRowHeight - actualLinesPrinted);

    // Add padding lines to normalize the row height
    for (let i = 0; i < paddingLines; i++) {
      rawCommands.push(0x0d, 0x0a);
    }

    // ROW SPACING (between label rows)
    if (rowIndex < totalRows - 1) {
      const rowSpacingLines = effectiveRowSpacingLines; // default 14 lines
      for (let i = 0; i < rowSpacingLines; i++) {
        rawCommands.push(0x0d, 0x0a);
      }
    }
  }

  // Add final commands
  // rawCommands.push(0x0a); // Line feed
  rawCommands.push(0x0d); // Carriage return
  // rawCommands.push(0x0c); // Form feed
  rawCommands.push(0x1b, 0x40); // Reset printer
  rawCommands.push(0x0d, 0x0a); // Final line ending

  return rawCommands;
};

// Diagnostic function to check printer status and identify issues
export const diagnosePrinterIssues = async (
  printerName,
  useDefaultPrinter = false
) => {
  const diagnostics = {
    jspmAvailable: false,
    websocketStatus: "unknown",
    printerStatus: "unknown",
    driverIssues: [],
    recommendations: [],
  };

  try {
    // Check JSPrintManager availability
    if (window.JSPM && window.JSPM.JSPrintManager) {
      diagnostics.jspmAvailable = true;

      // Check WebSocket status
      if (
        window.JSPM.JSPrintManager.websocket_status ===
        window.JSPM.WSStatus.Open
      ) {
        diagnostics.websocketStatus = "connected";
      } else if (
        window.JSPM.JSPrintManager.websocket_status ===
        window.JSPM.WSStatus.Closed
      ) {
        diagnostics.websocketStatus = "disconnected";
        diagnostics.driverIssues.push("JSPrintManager client app not running");
        diagnostics.recommendations.push(
          "Start JSPrintManager client application"
        );
      } else if (
        window.JSPM.JSPrintManager.websocket_status ===
        window.JSPM.WSStatus.Blocked
      ) {
        diagnostics.websocketStatus = "blocked";
        diagnostics.driverIssues.push(
          "JSPrintManager has blocked this website"
        );
        diagnostics.recommendations.push(
          "Allow this website in JSPrintManager settings"
        );
      } else {
        diagnostics.websocketStatus = "connecting";
        diagnostics.recommendations.push("Wait for JSPrintManager to connect");
      }
    } else {
      diagnostics.driverIssues.push("JSPrintManager library not loaded");
      diagnostics.recommendations.push(
        "Ensure JSPrintManager library is properly loaded"
      );
    }

    // Check printer availability
    if (
      diagnostics.jspmAvailable &&
      diagnostics.websocketStatus === "connected"
    ) {
      try {
        const printer = useDefaultPrinter
          ? new window.JSPM.DefaultPrinter()
          : new window.JSPM.InstalledPrinter(printerName);

        // Try to get printer status
        if (typeof printer.getStatus === "function") {
          const status = await printer.getStatus();
          diagnostics.printerStatus = status;

          if (status === "offline" || status === "error") {
            diagnostics.driverIssues.push(`Printer is ${status}`);
            diagnostics.recommendations.push(
              "Check printer connection and power"
            );
          }
        } else {
          diagnostics.printerStatus = "unknown (no status method)";
        }
      } catch (printerError) {
        diagnostics.printerStatus = "error";
        diagnostics.driverIssues.push(`Printer error: ${printerError.message}`);
        diagnostics.recommendations.push("Check printer driver installation");
      }
    }

    // Add general recommendations
    if (diagnostics.driverIssues.length === 0) {
      diagnostics.recommendations.push(
        "Printer appears to be ready for printing"
      );
    } else {
      diagnostics.recommendations.push("Try restarting the printer");
      diagnostics.recommendations.push(
        "Check Windows printer queue for stuck jobs"
      );
      diagnostics.recommendations.push(
        "Restart JSPrintManager client application"
      );
    }
  } catch (error) {
    diagnostics.driverIssues.push(`Diagnostic error: ${error.message}`);
    diagnostics.recommendations.push("Restart the application and try again");
  }

  return diagnostics;
};

// JSPrintManager integration function
export const printWithJsPrintManager = async (
  rawCommands,
  printerName,
  useDefaultPrinter = false,
  callbacks = {}
) => {
  if (!window.JSPM || !window.JSPM.JSPrintManager) {
    throw new Error("JSPrintManager not available");
  }

  // Check WebSocket status
  if (
    window.JSPM.JSPrintManager.websocket_status !== window.JSPM.WSStatus.Open
  ) {
    throw new Error("WebSocket connection not ready");
  }

  // Create a ClientPrintJob
  const cpj = new window.JSPM.ClientPrintJob();

  // Set printer type based on user selection
  if (useDefaultPrinter) {
    cpj.clientPrinter = new window.JSPM.DefaultPrinter();
  } else {
    if (!printerName) throw new Error("No printer selected");
    cpj.clientPrinter = new window.JSPM.InstalledPrinter(printerName);
  }

  // Convert array to Uint8Array for binary commands
  cpj.binaryPrinterCommands = new Uint8Array(rawCommands);

  // Set up status tracking with more detailed logging
  cpj.onUpdated = function (status) {
    // Determine status for callbacks
    let statusText = "unknown";
    if (typeof status === "object" && status["state-description"]) {
      statusText = status["state-description"].toLowerCase();
    } else if (typeof status === "object" && status.result) {
      statusText = status.result.toLowerCase();
    } else if (typeof status === "string") {
      statusText = status.toLowerCase();
    }

    // Update callbacks
    if (callbacks.setPrintJobStatus) {
      callbacks.setPrintJobStatus(statusText);
    }

    // Add real-time event with more details
    if (callbacks.addPrinterEvent) {
      callbacks.addPrinterEvent("Print job status update", {
        status: statusText,
        rawStatus: status,
        timestamp: new Date().toISOString(),
        details:
          typeof status === "object"
            ? {
                state: status.state,
                description: status["state-description"],
                result: status.result,
                error: status.error,
              }
            : null,
      });
    }
  };

  // Send print job to printer with enhanced error handling
  try {
    if (callbacks.addPrinterEvent) {
      callbacks.addPrinterEvent("Starting print job", {
        printer: useDefaultPrinter ? "Default Printer" : printerName,
        commandsLength: rawCommands.length,
        timestamp: new Date().toISOString(),
      });
    }

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () =>
          reject(
            new Error("Print job timeout - printer may be busy or driver issue")
          ),
        60000 // Increased to 60 seconds for debugging
      );
    });

    const printPromise = cpj.sendToClient();

    // Wait for either completion or timeout
    await Promise.race([printPromise, timeoutPromise]);

    console.log("Print job completed successfully");
    if (callbacks.setStatus) callbacks.setStatus("Printed successfully");
    if (callbacks.setPrintJobStatus) callbacks.setPrintJobStatus("complete");

    if (callbacks.addPrinterEvent) {
      callbacks.addPrinterEvent("Print job completed", {
        printer: useDefaultPrinter ? "Default Printer" : printerName,
        status: "success",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Print job failed:", error);

    // Provide more specific error information
    let errorMessage = error.message;
    if (error.message.includes("timeout")) {
      errorMessage =
        "Print job timed out. This could be due to:\n" +
        "1. Printer driver issues\n" +
        "2. Printer is busy or offline\n" +
        "3. Network connectivity issues\n" +
        "4. JSPrintManager service problems";
    } else if (error.message.includes("WebSocket")) {
      errorMessage =
        "WebSocket connection issue. Please check:\n" +
        "1. JSPrintManager client app is running\n" +
        "2. Browser is allowed to connect to JSPrintManager\n" +
        "3. No firewall blocking the connection";
    }

    if (callbacks.setStatus) callbacks.setStatus(`Error: ${errorMessage}`);
    if (callbacks.setPrintJobStatus) callbacks.setPrintJobStatus("failed");

    if (callbacks.addPrinterEvent) {
      callbacks.addPrinterEvent("Print job failed", {
        printer: useDefaultPrinter ? "Default Printer" : printerName,
        error: errorMessage,
        originalError: error.message,
        timestamp: new Date().toISOString(),
      });
    }
    throw error;
  }
};

// Generate HTML for a checklist
export const generateChecklistHTML = (
  columns,
  rowsToUse,
  title = "Mailing Checklist",
  date = null
) => {
  // Use provided date or current date
  const displayDate = date
    ? new Date(date).toLocaleDateString()
    : new Date().toLocaleDateString();

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
        .checklist-header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }
        .checklist-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .checklist-date {
          font-size: 14px;
          color: #666;
        }
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
      <div class="checklist-header">
        <div class="checklist-title">${title}</div>
        <div class="checklist-date">Date: ${displayDate}</div>
      </div>
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
