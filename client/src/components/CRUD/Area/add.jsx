import { useState } from "react";
import axios from "axios";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";
import InputField from "../input";
import { useToast } from "../../UI/ShadCN/hooks/use-toast";

const AddArea = ({ fetchAreas }) => {
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    _id: "", // This will store the `acode`
    name: "", // Optional human-friendly area name
    locations: [{ name: "", zipcode: "", description: "" }], // Array of location objects
  });

  const openModal = () => setShowModal(true);
  const closeModal = () => {
    setShowModal(false);
    // Reset form data when closing
    setFormData({
      _id: "",
      name: "",
      locations: [{ name: "", zipcode: "", description: "" }],
    });
  };

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
    if (formData.locations.length > 1) {
      setFormData((prev) => ({
        ...prev,
        locations: prev.locations.filter((_, i) => i !== index),
      }));
    }
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

    // Keep only locations that have a name to satisfy backend validation
    const validLocations = formData.locations.filter(
      (location) => location.name && location.name.trim()
    );

    const submitData = {
      ...formData,
      locations: validLocations,
    };

    try {
      const response = await axios.post(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/areas-add`,
        submitData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (response.status === 201) {
        fetchAreas();
        closeModal();
      }
    } catch (error) {
      console.error("Error adding area:", error);
      const status = error.response?.status;
      let description =
        error.response?.data?.error || "Failed to create area. Please try again.";

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

  return (
    <div>
      <Button
        onClick={openModal}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
      >
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
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        Add Area
      </Button>

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={closeModal}
          className="bg-gray-400 rounded-md bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border border-gray-100"
        >
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex flex-col mb-4">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-gray-900">
                  Add New Area
                </h1>
              </div>
            </div>

            <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900" role="alert">
              <div className="flex">
                <svg className="w-5 h-5 text-amber-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                </svg>
                <div>
                  <p className="font-medium">How to add an Area</p>
                  <ul className="list-disc ml-5 text-sm mt-1 space-y-1">
                    <li>Enter an Area Code (e.g., LZN). This is required.</li>
                    <li>Add at least one Location and fill the Location Name. Zip Code and Description are optional.</li>
                    <li>Only locations with a name will be saved.</li>
                    <li>Use "Add Another Location" to add more locations.</li>
                  </ul>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                    Area Information
                  </span>
                </div>
                <InputField
                  label="Area Code"
                  id="_id"
                  name="_id"
                  value={formData._id}
                  onChange={(e) =>
                    setFormData({ ...formData, _id: e.target.value })
                  }
                  required
                  placeholder="e.g., LZN, LZN 1"
                />
                <InputField
                  label="Area Name (optional)"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Luzon Region"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Locations
                  </h3>
                  <span className="text-sm text-gray-500">
                    {formData.locations.length} location
                    {formData.locations.length !== 1 ? "s" : ""}
                  </span>
                </div>

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
                      {formData.locations.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => handleRemoveLocation(index)}
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
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <InputField
                        label="Location Name"
                        name="name"
                        value={location.name}
                        onChange={(e) => handleInputChange(e, index)}
                        required={index === 0} // Only first location is required
                        placeholder="Enter location name"
                      />
                      <InputField
                        label="Zip Code"
                        name="zipcode"
                        value={location.zipcode}
                        onChange={(e) => handleInputChange(e, index)}
                        placeholder="Enter zip code"
                      />
                      <InputField
                        label="Description"
                        name="description"
                        value={location.description}
                        onChange={(e) => handleInputChange(e, index)}
                        placeholder="Enter description"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                onClick={handleAddLocation}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
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
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Add Another Location
              </Button>

              <div className="flex gap-3 pt-4 border-t border-gray-300">
                <Button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  Create Area
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AddArea;
