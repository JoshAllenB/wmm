import { useState, useEffect } from "react";
import Modal from "../../modal";
import { Button } from "../../UI/ShadCN/button";
import InputField from "../input";
import userService from "../../../services/userService";
import { toast } from "react-hot-toast";

const AddRole = ({ onRoleAdded }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    defaultPermissions: []
  });
  const [permissions, setPermissions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openModal = () => setShowModal(true);
  const closeModal = () => {
    setShowModal(false);
    setFormData({
      name: "",
      description: "",
      defaultPermissions: []
    });
  };

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await userService.getPermissions();
        setPermissions(response);
      } catch (err) {
        console.error("Error fetching permissions:", err);
        toast.error("Failed to load permissions");
      }
    };
    fetchPermissions();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await userService.createRole(formData);
      toast.success("Role created successfully");
      if (onRoleAdded) {
        await onRoleAdded();
      }
      closeModal();
    } catch (err) {
      console.error("Error creating role:", err);
      toast.error("Failed to create role. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handlePermissionChange = (permissionId) => {
    setFormData((prevData) => ({
      ...prevData,
      defaultPermissions: prevData.defaultPermissions.includes(permissionId)
        ? prevData.defaultPermissions.filter((id) => id !== permissionId)
        : [...prevData.defaultPermissions, permissionId]
    }));
  };

  return (
    <>
      <Button
        onClick={openModal}
        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition duration-200"
      >
        Add Role
      </Button>
      {showModal && (
        <Modal isOpen={showModal} onClose={closeModal}>
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl text-gray-800 font-bold">Add New Role</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              ></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <InputField
                label="Role Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <InputField
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-700">Default Permissions:</h3>
                <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-200 rounded-md p-3">
                  {permissions.map((permission) => (
                    <label
                      key={permission._id}
                      className="flex items-center space-x-2 text-gray-600"
                    >
                      <input
                        type="checkbox"
                        checked={formData.defaultPermissions.includes(permission._id)}
                        onChange={() => handlePermissionChange(permission._id)}
                        className="form-checkbox h-4 w-4 text-blue-500"
                      />
                      <span className="text-sm">{permission.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <Button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded transition duration-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-200"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </>
  );
};

export default AddRole; 