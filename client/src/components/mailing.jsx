import { useState, useCallback, useEffect } from "react";
import Modal from "./modal";
import { Button } from "./UI/ShadCN/button";
import axios from "axios";

const Mailing = ({
  table,
  id,
  address,
  acode,
  zipcode,
  lname,
  fname,
  mname,
  contactnos,
  cellno,
  officeno,
  copies,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [leftPosition, setLeftPosition] = useState(10);
  const [topPosition, setTopPosition] = useState(10); // Initial state for top position
  const [columnWidth, setColumnWidth] = useState(300); // State for column width
  const [fontSize, setFontSize] = useState(12);
  const addressHeight = 100; // Fixed height for each address container
  const [selectedFields, setSelectedFields] = useState(["contactnos"]);
  const [showInputs, setShowInputs] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [inputModalOpen, setInputModalOpen] = useState(false);
  const [showTemplateNameInput, setShowTemplateNameInput] = useState(false);

  const fields = [{ label: "Contact Numbers", value: "contactnos" }];

  // Get selected rows safely with proper type checking
  const getSelectedRows = useCallback(() => {
    if (!table || typeof table.getSelectedRowModel !== "function") return [];
    try {
      const selectedRows = table.getSelectedRowModel().rows;
      return Array.isArray(selectedRows) ? selectedRows : [];
    } catch (error) {
      console.error("Error getting selected rows:", error);
      return [];
    }
  }, [table]);

  const selectedRows = getSelectedRows();
  const hasSelectedRows = selectedRows.length > 0;

  const getFullName = (row) => {
    return [row.fname, row.mname, row.lname].filter(Boolean).join(" ");
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
      .map((row, index) => {
        const wmmData = row.original.wmmData || [];
        const copies = wmmData.length > 0 ? wmmData[0].copies : "N/A";
        const subsdate =
          wmmData.length > 0
            ? new Date(wmmData[0].subsdate).toLocaleDateString()
            : "N/A";

        return `
        <div class="address-container" style="top: ${
          rowIndex * addressHeight
        }px; font-size: ${fontSize}px; width: ${columnWidth}px; word-wrap: break-word; white-space: normal; overflow-wrap: break-word;">
            ${
              selectedFields.includes("id")
                ? `<p>${row.original.id} - ${subsdate} - ${copies}cps/${row.original.acode}</p>`
                : ""
            }
            ${`<p>${getFullName(row.original)}</p>`}
            ${`<p>${row.original.address}</p>`}
            ${
              selectedFields.includes("contactnos")
                ? `<p>${getContactNumber(row.original)}</p>`
                : ""
            }
          </div>
        `;
      })
      .join("");

    return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
            .mailing-label {
              position: relative;
              width: ${columnWidth * 2 + 40}px;
              height: ${topPosition + addressHeight * addressPerColumn}px;
          }
          .address-container p {
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
          .address-container p{
            margin: 0;
            padding: 0;
          }
        </style>
      </head>
      <body>
        <div class="mailing-label">${labelHtml}</div>
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

  const handleFieldChange = (field) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const handleSave = () => {
    setShowInputs(false);
    setModalOpen(true);
  };

  const handleSaveClick = () => {
    setShowTemplateNameInput(true);
  };

  const handleTemplateNameChange = (event) => {
    setTemplateName(event.target.value);
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      alert("Please enter a template name.");
      return;
    }

    try {
      const newTemplate = {
        name: templateName.trim(),
        layout: {
          fontSize,
          leftPosition,
          topPosition,
          columnWidth,
        },
        selectedFields,
      };

      await axios.post(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/templates-add`,
        newTemplate,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      alert("Template saved successfully!");
      setSavedTemplates([...savedTemplates, newTemplate]);
      setShowTemplateNameInput(false);
      setTemplateName("");
    } catch (error) {
      console.error("Error saving template:", error);
    }
  };

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await axios.get(
          `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/templates`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }
        );
        setSavedTemplates(response.data);
      } catch (error) {
        console.error("Error fetching templates:", error);
      }
    };

    fetchTemplates();
  }, []);

  const handleTemplateSelect = (event) => {
    const selected = savedTemplates.find(
      (template) => template.name === event.target.value
    );
    if (selected) {
      setFontSize(selected.layout.fontSize);
      setLeftPosition(selected.layout.leftPosition);
      setTopPosition(selected.layout.topPosition);
      setColumnWidth(selected.layout.columnWidth);
      setSelectedFields(selected.selectedFields);
    }
    setSelectedTemplate(selected);
  };

  const toggleInputModal = () => {
    setInputModalOpen(!inputModalOpen);
  };

  const toggleShowInputs = () => {
    setShowInputs(!showInputs);
  };

  // Only render if we have a table instance
  if (!table) return null;

  return (
    <div className="flex justify-between">
      {hasSelectedRows && (
        <Button
          onClick={() => setModalOpen(true)}
          className="text-sm bg-green-600 hover:bg-green-800 text-white"
        >
          Print ({selectedRows.length})
        </Button>
      )}
      <Modal isOpen={modalOpen} onClose={closeModal}>
        <h2 className="flex justify-center text-xl font-bold text-black">
          Mailing Label Preview
        </h2>

        <div className="flex flex-col justify-center ">
          <div className="flex justify-center">
            <Button
              onClick={toggleShowInputs}
              className="bg-blue-500 hover:bg-blue-700 text-white"
            >
              {showInputs ? "Hide Configuration" : "Show Configuration"}
            </Button>
          </div>
          {showInputs && (
            <div className="flex flex-col items-center mt-4">
              <div className="flex gap-2 mb-2 text-black ">
                <label>Font Size: </label>
                <input
                  type="number"
                  value={fontSize}
                  className="border border-black text-black text-center mb-2 w-[50px] appearance-none"
                  onChange={handleFontSize}
                />
              </div>
              <div className="flex gap-2 mb-2 text-black ">
                <label>Left Position:</label>
                <input
                  type="number"
                  value={leftPosition}
                  className="border border-black text-black text-center mb-2 w-[50px] appearance-none"
                  onChange={handleLeftPositionChange}
                />
              </div>
              <div className="flex gap-2 mb-2 text-black ">
                <label>Top Position:</label>
                <input
                  type="number"
                  value={topPosition}
                  className="border border-black text-black text-center mb-2 w-[50px] appearance-none"
                  onChange={handleTopPositionChange}
                />
              </div>
              <div className="flex gap-2 mb-2 text-black ">
                <label>Column Width:</label>
                <input
                  type="number"
                  value={columnWidth}
                  className="border border-black text-black text-center mb-2 w-[50px] appearance-none"
                  onChange={handleColumnWidthChange}
                />
              </div>
              <div className="flex gap-2 justify-center">
                {fields.map((field) => (
                  <div
                    key={field.value}
                    className="flex gap-2 mb-2 text-black text-lg"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.value)}
                      onChange={() => handleFieldChange(field.value)}
                    />
                    <label>{field.label}</label>
                  </div>
                ))}
              </div>
              <Button
                onClick={handleSaveClick}
                className="bg-green-500 hover:bg-green-500 text-white"
              >
                Save
              </Button>
              {showTemplateNameInput && (
                <div className="flex flex-col items-center mt-4">
                  <input
                    type="text"
                    value={templateName}
                    onChange={handleTemplateNameChange}
                    placeholder="Enter template name"
                    className="border border-black text-black text-center mb-2 w-[200px] appearance-none"
                  />
                  <Button
                    onClick={saveTemplate}
                    className="bg-blue-500 hover:bg-blue-700 text-white"
                  >
                    Confirm Save
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-center mt-2">
          <div>
            <label>Select Template:</label>
            <select
              onChange={handleTemplateSelect}
              value={selectedTemplate?.name || ""}
            >
              <option value="" disabled>
                Select a template
              </option>
              {savedTemplates.map((template) => (
                <option key={template.name} value={template.name}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-center">
            <div
              className="mailing-label border border-gray-400"
              style={{
                width: `${columnWidth * 2 + 40}px`,
                height: `${topPosition + addressHeight * addressPerColumn}px`,
                position: "relative",
                marginBottom: "10px",
              }}
            >
              {selectedRows.slice(0, addressPerColumn).map((row, index) => {
                const wmmData = row.original.wmmData || [];
                const copies = wmmData.length > 0 ? wmmData[0].copies : "";
                const subsdate =
                  wmmData.length > 0
                    ? new Date(wmmData[0].subsdate).toLocaleDateString()
                    : "";
                return (
                  <div
                    key={`col1-${row.original.id || index}`}
                    className="address-container"
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
                    <p>
                      {row.original.id} - {subsdate} - {copies}cps/
                      {row.original.acode}
                    </p>

                    <p>{getFullName(row.original)}</p>
                    <p>{row.original.address}</p>

                    {selectedFields.includes("contactnos") && (
                      <p>{getContactNumber(row.original)}</p>
                    )}
                  </div>
                );
              })}
              {selectedRows.slice(addressPerColumn).map((row, index) => {
                const wmmData = row.original.wmmData || [];
                const copies = wmmData.length > 0 ? wmmData[0].copies : "";
                const subsdate =
                  wmmData.length > 0
                    ? new Date(wmmData[0].subsdate).toLocaleDateString()
                    : "";
                return (
                  <div
                    key={`col2-${row.original.id || index}`}
                    className="address-container"
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
                    <p>
                      {row.original.id} - {subsdate} - {copies}cps/
                      {row.original.acode}
                    </p>

                    <p>{getFullName(row.original)}</p>
                    <p>{row.original.address}</p>

                    {selectedFields.includes("contactnos") && (
                      <p>{getContactNumber(row.original)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-center space-x-5 mt-5">
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
