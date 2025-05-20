import React from "react";

const RangeSelector = ({ 
  startClientId, 
  setStartClientId, 
  endClientId, 
  setEndClientId, 
  startPosition, 
  setStartPosition,
  availableRows
}) => {
  return (
    <div className="flex flex-col p-4 border rounded mb-4 w-full bg-gray-100">
      <h3 className="text-lg font-semibold mb-3">
        Print Range & Position
      </h3>
      <p className="text-xs text-gray-600 mb-3">
        Use Client IDs to specify a range (e.g., after a paper jam).
        Select starting label position.
      </p>
      <div className="flex items-center space-x-2 w-full mb-2">
        <label htmlFor="startId" className="text-sm w-28 text-right">
          Start Client ID:
        </label>
        <input
          type="text"
          id="startId"
          value={startClientId}
          onChange={(e) => setStartClientId(e.target.value)}
          placeholder={`First: ${availableRows[0]?.original?.id || "N/A"}`}
          className="border border-gray-300 rounded p-1 w-full"
        />
      </div>
      <div className="flex items-center space-x-2 w-full mb-3">
        <label htmlFor="endId" className="text-sm w-28 text-right">
          End Client ID:
        </label>
        <input
          type="text"
          id="endId"
          value={endClientId}
          onChange={(e) => setEndClientId(e.target.value)}
          placeholder={`Last: ${
            availableRows[availableRows.length - 1]?.original?.id || "N/A"
          }`}
          className="border border-gray-300 rounded p-1 w-full"
        />
      </div>
      <div className="flex items-center justify-center space-x-4 w-full">
        <span className="text-sm">Start Printing At:</span>
        <div className="flex items-center">
          <input
            type="radio"
            id="startLeft"
            name="startPosition"
            value="left"
            checked={startPosition === "left"}
            onChange={(e) => setStartPosition(e.target.value)}
            className="mr-1"
          />
          <label htmlFor="startLeft" className="text-sm">
            Label 1 (Left)
          </label>
        </div>
        <div className="flex items-center">
          <input
            type="radio"
            id="startRight"
            name="startPosition"
            value="right"
            checked={startPosition === "right"}
            onChange={(e) => setStartPosition(e.target.value)}
            className="mr-1"
          />
          <label htmlFor="startRight" className="text-sm">
            Label 2 (Right)
          </label>
        </div>
      </div>
    </div>
  );
};

export default RangeSelector; 