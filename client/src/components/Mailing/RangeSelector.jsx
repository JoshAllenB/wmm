import React from "react";
import { Input } from "../UI/ShadCN/input";
import { Button } from "../UI/ShadCN/button";
import { Label } from "../UI/ShadCN/label";

const RangeSelector = ({
  startClientId,
  setStartClientId,
  endClientId,
  setEndClientId,
  startPosition,
  setStartPosition,
  availableRows,
  onSetFromSelection
}) => {
  return (
    <div className="space-y-4">
      <h4 className="font-medium mb-2">Range Selection</h4>
      
      <div className="flex items-center gap-2 mb-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            setStartClientId("");
            setEndClientId("");
          }}
          className="flex-1"
        >
          Clear Range
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onSetFromSelection}
          className="flex-1"
          disabled={!availableRows || availableRows.length === 0}
        >
          Set from Selection
        </Button>
      </div>

      <div className="grid gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="startId">Start Client ID</Label>
          <Input
            id="startId"
            type="text"
            value={startClientId}
            onChange={(e) => setStartClientId(e.target.value)}
            placeholder="Start ID"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="endId">End Client ID</Label>
          <Input
            id="endId"
            type="text"
            value={endClientId}
            onChange={(e) => setEndClientId(e.target.value)}
            placeholder="End ID"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="startPosition">Start Position</Label>
          <div className="flex gap-2">
            <Button
              variant={startPosition === "left" ? "default" : "outline"}
              onClick={() => setStartPosition("left")}
              className="flex-1"
            >
              Left
            </Button>
            <Button
              variant={startPosition === "right" ? "default" : "outline"}
              onClick={() => setStartPosition("right")}
              className="flex-1"
            >
              Right
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RangeSelector; 