import { useEffect } from "react";
import InputField from "../../input.jsx";

const CommonSubscriptionFields = ({
  formData,
  roleSpecificData,
  handleChange,
  handleRoleSpecificChange,
  months,
}) => {
  // Function to calculate end date with April/May always treated as one month
  const calculateEndDate = () => {
    const { subStartMonth, subStartDay, subStartYear, subscriptionFreq } =
      formData;

    if (!subStartMonth || !subStartDay || !subStartYear || !subscriptionFreq)
      return;

    const startMonth = parseInt(subStartMonth);
    const startDay = parseInt(subStartDay);
    const startYear = parseInt(subStartYear);
    const frequency = parseInt(subscriptionFreq);

    if (
      isNaN(startMonth) ||
      isNaN(startDay) ||
      isNaN(startYear) ||
      isNaN(frequency)
    )
      return;

    let currentMonth = startMonth;
    let currentYear = startYear;
    let monthsRemaining = frequency;

    // Count the starting month
    if (monthsRemaining > 0) {
      monthsRemaining--;
    }

    // Add remaining months, skipping May entirely
    while (monthsRemaining > 0) {
      currentMonth++;

      // Always skip May (April/May are treated as one month)
      if (currentMonth === 5) {
        currentMonth = 6; // Skip from April to June
      }

      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }

      monthsRemaining--;
    }

    // Handle day overflow
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const endDay = Math.min(startDay, daysInMonth);

    // Update form data
    handleChange({
      target: {
        name: "subEndMonth",
        value: currentMonth.toString().padStart(2, "0"),
      },
    });

    handleChange({
      target: {
        name: "subEndDay",
        value: endDay.toString().padStart(2, "0"),
      },
    });

    handleChange({
      target: {
        name: "subEndYear",
        value: currentYear.toString(),
      },
    });
  };

  // Calculate end date when start date or frequency changes
  useEffect(() => {
    if (
      formData.subStartMonth &&
      formData.subStartDay &&
      formData.subStartYear &&
      formData.subscriptionFreq
    ) {
      calculateEndDate();
    }
  }, [
    formData.subStartMonth,
    formData.subStartDay,
    formData.subStartYear,
    formData.subscriptionFreq,
  ]);

  // Rest of the component remains the same...
  return (
    <div className="flex flex-col">
      {/* Start Date */}
      <div>
        <label className="block text-lg font-bold mt-1">
          Subscription Start: <span className="text-red-500 ml-1">*</span>
        </label>
        <div className="grid grid-cols-3 gap-1">
          <div className="relative">
            <select
              id="subStartMonth"
              name="subStartMonth"
              value={formData.subStartMonth || ""}
              onChange={handleChange}
              className="w-full font-bold text-base border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
            className="w-full font-bold text-base border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            maxLength="2"
          />
          <input
            type="text"
            id="subStartYear"
            name="subStartYear"
            value={formData.subStartYear || ""}
            onChange={handleChange}
            placeholder="YYYY"
            className="w-full font-bold text-base border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            maxLength="4"
          />
        </div>
      </div>

      {/* Subscription Duration */}
      <div>
        <label className="block text-lg font-bold mt-1">
          Subscription Duration: <span className="text-red-500 ml-1">*</span>
        </label>
        <select
          id="subscriptionFreq"
          name="subscriptionFreq"
          value={formData.subscriptionFreq}
          onChange={handleChange}
          className="w-full font-bold text-base border rounded-md border-gray-300 
               focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="">Select Subscription Duration</option>
          <option value="6">6 Months</option>
          <option value="11">1 Year</option>
          <option value="22">2 Years</option>
          <option value="others">Others</option>
        </select>
      </div>

      {/* End Date */}
      <div className="mb-2">
        <label className="block text-lg font-bold mt-1">
          Subscription End: <span className="text-red-500 ml-1">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          <div className="relative">
            <select
              id="subEndMonth"
              name="subEndMonth"
              value={formData.subEndMonth || ""}
              onChange={handleChange}
              className="w-full font-bold text-base border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
            className="w-full font-bold text-base border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            maxLength="2"
          />
          <input
            type="text"
            id="subEndYear"
            name="subEndYear"
            value={formData.subEndYear || ""}
            onChange={handleChange}
            placeholder="YYYY"
            className="w-full font-bold text-base border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            maxLength="4"
          />
        </div>
      </div>

      {/* Copies and Calendar */}
      <div className="flex space-x-2 items-center">
        <div className="flex flex-row items-center justify-center">
          <label className="block text-lg font-bold mt-1">Copies:</label>
          <input
            id="copies"
            name="copies"
            value={roleSpecificData.copies}
            onChange={handleRoleSpecificChange}
            type="number"
            min="1"
            className="w-[50px] rounded-md border border-gray-300 px-2 
                 text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-300 text-base"
          />
          <span className="text-red-500 ml-1">*</span>
        </div>
        <div className="flex items-center">
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

      {/* Remarks field */}
      <div>
        <InputField
          label="Remarks:"
          id="remarks"
          name="remarks"
          value={roleSpecificData.remarks}
          onChange={handleRoleSpecificChange}
          type="textarea"
          className="w-full border rounded-md text-base"
        />
      </div>
    </div>
  );
};

export default CommonSubscriptionFields;
