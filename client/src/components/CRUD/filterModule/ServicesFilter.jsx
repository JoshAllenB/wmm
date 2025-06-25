import { useMemo } from 'react';

const ServicesFilter = ({
  filterData,
  handleChange,
  handleServiceChange,
  handleClientIdFilterTypeChange,
  hasRole,
}) => {
  // Memoize the service checkboxes to prevent unnecessary re-renders
  const serviceCheckboxes = useMemo(() => {
    const services = [
      { id: 'wmm', label: 'WMM' },
      { id: 'fom', label: 'FOM' },
      { id: 'hrg', label: 'HRG' },
      { id: 'cal', label: 'CAL' }
    ];

    return (
      <div className="grid grid-cols-2 gap-y-2">
        {services.map(({ id, label }) => (
          <div key={id} className="flex items-center">
            <input
              type="checkbox"
              id={`service-${id}`}
              checked={filterData.services.includes(label)}
              onChange={() => handleServiceChange(label)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor={`service-${id}`}
              className="ml-2 text-lg text-medium text-black"
            >
              {label}
            </label>
            {hasRole(label) && (
              <span className="ml-1 text-sm text-medium text-blue-500">
                (Auto)
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }, [filterData.services, handleServiceChange, hasRole]);

  // Memoize the copies filter section
  const copiesFilterSection = useMemo(() => (
    <div className="mb-4">
      <h3 className="text-lg font-medium text-black mb-2">Copies Filter</h3>
      <div className="space-y-2">
        <select
          name="copiesRange"
          value={filterData.copiesRange}
          onChange={handleChange}
          className="w-full p-2 text-xl border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="">All Copies</option>
          <option value="1">1 Copy</option>
          <option value="2">2 Copies</option>
          <option value="gt1">More than 1 Copy</option>
          <option value="custom">Custom Range</option>
        </select>

        {filterData.copiesRange === "custom" && (
          <div className="flex items-center gap-2 mt-2">
            <div>
              <label htmlFor="minCopies" className="block text-sm text-black">
                Min Copies
              </label>
              <input
                type="number"
                id="minCopies"
                name="minCopies"
                value={filterData.minCopies}
                onChange={handleChange}
                min="0"
                className="w-24 p-2 text-base border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="self-end">to</div>
            <div>
              <label htmlFor="maxCopies" className="block text-sm text-black">
                Max Copies
              </label>
              <input
                type="number"
                id="maxCopies"
                name="maxCopies"
                value={filterData.maxCopies}
                onChange={handleChange}
                min="0"
                className="w-24 p-2 text-base border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  ), [filterData.copiesRange, filterData.minCopies, filterData.maxCopies, handleChange]);

  // Memoize the client ID filter section
  const clientIdFilterSection = useMemo(() => (
    <div className="mt-4">
      <h2 className="text-black text-xl font-bold">Client ID Filter</h2>
      <div>
        <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0 mb-2">
          <div className="flex items-center">
            <input
              type="radio"
              id="include-clients"
              name="clientIdFilterType"
              value="include"
              checked={filterData.clientIdFilterType === "include"}
              onChange={() => handleClientIdFilterTypeChange("include")}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <label
              htmlFor="include-clients"
              className="ml-2 text-lg text-medium text-black"
            >
              Include only these clients
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="radio"
              id="exclude-clients"
              name="clientIdFilterType"
              value="exclude"
              checked={filterData.clientIdFilterType === "exclude"}
              onChange={() => handleClientIdFilterTypeChange("exclude")}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <label
              htmlFor="exclude-clients"
              className="ml-2 text-lg text-medium text-black"
            >
              Exclude these clients
            </label>
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-xl font-medium text-black">
            Client IDs to{" "}
            {filterData.clientIdFilterType === "include" ? "Include" : "Exclude"}
          </label>
          <p className="text-sm text-black">
            Enter client IDs to{" "}
            {filterData.clientIdFilterType === "include" ? "include in" : "exclude from"}{" "}
            results. Separate multiple IDs with commas or spaces.
          </p>
          <textarea
            name={
              filterData.clientIdFilterType === "include"
                ? "clientIncludeIds"
                : "clientExcludeIds"
            }
            value={
              filterData.clientIdFilterType === "include"
                ? filterData.clientIncludeIds
                : filterData.clientExcludeIds
            }
            onChange={handleChange}
            className="w-full p-2 text-base border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            rows={3}
            placeholder="Enter client IDs..."
          />
        </div>
      </div>
    </div>
  ), [
    filterData.clientIdFilterType,
    filterData.clientIncludeIds,
    filterData.clientExcludeIds,
    handleChange,
    handleClientIdFilterTypeChange
  ]);

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="text-black text-xl font-bold mb-4 border-b pb-2">
        Services
      </h2>
      <div className="space-y-2">
        {copiesFilterSection}

        <p className="text-sm text-black mb-2">
          Select services to filter clients
        </p>
        {hasRole("WMM") ||
        hasRole("FOM") ||
        hasRole("HRG") ||
        hasRole("CAL") ? (
          <p className="text-xs text-blue-500 mb-2">
            Services matching your role are automatically selected. You can modify
            these selections.
          </p>
        ) : null}

        <div className="p-2 bg-blue-50 rounded border border-blue-200 mb-2">
          <p className="text-xs text-blue-800">
            <span className="font-bold">Note:</span> When you select a service
            (HRG, FOM, CAL), you'll only see clients that have exactly that
            service and no others. WMM service can be present on any client
            regardless of this filter.
          </p>
        </div>

        {!hasRole("WMM") && (
          <div className="mb-2">
            <label className="block text-xl font-medium text-black mb-1">
              Subscription Status
            </label>
            <select
              name="subscriptionStatus"
              value={filterData.subscriptionStatus}
              onChange={handleChange}
              className={`w-full p-2 text-xl border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                filterData.subscriptionStatus !== "all"
                  ? "border-blue-500 bg-blue-50"
                  : ""
              }`}
            >
              <option value="all">All Subscriptions</option>
              <option value="active">Active Only</option>
              <option value="unsubscribed">Unsubscribed Only</option>
            </select>
            <p className="text-sm text-black mt-1">
              Filter clients by their subscription status
            </p>
          </div>
        )}

        {serviceCheckboxes}
        {clientIdFilterSection}
      </div>
    </div>
  );
};

export default ServicesFilter; 