import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Modal from "./modal";
import { Button } from "./UI/ShadCN/button";

const Mailing = ({ clientId, address }) => {
  const [editableAddress, setEditableAddress] = useState(address);
  const [previewMode, setPreviewMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const printableContentRef = useRef(null);

  useEffect(() => {
    setEditableAddress(address);
  }, [address]);

  const handleEdit = () => {
    setPreviewMode(false);
  };

  const handlePreview = () => {
    setPreviewMode(true);
  };

  const handleSave = async () => {
    try {
      await axios.put(`/address/${clientId}`, { address: editableAddress });
      setPreviewMode(true);
    } catch (e) {
      console.error("Error saving address:", e);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.open();
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Mailing Label</title>
          <style>
            /* Add any necessary styles for printing */
          </style>
        </head>
        <body>
          ${printableContentRef.current.innerHTML}
          <script>
            window.print();
            window.close();
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const toggleModal = () => {
    setModalOpen(!modalOpen);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  return (
    <div className="flex justify-between">
      <Button
        onClick={toggleModal}
        className="text-sm bg-green-600 hover:bg-green-800"
      >
        Print
      </Button>
      {modalOpen && (
        <Modal>
          {previewMode ? (
            <div>
              <h2 className="text-black">Mailing Label Preview</h2>
              <textarea
                ref={printableContentRef}
                value={editableAddress}
                readOnly
                rows={5}
                cols={50}
                className="w-full border border-black rounded-md px-3 py-2 text-black"
              />
              <div className="flex justify-between">
                <div className="flex gap-2">
                  <Button
                    onClick={handleEdit}
                    className="bg-black hover:bg-green-700"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={handlePrint}
                    className="bg-black hover:bg-green-700"
                  >
                    Print
                  </Button>
                </div>
                <div className="flex justify-between">
                  <Button
                    onClick={closeModal}
                    className="bg-red-500 hover:bg-red-900"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              <h2 className="mb-2 mt-2 text-black">Edit Mailing Address</h2>
              <textarea
                value={editableAddress}
                onChange={(e) => setEditableAddress(e.target.value)}
                cols="5"
                rows="10"
                className="border border-black text-black p-2"
              />
              <div className="flex gap-2 mt-2">
                <Button
                  onClick={handleSave}
                  className="bg-green-500 hover:bg-green-700"
                >
                  Save
                </Button>
                <Button
                  onClick={handlePreview}
                  className="bg-black hover:bg-black"
                >
                  Preview
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

export default Mailing;
