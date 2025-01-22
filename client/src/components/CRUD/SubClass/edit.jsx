import { useState, useEffect } from "react";
import { useUser } from "../../../utils/Hooks/userProvider";
import axios from "axios";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";
import InputField from "../input";
import Delete from "./delete";

const Edit = ({ rowData, onEditSuccess, onClose, onDeleteSuccess }) => {
  const { user, hasRole } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
  });

  useEffect(() => {
    if (rowData) {
      setFormData(rowData);
      setShowModal(true);
    }
  }, [rowData]);

  const closeModal = () => {
    setShowModal(false);
    onClose();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submitting form data:", formData);
    try {
      const response = await axios.put(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/subclass-edit/${
          rowData.id
        }`,
        { ...formData, newId: formData.id },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      console.log("Response from server:", response.data);
      if (response.data.success) {
        onEditSuccess(response.data.data);
        closeModal();
      } else {
        console.error("Update failed:", response.data);
      }
    } catch (error) {
      console.error("Error updating subclass:", error);
    }
  };

  return (
    <Modal isOpen={showModal} onClose={closeModal}>
      <h2 className="text-xl font-bold text-black mb-4">
        Edit Subclass Information
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col mb-2 p-2">
          <InputField
            label="ID"
            id="id"
            name="id"
            value={formData.id}
            onChange={handleInputChange}
            required
          />
          <InputField
            label="Name"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
          <InputField
            label="Description"
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="flex justify-between mt-4">
          <Button
            type="submit"
            className="text-sm text-white bg-green-600 hover:bg-green-800"
          >
            Save
          </Button>
          <Button
            onClick={closeModal}
            className="text-white bg-red-500 hover:bg-red-800"
          >
            Cancel
          </Button>
        </div>
      </form>
      <Delete
        subclass={rowData}
        onClose={closeModal}
        onDeleteSuccess={onDeleteSuccess}
      />
    </Modal>
  );
};

export default Edit;
