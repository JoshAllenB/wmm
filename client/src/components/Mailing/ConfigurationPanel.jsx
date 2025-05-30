import React, { useState, useEffect } from "react";
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
  verticalSpacing,
  setVerticalSpacing,
  selectedFields,
  setSelectedFields,
  templateName,
  setTemplateName,
  showTemplateNameInput,
  setShowTemplateNameInput,
  saveTemplate
}) => {
  // State for input values
  const [inputValues, setInputValues] = useState({
    topPosition,
    leftPosition,
    fontSize,
    columnWidth,
    labelHeight,
    horizontalSpacing,
    verticalSpacing,
  });

  // Update input values when props change
  useEffect(() => {
    setInputValues({
      topPosition,
      leftPosition,
      fontSize,
      columnWidth,
      labelHeight,
      horizontalSpacing,
      verticalSpacing,
    });
  }, [topPosition, leftPosition, fontSize, columnWidth, labelHeight, horizontalSpacing, verticalSpacing]);

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

  // Handle input change
  const handleInputChange = (field, value, setter) => {
    // Allow empty string or valid numbers with optional decimal point
    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setInputValues(prev => ({
        ...prev,
        [field]: value
      }));

      // Only update parent state if it's a valid number
      if (value !== '' && !isNaN(value)) {
        setter(parseFloat(value));
      }
    }
  };

  // Handle blur event to clean up invalid values
  const handleBlur = (field, value, setter) => {
    let finalValue = value;
    
    if (value === '' || isNaN(value)) {
      finalValue = '0';
    } else {
      // Format the number to 2 decimal places if it has more
      const numValue = parseFloat(value);
      finalValue = numValue.toFixed(2);
      // Remove trailing .00 if it's a whole number
      if (finalValue.endsWith('.00')) {
        finalValue = finalValue.split('.')[0];
      }
    }
    
    setInputValues(prev => ({
      ...prev,
      [field]: finalValue
    }));
    setter(parseFloat(finalValue));
  };

  return (
    <div className="flex flex-col p-4 border rounded mb-4 w-full bg-gray-50">
      <h3 className="text-lg font-semibold mb-3">Configuration</h3>
      
      {/* Label Position Settings */}
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">Label Position</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="flex flex-col">
            <label className="text-sm mb-1">Top Margin (mm):</label>
            <input
              type="text"
              value={inputValues.topPosition}
              className="border border-gray-300 rounded p-1 text-center w-full"
              onChange={(e) => handleInputChange('topPosition', e.target.value, setTopPosition)}
              onBlur={(e) => handleBlur('topPosition', e.target.value, setTopPosition)}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm mb-1">Left Margin (mm):</label>
            <input
              type="text"
              value={inputValues.leftPosition}
              className="border border-gray-300 rounded p-1 text-center w-full"
              onChange={(e) => handleInputChange('leftPosition', e.target.value, setLeftPosition)}
              onBlur={(e) => handleBlur('leftPosition', e.target.value, setLeftPosition)}
            />
          </div>
        </div>
      </div>
      
      {/* Layout Settings */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3 w-full">
        <div className="flex flex-col">
          <label className="text-sm mb-1">Font Size (pt):</label>
          <input
            type="text"
            value={inputValues.fontSize}
            className="border border-gray-300 rounded p-1 text-center w-full"
            onChange={(e) => handleInputChange('fontSize', e.target.value, setFontSize)}
            onBlur={(e) => {
              // Special handling for font size - keep as whole numbers
              const value = e.target.value;
              let finalValue = value;
              
              if (value === '' || isNaN(value)) {
                finalValue = '12'; // Default font size
              } else {
                // Round to nearest whole number for font size
                finalValue = Math.round(parseFloat(value)).toString();
              }
              
              setInputValues(prev => ({
                ...prev,
                fontSize: finalValue
              }));
              setFontSize(parseInt(finalValue, 10));
            }}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1">Column Width (mm):</label>
          <input
            type="text"
            value={inputValues.columnWidth}
            className="border border-gray-300 rounded p-1 text-center w-full"
            onChange={(e) => handleInputChange('columnWidth', e.target.value, setColumnWidth)}
            onBlur={(e) => handleBlur('columnWidth', e.target.value, setColumnWidth)}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1">Label Height (mm):</label>
          <input
            type="text"
            value={inputValues.labelHeight}
            className="border border-gray-300 rounded p-1 text-center w-full"
            onChange={(e) => handleInputChange('labelHeight', e.target.value, setLabelHeight)}
            onBlur={(e) => handleBlur('labelHeight', e.target.value, setLabelHeight)}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1">Horizontal Spacing (mm):</label>
          <input
            type="text"
            value={inputValues.horizontalSpacing}
            className="border border-gray-300 rounded p-1 text-center w-full"
            onChange={(e) => handleInputChange('horizontalSpacing', e.target.value, setHorizontalSpacing)}
            onBlur={(e) => handleBlur('horizontalSpacing', e.target.value, setHorizontalSpacing)}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1">Vertical Spacing (mm):</label>
          <input
            type="text"
            value={inputValues.verticalSpacing}
            className="border border-gray-300 rounded p-1 text-center w-full"
            onChange={(e) => handleInputChange('verticalSpacing', e.target.value, setVerticalSpacing)}
            onBlur={(e) => handleBlur('verticalSpacing', e.target.value, setVerticalSpacing)}
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