import React from "react";

const TemplateSelector = ({ 
  selectedTemplate, 
  savedTemplates, 
  isLoading, 
  onTemplateSelect 
}) => {
  return (
    <div className="flex flex-col mb-4">
      <div className="flex justify-start items-center mb-2">
        <label className="mr-2 font-medium">Template:</label>
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-600">
            <div className="animate-spin h-4 w-4 border-2 border-gray-500 rounded-full border-t-transparent"></div>
            <span>Loading templates...</span>
          </div>
        ) : (
          <select
            onChange={(e) => onTemplateSelect(e.target.value)}
            value={selectedTemplate?.name || ""}
            className="border border-gray-300 rounded p-1 flex-grow"
            disabled={savedTemplates.length === 0}
          >
            {savedTemplates.length === 0 ? (
              <option value="" disabled>
                No templates available
              </option>
            ) : (
              <>
                <option value="" disabled>
                  Select a template...
                </option>
                {/* Group regular templates */}
                {(() => {
                  const regularTemplates = savedTemplates.filter(template => !template.isLegacy);
                  return regularTemplates.length > 0 ? (
                    <optgroup label="Modern Templates">
                      {regularTemplates.map((template) => (
                        <option key={template.name} value={template.name}>
                          {template.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : null;
                })()}
                
                {/* Group legacy templates with more details */}
                {(() => {
                  // Filter legacy templates
                  const legacyTemplates = savedTemplates.filter(template => template.isLegacy);
                  
                  // Further filter to only show templates matching the role
                  // For WMM role, only show WMM type templates
                  const roleFilteredTemplates = legacyTemplates.filter(template => {
                    // If type is WMM, then we're showing a WMM template
                    return template.type === "WMM";
                  });
                  
                  const templatesToShow = roleFilteredTemplates.length > 0 ? roleFilteredTemplates : legacyTemplates;
                  
                  return templatesToShow.length > 0 ? (
                    <optgroup label="Legacy Dot Matrix Templates">
                      {templatesToShow.map((template) => (
                        <option key={template.name} value={template.name}>
                          {template.name}  
                        </option>
                      ))}
                    </optgroup>
                  ) : null;
                })()}
              </>
            )}
          </select>
        )}
      </div>
      
      {/* Display legacy template indicator when relevant */}
      {selectedTemplate?.isLegacy && (
        <div className="bg-amber-100 border border-amber-300 text-amber-800 px-3 py-2 rounded text-sm mb-2">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Legacy Format:</span>
          </div>
          <p className="mt-1 text-xs">
            {selectedTemplate.type === "WMM" ? 
              <strong className="text-green-700">WMM Magazine Format</strong> : 
              <span>Type: {selectedTemplate.type || "LEGACY"}</span>
            }
            <br />
            Optimized for {selectedTemplate.printer || "dot matrix printer"}.
            <br />
            Layout: {selectedTemplate.layout.width}x{selectedTemplate.layout.height} ({selectedTemplate.layout.columns} columns)
            <br />
            {selectedTemplate.selectedFields.includes("contactnos") ? 
              <span className="text-blue-700">Includes contact numbers</span> : 
              "No contact numbers" 
            }
          </p>
          
          {/* Debug Template Data Section */}
          <div className="mt-2 pt-2 border-t border-amber-200">
            <details className="text-xs">
              <summary className="cursor-pointer font-medium">Template Data Details</summary>
              <div className="mt-2 p-2 bg-amber-50 rounded font-mono text-xs overflow-x-auto">
                <div className="grid grid-cols-2 gap-1">
                  <div className="font-bold">ID:</div>
                  <div>{selectedTemplate.id}</div>
                  
                  <div className="font-bold">Description:</div>
                  <div>{selectedTemplate.description}</div>
                  
                  <div className="font-bold">Type:</div>
                  <div>{selectedTemplate.type}</div>
                  
                  <div className="font-bold">Printer:</div>
                  <div>{selectedTemplate.printer}</div>
                </div>
                
                <div className="mt-2 mb-1 font-bold">Format Command Sample:</div>
                <pre className="bg-white p-1 rounded border border-amber-200 text-[10px] max-h-20 overflow-y-auto whitespace-pre-wrap">
                  {selectedTemplate.format?.substring(0, 200) || "None"}
                  {selectedTemplate.format?.length > 200 ? "..." : ""}
                </pre>
                
                <div className="mt-2 mb-1 font-bold">Init Command:</div>
                <pre className="bg-white p-1 rounded border border-amber-200 text-[10px] max-h-12 overflow-y-auto">
                  {selectedTemplate.init || "None"}
                </pre>
                
                <div className="mt-2 mb-1 font-bold">Reset Command:</div>
                <pre className="bg-white p-1 rounded border border-amber-200 text-[10px] max-h-12 overflow-y-auto">
                  {selectedTemplate.reset || "None"}
                </pre>
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateSelector; 