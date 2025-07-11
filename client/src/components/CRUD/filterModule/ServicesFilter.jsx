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
      <div className="grid grid-cols-2 gap-4">
        {services.map(({ id, label }) => (
          <div key={id} className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={`service-${id}`}
              checked={filterData.services.includes(label)}
              onChange={() => handleServiceChange(label)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor={`service-${id}`}
              className="text-sm font-medium text-gray-700"
            >
              {label}
              {hasRole(label) && (
                <span className="ml-1 text-xs text-blue-600 font-normal">
                  (Auto)
                </span>
              )}
            </label>
          </div>
        ))}
      </div>
    );
  }, [filterData.services, handleServiceChange, hasRole]);

  // Memoize the client ID filter section
  const clientIdFilterSection = useMemo(() => (
    <div className="mt-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
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
            className="ml-2 text-sm font-medium text-gray-700"
          >
            Include only
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
            className="ml-2 text-sm font-medium text-gray-700"
          >
            Exclude these
          </label>
        </div>
      </div>

      <div className="space-y-2">
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
          className="w-full p-2 text-sm border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          rows={2}
          placeholder="Enter client IDs (separate with commas or spaces)..."
        />
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
    <div className="p-4 bg-white rounded-lg shadow-sm border">
      <div className="space-y-4">
        {/* Services Section */}
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Services</h3>
          {(hasRole("WMM") || hasRole("FOM") || hasRole("HRG") || hasRole("CAL")) && (
            <p className="text-xs text-blue-600 mb-2">
              Services matching your role are automatically selected
            </p>
          )}
          <div className="p-2 bg-blue-50 rounded border border-blue-100 mb-3">
            <p className="text-xs text-blue-700">
              Selecting services will filter clients to show only those with the selected services
            </p>
          </div>
          {serviceCheckboxes}
        </div>

        {/* Client ID Filter Section */}
        <div className="pt-3 border-t">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Client ID Filter</h3>
          {clientIdFilterSection}
        </div>
      </div>
    </div>
  );
};

export default ServicesFilter; 