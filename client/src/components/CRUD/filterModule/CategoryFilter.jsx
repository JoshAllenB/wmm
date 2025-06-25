import { useMemo } from 'react';

const CategoryFilter = ({
  filterData,
  handleChange,
  handleAreaChange,
  handleSelectAllLocal,
  handleSelectAllForeign,
  groups,
  types,
  subclasses,
  areas,
  areAllLocalSelected,
  areAllForeignSelected,
  local,
  foreign,
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

  // Memoize the types options
  const typeOptions = useMemo(() => {
    if (!Array.isArray(types)) return [];
    return types.map((type) => (
      <option key={type._id} value={type.id}>
        {type.name}
      </option>
    ));
  }, [types]);

  // Memoize the subclasses options
  const subclassOptions = useMemo(() => {
    if (!Array.isArray(subclasses)) return [];
    return subclasses.map((subclass) => (
      <option key={subclass._id} value={subclass.id}>
        {subclass.id} - {subclass.name}
      </option>
    ));
  }, [subclasses]);

  // Memoize the local areas grid
  const localAreasGrid = useMemo(() => {
    return (
      <div className="grid grid-cols-2">
        {local.map((area) => (
          <div key={area._id} className="flex items-center">
            <input
              type="checkbox"
              id={`area-${area._id}`}
              checked={filterData.areas.includes(area._id)}
              onChange={() => handleAreaChange(area._id)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor={`area-${area._id}`}
              className="ml-2 text-lg font-medium truncate"
              title={area._id}
            >
              {area._id}
            </label>
          </div>
        ))}
      </div>
    );
  }, [local, filterData.areas, handleAreaChange]);

  // Memoize the foreign areas grid
  const foreignAreasGrid = useMemo(() => {
    return (
      <div className="grid grid-cols-2">
        {foreign.map((area) => (
          <div key={area._id} className="flex items-center">
            <input
              type="checkbox"
              id={`area-${area._id}`}
              checked={filterData.areas.includes(area._id)}
              onChange={() => handleAreaChange(area._id)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor={`area-${area._id}`}
              className="ml-2 text-lg font-medium truncate"
              title={area._id}
            >
              {area._id}
            </label>
          </div>
        ))}
      </div>
    );
  }, [foreign, filterData.areas, handleAreaChange]);

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
        Category Filters
      </h2>
      <div className="space-y-2">
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

        <div>
          <label className="block text-xl font-medium text-black mb-1">
            Type
          </label>
          <select
            name="type"
            value={filterData.type}
            onChange={handleChange}
            className={`w-full p-2 text-xl border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
              filterData.type ? "border-blue-500 bg-blue-50" : ""
            }`}
          >
            <option value="">All Types</option>
            {typeOptions}
          </select>
        </div>

        <div>
          <label className="block text-xl font-medium text-black mb-1">
            Subclass
          </label>
          <select
            name="subsclass"
            value={filterData.subsclass}
            onChange={handleChange}
            className={`w-full p-2 text-xl border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
              filterData.subsclass ? "border-blue-500 bg-blue-50" : ""
            }`}
          >
            <option value="">All Subclasses</option>
            {subclassOptions}
          </select>
        </div>

        {/* Area Filter */}
        <div>
          <label className="block text-xl font-medium">Areas</label>
          <p className="text-base text-blue-500">
            {filterData.areas.length} areas selected
          </p>

          <div className="max-h-[350px] overflow-y-auto border rounded-md p-2 custom-scrollbar">
            {/* Local Areas */}
            <div className="mb-2">
              <h3 className="text-xl font-semibold text-bold mb-1 bg-gray-100 p-1 flex justify-between items-center">
                <span>Local Areas</span>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="select-all-local"
                    checked={areAllLocalSelected}
                    onChange={handleSelectAllLocal}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="select-all-local"
                    className="ml-1 text-lg text-black"
                  >
                    Select All
                  </label>
                </div>
              </h3>
              {localAreasGrid}
            </div>

            {/* Foreign Areas */}
            <div>
              <h3 className="text-xl font-semibold text-bold mb-1 bg-gray-100 p-1 flex justify-between items-center">
                <span>Foreign Areas</span>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="select-all-foreign"
                    checked={areAllForeignSelected}
                    onChange={handleSelectAllForeign}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="select-all-foreign"
                    className="ml-1 text-lg text-black"
                  >
                    Select All
                  </label>
                </div>
              </h3>
              {foreignAreasGrid}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryFilter; 