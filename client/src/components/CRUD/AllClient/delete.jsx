import { useState } from "react";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";
import axios from "axios";

const Delete = ({
  client,
  onClose,
  onDeleteSuccess,
  currentFetchParams = null,
}) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      // Build query string from currentFetchParams if provided
      const params = new URLSearchParams();
      if (currentFetchParams) {
        const {
          page,
          pageSize,
          filter,
          group,
          advancedFilterData,
          subscriptionType,
          addedToday,
        } = currentFetchParams;
        if (page) params.append("page", page);
        if (pageSize) params.append("pageSize", pageSize);
        if (filter) params.append("filter", filter);
        if (group) params.append("group", group);
        if (subscriptionType)
          params.append("subscriptionType", subscriptionType);
        if (addedToday) params.append("addedToday", addedToday);
        if (advancedFilterData) {
          Object.entries(advancedFilterData).forEach(([k, v]) => {
            if (Array.isArray(v)) v.forEach((item) => params.append(k, item));
            else if (v !== undefined && v !== null) params.append(k, v);
          });
        }
      }

      const url = `http://${
        import.meta.env.VITE_IP_ADDRESS
      }:3001/clients/delete/${client.id}${
        params.toString() ? `?${params.toString()}` : ""
      }`;

      const response = await axios.delete(url);
      if (response.status === 200) {
        onDeleteSuccess(client.id);
        onClose();
      } else {
        setError("Failed to delete client. Please try again.");
      }
    } catch (e) {
      console.error("Error deleting client", e);
      setError("An error occurred while deleting the client.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowConfirmation(true)}
        className="bg-red-500 hover:bg-red-800 text-white"
      >
        Delete
      </Button>
      {showConfirmation && (
        <Modal
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
        >
          <h2 className="text-xl font-bold mb-4 text-black">Delete Client</h2>
          <p className="text-black mb-4">
            Are you sure you want to delete {client.name || "this client"}? This
            action cannot be undone.
          </p>

          {error && (
            <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-end mt-6 gap-3">
            <Button
              onClick={() => setShowConfirmation(false)}
              variant="outline"
              className="border-gray-300 text-gray-700"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-800"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
};

export default Delete;
