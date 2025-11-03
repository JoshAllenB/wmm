import { useMemo } from "react";

const GroupFilter = ({ filterData, handleChange, groups, hasRole }) => {
  // Memoize the groups options to prevent unnecessary re-renders
  const groupOptions = useMemo(() => {
    if (!Array.isArray(groups)) return [];
    return groups.map((group) => (
      <option key={group._id} value={group.id}>
        {group.id}
      </option>
    ));
  }, [groups]);

  const hasExcludeAccess = () => {
    return hasRole("HRG") || hasRole("FOM") || hasRole("CAL");
  };

  return (
    <div className="p-2 border rounded-lg shadow-sm">
      <div className="space-y-2">
        <div>
          <label className="block text-xl font-medium text-black mb-2">
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
            id="excludeDCSClients"
            name="excludeDCSClients"
            checked={filterData.excludeDCSClients}
            onChange={(e) =>
              handleChange({
                target: {
                  name: "excludeDCSClients",
                  value: e.target.checked,
                },
              })
            }
            className="h-6 w-6 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            disabled={!hasExcludeAccess()}
          />
          <label
            htmlFor="excludeDCSClients"
            className="ml-2 text-xl text-black"
          >
            Exclude DCS Clients
          </label>
          <span className="ml-2 text-sm text-gray-500">
            {!hasExcludeAccess() && "(Not available for your role)"}
            {hasExcludeAccess() && "(Hide clients with 'DCS' in group name)"}
          </span>
        </div>

        <div className="flex items-center mt-2">
          <input
            type="checkbox"
            id="excludeCMCClients"
            name="excludeCMCClients"
            checked={filterData.excludeCMCClients}
            onChange={(e) =>
              handleChange({
                target: {
                  name: "excludeCMCClients",
                  value: e.target.checked,
                },
              })
            }
            className="h-6 w-6 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            disabled={!hasExcludeAccess()}
          />
          <label
            htmlFor="excludeCMCClients"
            className="ml-2 text-xl text-black"
          >
            Exclude CMC Clients
          </label>
          <span className="ml-2 text-sm text-gray-500">
            {!hasExcludeAccess() && "(Not available for your role)"}
            {hasExcludeAccess() && "(Hide clients with 'CMC' in group name)"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default GroupFilter;
