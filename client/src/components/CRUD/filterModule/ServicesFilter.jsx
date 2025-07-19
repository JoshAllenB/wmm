import { useEffect } from "react";

const ServicesFilter = ({
  filterData,
  handleChange,
  handleServiceChange,
  handleClientIdFilterTypeChange,
  hasRole,
  subscriptionType = "WMM"
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
        services.forEach(service => handleServiceChange(service));
      }
    };

    autoSetServices();
  }, [hasRole, subscriptionType]);

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border">
      <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">Services</h2>
      <div className="space-y-2">
        {/* Show services based on role */}
        {!hasRole("WMM") && hasRole("HRG") && (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filterData.services.includes("HRG")}
              onChange={() => handleServiceChange("HRG")}
              className="rounded border-gray-300"
            />
            <span>HRG</span>
          </label>
        )}
        {!hasRole("WMM") && hasRole("FOM") && (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filterData.services.includes("FOM")}
              onChange={() => handleServiceChange("FOM")}
              className="rounded border-gray-300"
            />
            <span>FOM</span>
          </label>
        )}
        {!hasRole("WMM") && hasRole("CAL") && (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filterData.services.includes("CAL")}
              onChange={() => handleServiceChange("CAL")}
              className="rounded border-gray-300"
            />
            <span>CAL</span>
          </label>
        )}
        {/* Show all services for Admin */}
        {hasRole("Admin") && (
          <>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filterData.services.includes("WMM")}
                onChange={() => handleServiceChange("WMM")}
                className="rounded border-gray-300"
              />
              <span>WMM</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filterData.services.includes("HRG")}
                onChange={() => handleServiceChange("HRG")}
                className="rounded border-gray-300"
              />
              <span>HRG</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filterData.services.includes("FOM")}
                onChange={() => handleServiceChange("FOM")}
                className="rounded border-gray-300"
              />
              <span>FOM</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filterData.services.includes("CAL")}
                onChange={() => handleServiceChange("CAL")}
                className="rounded border-gray-300"
              />
              <span>CAL</span>
            </label>
          </>
        )}
      </div>

      {/* Client ID Filter Section */}
      <div className="mt-4 space-y-2">
        <h3 className="font-medium text-gray-700">Client ID Filter</h3>
        <div className="flex gap-2">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="clientIdFilterType"
              value="include"
              checked={filterData.clientIdFilterType === "include"}
              onChange={(e) => handleClientIdFilterTypeChange(e.target.value)}
              className="rounded border-gray-300"
            />
            <span>Include</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="clientIdFilterType"
              value="exclude"
              checked={filterData.clientIdFilterType === "exclude"}
              onChange={(e) => handleClientIdFilterTypeChange(e.target.value)}
              className="rounded border-gray-300"
            />
            <span>Exclude</span>
          </label>
        </div>
        {filterData.clientIdFilterType === "include" ? (
          <textarea
            name="clientIncludeIds"
            value={filterData.clientIncludeIds}
            onChange={handleChange}
            placeholder="Enter client IDs to include (comma or space separated)"
            className="w-full p-2 border rounded"
            rows="3"
          />
        ) : (
          <textarea
            name="clientExcludeIds"
            value={filterData.clientExcludeIds}
            onChange={handleChange}
            placeholder="Enter client IDs to exclude (comma or space separated)"
            className="w-full p-2 border rounded"
            rows="3"
          />
        )}
      </div>
    </div>
  );
};

export default ServicesFilter; 