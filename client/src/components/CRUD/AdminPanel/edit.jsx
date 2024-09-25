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
      oldpassword: "",
      newpassword: "",
      confirmpassword: "",
      role: "",
    }),
    [],
  );

  const [formData, setFormData] = useState(initialFormData);
  const [showModal, setShowModal] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [roles, setRoles] = useState([]);

  const closeModal = () => setShowModal(false);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await axios.get("http://localhost:3001/roles", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        });
        setRoles(response.data);
      } catch (err) {
        console.error("error fetching roles:", err);
      }
    };
    fetchRoles();

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

    const dataToSend = {
      username: formData.username,
      role: formData.role,
    };

    if (showPasswordFields) {
      dataToSend.oldpassword = formData.oldpassword;
      dataToSend.newpassword = formData.newpassword;
    }

    try {
      await axios.put(
        `http://localhost:3001/users/update/${rowData._id}`,
        dataToSend,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
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
              <label className="block font-medium text-gray-700">Role:</label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                className="mt-1 block w-full rounded-md text-center shadow-sm text-black border-gray-300 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              >
                <option value="">Select Role</option>
                {roles.map((role) => (
                  <option key={role._id} value={role.name}>
                    {role.name}
                  </option>
                ))}
              </select>
              {!showPasswordFields && (
                <Button
                  type="Button"
                  onClick={() => setShowPasswordFields(true)}
                  className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Change Password
                </Button>
              )}
              {showPasswordFields && (
                <>
                  <InputField
                    label="Old Password"
                    id="oldpassword"
                    name="oldpassword"
                    type="password"
                    value={formData.oldpassword}
                    onChange={handleChange}
                  />
                  <InputField
                    label="New Password"
                    id="newpassword"
                    name="newpassword"
                    type="password"
                    value={formData.newpassword}
                    onChange={handleChange}
                  />
                  <InputField
                    label="Confirm New Password"
                    id="confirmpassword"
                    name="confirmpassword"
                    type="password"
                    value={formData.confirmpassword}
                    onChange={handleChange}
                  />
                </>
              )}
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
