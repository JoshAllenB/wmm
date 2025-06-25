import { useMemo } from 'react';
import InputField from "../input";

const ContactInfoFilter = ({ filterData, handleChange }) => {
  // Memoize the input fields to prevent unnecessary re-renders
  const inputFields = useMemo(() => (
    <div className="space-y-2">
      <InputField
        label="Email Address"
        id="email"
        name="email"
        type="email"
        value={filterData.email}
        onChange={handleChange}
        className={`w-full text-base ${
          filterData.email ? "border-blue-500 bg-blue-50" : ""
        }`}
        labelClassName="text-lg font-medium text-black"
      />
      <div className="grid grid-cols-2 gap-2">
        <InputField
          label="Cell Number"
          id="cellno"
          name="cellno"
          value={filterData.cellno}
          onChange={handleChange}
          className={`w-full text-base ${
            filterData.cellno ? "border-blue-500 bg-blue-50" : ""
          }`}
          labelClassName="text-lg font-medium text-black"
        />
        <InputField
          label="Office Number"
          id="ofcno"
          name="ofcno"
          value={filterData.ofcno}
          onChange={handleChange}
          className={`w-full text-base ${
            filterData.ofcno ? "border-blue-500 bg-blue-50" : ""
          }`}
          labelClassName="text-lg font-medium text-black"
        />
      </div>
      <InputField
        label="Other Contact"
        id="contactnos"
        name="contactnos"
        value={filterData.contactnos}
        onChange={handleChange}
        className={`w-full text-base ${
          filterData.contactnos ? "border-blue-500 bg-blue-50" : ""
        }`}
        labelClassName="text-lg font-medium text-black"
      />
      <div className="space-y-2">
        <label className="block text-lg font-medium text-black">
          Full Address
        </label>
        <textarea
          id="address"
          name="address"
          className={`w-full p-2 text-base border rounded-md focus:ring-2 focus:ring-blue-500 min-h-[120px] ${
            filterData.address ? "border-blue-500 bg-blue-50" : "border-gray-300"
          }`}
          value={filterData.address}
          onChange={handleChange}
        />
      </div>
    </div>
  ), [
    filterData.email,
    filterData.cellno,
    filterData.ofcno,
    filterData.contactnos,
    filterData.address,
    handleChange
  ]);

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
        Contact Information
      </h2>
      {inputFields}
    </div>
  );
};

export default ContactInfoFilter; 