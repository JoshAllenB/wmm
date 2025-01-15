import { useState } from "react";
import axios from "axios";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";

import InputField from "../input";
import { BACKEND_URL } from "../../../config";

const Add = ({ fetchHrg }) => {
  const [formData, setFormData] = useState({
    clientid: "",
    recvdate: "",
    renewdate: "",
    paymtamt: "",
    unsubscribe: "",
    adddate: "",
    adduser: "",
  });

  const [showModal, setShowModal] = useState(false);

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value || "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const submissionData = {
      ...formData,
      unsubscribe: formData.unsubscribe || "0",
    };

    try {
      await axios.post(`${BACKEND_URL}/hrg/add`, submissionData);
      fetchHrg();
      closeModal();
      setFormData({
        clientid: "",
        recvdate: "",
        renewdate: "",
        paymtamt: "",
        unsubscribe: "",
        adddate: "",
        adduser: "",
      });
    } catch (e) {
      console.error("Error adding hrg:", e);
    }
  };

  return (
    <div>
      <Button
        onClick={openModal}
        className="bg-green-600 mb-4 hover:bg-green-700"
      >
        Add HRG Client
      </Button>

      {showModal && (
        <Modal
          isOpen={setShowModal}
          onClose={closeModal}
          className=" bg-gray-400 rounded-md bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border border-gray-100"
        >
          <h2 className="text-xl font-bold mb-4 text-gray-900">
            Add HRG Client
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 ">
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
            </div>
          </form>
          <div className="flex gap-1">
            <Button
              onClick={closeModal}
              className="bg-red-600 mb-4 hover:bg-red-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              type="submit"
              className="bg-green-600 mb-4 hover:bg-green-700"
            >
              Submit
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Add;
