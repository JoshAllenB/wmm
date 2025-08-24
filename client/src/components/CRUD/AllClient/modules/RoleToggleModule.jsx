import React from "react";

const RoleToggleModule = ({ hasRole, selectedRole, handleRoleToggle }) => {
  return (
    <div className="flex mb-4 mt-2">
      <div className="flex w-full bg-gray-100 rounded-lg overflow-hidden">
        {hasRole("HRG") && (
          <button
            type="button"
            className={`flex-1 py-2.5 text-sm font-medium text-center ${
              selectedRole === "HRG"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            } transition-colors`}
            onClick={() => handleRoleToggle("HRG")}
          >
            HRG
          </button>
        )}
        {hasRole("FOM") && (
          <button
            type="button"
            className={`flex-1 py-2.5 text-sm font-medium text-center ${
              selectedRole === "FOM"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            } transition-colors`}
            onClick={() => handleRoleToggle("FOM")}
          >
            FOM
          </button>
        )}
        {hasRole("CAL") && (
          <button
            type="button"
            className={`flex-1 py-2.5 text-sm font-medium text-center ${
              selectedRole === "CAL"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            } transition-colors`}
            onClick={() => handleRoleToggle("CAL")}
          >
            CAL
          </button>
        )}
        {hasRole("WMM") && (
          <button
            type="button"
            className={`flex-1 py-2.5 text-sm font-medium text-center ${
              selectedRole === "WMM"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            } transition-colors`}
            onClick={() => handleRoleToggle("WMM")}
          >
            WMM
          </button>
        )}
        {hasRole("WMM") && (
          <button
            type="button"
            className={`flex-1 py-2.5 text-sm font-medium text-center ${
              selectedRole === "Promo"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            } transition-colors`}
            onClick={() => handleRoleToggle("Promo")}
          >
            Promo
          </button>
        )}
        {hasRole("WMM") && (
          <button
            type="button"
            className={`flex-1 py-2.5 text-sm font-medium text-center ${
              selectedRole === "Complimentary"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            } transition-colors`}
            onClick={() => handleRoleToggle("Complimentary")}
          >
            Complimentary
          </button>
        )}
      </div>
    </div>
  );
};

export default RoleToggleModule;
