import React from "react";
import InputField from "../../input.jsx";
import DonorAdd from "../../donorAdd.jsx";

const WMMModule = ({
  formData,
  roleSpecificData,
  handleChange,
  handleRoleSpecificChange,
  handleNewDonorAdded,
  subclasses,
  months,
  subscriptionType,
}) => {
  return (
    <>
      <div className="mt-4 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Subscription Classification:{" "}
          <span className="text-red-500 ml-1">*</span>
        </label>
        <select
          id="subsclass"
          name="subsclass"
          value={formData.subsclass}
          onChange={handleChange}
          className="w-full p-2 border rounded-md text-base"
        >
          <option value="">Select a classification</option>
          {subclasses.map((subclass) => (
            <option key={subclass.id} value={subclass.id}>
              {subclass.name} ({subclass.id})
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 space-y-4">
        <InputField
          label="Payment Reference:"
          id="paymtref"
          name="paymtref"
          value={roleSpecificData.paymtref}
          onChange={handleRoleSpecificChange}
          className="w-full p-2 border rounded-md text-base"
        />
        <InputField
          label="Payment Amount:"
          id="paymtamt"
          name="paymtamt"
          value={roleSpecificData.paymtamt}
          onChange={handleRoleSpecificChange}
          className="w-full p-2 border rounded-md text-base"
        />
        <InputField
          label="Payment Masses:"
          id="paymtmasses"
          name="paymtmasses"
          value={roleSpecificData.paymtmasses}
          onChange={handleRoleSpecificChange}
          className="w-full p-2 border rounded-md text-base"
        />
        <div className="mb-4">
          <label className="block text-black text-xl mb-1">Donor:</label>
          <div className="donor-add-container">
            <DonorAdd
              onDonorSelect={(donorId) => {
                console.log("Donor ID selected:", donorId);
                handleRoleSpecificChange({
                  target: {
                    name: "donorid",
                    value: donorId || "",
                  },
                });
              }}
              onNewDonorAdded={handleNewDonorAdded}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default WMMModule;
