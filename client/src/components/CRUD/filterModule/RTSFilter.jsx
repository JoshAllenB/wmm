const RTSFilter = ({ filterData, handleChange }) => {
  return (
    <div className="p-2 border rounded-lg shadow-sm">
      <h2 className="text-black text-lg font-bold mb-4 border-b">
        RTS (Return to Sender) Status
      </h2>

      <div className="grid grid-cols-2 gap-1">
        {/* Max RTS */}
        <label htmlFor="rtsMaxReached" className="flex items-center gap-2">
          <input
            type="checkbox"
            name="rtsMaxReached"
            id="rtsMaxReached"
            checked={filterData.rtsMaxReached}
            onChange={handleChange}
            className="h-6 w-6 text-red-600 border-gray-300 rounded"
          />
          <span className="text-black leading-tight">Max RTS Reached (3+)</span>
        </label>

        {/* Active RTS */}
        <label htmlFor="rtsActive" className="flex items-center gap-2">
          <input
            type="checkbox"
            name="rtsActive"
            id="rtsActive"
            checked={filterData.rtsActive}
            onChange={handleChange}
            className="h-6 w-6 text-yellow-600 border-gray-300 rounded"
          />
          <span className="text-black leading-tight">Active RTS (1–2)</span>
        </label>

        {/* No RTS */}
        <label htmlFor="rtsNone" className="flex items-center gap-2">
          <input
            type="checkbox"
            name="rtsNone"
            id="rtsNone"
            checked={filterData.rtsNone}
            onChange={handleChange}
            className="h-6 w-6 text-green-600 border-gray-300 rounded"
          />
          <span className="text-black leading-tight">No RTS (0)</span>
        </label>

        {/* Exclude Max */}
        <label htmlFor="excludeRTSMax" className="flex items-center gap-2">
          <input
            type="checkbox"
            name="excludeRTSMax"
            id="excludeRTSMax"
            checked={filterData.excludeRTSMax}
            onChange={handleChange}
            className="h-6 w-6 text-blue-600 border-gray-300 rounded"
          />
          <span className="text-black leading-tight">
            Exclude Max RTS Clients
          </span>
        </label>
      </div>
    </div>
  );
};

export default RTSFilter;
