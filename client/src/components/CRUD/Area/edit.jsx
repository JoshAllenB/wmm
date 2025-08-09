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
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-black mb-4">
          Edit Area - {formData._id}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Area Code Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <svg
                className="w-4 h-4 text-blue-600 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-medium text-blue-800">
                Area Code
              </span>
            </div>
            <InputField
              label="Area Code"
              name="_id"
              value={formData._id}
              onChange={(e) =>
                setFormData({ ...formData, _id: e.target.value })
              }
              required
              placeholder="e.g., LZN, LZN 1"
            />
            {formData._id !== areaId && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                ⚠️ Changing the area code will update the area identifier.
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Locations</h3>
            {formData.locations.map((location, index) => (
              <div
                key={index}
                className="border border-gray-300 p-4 rounded-lg bg-gray-50"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                      <span className="text-xs font-bold text-blue-600">
                        {index + 1}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      Location {index + 1}
                    </span>
                  </div>
                  <Button
                    type="button"
                    onClick={() => removeLocation(index)}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            onClick={addLocation}
            className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Add New Location
          </Button>

          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-300">
            <Button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-800 text-white px-4 py-2 rounded flex items-center"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : showDeleteConfirm ? (
                <>
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Confirm Delete
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Delete Area
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={closeModal}
              className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-800 text-white px-4 py-2 rounded"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EditArea;
