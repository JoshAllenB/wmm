import React from "react";

// Conversion functions
const mmToPx = (mm) => Math.round((mm * 96) / 25.4); // Convert mm to pixels at 96dpi
const inchesToMm = (inches) => inches * 25.4; // Convert inches to mm
const inchesToPx = (inches) => Math.round(inches * 96); // Convert inches to pixels at 96dpi

// Default to US Letter size in mm if not specified
const DEFAULT_PAPER_WIDTH_MM = inchesToMm(8.5); // 215.9mm
const DEFAULT_PAPER_HEIGHT_MM = inchesToMm(11); // 279.4mm

// Helper functions
const getFullName = (row) => {
  const title = row.title ? `${row.title} ` : "";
  return [title, row.fname, row.mname, row.lname].filter(Boolean).join(" ");
};

const getContactNumber = (row) => {
  // Function to clean phone numbers
  const cleanPhoneNumber = (number) => {
    if (!number) return "";
    // Convert to string first to handle number inputs
    const numberStr = String(number);
    // Remove any text descriptions (e.g., "Cell:", "Phone:", etc.)
    const withoutLabels = numberStr.replace(
      /(?:cell|phone|tel|office|contact|#|number|:|\(|\))/gi,
      ""
    );
    // Keep only digits, spaces, dashes, plus signs, and periods
    const cleaned = withoutLabels.replace(/[^0-9\s\-\+\.]/g, "").trim();
    // Remove multiple spaces/dashes
    return cleaned.replace(/[\s-]+/g, "-");
  };

  // Try cell number first
  const cellNumber = cleanPhoneNumber(row.cellno);
  if (cellNumber) return cellNumber;

  // Try office number second
  const officeNumber = cleanPhoneNumber(row.ofcno);
  if (officeNumber) return officeNumber;

  // Finally try contact numbers
  const contactNumber = cleanPhoneNumber(row.contactnos);
  if (contactNumber) return contactNumber;

  return "";
};

const formatDateLegacy = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "N/A";

  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const year = date.getFullYear().toString().slice(2);
  return `${month}/${day}/${year}`;
};

const formatIdLegacy = (id) => {
  if (!id) return "";
  return id.toString().padStart(6, "0");
};

