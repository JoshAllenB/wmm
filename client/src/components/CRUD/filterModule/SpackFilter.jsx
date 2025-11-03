const SpackFilter = ({ filterData, handleChange }) => {
  return (
    <div className="p-2 border rounded-lg shadow-sm">
      <h2 className="text-black text-lg font-bold mb-4 border-b">
        SPack Status
      </h2>
      <div className="flex gap-5">
        <div className="flex items-center">
          <input
            type="checkbox"
            name="spackReceived"
            id="spackReceived"
            checked={filterData.spackReceived}
            onChange={handleChange}
            className="h-6 w-6 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="spackReceived" className="ml-2 text-lg text-black">
            SPack Client
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            name="spackNotReceived"
            id="spackNotReceived"
            checked={filterData.spackNotReceived}
            onChange={handleChange}
            className="h-6 w-6 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="spackNotReceived" className="ml-2 text-lg text-black">
            Exclude SPack Clients
          </label>
        </div>
      </div>
    </div>
  );
};

export default SpackFilter;
