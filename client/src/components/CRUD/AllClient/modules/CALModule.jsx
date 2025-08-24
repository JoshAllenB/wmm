import React from "react";
import InputField from "../../input.jsx";

const CALModule = ({ calData, handleCalChange }) => {
  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="bg-orange-600 p-2 font-bold text-center text-white">
        CAL Subscription
      </h2>

      <div className="mt-4 space-y-4">
        <InputField
          label="CAL Reference:"
          id="calRef"
          name="calRef"
          value={calData.calRef || ""}
          onChange={handleCalChange}
          className="w-full p-2 border rounded-md text-base"
        />
        <InputField
          label="CAL Amount:"
          id="calAmount"
          name="calAmount"
          value={calData.calAmount || ""}
          onChange={handleCalChange}
          className="w-full p-2 border rounded-md text-base"
        />
        <InputField
          label="CAL Remarks:"
          id="calRemarks"
          name="calRemarks"
          value={calData.calRemarks || ""}
          onChange={handleCalChange}
          type="textarea"
          className="w-full p-2 border rounded-md text-base"
        />
      </div>
    </div>
  );
};

export default CALModule;
