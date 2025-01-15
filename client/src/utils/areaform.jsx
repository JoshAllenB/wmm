import { useState, useEffect } from "react";

const AreaForm = ({ onAreaChange, initialAreaData }) => {
  // eslint-disable-next-line no-unused-vars
  const [areas, setAreas] = useState([]);
  const [formData, setFormData] = useState(
    initialAreaData || {
      area: "",
      acode: "",
      zipcode: "",
    }
  );

  useEffect(() => {
    fetchAreas();
  }, []);

  const fetchAreas = async () => {
    try {
      const response = await fetch("http://localhost:3001/areas");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAreas(data);
    } catch (error) {
      console.error("Error fetching areas:", error);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    onAreaChange(name, value);
  };

  return (
    <div className="flex flex-col gap-3 text-lg mb-5 mt-5">
      <input
        type="text"
        name="acode"
        value={formData.acode}
        onChange={handleChange}
        placeholder="Area Code"
      />
      <input
        type="text"
        name="zipcode"
        value={formData.zipcode}
        onChange={handleChange}
        placeholder="Zip Code"
      />
    </div>
  );
};

export default AreaForm;
