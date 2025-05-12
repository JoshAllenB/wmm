import { useState, useEffect } from "react";
import { fetchAreas } from "../components/Table/Data/utilData";
import InputField from "../components/CRUD/input";

const AreaForm = ({ onAreaChange, initialAreaData }) => {
  // Separate state for each input to avoid interdependencies
  const [areas, setAreas] = useState([]);
  const [acode, setAcode] = useState(initialAreaData?.acode || "");
  const [zipcode, setZipcode] = useState(
    initialAreaData?.zipcode ? String(initialAreaData.zipcode) : ""
  );
  const [availableZipcodes, setAvailableZipcodes] = useState([]);
  const [showZipcodeOptions, setShowZipcodeOptions] = useState(false);

  // Load areas data on component mount
  useEffect(() => {
    const loadAreas = async () => {
      try {
        const areasData = await fetchAreas();
        setAreas(areasData);

        // If we have an initial area code, find the matching area
        if (initialAreaData?.acode) {
          const matchingArea = areasData.find(
            (area) => area._id === initialAreaData.acode
          );

          if (matchingArea) {
            // Get all unique zipcodes for this area
            const zipcodes = matchingArea.locations
              .filter((loc) => loc.zipcode)
              .map((loc) => String(loc.zipcode));

            const uniqueZipcodes = [...new Set(zipcodes)];
            setAvailableZipcodes(uniqueZipcodes);

            // If we have only one zipcode and no initial zipcode, set it
            if (uniqueZipcodes.length === 1 && !initialAreaData.zipcode) {
              setZipcode(uniqueZipcodes[0]);
              onAreaChange("zipcode", uniqueZipcodes[0]);
            }
          }
        }
      } catch (error) {
        console.error("Error loading areas:", error);
      }
    };

    loadAreas();
  }, [initialAreaData, onAreaChange]);

  // Handle area code change
  const handleAreaCodeChange = (e) => {
    const selectedAcode = e.target.value;
    setAcode(selectedAcode);
    onAreaChange("acode", selectedAcode);

    // Clear zipcode options dropdown state
    setShowZipcodeOptions(false);

    // Update available zipcodes based on the selected area
    if (selectedAcode) {
      const selectedArea = areas.find((area) => area._id === selectedAcode);
      if (selectedArea?.locations) {
        // Get all unique zipcodes for this area
        const zipcodes = selectedArea.locations
          .filter((loc) => loc.zipcode)
          .map((loc) => String(loc.zipcode));

        const uniqueZipcodes = [...new Set(zipcodes)];
        setAvailableZipcodes(uniqueZipcodes);

        // If only one zipcode, set it automatically
        if (uniqueZipcodes.length === 1) {
          setZipcode(uniqueZipcodes[0]);
          onAreaChange("zipcode", uniqueZipcodes[0]);
        } else if (uniqueZipcodes.length > 1) {
          // Show available zipcodes but don't auto-select
          setShowZipcodeOptions(true);
        }
      }
    } else {
      // Reset if no area code selected
      setAvailableZipcodes([]);
    }
  };

  // Handle zipcode change - completely independent from area code
  const handleZipcodeChange = (e) => {
    const newZipcode = e.target.value;
    setZipcode(newZipcode);
    onAreaChange("zipcode", newZipcode);
  };

  // Handle selecting a zipcode from the dropdown
  const handleZipcodeSelect = (selectedZipcode) => {
    setZipcode(selectedZipcode);
    onAreaChange("zipcode", selectedZipcode);
    setShowZipcodeOptions(false);
  };

  return (
    <div className="flex flex-col gap-3 text-lg">
      <div>
        <select
          name="acode"
          value={acode}
          onChange={handleAreaCodeChange}
          className="
          w-full 
          p-2 
          pl-3 
          pr-8 
          border-2 
          rounded-md 
          text-xl 
          bg-white 
          appearance-none 
          cursor-pointer 
          border-gray-300 
          focus:border-blue-500 
          focus:ring-2 
          focus:ring-blue-200 
          focus:outline-none 
          relative 
          z-10
        "
        >
          <option value="">Select Area Code</option>
          {areas.map((area) => (
            <option key={area._id} value={area._id}>
              {area._id}
            </option>
          ))}
        </select>
      </div>
      <div className="relative">
        <InputField
          label="Zip Code"
          type="text"
          name="zipcode"
          value={zipcode}
          onChange={handleZipcodeChange}
          onClick={() =>
            availableZipcodes.length > 1 && setShowZipcodeOptions(true)
          }
        />

        {/* Zipcode suggestions dropdown */}
        {showZipcodeOptions && availableZipcodes.length > 1 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            <div className="p-2 text-sm text-gray-500 border-b">
              Available Zipcodes:
            </div>
            {availableZipcodes.map((zip) => (
              <div
                key={zip}
                className="p-2 hover:bg-blue-50 cursor-pointer"
                onClick={() => handleZipcodeSelect(zip)}
              >
                {zip}
              </div>
            ))}
          </div>
        )}

        {/* Help text when multiple zipcodes are available */}
        {availableZipcodes.length > 1 && !showZipcodeOptions && (
          <div className="text-xs text-blue-600 mt-1">
            <button
              type="button"
              className="underline focus:outline-none text-base"
              onClick={() => setShowZipcodeOptions(true)}
            >
              {availableZipcodes.length} zipcode options available - click to
              view
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AreaForm;
