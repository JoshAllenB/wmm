import React from "react";

const TemplateSelector = ({ 
  selectedTemplate, 
  savedTemplates, 
  isLoading, 
  onTemplateSelect,
  userRole // Add userRole prop
}) => {
  // Function to check if template type matches user role
  const isTemplateAllowed = (templateType) => {
    if (!templateType || !userRole) return false;
    
    // Convert template type to uppercase for case-insensitive comparison
    const type = templateType.toUpperCase();
    
    // Split user roles and convert to uppercase
    const roles = userRole.toUpperCase().split(' ');
    
    // If user has ADMIN role, they can see all templates
    if (roles.includes('ADMIN')) return true;
    
    // Check if template type matches any of the user's roles
    return roles.some(role => {
      switch(role) {
        case 'WMM':
          return type === 'WMM';
        case 'HRG':
          return type === 'HRG';
        case 'FOM':
          return type === 'FOM';
        case 'CAL':
          return type === 'CAL';
        case 'COMP':
          return type === 'COMP';
        case 'PROMO':
          return type === 'PROMO';
        default:
          return false;
      }
    });
  };

  // Add console logging for debugging
  React.useEffect(() => {
    console.group('Template Selector Debug');
    console.log('Total templates received:', savedTemplates.length);
    console.log('User Role:', userRole);
    
    if (savedTemplates.length > 0) {
      // Log all templates basic info
      console.log('All templates basic info:', savedTemplates.map(t => ({
        id: t.id,
        name: t.name,
        type: t.type,
        isLegacy: t.isLegacy,
        allowed: isTemplateAllowed(t.type)
      })));
      
      const legacyTemplates = savedTemplates.filter(template => template.isLegacy);
      console.log('Legacy templates count:', legacyTemplates.length);
      
      // Group by type for better visibility
      const typeGroups = legacyTemplates.reduce((acc, template) => {
        const type = template.type || "Other";
        if (!acc[type]) acc[type] = [];
        acc[type].push({
          id: template.id,
          name: template.name,
          description: template.description,
          allowed: isTemplateAllowed(type)
        });
        return acc;
      }, {});
      
      console.log('Templates grouped by type:', typeGroups);
      
      // Check for potential issues
      const templatesWithoutType = legacyTemplates.filter(t => !t.type);
      if (templatesWithoutType.length > 0) {
        console.warn('Templates without type:', templatesWithoutType);
      }
    }
    console.groupEnd();
  }, [savedTemplates, userRole]);

  // Filter templates based on user role
  const filteredTemplates = React.useMemo(() => {
    return savedTemplates.filter(template => {
      if (!template.isLegacy) return true; // Always show modern templates
      return isTemplateAllowed(template.type);
    });
  }, [savedTemplates, userRole]);

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
            disabled={filteredTemplates.length === 0}
          >
            {filteredTemplates.length === 0 ? (
              <option value="" disabled>
                No templates available for {userRole || 'current user'}
              </option>
            ) : (
              <>
                <option value="" disabled>
                  Select a template...
                </option>
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
                  // Filter legacy templates
                  const legacyTemplates = filteredTemplates.filter(template => template.isLegacy);
                  
                  // Group templates by type
                  const templatesByType = legacyTemplates.reduce((acc, template) => {
                    const type = template.type || "Other";
                    if (!acc[type]) acc[type] = [];
                    acc[type].push(template);
                    return acc;
                  }, {});
                  
                  // Sort types alphabetically, but ensure "Other" is last if it exists
                  const sortedTypes = Object.keys(templatesByType).sort((a, b) => {
                    if (a === "Other") return 1;
                    if (b === "Other") return -1;
                    return a.localeCompare(b);
                  });
                  
                  // Render each type group
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
            <span>Type: {selectedTemplate.type || "LEGACY"}</span>
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