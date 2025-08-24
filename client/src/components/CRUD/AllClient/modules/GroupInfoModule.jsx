import React from "react";
import InputField from "../../input.jsx";

const GroupInfoModule = ({ formData, handleChange, types, groups }) => {
  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
        Group Information
      </h2>
      <div className="space-y-3">
        <div className="relative w-full">
          <label className="block text-black text-base mb-1">Type:</label>
          <select
            id="type"
            name="type"
            value={formData.type || ""}
            onChange={handleChange}
            className="w-full p-2 text-base border rounded-md border-gray-300"
          >
            <option value="">Select a type</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.id} - {type.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full">
          <label className="block text-black text-base mb-1">Group:</label>
          <select
            id="group"
            name="group"
            value={formData.group || ""}
            onChange={handleChange}
            className="w-full p-2 text-base border rounded-md border-gray-300"
          >
            <option value="">Select a group</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.id} - {group.name}
              </option>
            ))}
          </select>
        </div>

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

export default GroupInfoModule;
