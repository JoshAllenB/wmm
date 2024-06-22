import { useState, useEffect } from "react";
import Modal from "./modal";
import { Button } from "./UI/ShadCN/button";

const Mailing = ({
  id,
  address,
  areaCode,
  zipcode,
  lname,
  fname,
  mname,
  contactnos,
  cellno,
  officeno,
}) => {
  const [editableAddress, setEditableAddress] = useState(address);
  const [modalOpen, setModalOpen] = useState(false);
  const [leftPosition, setLeftPosition] = useState(10);
  const [topPosition, setTopPosition] = useState(100); // Initial state for top position
  const [columnWidth, setColumnWidth] = useState(300); // State for column width
  const [fontSize, setFontSize] = useState(12);

  useEffect(() => {
    setEditableAddress(address);
  }, [address]);

  const getFullName = () => {
    return [lname, fname, mname].filter(Boolean).join(" ");
  };

  const getContactNumber = () => {
    return contactnos || cellno || officeno || "";
  };

  const mailingStyle = {
    width: "336px", // Rough estimate of 3.5 inches in pixels
    height: "144px", // Rough estimate of 1.5 inches in pixels
    position: "relative",
  };

  const addressStyle = {
    position: "absolute",
    left: `${leftPosition}px`,
    top: `${topPosition}px`, // Top position set based on user input
    fontSize: `${fontSize}px`,
    color: "black",
    width: `${columnWidth}px`,
    wordWrap: "break-word",
    whiteSpace: "normal",
    overflowWrap: "break-word",
  };

  const generatePrintHTML = () => {
    return `
      <html>
        <head>
          <title>Print Mailing Label</title>
          <style>
            .mailing-label {
              position: relative;
              width: 350px;
              height: 400px;
            }
            .address-container {
              left: ${leftPosition}px;
              top: ${topPosition}px;
              font-size: ${fontSize}px;
              color: black;
              width: ${columnWidth}px;
              word-wrap: break-word;
              white-space: normal;
              overflow-wrap: break-word;
              position: absolute;
            }
            .address-container p {
              margin: 0;
              padding: 0;
            }
          </style>
        </head>
        <body>
          <div class="mailing-label">
            <div class="address-container">
              ${areaCode ? `<p>${id} ${areaCode}</p>` : ""}
              <p>${getFullName()}</p>
              <p>${editableAddress}</p>
              <p>${getContactNumber()}</p>
            </div>
          </div>
          <script>
            window.print();
            window.close();
          </script>
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.open();
    printWindow.document.write(generatePrintHTML());
    printWindow.document.close();
  };

  const toggleModal = () => {
    setModalOpen(!modalOpen);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const handleLeftPositionChange = (event) => {
    setLeftPosition(parseInt(event.target.value, 10));
  };

  const handleTopPositionChange = (event) => {
    setTopPosition(parseInt(event.target.value, 10)); // User input changes top position
  };

  const handleColumnWidthChange = (event) => {
    setColumnWidth(parseInt(event.target.value, 10));
  };

  const handleFontSize = (event) => {
    setFontSize(parseInt(event.target.value, 10));
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
          <div className="flex justify-end">
            <Button
              onClick={closeModal}
              className="bg-red-500 hover:bg-red-900"
            >
              X
            </Button>
          </div>
          <h2 className="flex justify-center text-xl font-bold mb-5 mt-2 text-black">
            Mailing Label Preview
          </h2>

          <div className="flex gap-5 justify-center ">
            <div className="flex gap-2 mb-2 text-black text-lg">
              <label>Font Size: </label>
              <input
                type="number"
                value={fontSize}
                className="border border-black text-black text-center mb-2 w-[50px] appearance-none"
                onChange={handleFontSize}
              />
            </div>
            <div className="flex gap-2 mb-2 text-black text-lg">
              <label>Left Position:</label>
              <input
                type="number"
                value={leftPosition}
                className="border border-black text-black text-center mb-2 w-[50px] appearance-none"
                onChange={handleLeftPositionChange}
              />
            </div>
            <div className="flex gap-2 mb-2 text-black text-lg">
              <label>Top Position:</label>
              <input
                type="number"
                value={topPosition}
                className="border border-black text-black text-center mb-2 w-[50px] appearance-none"
                onChange={handleTopPositionChange}
              />
            </div>
            <div className="flex gap-2 mb-2 text-black text-lg">
              <label>Column Width:</label>
              <input
                type="number"
                value={columnWidth}
                className="border border-black text-black text-center mb-2 w-[50px] appearance-none"
                onChange={handleColumnWidthChange}
              />
            </div>
          </div>
          <div className="flex flex-col items-center ">
            <div
              className="mailing-label border border-gray-400"
              style={mailingStyle}
            >
              <div className="address-container" style={addressStyle}>
                <p>
                  {id}-{areaCode}
                </p>
                <p>{getFullName()}</p>
                <p>
                  {editableAddress} {zipcode}
                </p>
                <p>{getContactNumber()}</p>
              </div>
            </div>
            <Button
              onClick={handlePrint}
              className="bg-black hover:bg-green-500 mt-4"
            >
              Print
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Mailing;
