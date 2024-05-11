import { useState } from "react";
import { Button } from "./UI/ShadCN/button";
import Modal from "./modal";
import axios from "axios";

const Delete = ({ client, onDelete, onClose }) => {
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleDelete = async () => {
    try {
      await axios.delete(`http://localhost:3001/clients/${client.id}`);
      console.log("Client deleted successfully:", client.id);
      if (onDelete) {
        onDelete(client.id);
      }
      onClose();
    } catch (e) {
      console.error("Error deleting client", e);
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
          <h2 className="text-xl font-bold mb-4 text-black">Delete Client</h2>
          <p className="text-black">
            Are you sure you want to delete this client?
          </p>
          <div className="flex justify-start mt-4 gap-1">
            <Button
              onClick={() => handleDelete(client.id)}
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
