import { useState } from "react";
import Modal from "./modal";
import { Button } from "./UI/ShadCN/button";

const Mailing = ({
  table,
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
  const selectedRows = table?.getSelectedRowModel?.()?.rows || [
    {
      original: {
        id,
        address,
        areaCode,
        zipcode,
        lname,
        fname,
        mname,
        contactnos,
        cellno,
        ofcno: officeno,
      },
    },
  ];
  const [modalOpen, setModalOpen] = useState(false);
  const [leftPosition, setLeftPosition] = useState(10);
  const [topPosition, setTopPosition] = useState(10); // Initial state for top position
  const [columnWidth, setColumnWidth] = useState(300); // State for column width
  const [fontSize, setFontSize] = useState(12);
  const addressHeight = 100; // Fixed height for each address container

  const getFullName = (row) => {
    return [row.lname, row.fname, row.mname].filter(Boolean).join(" ");
  };

  const getContactNumber = (row) => {
    return row.contactnos || row.cellno || row.ofcno || "";
  };

  const totalAddress = selectedRows.length;
  const addressPerColumn = Math.ceil(totalAddress / 2);

  const generatePrintHTML = () => {
    const column1 = selectedRows.slice(0, addressPerColumn);
    const column2 = selectedRows.slice(addressPerColumn);

    const labelHtml = [column1, column2]
      .map(
        (column, colIndex) => `
      <div class="column" style="position: absolute; left: ${
        leftPosition + colIndex * (columnWidth + 20)
      }px; top: ${topPosition}px;">
        ${column
          .map(
            (row, rowIndex) => `
          <div class="address-container" style="top: ${
            rowIndex * addressHeight
          }px; font-size: ${fontSize}px; width: ${columnWidth}px; word-wrap: break-word; white-space: normal; overflow-wrap: break-word;">
            ${
              row.original.areaCode
                ? `<p>${row.original.id} ${row.original.areaCode}</p>`
                : ""
            }
            <p>${getFullName(row.original)}</p>
            <p>${row.original.address}</p>
            <p>${getContactNumber(row.original)}</p>
          </div>
        `
          )
          .join("")}
      </div>
    `
      )
      .join("");

    return `
      <html>
        <head>
          <title>Print Mailing Label</title>
          <style>
            .mailing-label {
              position: relative;
              width: ${columnWidth * 2 + 40}px;
              height: ${topPosition + addressHeight * addressPerColumn}px;
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
              margin-bottom: 20px;

            }
            .address-container p {
              margin: 0;
              padding: 0;
            }
          </style>
        </head>
        <body>
          <div class="mailing-label">
            ${labelHtml}
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
        className="text-sm bg-green-600 hover:bg-green-800 text-white"
      >
        Print
      </Button>
      <Modal isOpen={modalOpen} onClose={closeModal}>
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
            style={{
              width: `${columnWidth * 2 + 40}px`,
              height: `${topPosition + addressHeight * addressPerColumn}px`,
              position: "relative",
              marginBottom: "10px",
            }}
          >
            {selectedRows.slice(0, addressPerColumn).map((row, index) => (
              <div
                key={`col1-${row.original.id || index}`}
                className="address-container text-black"
                style={{
                  position: "absolute",
                  left: `${leftPosition}px`,
                  top: `${topPosition + index * addressHeight}px`,
                  fontSize: `${fontSize}px`,
                  width: `${columnWidth}px`,
                  wordWrap: "break-word",
                  whiteSpace: "normal",
                  overflowWrap: "break-word",
                  marginBottom: "20px",
                }}
              >
                {row.original.areaCode && (
                  <p>
                    {row.original.id} {row.original.areaCode}
                  </p>
                )}
                <p>{getFullName(row.original)}</p>
                <p>{row.original.address}</p>
                <p>{getContactNumber(row.original)}</p>
              </div>
            ))}
            {selectedRows.slice(addressPerColumn).map((row, index) => (
              <div
                key={`col2-${row.original.id || index}`}
                className="address-container text-black"
                style={{
                  position: "absolute",
                  left: `${leftPosition + columnWidth + 20}px`,
                  top: `${topPosition + index * addressHeight}px`,
                  fontSize: `${fontSize}px`,
                  width: `${columnWidth}px`,
                  wordWrap: "break-word",
                  whiteSpace: "normal",
                  overflowWrap: "break-word",
                  marginBottom: "20px",
                }}
              >
                {row.original.areaCode && (
                  <p>
                    {row.original.id} {row.original.areaCode}
                  </p>
                )}
                <p>{getFullName(row.original)}</p>
                <p>{row.original.address}</p>
                <p>{getContactNumber(row.original)}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-center space-x-5">
            <Button
              onClick={handlePrint}
              className="bg-green-500 hover:bg-green-500 text-white"
            >
              Print
            </Button>

            <Button
              onClick={closeModal}
              className="bg-red-500 hover:bg-red-500 text-white"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Mailing;
