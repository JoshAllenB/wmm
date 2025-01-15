import { useState, useEffect } from "react";
import { BACKEND_URL } from "../config";

const AreaForm = ({ onAreaChange, initialAreaData }) => {
  const [areas, setAreas] = useState([]);
  const [formData, setFormData] = useState({
    acode: "",
    zipcode: "",
  });

  useEffect(() => {
    fetchAreas();
  }, []);

  useEffect(() => {
    if (initialAreaData) {
      setFormData(initialAreaData);
    }
  }, [initialAreaData]);

  const fetchAreas = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/areas`);
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
        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-2 ring-gray-300 placeholder:text-gray-300 focus:ring-3 p-3"
      />
      <input
        type="text"
        name="zipcode"
        value={formData.zipcode}
        onChange={handleChange}
        placeholder="Zip Code"
        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-2 ring-gray-300 placeholder:text-gray-300 focus:ring-3 p-3"
      />
    </div>
  );
};

export default AreaForm;
