import { useEffect, useMemo, useState } from "react";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";
import InputField from "../input";
import axios from "axios";
import Delete from "./delete";

const Edit = ({ rowData, onDeleteSuccess, onClose }) => {
  const initialFormData = useMemo(
    () => ({
      username: "",
      password: "",
      role: "",
    }),
    []
  );

  const [formData, setFormData] = useState(initialFormData);
  const [showModal, setShowModal] = useState(false);

  const closeModal = () => setShowModal(false);

  useEffect(() => {
    if (rowData) {
      setFormData({
        ...initialFormData,
        ...rowData,
      });
    }
    setShowModal(true);
  }, [rowData, initialFormData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value || "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("accessToken");
    if (!token) {
      throw new Error("Token not found");
    }

    try {
      await axios.put(
        `http://localhost:3001/users/update/${rowData._id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      onClose();
      setShowModal(false);
    } catch (e) {
      console.error("Error updating user:", e);
    }
  };

  return (
    <>
      {showModal && (
        <Modal isOpen={setShowModal} onClose={closeModal}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Edit User Information</h2>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col mb-2 p-2">
              <InputField
                label="Username"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
              />
              <InputField
                label="Password"
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
              />
              <label className="block font-medium text-gray-700">Role:</label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                className="mt-1 block w-full rounded-md text-center shadow-sm text-black border-gray-300 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              >
                <option value="">Select Role</option>
                <option value="Editor">Editor</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>
          </form>
          <div className="mt-4 flex justify-between">
            <Button
              onClick={handleSubmit}
              className="bg-green-600 hover:bg-green-800 text-white font-bold py-2 px-4 rounded"
            >
              Save
            </Button>

            <Delete
              userId={rowData._id}
              onClose={onClose}
              onDeleteSuccess={onDeleteSuccess}
            />
          </div>
        </Modal>
      )}
    </>
  );
};

export default Edit;
