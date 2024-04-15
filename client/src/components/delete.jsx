import { useState } from "react";
import { Button } from "./ui/button";
import Modal from "./modal";

const Delete = ({ client, onDelete, onClose }) => {
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleDelete = async () => {
    try {
      await onDelete(client._id);
      onClose(); // Close the modal after successful deletion
    } catch (error) {
      console.error("Error deleting client:", error);
      // Optionally, you can show a message to the user indicating the deletion failed
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowConfirmation(true)}
        className="bg-red-500 hover:bg-red-900"
      >
        Delete
      </Button>
      {showConfirmation && (
        <Modal onClose={() => setShowConfirmation(false)}>
          <h2 className="text-xl font-bold mb-4">Delete Client</h2>
          <p>Are you sure you want to delete this client?</p>
          <div className="flex justify-start mt-4 gap-1">
            <Button
              onClick={handleDelete}
              className="ml-2 bg-red-500 hover:bg-red-900"
            >
              Delete
            </Button>
            <Button onClick={onClose}>Cancel</Button>
          </div>
        </Modal>
      )}
    </>
  );
};

export default Delete;
