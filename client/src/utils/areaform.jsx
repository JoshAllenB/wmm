import { useState, useEffect } from "react";
import { fetchAreas } from "../components/Table/Data/utilData";
import InputField from "../components/CRUD/input";

const AreaForm = ({ onAreaChange, initialAreaData }) => {
  const [areas, setAreas] = useState([]);
  const [formData, setFormData] = useState({
    area: "",
    acode: initialAreaData?.acode || "",
    zipcode: initialAreaData?.zipcode || "",
  });

  useEffect(() => {
    const loadAreas = async () => {
      try {
        const areasData = await fetchAreas();
        setAreas(areasData);

        // Find and set the matching area based on initial acode
        if (initialAreaData?.acode) {
          const matchingArea = areasData.find(
            (area) => area._id === initialAreaData.acode
          );
          if (matchingArea) {
            setFormData({
              acode: matchingArea._id,
              zipcode: matchingArea.locations?.[0]?.zipcode || "",
            });
            onAreaChange("acode", matchingArea._id);
            onAreaChange("zipcode", matchingArea.locations?.[0]?.zipcode || "");
          }
        }
      } catch (error) {
        console.error("Error loading areas:", error);
      }
    };
    loadAreas();
  }, [initialAreaData, onAreaChange]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    onAreaChange(name, value);
  };

  const handleAreaChange = (event) => {
    const selectedAcode = event.target.value;
    const selectedArea = areas.find((area) => area._id === selectedAcode);

    setFormData((prevData) => ({
      ...prevData,
      acode: selectedAcode,
      zipcode: selectedArea?.locations?.[0]?.zipcode || "",
    }));

    onAreaChange("acode", selectedAcode);
    onAreaChange("zipcode", selectedArea?.locations?.[0]?.zipcode || "");
  };

  return (
    <div className="flex flex-col gap-3 text-lg">
      <div>
        <select
          name="acode"
          value={formData.acode}
          onChange={handleAreaChange}
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
          value={formData.zipcode}
          onChange={handleChange}
        />
      </div>
    </div>
  );
};

export default AreaForm;
