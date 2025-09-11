import React from "react";

const RTSFilter = ({ filterData, handleChange }) => {
  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
        RTS (Return to Sender) Status
      </h2>
      <div className="flex flex-col gap-4">
        <div className="flex gap-5">
          <div className="flex items-center">
            <input
              type="checkbox"
              name="rtsMaxReached"
              id="rtsMaxReached"
              checked={filterData.rtsMaxReached}
              onChange={handleChange}
              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
            />
            <label htmlFor="rtsMaxReached" className="ml-2 text-lg text-black">
              Max RTS Reached (3+)
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="rtsActive"
              id="rtsActive"
              checked={filterData.rtsActive}
              onChange={handleChange}
              className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
            />
            <label htmlFor="rtsActive" className="ml-2 text-lg text-black">
              Active RTS (1-2)
            </label>
          </div>
        </div>

        <div className="flex gap-5">
          <div className="flex items-center">
            <input
              type="checkbox"
              name="rtsNone"
              id="rtsNone"
              checked={filterData.rtsNone}
              onChange={handleChange}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <label htmlFor="rtsNone" className="ml-2 text-lg text-black">
              No RTS (0)
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="excludeRTSMax"
              id="excludeRTSMax"
              checked={filterData.excludeRTSMax}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="excludeRTSMax" className="ml-2 text-lg text-black">
              Exclude Max RTS Clients
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RTSFilter;
