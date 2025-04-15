import { useState, useCallback, useEffect } from "react";
import Modal from "./modal";
import { Button } from "./UI/ShadCN/button";
import { useColumns } from "./Table/Structure/clientColumn";
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
  const [topPosition, setTopPosition] = useState(10);
  const [columnWidth, setColumnWidth] = useState(300);
  const [fontSize, setFontSize] = useState(12);
  const [labelHeight, setLabelHeight] = useState(100);
  const [horizontalSpacing, setHorizontalSpacing] = useState(20);
  const [selectedFields, setSelectedFields] = useState(["contactnos"]);
  const [showInputs, setShowInputs] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [inputModalOpen, setInputModalOpen] = useState(false);
  const [showTemplateNameInput, setShowTemplateNameInput] = useState(false);

  // State for start/end Client IDs
  const [startClientId, setStartClientId] = useState("");
  const [endClientId, setEndClientId] = useState("");
  const [startPosition, setStartPosition] = useState("left"); // 'left' or 'right'

  const fields = [{ label: "Contact Numbers", value: "contactnos" }];

  const columns = useColumns();
  const filteredColumns = columns.filter(
    (column) => column.id !== "addedBy" && column.id !== "Added Info"
  );

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

  // Set default start/end IDs when selection changes
  useEffect(() => {
    if (hasSelectedRows) {
      const firstId = selectedRows[0]?.original?.id?.toString() || "";
      const lastId =
        selectedRows[selectedRows.length - 1]?.original?.id?.toString() || "";

      // Ensure startId <= endId for the default range
      if (firstId && lastId) {
        // Attempt numeric comparison first, fallback to string
        const firstNum = parseInt(firstId, 10);
        const lastNum = parseInt(lastId, 10);
        if (!isNaN(firstNum) && !isNaN(lastNum)) {
          setStartClientId(Math.min(firstNum, lastNum).toString());
          setEndClientId(Math.max(firstNum, lastNum).toString());
        } else {
          // Fallback to string comparison
          if (firstId <= lastId) {
            setStartClientId(firstId);
            setEndClientId(lastId);
          } else {
            setStartClientId(lastId);
            setEndClientId(firstId);
          }
        }
      } else {
        // Handle cases where one or both IDs might be missing
        setStartClientId(firstId || lastId); // Use whichever one exists
        setEndClientId(lastId || firstId);
      }
    } else {
      setStartClientId("");
      setEndClientId("");
    }
  }, [selectedRows]); // Rerun when selection changes

  const getFullName = (row) => {
    const title = row.title ? `${row.title} ` : "";
    return [title, row.fname, row.mname, row.lname].filter(Boolean).join(" ");
  };

  const getContactNumber = (row) => {
    return row.contactnos || row.cellno || row.ofcno || "";
  };

  // Generate HTML for a specific range of Client IDs and starting position
  const generatePrintHTML = (startId, endId, startColumn) => {
    // Filter rows based on start/end Client IDs
    const filteredRows = selectedRows.filter((row) => {
      const clientId = row?.original?.id?.toString();
      if (!clientId) {
        return false;
      }
      const trimmedStartId = startId?.trim();
      const trimmedEndId = endId?.trim();

      const isAfterStart = trimmedStartId ? clientId >= trimmedStartId : true;
      const isBeforeEnd = trimmedEndId ? clientId <= trimmedEndId : true;
      return isAfterStart && isBeforeEnd;
    });

    if (filteredRows.length === 0) {
      return "<html><body>No labels found for the specified Client ID range. Check IDs and selection.</body></html>";
    }

    // Calculate layout based on filtered rows
    const numRowsToPrint = filteredRows.length;
    let layoutRows = [...filteredRows];
    let emptySlots = 0;

    // If starting on the right, add a placeholder at the beginning
    if (startColumn === "right" && numRowsToPrint > 0) {
      layoutRows.unshift(null); // Add placeholder for the first slot
      emptySlots = 1;
    }

    const addressPerColumn = Math.ceil(layoutRows.length / 2);
    const column1 = layoutRows.slice(0, addressPerColumn);
    const column2 = layoutRows.slice(addressPerColumn);

    const labelHtml = [column1, column2]
      .map((column, columnIndex) => {
        return column
          .map((row, rowIndex) => {
            // Skip rendering the placeholder if it exists
            if (row === null) {
              return "<!-- Placeholder -->";
            }

            // Calculate the actual data row index (needed if placeholder was added)
            const dataRowIndex =
              columnIndex * addressPerColumn + rowIndex - emptySlots;
            const actualRowData = filteredRows[dataRowIndex];

            if (!actualRowData) {
              console.error(
                "Mismatch finding actual row data for index",
                dataRowIndex
              );
              return "<!-- Error -->";
            }

            // Access data directly from the wmmData object
            const wmmData = actualRowData?.original?.wmmData; // Get the object
            const copies = wmmData?.totalCopies ?? "N/A"; // Use totalCopies, fallback N/A
            let subsdate = "N/A";
            if (wmmData?.subsdate) {
              // Check for subsdate directly on the object
              const date = new Date(wmmData.subsdate);
              if (!isNaN(date.getTime())) {
                subsdate = date.toLocaleDateString();
              }
            }

            return `
          <div class="address-container" style="left: ${
            columnIndex * (columnWidth + horizontalSpacing)
          }px; top: ${
              topPosition + rowIndex * labelHeight
            }px; font-size: ${fontSize}px; width: ${columnWidth}px; word-wrap: break-word; white-space: normal; overflow-wrap: break-word;">
            <p>${
              actualRowData?.original?.id || ""
            } - ${subsdate} - ${copies}cps/${
              actualRowData?.original?.acode || ""
            }</p>
            <p>${getFullName(actualRowData?.original || {})}</p>
            <p>${actualRowData?.original?.address || ""}</p>
            ${
              selectedFields.includes("contactnos")
                ? `<p>${getContactNumber(actualRowData?.original || {})}</p>`
                : "" /* Render contact paragraph conditionally */
            }
          </div>
        `;
          })
          .join("");
      })
      .join("");

    return `
      <html>
      <head>
         <title>Mailing Labels (${startId || "Start"} to ${
      endId || "End"
    })</title>
          <style>
            body { font-family: Arial, sans-serif; }
            .mailing-label {
              position: relative;
              width: ${columnWidth * 2 + horizontalSpacing}px;
              height: ${topPosition + labelHeight * addressPerColumn}px;
            }
            .address-container {
              position: absolute;
              margin-bottom: 20px;
            }
            .address-container p {
              margin: 0;
              padding: 0;
              font-size: ${fontSize}px;
              color: black;
              width: ${columnWidth}px;
              word-wrap: break-word;
              white-space: normal;
              overflow-wrap: break-word;
            }
             @media print {
               body { margin: ${topPosition}px 0 0 ${leftPosition}px !important; }
             }
          </style>
        </head>
        <body>
          <div class="mailing-label" style="position: absolute; left: ${leftPosition}px; top: ${topPosition}px;">
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

  // Handle printing with the specified range and starting position
  const handlePrintWithRange = () => {
    const htmlContent = generatePrintHTML(
      startClientId,
      endClientId,
      startPosition
    );
    const printWindow = window.open("", "_blank", "height=600,width=800");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } else {
      alert(
        "Could not open print window. Please check your pop-up blocker settings."
      );
    }
  };

  const toggleModal = () => {
    setModalOpen(!modalOpen);
  };

  const closeModal = () => {
    setModalOpen(false);
    // Reset start/end IDs when closing (optional, could retain)
    // if (hasSelectedRows) {
    //     setStartClientId(selectedRows[0]?.original?.id?.toString() || "");
    //     setEndClientId(selectedRows[selectedRows.length - 1]?.original?.id?.toString() || "");
    // }
  };

  const handleLeftPositionChange = (event) => {
    setLeftPosition(parseInt(event.target.value, 10));
  };

  const handleTopPositionChange = (event) => {
    setTopPosition(parseInt(event.target.value, 10));
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
          labelHeight,
          horizontalSpacing,
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
      setLabelHeight(selected.layout.labelHeight || 100);
      setHorizontalSpacing(selected.layout.horizontalSpacing || 20);
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

  const generateChecklistHTML = (columns, selectedRows) => {
    const checklistHtml = selectedRows
      .map((row) => {
        const rowData = columns
          .map((column) => {
            if (
              column.id === "Client Name" ||
              column.id === "Address" ||
              column.id === "Contact Info"
            ) {
              // Skip individual rendering for these columns
              return null;
            } else if (
              column.id === "Subscription" &&
              Array.isArray(column.accessorFn(row.original))
            ) {
              // Handle the Subscription column
              const subscriptionData = column.accessorFn(row.original);
              return `
              <td class="checklist-data" style="width: ${
                column.size
              }px; padding-left: 10px;">
                <ul class="max-h-[200px] max-w-[350px] overflow-y-auto scrollbar-hide" style="font-size: 12px;">
                  ${subscriptionData
                    .map(
                      (sub, index) => `
                    <li key=${index} class="text-left border-b border-gray-500 last:border-none pb-2 mb-2">
                      ${sub.subsclass}: ${sub.subsdate} - ${sub.enddate}, Cps: ${sub.copies}
                    </li>
                  `
                    )
                    .join("")}
                </ul>
              </td>
            `;
            }
          })
          .filter(Boolean); // Remove null values

        // Add the ID as the first column
        const idColumn = `<td class="checklist-data" style="width: 50px; border-right: 1px solid #ccc;">${row.original.id}</td>`;
        const servicesColumn = `<td class="checklist-data" style="width: 50px; border-right: 1px solid #ccc;">${row.original.services.join(
          ", "
        )}</td>`;

        // Combine Client Name, Address, and Contact Info into one column
        const clientName = columns
          .find((col) => col.id === "Client Name")
          ?.accessorFn(row.original);

        const address = columns
          .find((col) => col.id === "Address")
          ?.accessorFn(row.original);

        const contactInfo = columns
          .find((col) => col.id === "Contact Info")
          ?.accessorFn(row.original);

        // Extract the type part from the clientName
        const [namePart, typePart] = clientName.split("<br>");

        // Combine the data
        const combinedData = [
          namePart,
          address,
          contactInfo,
          typePart ? `<br><strong>${typePart}</strong>` : "",
        ]
          .filter(Boolean)
          .join(", ");

        // Add the combined data as a single column
        const combinedColumn = `<td class="checklist-data" style="width: 1000px; border-right: 1px solid #ccc;">${combinedData}</td>`;

        // Prepend the ID column and combined data column to the rowData
        rowData.unshift(servicesColumn);
        rowData.unshift(combinedColumn);
        rowData.unshift(idColumn);
        return `<tr class="checklist-row">${rowData.join("")}</tr>`;
      })
      .join("");

    return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          .checklist-row {
            border-bottom: 1px solid #ccc;
          }
          .checklist-item {
            width: 950px;
            border-right: 1px solid #ccc;
          }
          .checklist-item, .checklist-data {
            border: 1px solid #ccc;
            padding: 8px;
            text-align: left;
            vertical-align: top;
            font-size: 12px;
          }
          .checklist-data ul {
            list-style-type: none;
            padding: 0;
            margin: 0;
          }
          .checklist-data li {
            font-size: 12px;
            margin-bottom: 1px;
          }
        </style>
      </head>
      <body>
        <table class="checklist">
          ${checklistHtml}
        </table>
        <script>
          window.print();
          window.close();
        </script>
      </body>
    </html>
    `;
  };

  const handlePrintChecklist = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.open();
    printWindow.document.write(
      generateChecklistHTML(filteredColumns, selectedRows)
    );
    printWindow.document.close();
  };

  if (!table) return null;

  return (
    <div className="flex justify-between">
      {hasSelectedRows && (
        <div className="flex gap-2">
          <Button
            onClick={toggleModal}
            className="text-sm bg-green-600 hover:bg-green-800 text-white"
          >
            Print Mailing Label ({selectedRows.length})
          </Button>
        </div>
      )}
      <Modal isOpen={modalOpen} onClose={closeModal}>
        <h2 className="flex justify-center text-xl font-bold text-black">
          Mailing Label Options
        </h2>

        <div className="flex flex-col items-center ">
          {/* Configuration Toggle and Checklist Button */}
          <div className="flex justify-center gap-2 mb-4">
            <Button onClick={toggleShowInputs} variant="outline">
              {showInputs ? "Hide Configuration" : "Show Configuration"}
            </Button>
            <Button
              onClick={handlePrintChecklist}
              variant="outline"
              disabled={!hasSelectedRows}
            >
              Print Checklist
            </Button>
          </div>

          {/* Configuration Inputs (Initially Hidden) */}
          {showInputs && (
            <div className="flex flex-col items-center p-4 border rounded mb-4 w-full max-w-lg bg-gray-50">
              <h3 className="text-lg font-semibold mb-3">Configuration</h3>
              {/* Layout Settings */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3 w-full">
                <div className="flex flex-col">
                  <label className="text-sm mb-1">Font Size:</label>
                  <input
                    type="number"
                    value={fontSize}
                    className="border border-gray-300 rounded p-1 text-center w-full"
                    onChange={handleFontSize}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm mb-1">Column Width (px):</label>
                  <input
                    type="number"
                    value={columnWidth}
                    className="border border-gray-300 rounded p-1 text-center w-full"
                    onChange={handleColumnWidthChange}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm mb-1">Left Position (px):</label>
                  <input
                    type="number"
                    value={leftPosition}
                    className="border border-gray-300 rounded p-1 text-center w-full"
                    onChange={handleLeftPositionChange}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm mb-1">Top Position (px):</label>
                  <input
                    type="number"
                    value={topPosition}
                    className="border border-gray-300 rounded p-1 text-center w-full"
                    onChange={handleTopPositionChange}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm mb-1">
                    Label Height (Vertical Space):
                  </label>
                  <input
                    type="number"
                    value={labelHeight}
                    className="border border-gray-300 rounded p-1 text-center w-full"
                    onChange={(e) =>
                      setLabelHeight(parseInt(e.target.value, 10) || 100)
                    }
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm mb-1">Horizontal Spacing:</label>
                  <input
                    type="number"
                    value={horizontalSpacing}
                    className="border border-gray-300 rounded p-1 text-center w-full"
                    onChange={(e) =>
                      setHorizontalSpacing(parseInt(e.target.value, 10) || 20)
                    }
                  />
                </div>
              </div>
              {/* Field Selection */}
              <div className="flex gap-4 justify-center mb-4 w-full">
                {fields.map((field) => (
                  <div
                    key={field.value}
                    className="flex items-center gap-1 text-black text-base"
                  >
                    <input
                      type="checkbox"
                      id={`field-${field.value}`}
                      checked={selectedFields.includes(field.value)}
                      onChange={() => handleFieldChange(field.value)}
                      className="text-black border-gray-300 h-4 w-4"
                    />
                    <label htmlFor={`field-${field.value}`}>
                      {field.label}
                    </label>
                  </div>
                ))}
              </div>
              {/* Template Saving */}
              <div className="w-full">
                <Button
                  onClick={handleSaveClick}
                  variant="secondary"
                  className="w-full mb-2"
                >
                  Save Current Settings as Template
                </Button>
                {showTemplateNameInput && (
                  <div className="flex flex-col items-center mt-1">
                    <input
                      type="text"
                      value={templateName}
                      onChange={handleTemplateNameChange}
                      placeholder="Enter template name"
                      className="border border-gray-300 rounded p-1 text-center mb-1 w-full"
                    />
                    <Button onClick={saveTemplate} className="w-full">
                      Confirm Save
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Template Selection */}
          <div className="flex justify-center items-center mb-4">
            <label className="mr-2">Use Template:</label>
            <select
              onChange={handleTemplateSelect}
              value={selectedTemplate?.name || ""}
              className="border border-gray-300 rounded p-1"
            >
              <option value="" disabled>
                Select a template...
              </option>
              {savedTemplates.map((template) => (
                <option key={template.name} value={template.name}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {/* Client ID Range Input */}
          <div className="flex flex-col items-center p-4 border rounded mb-4 w-full max-w-lg bg-gray-100">
            <h3 className="text-lg font-semibold mb-3">
              Print Range & Position
            </h3>
            <p className="text-xs text-gray-600 mb-3">
              Use Client IDs to specify a range (e.g., after a paper jam).
              Select starting label position.
            </p>
            <div className="flex items-center space-x-2 w-full mb-2">
              <label htmlFor="startId" className="text-sm w-28 text-right">
                Start Client ID:
              </label>
              <input
                type="text"
                id="startId"
                value={startClientId}
                onChange={(e) => setStartClientId(e.target.value)}
                placeholder={`First: ${selectedRows[0]?.original?.id || "N/A"}`}
                className="border border-gray-300 rounded p-1 w-full"
              />
            </div>
            <div className="flex items-center space-x-2 w-full mb-3">
              <label htmlFor="endId" className="text-sm w-28 text-right">
                End Client ID:
              </label>
              <input
                type="text"
                id="endId"
                value={endClientId}
                onChange={(e) => setEndClientId(e.target.value)}
                placeholder={`Last: ${
                  selectedRows[selectedRows.length - 1]?.original?.id || "N/A"
                }`}
                className="border border-gray-300 rounded p-1 w-full"
              />
            </div>
            <div className="flex items-center justify-center space-x-4 w-full">
              <span className="text-sm">Start Printing At:</span>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="startLeft"
                  name="startPosition"
                  value="left"
                  checked={startPosition === "left"}
                  onChange={(e) => setStartPosition(e.target.value)}
                  className="mr-1"
                />
                <label htmlFor="startLeft" className="text-sm">
                  Label 1 (Left)
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="startRight"
                  name="startPosition"
                  value="right"
                  checked={startPosition === "right"}
                  onChange={(e) => setStartPosition(e.target.value)}
                  className="mr-1"
                />
                <label htmlFor="startRight" className="text-sm">
                  Label 2 (Right)
                </label>
              </div>
            </div>
          </div>

          {/* Preview Area (Simplified) */}
          <div className="mb-4">
            <h3 className="text-center font-semibold mb-1">
              Preview (Layout Only)
            </h3>
            <div
              className="mailing-label-preview border border-dashed border-gray-400 relative bg-white"
              style={{
                width: `${columnWidth * 2 + horizontalSpacing}px`,
                height: `${topPosition + labelHeight * 1.5}px`,
              }}
            >
              {/* Placeholder for visual layout */}
              <div
                className="address-container-preview border border-gray-300 absolute"
                style={{
                  left: `${leftPosition}px`,
                  top: `${topPosition}px`,
                  width: `${columnWidth}px`,
                  height: `${labelHeight}px`,
                  fontSize: `${fontSize}px`,
                  padding: "2px",
                }}
              >
                (Label 1 Position)
                <br />
                ...
              </div>
              <div
                className="address-container-preview border border-gray-300 absolute"
                style={{
                  left: `${leftPosition + columnWidth + horizontalSpacing}px`,
                  top: `${topPosition}px`,
                  width: `${columnWidth}px`,
                  height: `${labelHeight}px`,
                  fontSize: `${fontSize}px`,
                  padding: "2px",
                }}
              >
                (Label 2 Position)
                <br />
                ...
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4 w-full max-w-lg">
            <Button
              onClick={handlePrintWithRange}
              className="bg-green-600 hover:bg-green-700 text-white flex-grow"
              disabled={!hasSelectedRows}
            >
              Print Selected Range
            </Button>
            <Button
              onClick={closeModal}
              variant="secondary"
              className="flex-grow"
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
