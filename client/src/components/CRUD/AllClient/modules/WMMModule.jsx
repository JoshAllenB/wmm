import React from "react";
import InputField from "../../input.jsx";
import DonorAdd from "../../donorAdd.jsx";

const WMMModule = ({
  roleSpecificData,
  handleRoleSpecificChange,
  handleNewDonorAdded,
  subclasses,
}) => {
  return (
    <>
      <div className="mt-2">
        <label className="block text-LG font-bold">
          Subscription Classification: <span className="text-red-500">*</span>
        </label>
        <select
          id="subsclass"
          name="subsclass"
          value={roleSpecificData.subsclass || ""}
          onChange={handleRoleSpecificChange}
          className="w-full p-2 border focus:border-blue-500 ring-2 focus:ring-blue-500 rounded-md font-bold"
        >
          <option value="">Select a classification</option>
          {subclasses.map((subclass) => (
            <option key={subclass.id} value={subclass.id}>
              {subclass.name} ({subclass.id})
            </option>
          ))}
        </select>
      </div>
      <div>
        <InputField
          label="Payment Reference:"
          id="paymtref"
          name="paymtref"
          value={roleSpecificData.paymtref}
          onChange={handleRoleSpecificChange}
          className="w-full p-2 border rounded-md text-base"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
        </div>
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 mt-1">
          Either Payment Amount or Masses is required to proceed.
        </p>
        <div>
          <label className="block text-black text-lg font-bold">Donor:</label>
          <div className="donor-add-container">
            <DonorAdd
              selectedDonorId={roleSpecificData.donorid}
              onDonorSelect={(donorId) => {
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
