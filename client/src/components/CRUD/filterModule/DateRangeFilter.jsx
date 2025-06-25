import { useMemo } from 'react';

const DateRangeFilter = ({ filterData, handleChange, months, hasOnlyNonWMMRoles }) => {
  // Memoize the month options to prevent unnecessary re-renders
  const monthOptions = useMemo(() => (
    months.map((month) => (
      <option key={month.value} value={month.value}>
        {month.name}
      </option>
    ))
  ), [months]);

  // Memoize the date encoded section
  const dateEncodedSection = useMemo(() => (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Date Encoded/Added</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            From:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <div className="relative">
              <select
                id="startDateMonth"
                name="startDateMonth"
                value={filterData.startDateMonth}
                onChange={handleChange}
                className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Month</option>
                {monthOptions}
              </select>
            </div>
            <input
              type="text"
              id="startDateDay"
              name="startDateDay"
              value={filterData.startDateDay}
              onChange={handleChange}
              placeholder="DD"
              className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              maxLength="2"
            />
            <input
              type="text"
              id="startDateYear"
              name="startDateYear"
              value={filterData.startDateYear}
              onChange={handleChange}
              placeholder="YYYY"
              className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              maxLength="4"
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            To:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <div className="relative">
              <select
                id="endDateMonth"
                name="endDateMonth"
                value={filterData.endDateMonth}
                onChange={handleChange}
                className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Month</option>
                {monthOptions}
              </select>
            </div>
            <input
              type="text"
              id="endDateDay"
              name="endDateDay"
              value={filterData.endDateDay}
              onChange={handleChange}
              placeholder="DD"
              className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              maxLength="2"
            />
            <input
              type="text"
              id="endDateYear"
              name="endDateYear"
              value={filterData.endDateYear}
              onChange={handleChange}
              placeholder="YYYY"
              className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              maxLength="4"
            />
          </div>
        </div>
      </div>
    </div>
  ), [filterData.startDateMonth, filterData.startDateDay, filterData.startDateYear,
      filterData.endDateMonth, filterData.endDateDay, filterData.endDateYear,
      handleChange, monthOptions]);

  // Memoize the active subscriptions section
  const activeSubscriptionsSection = useMemo(() => (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Active Subscriptions
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            From:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <div className="relative">
              <select
                id="wmmActiveFromMonth"
                name="wmmActiveFromMonth"
                value={filterData.wmmActiveFromMonth}
                onChange={handleChange}
                className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Month</option>
                {monthOptions}
              </select>
            </div>
            <input
              type="text"
              id="wmmActiveFromDay"
              name="wmmActiveFromDay"
              value={filterData.wmmActiveFromDay}
              onChange={handleChange}
              placeholder="DD"
              className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              maxLength="2"
            />
            <input
              type="text"
              id="wmmActiveFromYear"
              name="wmmActiveFromYear"
              value={filterData.wmmActiveFromYear}
              onChange={handleChange}
              placeholder="YYYY"
              className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              maxLength="4"
            />
          </div>
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            To:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <div className="relative">
              <select
                id="wmmActiveToMonth"
                name="wmmActiveToMonth"
                value={filterData.wmmActiveToMonth}
                onChange={handleChange}
                className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Month</option>
                {monthOptions}
              </select>
            </div>
            <input
              type="text"
              id="wmmActiveToDay"
              name="wmmActiveToDay"
              value={filterData.wmmActiveToDay}
              onChange={handleChange}
              placeholder="DD"
              className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              maxLength="2"
            />
            <input
              type="text"
              id="wmmActiveToYear"
              name="wmmActiveToYear"
              value={filterData.wmmActiveToYear}
              onChange={handleChange}
              placeholder="YYYY"
              className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              maxLength="4"
            />
          </div>
        </div>
      </div>
    </div>
  ), [filterData.wmmActiveFromMonth, filterData.wmmActiveFromDay, filterData.wmmActiveFromYear,
      filterData.wmmActiveToMonth, filterData.wmmActiveToDay, filterData.wmmActiveToYear,
      handleChange, monthOptions]);

  // Memoize the expiring subscriptions section
  const expiringSubscriptionsSection = useMemo(() => (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Expiring Subscriptions
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            From:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <div className="relative">
              <select
                id="wmmExpiringFromMonth"
                name="wmmExpiringFromMonth"
                value={filterData.wmmExpiringFromMonth}
                onChange={handleChange}
                className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Month</option>
                {monthOptions}
              </select>
            </div>
            <input
              type="text"
              id="wmmExpiringFromDay"
              name="wmmExpiringFromDay"
              value={filterData.wmmExpiringFromDay}
              onChange={handleChange}
              placeholder="DD"
              className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              maxLength="2"
            />
            <input
              type="text"
              id="wmmExpiringFromYear"
              name="wmmExpiringFromYear"
              value={filterData.wmmExpiringFromYear}
              onChange={handleChange}
              placeholder="YYYY"
              className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              maxLength="4"
            />
          </div>
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-2">
            To:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <div className="relative">
              <select
                id="wmmExpiringToMonth"
                name="wmmExpiringToMonth"
                value={filterData.wmmExpiringToMonth}
                onChange={handleChange}
                className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Month</option>
                {monthOptions}
              </select>
            </div>
            <input
              type="text"
              id="wmmExpiringToDay"
              name="wmmExpiringToDay"
              value={filterData.wmmExpiringToDay}
              onChange={handleChange}
              placeholder="DD"
              className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              maxLength="2"
            />
            <input
              type="text"
              id="wmmExpiringToYear"
              name="wmmExpiringToYear"
              value={filterData.wmmExpiringToYear}
              onChange={handleChange}
              placeholder="YYYY"
              className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              maxLength="4"
            />
          </div>
        </div>
      </div>
    </div>
  ), [filterData.wmmExpiringFromMonth, filterData.wmmExpiringFromDay, filterData.wmmExpiringFromYear,
      filterData.wmmExpiringToMonth, filterData.wmmExpiringToDay, filterData.wmmExpiringToYear,
      handleChange, monthOptions]);

  return (
    <div className="p-4 bg-gray-50 rounded-lg shadow-sm">
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        Date Ranges
      </h2>
      <div className="space-y-6">
        {dateEncodedSection}

        {/* Hide subscription date filters for HRG, FOM, CAL roles without WMM */}
        {!hasOnlyNonWMMRoles() && (
          <>
            {activeSubscriptionsSection}
            {expiringSubscriptionsSection}
          </>
        )}
      </div>
    </div>
  );
};

export default DateRangeFilter; 