import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";
import InputField from "../input";

const EditArea = ({
  areaId,
  fetchAreas,
  initialData = null,
  onClose,
  onEditSuccess,
  onDeleteSuccess,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    _id: "",
    locations: [],
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      locations: [
        ...prev.locations,
        { name: "", zipcode: "", description: "" },
      ],
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

    // Validate form data
    if (!formData._id.trim()) {
      alert("Area Code is required");
      return;
    }

    // Validate that at least one location has a name
    const hasValidLocation = formData.locations.some((location) =>
      location.name.trim()
    );
    if (!hasValidLocation) {
      alert("At least one location must have a name");
      return;
    }

    try {
      // Use the updated backend endpoint that handles area code changes
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
      if (error.response?.data?.error) {
        alert(`Error: ${error.response.data.error}`);
      } else {
        alert("Failed to update area. Please try again.");
      }
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    try {
      setIsDeleting(true);
      const response = await axios.delete(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/areas/${areaId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (response.status === 200) {
        onDeleteSuccess(areaId);
        closeModal();
      }
    } catch (error) {
      console.error("Error deleting area:", error);
      if (error.response?.data?.error) {
        alert(`Error: ${error.response.data.error}`);
      } else {
        alert("Failed to delete area. Please try again.");
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setShowDeleteConfirm(false);
    setIsDeleting(false);
    onClose();
  };

  return (
    <Modal isOpen={showModal} onClose={closeModal}>
      <div className="bg-white p-6 rounded-2xl shadow-lg max-w-3xl max-h-[85vh] overflow-y-auto scroll-smooth custom-scrollbar">
        {/* Header */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Edit Area: <span className="text-blue-700">{formData._id}</span>
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Manage area details and its locations.
        </p>

        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-gray-200 pb-3">
          <Button
            type="button"
            onClick={addLocation}
            className="bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-2 px-4 py-2 rounded-lg"
          >
            <span className="text-lg">＋</span> Add Location
          </Button>
          <Button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
          >
            Save Changes
          </Button>
          <Button
            type="button"
            onClick={closeModal}
            className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg"
          >
            Cancel
          </Button>
        </div>

        {/* Area Code Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <InputField
            label="Area Code"
            name="_id"
            value={formData._id}
            onChange={(e) => setFormData({ ...formData, _id: e.target.value })}
            required
            placeholder="e.g., LZN"
          />
        </div>

        {/* Locations Section */}
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Locations</h3>

        <div className="space-y-4">
          {formData.locations.map((location, index) => (
            <div
              key={index}
              className="bg-gray-50 border border-gray-200 rounded-lg p-4 transition hover:shadow-sm"
            >
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-700">
                  #{index + 1} Location
                </h4>
                <button
                  type="button"
                  onClick={() => removeLocation(index)}
                  className="text-red-500 hover:text-red-700"
                  title="Remove location"
                >
                  🗑
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Location Name"
                  name="name"
                  value={location.name}
                  onChange={(e) => handleLocationChange(e, index)}
                  required
                  placeholder="e.g., Albay"
                />
                <InputField
                  label="Zipcode"
                  name="zipcode"
                  value={location.zipcode}
                  onChange={(e) => handleLocationChange(e, index)}
                  placeholder="e.g., 2800"
                />
              </div>

              <div className="mt-3">
                <InputField
                  label="Note / Tag (optional)"
                  name="description"
                  value={location.description}
                  onChange={(e) => handleLocationChange(e, index)}
                  placeholder="e.g., Bulacan area, special coverage..."
                />
              </div>
            </div>
          ))}
        </div>

        {/* Danger Zone */}
        <div className="mt-8 border-t border-red-200 pt-4">
          <Button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
          >
            {isDeleting
              ? "Deleting..."
              : showDeleteConfirm
              ? "Confirm Delete"
              : "Delete Area"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EditArea;
