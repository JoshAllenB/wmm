import React from "react";

const TemplateSelector = ({
  selectedTemplate,
  savedTemplates,
  isLoading,
  onTemplateSelect,
  userRole,
  onTemplateUpdate,
  onTemplateDelete,
}) => {
  // Filter templates based on user department(s)
  const filteredTemplates = React.useMemo(() => {
    if (!userRole) return Array.isArray(savedTemplates) ? savedTemplates : [];

    const roleString = Array.isArray(userRole) ? userRole.join(" ") : userRole;
    const upper = String(roleString || "").toUpperCase();

    // Admin can see all templates
    if (upper.includes("ADMIN")) return savedTemplates;

    // Extract possible departments from a combined role string
    // Accept separators by space, comma, slash, or pipe
    let departments;
    if (Array.isArray(userRole)) {
      const tokens = [];
      for (const raw of userRole) {
        const part = String(raw || "").toUpperCase();
        for (const token of part.split(/[\s,\/|]+/)) {
          const trimmed = token.trim();
          if (trimmed) tokens.push(trimmed);
        }
      }
      departments = tokens;
    } else {
      departments = upper
        .split(/[\s,\/|]+/)
        .map((r) => r.trim())
        .filter(Boolean);
    }

    if (departments.length === 0) return [];

    const deptSet = new Set(departments);

    const templates = Array.isArray(savedTemplates) ? savedTemplates : [];

    return templates.filter((template) => {
      const templateDeptUpper = String(
        template?.department ?? template?.departmentCode ?? ""
      )
        .trim()
        .toUpperCase();
      return templateDeptUpper && deptSet.has(templateDeptUpper);
    });
  }, [savedTemplates, userRole]);

  return (
    <div className="bg-gray-100 rounded-lg p-4">
      <h3 className="font-medium text-sm mb-3">Template Selection</h3>
      <p className="text-xs text-gray-600 mb-3">
        Choose a template for your mailing labels. Templates are filtered by
        your department{Array.isArray(userRole) ? "s" : ""} (
        {Array.isArray(userRole) ? userRole.join(", ") : String(userRole || "")}{" "}
        ).
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
                  No templates available for{" "}
                  {Array.isArray(userRole)
                    ? userRole.join(", ")
                    : userRole || "current user"}
                </option>
              ) : (
                <>
                  <option value="" disabled>
                    Select a template...
                  </option>
                  {filteredTemplates
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((template) => (
                      <option
                        key={template._id || template.name}
                        value={template.name}
                      >
                        {template.name}
                        {template.description && ` - ${template.description}`}
                      </option>
                    ))}
                </>
              )}
            </select>
          )}
        </div>

        {/* Template Info Panel */}
        {selectedTemplate && (
          <div className="bg-white border border-gray-200 rounded p-3 text-sm space-y-2">
            <div className="flex items-center gap-1.5 text-gray-700">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-medium">Template Details</span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="text-gray-600">Department:</div>
              <div>{selectedTemplate.department || "Unknown"}</div>

              <div className="text-gray-600">Created:</div>
              <div>
                {selectedTemplate.createdAt
                  ? new Date(selectedTemplate.createdAt).toLocaleDateString()
                  : "Unknown"}
              </div>

              <div className="text-gray-600">Font Size:</div>
              <div>{selectedTemplate.layout?.fontSize || 12}pt</div>

              <div className="text-gray-600">Paper Size:</div>
              <div>
                {selectedTemplate.layout?.paperWidth || 215.9}mm ×{" "}
                {selectedTemplate.layout?.paperHeight || 279.4}mm
              </div>

              <div className="text-gray-600">Layout:</div>
              <div>
                {selectedTemplate.layout?.rowsPerPage || 3} rows ×{" "}
                {selectedTemplate.layout?.columnsPerPage || 2} columns
              </div>

              <div className="text-gray-600">Selected Fields:</div>
              <div>
                {selectedTemplate.selectedFields?.length > 0
                  ? selectedTemplate.selectedFields.join(", ")
                  : "None"}
              </div>
            </div>

            {/* Description */}
            {selectedTemplate.description && (
              <div className="pt-2 border-t border-gray-100">
                <div className="text-gray-600 font-medium mb-1">
                  Description:
                </div>
                <div className="text-xs text-gray-700">
                  {selectedTemplate.description}
                </div>
              </div>
            )}

            {/* Technical Details Collapsible */}
            <details className="text-xs pt-2 border-t border-gray-100">
              <summary className="cursor-pointer font-medium text-blue-600 hover:text-blue-700">
                Technical Details
              </summary>
              <div className="mt-2 space-y-2">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div className="font-medium">Template ID:</div>
                  <div className="font-mono">
                    {selectedTemplate._id || "N/A"}
                  </div>

                  <div className="font-medium">Label Width:</div>
                  <div>{selectedTemplate.layout?.labelWidthIn || 3.5}"</div>

                  <div className="font-medium">Top Margin:</div>
                  <div>{selectedTemplate.layout?.topMargin ?? 4} lines</div>

                  <div className="font-medium">Row Spacing:</div>
                  <div>
                    {selectedTemplate.layout?.rowSpacingLines || 14} lines
                  </div>

                  <div className="font-medium">Column 2 Position:</div>
                  <div>{selectedTemplate.layout?.col2X || 255} dots</div>

                  {selectedTemplate.selectedPrinter && (
                    <>
                      <div className="font-medium">Printer (will be used):</div>
                      <div className="text-blue-600 font-medium">
                        {selectedTemplate.selectedPrinter}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </details>

            {/* Template Management Actions */}
            {selectedTemplate && selectedTemplate._id !== "DEFAULT" && (
              <div className="pt-2 border-t border-gray-100">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (onTemplateUpdate) {
                        onTemplateUpdate(selectedTemplate);
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Update Template
                  </button>
                  <button
                    onClick={() => {
                      if (onTemplateDelete) {
                        onTemplateDelete(selectedTemplate);
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    Delete Template
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateSelector;
