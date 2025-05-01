import { useState, useEffect } from "react";
import { fetchAreas } from "../components/Table/Data/utilData";
import InputField from "../components/CRUD/input";

const AreaForm = ({ onAreaChange, initialAreaData }) => {
  // Separate state for each input to avoid interdependencies
  const [areas, setAreas] = useState([]);
  const [acode, setAcode] = useState(initialAreaData?.acode || "");
  const [zipcode, setZipcode] = useState(initialAreaData?.zipcode ? String(initialAreaData.zipcode) : "");
  
  // Load areas data on component mount
  useEffect(() => {
    const loadAreas = async () => {
      try {
        const areasData = await fetchAreas();
        setAreas(areasData);
        
        // If we have an initial area code, find the matching area
        if (initialAreaData?.acode) {
          const matchingArea = areasData.find(area => area._id === initialAreaData.acode);
          
          if (matchingArea) {
            // Only set zipcode from area if it's not already provided
            if (!initialAreaData.zipcode && matchingArea.locations?.[0]?.zipcode) {
              const areaZipcode = String(matchingArea.locations[0].zipcode);
              setZipcode(areaZipcode);
              onAreaChange("zipcode", areaZipcode);
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
    
    // Update zipcode based on the selected area ONLY if user hasn't manually changed it
    if (selectedAcode) {
      const selectedArea = areas.find(area => area._id === selectedAcode);
      if (selectedArea?.locations?.[0]?.zipcode) {
        const newZipcode = String(selectedArea.locations[0].zipcode);
        setZipcode(newZipcode);
        onAreaChange("zipcode", newZipcode);
      }
    }
  };
  
  // Handle zipcode change - completely independent from area code
  const handleZipcodeChange = (e) => {
    const newZipcode = e.target.value;
    setZipcode(newZipcode);
    onAreaChange("zipcode", newZipcode);
  };
  
  return (
    <div className="flex flex-col gap-3 text-lg">
      <div>
        <select
          name="acode"
          value={acode}
          onChange={handleAreaCodeChange}
          className="w-full p-2 border rounded-md"
        >
          <option value="">Select Area Code</option>
          {areas.map((area) => (
            <option key={area._id} value={area._id}>
              {area._id}
            </option>
          ))}
        </select>
      </div>
      <div>
        <InputField
          label="Zip Code"
          type="text"
          name="zipcode"
          value={zipcode}
          onChange={handleZipcodeChange}
        />
      </div>
    </div>
  );
};

export default AreaForm;
