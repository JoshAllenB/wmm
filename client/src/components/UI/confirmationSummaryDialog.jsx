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

  // Helper component for displaying field values
  const FieldDisplay = ({ label, value, className = "" }) => {
    if (!value) return null;
    return (
      <div className={`flex ${className}`}>
        <span className="font-semibold min-w-[120px]">{label}:</span>
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
        description: "Client added successfully!",
      });
      // Close the confirmation dialog after successful submission
      setShowConfirmation(false);
      // Also close the main modal after a short delay to ensure smooth transition
      setTimeout(() => {
        console.log("Closing main modal");
        closeModal();
      }, 100);
    } catch (error) {
      console.error("Error in handleSubmitWithFeedback:", error);
      // Handle error case
      toast({
        title: "Error",
        description: "Failed to add client. Please try again.",
        variant: "destructive",
      });
      // Don't close the dialog on error, let user retry
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-4">Confirm Submission</h3>
        <p className="mb-6 text-gray-600">
          Please review the information below before submitting.
        </p>

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

          {/* Subscription Information */}
          {subscriptionType && (
            <>
              <SectionHeader title={`${subscriptionType} Subscription`} />
              <FieldDisplay
                label="Subscription Class"
                value={formData.subsclass}
              />
              <FieldDisplay label="Start Date" value={startDate} />
              <FieldDisplay label="End Date" value={endDate} />
              <FieldDisplay
                label="Duration"
                value={
                  formData.subscriptionFreq
                    ? `${formData.subscriptionFreq} months`
                    : ""
                }
              />
              <FieldDisplay label="Copies" value={roleSpecificData.copies} />

              {/* WMM Specific Fields */}
              {subscriptionType === "WMM" && (
                <>
                  <FieldDisplay
                    label="Payment Reference"
                    value={roleSpecificData.paymtref}
                  />
                  <FieldDisplay
                    label="Payment Amount"
                    value={roleSpecificData.paymtamt}
                  />
                  <FieldDisplay
                    label="Payment Masses"
                    value={roleSpecificData.paymtmasses}
                  />
                  <FieldDisplay
                    label="Donor ID"
                    value={roleSpecificData.donorid}
                  />
                </>
              )}

              {/* Promo Specific Field */}
              {subscriptionType === "Promo" && (
                <FieldDisplay label="Referral ID" value={formData.referralid} />
              )}

              <FieldDisplay label="Remarks" value={roleSpecificData.remarks} />
            </>
          )}

          {/* Role Specific Information */}
          {selectedRole && (
            <>
              <SectionHeader title={`${selectedRole} Information`} />
              {selectedRole === "HRG" && (
                <>
                  <FieldDisplay
                    label="Received Date"
                    value={roleSpecificData.recvdate}
                  />
                  <FieldDisplay
                    label="Campaign Date"
                    value={roleSpecificData.campaigndate}
                  />
                  <FieldDisplay
                    label="Payment Reference"
                    value={roleSpecificData.paymtref}
                  />
                  <FieldDisplay
                    label="Payment Amount"
                    value={roleSpecificData.paymtamt}
                  />
                  <FieldDisplay
                    label="Unsubscribe"
                    value={roleSpecificData.unsubscribe ? "Yes" : "No"}
                  />
                </>
              )}
              {selectedRole === "FOM" && (
                <>
                  <FieldDisplay
                    label="Received Date"
                    value={roleSpecificData.recvdate}
                  />
                  <FieldDisplay
                    label="Payment Reference"
                    value={roleSpecificData.paymtref}
                  />
                  <FieldDisplay
                    label="Payment Amount"
                    value={roleSpecificData.paymtamt}
                  />
                  <FieldDisplay
                    label="Payment Form"
                    value={roleSpecificData.paymtform}
                  />
                  <FieldDisplay
                    label="Unsubscribe"
                    value={roleSpecificData.unsubscribe ? "Yes" : "No"}
                  />
                </>
              )}
              {selectedRole === "CAL" && (
                <>
                  <FieldDisplay
                    label="Received Date"
                    value={roleSpecificData.recvdate}
                  />
                  <FieldDisplay
                    label="Calendar Type"
                    value={roleSpecificData.caltype}
                  />
                  <FieldDisplay
                    label="Calendar Quantity"
                    value={roleSpecificData.calqty}
                  />
                  <FieldDisplay
                    label="Calendar Amount"
                    value={roleSpecificData.calamt}
                  />
                  <FieldDisplay
                    label="Payment Reference"
                    value={roleSpecificData.paymtref}
                  />
                  <FieldDisplay
                    label="Payment Amount"
                    value={roleSpecificData.paymtamt}
                  />
                  <FieldDisplay
                    label="Payment Form"
                    value={roleSpecificData.paymtform}
                  />
                  <FieldDisplay
                    label="Payment Date"
                    value={roleSpecificData.paymtdate}
                  />
                </>
              )}
              <FieldDisplay label="Remarks" value={roleSpecificData.remarks} />
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
            Confirm Submission
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationSummaryDialog;
