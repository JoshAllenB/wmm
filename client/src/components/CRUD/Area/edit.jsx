import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";
import InputField from "../input";

const EditArea = ({ areaId, fetchAreas, initialData = null, onClose, onEditSuccess }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    _id: "",
    locations: [],
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        _id: initialData._id || "",
        locations: initialData.locations || [],
      });
      setShowModal(true);
    }
  }, [initialData]);

  const handleLocationChange = (e, index) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updatedLocations = [...prev.locations];
      updatedLocations[index] = { ...updatedLocations[index], [name]: value };
      return { ...prev, locations: updatedLocations };
    });
  };

  const addLocation = () => {
    setFormData((prev) => ({
      ...prev,
      locations: [...prev.locations, { name: "", zipcode: "", description: "" }],
    }));
  };

  const removeLocation = (index) => {
    setFormData((prev) => ({
      ...prev,
      locations: prev.locations.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/areas/${areaId}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      if (response.data.success) {
        onEditSuccess(formData);
        closeModal();
      }
    } catch (error) {
      console.error("Error updating area:", error);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    onClose();
  };

  return (
    <Modal isOpen={showModal} onClose={closeModal}>
      <h2 className="text-xl font-bold text-black mb-4">
        Edit Area - {formData._id}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {formData.locations.map((location, index) => (
          <div key={index} className="grid grid-cols-3 gap-2 border p-2 rounded">
            <InputField
              label="Location Name"
              name="name"
              value={location.name}
              onChange={(e) => handleLocationChange(e, index)}
              required
            />
            <InputField
              label="Zipcode"
              name="zipcode"
              value={location.zipcode}
              onChange={(e) => handleLocationChange(e, index)}
            />
            <InputField
              label="Description"
              name="description"
              value={location.description}
              onChange={(e) => handleLocationChange(e, index)}
            />
            <Button
              type="button"
              onClick={() => removeLocation(index)}
              className="bg-red-500 text-white"
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          onClick={addLocation}
          className="bg-green-500 text-white"
        >
          Add Location
        </Button>
        <div className="flex gap-1 mt-4">
          <Button
            type="button"
            onClick={closeModal}
            className="text-white bg-red-500 hover:bg-red-800 rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="text-white text-sm bg-green-600 hover:bg-green-800 rounded-xl"
          >
            Submit
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditArea;
