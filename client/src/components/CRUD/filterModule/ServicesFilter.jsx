import { useEffect } from "react";

const ServicesFilter = ({
  filterData,
  handleChange,
  handleServiceChange,
  handleClientIdFilterTypeChange,
  hasRole,
  subscriptionType = "WMM",
}) => {
  // Auto-set services based on user roles and subscription type
  useEffect(() => {
    const autoSetServices = () => {
      let services = [];

      // For WMM role, use subscription type
      if (hasRole("WMM")) {
        switch (subscriptionType) {
          case "WMM":
            services = ["WMM"];
            break;
          case "Promo":
            services = ["PROMO"];
            break;
          case "Complimentary":
            services = ["COMP"];
            break;
          default:
            services = ["WMM"];
        }
      } else if (hasRole("Admin")) {
        // For Admin, show all services except Promo and Complimentary
        services = ["WMM", "HRG", "FOM", "CAL"];
      } else {
        // For other roles (HRG, FOM, CAL), add their respective services
        if (hasRole("HRG")) services.push("HRG");
        if (hasRole("FOM")) services.push("FOM");
        if (hasRole("CAL")) services.push("CAL");
      }

      // Update the services in filterData
      if (services.length > 0 && filterData.services.length === 0) {
        services.forEach((service) => handleServiceChange(service));
      }
    };

    autoSetServices();
  }, [hasRole, subscriptionType]);

  return (
    <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-gray-800 text-xl font-semibold mb-2">
        Filter Options
      </h2>

      {/* Services Section */}
      <div className="mb-2">
        <h3 className="text-gray-700 font-medium mb-2">Services</h3>
        <div className="flex flex-wrap gap-4 text-base">
          {/* Show services based on role */}
          {!hasRole("WMM") && hasRole("HRG") && (
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={filterData.services.includes("HRG")}
                onChange={() => handleServiceChange("HRG")}
                className="h-6 w-6 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-black">HRG</span>
            </label>
          )}
          {!hasRole("WMM") && hasRole("FOM") && (
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={filterData.services.includes("FOM")}
                onChange={() => handleServiceChange("FOM")}
                className="h-6 w-6 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-black">FOM</span>
            </label>
          )}
          {!hasRole("WMM") && hasRole("CAL") && (
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={filterData.services.includes("CAL")}
                onChange={() => handleServiceChange("CAL")}
                className="h-6 w-6 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-black">CAL</span>
            </label>
          )}
          {/* Show all services for Admin */}
          {hasRole("Admin") && (
            <>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={filterData.services.includes("WMM")}
                  onChange={() => handleServiceChange("WMM")}
                  className="h-6 w-6 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-black">WMM</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={filterData.services.includes("HRG")}
                  onChange={() => handleServiceChange("HRG")}
                  className="h-6 w-6 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-black">HRG</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={filterData.services.includes("FOM")}
                  onChange={() => handleServiceChange("FOM")}
                  className="h-6 w-6 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-black">FOM</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={filterData.services.includes("CAL")}
                  onChange={() => handleServiceChange("CAL")}
                  className="h-6 w-6 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-black">CAL</span>
              </label>
            </>
          )}
        </div>
      </div>

      {/* Client ID Filter Section */}
      <div className="pt-2 border-t border-gray-200">
        <h3 className="text-gray-700 font-medium mb-2 borde">
          Client ID Filter
        </h3>

        <div className="flex gap-2">
          {/* Include Client IDs */}
          <div className="mb-2">
            <label className="inline-flex items-center mb-2">
              <input
                type="checkbox"
                checked={
                  filterData.clientIdFilterType === "include" ||
                  filterData.clientIdFilterType === "both"
                }
                onChange={(e) => {
                  if (e.target.checked) {
                    handleClientIdFilterTypeChange(
                      filterData.clientIdFilterType === "exclude"
                        ? "both"
                        : "include"
                    );
                  } else {
                    handleClientIdFilterTypeChange(
                      filterData.clientIdFilterType === "both"
                        ? "exclude"
                        : "none"
                    );
                  }
                }}
                className="h-6 w-6 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-black font-medium">
                Include Client IDs
              </span>
            </label>
            {(filterData.clientIdFilterType === "include" ||
              filterData.clientIdFilterType === "both") && (
              <textarea
                name="clientIncludeIds"
                value={filterData.clientIncludeIds}
                onChange={handleChange}
                placeholder="Enter client IDs to include (comma or space separated)"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                rows="3"
              />
            )}
          </div>

          {/* Exclude Client IDs */}
          <div>
            <label className="inline-flex items-center mb-2">
              <input
                type="checkbox"
                checked={
                  filterData.clientIdFilterType === "exclude" ||
                  filterData.clientIdFilterType === "both"
                }
                onChange={(e) => {
                  if (e.target.checked) {
                    handleClientIdFilterTypeChange(
                      filterData.clientIdFilterType === "include"
                        ? "both"
                        : "exclude"
                    );
                  } else {
                    handleClientIdFilterTypeChange(
                      filterData.clientIdFilterType === "both"
                        ? "include"
                        : "none"
                    );
                  }
                }}
                className="h-6 w-6 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-black font-medium">
                Exclude Client IDs
              </span>
            </label>
            {(filterData.clientIdFilterType === "exclude" ||
              filterData.clientIdFilterType === "both") && (
              <textarea
                name="clientExcludeIds"
                value={filterData.clientExcludeIds}
                onChange={handleChange}
                placeholder="Enter client IDs to exclude (comma or space separated)"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                rows="3"
              />
            )}
          </div>
        </div>
        <p className="text-sm text-gray-500">
          You can use both include and exclude filters simultaneously. Separate
          multiple IDs with commas or spaces.
        </p>
      </div>
    </div>
  );
};

export default ServicesFilter;
