import React from "react";
import InputField from "../../input.jsx";

const ContactInfoModule = ({ formData, handleChange }) => {
  return (
    <div className="p-4">
      <h2 className="text-black text-lg font-bold mb-4 border-b">
        Contact Information
      </h2>
      <div className="space-y-3">
        <InputField
          label="Contact Numbers:"
          id="contactnos"
          name="contactnos"
          value={formData.contactnos || ""}
          onChange={handleChange}
          uppercase={true}
          className="text-base"
        />
        <InputField
          label="Cell Number:"
          id="cellno"
          name="cellno"
          value={formData.cellno || ""}
          onChange={handleChange}
          uppercase={true}
          className="text-base"
        />
        <InputField
          label="Office Number:"
          id="ofcno"
          name="ofcno"
          value={formData.ofcno || ""}
          onChange={handleChange}
          uppercase={true}
          className="text-base"
        />
        <InputField
          label="Email:"
          id="email"
          name="email"
          value={formData.email || ""}
          onChange={handleChange}
          type="email"
          className="text-base"
        />
        <InputField
          label="Remarks:"
          id="remarks"
          name="remarks"
          value={formData.remarks || ""}
          onChange={handleChange}
          type="textarea"
          uppercase={true}
          className="w-full p-2 border rounded-md text-base"
        />
      </div>
    </div>
  );
};

export default ContactInfoModule;
