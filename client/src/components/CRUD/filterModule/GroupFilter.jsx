import { useMemo } from 'react';

const GroupFilter = ({
  filterData,
  handleChange,
  groups,
  hasRole,
}) => {
  // Memoize the groups options to prevent unnecessary re-renders
  const groupOptions = useMemo(() => {
    if (!Array.isArray(groups)) return [];
    return groups.map((group) => (
      <option key={group._id} value={group.id}>
        {group.id}
      </option>
    ));
  }, [groups]);

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <div className="space-y-4">
        <div>
          <label className="block text-xl font-medium text-black mb-1">
            Group
          </label>
          <select
            name="group"
            value={filterData.group}
            onChange={handleChange}
            className={`w-full p-2 text-xl border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
              filterData.group ? "border-blue-500 bg-blue-50" : ""
            }`}
          >
            <option value="">All Groups</option>
            {groupOptions}
          </select>
        </div>

        <div className="flex items-center mt-2">
          <input
            type="checkbox"
            id="excludeSPackClients"
            name="excludeSPackClients"
            checked={filterData.excludeSPackClients}
            onChange={(e) =>
              handleChange({
                target: {
                  name: "excludeSPackClients",
                  value: e.target.checked,
                },
              })
            }
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            disabled={!hasRole("WMM")}
          />
          <label
            htmlFor="excludeSPackClients"
            className="ml-2 text-xl text-black"
          >
            Exclude SPack Clients
          </label>
          <span className="ml-2 text-sm text-gray-500">
            {!hasRole("WMM") && "(Not available for your role)"}
            {hasRole("WMM") && "(Hide clients with 'SPack' in group name)"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default GroupFilter; 