import { useMemo } from "react";

const AreasFilter = ({
  filterData,
  handleAreaChange,
  handleSelectAllLocal,
  handleSelectAllForeign,
  areas,
  areAllLocalSelected,
  areAllForeignSelected,
  local,
  foreign,
}) => {
  // ✅ Add temporary area entry for filtering (only if not already in local)
  const extendedLocal = useMemo(() => {
    const tempAreas = [...local];
    if (!tempAreas.some((area) => area._id === "VM")) {
      tempAreas.push({ _id: "VM", name: "VM (Legacy)" });
    }
    return tempAreas;
  }, [local]);

  // Memoize the local areas grid
  const localAreasGrid = useMemo(() => {
    return (
      <div className="grid grid-cols-4">
        {extendedLocal.map((area) => (
          <div key={area._id} className="flex items-center">
            <input
              type="checkbox"
              id={`area-${area._id}`}
              checked={filterData.areas.includes(area._id)}
              onChange={() => handleAreaChange(area._id)}
              className="h-6 w-6 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor={`area-${area._id}`}
              className="ml-2 text-lg font-medium truncate"
              title={area.name || area._id}
            >
              {area._id}
            </label>
          </div>
        ))}
      </div>
    );
  }, [extendedLocal, filterData.areas, handleAreaChange]);

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
              className="h-6 w-6 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
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
    <div className="p-2 border rounded-lg shadow-sm">
      <div>
        <label className="block text-xl font-bold">Area Filter</label>
        <p className="text-base text-blue-500">
          {filterData.areas.length} areas selected
        </p>

        <div className="max-h-[350px] overflow-y-auto border rounded-md p-2 custom-scrollbar">
          {/* Local Areas */}
          <div className="mb-2">
            <h3 className="text-lg font-semibold mb-1 bg-gray-100 p-1 flex justify-between items-center">
              <span>Local Areas</span>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="select-all-local"
                  checked={areAllLocalSelected}
                  onChange={handleSelectAllLocal}
                  className="h-6 w-6 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
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
            <h3 className="text-lg font-semibold mb-1 bg-gray-100 p-1 flex justify-between items-center">
              <span>Foreign Areas</span>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="select-all-foreign"
                  checked={areAllForeignSelected}
                  onChange={handleSelectAllForeign}
                  className="h-6 w-6 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
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
  );
};

export default AreasFilter;
