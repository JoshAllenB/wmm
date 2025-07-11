import { useMemo } from 'react';

const TypesFilter = ({
  filterData,
  handleChange,
  types,
}) => {
  // Memoize the types options
  const typeOptions = useMemo(() => {
    if (!Array.isArray(types)) return [];
    return types.map((type) => (
      <option key={type._id} value={type.id}>
        {type.name}
      </option>
    ));
  }, [types]);

  return (
    <div className="p-4 border rounded-lg shadow-sm">
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
    </div>
  );
};

export default TypesFilter; 