const LabelPreview = ({
  isLoading,
  selectedTemplate,
  hasAvailableRows,
  availableRows,
  useLegacyFormat,
  fontSize, // Now in points (pt)
  columnWidth, // In mm
  horizontalSpacing, // In mm
  labelHeight, // In mm
  selectedFields,
  startPosition,
  rowSpacing, // In mm
  topPosition, // In mm
  leftPosition, // In mm
  userRole,
  paperWidth = DEFAULT_PAPER_WIDTH_MM, // In mm
  paperHeight = DEFAULT_PAPER_HEIGHT_MM, // In mm
  rowsPerPage = 3,
  columnsPerPage = 2,
  subscriptionType, // Add subscription type prop
}) => {
  // Show loading message in preview when appropriate
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <div className="animate-spin h-8 w-8 border-2 border-gray-500 rounded-full border-t-transparent mb-4"></div>
        <p className="text-gray-600">Loading template data...</p>
      </div>
    );
  }

  if (!selectedTemplate && !hasAvailableRows) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-gray-50 rounded border border-gray-200">
        <p className="text-gray-600 mb-2">No template or rows selected</p>
        <p className="text-sm text-gray-500">
          Select rows and a template to see a preview
        </p>
      </div>
    );
  }

  if (useLegacyFormat && selectedTemplate?.isLegacy) {
    // Legacy template preview
    // Use real data from available rows if possible
    const previewRow =
      availableRows.length > 0 ? availableRows[0].original : null;
    const wmmData = previewRow?.wmmData;
    const subscription = wmmData?.records?.[0] || wmmData || {};
    const displayCopies = previewRow ? subscription.copies || "1" : "1";
    const displayAcode = previewRow?.acode || "WM001";

    // Get the expiration date if available
    let displayExpDate = "N/A";
    if (subscription.enddate) {
      displayExpDate = formatDateLegacy(subscription.enddate);
    } else {
      displayExpDate = formatDateLegacy(new Date());
    }

    // Format the ID properly
    const displayId = previewRow ? formatIdLegacy(previewRow.id) : "000001";

    // Get proper name
    const displayName = previewRow
      ? getFullName(previewRow)
      : getFullName({ title: "", fname: "John", lname: "Doe", mname: "" });

    // Get proper address
    const displayAddress =
      previewRow?.address || "123 Main Street, Anytown, USA";

    // Get proper contact number if needed
    const displayContact = previewRow
      ? getContactNumber(previewRow)
      : "555-123-4567";

    return (
      <div
        className="mailing-label-preview border border-dashed border-gray-400 relative bg-white shadow-md overflow-hidden font-mono h-full"
        style={{
          width: `${Math.max(selectedTemplate.layout.width * 8, 200)}px`,
          margin: "0 auto",
          padding: "10px",
          fontSize: `${fontSize}pt`, // Now using points
        }}
      >
        {/* Show sample of legacy format */}
        <div className="absolute top-0 right-0 left-0 bg-amber-50 text-amber-800 text-xs px-2 py-1">
          Legacy Dot Matrix Format ({selectedTemplate.printer || "Dot Matrix"})
          {previewRow ? " - Real Data" : " - Sample Data"}
        </div>

        {/* Add a paper feed visuals at the top */}
        <div className="absolute top-2 left-0 right-0 flex justify-center">
          <div className="flex space-x-1">
            {Array(Math.ceil(selectedTemplate.layout.width / 5))
              .fill()
              .map((_, i) => (
                <div key={i} className="w-1 h-1 bg-gray-300 rounded-full"></div>
              ))}
          </div>
        </div>

        {/* Sample content */}
        <div className="mt-6 pt-2 relative">
          {/* Guidelines */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="h-full w-full border border-dashed border-gray-200"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(220,220,220,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(220,220,220,0.2) 1px, transparent 1px)",
                backgroundSize: "10px 12px",
              }}
            ></div>
          </div>

          <pre className="relative z-10 p-2 text-sm overflow-hidden leading-tight font-mono text-gray-800">
            {`${displayId}-S-${displayExpDate}-${displayCopies}cps/${displayAcode}
${displayName}
${displayAddress}
${
  selectedTemplate.selectedFields.includes("contactnos")
    ? `Cell# ${displayContact}`
    : ""
}`}
          </pre>
        </div>

        {/* Format string tooltip */}
        <div className="absolute bottom-0 left-0 right-0 bg-gray-100 text-gray-600 text-xs px-2 py-1 overflow-hidden">
          <details>
            <summary className="cursor-pointer">Show Format String</summary>
            <div className="mt-1 p-1 bg-white text-[9px] max-h-12 overflow-auto break-all">
              {selectedTemplate.format?.substring(0, 100) || "No format string"}
              {selectedTemplate.format?.length > 100 ? "..." : ""}
            </div>
          </details>
        </div>
      </div>
    );
  }

  // Modern template preview - Calculate dimensions for paper size
  // Convert all measurements from mm to pixels for display
  const effectiveColumnWidth = mmToPx(columnWidth);
  const effectiveHeight = mmToPx(labelHeight);
  const effectiveSpacing = mmToPx(horizontalSpacing);
  const effectiveTopPosition = mmToPx(topPosition);
  const effectiveLeftPosition = mmToPx(leftPosition);
  const effectiveRowSpacing = mmToPx(rowSpacing);

  // Calculate paper dimensions in pixels
  const paperWidthPx = mmToPx(paperWidth);
  const paperHeightPx = mmToPx(paperHeight);

  // Calculate labels per page
  const labelsPerPage = rowsPerPage * columnsPerPage;

  return (
    <div
      className="mailing-label-preview flex flex-col border border-dashed border-gray-400 relative bg-white shadow-md overflow-auto"
      style={{
        width: `${paperWidthPx}px`,
        height: `${paperHeightPx}px`,
        margin: "0 auto",
        position: "relative",
      }}
    >
      <div
        className="p-2 bg-gray-100 text-gray-700 text-xs"
        style={{ position: "sticky", top: 0, zIndex: 1 }}
      >
        Real-time preview of paper size: {(paperWidth / 25.4).toFixed(1)}" ×{" "}
        {(paperHeight / 25.4).toFixed(1)}"
        <div className="text-gray-500">
          Label size: {columnWidth.toFixed(1)}mm × {labelHeight.toFixed(1)}mm
          <br />
          Spacing: H: {horizontalSpacing.toFixed(1)}mm, V:{" "}
          {rowSpacing.toFixed(1)}mm
          <br />
          Page layout: {rowsPerPage} rows × {columnsPerPage} columns (
          {labelsPerPage} labels per page)
        </div>
      </div>

      <div
        className="flex-grow relative"
        style={{
          paddingTop: `${effectiveTopPosition}px`,
          paddingLeft: `${effectiveLeftPosition}px`,
          position: "relative",
        }}
      >
        {/* Create rows based on rowsPerPage */}
        {Array.from({ length: rowsPerPage }).map((_, rowIdx) => {
          return (
            <div
              key={`row-${rowIdx}`}
              className="flex relative"
              style={{
                marginBottom:
                  rowIdx < rowsPerPage - 1 ? `${effectiveRowSpacing}px` : "0",
                height: `${effectiveHeight}px`,
                position: "relative",
              }}
            >
              {/* Create columns based on columnsPerPage */}
              {Array.from({ length: columnsPerPage }).map((_, colIdx) => {
                const labelIndex = rowIdx * columnsPerPage + colIdx;
                const label = availableRows[labelIndex];

                return (
                  <React.Fragment key={`col-${colIdx}`}>
                    <div
                      className="relative"
                      style={{ width: `${effectiveColumnWidth}px` }}
                    >
                      {label ? (
                        <LabelItem
                          rowData={label.original}
                          width={effectiveColumnWidth}
                          height={effectiveHeight}
                          fontSize={fontSize}
                          selectedFields={selectedFields}
                          align={colIdx % 2 === 0 ? "left" : "right"}
                          userRole={userRole}
                          subscriptionType={subscriptionType}
                        />
                      ) : (
                        <div className="border border-dashed border-gray-300 bg-gray-50 w-full h-full flex items-center justify-center text-gray-400 text-sm">
                          Empty Label
                        </div>
                      )}
                    </div>
                    {/* Add spacing between columns except for the last column */}
                    {colIdx < columnsPerPage - 1 && (
                      <div style={{ width: `${effectiveSpacing}px` }}></div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          );
        })}

        {/* Add guide lines to show page boundaries and spacing */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="w-full h-full border border-dashed border-blue-200 opacity-50" />
          {/* Vertical divider lines */}
          {Array.from({ length: columnsPerPage - 1 }).map((_, idx) => (
            <div
              key={`col-guide-${idx}`}
              className="absolute top-0 bottom-0 border-l border-dashed border-blue-200 opacity-50"
              style={{
                left: `${
                  (effectiveColumnWidth + effectiveSpacing) * (idx + 1) -
                  effectiveSpacing / 2
                }px`,
              }}
            />
          ))}
          {/* Row spacing guides */}
          {Array.from({ length: rowsPerPage - 1 }).map((_, idx) => (
            <div
              key={`row-guide-${idx}`}
              className="absolute left-0 right-0 border-t border-dashed border-blue-200 opacity-50"
              style={{
                top: `${
                  effectiveHeight * (idx + 1) + effectiveRowSpacing * (idx + 1)
                }px`,
                height: `${effectiveRowSpacing}px`,
                background:
                  "repeating-linear-gradient(45deg, rgba(59, 130, 246, 0.03), rgba(59, 130, 246, 0.03) 5px, transparent 5px, transparent 10px)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Page info */}
      <div className="p-2 bg-gray-50 text-gray-600 text-xs border-t border-gray-200 flex justify-between items-center">
        <span>
          Page 1 preview: {Math.min(availableRows.length, labelsPerPage)} of{" "}
          {availableRows.length} labels
          {availableRows.length > labelsPerPage &&
            ` (${Math.ceil(availableRows.length / labelsPerPage)} pages total)`}
        </span>
        <span className="text-blue-600">
          {availableRows.length > labelsPerPage
            ? `Next page starts with label #${labelsPerPage + 1}`
            : "All labels fit on this page"}
        </span>
      </div>
    </div>
  );
};

