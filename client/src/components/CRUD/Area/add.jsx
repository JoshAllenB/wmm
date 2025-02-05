import { useState } from "react";
import axios from "axios";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";
import InputField from "../input";

const AddArea = ({ fetchAreas }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    _id: "", // This will store the `acode`
    locations: [{ name: "", zipcode: "", description: "" }], // Array of location objects
  });

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  const handleInputChange = (e, index) => {
    const { name, value } = e.target;
    const updatedLocations = formData.locations.map((location, i) =>
      i === index ? { ...location, [name]: value } : location
    );
    setFormData((prev) => ({
      ...prev,
      locations: updatedLocations,
    }));
  };

  const handleAddLocation = () => {
    setFormData((prev) => ({
      ...prev,
      locations: [
        ...prev.locations,
        { name: "", zipcode: "", description: "" },
      ],
    }));
  };

  const handleRemoveLocation = (index) => {
    setFormData((prev) => ({
      ...prev,
      locations: prev.locations.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submitting with _id:", formData._id);
    try {
      await axios.post(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/areas-add`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      setFormData({
        _id: "",
        locations: [{ name: "", zipcode: "", description: "" }],
      });

      fetchAreas();
      closeModal();
    } catch (error) {
      console.error("Error adding area:", error);
    }
  };

  return (
    <div>
      <Button
        onClick={openModal}
        className="bg-green-600 mb-4 hover:bg-green-700 text-white"
      >
        Add Area
      </Button>

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={closeModal}
          className="bg-gray-400 rounded-md bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border border-gray-100"
        >
          <div className="flex flex-col mb-2 p-2">
            <h1 className="text-black mb-2 font-bold">Add New Area</h1>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField
              label="Area Code"
              id="_id"
              name="_id"
              value={formData._id}
              onChange={(e) =>
                setFormData({ ...formData, _id: e.target.value })
              }
              required
            />
            {formData.locations.map((location, index) => (
              <div key={index} className="space-y-2">
                <InputField
                  label="Location Name"
                  name="name"
                  value={location.name}
                  onChange={(e) => handleInputChange(e, index)}
                  required
                />
                <InputField
                  label="Zip Code"
                  name="zipcode"
                  value={location.zipcode}
                  onChange={(e) => handleInputChange(e, index)}
                />
                <InputField
                  label="Description"
                  name="description"
                  value={location.description}
                  onChange={(e) => handleInputChange(e, index)}
                />
              </div>
            ))}
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
      )}
    </div>
  );
};

export default AddArea;
