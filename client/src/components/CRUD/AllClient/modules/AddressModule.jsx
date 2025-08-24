import React from "react";
import InputField from "../../input.jsx";
import AreaForm from "../../../../utils/areaform.jsx";

const AddressModule = ({
  addressData,
  handleAddressChange,
  handleAreaChange,
  areas,
  formData,
  areaData,
  combinedAddress,
  handleCombinedAddressChange,
  handleCombinedAddressFocus,
  handleCombinedAddressBlur,
  isEditingCombinedAddress,
}) => {
  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
        Address Information
      </h2>
      <div className="space-y-3">
        <InputField
          label="House/Building Number & Street Name:"
          id="housestreet"
          name="housestreet"
          value={addressData.housestreet || ""}
          onChange={(e) => handleAddressChange("housestreet", e.target.value)}
          uppercase={true}
          className="text-base"
          autoComplete="off"
        />
        <InputField
          label="Subdivision/Compound Name:"
          id="subdivision"
          name="subdivision"
          value={addressData.subdivision || ""}
          onChange={(e) => handleAddressChange("subdivision", e.target.value)}
          uppercase={true}
          className="text-base"
          autoComplete="off"
        />
        <InputField
          label="Barangay:"
          id="barangay"
          name="barangay"
          value={addressData.barangay || ""}
          onChange={(e) => handleAddressChange("barangay", e.target.value)}
          uppercase={true}
          className="text-base"
          autoComplete="off"
        />
        {areas && (
          <AreaForm
            onAreaChange={handleAreaChange}
            initialAreaData={{
              acode: formData.acode || areaData.acode || "",
              zipcode: formData.zipcode || areaData.zipcode || "",
              city: formData.area || areaData.city || addressData.city || "",
            }}
            areas={areas}
          />
        )}
        <div className="mt-4">
          <InputField
            label="Address Preview:"
            id="combinedAddress"
            name="combinedAddress"
            value={combinedAddress || ""}
            type="textarea"
            onChange={handleCombinedAddressChange}
            onFocus={handleCombinedAddressFocus}
            onBlur={handleCombinedAddressBlur}
            uppercase={true}
            className="w-full h-[160px] p-2 border rounded-md text-base whitespace-pre-line"
          />
        </div>
      </div>
    </div>
  );
};

export default AddressModule;
