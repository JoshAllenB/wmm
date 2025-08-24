import React from "react";
import InputField from "../../input.jsx";

const CommonSubscriptionFields = ({
  formData,
  roleSpecificData,
  handleChange,
  handleRoleSpecificChange,
  months,
}) => {
  return (
    <>
      {/* Start Date - Common for all types */}
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Subscription Start: <span className="text-red-500 ml-1">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          <div className="relative">
            <select
              id="subStartMonth"
              name="subStartMonth"
              value={formData.subStartMonth || ""}
              onChange={handleChange}
              className="w-full p-2 text-base border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Month</option>
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.name}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            id="subStartDay"
            name="subStartDay"
            value={formData.subStartDay || ""}
            onChange={handleChange}
            placeholder="DD"
            className="w-full p-2 text-base border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            maxLength="2"
          />
          <input
            type="text"
            id="subStartYear"
            name="subStartYear"
            value={formData.subStartYear || ""}
            onChange={handleChange}
            placeholder="YYYY"
            className="w-full p-2 text-base border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            maxLength="4"
          />
        </div>
      </div>

      {/* Common fields for all subscription types */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Subscription Duration: <span className="text-red-500 ml-1">*</span>
        </label>
        <select
          id="subscriptionFreq"
          name="subscriptionFreq"
          value={formData.subscriptionFreq}
          onChange={handleChange}
          className="w-full p-2 border rounded-md text-base"
        >
          <option value="">Select Subscription Duration</option>
          <option value="6">6 Months</option>
          <option value="11">1 Year</option>
          <option value="22">2 Years</option>
          <option value="others">Others</option>
        </select>
      </div>

      {/* End Date - Common for all types */}
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Subscription End: <span className="text-red-500 ml-1">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          <div className="relative">
            <select
              id="subEndMonth"
              name="subEndMonth"
              value={formData.subEndMonth || ""}
              onChange={handleChange}
              className="w-full p-2 text-base border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Month</option>
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.name}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            id="subEndDay"
            name="subEndDay"
            value={formData.subEndDay || ""}
            onChange={handleChange}
            placeholder="DD"
            className="w-full p-2 text-base border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            maxLength="2"
          />
          <input
            type="text"
            id="subEndYear"
            name="subEndYear"
            value={formData.subEndYear || ""}
            onChange={handleChange}
            placeholder="YYYY"
            className="w-full p-2 text-base border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            maxLength="4"
          />
        </div>
      </div>

      {/* Common fields for copies and calendar */}
      <div className="flex space-x-4 mb-4">
        <div className="flex flex-row items-center justify-center gap-2">
          <label className="block text-lg font-medium leading-6 text-black">
            Copies: <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            id="copies"
            name="copies"
            value={roleSpecificData.copies}
            onChange={handleRoleSpecificChange}
            type="number"
            min="1"
            className="block w-[80px] rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-2 ring-gray-300 placeholder:text-gray-300 focus:ring-3 p-3 text-base"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="calendar" className="text-lg font-medium">
            Calendar Received:
          </label>
          <input
            type="checkbox"
            id="calendar"
            name="calendar"
            checked={roleSpecificData.calendar || false}
            onChange={handleRoleSpecificChange}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Remarks field - Common for all types */}
      <div className="mt-4">
        <InputField
          label="Remarks:"
          id="remarks"
          name="remarks"
          value={roleSpecificData.remarks}
          onChange={handleRoleSpecificChange}
          type="textarea"
          className="w-full p-2 border rounded-md text-base"
        />
      </div>
    </>
  );
};

export default CommonSubscriptionFields;
