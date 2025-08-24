import React from "react";
import InputField from "../../input.jsx";

const PromoModule = ({ formData, handleChange }) => {
  return (
    <div className="mt-4">
      <InputField
        label="Referral ID:"
        id="referralid"
        name="referralid"
        value={formData.referralid}
        onChange={handleChange}
        className="w-full p-2 border rounded-md text-base"
        placeholder="Enter referral ID"
      />
    </div>
  );
};

export default PromoModule;
