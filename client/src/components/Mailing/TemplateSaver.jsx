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

  // Printer info
  selectedPrinter,

  // Template management
  selectedTemplate,
  savedTemplates,

  // Callbacks
  onTemplateSaved,
  onTemplateUpdated,
  onTemplateDeleted,
  onClose,

  // External triggers
  triggerUpdate,
  triggerDelete,
}) => {
  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState(userRole || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateTemplate, setDuplicateTemplate] = useState(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  // Update department when userRole changes
  useEffect(() => {
    if (userRole && !department) {
      setDepartment(userRole);
    }
  }, [userRole, department]);

  // Handle external update trigger
  useEffect(() => {
    if (triggerUpdate && selectedTemplate) {
      handleUpdateClick();
    }
  }, [triggerUpdate, selectedTemplate]);

  // Handle external delete trigger
  useEffect(() => {
    if (triggerDelete && selectedTemplate) {
      handleDeleteTemplate();
    }
  }, [triggerDelete, selectedTemplate]);

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
    setIsUpdating(false);
  };

  // Handle update button click
  const handleUpdateClick = () => {
    if (selectedTemplate) {
      setTemplateName(selectedTemplate.name);
      setDescription(selectedTemplate.description || "");
      setDepartment(selectedTemplate.department || userRole);
      setShowForm(true);
      setIsUpdating(true);
    }
  };

  // Check if template already exists in the same department
  const checkForDuplicate = async (name, dept) => {
    try {
      const response = await axios.get(
        `http://${
          import.meta.env.VITE_IP_ADDRESS
        }:3001/util/templates?department=${dept}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      const existingTemplate = response.data.find(
        (template) => template.name === name && template.department === dept
      );

      return existingTemplate || null;
    } catch (error) {
      console.error("Error checking for duplicate template:", error);
      return null;
    }
  };

  // Handle template save/update
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    if (!department) {
      toast.error("Please select a department");
      return;
    }

    // If updating existing template, skip duplicate check
    if (isUpdating && selectedTemplate) {
      await performSave();
      return;
    }

    // Check for duplicates before saving new template
    setIsCheckingDuplicate(true);
    try {
      const duplicate = await checkForDuplicate(
        templateName.trim(),
        department
      );

      if (duplicate) {
        setDuplicateTemplate(duplicate);
        setShowDuplicateModal(true);
        setIsCheckingDuplicate(false);
        return;
      }

      // No duplicate found, proceed with save
      await performSave();
    } catch (error) {
      console.error("Error checking for duplicates:", error);
      toast.error("Error checking for existing templates. Please try again.");
    } finally {
      setIsCheckingDuplicate(false);
    }
  };

  // Perform the actual save operation
  const performSave = async () => {
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
        labelWidthIn: labelAdjustments?.labelWidthIn ?? undefined,
        topMargin: labelAdjustments?.topMargin ?? undefined,
        rowSpacingLines: labelAdjustments?.rowSpacing ?? undefined,
        col2X: labelAdjustments?.col2X ?? undefined,
      };

      const templateData = {
        name: templateName.trim(),
        description: description.trim(),
        department,
        layout: unifiedLayout,
        selectedFields: selectedFields || [],
        previewType: "standard",
        // Include selected printer information
        selectedPrinter: selectedPrinter || "",
      };

      let response;
      if (isUpdating && selectedTemplate) {
        // Update existing template
        response = await axios.put(
          `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/templates/${
            selectedTemplate._id
          }`,
          templateData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }
        );
        toast.success("Template updated successfully!");
        if (onTemplateUpdated) {
          onTemplateUpdated(response.data);
        }
      } else {
        // Create new template
        response = await axios.post(
          `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/templates-add`,
          templateData,
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
      }

      // Reset form
      setTemplateName("");
      setDescription("");
      setShowForm(false);
      setIsUpdating(false);

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

  // Handle template deletion
  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) {
      toast.error("No template selected for deletion");
      return;
    }

    setShowDeleteModal(true);
  };

  // Confirm template deletion
  const confirmDeleteTemplate = async () => {
    setIsDeleting(true);
    setShowDeleteModal(false);

    try {
      await axios.delete(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/templates/${
          selectedTemplate._id
        }`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      toast.success("Template deleted successfully!");

      if (onTemplateDeleted) {
        onTemplateDeleted(selectedTemplate._id);
      }

      // Reset form
      setTemplateName("");
      setDescription("");
      setShowForm(false);
      setIsUpdating(false);

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error deleting template:", error);

      let errorMessage = "Error deleting template. Please try again.";
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  // Cancel template deletion
  const cancelDeleteTemplate = () => {
    setShowDeleteModal(false);
  };

  // Handle duplicate template options
  const handleReplaceDuplicate = async () => {
    if (!duplicateTemplate) return;

    setIsSaving(true);
    setShowDuplicateModal(false);

    try {
      // Delete the existing template first
      await axios.delete(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/templates/${
          duplicateTemplate._id
        }`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      // Now save the new template
      await performSave();

      toast.success("Template replaced successfully!");
    } catch (error) {
      console.error("Error replacing template:", error);
      toast.error("Error replacing template. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateDuplicate = async () => {
    if (!duplicateTemplate) return;

    setIsSaving(true);
    setShowDuplicateModal(false);

    try {
      // Update the existing template with new settings
      const unifiedLayout = {
        fontSize,
        leftPosition,
        topPosition,
        columnWidth,
        labelHeight,
        horizontalSpacing,
        rowSpacing,
        paperWidth,
        paperHeight,
        rowsPerPage,
        columnsPerPage,
        labelWidthIn: labelAdjustments?.labelWidthIn ?? undefined,
        topMargin: labelAdjustments?.topMargin ?? undefined,
        rowSpacingLines: labelAdjustments?.rowSpacing ?? undefined,
        col2X: labelAdjustments?.col2X ?? undefined,
      };

      const templateData = {
        name: templateName.trim(),
        description: description.trim(),
        department,
        layout: unifiedLayout,
        selectedFields: selectedFields || [],
        previewType: "standard",
        selectedPrinter: selectedPrinter || "",
      };

      const response = await axios.put(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/templates/${
          duplicateTemplate._id
        }`,
        templateData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      toast.success("Template updated successfully!");

      if (onTemplateUpdated) {
        onTemplateUpdated(response.data);
      }

      // Reset form
      setTemplateName("");
      setDescription("");
      setShowForm(false);
      setIsUpdating(false);

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error updating template:", error);
      toast.error("Error updating template. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelDuplicate = () => {
    setShowDuplicateModal(false);
    setDuplicateTemplate(null);
  };

  // Handle cancel
  const handleCancel = () => {
    setTemplateName("");
    setDescription("");
    setShowForm(false);
    setIsUpdating(false);
    if (onClose) {
      onClose();
    }
  };

  if (!showForm) {
    return (
      <>
        <div className="space-y-2">
          <Button
            onClick={handleSaveClick}
            variant="secondary"
            className="w-full"
          >
            Save Current Settings as Template
          </Button>

          {selectedTemplate && (
            <div className="flex gap-2">
              <Button
                onClick={handleUpdateClick}
                variant="outline"
                className="flex-1"
              >
                Update Selected Template
              </Button>
              <Button
                onClick={handleDeleteTemplate}
                variant="destructive"
                disabled={isDeleting}
                className="flex-1"
              >
                {isDeleting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Deleting...</span>
                  </div>
                ) : (
                  "Delete Template"
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-red-100">
                  <svg
                    className="w-6 h-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Delete Template
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Are you sure you want to delete the template{" "}
                  <span className="font-medium text-gray-900">
                    "{selectedTemplate?.name}"
                  </span>
                  ? This action cannot be undone.
                </p>

                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={cancelDeleteTemplate}
                    variant="outline"
                    disabled={isDeleting}
                    className="px-4 py-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmDeleteTemplate}
                    variant="destructive"
                    disabled={isDeleting}
                    className="px-4 py-2"
                  >
                    {isDeleting ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Deleting...</span>
                      </div>
                    ) : (
                      "Delete Template"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <h4 className="font-medium mb-3 text-gray-800">
          {isUpdating ? "Update Template" : "Save Template"}
        </h4>

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
              {selectedPrinter && <div>Printer: {selectedPrinter}</div>}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSaveTemplate}
              disabled={
                isSaving ||
                isCheckingDuplicate ||
                !templateName.trim() ||
                !department
              }
              className="flex-1"
            >
              {isCheckingDuplicate ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Checking...</span>
                </div>
              ) : isSaving ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{isUpdating ? "Updating..." : "Saving..."}</span>
                </div>
              ) : isUpdating ? (
                "Update Template"
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-red-100">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Delete Template
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete the template{" "}
                <span className="font-medium text-gray-900">
                  "{selectedTemplate?.name}"
                </span>
                ? This action cannot be undone.
              </p>

              <div className="flex gap-3 justify-center">
                <Button
                  onClick={cancelDeleteTemplate}
                  variant="outline"
                  disabled={isDeleting}
                  className="px-4 py-2"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmDeleteTemplate}
                  variant="destructive"
                  disabled={isDeleting}
                  className="px-4 py-2"
                >
                  {isDeleting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Deleting...</span>
                    </div>
                  ) : (
                    "Delete Template"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Template Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-yellow-100">
                <svg
                  className="w-6 h-6 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Template Already Exists in Department
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                A template with the name{" "}
                <span className="font-medium text-gray-900">
                  "{duplicateTemplate?.name}"
                </span>{" "}
                already exists in the {duplicateTemplate?.department}{" "}
                department. Templates can have the same name in different
                departments.
              </p>

              <div className="bg-gray-50 p-3 rounded-md mb-4 text-left">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Existing Template Details:
                </h4>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>
                    Created:{" "}
                    {duplicateTemplate?.createdAt
                      ? new Date(
                          duplicateTemplate.createdAt
                        ).toLocaleDateString()
                      : "Unknown"}
                  </div>
                  <div>
                    Description:{" "}
                    {duplicateTemplate?.description || "No description"}
                  </div>
                  <div>
                    Font Size: {duplicateTemplate?.layout?.fontSize || 12}pt
                  </div>
                  <div>
                    Paper: {duplicateTemplate?.layout?.paperWidth || 215.9}mm ×{" "}
                    {duplicateTemplate?.layout?.paperHeight || 279.4}mm
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-6">
                What would you like to do?
              </p>

              <div className="space-y-2">
                <Button
                  onClick={handleUpdateDuplicate}
                  disabled={isSaving}
                  className="w-full"
                >
                  {isSaving ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Updating...</span>
                    </div>
                  ) : (
                    "Update Existing Template"
                  )}
                </Button>

                <Button
                  onClick={handleReplaceDuplicate}
                  variant="outline"
                  disabled={isSaving}
                  className="w-full"
                >
                  {isSaving ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                      <span>Replacing...</span>
                    </div>
                  ) : (
                    "Replace Existing Template"
                  )}
                </Button>

                <Button
                  onClick={handleCancelDuplicate}
                  variant="outline"
                  disabled={isSaving}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TemplateSaver;
