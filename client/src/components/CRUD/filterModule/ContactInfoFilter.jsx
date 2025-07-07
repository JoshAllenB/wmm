import { useMemo } from 'react';
import InputField from "../input";

const ContactInfoFilter = ({ filterData, handleChange, hasRole }) => {
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

      {/* Calendar Filter Section - Only show for WMM role */}
      {hasRole && hasRole("WMM") && (
        <div className="mt-4 p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Calendar Status:</h3>
          <div className="flex gap-4 text-base font-medium">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="calendarReceived"
                checked={filterData.calendarReceived || false}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span>Calendar Received</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="calendarNotReceived"
                checked={filterData.calendarNotReceived || false}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span>Calendar Not Received</span>
            </label>
          </div>
        </div>
      )}
    </div>
  ), [
    filterData.email,
    filterData.cellno,
    filterData.ofcno,
    filterData.contactnos,
    filterData.address,
    filterData.calendarReceived,
    filterData.calendarNotReceived,
    handleChange,
    hasRole
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