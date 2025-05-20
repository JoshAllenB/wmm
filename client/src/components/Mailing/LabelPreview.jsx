import React from "react";

// Helper functions
const getFullName = (row) => {
  const title = row.title ? `${row.title} ` : "";
  return [title, row.fname, row.mname, row.lname].filter(Boolean).join(" ");
};

const getContactNumber = (row) => {
  return row.contactnos || row.cellno || row.ofcno || "";
};

const formatDateLegacy = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "N/A";
  
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(2);
  return `${month}/${day}/${year}`;
};

const formatIdLegacy = (id) => {
  if (!id) return "";
  return id.toString().padStart(6, '0');
};

const LabelPreview = ({ 
  isLoading, 
  selectedTemplate, 
  hasAvailableRows, 
  availableRows,
  useLegacyFormat,
  fontSize,
  columnWidth,
  horizontalSpacing,
  labelHeight,
  selectedFields,
  startPosition,
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
        <p className="text-sm text-gray-500">Select rows and a template to see a preview</p>
      </div>
    );
  }

  if (useLegacyFormat && selectedTemplate?.isLegacy) {
    // Legacy template preview 
    // Use real data from available rows if possible
    const previewRow = availableRows.length > 0 ? availableRows[0].original : null;
    const wmmData = previewRow?.wmmData;
    const subscription = wmmData?.records?.[0] || wmmData || {};
    const displayCopies = previewRow ? (subscription.copies || "1") : "1";
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
    const displayName = previewRow ? 
      getFullName(previewRow) : 
      getFullName({title: "", fname: "John", lname: "Doe", mname: ""});
    
    // Get proper address
    const displayAddress = previewRow?.address || "123 Main Street, Anytown, USA";
    
    // Get proper contact number if needed
    const displayContact = previewRow ? 
      getContactNumber(previewRow) : 
      "555-123-4567";
    
    return (
      <div
        className="mailing-label-preview border border-dashed border-gray-400 relative bg-white shadow-md overflow-hidden font-mono h-full"
        style={{
          width: `${Math.max(selectedTemplate.layout.width * 8, 200)}px`,
          margin: '0 auto',
          padding: '10px',
          fontSize: `${fontSize}px`
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
            {Array(Math.ceil(selectedTemplate.layout.width / 5)).fill().map((_, i) => (
              <div key={i} className="w-1 h-1 bg-gray-300 rounded-full"></div>
            ))}
          </div>
        </div>
        
        {/* Sample content */}
        <div className="mt-6 pt-2 relative">
          {/* Guidelines */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="h-full w-full border border-dashed border-gray-200" style={{
              backgroundImage: 'linear-gradient(to right, rgba(220,220,220,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(220,220,220,0.2) 1px, transparent 1px)',
              backgroundSize: '10px 12px'
            }}></div>
          </div>
          
          <pre className="relative z-10 p-2 text-sm overflow-hidden leading-tight font-mono text-gray-800">
            {`${displayId}-S-${displayExpDate}-${displayCopies}cps/${displayAcode}
${displayName}
${displayAddress}
${selectedTemplate.selectedFields.includes("contactnos") ? `Cell# ${displayContact}` : ""}`}
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

  // Modern template preview - Two-column layout that fills the container
  // Calculate dimensions in pixels (assuming 96dpi for screen)
  const labelWidthInPixels = 4.25 * 96; // 4.25 inches at 96dpi = 408px
  const labelHeightInPixels = 3.5 * 96; // 3.5 inches at 96dpi = 336px
  const gapInPixels = 1 * 96; // 1 inch gap = 96px
  
  // Use these dimensions as defaults if not provided in props
  const effectiveColumnWidth = columnWidth || labelWidthInPixels;
  const effectiveHeight = labelHeight || labelHeightInPixels;
  const effectiveSpacing = horizontalSpacing || gapInPixels;
  
  return (
    <div 
      className="mailing-label-preview flex flex-col h-full w-full border border-dashed border-gray-400 relative bg-white shadow-md overflow-auto"
      style={{
        width: `${Math.max(effectiveColumnWidth * 2 + effectiveSpacing, 200)}px`,
        margin: '0 auto',
      }}
    >
      <div className="p-2 bg-gray-100 text-gray-700 text-xs">
        Real-time preview of how labels will print
        <div className="text-gray-500">
          Label size: 4.25" × 3.5" (approx {effectiveColumnWidth}px × {effectiveHeight}px)
        </div>
      </div>

      <div className="flex-grow overflow-auto relative">
        {/* Create rows of labels with 2 columns */}
        {Array.from({ length: Math.ceil(availableRows.length / 2) }).map((_, rowIdx) => (
          <div key={`row-${rowIdx}`} className="flex relative">
            {/* Left column */}
            {availableRows[rowIdx * 2] && (
              <LabelItem 
                rowData={availableRows[rowIdx * 2].original}
                width={effectiveColumnWidth}
                height={effectiveHeight}
                fontSize={fontSize}
                selectedFields={selectedFields}
                align="left"
              />
            )}
            
            {/* Gap */}
            <div style={{ width: `${effectiveSpacing}px` }}></div>
            
            {/* Right column */}
            {availableRows[rowIdx * 2 + 1] && (
              <LabelItem 
                rowData={availableRows[rowIdx * 2 + 1].original}
                width={effectiveColumnWidth}
                height={effectiveHeight}
                fontSize={fontSize}
                selectedFields={selectedFields}
                align="right"
              />
            )}
          </div>
        ))}
      </div>
      
      {/* Page info */}
      <div className="p-2 bg-gray-50 text-gray-600 text-xs border-t border-gray-200 flex justify-between">
        <span>Showing {Math.min(availableRows.length, 8)} of {availableRows.length} labels</span>
        <span>2 columns × {Math.ceil(Math.min(availableRows.length, 8) / 2)} rows</span>
      </div>
    </div>
  );
};

// Helper component for individual label items
const LabelItem = ({ rowData, width, height, fontSize, selectedFields }) => {
  if (!rowData) return null;
  
  const wmmData = rowData.wmmData;
  let subscription = wmmData?.records?.[0] || wmmData || {};
  const copies = subscription.copies ?? "N/A";
  let enddate = "N/A";
  if (subscription.enddate) {
    const date = new Date(subscription.enddate);
    if (!isNaN(date.getTime())) {
      enddate = date.toLocaleDateString();
    }
  }
  
  return (
    <div
      className="address-container-preview border border-gray-300 bg-white flex-shrink-0"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        fontSize: `${fontSize}px`,
        overflow: "hidden",
        wordWrap: "break-word",
        whiteSpace: "normal",
      }}
    >
      <p className="m-0 p-0 text-xs overflow-hidden text-ellipsis">
        {rowData.id || ""} - {enddate} - {copies}cps/{rowData.acode || ""}
      </p>
      <p className="m-0 p-0 overflow-hidden text-ellipsis font-bold">
        {getFullName(rowData)}
      </p>
      <p className="m-0 p-0 overflow-hidden text-ellipsis">
        {rowData.address || ""}
      </p>
      {selectedFields.includes("contactnos") && (
        <p className="m-0 p-0 overflow-hidden text-ellipsis">
          Cell# {getContactNumber(rowData)}
        </p>
      )}
    </div>
  );
};

export default LabelPreview;