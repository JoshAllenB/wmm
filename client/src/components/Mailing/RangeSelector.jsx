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
    <div className="bg-gray-100 rounded-lg p-4">
      <h3 className="font-medium text-sm mb-3">Print Range & Position</h3>
      <p className="text-xs text-gray-600 mb-3">
        Use Client IDs to specify a range (e.g., after a paper jam).
        Select starting label position.
      </p>
      
      <div className="space-y-3">
        {/* Client ID inputs */}
        <div className="grid grid-cols-[auto,1fr] gap-2 items-center">
          <label className="text-sm whitespace-nowrap">
            Start Client ID:
          </label>
          <input
            type="text"
            value={startClientId}
            onChange={(e) => setStartClientId(e.target.value)}
            className="w-full px-2 py-1 text-sm border rounded"
          />
        </div>
        
        <div className="grid grid-cols-[auto,1fr] gap-2 items-center">
          <label className="text-sm whitespace-nowrap">
            End Client ID:
          </label>
          <input
            type="text"
            value={endClientId}
            onChange={(e) => setEndClientId(e.target.value)}
            className="w-full px-2 py-1 text-sm border rounded"
          />
        </div>

        {/* Start Position Radio Buttons */}
        <div className="mt-3">
          <label className="text-sm font-medium block mb-2">
            Start Printing At:
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="startPosition"
                value="left"
                checked={startPosition === "left"}
                onChange={(e) => setStartPosition(e.target.value)}
                className="text-blue-600"
              />
              <span className="text-sm">Label 1 (Left)</span>
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="startPosition"
                value="right"
                checked={startPosition === "right"}
                onChange={(e) => setStartPosition(e.target.value)}
                className="text-blue-600"
              />
              <span className="text-sm">Label 2 (Right)</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RangeSelector; 