// Helper component for individual label items
const LabelItem = ({
  rowData,
  width,
  height,
  fontSize,
  selectedFields,
  align,
  userRole,
  subscriptionType,
}) => {
  if (!rowData) return null;

  // Get the appropriate subscription data based on type
  let subscriptionData;
  const rowSubscriptionType = rowData.subscriptionType || subscriptionType;

  switch (rowSubscriptionType) {
    case "Promo":
      subscriptionData = rowData.promoData;
      break;
    case "Complimentary":
      subscriptionData = rowData.compData;
      break;
    default: // WMM
      subscriptionData = rowData.wmmData;
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
    rowSubscriptionType === "Promo" ||
    rowSubscriptionType === "Complimentary";

  // Check for special role and CMC group
  const isSpecialRole = ["HRG", "FOM", "CAL"].some((role) =>
    userRole?.includes(role)
  );
  const group = (rowData.group || "").toUpperCase();
  const isCMCGroup = group === "CMC" || group.includes("CMC");

  // Only add right padding to left column
  const paddingStyle = align === "left" ? { paddingRight: "24px" } : {};

  // Common style for all paragraphs
  const commonParagraphStyle = {
    margin: 0,
    padding: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    lineHeight: "1.2",
    fontSize: `${fontSize}pt`,
    textAlign: "left", // Ensure consistent left alignment
  };

  return (
    <div
      className="address-container-preview border border-gray-300 bg-white flex-shrink-0"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        overflow: "hidden",
        wordWrap: "break-word",
        whiteSpace: "normal",
        padding: "8px",
        ...paddingStyle,
      }}
    >
      <p style={commonParagraphStyle}>
        {rowData.id || ""}
        {!shouldHideExpiryAndCopies &&
          ` - ${enddate} - ${copies}cps/${rowData.acode || ""}`}
        {shouldHideExpiryAndCopies &&
          (isSpecialRole && isCMCGroup
            ? `/${group}/${rowData.acode || ""}`
            : rowData.acode
            ? `/${rowData.acode}`
            : "")}
      </p>
      <p style={commonParagraphStyle}>{getFullName(rowData)}</p>
      <p
        style={{
          ...commonParagraphStyle,
          whiteSpace: "pre-wrap",
        }}
      >
        {(rowData.address || "").split("\n").map((line, i) => (
          <React.Fragment key={i}>
            {line}
            {i < (rowData.address || "").split("\n").length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
      {selectedFields.includes("contactnos") && (
        <p style={commonParagraphStyle}>Cell# {getContactNumber(rowData)}</p>
      )}
    </div>
  );
};

export default LabelPreview;
