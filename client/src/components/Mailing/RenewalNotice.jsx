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

const RenewalNoticeDataOverlay = forwardRef(
  (
    {
      startId,
      endId,
      availableRows,
      parentPrintAlignmentTest = null,
      parentPrintDataOverlay = null,
      // Add shared configuration props
      useSharedConfig = false,
      sharedConfig = null,
      onSkippedDataUpdate = null, // Add callback for skipped data
    },
    ref
  ) => {
    const [isLoading, setIsLoading] = useState(false);
    const [filteredSubscribers, setFilteredSubscribers] = useState([]);
    const [subscriberCount, setSubscriberCount] = useState(0);
    const [showConfig, setShowConfig] = useState(false);
    const [skippedRecords, setSkippedRecords] = useState([]);
    const [reminderMonth, setReminderMonth] = useState(
      new Date().toLocaleString("default", { month: "long" })
    );
    const [reminderYear, setReminderYear] = useState(
      new Date().getFullYear().toString()
    );
    const [locationType, setLocationType] = useState("Local"); // 'Local' or 'Foreign'

    // Configuration state for positions (defaulted to current values)
    const [positions, setPositions] = useState(() => {
      // If shared configuration is provided, use it
      if (useSharedConfig && sharedConfig) {
        return (
          sharedConfig.positions || {
            group1: {
              // Right side fields (ID, Expiry Date, Last Issue)
              top: 3.3,
              left: 0.25,
              width: 3.0,
              lineSpacing: 0.825,
              fontSize: 12,
              fontWeight: "bold",
              fontFamily: "Arial",
            },
            group2: {
              // Left side fields (ID, Copies, Name, Address, etc.)
              top: 3.3,
              left: 0.0,
              width: 5.0,
              lineSpacing: 0.275,
              fontSize: 12,
              fontWeight: "normal",
              fontFamily: "Arial",
            },
            group3: {
              // Sucat reminder text
              top: 6.0,
              left: 0.1, // Aligned with group2
              width: 4.0,
              lineSpacing: 0.3,
              fontSize: 12,
              fontWeight: "normal",
              fontFamily: "Arial",
            },
          }
        );
      }

      // Try to load saved settings from localStorage
      try {
        const savedPositions = localStorage.getItem("renewalNoticePositions");
        if (savedPositions) {
          return JSON.parse(savedPositions);
        }
      } catch (error) {
        console.error("Error loading saved positions:", error);
      }

      // Default positions based on the new position data (converting from percentages to inches)
      return {
        // Group 1: ID, Expiry, Last Issue (Right side fields)
        group1: {
          top: 1.4,
          left: 4.2,
          width: 2,
          lineSpacing: 0.3,
          fontSize: 12,
          fontWeight: "bold",
          fontFamily: "Arial",
        },

        // Group 2: ID, Copies, Name, Address, Contact (Left side fields)
        group2: {
          top: 1.8,
          left: 0.1,
          width: 3,
          lineSpacing: 0.175,
          fontSize: 12,
          fontWeight: "normal",
          fontFamily: "Arial",
        },

        // Group 3: Sucat reminder text
        group3: {
          top: 1,
          left: 0.1, // Aligned with group2
          width: 3,
          lineSpacing: 0.3,
          fontSize: 12,
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

    // Fetch templates for renewal notice (same DB, filtered by previewType)
    useEffect(() => {
      const fetchTemplates = async () => {
        try {
          const res = await axios.get(
            `http://${
              import.meta.env.VITE_IP_ADDRESS
            }:3001/util/templates?department=${userRole}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
              },
            }
          );
          const all = Array.isArray(res.data) ? res.data : [];
          const filtered = all.filter(
            (t) => (t.previewType || "standard") === "renewal"
          );
          setTemplates(filtered);
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

      // Check for required fields for renewal notice
      const missingFields = [];
      if (!original.id) missingFields.push("ID");
      if (!original.fname && !original.lname && !original.company) {
        missingFields.push("Name or Company");
      }
      if (!original.address1 && !original.address)
        missingFields.push("Address"); // Check both address1 and address

      // Get subscription data exactly like PrintGenerator.js
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
      return {
        skipped: false,
        id: original.id,
        title: original.title || "",
        firstName: original.fname || "",
        middleName: original.mname || "",
        lastName: original.lname || "",
        company: original.company || "",
        address1: original.address1 || original.address || "",
        address2: original.address2 || "",
        address3: original.address3 || "",
        address4: original.address4 || "",
        hasPersonalName: !!(original.fname || original.lname || original.title),
        hasCompany: !!original.company,
        expiryDate: formatDate(enddate), // Use enddate directly
        copies,
        acode,
        lastIssue: getLastIssue(enddate), // Use enddate directly
      };
    }, []);

    // Local range state to enable in-component RangeSelector
    const [localStartId, setLocalStartId] = useState("");
    const [localEndId, setLocalEndId] = useState("");
    const [localStartPosition, setLocalStartPosition] = useState("left");

    // Derive effective IDs: prefer local if set, else props
    const effectiveStartId = (localStartId || "").trim() || (startId || "").trim();
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

    // Helper function to get last issue from expiry date
    const getLastIssue = (expiryDate) => {
      if (!expiryDate) return "N/A";
      const date = new Date(expiryDate);
      if (isNaN(date.getTime())) return "N/A";
      return formatMonthYear(date);
    };

    // Format date as Month Year (for last issue display)
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
          [field]: parseFloat(value),
        },
      }));
    };

    // Save current positions to localStorage and to shared config if available
    const savePositions = () => {
      try {
        localStorage.setItem(
          "renewalNoticePositions",
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
        const savedPositions = localStorage.getItem("renewalNoticePositions");
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
            top: 3.3,
            left: 0.25,
            width: 3.0,
            lineSpacing: 0.825,
            fontSize: 12,
            fontWeight: "bold",
            fontFamily: "Arial",
          },
          group2: {
            top: 3.3,
            left: 0.0,
            width: 5.0,
            lineSpacing: 0.175,
            fontSize: 12,
            fontWeight: "normal",
            fontFamily: "Arial",
          },
          group3: {
            top: 0.3, // Positioned at the top of the page with small margin
            left: 0.1, // Aligned with group2
            width: 4.0,
            lineSpacing: 0.3,
            fontSize: 12,
            fontWeight: "normal",
            fontFamily: "Arial",
          },
        });
      }
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

      // Generate preview HTML for a single subscriber
      const previewContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Renewal Notice Preview</title>
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
          <h2>Renewal Notice Preview</h2>
          <p>This preview shows how data fields will be positioned on the form</p>
        </div>
        
        <div class="preview-container">
          <!-- Group 1: ID, Expiry, Last Issue -->
          <div class="group" style="top: ${
            positions.group1.top - 0.2
          }in; left: ${positions.group1.left - 0.2}in; width: ${
        positions.group1.width + 0.4
      }in; height: ${positions.group1.lineSpacing * 2 + 0.4}in;">
            <!-- Subscriber ID -->
            <div class="data-field" style="top: 0.2in; left: 0.2in;">
              <strong>${sampleSubscriber.id}</strong>
            </div>
            
            <!-- Expiry date -->
            <div class="data-field" style="top: ${
              0.2 + positions.group1.lineSpacing
            }in; left: 0.2in;">
              <strong>${sampleSubscriber.expiryDate}</strong>
            </div>
            
            <!-- Last issue -->
            <div class="data-field" style="top: ${
              0.2 + positions.group1.lineSpacing * 2
            }in; left: 0.2in;">
              <strong>${sampleSubscriber.lastIssue}</strong>
            </div>
          </div>
          
          <!-- Group 2: ID Header, Name & Address -->
          <div class="group" style="top: ${
            positions.group2.top - 0.2
          }in; left: ${positions.group2.left - 0.2}in; width: ${
        positions.group2.width + 0.4
      }in; height: ${positions.group2.lineSpacing * 6 + 0.4}in;">
            <!-- ID header section with ID and status -->
            <div class="data-field" style="top: 0.2in; left: 0.2in; width: ${
              positions.group2.width
            }in; line-height: 1.2;">
              ${
                sampleSubscriber.id +
                "/Exp:" +
                sampleSubscriber.expiryDate +
                "/" +
                sampleSubscriber.copies +
                "cps" +
                (sampleSubscriber.acode ? "/" + sampleSubscriber.acode : "")
              }
            </div>
            
            <!-- Name and address block -->
            <div class="data-field" style="top: ${
              0.2 + positions.group2.lineSpacing
            }in; left: 0.2in; width: ${
        positions.group2.width
      }in; line-height: 1.2;">
              ${sampleSubscriber.title} ${sampleSubscriber.firstName} ${
        sampleSubscriber.middleName
      } ${sampleSubscriber.lastName}<br>
              ${
                sampleSubscriber.company
                  ? `${sampleSubscriber.company}<br>`
                  : ""
              }
              ${
                sampleSubscriber.address1
                  ? `${sampleSubscriber.address1}<br>`
                  : ""
              }
              ${
                sampleSubscriber.address2
                  ? `${sampleSubscriber.address2}<br>`
                  : ""
              }
              ${
                sampleSubscriber.address3
                  ? `${sampleSubscriber.address3}<br>`
                  : ""
              }
              ${sampleSubscriber.address4 ? `${sampleSubscriber.address4}` : ""}
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

    // Generate the HTML for precisely positioned data overlays (updated for grouped fields)
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
        <title>Renewal Notice Data</title>
        <style>
          @page {
            size: 8.5in 11in;
            margin: 0;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 12pt;
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
            font-family: ${positions.group1.fontFamily}, sans-serif;
            font-size: ${positions.group1.fontSize}pt;
            font-weight: ${positions.group1.fontWeight};
          }
          .group2-field {
            font-family: ${positions.group2.fontFamily}, sans-serif;
            font-size: ${positions.group2.fontSize}pt;
            font-weight: ${positions.group2.fontWeight};
          }
          .group3-field {
            font-family: ${positions.group3.fontFamily}, sans-serif;
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
          <h3>Renewal Notice Data</h3>
          <p>Printing <strong>${filteredSubscribers.length}</strong> subscriber(s). Each subscriber will print on a separate page.</p>
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

        // Calculate scale factors to convert inches to pixels in our preview
        // For a standard 8.5x11 inch page in our container
        const scaleX = 650 / 8.5; // pixels per inch horizontally
        const scaleY = 750 / 11; // pixels per inch vertically

        // Determine if we need to adjust positions based on missing fields
        let namePosition = positions.group2.top + positions.group2.lineSpacing;
        let companyPosition =
          positions.group2.top + positions.group2.lineSpacing * 2;
        let addressStartPosition =
          positions.group2.top + positions.group2.lineSpacing * 3;

        // If company exists but no personal name, use company as the name
        const displayName = subscriber.hasPersonalName
          ? `${subscriber.title} ${subscriber.firstName} ${subscriber.middleName} ${subscriber.lastName}`.trim()
          : "";

        // Adjust positions based on what fields are present
        if (!subscriber.hasPersonalName && subscriber.hasCompany) {
          namePosition = positions.group2.top + positions.group2.lineSpacing;
          addressStartPosition =
            positions.group2.top + positions.group2.lineSpacing * 2;
        } else if (!subscriber.hasCompany) {
          addressStartPosition =
            positions.group2.top + positions.group2.lineSpacing * 2;
        }

        // Calculate actual address line positions
        const addressLines = [];
        const processAddress = (addr) => {
          if (!addr) return null;
          return addr
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .join("\n");
        };

        const address1 = processAddress(subscriber.address1);
        const address2 = processAddress(subscriber.address2);
        const address3 = processAddress(subscriber.address3);
        const address4 = processAddress(subscriber.address4);

        if (address1) addressLines.push(address1);
        if (address2) addressLines.push(address2);
        if (address3) addressLines.push(address3);
        if (address4) addressLines.push(address4);

        // Join all address lines into a single string with line breaks
        const fullAddress = addressLines.join("\n");

        // Split the full address into lines for display
        const displayLines = fullAddress.split("\n");

        // Adjust addressStartPosition based on number of display lines
        const addressLinePositions = displayLines.map((_, index) => ({
          top: addressStartPosition + positions.group2.lineSpacing * index,
        }));

        overlayHTML += `
        <div class="data-overlay">
          <!-- Group 1: ID, Expiry, Last Issue (Right side) -->
          <div class="data-field group1-field" style="top: ${
            positions.group1.top
          }in; left: ${positions.group1.left}in;">
            <strong>${subscriber.id}</strong>
          </div>
          
          <div class="data-field group1-field" style="top: ${
            positions.group1.top + positions.group1.lineSpacing
          }in; left: ${positions.group1.left}in;">
            <strong>${subscriber.expiryDate}</strong>
          </div>
          
          <div class="data-field group1-field" style="top: ${
            positions.group1.top + positions.group1.lineSpacing * 2
          }in; left: ${positions.group1.left}in;">
            <strong>${getLastIssue(subscriber.expiryDate)}</strong>
          </div>
          
          <!-- Group 2: ID Header, Name & Address (Left side) -->
          <div class="data-field group2-field" style="top: ${
            positions.group2.top
          }in; left: ${positions.group2.left}in; width: ${
          positions.group2.width
        }in;">
            ${
              subscriber.id +
              "/Exp:" +
              subscriber.expiryDate +
              "/" +
              subscriber.copies +
              "cps" +
              (subscriber.acode ? "/" + subscriber.acode : "")
            }
          </div>
      `;

        // Add personal name if it exists
        if (subscriber.hasPersonalName) {
          overlayHTML += `
          <div class="data-field group2-field" style="top: ${namePosition}in; left: ${positions.group2.left}in; width: ${positions.group2.width}in;">
            ${displayName}
          </div>
        `;
        }

        // Add company if it exists (and wasn't already used as the name)
        if (subscriber.hasCompany && subscriber.hasPersonalName) {
          overlayHTML += `
          <div class="data-field group2-field" style="top: ${companyPosition}in; left: ${positions.group2.left}in; width: ${positions.group2.width}in;">
            ${subscriber.company}
          </div>
        `;
        } else if (subscriber.hasCompany && !subscriber.hasPersonalName) {
          // Company being used as the name
          overlayHTML += `
          <div class="data-field group2-field" style="top: ${namePosition}in; left: ${positions.group2.left}in; width: ${positions.group2.width}in;">
            ${subscriber.company}
          </div>
        `;
        }

        // Add address fields with adjusted positions
        if (subscriber.address1) {
          overlayHTML += `
          <div class="data-field group2-field" style="top: ${addressStartPosition}in; left: ${positions.group2.left}in; width: ${positions.group2.width}in;">
            ${subscriber.address1}
          </div>
        `;
        }

        if (subscriber.address2) {
          overlayHTML += `
          <div class="data-field group2-field" style="top: ${
            addressStartPosition + positions.group2.lineSpacing
          }in; left: ${positions.group2.left}in; width: ${
            positions.group2.width
          }in;">
            ${subscriber.address2}
          </div>
        `;
        }

        if (subscriber.address3) {
          overlayHTML += `
          <div class="data-field group2-field" style="top: ${
            addressStartPosition + positions.group2.lineSpacing * 2
          }in; left: ${positions.group2.left}in; width: ${
            positions.group2.width
          }in;">
            ${subscriber.address3}
          </div>
        `;
        }

        if (subscriber.address4) {
          overlayHTML += `
          <div class="data-field group2-field" style="top: ${
            addressStartPosition + positions.group2.lineSpacing * 3
          }in; left: ${positions.group2.left}in; width: ${
            positions.group2.width
          }in;">
            ${subscriber.address4}
          </div>
        `;
        }

        // Add Group 3: Sucat Reminder Text
        overlayHTML += `
      <div class="data-field group3-field" style="top: ${
        positions.group3.top
      }in; left: ${positions.group3.left}in; width: ${
          positions.group3.width
        }in;">
        Sucat - ${reminderMonth} ${reminderYear}
      </div>

      <div class="data-field group3-field" style="top: ${
        positions.group3.top + positions.group3.lineSpacing
      }in; left: ${positions.group3.left}in; width: ${
          positions.group3.width
        }in;">
        (Friendly Reminder - ${locationType})
      </div>
      `;

        overlayHTML += `</div>`;
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

    // Save current positions as a template in shared DB, tagged as 'renewal'
    const handleSaveTemplate = async () => {
      if (!templateName.trim()) {
        toast.error("Enter a template name");
        return;
      }
      try {
        setIsSavingTemplate(true);
        const payload = {
          name: templateName.trim(),
          description: templateDesc.trim(),
          department: userRole,
          layout: { positions },
          selectedFields: [],
          previewType: "renewal",
        };
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
        // add to list and select
        setTemplates((prev) => [res.data, ...prev]);
        setSelectedTemplateId(res.data._id || "");
        setTemplateName("");
        setTemplateDesc("");
      } catch (e) {
        console.error("Save template error:", e);
        toast.error(e.response?.data?.error || "Failed to save template");
      } finally {
        setIsSavingTemplate(false);
      }
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

    // Expose methods for parent
    useImperativeHandle(ref, () => ({
      getPositions: () => positions,
      generatePreview: () => generatePreview(),
    }));

    return (
      <div className="p-4 border rounded shadow-sm bg-white w-full max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Renewal Notice Data Overlay</h3>
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
            <div className="w-full md:w-2/5">
              {/* Range Selector */}
              <div className="mb-4 border rounded-lg p-3 bg-gray-50">
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
                      .map((r) => parseInt((r?.original?.id ?? "").toString(), 10))
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
                  Using: {(effectiveStartId || getMinClientId() || "").toString() || "Start"} - {effectiveEndId || "End"}
                </div>
              </div>
              {/* Template controls */}
              <div className="mb-4 border rounded-lg p-3 bg-gray-50">
                <div className="mb-2 text-sm font-medium">Templates</div>
                <div className="flex gap-2 mb-2">
                  <select
                    className="flex-1 px-2 py-1 border rounded text-sm"
                    value={selectedTemplateId}
                    onChange={(e) => applyTemplate(e.target.value)}
                  >
                    <option value="">Select Renewal Notice template...</option>
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
                      // refresh list
                      // simple re-run by toggling role dependency
                      const r = userRole; // no-op to satisfy linter
                      (async () => {
                        try {
                          const res = await axios.get(
                            `http://${
                              import.meta.env.VITE_IP_ADDRESS
                            }:3001/util/templates?department=${userRole}`,
                            {
                              headers: {
                                Authorization: `Bearer ${localStorage.getItem(
                                  "accessToken"
                                )}`,
                              },
                            }
                          );
                          const all = Array.isArray(res.data) ? res.data : [];
                          setTemplates(
                            all.filter(
                              (t) => (t.previewType || "standard") === "renewal"
                            )
                          );
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
                  <Button
                    onClick={handleSaveTemplate}
                    size="sm"
                    disabled={isSavingTemplate}
                  >
                    {isSavingTemplate ? "Saving..." : "Save as Template"}
                  </Button>
                </div>
              </div>
              {(showConfig || useSharedConfig) && !useSharedConfig && (
                <div className="mb-6 border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium">Position Configuration</h4>
                  </div>

                  <div className="grid grid-cols-1 gap-4 mb-4">
                    {/* Group 1: ID, Expiry, Last Issue */}
                    <fieldset className="border rounded p-3">
                      <legend className="text-sm font-medium px-1">
                        Group 1: ID, Expiry, Last Issue
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

                    {/* Group 2: ID Header, Name & Address */}
                    <fieldset className="border rounded p-3">
                      <legend className="text-sm font-medium px-1">
                        Group 2: ID, Name, Address
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

                    {/* Group 3: Sucat Reminder Text */}
                    <fieldset className="border rounded p-3">
                      <legend className="text-sm font-medium px-1">
                        Group 3: Sucat Reminder
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
              {/* Add reminder settings above the preview */}
              <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                <h4 className="font-medium text-sm mb-3">Reminder Settings</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs mb-1">Month</label>
                    <select
                      value={reminderMonth}
                      onChange={(e) => setReminderMonth(e.target.value)}
                      className="w-full px-2 py-1 border rounded text-sm"
                    >
                      {[
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
                      ].map((month) => (
                        <option key={month} value={month}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Year</label>
                    <input
                      type="number"
                      value={reminderYear}
                      onChange={(e) => setReminderYear(e.target.value)}
                      className="w-full px-2 py-1 border rounded text-sm"
                      min="2000"
                      max="2100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Location Type</label>
                    <select
                      value={locationType}
                      onChange={(e) => setLocationType(e.target.value)}
                      className="w-full px-2 py-1 border rounded text-sm"
                    >
                      <option value="Local">Local</option>
                      <option value="Foreign">Foreign</option>
                    </select>
                  </div>
                </div>
              </div>

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

                            // Determine if we need to adjust positions based on missing fields
                            let namePosition =
                              positions.group2.top +
                              positions.group2.lineSpacing;
                            let companyPosition =
                              positions.group2.top +
                              positions.group2.lineSpacing * 2;
                            let addressStartPosition =
                              positions.group2.top +
                              positions.group2.lineSpacing * 3;

                            // If company exists but no personal name, use company as the name
                            const displayName = subscriber.hasPersonalName
                              ? `${subscriber.title} ${subscriber.firstName} ${subscriber.middleName} ${subscriber.lastName}`.trim()
                              : "";

                            // Adjust positions based on what fields are present
                            if (
                              !subscriber.hasPersonalName &&
                              subscriber.hasCompany
                            ) {
                              namePosition =
                                positions.group2.top +
                                positions.group2.lineSpacing;
                              addressStartPosition =
                                positions.group2.top +
                                positions.group2.lineSpacing * 2;
                            } else if (!subscriber.hasCompany) {
                              addressStartPosition =
                                positions.group2.top +
                                positions.group2.lineSpacing * 2;
                            }

                            // Calculate actual address line positions
                            const addressLines = [];
                            const processAddress = (addr) => {
                              if (!addr) return null;
                              return addr
                                .split("\n")
                                .map((line) => line.trim())
                                .filter((line) => line.length > 0)
                                .join("\n");
                            };

                            const address1 = processAddress(
                              subscriber.address1
                            );
                            const address2 = processAddress(
                              subscriber.address2
                            );
                            const address3 = processAddress(
                              subscriber.address3
                            );
                            const address4 = processAddress(
                              subscriber.address4
                            );

                            if (address1) addressLines.push(address1);
                            if (address2) addressLines.push(address2);
                            if (address3) addressLines.push(address3);
                            if (address4) addressLines.push(address4);

                            // Join all address lines into a single string with line breaks
                            const fullAddress = addressLines.join("\n");

                            // Split the full address into lines for display
                            const displayLines = fullAddress.split("\n");

                            // Adjust addressStartPosition based on number of display lines
                            const addressLinePositions = displayLines.map(
                              (_, index) => ({
                                top:
                                  addressStartPosition +
                                  positions.group2.lineSpacing * index,
                              })
                            );

                            return (
                              <>
                                {/* Group 1: ID, Expiry, Last Issue (Right side) */}
                                <div
                                  className="absolute bg-blue-50 border border-blue-200 p-2 text-sm font-mono"
                                  style={{
                                    top: `${positions.group1.top * scaleY}px`,
                                    left: `${positions.group1.left * scaleX}px`,
                                    width: `${
                                      positions.group1.width * scaleX
                                    }px`,
                                    height: `${
                                      positions.group1.lineSpacing * 3 * scaleY
                                    }px`,
                                    fontFamily: positions.group1.fontFamily,
                                    fontSize: `${positions.group1.fontSize}px`,
                                    fontWeight: positions.group1.fontWeight,
                                  }}
                                >
                                  <div className="absolute text-xs text-blue-500 font-mono -top-4 -left-1">
                                    Group 1
                                  </div>
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: "0px",
                                      left: "0px",
                                    }}
                                  >
                                    <strong>{subscriber.id}</strong>
                                  </div>

                                  <div
                                    style={{
                                      position: "absolute",
                                      top: `${
                                        positions.group1.lineSpacing * scaleY
                                      }px`,
                                      left: "0px",
                                    }}
                                  >
                                    <strong>{subscriber.expiryDate}</strong>
                                  </div>

                                  <div
                                    style={{
                                      position: "absolute",
                                      top: `${
                                        positions.group1.lineSpacing *
                                        2 *
                                        scaleY
                                      }px`,
                                      left: "0px",
                                    }}
                                  >
                                    <strong>
                                      {getLastIssue(subscriber.expiryDate)}
                                    </strong>
                                  </div>
                                </div>

                                {/* Group 2: ID Header, Name & Address (Left side) */}
                                <div
                                  className="absolute bg-green-50 border border-green-200 p-2 text-sm font-mono"
                                  style={{
                                    top: `${positions.group2.top * scaleY}px`,
                                    left: `${positions.group2.left * scaleX}px`,
                                    width: `${
                                      positions.group2.width * scaleX
                                    }px`,
                                    minHeight: `${
                                      positions.group2.lineSpacing * 7 * scaleY
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
                                    {subscriber.id +
                                      "/Exp:" +
                                      subscriber.expiryDate +
                                      "/" +
                                      subscriber.copies +
                                      "cps" +
                                      (subscriber.acode
                                        ? "/" + subscriber.acode
                                        : "")}
                                  </div>

                                  {/* Add personal name if it exists */}
                                  {subscriber.hasPersonalName && (
                                    <div
                                      style={{
                                        position: "absolute",
                                        top: `${
                                          positions.group2.lineSpacing * scaleY
                                        }px`,
                                        left: "0px",
                                        width: "100%",
                                      }}
                                    >
                                      {displayName}
                                    </div>
                                  )}

                                  {/* Add company if it exists (and wasn't already used as the name) */}
                                  {subscriber.hasCompany &&
                                    subscriber.hasPersonalName && (
                                      <div
                                        style={{
                                          position: "absolute",
                                          top: `${
                                            positions.group2.lineSpacing *
                                            2 *
                                            scaleY
                                          }px`,
                                          left: "0px",
                                          width: "100%",
                                        }}
                                      >
                                        {subscriber.company}
                                      </div>
                                    )}

                                  {/* Company being used as the name */}
                                  {subscriber.hasCompany &&
                                    !subscriber.hasPersonalName && (
                                      <div
                                        style={{
                                          position: "absolute",
                                          top: `${
                                            positions.group2.lineSpacing *
                                            scaleY
                                          }px`,
                                          left: "0px",
                                          width: "100%",
                                        }}
                                      >
                                        {subscriber.company}
                                      </div>
                                    )}

                                  {/* Address fields with adjusted positions */}
                                  {displayLines.map((line, index) => (
                                    <div
                                      key={`address-line-${index}`}
                                      style={{
                                        position: "absolute",
                                        top: `${
                                          (addressLinePositions[index].top -
                                            positions.group2.top) *
                                          scaleY
                                        }px`,
                                        left: "0px",
                                        width: "100%",
                                        whiteSpace: "pre-wrap",
                                      }}
                                    >
                                      {line}
                                    </div>
                                  ))}
                                </div>

                                {/* Group 3: Sucat Reminder Text - Moved outside Group 2 container */}
                                <div
                                  className="absolute bg-yellow-50 border border-yellow-200 p-2 text-sm font-mono"
                                  style={{
                                    top: `${positions.group3.top * scaleY}px`,
                                    left: `${positions.group3.left * scaleX}px`,
                                    width: `${
                                      positions.group3.width * scaleX
                                    }px`,
                                    minHeight: `${
                                      positions.group3.lineSpacing * 2 * scaleY
                                    }px`,
                                    fontFamily: positions.group3.fontFamily,
                                    fontSize: `${positions.group3.fontSize}px`,
                                    fontWeight: positions.group3.fontWeight,
                                  }}
                                >
                                  <div className="absolute text-xs text-yellow-500 font-mono -top-4 -left-1">
                                    Group 3
                                  </div>
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: "0px",
                                      left: "0px",
                                      width: "100%",
                                    }}
                                  >
                                    Sucat - {reminderMonth} {reminderYear}
                                  </div>
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: `${
                                        positions.group3.lineSpacing * scaleY
                                      }px`,
                                      left: "0px",
                                      width: "100%",
                                    }}
                                  >
                                    (Friendly Reminder - {locationType})
                                  </div>
                                </div>
                              </>
                            );
                          })()}

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
                                backgroundSize: `${650 / 8.5}px ${750 / 11}px`, // This makes grid lines at 1-inch intervals
                              }}
                            ></div>
                          </div>
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
                <h3 className="font-medium">Renewal Notice Preview</h3>
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
                  title="Renewal Notice Preview"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

export default RenewalNoticeDataOverlay;
