/* eslint-disable no-unused-vars */
import { useToast } from "./ShadCN/hooks/use-toast";

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
  isEditMode = false,
  onUpdateTypeChange,
  updateType = "all", // "all" or "clientOnly"
}) => {
  const { toast } = useToast();

  if (!showConfirmation) return null;

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
    return Object.values(roleData).some((value) => {
      if (typeof value === "boolean") return value !== undefined;
      if (typeof value === "string") return value.trim() !== "";
      if (typeof value === "number") return value !== 0;
      return value !== null && value !== undefined;
    });
  };

  // Helper component for displaying field values
  const FieldDisplay = ({ label, value, className = "", required = false }) => {
    if (!value && value !== 0) return null;
    return (
      <div className={`flex ${className}`}>
        <span className="font-semibold min-w-[120px]">
          {label}:{required && <span className="text-red-500 ml-1">*</span>}
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
    console.log("handleSubmitWithFeedback");
    try {
      console.log("About to call handleConfirmedSubmit...");
      await handleConfirmedSubmit();
      console.log("Submission successful");
      // If we reach here, the submission was successful
      toast({
        title: "Success",
        description: isEditMode
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
        description: isEditMode
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
          {isEditMode ? "Confirm Update" : "Confirm Submission"}
        </h3>
        <p className="mb-6 text-gray-600">
          {isEditMode
            ? "Please review the information below and select what to update."
            : "Please review the information below before submitting."}
        </p>

        {/* Update Type Selection for Edit Mode */}
        {isEditMode && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-lg font-semibold text-blue-800 mb-3">
              What would you like to update?
            </h4>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="updateType"
                  value="all"
                  checked={updateType === "all"}
                  onChange={(e) => onUpdateTypeChange(e.target.value)}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-blue-700">
                  <strong>Update Everything</strong> - Client information,
                  subscription data, and role data
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="updateType"
                  value="clientOnly"
                  checked={updateType === "clientOnly"}
                  onChange={(e) => onUpdateTypeChange(e.target.value)}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-blue-700">
                  <strong>Update Client Information Only</strong> - Name,
                  address, contact details, etc.
                </span>
              </label>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Personal Information */}
          <SectionHeader title="Personal Information" />
          <FieldDisplay label="Title" value={formData.title} />
          <FieldDisplay label="First Name" value={formData.fname} />
          <FieldDisplay label="Middle Name" value={formData.mname} />
          <FieldDisplay label="Last Name" value={formData.lname} />
          <FieldDisplay label="Suffix" value={formData.sname} />
          <FieldDisplay label="Birth Date" value={birthDate} />
          <FieldDisplay label="Company" value={formData.company} />
          <FieldDisplay label="Type" value={formData.type} />
          <FieldDisplay label="Group" value={formData.group} />

          {/* Contact Information */}
          <SectionHeader title="Contact Information" />
          <FieldDisplay label="Contact Numbers" value={formData.contactnos} />
          <FieldDisplay label="Cell Number" value={formData.cellno} />
          <FieldDisplay label="Office Number" value={formData.ofcno} />
          <FieldDisplay label="Email" value={formData.email} />
          <FieldDisplay label="Remarks" value={formData.remarks} />

          {/* Address Information */}
          <SectionHeader title="Address Information" />
          <FieldDisplay label="House/Street" value={addressData.housestreet} />
          <FieldDisplay label="Subdivision" value={addressData.subdivision} />
          <FieldDisplay label="Barangay" value={addressData.barangay} />
          <FieldDisplay
            label="Area/City"
            value={formData.area || areaData.city}
          />
          <FieldDisplay
            label="Zipcode"
            value={formData.zipcode || areaData.zipcode}
          />
          <FieldDisplay
            label="Area Code"
            value={formData.acode || areaData.acode}
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

          {/* Subscription Information - Only show if subscriptionType exists and has data */}
          {subscriptionType && updateType === "all" && (
            <>
              <SectionHeader title={`${subscriptionType} Subscription`} />
              <FieldDisplay
                label="Subscription Class"
                value={formData.subsclass}
                required={subscriptionType === "WMM"}
              />
              <FieldDisplay
                label="Start Date"
                value={startDate}
                required={true}
              />
              <FieldDisplay label="End Date" value={endDate} required={true} />
              <FieldDisplay
                label="Duration"
                value={
                  formData.subscriptionFreq
                    ? `${formData.subscriptionFreq} months`
                    : ""
                }
                required={true}
              />
              <FieldDisplay
                label="Copies"
                value={roleSpecificData.copies}
                required={true}
              />

              {/* WMM Specific Fields - Only show if WMM subscription type and has data */}
              {subscriptionType === "WMM" && hasRoleData(roleSpecificData) && (
                <>
                  <FieldDisplay
                    label="Payment Reference"
                    value={roleSpecificData.paymtref}
                    required={true}
                  />
                  <FieldDisplay
                    label="Payment Amount"
                    value={roleSpecificData.paymtamt}
                    required={true}
                  />
                  <FieldDisplay
                    label="Payment Masses"
                    value={roleSpecificData.paymtmasses}
                  />
                  <FieldDisplay
                    label="Donor ID"
                    value={roleSpecificData.donorid}
                  />
                  <FieldDisplay
                    label="Remarks"
                    value={roleSpecificData.remarks}
                  />
                </>
              )}

              {/* Promo Specific Field */}
              {subscriptionType === "Promo" && (
                <FieldDisplay
                  label="Referral ID"
                  value={formData.referralid}
                  required={true}
                />
              )}
            </>
          )}

          {/* Role Specific Information - Show only roles that actually have data */}
          {/* HRG Information - Only show if hrgData has meaningful data and updateType is "all" */}
          {hasRoleData(hrgData) && updateType === "all" && (
            <>
              <SectionHeader title="HRG Information" />
              <FieldDisplay
                label="Received Date"
                value={hrgData.recvdate}
                required={true}
              />
              <FieldDisplay
                label="Campaign Date"
                value={hrgData.campaigndate}
                required={true}
              />
              <FieldDisplay
                label="Payment Reference"
                value={hrgData.paymtref}
                required={true}
              />
              <FieldDisplay
                label="Payment Amount"
                value={hrgData.paymtamt}
                required={true}
              />
              <FieldDisplay
                label="Payment Form"
                value={hrgData.paymtform}
                required={true}
              />
              <FieldDisplay
                label="Unsubscribe"
                value={hrgData.unsubscribe ? "Yes" : "No"}
              />
              <FieldDisplay label="Remarks" value={hrgData.remarks} />
            </>
          )}

          {/* FOM Information - Only show if fomData has meaningful data and updateType is "all" */}
          {hasRoleData(fomData) && updateType === "all" && (
            <>
              <SectionHeader title="FOM Information" />
              <FieldDisplay
                label="Received Date"
                value={fomData.recvdate}
                required={true}
              />
              <FieldDisplay
                label="Payment Reference"
                value={fomData.paymtref}
                required={true}
              />
              <FieldDisplay
                label="Payment Amount"
                value={fomData.paymtamt}
                required={true}
              />
              <FieldDisplay
                label="Payment Form"
                value={fomData.paymtform}
                required={true}
              />
              <FieldDisplay
                label="Unsubscribe"
                value={fomData.unsubscribe ? "Yes" : "No"}
              />
              <FieldDisplay label="Remarks" value={fomData.remarks} />
            </>
          )}

          {/* CAL Information - Only show if calData has meaningful data and updateType is "all" */}
          {hasRoleData(calData) && updateType === "all" && (
            <>
              <SectionHeader title="CAL Information" />
              <FieldDisplay
                label="Received Date"
                value={calData.recvdate}
                required={true}
              />
              <FieldDisplay
                label="Calendar Type"
                value={calData.caltype}
                required={true}
              />
              <FieldDisplay
                label="Calendar Quantity"
                value={calData.calqty}
                required={true}
              />
              <FieldDisplay
                label="Calendar Unit Price"
                value={calData.calunit}
                required={true}
              />
              <FieldDisplay
                label="Calendar Total Amount"
                value={calData.calamt}
                required={true}
              />
              <FieldDisplay
                label="Payment Reference"
                value={calData.paymtref}
                required={true}
              />
              <FieldDisplay
                label="Payment Amount"
                value={calData.paymtamt}
                required={true}
              />
              <FieldDisplay
                label="Payment Form"
                value={calData.paymtform}
                required={true}
              />
              <FieldDisplay
                label="Payment Date"
                value={calData.paymtdate}
                required={true}
              />
              <FieldDisplay label="Remarks" value={calData.remarks} />
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
            {isEditMode ? "Confirm Update" : "Confirm Submission"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationSummaryDialog;
