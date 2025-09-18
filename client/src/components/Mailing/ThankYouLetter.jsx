import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import { Button } from "../UI/ShadCN/button";
import axios from "axios";
import { useUser } from "../../utils/Hooks/userProvider";
import { toast } from "react-hot-toast";
import RangeSelector from "./RangeSelector";
import { formatClientId } from "../../utils/clientId";

const ThankYouLetterDataOverlay = forwardRef(
  (
    {
      startId,
      endId,
      availableRows,
      parentPrintAlignmentTest = null,
      parentPrintDataOverlay = null,
      useSharedConfig = false,
      sharedConfig = null,
      onSkippedDataUpdate = null,
    },
    ref
  ) => {
    const [isLoading, setIsLoading] = useState(false);
    const [filteredSubscribers, setFilteredSubscribers] = useState([]);
    const [subscriberCount, setSubscriberCount] = useState(0);
    const [showConfig, setShowConfig] = useState(false);
    const [skippedRecords, setSkippedRecords] = useState([]);

    // Configuration state for positions (defaulted to current values)
    const [positions, setPositions] = useState(() => {
      // If shared configuration is provided, use it
      if (useSharedConfig && sharedConfig) {
        return (
          sharedConfig.positions || {
            group1: {
              // Month Year date display
              top: 1.0,
              left: 4.25, // Center of page by default (8.5/2)
              width: 4.0,
              lineSpacing: 0.3,
              fontSize: 12,
              fontWeight: "normal",
              fontFamily: "Arial",
            },
            group2: {
              // Address group (all client data and subscription info)
              top: 2.0,
              left: 0.5,
              width: 4.0,
              lineSpacing: 0.175,
              fontSize: 12,
              fontWeight: "normal",
              fontFamily: "Arial",
            },
            group3: {
              // Greeting field
              top: 6.0,
              left: 0.5,
              width: 4.0,
              lineSpacing: 0.3,
              fontSize: 14,
              fontWeight: "normal",
              fontFamily: "Arial",
            },
          }
        );
      }

      // Try to load saved settings from localStorage
      try {
        const savedPositions = localStorage.getItem("thankYouLetterPositions");
        if (savedPositions) {
          return JSON.parse(savedPositions);
        }
      } catch (error) {
        console.error("Error loading saved positions:", error);
      }

      // Default positions for 3-group structure
      return {
        group1: {
          // Month Year date display
          top: 1.0,
          left: 4.25, // Center of page by default (8.5/2)
          width: 4.0,
          lineSpacing: 0.3,
          fontSize: 12,
          fontWeight: "normal",
          fontFamily: "Arial",
        },
        group2: {
          // Address group (all client data and subscription info)
          top: 2.0,
          left: 0.5,
          width: 4.0,
          lineSpacing: 0.175,
          fontSize: 12,
          fontWeight: "normal",
          fontFamily: "Arial",
        },
        group3: {
          // Greeting field
          top: 6.0,
          left: 0.5,
          width: 4.0,
          lineSpacing: 0.3,
          fontSize: 14,
          fontWeight: "normal",
          fontFamily: "Arial",
        },
      };
    });

    // State for storing preview HTML
    const [previewHTML, setPreviewHTML] = useState(null);

    // Templates state
    const { hasRole } = useUser();
    const userRole = React.useMemo(() => {
      if (hasRole("ADMIN")) return "ADMIN";
      const roles = [];
      if (hasRole("WMM")) roles.push("WMM");
      if (hasRole("HRG")) roles.push("HRG");
      if (hasRole("FOM")) roles.push("FOM");
      if (hasRole("CAL")) roles.push("CAL");
      if (hasRole("COMP")) roles.push("COMP");
      if (hasRole("PROMO")) roles.push("PROMO");
      return roles.length > 0 ? roles[0] : "";
    }, [hasRole]);
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState("");
    const [templateName, setTemplateName] = useState("");
    const [templateDesc, setTemplateDesc] = useState("");
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [pendingTemplatePayload, setPendingTemplatePayload] = useState(null);
    const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateTemplate, setDuplicateTemplate] = useState(null);

    // Fetch templates for thank you letter (fetch ALL, filter by previewType client-side)
    useEffect(() => {
      const fetchTemplates = async () => {
        try {
          const res = await axios.get(
            `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/templates`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
              },
            }
          );
          const all = Array.isArray(res.data) ? res.data : [];
          const filtered = all.filter(
            (t) => (t.previewType || "standard") === "thankyou"
          );
          setTemplates(filtered);
          // Default to first template if none selected
          if (!selectedTemplateId && filtered.length > 0) {
            const first = filtered[0];
            setSelectedTemplateId(first._id || "");
            if (first.layout?.positions) {
              setPositions(first.layout.positions);
            }
          }
        } catch (e) {
          console.error("Failed to fetch templates:", e);
        }
      };
      if (userRole) fetchTemplates();
    }, [userRole]);

    // Memoize the processSubscriberData function
    const processSubscriberData = useCallback((row) => {
      if (!row) {
        return { skipped: true, reason: "Invalid row data" };
      }

      const original = row.original;
      if (!original) {
        return { skipped: true, reason: "Missing subscriber data" };
      }

      // Check for required fields for thank you letter
      const missingFields = [];
      if (!original.id) missingFields.push("ID");
      if (!original.fname && !original.lname && !original.company) {
        missingFields.push("Name or Company");
      }
      if (!original.address1 && !original.address)
        missingFields.push("Address"); // Check both address1 and address

      // Get subscription data exactly like PrintGenerator.js and RenewalNotice
      const wmmData = original.wmmData;
      const subscription = wmmData?.records?.[0] || wmmData || {};
      const copies = subscription.copies ?? "N/A";
      const enddate = subscription.enddate || "";
      const acode = original.acode || "";

      // Check for valid dates
      if (!enddate) {
        missingFields.push("Expiry Date");
      } else {
        const expiryDate = new Date(enddate);
        if (isNaN(expiryDate.getTime())) {
          return {
            skipped: true,
            id: original.id || "N/A",
            name:
              `${original.title || ""} ${original.fname || ""} ${
                original.lname || ""
              }`.trim() ||
              original.company ||
              "N/A",
            reason: "Invalid expiry date",
          };
        }
      }

      if (missingFields.length > 0) {
        return {
          skipped: true,
          id: original.id || "N/A",
          name:
            `${original.title || ""} ${original.fname || ""} ${
              original.lname || ""
            }`.trim() ||
            original.company ||
            "N/A",
          reason: `Missing required fields: ${missingFields.join(", ")}`,
        };
      }

      // If we get here, the record is valid
      const formattedId = formatClientId(original.id);
      const idWithType = `${formattedId}`;
      return {
        skipped: false,
        id: idWithType,
        title: original.title || "",
        firstName: original.fname || "",
        middleName: original.mname || "",
        lastName: original.lname || "",
        company: original.company || "",
        address: original.address || original.address1 || "",
        address1: original.address1 || original.address || "",
        address2: original.address2 || "",
        address3: original.address3 || "",
        address4: original.address4 || "",
        hasPersonalName: !!(original.fname || original.lname || original.title),
        hasCompany: !!original.company,
        expiryDate: formatDate(enddate), // Use enddate directly
        copies,
        acode,
        accountCode: `${idWithType}/${copies}-cp(s)/Expiry-${formatDate(
          enddate
        )}${acode ? ` / ${acode}` : ""}`,
      };
    }, []);

    // Local range state to enable in-component RangeSelector
    const [localStartId, setLocalStartId] = useState("");
    const [localEndId, setLocalEndId] = useState("");
    const [localStartPosition, setLocalStartPosition] = useState("left");

    // Derive effective IDs: prefer local if set, else props
    const effectiveStartId =
      (localStartId || "").trim() || (startId || "").trim();
    const effectiveEndId = (localEndId || "").trim() || (endId || "").trim();

    // Helper to compute min client id from available rows
    const getMinClientId = useCallback(() => {
      if (!availableRows?.length) return null;
      const ids = availableRows
        .map((r) => parseInt((r?.original?.id ?? "").toString(), 10))
        .filter((n) => !isNaN(n));
      if (ids.length === 0) return null;
      return Math.min(...ids);
    }, [availableRows]);

    // Memoize the filtering function
    const filterSubscribers = useCallback(
      (rows) => {
        if (!rows) return { filtered: [], skipped: [] };

        const filtered = [];
        const skipped = [];

        rows.forEach((row) => {
          const clientId = row?.original?.id?.toString();
          if (!clientId) {
            skipped.push({
              id: "N/A",
              reason: "Missing client ID",
            });
            return;
          }

          const trimmedStartId = effectiveStartId || "";
          const trimmedEndId = effectiveEndId || "";

          // Convert to numbers for comparison
          const numericClientId = parseInt(clientId, 10);
          // If only end ID provided and no start ID, default start to minimum available ID
          let numericStartId = null;
          if (trimmedStartId) {
            numericStartId = parseInt(trimmedStartId, 10);
          } else if (trimmedEndId) {
            const minId = getMinClientId();
            numericStartId = minId !== null ? minId : null;
          }
          const numericEndId = trimmedEndId ? parseInt(trimmedEndId, 10) : null;

          // Check if any conversion resulted in NaN
          if (
            isNaN(numericClientId) ||
            (numericStartId && isNaN(numericStartId)) ||
            (numericEndId && isNaN(numericEndId))
          ) {
            skipped.push({
              id: clientId,
              name: `${row.original.title || ""} ${row.original.fname || ""} ${
                row.original.lname || ""
              }`.trim(),
              company: row.original.company,
              reason: "Invalid ID format",
            });
            return;
          }

          const isAfterStart = numericStartId
            ? numericClientId >= numericStartId
            : true;
          const isBeforeEnd = numericEndId
            ? numericClientId <= numericEndId
            : true;

          if (!isAfterStart || !isBeforeEnd) {
            skipped.push({
              id: clientId,
              name: `${row.original.title || ""} ${row.original.fname || ""} ${
                row.original.lname || ""
              }`.trim(),
              company: row.original.company,
              reason: "Outside selected ID range",
            });
            return;
          }

          const processedData = processSubscriberData(row);
          if (processedData.skipped) {
            skipped.push(processedData);
          } else {
            filtered.push(row);
          }
        });

        return { filtered, skipped };
      },
      [effectiveStartId, effectiveEndId, processSubscriberData, getMinClientId]
    );

    // Update filtered subscribers and skipped records when dependencies change
    useEffect(() => {
      // Skip the effect if there are no available rows
      if (!availableRows?.length) {
        setFilteredSubscribers([]);
        setSubscriberCount(0);
        setSkippedRecords([]);
        if (onSkippedDataUpdate) {
          onSkippedDataUpdate([]);
        }
        return;
      }

      // Debounce the filtering operation
      const timeoutId = setTimeout(() => {
        const { filtered, skipped } = filterSubscribers(availableRows);
        setFilteredSubscribers(filtered);
        setSubscriberCount(filtered.length);
        setSkippedRecords(skipped);

        if (onSkippedDataUpdate) {
          onSkippedDataUpdate(skipped);
        }
      }, 100); // Small delay to prevent rapid updates

      // Cleanup timeout on unmount or when dependencies change
      return () => clearTimeout(timeoutId);
    }, [availableRows, effectiveStartId, effectiveEndId, filterSubscribers]); // Remove onSkippedDataUpdate from dependencies

    // Format date as human-readable MM/DD/YYYY
    const formatDate = (dateInput) => {
      if (!dateInput) return "N/A";

      // Handle both Date objects and date strings
      let date;
      if (dateInput instanceof Date) {
        date = dateInput;
      } else {
        date = new Date(dateInput);
      }

      if (isNaN(date.getTime())) return "N/A";

      // Format as MM/DD/YYYY for letters
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const year = date.getFullYear();

      return `${month}/${day}/${year}`;
    };

    // Add a function for formatting date as Month Year
    const formatMonthYear = (dateInput) => {
      if (!dateInput) return "N/A";

      // Handle both Date objects and date strings
      let date;
      if (dateInput instanceof Date) {
        date = dateInput;
      } else {
        date = new Date(dateInput);
      }

      if (isNaN(date.getTime())) return "N/A";

      const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

      return `${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    // Handle position change for grouped fields
    const handleGroupPositionChange = (group, field, value) => {
      setPositions((prev) => ({
        ...prev,
        [group]: {
          ...prev[group],
          [field]: ["top", "left", "width", "lineSpacing", "fontSize"].includes(
            field
          )
            ? parseFloat(value)
            : value,
        },
      }));
    };

    // Save current positions to localStorage and to shared config if available
    const savePositions = () => {
      try {
        localStorage.setItem(
          "thankYouLetterPositions",
          JSON.stringify(positions)
        );

        // If using shared config and there's a callback for updating it
        if (useSharedConfig && sharedConfig && sharedConfig.updatePositions) {
          sharedConfig.updatePositions(positions);
        }

        alert("Positions saved successfully!");
      } catch (error) {
        console.error("Error saving positions:", error);
        alert("Error saving positions. Please try again.");
      }
    };

    // Load positions from localStorage
    const loadPositions = () => {
      try {
        const savedPositions = localStorage.getItem("thankYouLetterPositions");
        if (savedPositions) {
          setPositions(JSON.parse(savedPositions));
          alert("Positions loaded successfully!");
        } else {
          alert("No saved positions found.");
        }
      } catch (error) {
        console.error("Error loading positions:", error);
        alert("Error loading positions. Please try again.");
      }
    };

    // Reset positions to defaults
    const resetPositions = () => {
      if (confirm("Are you sure you want to reset to default positions?")) {
        setPositions({
          group1: {
            // Month Year date display
            top: 1.0,
            left: 4.25, // Center of page by default (8.5/2)
            width: 4.0,
            lineSpacing: 0.3,
            fontSize: 12,
            fontWeight: "normal",
            fontFamily: "Arial",
          },
          group2: {
            // Address group (all client data and subscription info)
            top: 2.0,
            left: 0.5,
            width: 4.0,
            lineSpacing: 0.175,
            fontSize: 12,
            fontWeight: "normal",
            fontFamily: "Arial",
          },
          group3: {
            // Greeting field
            top: 6.0,
            left: 0.5,
            width: 4.0,
            lineSpacing: 0.3,
            fontSize: 14,
            fontWeight: "normal",
            fontFamily: "Arial",
          },
        });
      }
    };

    // Add a function for getting current month year
    const getCurrentMonthYear = () => {
      const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      const now = new Date();
      return `${months[now.getMonth()]} ${now.getFullYear()}`;
    };

    // Generate preview without printing
    const generatePreview = () => {
      if (filteredSubscribers.length === 0) {
        alert("No subscribers found in the selected ID range.");
        return;
      }

      // Get a sample subscriber for preview
      const sampleRow = filteredSubscribers[0];
      const sampleSubscriber = processSubscriberData(sampleRow);

      if (!sampleSubscriber) {
        alert("Unable to process subscriber data for preview.");
        return;
      }

      // For the greeting
      const greetingName = sampleSubscriber.hasPersonalName
        ? `${sampleSubscriber.title} ${sampleSubscriber.lastName}`
        : sampleSubscriber.hasCompany
        ? sampleSubscriber.company
        : "Customer";

      // Generate preview HTML for a single subscriber
      const previewContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Thank You Letter Preview</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
          }
          .preview-container {
            position: relative;
            width: 8.5in;
            height: 11in;
            border: 1px solid #ccc;
            margin: 0 auto;
            background-color: #f9f9f9;
          }
          .data-field {
            position: absolute;
            font-size: 12pt;
            border: 1px dashed red;
            background-color: rgba(255, 0, 0, 0.1);
            padding: 2px;
          }
          .group {
            position: absolute;
            border: 1px solid blue;
            background-color: rgba(0, 0, 255, 0.05);
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Thank You Letter Preview</h2>
          <p>This preview shows how data fields will be positioned on the form</p>
        </div>
        
        <div class="preview-container">
          <!-- Group 1: Month Year -->
          <div class="group" style="top: ${
            positions.group1.top - 0.2
          }in; left: ${positions.group1.left - 0.2}in; width: ${
        positions.group1.width + 0.4
      }in; height: ${positions.group1.lineSpacing + 0.4}in; font-family: ${
        positions.group1.fontFamily === "Times New Roman"
          ? "'Times New Roman', Times, serif"
          : positions.group1.fontFamily === "Courier New"
          ? "'Courier New', Courier, monospace"
          : positions.group1.fontFamily === "Calibri"
          ? "Calibri, Carlito, Arial, Helvetica, sans-serif"
          : positions.group1.fontFamily === "Verdana"
          ? "Verdana, Geneva, sans-serif"
          : positions.group1.fontFamily === "Tahoma"
          ? "Tahoma, Verdana, Segoe, sans-serif"
          : "Arial, Helvetica, sans-serif"
      }; font-size: ${positions.group1.fontSize}pt; font-weight: ${
        positions.group1.fontWeight
      };">
            <div class="data-field" style="top: 0.2in; left: 0.2in; width: ${
              positions.group1.width
            }in; text-align: center;">
              ${getCurrentMonthYear()}
            </div>
          </div>
          
          <!-- Group 2: Address Group (all client data and subscription info) -->
          <div class="group" style="top: ${
            positions.group2.top - 0.2
          }in; left: ${positions.group2.left - 0.2}in; width: ${
        positions.group2.width + 0.4
      }in; height: ${positions.group2.lineSpacing * 6 + 0.4}in; font-family: ${
        positions.group2.fontFamily === "Times New Roman"
          ? "'Times New Roman', Times, serif"
          : positions.group2.fontFamily === "Courier New"
          ? "'Courier New', Courier, monospace"
          : positions.group2.fontFamily === "Calibri"
          ? "Calibri, Carlito, Arial, Helvetica, sans-serif"
          : positions.group2.fontFamily === "Verdana"
          ? "Verdana, Geneva, sans-serif"
          : positions.group2.fontFamily === "Tahoma"
          ? "Tahoma, Verdana, Segoe, sans-serif"
          : "Arial, Helvetica, sans-serif"
      }; font-size: ${positions.group2.fontSize}pt; font-weight: ${
        positions.group2.fontWeight
      };">
            <!-- Account Code -->
            <div class="data-field" style="top: 0.2in; left: 0.2in; width: ${
              positions.group2.width
            }in; line-height: 1.2;">
              ${sampleSubscriber.accountCode}
            </div>
            
            <!-- Name and address block -->
            <div class="data-field" style="top: ${
              0.2 + positions.group2.lineSpacing
            }in; left: 0.2in; width: ${
        positions.group2.width
      }in; line-height: 1.2; white-space: pre-wrap;">
              ${sampleSubscriber.title} ${sampleSubscriber.firstName} ${
        sampleSubscriber.middleName
      } ${sampleSubscriber.lastName}<br>
              ${
                sampleSubscriber.company
                  ? `${sampleSubscriber.company}<br>`
                  : ""
              }
              ${
                sampleSubscriber.address
                  ? sampleSubscriber.address
                      .split("\n")
                      .map((line) => line.trim())
                      .filter((line) => line.length > 0)
                      .join("<br>")
                  : ""
              }
            </div>
          </div>
          
          <!-- Group 3: Greeting -->
          <div class="group" style="top: ${
            positions.group3.top - 0.2
          }in; left: ${positions.group3.left - 0.2}in; width: ${
        positions.group3.width + 0.4
      }in; height: ${positions.group3.lineSpacing + 0.4}in; font-family: ${
        positions.group3.fontFamily === "Times New Roman"
          ? "'Times New Roman', Times, serif"
          : positions.group3.fontFamily === "Courier New"
          ? "'Courier New', Courier, monospace"
          : positions.group3.fontFamily === "Calibri"
          ? "Calibri, Carlito, Arial, Helvetica, sans-serif"
          : positions.group3.fontFamily === "Verdana"
          ? "Verdana, Geneva, sans-serif"
          : positions.group3.fontFamily === "Tahoma"
          ? "Tahoma, Verdana, Segoe, sans-serif"
          : "Arial, Helvetica, sans-serif"
      }; font-size: ${positions.group3.fontSize}pt; font-weight: ${
        positions.group3.fontWeight
      };">
            <div class="data-field" style="top: 0.2in; left: 0.2in; width: ${
              positions.group3.width
            }in;">
              Dear ${greetingName},
            </div>
          </div>
        </div>
        
        <div style="margin-top: 20px; text-align: center;">
          <button onclick="window.close()">Close Preview</button>
        </div>
      </body>
      </html>
    `;

      setPreviewHTML(previewContent);
    };

    // Generate the HTML for precisely positioned data overlays for thank you letters
    const generateDataOverlayHTML = () => {
      setIsLoading(true);

      if (filteredSubscribers.length === 0) {
        setIsLoading(false);
        alert("No subscribers found in the selected ID range.");
        return null;
      }

      // Create a settings object to pass to the print window
      const printSettings = {
        group1: positions.group1,
        group2: positions.group2,
        group3: positions.group3,
      };
      const settingsJSON = JSON.stringify(printSettings);

      // Create HTML with absolute positioning for each data point
      let overlayHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Thank You Letter Data</title>
        <style>
          @page {
            size: 8.5in 11in;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .data-overlay {
            position: relative;
            width: 8.5in;
            height: 11in;
            page-break-after: always;
          }
          .data-field {
            position: absolute;
            z-index: 1000;
          }
          .group1-field {
            font-family: ${
              positions.group1.fontFamily === "Times New Roman"
                ? "'Times New Roman', Times, serif"
                : positions.group1.fontFamily === "Courier New"
                ? "'Courier New', Courier, monospace"
                : positions.group1.fontFamily === "Calibri"
                ? "Calibri, Carlito, Arial, Helvetica, sans-serif"
                : positions.group1.fontFamily === "Verdana"
                ? "Verdana, Geneva, sans-serif"
                : positions.group1.fontFamily === "Tahoma"
                ? "Tahoma, Verdana, Segoe, sans-serif"
                : "Arial, Helvetica, sans-serif"
            };
            font-size: ${positions.group1.fontSize}pt;
            font-weight: ${positions.group1.fontWeight};
          }
          .group2-field {
            font-family: ${
              positions.group2.fontFamily === "Times New Roman"
                ? "'Times New Roman', Times, serif"
                : positions.group2.fontFamily === "Courier New"
                ? "'Courier New', Courier, monospace"
                : positions.group2.fontFamily === "Calibri"
                ? "Calibri, Carlito, Arial, Helvetica, sans-serif"
                : positions.group2.fontFamily === "Verdana"
                ? "Verdana, Geneva, sans-serif"
                : positions.group2.fontFamily === "Tahoma"
                ? "Tahoma, Verdana, Segoe, sans-serif"
                : "Arial, Helvetica, sans-serif"
            };
            font-size: ${positions.group2.fontSize}pt;
            font-weight: ${positions.group2.fontWeight};
          }
          .group3-field {
            font-family: ${
              positions.group3.fontFamily === "Times New Roman"
                ? "'Times New Roman', Times, serif"
                : positions.group3.fontFamily === "Courier New"
                ? "'Courier New', Courier, monospace"
                : positions.group3.fontFamily === "Calibri"
                ? "Calibri, Carlito, Arial, Helvetica, sans-serif"
                : positions.group3.fontFamily === "Verdana"
                ? "Verdana, Geneva, sans-serif"
                : positions.group3.fontFamily === "Tahoma"
                ? "Tahoma, Verdana, Segoe, sans-serif"
                : "Arial, Helvetica, sans-serif"
            };
            font-size: ${positions.group3.fontSize}pt;
            font-weight: ${positions.group3.fontWeight};
          }
          /* Print styles */
          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .data-overlay {
              page-break-after: always;
              visibility: visible !important;
              display: block !important;
            }
            .data-field {
              visibility: visible !important;
              display: block !important;
              z-index: 1000;
            }
            .print-controls, .debug-info {
              display: none !important;
            }
          }
        </style>
        <script>
          // Position settings for adjusters
          var posSettings = ${settingsJSON};
          
          // Auto-print when page loads
          window.onload = function() {
            // Debug info for troubleshooting
            const debugInfo = document.getElementById('debug-info');
            if (debugInfo) {
              debugInfo.innerHTML = '<p>Settings loaded: ' + (posSettings ? 'Yes' : 'No') + '</p>';
            }
            
            // Small delay to ensure content is fully loaded
            setTimeout(function() {
              window.print();
              // Optional: Ask if user wants to close the window after printing
              setTimeout(function() {
                if (confirm('Close this window after printing?')) {
                  window.close();
                }
              }, 1000);
            }, 500);
          };
        </script>
      </head>
      <body>
        <div class="print-controls" style="padding: 20px; background: #f0f0f0; margin-bottom: 20px;">
          <h3>Thank You Letter Data</h3>
          <p>Printing <strong>${
            filteredSubscribers.length
          }</strong> subscriber(s). Each subscriber will print on a separate page.</p>
          <button onclick="window.print()">Print Again</button>
          <button onclick="window.close()">Close Window</button>
        </div>
        
        <div id="debug-info" class="debug-info" style="padding: 10px; background: #ffe; border: 1px solid #ccc; margin-bottom: 20px;">
          <h4>Debug Info (will not print)</h4>
        </div>
    `;

      // Generate positioned data for each subscriber
      filteredSubscribers.forEach((row) => {
        const subscriber = processSubscriberData(row);
        if (!subscriber) return;

        // For the greeting
        const greetingName = subscriber.hasPersonalName
          ? `${subscriber.title} ${subscriber.lastName}`
          : subscriber.hasCompany
          ? subscriber.company
          : "Customer";

        overlayHTML += `
        <div class="data-overlay">
          <!-- Group 1: Month Year -->
          <div class="data-field group1-field" style="top: ${
            positions.group1.top
          }in; left: ${positions.group1.left}in; width: ${
          positions.group1.width
        }in; text-align: center;">
            ${getCurrentMonthYear()}
          </div>
          
          <!-- Group 2: Address Group (all client data and subscription info) -->
          <div class="data-field group2-field" style="top: ${
            positions.group2.top
          }in; left: ${positions.group2.left}in; width: ${
          positions.group2.width
        }in;">
            ${subscriber.accountCode}
          </div>
          
          <div class="data-field group2-field" style="top: ${
            positions.group2.top + positions.group2.lineSpacing
          }in; left: ${positions.group2.left}in; width: ${
          positions.group2.width
        }in;">
            ${subscriber.title} ${subscriber.firstName} ${
          subscriber.middleName
        } ${subscriber.lastName}
            ${subscriber.company ? `<br>${subscriber.company}` : ""}
            ${
              subscriber.address
                ? `<br>${subscriber.address
                    .split("\n")
                    .map((line) => line.trim())
                    .filter((line) => line.length > 0)
                    .join("<br>")}`
                : ""
            }
          </div>
          
          <!-- Group 3: Greeting -->
          <div class="data-field group3-field" style="top: ${
            positions.group3.top
          }in; left: ${positions.group3.left}in; width: ${
          positions.group3.width
        }in;">
            Dear ${greetingName},
          </div>
        </div>
      `;
      });

      overlayHTML += `
      </body>
      </html>
    `;

      setIsLoading(false);
      return overlayHTML;
    };

    // Function to handle the printing of data overlays
    const handlePrintDataOverlay = () => {
      if (parentPrintDataOverlay) {
        parentPrintDataOverlay();
        return;
      }

      const overlayHTML = generateDataOverlayHTML();
      if (!overlayHTML) return;

      // Create a print-friendly iframe and trigger print
      printHTML(overlayHTML);
    };

    // Helper function to print HTML content without opening a new window
    const printHTML = (htmlContent) => {
      // Create a hidden iframe
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";

      // When iframe loads, write the content and print
      iframe.onload = function () {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(htmlContent);
        doc.close();

        // Add script to handle printing
        const script = doc.createElement("script");
        script.textContent = `
        // Auto-print when page loads
        setTimeout(function() {
          window.print();
          // Remove iframe after printing or if print dialog is closed
          setTimeout(function() {
            window.frameElement.remove();
          }, 2000);
        }, 500);
      `;
        doc.body.appendChild(script);
      };

      // Add iframe to document
      document.body.appendChild(iframe);
    };

    // Toggle configuration visibility
    const toggleConfig = () => {
      setShowConfig(!showConfig);
    };

    // Save current positions as a template in shared DB, tagged as 'thankyou'
    const handleSaveTemplate = async () => {
      try {
        const selectedTemplate = templates.find(
          (t) => t._id === selectedTemplateId
        );

        // For updates, fallback to current template name/desc if inputs are empty
        const effectiveName =
          (templateName || "").trim() || selectedTemplate?.name || "";
        const effectiveDesc =
          (templateDesc || "").trim() || selectedTemplate?.description || "";

        // For create, require a name
        if (!selectedTemplate && !effectiveName) {
          toast.error("Enter a template name");
          return;
        }

        const payload = {
          name: effectiveName,
          description: effectiveDesc,
          department: userRole,
          layout: { positions },
          selectedFields: [],
          previewType: "thankyou",
          selectedPrinter: "", // Thank you letters don't use raw printing
        };
        // Duplicate check helper constrained to thankyou previewType
        const checkForDuplicate = async (name) => {
          const res = await axios.get(
            `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/templates`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
              },
            }
          );
          const existing = (res.data || []).find(
            (t) =>
              t.name === name && (t.previewType || "standard") === "thankyou"
          );
          return existing || null;
        };

        if (selectedTemplate && selectedTemplateId !== "") {
          // For update: if name or dept changed, duplicate-check; else just confirm
          const nameChanged = payload.name !== (selectedTemplate.name || "");
          if (nameChanged) {
            setIsCheckingDuplicate(true);
            try {
              const dup = await checkForDuplicate(payload.name);
              if (dup && dup._id !== selectedTemplateId) {
                setDuplicateTemplate(dup);
                setPendingTemplatePayload(payload);
                setShowDuplicateModal(true);
                return;
              }
            } finally {
              setIsCheckingDuplicate(false);
            }
          }
          setPendingTemplatePayload(payload);
          setShowUpdateModal(true);
        } else {
          // Create new: check duplicate first
          setIsCheckingDuplicate(true);
          try {
            const dup = await checkForDuplicate(payload.name);
            if (dup) {
              setDuplicateTemplate(dup);
              setPendingTemplatePayload(payload);
              setShowDuplicateModal(true);
              return;
            }
          } finally {
            setIsCheckingDuplicate(false);
          }
          setIsSavingTemplate(true);
          const res = await axios.post(
            `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/templates-add`,
            payload,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
              },
            }
          );
          toast.success("Template saved");
          setTemplates((prev) => [res.data, ...prev]);
          setSelectedTemplateId(res.data._id || "");
          setTemplateName("");
          setTemplateDesc("");
        }
      } catch (e) {
        console.error("Save template error:", e);
        toast.error(e.response?.data?.error || "Failed to save template");
      } finally {
        setIsSavingTemplate(false);
      }
    };

    // Delete template
    const handleDeleteTemplate = () => {
      if (!selectedTemplateId) {
        toast.error("No template selected for deletion");
        return;
      }
      setShowDeleteModal(true);
    };

    const confirmDeleteTemplate = async () => {
      try {
        setIsDeletingTemplate(true);
        await axios.delete(
          `http://${
            import.meta.env.VITE_IP_ADDRESS
          }:3001/util/templates/${selectedTemplateId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }
        );

        toast.success("Template deleted");
        // Remove from list and clear selection
        setTemplates((prev) =>
          prev.filter((t) => t._id !== selectedTemplateId)
        );
        setSelectedTemplateId("");
        setTemplateName("");
        setTemplateDesc("");
      } catch (e) {
        console.error("Delete template error:", e);
        toast.error(e.response?.data?.error || "Failed to delete template");
      } finally {
        setIsDeletingTemplate(false);
        setShowDeleteModal(false);
      }
    };

    const cancelDeleteTemplate = () => {
      setShowDeleteModal(false);
    };

    const confirmUpdateTemplate = async () => {
      if (!selectedTemplateId || !pendingTemplatePayload) {
        setShowUpdateModal(false);
        return;
      }
      try {
        setIsSavingTemplate(true);
        const res = await axios.put(
          `http://${
            import.meta.env.VITE_IP_ADDRESS
          }:3001/util/templates/${selectedTemplateId}`,
          pendingTemplatePayload,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }
        );
        toast.success("Template updated");
        setTemplates((prev) =>
          prev.map((t) => (t._id === selectedTemplateId ? res.data : t))
        );
        setTemplateName("");
        setTemplateDesc("");
      } catch (e) {
        console.error("Update template error:", e);
        toast.error(e.response?.data?.error || "Failed to update template");
      } finally {
        setIsSavingTemplate(false);
        setShowUpdateModal(false);
        setPendingTemplatePayload(null);
      }
    };

    const cancelUpdateTemplate = () => {
      setShowUpdateModal(false);
      setPendingTemplatePayload(null);
    };

    const applyTemplate = (templateId) => {
      setSelectedTemplateId(templateId);
      const t = templates.find((x) => (x._id || "") === templateId);
      if (!t) return;
      if (t.layout?.positions) {
        setPositions(t.layout.positions);
        toast.success("Template applied");
      } else {
        toast.error("Selected template has no positions data");
      }
    };

    // Use useImperativeHandle to expose methods to parent component
    useImperativeHandle(ref, () => ({
      // Method to get current positions configuration
      getPositions: () => positions,

      // Method to generate preview
      generatePreview: () => {
        generatePreview();
      },
    }));

    return (
      <div className="p-4 border rounded shadow-sm bg-white w-full max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            Thank You Letter Data Overlay
          </h3>
          <div className="flex gap-2">
            {!useSharedConfig && (
              <Button
                onClick={toggleConfig}
                variant="outline"
                size="sm"
                className={showConfig ? "bg-blue-100" : ""}
              >
                {showConfig ? "Hide Configuration" : "Show Configuration"}
              </Button>
            )}
            {useSharedConfig && sharedConfig && (
              <span className="text-xs text-gray-500 italic">
                Using shared configuration
              </span>
            )}
          </div>
        </div>

        {/* Main content area with scroll */}
        <div className="flex-1 overflow-auto">
          {/* Reorganized to two-column layout with config on left, preview on right */}
          <div className="flex flex-col md:flex-row w-full gap-4">
            {/* Left side: Configuration */}
            <div className="w-full md:w-2/5 flex flex-col">
              {/* Range Selector */}
              <div className="order-3 mb-4 border rounded-lg p-3 bg-gray-50">
                <div className="mb-2 text-sm font-medium">Range</div>
                <RangeSelector
                  startClientId={localStartId}
                  setStartClientId={setLocalStartId}
                  endClientId={localEndId}
                  setEndClientId={setLocalEndId}
                  startPosition={localStartPosition}
                  setStartPosition={setLocalStartPosition}
                  availableRows={availableRows}
                  onSetFromSelection={() => {
                    if (!availableRows?.length) return;
                    const ids = availableRows
                      .map((r) =>
                        parseInt((r?.original?.id ?? "").toString(), 10)
                      )
                      .filter((n) => !isNaN(n));
                    if (ids.length === 0) return;
                    const minId = Math.min(...ids).toString();
                    const maxId = Math.max(...ids).toString();
                    setLocalStartId(minId);
                    setLocalEndId(maxId);
                  }}
                  showStartPosition={false}
                />
                <div className="mt-2 text-xs text-gray-600">
                  Using:{" "}
                  {(effectiveStartId || getMinClientId() || "").toString() ||
                    "Start"}{" "}
                  - {effectiveEndId || "End"}
                </div>
              </div>
              {/* Template controls */}
              <div className="order-1 mb-4 border rounded-lg p-3 bg-gray-50">
                <div className="mb-2 text-sm font-medium">Templates</div>
                <div className="flex gap-2 mb-2">
                  <select
                    className="flex-1 px-2 py-1 border rounded text-sm"
                    value={selectedTemplateId}
                    onChange={(e) => applyTemplate(e.target.value)}
                  >
                    <option value="">
                      Select Thank You Letter template...
                    </option>
                    {templates.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      (async () => {
                        try {
                          const res = await axios.get(
                            `http://${
                              import.meta.env.VITE_IP_ADDRESS
                            }:3001/util/templates`,
                            {
                              headers: {
                                Authorization: `Bearer ${localStorage.getItem(
                                  "accessToken"
                                )}`,
                              },
                            }
                          );
                          const all = Array.isArray(res.data) ? res.data : [];
                          const filtered = all.filter(
                            (t) => (t.previewType || "standard") === "thankyou"
                          );
                          setTemplates(filtered);
                          if (!selectedTemplateId && filtered.length > 0) {
                            const first = filtered[0];
                            setSelectedTemplateId(first._id || "");
                            if (first.layout?.positions) {
                              setPositions(first.layout.positions);
                            }
                          }
                        } catch {}
                      })();
                    }}
                  >
                    Reload
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <input
                    className="px-2 py-1 border rounded text-sm"
                    placeholder="Template name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                  <input
                    className="px-2 py-1 border rounded text-sm"
                    placeholder="Description (optional)"
                    value={templateDesc}
                    onChange={(e) => setTemplateDesc(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveTemplate}
                      size="sm"
                      disabled={isSavingTemplate}
                      className="flex-1"
                    >
                      {isSavingTemplate
                        ? "Saving..."
                        : selectedTemplateId
                        ? "Update Template"
                        : "Save as Template"}
                    </Button>
                    {selectedTemplateId && (
                      <Button
                        onClick={handleDeleteTemplate}
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                      >
                        Delete Template
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              {(showConfig || useSharedConfig) && !useSharedConfig && (
                <div className="order-2 mb-6 border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium">Position Configuration</h4>
                  </div>

                  <div className="grid grid-cols-1 gap-4 mb-4">
                    {/* Group 1: Month Year */}
                    <fieldset className="border rounded p-3">
                      <legend className="text-sm font-medium px-1">
                        Group 1: Month Year
                      </legend>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="block text-xs mb-1">Top (in)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={positions.group1.top}
                            onChange={(e) =>
                              handleGroupPositionChange(
                                "group1",
                                "top",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1">
                            Left (in)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={positions.group1.left}
                            onChange={(e) =>
                              handleGroupPositionChange(
                                "group1",
                                "left",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1">
                            Width (in)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={positions.group1.width}
                            onChange={(e) =>
                              handleGroupPositionChange(
                                "group1",
                                "width",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1">
                            Line Spacing (in)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={positions.group1.lineSpacing}
                            onChange={(e) =>
                              handleGroupPositionChange(
                                "group1",
                                "lineSpacing",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </div>
                      </div>

                      {/* Font settings for Group 1 */}
                      <div className="mt-2 border-t pt-2">
                        <div className="text-xs font-medium mb-1">
                          Font Settings
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs mb-1">
                              Size (pt)
                            </label>
                            <input
                              type="number"
                              step="1"
                              value={positions.group1.fontSize}
                              onChange={(e) =>
                                handleGroupPositionChange(
                                  "group1",
                                  "fontSize",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs mb-1">Weight</label>
                            <select
                              value={positions.group1.fontWeight}
                              onChange={(e) =>
                                handleGroupPositionChange(
                                  "group1",
                                  "fontWeight",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 border rounded text-sm"
                            >
                              <option value="normal">Normal</option>
                              <option value="bold">Bold</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs mb-1">
                              Font Family
                            </label>
                            <select
                              value={positions.group1.fontFamily}
                              onChange={(e) =>
                                handleGroupPositionChange(
                                  "group1",
                                  "fontFamily",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 border rounded text-sm"
                            >
                              <option value="Arial">Arial</option>
                              <option value="Calibri">Calibri</option>
                              <option value="Times New Roman">
                                Times New Roman
                              </option>
                              <option value="Courier New">Courier New</option>
                              <option value="Verdana">Verdana</option>
                              <option value="Tahoma">Tahoma</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </fieldset>

                    {/* Group 2: Address Group */}
                    <fieldset className="border rounded p-3">
                      <legend className="text-sm font-medium px-1">
                        Group 2: Address Group (Client Data & Subscription)
                      </legend>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="block text-xs mb-1">Top (in)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={positions.group2.top}
                            onChange={(e) =>
                              handleGroupPositionChange(
                                "group2",
                                "top",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1">
                            Left (in)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={positions.group2.left}
                            onChange={(e) =>
                              handleGroupPositionChange(
                                "group2",
                                "left",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1">
                            Width (in)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={positions.group2.width}
                            onChange={(e) =>
                              handleGroupPositionChange(
                                "group2",
                                "width",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1">
                            Line Spacing (in)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={positions.group2.lineSpacing}
                            onChange={(e) =>
                              handleGroupPositionChange(
                                "group2",
                                "lineSpacing",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </div>
                      </div>

                      {/* Font settings for Group 2 */}
                      <div className="mt-2 border-t pt-2">
                        <div className="text-xs font-medium mb-1">
                          Font Settings
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs mb-1">
                              Size (pt)
                            </label>
                            <input
                              type="number"
                              step="1"
                              value={positions.group2.fontSize}
                              onChange={(e) =>
                                handleGroupPositionChange(
                                  "group2",
                                  "fontSize",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs mb-1">Weight</label>
                            <select
                              value={positions.group2.fontWeight}
                              onChange={(e) =>
                                handleGroupPositionChange(
                                  "group2",
                                  "fontWeight",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 border rounded text-sm"
                            >
                              <option value="normal">Normal</option>
                              <option value="bold">Bold</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs mb-1">
                              Font Family
                            </label>
                            <select
                              value={positions.group2.fontFamily}
                              onChange={(e) =>
                                handleGroupPositionChange(
                                  "group2",
                                  "fontFamily",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 border rounded text-sm"
                            >
                              <option value="Arial">Arial</option>
                              <option value="Calibri">Calibri</option>
                              <option value="Times New Roman">
                                Times New Roman
                              </option>
                              <option value="Courier New">Courier New</option>
                              <option value="Verdana">Verdana</option>
                              <option value="Tahoma">Tahoma</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </fieldset>

                    {/* Group 3: Greeting */}
                    <fieldset className="border rounded p-3">
                      <legend className="text-sm font-medium px-1">
                        Group 3: Greeting
                      </legend>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="block text-xs mb-1">Top (in)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={positions.group3.top}
                            onChange={(e) =>
                              handleGroupPositionChange(
                                "group3",
                                "top",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1">
                            Left (in)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={positions.group3.left}
                            onChange={(e) =>
                              handleGroupPositionChange(
                                "group3",
                                "left",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1">
                            Width (in)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={positions.group3.width}
                            onChange={(e) =>
                              handleGroupPositionChange(
                                "group3",
                                "width",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1">
                            Line Spacing (in)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={positions.group3.lineSpacing}
                            onChange={(e) =>
                              handleGroupPositionChange(
                                "group3",
                                "lineSpacing",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </div>
                      </div>

                      {/* Font settings for Group 3 */}
                      <div className="mt-2 border-t pt-2">
                        <div className="text-xs font-medium mb-1">
                          Font Settings
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs mb-1">
                              Size (pt)
                            </label>
                            <input
                              type="number"
                              step="1"
                              value={positions.group3.fontSize}
                              onChange={(e) =>
                                handleGroupPositionChange(
                                  "group3",
                                  "fontSize",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs mb-1">Weight</label>
                            <select
                              value={positions.group3.fontWeight}
                              onChange={(e) =>
                                handleGroupPositionChange(
                                  "group3",
                                  "fontWeight",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 border rounded text-sm"
                            >
                              <option value="normal">Normal</option>
                              <option value="bold">Bold</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs mb-1">
                              Font Family
                            </label>
                            <select
                              value={positions.group3.fontFamily}
                              onChange={(e) =>
                                handleGroupPositionChange(
                                  "group3",
                                  "fontFamily",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 border rounded text-sm"
                            >
                              <option value="Arial">Arial</option>
                              <option value="Calibri">Calibri</option>
                              <option value="Times New Roman">
                                Times New Roman
                              </option>
                              <option value="Courier New">Courier New</option>
                              <option value="Verdana">Verdana</option>
                              <option value="Tahoma">Tahoma</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </fieldset>
                  </div>

                  <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                    <p className="font-medium text-blue-700">
                      Measurement Tips:
                    </p>
                    <p className="text-xs text-blue-600">
                      All positions are measured in inches from the top-left
                      corner of the page. Use the preview button to verify
                      layout before printing.
                    </p>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <span className="mr-2 text-sm">ID Range:</span>
                  <span className="font-medium">
                    {startId || "Start"} - {endId || "End"}
                  </span>
                </div>

                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm">
                    <span className="font-medium">{subscriberCount}</span>{" "}
                    subscribers selected for printing
                  </div>

                  <div className="text-xs text-gray-500">
                    {subscriberCount > 0 &&
                      subscriberCount < 20 &&
                      `Estimated pages: ${subscriberCount} (one subscriber per page)`}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handlePrintDataOverlay}
                  disabled={isLoading || subscriberCount === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <span className="mr-1">🖨️</span> Preview Print
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Right side: Live preview pane */}
            <div className="w-full md:w-3/5">
              <div className="border rounded-lg shadow-sm bg-white p-4 h-full">
                <h3 className="text-center font-semibold text-sm mb-3">
                  Live Preview
                </h3>

                <div className="relative flex items-center justify-center overflow-auto border rounded">
                  {filteredSubscribers.length > 0 ? (
                    <div className="relative w-full bg-gray-50">
                      <div
                        className="mx-auto"
                        style={{
                          width: "100%",
                          maxWidth: "650px",
                          height: "750px",
                          backgroundColor: "white",
                          margin: "10px auto",
                          boxShadow: "0 0 10px rgba(0,0,0,0.1)",
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        {/* Page representation */}
                        <div
                          style={{
                            position: "absolute",
                            top: "0",
                            left: "0",
                            width: "100%",
                            height: "100%",
                            transform: "scale(0.95)",
                            transformOrigin: "top center",
                          }}
                        >
                          {/* Real-time preview of the first subscriber */}
                          {(() => {
                            if (filteredSubscribers.length === 0) return null;

                            const subscriber = processSubscriberData(
                              filteredSubscribers[0]
                            );
                            if (!subscriber) return null;

                            // Calculate scale factors to convert inches to pixels in our preview
                            // For a standard 8.5x11 inch page in our container
                            const scaleX = 650 / 8.5; // pixels per inch horizontally
                            const scaleY = 750 / 11; // pixels per inch vertically

                            // For the greeting
                            const greetingName = subscriber.hasPersonalName
                              ? `${subscriber.title} ${subscriber.lastName}`
                              : subscriber.hasCompany
                              ? subscriber.company
                              : "Customer";

                            return (
                              <>
                                {/* Group 1: Month Year */}
                                <div
                                  className="absolute bg-blue-50 border border-blue-200 p-2 text-sm font-mono"
                                  style={{
                                    top: `${positions.group1.top * scaleY}px`,
                                    left: `${positions.group1.left * scaleX}px`,
                                    width: `${
                                      positions.group1.width * scaleX
                                    }px`,
                                    height: `${
                                      positions.group1.lineSpacing * scaleY
                                    }px`,
                                    fontFamily: positions.group1.fontFamily,
                                    fontSize: `${positions.group1.fontSize}px`,
                                    fontWeight: positions.group1.fontWeight,
                                    textAlign: "center",
                                  }}
                                >
                                  <div className="absolute text-xs text-blue-500 font-mono -top-4 -left-1">
                                    Group 1
                                  </div>
                                  {getCurrentMonthYear()}
                                </div>

                                {/* Group 2: Address Group (all client data and subscription info) */}
                                <div
                                  className="absolute bg-green-50 border border-green-200 p-2 text-sm font-mono"
                                  style={{
                                    top: `${positions.group2.top * scaleY}px`,
                                    left: `${positions.group2.left * scaleX}px`,
                                    width: `${
                                      positions.group2.width * scaleX
                                    }px`,
                                    minHeight: `${
                                      positions.group2.lineSpacing * 6 * scaleY
                                    }px`,
                                    fontFamily: positions.group2.fontFamily,
                                    fontSize: `${positions.group2.fontSize}px`,
                                    fontWeight: positions.group2.fontWeight,
                                  }}
                                >
                                  <div className="absolute text-xs text-green-500 font-mono -top-4 -left-1">
                                    Group 2
                                  </div>
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: "0px",
                                      left: "0px",
                                      width: "100%",
                                    }}
                                  >
                                    {subscriber.accountCode}
                                  </div>

                                  <div
                                    style={{
                                      position: "absolute",
                                      top: `${
                                        positions.group2.lineSpacing * scaleY
                                      }px`,
                                      left: "0px",
                                      width: "100%",
                                      whiteSpace: "pre-wrap",
                                    }}
                                  >
                                    {subscriber.title} {subscriber.firstName}{" "}
                                    {subscriber.middleName}{" "}
                                    {subscriber.lastName}
                                    {subscriber.company
                                      ? `\n${subscriber.company}`
                                      : ""}
                                    {subscriber.address
                                      ? `\n${subscriber.address
                                          .split("\n")
                                          .map((line) => line.trim())
                                          .filter((line) => line.length > 0)
                                          .join("\n")}`
                                      : ""}
                                  </div>
                                </div>

                                {/* Group 3: Greeting */}
                                <div
                                  className="absolute bg-purple-50 border border-purple-200 p-2 text-sm font-mono"
                                  style={{
                                    top: `${positions.group3.top * scaleY}px`,
                                    left: `${positions.group3.left * scaleX}px`,
                                    width: `${
                                      positions.group3.width * scaleX
                                    }px`,
                                    height: `${
                                      positions.group3.lineSpacing * scaleY
                                    }px`,
                                    fontFamily: positions.group3.fontFamily,
                                    fontSize: `${positions.group3.fontSize}px`,
                                    fontWeight: positions.group3.fontWeight,
                                  }}
                                >
                                  <div className="absolute text-xs text-purple-500 font-mono -top-4 -left-1">
                                    Group 3
                                  </div>
                                  Dear {greetingName},
                                </div>

                                {/* Page guides */}
                                <div
                                  className="absolute text-xs text-gray-400 font-bold"
                                  style={{ top: "10px", left: "10px" }}
                                >
                                  8.5" × 11"
                                </div>

                                {/* Grid lines for reference - using the scale factors */}
                                <div className="absolute inset-0 pointer-events-none">
                                  <div
                                    className="h-full w-full opacity-30"
                                    style={{
                                      backgroundImage:
                                        "linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)",
                                      backgroundSize: `${650 / 8.5}px ${
                                        750 / 11
                                      }px`, // This makes grid lines at 1-inch intervals
                                    }}
                                  ></div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 h-[400px]">
                      <p className="text-gray-500">
                        No subscribers selected to preview
                      </p>
                      <p className="text-sm text-gray-400 mt-2">
                        Select subscribers and specify an ID range to see the
                        preview
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-2 text-center text-xs text-gray-500">
                  Live preview shows placement for the first subscriber in your
                  range
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Modal */}
        {previewHTML && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-[95vw] h-[90vh] flex flex-col">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-medium">Thank You Letter Preview</h3>
                <Button
                  onClick={() => setPreviewHTML(null)}
                  variant="ghost"
                  size="sm"
                >
                  Close
                </Button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <iframe
                  srcDoc={previewHTML}
                  className="w-full h-full border-0"
                  title="Thank You Letter Preview"
                />
              </div>
            </div>
          </div>
        )}

        {/* Duplicate Template Modal */}
        {showDuplicateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Template Already Exists
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  A template named{" "}
                  <span className="font-medium">
                    "{duplicateTemplate?.name}"
                  </span>{" "}
                  already exists in {duplicateTemplate?.department} for Thank
                  You letters.
                </p>
                <div className="space-y-2">
                  <Button
                    onClick={async () => {
                      if (!duplicateTemplate || !pendingTemplatePayload) return;
                      try {
                        setIsSavingTemplate(true);
                        const res = await axios.put(
                          `http://${
                            import.meta.env.VITE_IP_ADDRESS
                          }:3001/util/templates/${duplicateTemplate._id}`,
                          pendingTemplatePayload,
                          {
                            headers: {
                              Authorization: `Bearer ${localStorage.getItem(
                                "accessToken"
                              )}`,
                            },
                          }
                        );
                        toast.success("Template updated");
                        setTemplates((prev) =>
                          prev.map((t) =>
                            t._id === duplicateTemplate._id ? res.data : t
                          )
                        );
                        setSelectedTemplateId(
                          res.data._id || duplicateTemplate._id
                        );
                        setTemplateName("");
                        setTemplateDesc("");
                      } catch (e) {
                        console.error("Duplicate update error:", e);
                        toast.error(
                          e.response?.data?.error || "Failed to update template"
                        );
                      } finally {
                        setIsSavingTemplate(false);
                        setShowDuplicateModal(false);
                        setPendingTemplatePayload(null);
                        setDuplicateTemplate(null);
                      }
                    }}
                    disabled={isSavingTemplate}
                    className="w-full"
                  >
                    {isSavingTemplate
                      ? "Updating..."
                      : "Update Existing Template"}
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!duplicateTemplate || !pendingTemplatePayload) return;
                      try {
                        setIsSavingTemplate(true);
                        await axios.delete(
                          `http://${
                            import.meta.env.VITE_IP_ADDRESS
                          }:3001/util/templates/${duplicateTemplate._id}`,
                          {
                            headers: {
                              Authorization: `Bearer ${localStorage.getItem(
                                "accessToken"
                              )}`,
                            },
                          }
                        );
                        const res = await axios.post(
                          `http://${
                            import.meta.env.VITE_IP_ADDRESS
                          }:3001/util/templates-add`,
                          pendingTemplatePayload,
                          {
                            headers: {
                              Authorization: `Bearer ${localStorage.getItem(
                                "accessToken"
                              )}`,
                            },
                          }
                        );
                        toast.success("Template replaced");
                        setTemplates((prev) => [
                          res.data,
                          ...prev.filter(
                            (t) => t._id !== duplicateTemplate._id
                          ),
                        ]);
                        setSelectedTemplateId(res.data._id || "");
                        setTemplateName("");
                        setTemplateDesc("");
                      } catch (e) {
                        console.error("Duplicate replace error:", e);
                        toast.error(
                          e.response?.data?.error ||
                            "Failed to replace template"
                        );
                      } finally {
                        setIsSavingTemplate(false);
                        setShowDuplicateModal(false);
                        setPendingTemplatePayload(null);
                        setDuplicateTemplate(null);
                      }
                    }}
                    variant="outline"
                    disabled={isSavingTemplate}
                    className="w-full"
                  >
                    {isSavingTemplate
                      ? "Replacing..."
                      : "Replace Existing Template"}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowDuplicateModal(false);
                      setDuplicateTemplate(null);
                      setPendingTemplatePayload(null);
                    }}
                    variant="outline"
                    disabled={isSavingTemplate}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Delete Template
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Are you sure you want to delete this template? This action
                  cannot be undone.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={cancelDeleteTemplate}
                    variant="outline"
                    disabled={isDeletingTemplate}
                    className="px-4 py-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmDeleteTemplate}
                    variant="destructive"
                    disabled={isDeletingTemplate}
                    className="px-4 py-2"
                  >
                    {isDeletingTemplate ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Update Confirmation Modal */}
        {showUpdateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Update Template
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Are you sure you want to update the selected template with the
                  current settings?
                </p>
                {/* Diff view: only changed values */}
                <div className="text-left mb-4">
                  <div className="text-xs text-gray-600 mb-2 font-medium">
                    Changes
                  </div>
                  {(() => {
                    const current =
                      templates.find(
                        (t) => (t._id || "") === selectedTemplateId
                      ) || {};
                    const nextPayload = pendingTemplatePayload || {
                      name: (templateName || "").trim() || current.name,
                      description:
                        (templateDesc || "").trim() || current.description,
                      department: userRole,
                      layout: { positions },
                    };

                    const computeDiffs = (a, b, base = "") => {
                      const diffs = [];
                      const keys = new Set([
                        ...Object.keys(a || {}),
                        ...Object.keys(b || {}),
                      ]);
                      keys.forEach((k) => {
                        const av = a ? a[k] : undefined;
                        const bv = b ? b[k] : undefined;
                        const path = base ? `${base}.${k}` : k;
                        if (
                          av &&
                          bv &&
                          typeof av === "object" &&
                          typeof bv === "object"
                        ) {
                          diffs.push(...computeDiffs(av, bv, path));
                        } else if (JSON.stringify(av) !== JSON.stringify(bv)) {
                          diffs.push({ path, from: av, to: bv });
                        }
                      });
                      return diffs;
                    };

                    const diffs = [];
                    if (current.name !== nextPayload.name) {
                      diffs.push({
                        path: "name",
                        from: current.name,
                        to: nextPayload.name,
                      });
                    }
                    if (current.department !== nextPayload.department) {
                      diffs.push({
                        path: "department",
                        from: current.department,
                        to: nextPayload.department,
                      });
                    }
                    if (current.description !== nextPayload.description) {
                      diffs.push({
                        path: "description",
                        from: current.description,
                        to: nextPayload.description,
                      });
                    }
                    const currentPositions = current?.layout?.positions || {};
                    const nextPositions = nextPayload?.layout?.positions || {};
                    const posDiffs = computeDiffs(
                      currentPositions,
                      nextPositions,
                      "positions"
                    );
                    const allDiffs = [...diffs, ...posDiffs];

                    if (allDiffs.length === 0) {
                      return (
                        <div className="text-xs text-gray-500">
                          No changes detected.
                        </div>
                      );
                    }

                    return (
                      <div className="text-xs max-h-48 overflow-auto border rounded p-2 bg-gray-50">
                        <div className="mb-2 text-gray-700 font-medium">
                          {allDiffs.length} change
                          {allDiffs.length > 1 ? "s" : ""}
                        </div>
                        <ul className="space-y-1">
                          {allDiffs.map((d, idx) => (
                            <li key={`diff-${idx}`} className="flex flex-col">
                              <span className="text-gray-600">{d.path}</span>
                              <div className="pl-2">
                                <span className="text-gray-400 mr-1">from</span>
                                <code className="bg-white border rounded px-1 py-0.5">
                                  {String(d.from)}
                                </code>
                                <span className="text-gray-400 mx-1">→</span>
                                <code className="bg-white border rounded px-1 py-0.5">
                                  {String(d.to)}
                                </code>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}
                </div>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={cancelUpdateTemplate}
                    variant="outline"
                    disabled={isSavingTemplate}
                    className="px-4 py-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmUpdateTemplate}
                    disabled={isSavingTemplate}
                    className="px-4 py-2"
                  >
                    {isSavingTemplate ? "Updating..." : "Confirm Update"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

export default ThankYouLetterDataOverlay;
