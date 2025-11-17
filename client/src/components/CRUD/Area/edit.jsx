import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";
import InputField from "../input";
import { useToast } from "../../UI/ShadCN/hooks/use-toast";

const EditArea = ({
  areaId,
  fetchAreas,
  initialData = null,
  onClose,
  onEditSuccess,
  onDeleteSuccess,
}) => {
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    _id: "",
    name: "",
    locations: [],
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState(null);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: "",
    zipcode: "",
    description: "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        _id: initialData._id || "",
        name: initialData.name || "",
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

  const openAddLocationModal = () => {
    setNewLocation({ name: "", zipcode: "", description: "" });
    setShowAddLocationModal(true);
  };

  const removeLocation = (index) => {
    setLocationToDelete(index);
  };

  const confirmRemoveLocation = () => {
    if (locationToDelete !== null) {
      setFormData((prev) => ({
        ...prev,
        locations: prev.locations.filter((_, i) => i !== locationToDelete),
      }));
      setLocationToDelete(null);
    }
  };

  const cancelRemoveLocation = () => {
    setLocationToDelete(null);
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
      location.name && location.name.trim()
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
        onEditSuccess(response.data.data || formData);
        setFormData({
          _id: response.data.data?._id || formData._id,
          name: response.data.data?.name ?? formData.name,
          locations: response.data.data?.locations || formData.locations,
        });
        closeModal();
      }
    } catch (error) {
      console.error("Error updating area:", error);
      const status = error.response?.status;
      let description =
        error.response?.data?.error || "Failed to update area. Please try again.";

      if (status === 401 || status === 403) {
        description += " Please refresh to reconnect to server.";
      }

      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    }
  };

  const handleAddLocationSubmit = async (e) => {
    e.preventDefault();

    if (!newLocation.name.trim()) {
      alert("Location name is required");
      return;
    }

    const updatedLocations = [
      ...formData.locations,
      {
        name: newLocation.name.trim(),
        zipcode: newLocation.zipcode,
        description: newLocation.description,
      },
    ];

    try {
      const payload = {
        _id: formData._id,
        name: formData.name,
        locations: updatedLocations,
      };

      const response = await axios.put(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/areas/${areaId}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (response.data.success) {
        const updated = response.data.data || payload;
        setFormData({ _id: updated._id, name: updated.name || "", locations: updated.locations });
        if (typeof fetchAreas === "function") {
          fetchAreas();
        }
        setShowAddLocationModal(false);
        setNewLocation({ name: "", zipcode: "", description: "" });
      }
    } catch (error) {
      console.error("Error adding location:", error);
      const status = error.response?.status;
      let description =
        error.response?.data?.error || "Failed to add location. Please try again.";

      if (status === 401 || status === 403) {
        description += " Please refresh to reconnect to server.";
      }

      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
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
      const status = error.response?.status;
      let description =
        error.response?.data?.error || "Failed to delete area. Please try again.";

      if (status === 401 || status === 403) {
        description += " Please refresh to reconnect to server.";
      }

      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setShowDeleteConfirm(false);
    setIsDeleting(false);
    setLocationToDelete(null);
    setShowAddLocationModal(false);
    setNewLocation({ name: "", zipcode: "", description: "" });
    onClose();
  };

  return (
    <Modal isOpen={showModal} onClose={closeModal}>
      <div className="bg-white p-6 rounded-2xl shadow-lg max-w-7xl max-h-[85vh] overflow-y-auto scroll-smooth custom-scrollbar">
        <form onSubmit={handleSubmit} className="space-y-4">
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
              onClick={openAddLocationModal}
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

        {/* Area Code / Name Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="Area Code"
            name="_id"
            value={formData._id}
            onChange={(e) => setFormData({ ...formData, _id: e.target.value })}
            required
            placeholder="e.g., LZN"
          />
          <InputField
            label="Area Name (optional)"
            name="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Luzon Region"
          />
        </div>

          {/* Locations Section */}
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Locations</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {formData.locations.map((location, index) => (
              <div
                key={index}
                className="bg-gray-50 border border-gray-200 rounded-lg p-4 transition hover:shadow-sm"
              >
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-white bg-blue-500 p-1">
                    #{index + 1} Location
                  </h4>
                  <button
                    type="button"
                    onClick={() => removeLocation(index)}
                    className="text-xs bg-red-500 text-white hover:bg-red-700 p-1"
                    title="Remove location"
                  >
                    Remove
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
            {showDeleteConfirm && (
              <p className="text-red-600 text-sm mt-2 font-medium">
                ⚠️ Warning: This will permanently delete the entire area and all its locations. Click again to confirm.
              </p>
            )}
          </div>
        </form>

        {/* Location Delete Confirmation Modal */}
        {locationToDelete !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ⚠️ Delete Location?
              </h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete <strong>{formData.locations[locationToDelete]?.name || `Location #${locationToDelete + 1}`}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  onClick={cancelRemoveLocation}
                  className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={confirmRemoveLocation}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add Location Modal */}
        {showAddLocationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Add Location to Area {formData._id}
              </h3>
              <form onSubmit={handleAddLocationSubmit} className="space-y-4">
                <InputField
                  label="Location Name"
                  name="name"
                  value={newLocation.name}
                  onChange={(e) =>
                    setNewLocation((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                  placeholder="e.g., Albay"
                />
                <InputField
                  label="Zipcode"
                  name="zipcode"
                  value={newLocation.zipcode}
                  onChange={(e) =>
                    setNewLocation((prev) => ({
                      ...prev,
                      zipcode: e.target.value,
                    }))
                  }
                  placeholder="e.g., 2800"
                />
                <InputField
                  label="Note / Tag (optional)"
                  name="description"
                  value={newLocation.description}
                  onChange={(e) =>
                    setNewLocation((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="e.g., Bulacan area, special coverage..."
                />

                <div className="flex justify-end gap-3 mt-4">
                  <Button
                    type="button"
                    onClick={() => {
                      setShowAddLocationModal(false);
                      setNewLocation({
                        name: "",
                        zipcode: "",
                        description: "",
                      });
                    }}
                    className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    Save Location
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default EditArea;
