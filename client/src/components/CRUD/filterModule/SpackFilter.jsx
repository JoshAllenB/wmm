import React from "react";

const SpackFilter = ({ filterData, handleChange }) => {
  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
        SPack Status
      </h2>
      <div className="flex gap-5">
        <div className="flex items-center">
          <input
            type="checkbox"
            name="spackReceived"
            id="spackReceived"
            checked={filterData.spackReceived}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="calendarReceived" className="ml-2 text-lg text-black">
            SPack Client
          </label>
        </div>
      </div>
    </div>
  );
};

export default SpackFilter; 