import { useMemo } from "react";

const DateRangeFilter = ({
  filterData,
  handleChange,
  months,
  hasOnlyNonWMMRoles,
  hasRole,
}) => {
  // Memoize the month options to prevent unnecessary re-renders
  const monthOptions = useMemo(
    () =>
      months.map((month) => (
        <option key={month.value} value={month.value}>
          {month.name}
        </option>
      )),
    [months]
  );

  // Memoize the date encoded section
  const dateEncodedSection = useMemo(
    () => (
      <div className="p-4 bg-white rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Date Encoded/Added
        </h3>
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
    ),
    [
      filterData.startDateMonth,
      filterData.startDateDay,
      filterData.startDateYear,
      filterData.endDateMonth,
      filterData.endDateDay,
      filterData.endDateYear,
      handleChange,
      monthOptions,
    ]
  );

  // Memoize the active subscriptions section
  const activeSubscriptionsSection = useMemo(
    () => (
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
    ),
    [
      filterData.wmmActiveFromMonth,
      filterData.wmmActiveFromDay,
      filterData.wmmActiveFromYear,
      filterData.wmmActiveToMonth,
      filterData.wmmActiveToDay,
      filterData.wmmActiveToYear,
      handleChange,
      monthOptions,
    ]
  );

  // Memoize the copies section
  const copiesSection = useMemo(
    () => (
      <div className="p-4 bg-white rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Copies</h3>
        <div className="space-y-2">
          <select
            name="copiesRange"
            value={filterData.copiesRange}
            onChange={handleChange}
            className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">Select Range</option>
            <option value="1">1 Copy</option>
            <option value="2">2 Copies</option>
            <option value="gt1">More than 1</option>
            <option value="custom">Custom Amount</option>
          </select>
          {filterData.copiesRange === "custom" && (
            <div className="mt-2">
              <input
                type="number"
                name="customCopies"
                placeholder="Enter number of copies"
                value={filterData.customCopies || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  // Only allow positive integers
                  if (
                    value === "" ||
                    (/^\d+$/.test(value) && parseInt(value) > 0)
                  ) {
                    handleChange(e);
                  }
                }}
                min="1"
                className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter a specific number of copies
              </p>
            </div>
          )}
        </div>
      </div>
    ),
    [filterData.copiesRange, filterData.customCopies, handleChange]
  );

  // Memoize the expiring subscriptions section
  const expiringSubscriptionsSection = useMemo(
    () => (
      <div className="p-4 bg-white rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Expiring Subscriptions
        </h3>
        <div className="space-y-4">
          {/* Checkbox for expiry date range filtering */}
          <div className="flex items-center space-x-2 mb-4">
            <input
              type="checkbox"
              id="expiryDateRangeOnly"
              name="expiryDateRangeOnly"
              checked={filterData.expiryDateRangeOnly || false}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="expiryDateRangeOnly"
              className="text-sm font-medium text-gray-700"
            >
              Only show clients who haven't renewed beyond expiry date
            </label>
          </div>
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
    ),
    [
      filterData.wmmExpiringFromMonth,
      filterData.wmmExpiringFromDay,
      filterData.wmmExpiringFromYear,
      filterData.wmmExpiringToMonth,
      filterData.wmmExpiringToDay,
      filterData.wmmExpiringToYear,
      filterData.expiryDateRangeOnly,
      handleChange,
      monthOptions,
    ]
  );

  // Memoize the CAL Order Received section
  const calOrderReceivedSection = useMemo(
    () => (
      <div className="p-4 bg-white rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Order Received Date Range
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              From:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div className="relative">
                <select
                  id="calReceivedFromMonth"
                  name="calReceivedFromMonth"
                  value={filterData.calReceivedFromMonth}
                  onChange={handleChange}
                  className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Month</option>
                  {monthOptions}
                </select>
              </div>
              <input
                type="text"
                id="calReceivedFromDay"
                name="calReceivedFromDay"
                value={filterData.calReceivedFromDay}
                onChange={handleChange}
                placeholder="DD"
                className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                maxLength="2"
              />
              <input
                type="text"
                id="calReceivedFromYear"
                name="calReceivedFromYear"
                value={filterData.calReceivedFromYear}
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
                  id="calReceivedToMonth"
                  name="calReceivedToMonth"
                  value={filterData.calReceivedToMonth}
                  onChange={handleChange}
                  className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Month</option>
                  {monthOptions}
                </select>
              </div>
              <input
                type="text"
                id="calReceivedToDay"
                name="calReceivedToDay"
                value={filterData.calReceivedToDay}
                onChange={handleChange}
                placeholder="DD"
                className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                maxLength="2"
              />
              <input
                type="text"
                id="calReceivedToYear"
                name="calReceivedToYear"
                value={filterData.calReceivedToYear}
                onChange={handleChange}
                placeholder="YYYY"
                className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                maxLength="4"
              />
            </div>
          </div>
        </div>
      </div>
    ),
    [
      filterData.calReceivedFromMonth,
      filterData.calReceivedFromDay,
      filterData.calReceivedFromYear,
      filterData.calReceivedToMonth,
      filterData.calReceivedToDay,
      filterData.calReceivedToYear,
      handleChange,
      monthOptions,
    ]
  );

  // Memoize the CAL Payment Date section
  const calPaymentDateSection = useMemo(
    () => (
      <div className="p-4 bg-white rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Payment Date Range
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              From:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div className="relative">
                <select
                  id="calPaymentFromMonth"
                  name="calPaymentFromMonth"
                  value={filterData.calPaymentFromMonth}
                  onChange={handleChange}
                  className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Month</option>
                  {monthOptions}
                </select>
              </div>
              <input
                type="text"
                id="calPaymentFromDay"
                name="calPaymentFromDay"
                value={filterData.calPaymentFromDay}
                onChange={handleChange}
                placeholder="DD"
                className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                maxLength="2"
              />
              <input
                type="text"
                id="calPaymentFromYear"
                name="calPaymentFromYear"
                value={filterData.calPaymentFromYear}
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
                  id="calPaymentToMonth"
                  name="calPaymentToMonth"
                  value={filterData.calPaymentToMonth}
                  onChange={handleChange}
                  className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Month</option>
                  {monthOptions}
                </select>
              </div>
              <input
                type="text"
                id="calPaymentToDay"
                name="calPaymentToDay"
                value={filterData.calPaymentToDay}
                onChange={handleChange}
                placeholder="DD"
                className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                maxLength="2"
              />
              <input
                type="text"
                id="calPaymentToYear"
                name="calPaymentToYear"
                value={filterData.calPaymentToYear}
                onChange={handleChange}
                placeholder="YYYY"
                className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                maxLength="4"
              />
            </div>
          </div>
        </div>
      </div>
    ),
    [
      filterData.calPaymentFromMonth,
      filterData.calPaymentFromDay,
      filterData.calPaymentFromYear,
      filterData.calPaymentToMonth,
      filterData.calPaymentToDay,
      filterData.calPaymentToYear,
      handleChange,
      monthOptions,
    ]
  );

  // Memoize the HRG Payment Transaction section
  const hrgPaymentTransactionSection = useMemo(
    () => (
      <div className="p-4 bg-white rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Payment Transaction Date Range
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              From:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div className="relative">
                <select
                  id="hrgPaymentFromMonth"
                  name="hrgPaymentFromMonth"
                  value={filterData.hrgPaymentFromMonth}
                  onChange={handleChange}
                  className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Month</option>
                  {monthOptions}
                </select>
              </div>
              <input
                type="text"
                id="hrgPaymentFromDay"
                name="hrgPaymentFromDay"
                value={filterData.hrgPaymentFromDay}
                onChange={handleChange}
                placeholder="DD"
                className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                maxLength="2"
              />
              <input
                type="text"
                id="hrgPaymentFromYear"
                name="hrgPaymentFromYear"
                value={filterData.hrgPaymentFromYear}
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
                  id="hrgPaymentToMonth"
                  name="hrgPaymentToMonth"
                  value={filterData.hrgPaymentToMonth}
                  onChange={handleChange}
                  className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Month</option>
                  {monthOptions}
                </select>
              </div>
              <input
                type="text"
                id="hrgPaymentToDay"
                name="hrgPaymentToDay"
                value={filterData.hrgPaymentToDay}
                onChange={handleChange}
                placeholder="DD"
                className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                maxLength="2"
              />
              <input
                type="text"
                id="hrgPaymentToYear"
                name="hrgPaymentToYear"
                value={filterData.hrgPaymentToYear}
                onChange={handleChange}
                placeholder="YYYY"
                className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                maxLength="4"
              />
            </div>
          </div>
        </div>
      </div>
    ),
    [
      filterData.hrgPaymentFromMonth,
      filterData.hrgPaymentFromDay,
      filterData.hrgPaymentFromYear,
      filterData.hrgPaymentToMonth,
      filterData.hrgPaymentToDay,
      filterData.hrgPaymentToYear,
      handleChange,
      monthOptions,
    ]
  );

  // Memoize the HRG Campaign Date section
  const hrgCampaignDateSection = useMemo(
    () => (
      <div className="p-4 bg-white rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Campaign Date (HRG)
        </h3>
        <div className="space-y-4">
          {/* Single Month + Year */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Month & Year:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <select
                  id="hrgCampaignMonth"
                  name="hrgCampaignMonth"
                  value={filterData.hrgCampaignMonth || ""}
                  onChange={handleChange}
                  className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Month</option>
                  {monthOptions}
                </select>
              </div>
              <input
                type="text"
                id="hrgCampaignYear"
                name="hrgCampaignYear"
                value={filterData.hrgCampaignYear || ""}
                onChange={handleChange}
                placeholder="YYYY"
                className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                maxLength="4"
              />
            </div>
          </div>

          {/* Range: From Month/Year to Month/Year */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              From:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <select
                  id="hrgCampaignFromMonth"
                  name="hrgCampaignFromMonth"
                  value={filterData.hrgCampaignFromMonth || ""}
                  onChange={handleChange}
                  className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Month</option>
                  {monthOptions}
                </select>
              </div>
              <input
                type="text"
                id="hrgCampaignFromYear"
                name="hrgCampaignFromYear"
                value={filterData.hrgCampaignFromYear || ""}
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
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <select
                  id="hrgCampaignToMonth"
                  name="hrgCampaignToMonth"
                  value={filterData.hrgCampaignToMonth || ""}
                  onChange={handleChange}
                  className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Month</option>
                  {monthOptions}
                </select>
              </div>
              <input
                type="text"
                id="hrgCampaignToYear"
                name="hrgCampaignToYear"
                value={filterData.hrgCampaignToYear || ""}
                onChange={handleChange}
                placeholder="YYYY"
                className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                maxLength="4"
              />
            </div>
          </div>
        </div>
      </div>
    ),
    [
      filterData.hrgCampaignMonth,
      filterData.hrgCampaignYear,
      filterData.hrgCampaignFromMonth,
      filterData.hrgCampaignFromYear,
      filterData.hrgCampaignToMonth,
      filterData.hrgCampaignToYear,
      handleChange,
      monthOptions,
    ]
  );

  // Memoize the FOM Payment Transaction section
  const fomPaymentTransactionSection = useMemo(
    () => (
      <div className="p-4 bg-white rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Payment Transaction Date Range
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              From:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div className="relative">
                <select
                  id="fomPaymentFromMonth"
                  name="fomPaymentFromMonth"
                  value={filterData.fomPaymentFromMonth}
                  onChange={handleChange}
                  className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Month</option>
                  {monthOptions}
                </select>
              </div>
              <input
                type="text"
                id="fomPaymentFromDay"
                name="fomPaymentFromDay"
                value={filterData.fomPaymentFromDay}
                onChange={handleChange}
                placeholder="DD"
                className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                maxLength="2"
              />
              <input
                type="text"
                id="fomPaymentFromYear"
                name="fomPaymentFromYear"
                value={filterData.fomPaymentFromYear}
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
                  id="fomPaymentToMonth"
                  name="fomPaymentToMonth"
                  value={filterData.fomPaymentToMonth}
                  onChange={handleChange}
                  className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Month</option>
                  {monthOptions}
                </select>
              </div>
              <input
                type="text"
                id="fomPaymentToDay"
                name="fomPaymentToDay"
                value={filterData.fomPaymentToDay}
                onChange={handleChange}
                placeholder="DD"
                className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                maxLength="2"
              />
              <input
                type="text"
                id="fomPaymentToYear"
                name="fomPaymentToYear"
                value={filterData.fomPaymentToYear}
                onChange={handleChange}
                placeholder="YYYY"
                className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                maxLength="4"
              />
            </div>
          </div>
        </div>
      </div>
    ),
    [
      filterData.fomPaymentFromMonth,
      filterData.fomPaymentFromDay,
      filterData.fomPaymentFromYear,
      filterData.fomPaymentToMonth,
      filterData.fomPaymentToDay,
      filterData.fomPaymentToYear,
      handleChange,
      monthOptions,
    ]
  );

  // Memoize the role selector section
  const roleSelectorSection = useMemo(() => {
    // Only show selector if user has multiple roles
    const hasMultipleRoles =
      ["HRG", "CAL", "FOM"].filter((role) => hasRole(role)).length > 1;

    if (!hasMultipleRoles) return null;

    return (
      <div className="p-2 bg-white rounded-lg border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Select Role for Date Filters
        </h3>
        <div className="flex gap-2">
          {hasRole("HRG") && (
            <button
              type="button"
              onClick={() =>
                handleChange({
                  target: { name: "selectedDateFilterRole", value: "HRG" },
                })
              }
              className={`px-4 py-2 rounded-md ${
                filterData.selectedDateFilterRole === "HRG"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              HRG
            </button>
          )}
          {hasRole("CAL") && (
            <button
              type="button"
              onClick={() =>
                handleChange({
                  target: { name: "selectedDateFilterRole", value: "CAL" },
                })
              }
              className={`px-4 py-2 rounded-md ${
                filterData.selectedDateFilterRole === "CAL"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              CAL
            </button>
          )}
          {hasRole("FOM") && (
            <button
              type="button"
              onClick={() =>
                handleChange({
                  target: { name: "selectedDateFilterRole", value: "FOM" },
                })
              }
              className={`px-4 py-2 rounded-md ${
                filterData.selectedDateFilterRole === "FOM"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              FOM
            </button>
          )}
        </div>
      </div>
    );
  }, [hasRole, filterData.selectedDateFilterRole, handleChange]);

  return (
    <div className="p-4 bg-gray-50 rounded-lg shadow-sm">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Date Ranges</h2>
      <div className="space-y-6">
        {/* Role Selector */}
        {roleSelectorSection}

        {/* Show role-specific date filters based on selected role */}
        {hasRole("HRG") && filterData.selectedDateFilterRole === "HRG" && (
          <>
            {hrgPaymentTransactionSection}
            {hrgCampaignDateSection}
          </>
        )}

        {hasRole("CAL") && filterData.selectedDateFilterRole === "CAL" && (
          <>
            {calOrderReceivedSection}
            {calPaymentDateSection}
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Calendar Year (CAL)
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Year:
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <input
                      type="text"
                      id="calYear"
                      name="calYear"
                      value={filterData.calYear || ""}
                      onChange={handleChange}
                      placeholder="YYYY"
                      className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      maxLength="4"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {hasRole("FOM") && filterData.selectedDateFilterRole === "FOM" && (
          <>{fomPaymentTransactionSection}</>
        )}

        {/* Hide subscription date filters for HRG, FOM, CAL roles without WMM */}
        {!hasOnlyNonWMMRoles() && (
          <>
            {activeSubscriptionsSection}
            {expiringSubscriptionsSection}
            {copiesSection}
          </>
        )}

        {dateEncodedSection}
      </div>
    </div>
  );
};

export default DateRangeFilter;
