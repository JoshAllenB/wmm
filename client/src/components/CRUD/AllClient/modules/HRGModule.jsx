import React from "react";
import InputField from "../../input.jsx";

const HRGModule = ({ hrgData, handleHrgChange }) => {
  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="bg-green-600 p-2 font-bold text-center text-white">
        HRG Subscription
      </h2>

      <div className="mt-4 space-y-4">
        <InputField
          label="HRG Reference:"
          id="hrgRef"
          name="hrgRef"
          value={hrgData.hrgRef || ""}
          onChange={handleHrgChange}
          className="w-full p-2 border rounded-md text-base"
        />
        <InputField
          label="HRG Amount:"
          id="hrgAmount"
          name="hrgAmount"
          value={hrgData.hrgAmount || ""}
          onChange={handleHrgChange}
          className="w-full p-2 border rounded-md text-base"
        />
        <InputField
          label="HRG Remarks:"
          id="hrgRemarks"
          name="hrgRemarks"
          value={hrgData.hrgRemarks || ""}
          onChange={handleHrgChange}
          type="textarea"
          className="w-full p-2 border rounded-md text-base"
        />
      </div>
    </div>
  );
};

export default HRGModule;
