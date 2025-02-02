import { useState, useEffect } from "react";
import { fetchAreas } from "../components/Table/Data/utilData";
import InputField from "../components/CRUD/input";

const AreaForm = ({ onAreaChange, initialAreaData }) => {
  const [areas, setAreas] = useState([]);
  const [formData, setFormData] = useState(
    initialAreaData || {
      area: "",
      acode: "",
      zipcode: "",
    }
  );

  useEffect(() => {
    const loadAreas = async () => {
      try {
        const areasData = await fetchAreas();
        setAreas(areasData);
      } catch (error) {
        console.error("Error loading areas:", error);
      }
    };
    loadAreas();
  }, []);

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
    const selectedArea = areas.find((area) => area.name === selectedAcode);

    setFormData((prevData) => ({
      ...prevData,
      acode: selectedAcode,
      zipcode: selectedArea?.zipcode || "",
    }));

    onAreaChange("acode", selectedAcode);
    onAreaChange("zipcode", selectedArea?.zipcode || "");
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
            <option key={`${area.id}`} value={area.name}>
              {area.id} - {area.acode} ({area.name})
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
