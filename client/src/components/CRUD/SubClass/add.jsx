import { useState } from "react";
import { useUser } from "../../../utils/Hooks/userProvider";
import axios from "axios";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";
import InputField from "../input";

const Add = ({ fetchSubclasses }) => {
  const { user, hasRole } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
  });

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `http://${import.meta.env.VITE_IP_ADDRESS}$1`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      setFormData({ id: "", name: "", description: "" });
      fetchSubclasses();
      closeModal();
    } catch (error) {
      console.error("Error adding subclass:", error);
    }
  };

  return (
    <div>
      <Button
        onClick={openModal}
        className="bg-green-600 mb-4 hover:bg-green-700 text-white"
      >
        Add Subclass
      </Button>

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={closeModal}
          className="bg-gray-400 rounded-md bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border border-gray-100"
        >
          <div className="flex flex-col mb-2 p-2">
            <h1 className="text-black mb-2 font-bold">Add New Subclass</h1>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <InputField
                label="ID"
                id="id"
                name="id"
                value={formData.id}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <InputField
                label="Name"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <InputField
                label="Description"
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
              />
            </div>
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

export default Add;
