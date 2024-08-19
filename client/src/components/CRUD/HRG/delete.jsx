import { useState } from "react";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";
import axios from "axios";

const Delete = ({ hrg, onClose, onDeleteSuccess }) => {
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleDelete = async () => {
    if (!hrg || !hrg.id) {
      console.error("Error: HRG data is undefined or missing id");
      return;
    }

    try {
      const response = await axios.delete(
        `http://localhost:3001/hrg/delete/${hrg.id}`,
      );
      if (response.status === 200) {
        onDeleteSuccess(hrg.id);
        onClose();
      } else {
        console.error("Error: Deletion was not successful");
      }
    } catch (e) {
      console.error("Error deleting client", e);
    }
  };

  return (
    <>
      <Button
        onClick={() => {
          setShowConfirmation(true);
        }}
        className="bg-red-500 hover:bg-red-800"
      >
        Delete
      </Button>
      {showConfirmation && (
        <Modal
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
        >
          <h2 className="text-xl font-bold mb-4 text-black">Delete Hrg</h2>
          <p className="text-black">
            Are you sure you want to delete this HRG client?
          </p>
          <div className="flex justify-normal mt-4 gap-1">
            <Button
              onClick={() => {
                handleDelete();
              }}
              className="bg-red-500 hover:bg-red-800 rounded-xl"
            >
              Delete
            </Button>
            <Button
              onClick={() => setShowConfirmation(false)}
              className="bg-gray-500 hover:bg-gray-800 rounded-xl"
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
