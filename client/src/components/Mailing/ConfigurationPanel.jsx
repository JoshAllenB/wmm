import React from "react";
import { Button } from "../UI/ShadCN/button";

const ConfigurationPanel = ({ 
  fontSize,
  setFontSize,
  columnWidth,
  setColumnWidth,
  leftPosition,
  setLeftPosition,
  topPosition,
  setTopPosition,
  labelHeight,
  setLabelHeight,
  horizontalSpacing,
  setHorizontalSpacing,
  selectedFields,
  setSelectedFields,
  templateName,
  setTemplateName,
  showTemplateNameInput,
  setShowTemplateNameInput,
  saveTemplate
}) => {
  const fields = [{ label: "Contact Numbers", value: "contactnos" }];

  const handleFieldChange = (field) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const handleSaveClick = () => {
    setShowTemplateNameInput(true);
  };

  const handleTemplateNameChange = (event) => {
    setTemplateName(event.target.value);
  };

  return (
    <div className="flex flex-col p-4 border rounded mb-4 w-full bg-gray-50">
      <h3 className="text-lg font-semibold mb-3">Configuration</h3>
      
      {/* Layout Settings */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3 w-full">
        <div className="flex flex-col">
          <label className="text-sm mb-1">Font Size:</label>
          <input
            type="number"
            value={fontSize}
            className="border border-gray-300 rounded p-1 text-center w-full"
            onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1">Column Width (px):</label>
          <input
            type="number"
            value={columnWidth}
            className="border border-gray-300 rounded p-1 text-center w-full"
            onChange={(e) => setColumnWidth(parseInt(e.target.value, 10))}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1">Left Position (px):</label>
          <input
            type="number"
            value={leftPosition}
            className="border border-gray-300 rounded p-1 text-center w-full"
            onChange={(e) => setLeftPosition(parseInt(e.target.value, 10))}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1">Top Position (px):</label>
          <input
            type="number"
            value={topPosition}
            className="border border-gray-300 rounded p-1 text-center w-full"
            onChange={(e) => setTopPosition(parseInt(e.target.value, 10))}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1">
            Label Height (Vertical Space):
          </label>
          <input
            type="number"
            value={labelHeight}
            className="border border-gray-300 rounded p-1 text-center w-full"
            onChange={(e) => setLabelHeight(parseInt(e.target.value, 10) || 100)}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1">Horizontal Spacing:</label>
          <input
            type="number"
            value={horizontalSpacing}
            className="border border-gray-300 rounded p-1 text-center w-full"
            onChange={(e) => setHorizontalSpacing(parseInt(e.target.value, 10) || 20)}
          />
        </div>
      </div>
      
      {/* Field Selection */}
      <div className="flex gap-4 justify-center mb-4 w-full">
        {fields.map((field) => (
          <div
            key={field.value}
            className="flex items-center gap-1 text-black text-base"
          >
            <input
              type="checkbox"
              id={`field-${field.value}`}
              checked={selectedFields.includes(field.value)}
              onChange={() => handleFieldChange(field.value)}
              className="text-black border-gray-300 h-4 w-4"
            />
            <label htmlFor={`field-${field.value}`}>
              {field.label}
            </label>
          </div>
        ))}
      </div>
      
      {/* Template Saving */}
      <div className="w-full">
        <Button
          onClick={handleSaveClick}
          variant="secondary"
          className="w-full mb-2"
        >
          Save Current Settings as Template
        </Button>
        {showTemplateNameInput && (
          <div className="flex flex-col items-center mt-1">
            <input
              type="text"
              value={templateName}
              onChange={handleTemplateNameChange}
              placeholder="Enter template name"
              className="border border-gray-300 rounded p-1 text-center mb-1 w-full"
            />
            <Button onClick={saveTemplate} className="w-full">
              Confirm Save
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigurationPanel; 