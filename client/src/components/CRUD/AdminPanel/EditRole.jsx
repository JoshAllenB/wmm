import { useState } from "react";
import Modal from "../../modal";
import { Button } from "../../UI/ShadCN/button";
import InputField from "../input";
import userService from "../../../services/userService";
import { toast } from "react-hot-toast";

const EditRole = ({ rowData, onClose, onDeleteSuccess }) => {
  const [formData, setFormData] = useState({
    name: rowData?.name || "",
    description: rowData?.description || "",
    defaultPermissions: rowData?.defaultPermissions?.map(p => p._id) || []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await userService.updateRole(rowData._id, {
        ...formData,
        defaultPermissions: formData.defaultPermissions
      });
      toast.success("Role updated successfully");
      onClose();
    } catch (err) {
      console.error("Error updating role:", err);
      toast.error("Failed to update role. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this role?")) {
      return;
    }

    setIsSubmitting(true);
    try {
      await userService.deleteRole(rowData._id);
      toast.success("Role deleted successfully");
      if (onDeleteSuccess) {
        onDeleteSuccess(rowData._id);
      }
      onClose();
    } catch (err) {
      console.error("Error deleting role:", err);
      toast.error("Failed to delete role. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Modal isOpen={true} onClose={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl text-gray-800 font-bold">Edit Role</h2>
          <button
            onClick={onClose}
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
          
          <div className="flex justify-between space-x-2 mt-6">
            <Button
              type="button"
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition duration-200"
              disabled={isSubmitting}
            >
              Delete Role
            </Button>
            <div className="flex space-x-2">
              <Button
                type="button"
                onClick={onClose}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded transition duration-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-200"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EditRole; 