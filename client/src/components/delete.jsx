import { useEffect, useState } from "react";
import { Button } from "./UI/ShadCN/button";
import Modal from "./modal";
import axios from "axios";
import io from "socket.io-client";

const socket = io("http://localhost:3001");

const Delete = ({ client, onClose, onDelete }) => {
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    socket.on("connect", () => {
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleDelete = async () => {
    try {
      const response = await axios.delete(
        `http://localhost:3001/clients/${client.id}`
      );
      if (response.status === 200) {
        onDelete(client.id);
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
        onClick={() => setShowConfirmation(true)}
        className="bg-red-500 hover:bg-red-800"
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
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-800 rounded-xl"
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
