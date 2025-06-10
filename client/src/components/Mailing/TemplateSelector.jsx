import React from "react";

const TemplateSelector = ({ 
  selectedTemplate, 
  savedTemplates, 
  isLoading, 
  onTemplateSelect,
  userRole
}) => {
  // Function to check if template type matches user role
  const isTemplateAllowed = (templateType) => {
    if (!templateType || !userRole) return false;
    const type = templateType.toUpperCase();
    const roles = userRole.toUpperCase().split(' ');
    if (roles.includes('ADMIN')) return true;
    return roles.some(role => {
      switch(role) {
        case 'WMM': return type === 'WMM';
        case 'HRG': return type === 'HRG';
        case 'FOM': return type === 'FOM';
        case 'CAL': return type === 'CAL';
        case 'COMP': return type === 'COMP';
        case 'PROMO': return type === 'PROMO';
        default: return false;
      }
    });
  };

  // Filter templates based on user role
  const filteredTemplates = React.useMemo(() => {
    return savedTemplates.filter(template => {
      if (!template.isLegacy) return true;
      return isTemplateAllowed(template.type);
    });
  }, [savedTemplates, userRole]);

  return (
    <div className="bg-gray-100 rounded-lg p-4">
      <h3 className="font-medium text-sm mb-3">Template Selection</h3>
      <p className="text-xs text-gray-600 mb-3">
        Choose a template for your mailing labels. Legacy templates are grouped by type.
      </p>

      <div className="space-y-3">
        {/* Template Selector Dropdown */}
        <div className="w-full">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-white p-2 rounded border">
              <div className="animate-spin h-4 w-4 border-2 border-gray-500 rounded-full border-t-transparent"></div>
              <span>Loading templates...</span>
            </div>
          ) : (
            <select
              onChange={(e) => onTemplateSelect(e.target.value)}
              value={selectedTemplate?.name || ""}
              className="w-full px-2 py-1.5 text-sm border rounded bg-white"
              disabled={filteredTemplates.length === 0}
            >
              {filteredTemplates.length === 0 ? (
                <option value="" disabled>
                  No templates available for {userRole || 'current user'}
                </option>
              ) : (
                <>
                  <option value="" disabled>Select a template...</option>
                  {/* Group regular templates */}
                  {(() => {
                    const regularTemplates = filteredTemplates.filter(template => !template.isLegacy);
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
                  
                  {/* Group legacy templates by type */}
                  {(() => {
                    const legacyTemplates = filteredTemplates.filter(template => template.isLegacy);
                    const templatesByType = legacyTemplates.reduce((acc, template) => {
                      const type = template.type || "Other";
                      if (!acc[type]) acc[type] = [];
                      acc[type].push(template);
                      return acc;
                    }, {});
                    
                    const sortedTypes = Object.keys(templatesByType).sort((a, b) => {
                      if (a === "Other") return 1;
                      if (b === "Other") return -1;
                      return a.localeCompare(b);
                    });
                    
                    return sortedTypes.map(type => (
                      <optgroup key={type} label={`${type} Templates`}>
                        {templatesByType[type]
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((template) => (
                            <option key={template.name} value={template.name}>
                              {template.name}
                            </option>
                          ))}
                      </optgroup>
                    ));
                  })()}
                </>
              )}
            </select>
          )}
        </div>

        {/* Template Info Panel */}
        {selectedTemplate?.isLegacy && (
          <div className="bg-white border border-gray-200 rounded p-3 text-sm space-y-2">
            <div className="flex items-center gap-1.5 text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Legacy Format Details</span>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="text-gray-600">Type:</div>
              <div>{selectedTemplate.type || "LEGACY"}</div>
              
              <div className="text-gray-600">Printer:</div>
              <div>{selectedTemplate.printer || "Dot matrix printer"}</div>
              
              <div className="text-gray-600">Layout:</div>
              <div>{selectedTemplate.layout.width}x{selectedTemplate.layout.height} ({selectedTemplate.layout.columns} columns)</div>
              
              <div className="text-gray-600">Contact Numbers:</div>
              <div>{selectedTemplate.selectedFields.includes("contactnos") ? "Included" : "Not included"}</div>
            </div>

            {/* Technical Details Collapsible */}
            <details className="text-xs pt-2 border-t border-gray-100">
              <summary className="cursor-pointer font-medium text-blue-600 hover:text-blue-700">
                Technical Details
              </summary>
              <div className="mt-2 space-y-2">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div className="font-medium">Template ID:</div>
                  <div className="font-mono">{selectedTemplate.id}</div>
                </div>
                
                <div>
                  <div className="font-medium mb-1">Format Command:</div>
                  <pre className="bg-gray-50 p-1.5 rounded border text-[10px] max-h-20 overflow-y-auto whitespace-pre-wrap">
                    {selectedTemplate.format?.substring(0, 200) || "None"}
                    {selectedTemplate.format?.length > 200 ? "..." : ""}
                  </pre>
                </div>
                
                <div>
                  <div className="font-medium mb-1">Init Command:</div>
                  <pre className="bg-gray-50 p-1.5 rounded border text-[10px] max-h-12 overflow-y-auto">
                    {selectedTemplate.init || "None"}
                  </pre>
                </div>
                
                <div>
                  <div className="font-medium mb-1">Reset Command:</div>
                  <pre className="bg-gray-50 p-1.5 rounded border text-[10px] max-h-12 overflow-y-auto">
                    {selectedTemplate.reset || "None"}
                  </pre>
                </div>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateSelector; 