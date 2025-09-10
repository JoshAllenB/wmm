import React, { useState, useEffect } from "react";
import { Button } from "../UI/ShadCN/button";
import { toast } from "react-hot-toast";
import axios from "axios";

const TemplateSaver = ({
  // ConfigurationPanel props
  fontSize,
  columnWidth,
  leftPosition,
  topPosition,
  labelHeight,
  horizontalSpacing,
  rowSpacing,
  selectedFields,
  paperWidth,
  paperHeight,
  rowsPerPage,
  columnsPerPage,

  // RawPrinterControls props
  labelAdjustments,

  // User info
  userRole,

  // Callbacks
  onTemplateSaved,
  onClose,
}) => {
  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState(userRole || "");
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Update department when userRole changes
  useEffect(() => {
    if (userRole && !department) {
      setDepartment(userRole);
    }
  }, [userRole, department]);

  // Available departments (roles)
  const availableDepartments = [
    "ADMIN",
    "WMM",
    "HRG",
    "FOM",
    "CAL",
    "COMP",
    "PROMO",
  ];

  // Handle save button click
  const handleSaveClick = () => {
    setShowForm(true);
  };

  // Handle template save
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    if (!department) {
      toast.error("Please select a department");
      return;
    }

    setIsSaving(true);

    try {
      // Save ONLY mailing label configuration in this component
      const unifiedLayout = {
        // Mailing label layout
        fontSize,
        leftPosition,
        topPosition,
        columnWidth,
        labelHeight,
        horizontalSpacing,
        rowSpacing,
        // Paper/page layout
        paperWidth,
        paperHeight,
        rowsPerPage,
        columnsPerPage,
        // Raw printer specific adjustments (persisted for 'standard' previewType)
        // These align with how templates are read in mailing.jsx
        labelWidthIn: labelAdjustments?.labelWidthIn,
        topMargin: labelAdjustments?.topMargin,
        rowSpacingLines: labelAdjustments?.rowSpacing,
        col2X: labelAdjustments?.col2X,
      };

      const newTemplate = {
        name: templateName.trim(),
        description: description.trim(),
        department,
        layout: unifiedLayout,
        selectedFields: selectedFields || [],
        previewType: "standard",
      };

      const response = await axios.post(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/templates-add`,
        newTemplate,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      toast.success("Template saved successfully!");

      if (onTemplateSaved) {
        onTemplateSaved(response.data);
      }

      // Reset form
      setTemplateName("");
      setDescription("");
      setShowForm(false);

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error saving template:", error);

      let errorMessage = "Error saving template. Please try again.";
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setTemplateName("");
    setDescription("");
    setShowForm(false);
    if (onClose) {
      onClose();
    }
  };

  if (!showForm) {
    return (
      <div>
        <Button
          onClick={handleSaveClick}
          variant="secondary"
          className="w-full mb-2"
        >
          Save Current Settings as Template
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <h4 className="font-medium mb-3 text-gray-800">Save Template</h4>

      <div className="space-y-3">
        {/* Template Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Template Name *
          </label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Enter template name"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            rows="2"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Department Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Department *
          </label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Select Department</option>
            {availableDepartments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* Settings Summary */}
        <div className="bg-gray-50 p-3 rounded-md">
          <h5 className="text-sm font-medium text-gray-700 mb-2">
            Settings Summary
          </h5>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Font Size: {fontSize}pt</div>
            <div>
              Paper: {paperWidth}mm × {paperHeight}mm
            </div>
            <div>
              Layout: {rowsPerPage} rows × {columnsPerPage} columns
            </div>
            <div>Label Width: {labelAdjustments?.labelWidthIn || 3.5}"</div>
            <div>Selected Fields: {selectedFields?.join(", ") || "None"}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSaveTemplate}
            disabled={isSaving || !templateName.trim() || !department}
            className="flex-1"
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </div>
            ) : (
              "Save Template"
            )}
          </Button>
          <Button
            onClick={handleCancel}
            variant="outline"
            disabled={isSaving}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TemplateSaver;
