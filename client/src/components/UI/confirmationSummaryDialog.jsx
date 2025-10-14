/* eslint-disable no-unused-vars */
import { useToast } from "./ShadCN/hooks/use-toast";

const validSubTypes = ["WMM", "Promo", "Complimentary"];
const ConfirmationSummaryDialog = ({
  showConfirmation,
  setShowConfirmation,
  handleConfirmedSubmit,
  closeModal,
  formData,
  addressData,
  areaData,
  combinedAddress,
  roleSpecificData,
  subscriptionType,
  selectedRole,
  hrgData,
  fomData,
  calData,
  mode = "add", // "add" or "edit" - determines behavior
  isEditMode = false, // Legacy prop for backward compatibility
  updateType = "all", // Always "all" with smart filtering
  previewClientDiff = null,
  previewNoSubscriptionIncluded = false,
  subscriptionValidation = {
    errors: {},
    warnings: {},
    isValid: true,
    hasWarnings: false,
  },
  hasRole = () => false,
  originalData = {},
  subscriptionMode = "edit", // "add" or "edit" - for subscription operations
}) => {
  const { toast } = useToast();

  if (!showConfirmation) return null;

  // Determine the actual mode - prioritize mode prop over isEditMode for clarity
  const actualMode = mode || (isEditMode ? "edit" : "add");
  const isAddMode = actualMode === "add";
  const isEditModeActual = actualMode === "edit";

  // Helper function to format date from parts
  const formatDateFromParts = (month, day, year) => {
    if (!month || !day || !year) return "Not specified";
    return `${month}/${day}/${year}`;
  };

  // Format subscription dates
  const startDate = formatDateFromParts(
    formData.subStartMonth,
    formData.subStartDay,
    formData.subStartYear
  );
  const endDate = formatDateFromParts(
    formData.subEndMonth,
    formData.subEndDay,
    formData.subEndYear
  );
  const birthDate = formatDateFromParts(
    formData.bdateMonth,
    formData.bdateDay,
    formData.bdateYear
  );

  // Helper function to check if a role has meaningful data
  const hasRoleData = (roleData) => {
    if (!roleData) return false;

    // Check for meaningful data, excluding default/empty values
    return Object.entries(roleData).some(([key, value]) => {
      if (typeof value === "boolean") return value !== undefined;
      if (typeof value === "string") {
        const trimmed = value.trim();
        return (
          trimmed !== "" &&
          trimmed !== "Not specified" &&
          trimmed !== "0" &&
          trimmed !== "N/A"
        );
      }
      if (typeof value === "number") return value > 0; // Only show if greater than 0
      return value !== null && value !== undefined;
    });
  };

  // Helper function to check if subscription data is meaningful
  const hasSubscriptionData = (
    subscriptionType,
    formData,
    roleSpecificData
  ) => {
    if (!subscriptionType || subscriptionType === "None") return false;

    // For add mode, be more lenient - show if subscription type is selected and not "None"
    if (isAddMode) {
      // If subscription type is not "None", show the subscription section
      if (subscriptionType && subscriptionType !== "None") {
        return true;
      }
      return false;
    }

    // For edit mode, check if we have subscription start and end dates
    // This handles both "Edit Existing" and "Add New" subscription scenarios
    const hasStartDate =
      formData.subStartYear && formData.subStartMonth && formData.subStartDay;
    const hasEndDate =
      formData.subEndYear && formData.subEndMonth && formData.subEndDay;
    const hasClass = formData.subsclass && formData.subsclass.trim() !== "";

    // Basic check: if we have dates and class, show the subscription section
    if (hasStartDate && hasEndDate && hasClass) {
      return true;
    }

    // If subscription type is selected but dates aren't filled, still show section
    // (this allows showing incomplete data for review)
    if (subscriptionType && subscriptionType !== "None") {
      return true;
    }

    return false;
  };

  // Helper function to check if address section has meaningful content
  const hasAddressContent = () => {
    if (!previewClientDiff) return false;

    // Check if any address fields have changed
    const addressFields = [
      "housestreet",
      "subdivision",
      "barangay",
      "area",
      "zipcode",
      "acode",
      "address",
    ];

    return addressFields.some(
      (field) => previewClientDiff[field] !== undefined
    );
  };

  // Helper function to check if user has specific roles and meaningful data
  const hasRoleWithData = (roleName) => {
    // Check if user has the role AND has meaningful data
    const userHasRole = hasRole(roleName);
    if (!userHasRole) return false;

    // For add mode, be more lenient - show if any data exists
    if (isAddMode) {
      switch (roleName) {
        case "HRG":
          return Object.values(hrgData).some(
            (value) =>
              value !== null &&
              value !== undefined &&
              (typeof value !== "string" || value.trim() !== "")
          );
        case "FOM":
          return Object.values(fomData).some(
            (value) =>
              value !== null &&
              value !== undefined &&
              (typeof value !== "string" || value.trim() !== "")
          );
        case "CAL":
          return Object.values(calData).some(
            (value) =>
              value !== null &&
              value !== undefined &&
              (typeof value !== "string" || value.trim() !== "")
          );
        case "WMM":
          return Object.values(roleSpecificData).some(
            (value) =>
              value !== null &&
              value !== undefined &&
              (typeof value !== "string" || value.trim() !== "")
          );
        default:
          return false;
      }
    }

    // For edit mode, use the original strict logic
    switch (roleName) {
      case "HRG":
        return hasRoleData(hrgData);
      case "FOM":
        return hasRoleData(fomData);
      case "CAL":
        return hasRoleData(calData);
      case "WMM":
        return hasRoleData(roleSpecificData);
      default:
        return false;
    }
  };

  // Helper function to check if a field value is meaningful
  const hasMeaningfulValue = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") {
      const trimmed = value.trim();
      return (
        trimmed !== "" &&
        trimmed !== "Not specified" &&
        trimmed !== "0" &&
        trimmed !== "N/A"
      );
    }
    if (typeof value === "number") return value > 0;
    if (typeof value === "boolean") return true;
    return true;
  };

  // Helper component for displaying field comparisons (old vs new)
  const FieldComparison = ({
    label,
    oldValue,
    newValue,
    className = "",
    required = false,
    showIfEmpty = false,
  }) => {
    // Don't render if neither value is meaningful and showIfEmpty is false
    if (
      !showIfEmpty &&
      !hasMeaningfulValue(oldValue) &&
      !hasMeaningfulValue(newValue)
    ) {
      return null;
    }

    const formatValue = (value) => {
      if (!value || value === "")
        return <span className="text-gray-400 italic">Not specified</span>;
      return value;
    };

    return (
      <div className={`flex ${className}`}>
        <div className="flex-1">
          <span className="font-semibold text-gray-700 min-w-[120px]">
            {label}:{required && <span className="text-red-500 ml-1">*</span>}
            <span className="text-blue-600 ml-2 text-xs">(changed)</span>
          </span>
          <div className="text-gray-900 mt-1">
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">Before:</div>
                <div className="text-gray-500 line-through">
                  {formatValue(oldValue)}
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">After:</div>
                <div className="text-gray-900 font-medium">
                  {formatValue(newValue)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Helper component for displaying field values
  const FieldDisplay = ({
    label,
    value,
    className = "",
    required = false,
    isChanged = false,
    showIfEmpty = false, // New prop to control whether to show empty fields
    oldValue = null, // New prop for comparison mode
  }) => {
    // If we have both old and new values, use comparison mode
    if (oldValue !== null && isChanged) {
      return (
        <FieldComparison
          label={label}
          oldValue={oldValue}
          newValue={value}
          className={className}
          required={required}
          showIfEmpty={showIfEmpty}
        />
      );
    }

    // Don't render if value is not meaningful and showIfEmpty is false
    if (!showIfEmpty && !hasMeaningfulValue(value)) {
      return null;
    }
    return (
      <div className={`flex ${className}`}>
        <span className="font-semibold min-w-[120px]">
          {label}:{required && <span className="text-red-500 ml-1">*</span>}
          {isChanged && (
            <span className="text-blue-600 ml-2 text-xs">(changed)</span>
          )}
        </span>
        <span className="flex-1">{value}</span>
      </div>
    );
  };

  // Helper component for section headers
  const SectionHeader = ({ title }) => (
    <div className="border-b border-gray-200 pb-1 mb-2 mt-4">
      <h4 className="font-bold text-lg text-gray-700">{title}</h4>
    </div>
  );

  // Handle the confirmed submission with toast and modal closing
  const handleSubmitWithFeedback = async () => {
    try {
      await handleConfirmedSubmit();
      // If we reach here, the submission was successful
      toast({
        title: "Success",
        description: isEditModeActual
          ? "Client updated successfully!"
          : "Client added successfully!",
      });
      // Close the confirmation dialog after successful submission
      setShowConfirmation(false);
      // Immediately close the parent modal so it reliably disappears on success
      // (parent components already reset their own state on close)
      closeModal();
    } catch (error) {
      console.error("Error in handleSubmitWithFeedback:", error);
      // Handle error case
      toast({
        title: "Error",
        description: isEditModeActual
          ? "Failed to update client. Please try again."
          : "Failed to add client. Please try again.",
        variant: "destructive",
      });
      // Don't close the dialog on error, let user retry
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-4">
          {isEditModeActual ? "Confirm Update" : "Confirm Submission"}
        </h3>
        <p className="mb-6 text-gray-600">
          {isEditModeActual
            ? subscriptionMode === "add"
              ? "Please review the new subscription information below before adding."
              : "Please review the changes below and confirm the update."
            : "Please review the information below before submitting."}
        </p>

        {/* Show info banner for "Add New Subscription" mode - only for valid subscription types */}
        {isEditModeActual &&
          subscriptionMode === "add" &&
          validSubTypes.includes(subscriptionType) && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-blue-600 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <h4 className="text-lg font-semibold text-blue-800">
                  Adding New Subscription
                </h4>
              </div>
              <p className="text-sm text-blue-700 mt-2">
                You are about to add a new {subscriptionType} subscription to
                this existing client. Client information will not be modified.
              </p>
            </div>
          )}

        {/* Show info banner for "Edit Existing Subscription" mode - only for valid subscription types */}
        {isEditModeActual &&
          subscriptionMode === "edit" &&
          validSubTypes.includes(subscriptionType) &&
          Object.keys(previewClientDiff || {}).length === 0 && (
            <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-amber-600 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                    clipRule="evenodd"
                  />
                </svg>
                <h4 className="text-lg font-semibold text-amber-800">
                  Editing Existing Subscription
                </h4>
              </div>
              <p className="text-sm text-amber-700 mt-2">
                You are modifying an existing {subscriptionType} subscription.
                The changes shown below will update the current subscription
                record.
              </p>
            </div>
          )}

        {/* Warning for no subscription data - only show in edit mode */}
        {isEditModeActual && previewNoSubscriptionIncluded && (
          <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-orange-600 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <h4 className="text-lg font-semibold text-orange-800">
                No Subscription Data Included
              </h4>
            </div>
            <p className="text-sm text-orange-700 mt-2">
              This save will only update client information. No subscription or
              role data will be saved.
            </p>
          </div>
        )}

        {/* Update Type Selection for Edit Mode */}

        {/* Subscription Validation Warnings - only show in edit mode for valid types */}
        {isEditModeActual &&
          validSubTypes.includes(subscriptionType) &&
          subscriptionValidation.hasWarnings && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Subscription Data Warnings
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <ul className="list-disc list-inside space-y-1">
                      {Object.entries(subscriptionValidation.warnings).map(
                        ([field, message]) => (
                          <li key={field}>{message}</li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Subscription Validation Info - only show in edit mode for valid types */}
        {isEditModeActual &&
          validSubTypes.includes(subscriptionType) &&
          !subscriptionValidation.isSubscriptionValid &&
          subscriptionValidation.hasWarnings && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-blue-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Subscription Data Notice
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Incomplete subscription data will not be saved. Only valid
                      client information changes will be submitted.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        <div className="space-y-4">
          {/* Personal Information */}
          <SectionHeader title="Personal Information" />
          {isEditModeActual && previewClientDiff ? (
            // Show only changed fields when we have a diff (edit mode)
            <>
              {previewClientDiff.title !== undefined && (
                <FieldDisplay
                  label="Title"
                  value={previewClientDiff.title}
                  isChanged={true}
                  oldValue={originalData.title}
                />
              )}
              {previewClientDiff.fname !== undefined && (
                <FieldDisplay
                  label="First Name"
                  value={previewClientDiff.fname}
                  isChanged={true}
                  oldValue={originalData.fname}
                />
              )}
              {previewClientDiff.mname !== undefined && (
                <FieldDisplay
                  label="Middle Name"
                  value={previewClientDiff.mname}
                  isChanged={true}
                  oldValue={originalData.mname}
                />
              )}
              {previewClientDiff.lname !== undefined && (
                <FieldDisplay
                  label="Last Name"
                  value={previewClientDiff.lname}
                  isChanged={true}
                  oldValue={originalData.lname}
                />
              )}
              {previewClientDiff.sname !== undefined && (
                <FieldDisplay
                  label="Suffix"
                  value={previewClientDiff.sname}
                  isChanged={true}
                  oldValue={originalData.sname}
                />
              )}
              {previewClientDiff.bdate !== undefined && (
                <FieldDisplay
                  label="Birth Date"
                  value={previewClientDiff.bdate}
                  isChanged={true}
                  oldValue={originalData.bdate}
                />
              )}
              {previewClientDiff.company !== undefined && (
                <FieldDisplay
                  label="Company"
                  value={previewClientDiff.company}
                  isChanged={true}
                  oldValue={originalData.company}
                />
              )}
              {previewClientDiff.type !== undefined && (
                <FieldDisplay
                  label="Type"
                  value={previewClientDiff.type}
                  isChanged={true}
                />
              )}
              {previewClientDiff.group !== undefined && (
                <FieldDisplay
                  label="Group"
                  value={previewClientDiff.group}
                  isChanged={true}
                />
              )}
            </>
          ) : (
            // Show all available fields (add mode or edit mode without diff)
            <>
              <FieldDisplay
                label="Title"
                value={formData.title}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="First Name"
                value={formData.fname}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Middle Name"
                value={formData.mname}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Last Name"
                value={formData.lname}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Suffix"
                value={formData.sname}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Birth Date"
                value={birthDate}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Company"
                value={formData.company}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Type"
                value={formData.type}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Group"
                value={formData.group}
                showIfEmpty={false}
              />
            </>
          )}

          {/* Contact Information */}
          <SectionHeader title="Contact Information" />
          {isEditModeActual && previewClientDiff ? (
            // Show only changed fields when we have a diff (edit mode)
            <>
              {previewClientDiff.contactnos !== undefined && (
                <FieldDisplay
                  label="Contact Numbers"
                  value={previewClientDiff.contactnos}
                  isChanged={true}
                  oldValue={originalData.contactnos}
                />
              )}
              {previewClientDiff.cellno !== undefined && (
                <FieldDisplay
                  label="Cell Number"
                  value={previewClientDiff.cellno}
                  isChanged={true}
                  oldValue={originalData.cellno}
                />
              )}
              {previewClientDiff.ofcno !== undefined && (
                <FieldDisplay
                  label="Office Number"
                  value={previewClientDiff.ofcno}
                  isChanged={true}
                  oldValue={originalData.ofcno}
                />
              )}
              {previewClientDiff.email !== undefined && (
                <FieldDisplay
                  label="Email"
                  value={previewClientDiff.email}
                  isChanged={true}
                  oldValue={originalData.email}
                />
              )}
              {previewClientDiff.remarks !== undefined && (
                <FieldDisplay
                  label="Remarks"
                  value={previewClientDiff.remarks}
                  isChanged={true}
                  oldValue={originalData.remarks}
                />
              )}
            </>
          ) : (
            // Show all available fields (add mode or edit mode without diff)
            <>
              <FieldDisplay
                label="Contact Numbers"
                value={formData.contactnos}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Cell Number"
                value={formData.cellno}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Office Number"
                value={formData.ofcno}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Email"
                value={formData.email}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Remarks"
                value={formData.remarks}
                showIfEmpty={false}
              />
            </>
          )}

          {/* Address Information - Show if there are address changes (edit mode) or if address data exists (add mode) */}
          {(isEditModeActual
            ? hasAddressContent()
            : combinedAddress ||
              addressData.housestreet ||
              addressData.subdivision ||
              addressData.barangay) && (
            <>
              <SectionHeader title="Address Information" />
              {isEditModeActual && previewClientDiff ? (
                // Show only changed fields when we have a diff (edit mode)
                <>
                  {previewClientDiff.housestreet !== undefined && (
                    <FieldDisplay
                      label="House/Street"
                      value={previewClientDiff.housestreet}
                      isChanged={true}
                      oldValue={originalData.housestreet}
                    />
                  )}
                  {previewClientDiff.subdivision !== undefined && (
                    <FieldDisplay
                      label="Subdivision"
                      value={previewClientDiff.subdivision}
                      isChanged={true}
                      oldValue={originalData.subdivision}
                    />
                  )}
                  {previewClientDiff.barangay !== undefined && (
                    <FieldDisplay
                      label="Barangay"
                      value={previewClientDiff.barangay}
                      isChanged={true}
                      oldValue={originalData.barangay}
                    />
                  )}
                  {previewClientDiff.area !== undefined && (
                    <FieldDisplay
                      label="Area/City"
                      value={previewClientDiff.area}
                      isChanged={true}
                      oldValue={originalData.area}
                    />
                  )}
                  {previewClientDiff.zipcode !== undefined && (
                    <FieldDisplay
                      label="Zipcode"
                      value={previewClientDiff.zipcode}
                      isChanged={true}
                      oldValue={originalData.zipcode}
                    />
                  )}
                  {previewClientDiff.acode !== undefined && (
                    <FieldDisplay
                      label="Area Code"
                      value={previewClientDiff.acode}
                      isChanged={true}
                      oldValue={originalData.acode}
                    />
                  )}
                  {previewClientDiff.address !== undefined && (
                    <div className="mt-2">
                      <span className="font-semibold">Full Address:</span>
                      <div className="mt-1 p-2 bg-yellow-50 border-l-4 border-yellow-400 rounded whitespace-pre-line">
                        {previewClientDiff.address}
                        <span className="text-blue-600 ml-2 text-xs">
                          (changed)
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                // Show all available fields (add mode or edit mode without diff)
                <>
                  <FieldDisplay
                    label="House/Street"
                    value={addressData.housestreet}
                    showIfEmpty={false}
                  />
                  <FieldDisplay
                    label="Subdivision"
                    value={addressData.subdivision}
                    showIfEmpty={false}
                  />
                  <FieldDisplay
                    label="Barangay"
                    value={addressData.barangay}
                    showIfEmpty={false}
                  />
                  <FieldDisplay
                    label="Area/City"
                    value={formData.area || areaData.city}
                    showIfEmpty={false}
                  />
                  <FieldDisplay
                    label="Zipcode"
                    value={formData.zipcode || areaData.zipcode}
                    showIfEmpty={false}
                  />
                  <FieldDisplay
                    label="Area Code"
                    value={formData.acode || areaData.acode}
                    showIfEmpty={false}
                  />

                  {/* Full Address Preview */}
                  {combinedAddress && (
                    <div className="mt-2">
                      <span className="font-semibold">Full Address:</span>
                      <div className="mt-1 p-2 bg-gray-50 rounded whitespace-pre-line">
                        {combinedAddress}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Subscription Information - Show if subscriptionType exists and has meaningful data */}
          {hasSubscriptionData(
            subscriptionType,
            formData,
            roleSpecificData
          ) && (
            <>
              <SectionHeader
                title={`${subscriptionType} Subscription ${
                  subscriptionMode === "add" ? "(New)" : "(Editing)"
                }`}
              />
              <FieldDisplay
                label="Subscription Class"
                value={formData.subsclass || roleSpecificData.subsclass || ""}
                required={subscriptionType === "WMM"}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Start Date"
                value={startDate}
                required={true}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="End Date"
                value={endDate}
                required={true}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Duration"
                value={
                  formData.subscriptionFreq
                    ? `${formData.subscriptionFreq} months`
                    : ""
                }
                required={true}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Copies"
                value={roleSpecificData.copies}
                required={true}
                showIfEmpty={false}
              />

              {/* WMM Specific Fields - Only show if WMM subscription type and has data */}
              {subscriptionType === "WMM" && hasRoleData(roleSpecificData) && (
                <>
                  <FieldDisplay
                    label="Payment Reference"
                    value={roleSpecificData.paymtref}
                    required={true}
                    showIfEmpty={false}
                  />
                  <FieldDisplay
                    label="Payment Amount"
                    value={roleSpecificData.paymtamt}
                    required={true}
                    showIfEmpty={false}
                  />
                  <FieldDisplay
                    label="Payment Masses"
                    value={roleSpecificData.paymtmasses}
                    showIfEmpty={false}
                  />
                  <FieldDisplay
                    label="Donor ID"
                    value={roleSpecificData.donorid}
                    showIfEmpty={false}
                  />
                  <FieldDisplay
                    label="Remarks"
                    value={roleSpecificData.remarks}
                    showIfEmpty={false}
                  />
                </>
              )}

              {/* Promo Specific Field */}
              {subscriptionType === "Promo" && (
                <FieldDisplay
                  label="Referral ID"
                  value={formData.referralid}
                  required={true}
                  showIfEmpty={false}
                />
              )}
            </>
          )}

          {/* Role Specific Information - Show only roles that actually have data */}
          {/* HRG Information - Only show if user has HRG role and has meaningful data */}
          {hasRoleWithData("HRG") && (
            <>
              <SectionHeader title="HRG Information" />
              <FieldDisplay
                label="Received Date"
                value={hrgData.recvdate}
                required={true}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Campaign Date"
                value={hrgData.campaigndate}
                required={true}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Payment Reference"
                value={hrgData.paymtref}
                required={true}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Payment Amount"
                value={hrgData.paymtamt}
                required={true}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Payment Form"
                value={hrgData.paymtform}
                required={true}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Unsubscribe"
                value={hrgData.unsubscribe ? "Yes" : "No"}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Remarks"
                value={hrgData.remarks}
                showIfEmpty={false}
              />
            </>
          )}

          {/* FOM Information - Only show if user has FOM role and has meaningful data */}
          {hasRoleWithData("FOM") && (
            <>
              <SectionHeader title="FOM Information" />
              <FieldDisplay
                label="Received Date"
                value={fomData.recvdate}
                required={true}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Payment Reference"
                value={fomData.paymtref}
                required={true}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Payment Amount"
                value={fomData.paymtamt}
                required={true}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Payment Form"
                value={fomData.paymtform}
                required={true}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Unsubscribe"
                value={fomData.unsubscribe ? "Yes" : "No"}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Remarks"
                value={fomData.remarks}
                showIfEmpty={false}
              />
            </>
          )}

          {/* CAL Information - Only show if user has CAL role and has meaningful data */}
          {hasRoleWithData("CAL") && (
            <>
              <SectionHeader title="CAL Information" />
              <FieldDisplay
                label="Received Date"
                value={calData.recvdate}
                required={true}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Calendar Type"
                value={calData.caltype}
                required={true}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Calendar Quantity"
                value={calData.calqty}
                required={true}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Calendar Unit Price"
                value={calData.calunit}
                required={true}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Calendar Total Amount"
                value={calData.calamt}
                required={true}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Payment Reference"
                value={calData.paymtref}
                required={true}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Payment Amount"
                value={calData.paymtamt}
                required={true}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Payment Form"
                value={calData.paymtform}
                required={true}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Payment Date"
                value={calData.paymtdate}
                required={true}
                showIfEmpty={false}
              />
              <FieldDisplay
                label="Remarks"
                value={calData.remarks}
                showIfEmpty={false}
              />
            </>
          )}
        </div>

        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
          <button
            type="button"
            onClick={() => setShowConfirmation(false)}
            className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md text-base"
          >
            Back to Edit
          </button>
          <button
            type="button"
            onClick={handleSubmitWithFeedback}
            className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-md text-base"
          >
            {isEditModeActual ? "Confirm Update" : "Confirm Submission"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationSummaryDialog;
