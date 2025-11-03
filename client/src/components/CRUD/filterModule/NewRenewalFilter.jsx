import { useMemo } from "react";

const NewRenewalFilter = ({ filterData, handleChange }) => {
  const options = useMemo(
    () => [
      { value: "all", label: "All Subscriptions" },
      { value: "new", label: "New Subscriptions Only" },
      { value: "renewal", label: "Renewals Only" },
    ],
    []
  );

  return (
    <div className="p-2 border rounded-lg shadow-sm">
      <div>
        <label className="block text-xl font-medium text-black">
          Subscription Type
        </label>
        <div className="flex gap-2">
          {options.map((option) => (
            <label key={option.value} className="flex items-center">
              <input
                type="radio"
                name="newRenewalFilter"
                value={option.value}
                checked={filterData.newRenewalFilter === option.value}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 cursor-pointer"
              />
              <span className="ml-1 text-lg cursor-pointer">
                {option.label}
              </span>
            </label>
          ))}
        </div>
        <p className="text-sm text-gray-600 mt-2">
          New: subsclass does not contain 'R' | Renewal: subsclass contains 'R'
        </p>
      </div>
    </div>
  );
};

export default NewRenewalFilter;
