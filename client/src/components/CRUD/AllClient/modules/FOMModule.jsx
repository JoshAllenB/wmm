import React from "react";
import InputField from "../../input.jsx";

const FOMModule = ({ fomData, handleFomChange }) => {
  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="bg-purple-600 p-2 font-bold text-center text-white">
        FOM Subscription
      </h2>

      <div className="mt-4 space-y-4">
        <InputField
          label="FOM Reference:"
          id="fomRef"
          name="fomRef"
          value={fomData.fomRef || ""}
          onChange={handleFomChange}
          className="w-full p-2 border rounded-md text-base"
        />
        <InputField
          label="FOM Amount:"
          id="fomAmount"
          name="fomAmount"
          value={fomData.fomAmount || ""}
          onChange={handleFomChange}
          className="w-full p-2 border rounded-md text-base"
        />
        <InputField
          label="FOM Remarks:"
          id="fomRemarks"
          name="fomRemarks"
          value={fomData.fomRemarks || ""}
          onChange={handleFomChange}
          type="textarea"
          className="w-full p-2 border rounded-md text-base"
        />
      </div>
    </div>
  );
};

export default FOMModule;
