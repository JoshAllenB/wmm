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

  // UI state
  showInputs,
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

  // New UX states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [changeSummary, setChangeSummary] = useState([]);

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

  // Build current layout state object (for change comparison and saving)
  const buildUnifiedLayout = () => {
    return {
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
  };

  // Compute a friendly change summary between selectedTemplate and current form values
  const computeChangeSummary = () => {
    if (!selectedTemplate) return [];
    const before = {
      name: selectedTemplate.name,
      description: selectedTemplate.description || "",
      department: selectedTemplate.department || "",
      layout: selectedTemplate.layout || {},
      selectedFields: Array.isArray(selectedTemplate.selectedFields)
        ? selectedTemplate.selectedFields
        : [],
      selectedPrinter: selectedTemplate.selectedPrinter || "",
    };
    const after = {
      name: templateName.trim(),
      description: description.trim(),
      department,
      layout: buildUnifiedLayout(),
      selectedFields: selectedFields || [],
      selectedPrinter: selectedPrinter || "",
    };

    const changes = [];

    // Simple fields
    ["name", "description", "department", "selectedPrinter"].forEach((key) => {
      if ((before[key] || "") !== (after[key] || "")) {
        changes.push({
          label: key,
          before: before[key] || "—",
          after: after[key] || "—",
        });
      }
    });

    // selectedFields comparison
    const beforeFields = (before.selectedFields || []).slice().sort();
    const afterFields = (after.selectedFields || []).slice().sort();
    if (JSON.stringify(beforeFields) !== JSON.stringify(afterFields)) {
      changes.push({
        label: "selectedFields",
        before: beforeFields.join(", ") || "—",
        after: afterFields.join(", ") || "—",
      });
    }

    // layout keys to compare
    const layoutKeys = [
      "fontSize",
      "leftPosition",
      "topPosition",
      "columnWidth",
      "labelHeight",
      "horizontalSpacing",
      "rowSpacing",
      "paperWidth",
      "paperHeight",
      "rowsPerPage",
      "columnsPerPage",
      "labelWidthIn",
      "topMargin",
      "rowSpacingLines",
      "col2X",
    ];
    layoutKeys.forEach((k) => {
      const beforeVal = before.layout?.[k];
      const afterVal = after.layout?.[k];
      if (beforeVal !== afterVal) {
        changes.push({
          label: `layout.${k}`,
          before: beforeVal ?? "—",
          after: afterVal ?? "—",
        });
      }
    });

    return changes;
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

    // If updating, only skip duplicate check when neither name nor department changed
    if (isUpdating && selectedTemplate) {
      const newName = templateName.trim();
      const nameChanged = newName !== selectedTemplate.name;
      const deptChanged = department !== selectedTemplate.department;

      if (nameChanged || deptChanged) {
        setIsCheckingDuplicate(true);
        try {
          const duplicate = await checkForDuplicate(newName, department);
          if (duplicate && duplicate._id !== selectedTemplate._id) {
            setDuplicateTemplate(duplicate);
            setShowDuplicateModal(true);
            setIsCheckingDuplicate(false);
            return;
          }
        } catch (error) {
          console.error("Error checking for duplicates on update:", error);
          toast.error(
            "Error checking for existing templates. Please try again."
          );
          setIsCheckingDuplicate(false);
          return;
        } finally {
          setIsCheckingDuplicate(false);
        }
      }

      // Show review modal with changes before saving
      const changes = computeChangeSummary();
      setChangeSummary(changes);
      setShowReviewModal(true);
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
      const unifiedLayout = buildUnifiedLayout();

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
      setShowReviewModal(false);
      setChangeSummary([]);

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

    setDeleteConfirmText("");
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
      const unifiedLayout = buildUnifiedLayout();

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
        <div className="space-y-3">
          {/* Save New Template Button */}
          <Button
            onClick={handleSaveClick}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Save Current Settings as New Template
          </Button>

          {/* Template Management Section - Only show if a template is selected AND raw printer config is visible */}
          {selectedTemplate && showInputs && (
            <div className="border-t pt-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">
                  Managing:{" "}
                  <span className="text-blue-600">{selectedTemplate.name}</span>
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleUpdateClick}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Update Template
                </Button>
                <Button
                  onClick={handleDeleteTemplate}
                  variant="destructive"
                  disabled={isDeleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDeleting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Deleting...</span>
                    </div>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Delete Template
                    </>
                  )}
                </Button>
              </div>
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
                <p className="text-sm text-gray-500 mb-3">
                  This will permanently delete{" "}
                  <span className="font-medium text-gray-900">
                    "{selectedTemplate?.name}"
                  </span>
                  . This action cannot be undone.
                </p>

                {/* Details */}
                <div className="bg-gray-50 p-3 rounded-md text-left mb-4">
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>Department: {selectedTemplate?.department || "—"}</div>
                    <div>
                      Description: {selectedTemplate?.description || "—"}
                    </div>
                    <div>
                      Printer: {selectedTemplate?.selectedPrinter || "—"}
                    </div>
                  </div>
                </div>

                {/* Type to confirm */}
                <div className="text-left mb-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Type the template name to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={selectedTemplate?.name}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                  />
                </div>

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
                    disabled={
                      isDeleting ||
                      deleteConfirmText.trim() !==
                        (selectedTemplate?.name || "").trim()
                    }
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
        <div className="flex items-center gap-2 mb-4">
          <div
            className={`w-3 h-3 rounded-full ${
              isUpdating ? "bg-blue-500" : "bg-green-500"
            }`}
          ></div>
          <h4 className="font-medium text-gray-800">
            {isUpdating ? "Update Template" : "Save New Template"}
          </h4>
        </div>

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
              className={`flex-1 ${
                isUpdating
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
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
                <>
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Review & Update
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Save Template
                </>
              )}
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              disabled={isSaving}
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal (when editing form is open) */}
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
              <p className="text-sm text-gray-500 mb-3">
                This will permanently delete{" "}
                <span className="font-medium text-gray-900">
                  "{selectedTemplate?.name}"
                </span>
                . This action cannot be undone.
              </p>

              <div className="bg-gray-50 p-3 rounded-md text-left mb-4">
                <div className="text-xs text-gray-600 space-y-1">
                  <div>Department: {selectedTemplate?.department || "—"}</div>
                  <div>Description: {selectedTemplate?.description || "—"}</div>
                  <div>Printer: {selectedTemplate?.selectedPrinter || "—"}</div>
                </div>
              </div>

              <div className="text-left mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Type the template name to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={selectedTemplate?.name}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                />
              </div>

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
                  disabled={
                    isDeleting ||
                    deleteConfirmText.trim() !==
                      (selectedTemplate?.name || "").trim()
                  }
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

      {/* Review Changes Modal (for Update) */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-xl w-full mx-4 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-2 text-center">
              Review Changes
            </h3>
            <p className="text-sm text-gray-600 mb-4 text-center">
              You're about to update "{selectedTemplate?.name}". Please review
              the changes below.
            </p>

            <div className="max-h-80 overflow-auto border rounded-md">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-3 py-2 w-1/3">Field</th>
                    <th className="px-3 py-2">From</th>
                    <th className="px-3 py-2">To</th>
                  </tr>
                </thead>
                <tbody>
                  {(changeSummary.length > 0
                    ? changeSummary
                    : [
                        {
                          label: "No changes detected",
                          before: "—",
                          after: "—",
                        },
                      ]
                  ).map((c, idx) => (
                    <tr
                      key={idx}
                      className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="px-3 py-2 font-medium text-gray-700">
                        {c.label}
                      </td>
                      <td className="px-3 py-2 text-gray-600 break-all">
                        {String(c.before)}
                      </td>
                      <td className="px-3 py-2 text-gray-900 break-all">
                        {String(c.after)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 justify-end mt-4">
              <Button
                onClick={() => setShowReviewModal(false)}
                variant="outline"
                className="px-4"
              >
                Back
              </Button>
              <Button
                onClick={performSave}
                disabled={isSaving}
                className="px-4"
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Updating...</span>
                  </div>
                ) : (
                  "Confirm Update"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TemplateSaver;
