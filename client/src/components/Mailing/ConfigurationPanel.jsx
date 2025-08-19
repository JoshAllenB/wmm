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
  rowSpacing,
  setRowSpacing,
  selectedFields,
  setSelectedFields,
  paperWidth,
  setPaperWidth,
  paperHeight,
  setPaperHeight,
  rowsPerPage,
  setRowsPerPage,
  columnsPerPage,
  setColumnsPerPage,
}) => {
  // State for input values
  const [inputValues, setInputValues] = useState({
    topPosition,
    leftPosition,
    fontSize,
    columnWidth,
    labelHeight,
    horizontalSpacing,
    rowSpacing,
    paperWidth,
    paperHeight,
    rowsPerPage,
    columnsPerPage,
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
      rowSpacing,
      paperWidth,
      paperHeight,
      rowsPerPage,
      columnsPerPage,
    });
  }, [
    topPosition,
    leftPosition,
    fontSize,
    columnWidth,
    labelHeight,
    horizontalSpacing,
    rowSpacing,
    paperWidth,
    paperHeight,
    rowsPerPage,
    columnsPerPage,
  ]);

  const fields = [{ label: "Contact Numbers", value: "contactnos" }];

  const handleFieldChange = (field) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  // Handle input change
  const handleInputChange = (field, value, setter) => {
    // Allow empty string or valid numbers with optional decimal point
    if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setInputValues((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Only update parent state if it's a valid number
      if (value !== "" && !isNaN(value)) {
        setter(parseFloat(value));
      }
    }
  };

  // Handle blur event to clean up invalid values
  const handleBlur = (field, value, setter) => {
    let finalValue = value;

    if (value === "" || isNaN(value)) {
      finalValue = "0";
    } else {
      // Format the number to 2 decimal places if it has more
      const numValue = parseFloat(value);
      finalValue = numValue.toFixed(2);
      // Remove trailing .00 if it's a whole number
      if (finalValue.endsWith(".00")) {
        finalValue = finalValue.split(".")[0];
      }
    }

    setInputValues((prev) => ({
      ...prev,
      [field]: finalValue,
    }));
    setter(parseFloat(finalValue));
  };

  return (
    <div className="flex flex-col p-4 border rounded mb-4 w-full bg-gray-50">
      <h3 className="text-lg font-semibold mb-3">Configuration</h3>

      {/* Paper Size Settings */}
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">Paper Size</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="flex flex-col">
            <label className="text-sm mb-1">Paper Width (mm):</label>
            <input
              type="text"
              value={inputValues.paperWidth}
              className="border border-gray-300 rounded p-1 text-center w-full"
              onChange={(e) =>
                handleInputChange("paperWidth", e.target.value, setPaperWidth)
              }
              onBlur={(e) =>
                handleBlur("paperWidth", e.target.value, setPaperWidth)
              }
            />
            <span className="text-xs text-gray-500 mt-1">
              ({(inputValues.paperWidth / 25.4).toFixed(1)}")
            </span>
          </div>
          <div className="flex flex-col">
            <label className="text-sm mb-1">Paper Height (mm):</label>
            <input
              type="text"
              value={inputValues.paperHeight}
              className="border border-gray-300 rounded p-1 text-center w-full"
              onChange={(e) =>
                handleInputChange("paperHeight", e.target.value, setPaperHeight)
              }
              onBlur={(e) =>
                handleBlur("paperHeight", e.target.value, setPaperHeight)
              }
            />
            <span className="text-xs text-gray-500 mt-1">
              ({(inputValues.paperHeight / 25.4).toFixed(1)}")
            </span>
          </div>
        </div>
      </div>

      {/* Page Layout Settings */}
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">Page Layout</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="flex flex-col">
            <label className="text-sm mb-1">Rows per Page:</label>
            <input
              type="number"
              min="1"
              max="10"
              value={inputValues.rowsPerPage}
              className="border border-gray-300 rounded p-1 text-center w-full"
              onChange={(e) => {
                const value = Math.max(
                  1,
                  Math.min(10, parseInt(e.target.value) || 1)
                );
                handleInputChange("rowsPerPage", value, setRowsPerPage);
              }}
              onBlur={(e) => {
                const value = Math.max(
                  1,
                  Math.min(10, parseInt(e.target.value) || 1)
                );
                handleBlur("rowsPerPage", value, setRowsPerPage);
              }}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm mb-1">Columns per Page:</label>
            <input
              type="number"
              min="1"
              max="4"
              value={inputValues.columnsPerPage}
              className="border border-gray-300 rounded p-1 text-center w-full"
              onChange={(e) => {
                const value = Math.max(
                  1,
                  Math.min(4, parseInt(e.target.value) || 1)
                );
                handleInputChange("columnsPerPage", value, setColumnsPerPage);
              }}
              onBlur={(e) => {
                const value = Math.max(
                  1,
                  Math.min(4, parseInt(e.target.value) || 1)
                );
                handleBlur("columnsPerPage", value, setColumnsPerPage);
              }}
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Labels per page:{" "}
          {inputValues.rowsPerPage * inputValues.columnsPerPage}
        </p>
      </div>

      {/* Label Position Settings */}
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">Initial Position</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="flex flex-col">
            <label className="text-sm mb-1">Initial Top Margin (mm):</label>
            <input
              type="text"
              value={inputValues.topPosition}
              className="border border-gray-300 rounded p-1 text-center w-full"
              onChange={(e) =>
                handleInputChange("topPosition", e.target.value, setTopPosition)
              }
              onBlur={(e) =>
                handleBlur("topPosition", e.target.value, setTopPosition)
              }
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm mb-1">Left Margin (mm):</label>
            <input
              type="text"
              value={inputValues.leftPosition}
              className="border border-gray-300 rounded p-1 text-center w-full"
              onChange={(e) =>
                handleInputChange(
                  "leftPosition",
                  e.target.value,
                  setLeftPosition
                )
              }
              onBlur={(e) =>
                handleBlur("leftPosition", e.target.value, setLeftPosition)
              }
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
            onChange={(e) =>
              handleInputChange("fontSize", e.target.value, setFontSize)
            }
            onBlur={(e) => {
              // Special handling for font size - keep as whole numbers
              const value = e.target.value;
              let finalValue = value;

              if (value === "" || isNaN(value)) {
                finalValue = "12"; // Default font size
              } else {
                // Round to nearest whole number for font size
                finalValue = Math.round(parseFloat(value)).toString();
              }

              setInputValues((prev) => ({
                ...prev,
                fontSize: finalValue,
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
            onChange={(e) =>
              handleInputChange("columnWidth", e.target.value, setColumnWidth)
            }
            onBlur={(e) =>
              handleBlur("columnWidth", e.target.value, setColumnWidth)
            }
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1">Label Height (mm):</label>
          <input
            type="text"
            value={inputValues.labelHeight}
            className="border border-gray-300 rounded p-1 text-center w-full"
            onChange={(e) =>
              handleInputChange("labelHeight", e.target.value, setLabelHeight)
            }
            onBlur={(e) =>
              handleBlur("labelHeight", e.target.value, setLabelHeight)
            }
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1">Horizontal Spacing (mm):</label>
          <input
            type="text"
            value={inputValues.horizontalSpacing}
            className="border border-gray-300 rounded p-1 text-center w-full"
            onChange={(e) =>
              handleInputChange(
                "horizontalSpacing",
                e.target.value,
                setHorizontalSpacing
              )
            }
            onBlur={(e) =>
              handleBlur(
                "horizontalSpacing",
                e.target.value,
                setHorizontalSpacing
              )
            }
          />
        </div>
        <div className="flex flex-col col-span-2">
          <label className="text-sm mb-1">Row Spacing (mm):</label>
          <input
            type="text"
            value={inputValues.rowSpacing}
            className="border border-gray-300 rounded p-1 text-center w-full"
            onChange={(e) =>
              handleInputChange("rowSpacing", e.target.value, setRowSpacing)
            }
            onBlur={(e) =>
              handleBlur("rowSpacing", e.target.value, setRowSpacing)
            }
          />
          <p className="text-xs text-gray-500 mt-1">
            This is the vertical gap between each row of labels (consistent
            spacing between all rows)
          </p>
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
            <label htmlFor={`field-${field.value}`}>{field.label}</label>
          </div>
        ))}
      </div>

      {/* Note about template saving */}
      <div className="w-full p-3 bg-blue-50 rounded-md">
        <p className="text-xs text-blue-700 text-center">
          Use the "Save Current Settings as Template" button in the main
          interface to save these settings as a template.
        </p>
      </div>
    </div>
  );
};

export default ConfigurationPanel;
