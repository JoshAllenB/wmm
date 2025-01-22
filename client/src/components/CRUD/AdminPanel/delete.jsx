import { useState } from "react";
import axios from "axios";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";

const Delete = ({ userId, onDeleteSuccess, onClose }) => {
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleDelete = async () => {
    try {
      const response = await axios.delete(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/users/delete/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      if (response.status === 200) {
        onDeleteSuccess(userId);
        onClose();
      } else {
        console.error("Error: Deletion was not successful");
      }
    } catch (err) {
      console.error("Error deleting user:", err);
    } finally {
      console.log("Setting showConfirmation to false");
      setShowConfirmation(false);
    }
  };

  return (
    <>
      <Button className="bg-red-500" onClick={() => setShowConfirmation(true)}>
        Delete
      </Button>
      {showConfirmation && (
        <Modal
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
        >
          <h2 className="text-xl font-bold mb-4 text-black">Delete User</h2>
          <p className="text-black">
            Are you sure you want to delete this user?
          </p>
          <div className="flex justify-end mt-4 gap-1">
            <Button
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-800"
            >
              Delete
            </Button>
            <Button
              onClick={() => setShowConfirmation(false)}
              className="bg-gray-300 hover:bg-gray-400"
            >
              Cancel
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
};

export default Delete;
