import React from "react";

const SubscriptionTypeSelector = ({
  subscriptionType,
  setSubscriptionType,
  mode,
  hasSubscriptionData,
  rowData,
}) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Subscription Type:
      </label>
      <div className="flex bg-gray-100 rounded-lg p-1">
        {/* Only show WMM button if WMM data exists or we're in add mode */}
        {(mode === "add" || hasSubscriptionData(rowData, "WMM")) && (
          <button
            type="button"
            onClick={() =>
              setSubscriptionType((prev) => ({
                ...prev,
                subscriptionType: "WMM",
              }))
            }
            className={`px-3 py-1.5 text-base font-medium rounded-md transition-all duration-200 ${
              subscriptionType === "WMM"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-200"
            }`}
          >
            WMM
          </button>
        )}

        {/* Only show Promo button if Promo data exists or we're in add mode */}
        {(mode === "add" || hasSubscriptionData(rowData, "Promo")) && (
          <button
            type="button"
            onClick={() =>
              setSubscriptionType((prev) => ({
                ...prev,
                subscriptionType: "Promo",
              }))
            }
            className={`px-3 py-1.5 text-base font-medium rounded-md transition-all duration-200 ${
              subscriptionType === "Promo"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-200"
            }`}
          >
            Promo
          </button>
        )}

        {/* Only show Complimentary button if Complimentary data exists or we're in add mode */}
        {(mode === "add" || hasSubscriptionData(rowData, "Complimentary")) && (
          <button
            type="button"
            onClick={() =>
              setSubscriptionType((prev) => ({
                ...prev,
                subscriptionType: "Complimentary",
              }))
            }
            className={`px-3 py-1.5 text-base font-medium rounded-md transition-all duration-200 ${
              subscriptionType === "Complimentary"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-200"
            }`}
          >
            Complimentary
          </button>
        )}
      </div>
    </div>
  );
};

export default SubscriptionTypeSelector;
