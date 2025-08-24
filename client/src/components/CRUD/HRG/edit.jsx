import { useEffect, useMemo, useState } from "react";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";
import Delete from "./delete";
import InputField from "../input";
import axios from "axios";

const Edit = ({ rowData, onDeleteSuccess, onClose }) => {
  const initialFormData = useMemo(
    () => ({
      clientid: "",
      recvdate: "",
      renewdate: "",
      paymtamt: "",
      paymtform: "",
      unsubscribe: "",
      adddate: "",
      adduser: "",
    }),
    []
  );

  const [formData, setFormData] = useState(initialFormData);
  const [showModal, setShowModal] = useState(false);

  const closeModal = () => setShowModal(false);

  useEffect(() => {
    setFormData({
      ...initialFormData,
      ...rowData,
    });

    setShowModal(true);
  }, [rowData, initialFormData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData) return;

    try {
      await axios.put(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/hrg/${rowData.id}`,
        formData
      );
      onClose();
      setShowModal(false);
    } catch (e) {
      console.error("Error updating hrg:", e);
    }
  };

  return (
    <>
      {showModal && (
        <Modal isOpen={setShowModal} onClose={closeModal}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="flex flex-col text-xl font-bold text-black">
              Edit HRG Information
            </h2>
          </div>
          <h1 className="text-black font-bold">HRG ID: {formData.id}</h1>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col mb-2 p-2">
              <InputField
                label="Client ID"
                name="clientid"
                value={formData.clientid}
                onChange={handleChange}
              />
              <InputField
                label="Receive Date"
                name="recvdate"
                value={formData.recvdate}
                onChange={handleChange}
              />
              <InputField
                label="Renew Date"
                name="renewdate"
                value={formData.renewdate}
                onChange={handleChange}
              />
              <InputField
                label="Payment Amount"
                name="paymtamt"
                value={formData.paymtamt}
                onChange={handleChange}
              />
              <InputField
                label="Payment Form"
                name="paymtform"
                value={formData.paymtform}
                onChange={handleChange}
              />
              <InputField
                label="Unsubscribe"
                name="unsubscribe"
                value={formData.unsubscribe}
                onChange={handleChange}
              />
              <InputField
                label="Add Date"
                name="adddate"
                value={formData.adddate}
                onChange={handleChange}
              />
              <InputField
                label="Add User"
                name="adduser"
                value={formData.adduser}
                onChange={handleChange}
              />
            </div>
          </form>
          <div className="mt-4 flex justify-between">
            <div className="flex gap-1">
              <Button
                onClick={handleSubmit}
                className="text-sm bg-green-600 hover:bg-green-800"
              >
                Save
              </Button>
              <Button onClick={onClose} className="bg-red-500 hover:bg-red-800">
                Cancel
              </Button>
            </div>
            <div className="flex gap-1">
              <Delete
                hrg={rowData}
                onClose={onClose}
                onDeleteSuccess={onDeleteSuccess}
              />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default Edit;
