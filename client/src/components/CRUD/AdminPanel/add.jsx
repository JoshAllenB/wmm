import { useState } from "react";
import axios from "axios";
import Modal from "../../modal";
import { Button } from "../../UI/ShadCN/button";
import InputField from "../input";

const Add = () => {
  const [showModal, setShowModal] = useState(false);
  const [userData, setUserData] = useState({
    username: "",
    password: "",
    role: "",
  });

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:3001/users/add", userData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      closeModal();
      setUserData({ username: "", password: "", role: "" });
    } catch (err) {
      console.error("Error adding user:", err);
    }
  };

  return (
    <>
      <Button
        onClick={openModal}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
      >
        Add User
      </Button>
      {showModal && (
        <Modal isOpen={showModal} onClose={closeModal}>
          <div className="flex justify-between items-center mb-4 ">
            <h2 className="text-2xl text-black font-bold">Add New User</h2>
          </div>
          <div className="flex justify-center m-5">
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col align-center justify-center w-[300px]">
                <InputField
                  label="Username"
                  name="username"
                  value={userData.username}
                  onChange={(e) =>
                    setUserData({ ...userData, username: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                />
                <InputField
                  label="Password"
                  name="password"
                  type="password"
                  value={userData.password}
                  onChange={(e) =>
                    setUserData({ ...userData, password: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                />
                <label className="block font-medium text-gray-700">Role:</label>
                <select
                  value={userData.role}
                  onChange={(e) =>
                    setUserData({ ...userData, role: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md text-center shadow-sm text-black border-gray-300 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                >
                  <option value="">Select Role</option>
                  <option value="Editor">Editor</option>
                  <option value="Viewer">Viewer</option>
                </select>
                <Button
                  type="submit"
                  className="flex justify-center bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4"
                >
                  Add User
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </>
  );
};

export default Add;
