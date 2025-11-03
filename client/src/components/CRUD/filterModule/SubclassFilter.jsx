import { useMemo } from "react";

const SubclassFilter = ({ filterData, handleChange, subclasses }) => {
  // Memoize the subclasses options
  const subclassOptions = useMemo(() => {
    if (!Array.isArray(subclasses)) return [];
    return subclasses.map((subclass) => (
      <option key={subclass._id} value={subclass.id}>
        {subclass.name} - {subclass.id}
      </option>
    ));
  }, [subclasses]);

  return (
    <div className="p-2 border rounded-lg shadow-sm">
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
    </div>
  );
};

export default SubclassFilter;
