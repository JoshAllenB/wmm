import { useState } from "react";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";
import axios from "axios";

const Delete = ({ subclass, onClose, onDeleteSuccess }) => {
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleDelete = async () => {
    try {
      const response = await axios.delete(
        `http://localhost:3001/util/subclass-delete/${subclass.id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      if (response.status === 200) {
        onDeleteSuccess(subclass.id);
        onClose();
      } else {
        console.error("Error: Deletion was not successful");
      }
    } catch (e) {
      console.error("Error deleting subclass", e);
    }
  };

  return (
    <>
      <Button
        onClick={(e) => {
          e.preventDefault();
          setShowConfirmation(true);
        }}
        className="bg-red-500 hover:bg-red-800 text-white"
      >
        Delete
      </Button>
      {showConfirmation && (
        <Modal
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
        >
          <h2 className="text-xl font-bold mb-4 text-black">Delete Subclass</h2>
          <p className="text-black">
            Are you sure you want to delete this subclass?
          </p>
          <div className="flex justify-start mt-4 gap-1">
            <Button
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-800 rounded-xl text-white"
            >
              Delete
            </Button>
            <Button
              onClick={() => setShowConfirmation(false)}
              className="bg-gray-500 hover:bg-gray-700 rounded-xl text-white"
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
