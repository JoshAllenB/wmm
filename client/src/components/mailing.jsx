import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import Modal from "./modal";
import { Button } from "./UI/ShadCN/button";
import { ScrollArea } from "./UI/ShadCN/scroll-area";
import axios from "axios";
import { useUser } from "../utils/Hooks/userProvider";
import { toast } from "react-hot-toast";

// Import components
import TemplateSelector from "./Mailing/TemplateSelector";
import TemplateSaver from "./Mailing/TemplateSaver";
import LabelPreview from "./Mailing/LabelPreview";
import RangeSelector from "./Mailing/RangeSelector";
import ConfigurationPanel from "./Mailing/ConfigurationPanel";
import CsvExport from "./Mailing/CsvExport";
import MailingActions from "./Mailing/MailingActions";
import RenewalNoticeDataOverlay from "./Mailing/RenewalNotice";
import ThankYouLetterDataOverlay from "./Mailing/ThankYouLetter";
import DocumentGenerator from "./Mailing/DocumentGenerator";
import RawPrinterControls from "./Mailing/RawPrinterControls";

// Import utility functions
import {
  generateChecklistHTML,
  generateCp850RawPrintContent,
  printWithJsPrintManager,
} from "./Mailing/PrintGenerator";

// Import print queue functions
import {
  createPrintQueue,
  listPrintQueues,
  getPrintQueue,
  enqueueSelectionToQueue,
  enqueueFilterToQueue,
  clearPrintQueue,
  checkPrintHistory,
  markQueuePrinted,
} from "./Table/Data/utilData.jsx";

// Helper functions

// Conversion functions
const mmToPx = (mm) => Math.round((mm * 96) / 25.4);
const pxToMm = (px) => Number(((px * 25.4) / 96).toFixed(2));

const Mailing = ({
  table,
  // id,
  // address,
  // acode,
  // zipcode,
  // lname,
  // fname,
  // mname,
  // contactnos,
  // cellno,
  // officeno,
  // copies,
  advancedFilterData = {},
  selectedGroup = "",
  filtering = "",
  isOpen = false,
  onClose,
  initialAction = "label",
  subscriptionType = "WMM", // Add subscription type with default value
  activeFilters = [],
}) => {
  const { hasRole } = useUser();

  // Determine user role
  const userRole = React.useMemo(() => {
    const roles = [];

    // Check for admin first
    if (hasRole("ADMIN")) {
      return "ADMIN";
    }

    // Add other roles
    if (hasRole("WMM")) roles.push("WMM");
    if (hasRole("HRG")) roles.push("HRG");
    if (hasRole("FOM")) roles.push("FOM");
    if (hasRole("CAL")) roles.push("CAL");
    if (hasRole("COMP")) roles.push("COMP");
    if (hasRole("PROMO")) roles.push("PROMO");

    return roles.length > 0 ? roles.join(" ") : "";
  }, [hasRole]);

  // State variables - using mm for dimensions and pt for font size
  const [modalOpen, setModalOpen] = useState(isOpen);
  const [leftPosition, setLeftPosition] = useState(1); // 4px in mm
  const [topPosition, setTopPosition] = useState(32); // 125px in mm
  const [columnWidth, setColumnWidth] = useState(95); // 330px in mm
  const [fontSize, setFontSize] = useState(12); // in points (pt)
  const [labelHeight, setLabelHeight] = useState(35); // 130px in mm
  const [horizontalSpacing, setHorizontalSpacing] = useState(13); // 60px in mm
  const [rowSpacing, setRowSpacing] = useState(90); // 63.5mm (about 2.5 inches)
  const [selectedFields, setSelectedFields] = useState([]); // Initialize with no contact field by default
  const [showInputs, setShowInputs] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startClientId, setStartClientId] = useState("");
  const [endClientId, setEndClientId] = useState("");
  const [startPosition, setStartPosition] = useState("left");
  const [afterSpecifiedStart, setAfterSpecifiedStart] = useState(false);

  // Add paper size state (default to US Letter)
  const [paperWidth, setPaperWidth] = useState(215.9); // 8.5" in mm
  const [paperHeight, setPaperHeight] = useState(279.4); // 11" in mm

  // Add page layout configuration
  const [rowsPerPage, setRowsPerPage] = useState(3);
  const [columnsPerPage, setColumnsPerPage] = useState(2);
  const [printerSettingsModalOpen, setPrinterSettingsModalOpen] =
    useState(false);
  const [savedPrinterJobData, setSavedPrinterJobData] = useState(null);

  // Data source selector for CSV export
  const [dataSource, setDataSource] = useState("all");

  // Inside the Mailing component, add state for the renewal notice modal
  const [renewalNoticeModalOpen, setRenewalNoticeModalOpen] = useState(false);
  // Add state for the thank you letter modal
  const [thankYouLetterModalOpen, setThankYouLetterModalOpen] = useState(false);

  // Renewal notice configuration
  const [renewalNoticeConfig, setRenewalNoticeConfig] = useState(null);
  const renewalNoticeRef = useRef(null);

  // Thank you letter configuration
  const [thankYouLetterConfig, setThankYouLetterConfig] = useState(null);
  const thankYouLetterRef = useRef(null);

  // Add new state for useFetchAll and allData
  const [isFetchingAll, setIsFetchingAll] = useState(false);
  const [allData, setAllData] = useState(null);
  const [useAllData, setUseAllData] = useState(false);

  // State variables for document generator and CSV export
  const [documentGeneratorOpen, setDocumentGeneratorOpen] = useState(false);
  const [csvExportOpen, setCsvExportOpen] = useState(false);

  // Add new state for loading indicators
  const [isLoadingAllRecords, setIsLoadingAllRecords] = useState(false);
  const [recordCounts, setRecordCounts] = useState(null);

  // Add state for raw printer controls
  const [showRawPrinterControls, setShowRawPrinterControls] = useState(false);

  // Add state for label adjustments from RawPrinterControls
  const [labelAdjustments, setLabelAdjustments] = useState({
    labelWidthIn: 3.5,
    topMargin: 4,
    rowSpacing: 14,
    col2X: 255,
  });

  // State for selected printer
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [isPrintModeModalOpen, setIsPrintModeModalOpen] = useState(false);

  // State for checklist title
  const [checklistTitle, setChecklistTitle] = useState("Mailing Checklist");
  const [showChecklistTitleInput, setShowChecklistTitleInput] = useState(false);

  // State for template operations triggers
  const [triggerTemplateUpdate, setTriggerTemplateUpdate] = useState(false);
  const [triggerTemplateDelete, setTriggerTemplateDelete] = useState(false);

  // Print queue state - simplified
  const [queueDuplicates, setQueueDuplicates] = useState([]);
  const [printedDuplicates, setPrintedDuplicates] = useState([]);
  const [printHistory, setPrintHistory] = useState({});
  const [showDuplicatePanel, setShowDuplicatePanel] = useState(false);
  const [queueLoading, setQueueLoading] = useState(false);
  const [currentQueueId, setCurrentQueueId] = useState("");
  const recheckTimerRef = useRef(null);
  const [excludedIds, setExcludedIds] = useState(new Set());

  // Callback to handle changes from RawPrinterControls
  const handleRawPrinterControlsChange = (changes) => {
    setLabelAdjustments(changes);
  };

  // Callback to handle printer selection changes
  const handlePrinterChange = (printerName) => {
    setSelectedPrinter(printerName);
  };

  // Function to handle opening document generator
  const handleOpenDocumentGenerator = async () => {
    setDocumentGeneratorOpen(true);
    if (!allData) {
      setIsLoadingAllRecords(true);
      try {
        const data = await fetchAllData();
        setAllData(data);
        setRecordCounts({
          total: data.length,
          filtered: data.length,
        });
      } catch (error) {
        console.error("Error fetching all data:", error);
        toast({
          title: "Error",
          description: "Failed to fetch all records. Using table data instead.",
          variant: "destructive",
        });
      }
      setIsLoadingAllRecords(false);
    }
  };

  // Function to handle opening CSV export
  const handleOpenCsvExport = async () => {
    setCsvExportOpen(true);
    if (!allData) {
      setIsLoadingAllRecords(true);
      try {
        const data = await fetchAllData();
        setAllData(data);
        setRecordCounts({
          total: data.length,
          filtered: data.length,
        });
      } catch (error) {
        console.error("Error fetching all data:", error);
        toast({
          title: "Error",
          description: "Failed to fetch all records. Using table data instead.",
          variant: "destructive",
        });
      }
      setIsLoadingAllRecords(false);
    }
  };

  // Get rows based on current selection
  const getAvailableRows = useCallback(() => {
    if (useAllData && allData) {
      return allData.map((item) => ({ original: item }));
    }

    if (!table || typeof table.getRowModel !== "function") {
      // If table is not ready but we have data, use it
      if (table?.options?.data && Array.isArray(table.options.data)) {
        return table.options.data.map((item) => ({ original: item }));
      }
      return [];
    }

    try {
      // First check if there are selected rows
      const selectedRows = table.getSelectedRowModel().rows;
      if (Array.isArray(selectedRows) && selectedRows.length > 0) {
        return selectedRows;
      }

      // If no rows selected, use all available rows from the current page
      const allRows = table.getRowModel().rows;
      return Array.isArray(allRows) ? allRows : [];
    } catch (error) {
      console.error("Error getting available rows:", error);
      // If there's an error but we have data, use it
      if (table?.options?.data && Array.isArray(table.options.data)) {
        return table.options.data.map((item) => ({ original: item }));
      }
      return [];
    }
  }, [table, useAllData, allData]);

  // Get available rows using useMemo to avoid initialization issues
  const availableRows = useMemo(() => getAvailableRows(), [getAvailableRows]);
  // Apply local exclusions (removed duplicates for this run) to form effective rows
  const effectiveRows = useMemo(() => {
    if (!excludedIds || excludedIds.size === 0) return availableRows;
    return availableRows.filter(
      (row) => !excludedIds.has(row?.original?.id?.toString())
    );
  }, [availableRows, excludedIds]);
  const hasAvailableRows = availableRows.length > 0;

  // Get row count based on selected dataSource
  const getRowCount = useCallback(() => {
    if (!table) return 0;

    if (dataSource === "all") {
      return table.getFilteredRowModel().rows.length;
    } else if (dataSource === "selected") {
      return table.getSelectedRowModel().rows.length;
    } else if (dataSource === "range") {
      // Count rows within the specified range
      return availableRows.filter((row) => {
        const clientId = row?.original?.id?.toString();
        if (!clientId) return false;

        const trimmedStartId = startClientId?.trim();
        const trimmedEndId = endClientId?.trim();
        const isAfterStart = trimmedStartId
          ? afterSpecifiedStart
            ? clientId > trimmedStartId
            : clientId >= trimmedStartId
          : true;
        const isBeforeEnd = trimmedEndId ? clientId <= trimmedEndId : true;
        return isAfterStart && isBeforeEnd;
      }).length;
    }
    return 0;
  }, [
    table,
    dataSource,
    availableRows,
    startClientId,
    endClientId,
    afterSpecifiedStart,
  ]);

  // Remove the automatic useEffect for ID range
  // Add function to set range from selection
  const setRangeFromSelection = () => {
    if (hasAvailableRows) {
      const firstId = availableRows[0]?.original?.id?.toString() || "";
      const lastId =
        availableRows[availableRows.length - 1]?.original?.id?.toString() || "";

      if (firstId && lastId) {
        const firstNum = parseInt(firstId, 10);
        const lastNum = parseInt(lastId, 10);
        if (!isNaN(firstNum) && !isNaN(lastNum)) {
          setStartClientId(Math.min(firstNum, lastNum).toString());
          setEndClientId(Math.max(firstNum, lastNum).toString());
        } else {
          if (firstId <= lastId) {
            setStartClientId(firstId);
            setEndClientId(lastId);
          } else {
            setStartClientId(lastId);
            setEndClientId(firstId);
          }
        }
      } else {
        setStartClientId(firstId || lastId);
        setEndClientId(lastId || firstId);
      }
    }
  };

  // Initialize empty range when modal opens
  useEffect(() => {
    if (modalOpen) {
      setStartClientId("");
      setEndClientId("");
      setExcludedIds(new Set()); // Reset exclusions for fresh start
    }
  }, [modalOpen]);

  // Update modal open state when isOpen prop changes
  useEffect(() => {
    setModalOpen(isOpen);
    // Reset exclusions when modal closes to allow fresh start next time
    if (!isOpen) {
      setExcludedIds(new Set());
    }
  }, [isOpen]);

  // Fetch templates on component mount
  useEffect(() => {
    fetchAllTemplates();
  }, []);

  // Auto-create queue and add data when modal opens with data
  useEffect(() => {
    if (modalOpen && hasAvailableRows && !currentQueueId) {
      autoEnqueueData();
    }
  }, [modalOpen, hasAvailableRows]);

  // Add effect to fetch all data when useFetchAll changes
  useEffect(() => {
    const fetchData = async () => {
      if (useAllData && !allData) {
        setIsFetchingAll(true);
        try {
          const data = await fetchAllData();
          setAllData(data);
        } catch (error) {
          console.error("Error fetching all data:", error);
          setUseAllData(false); // Revert to table data on error
          alert("Failed to fetch all data. Reverting to table data.");
        }
        setIsFetchingAll(false);
      }
    };

    fetchData();
  }, [useAllData]);

  // Add effect to refetch when filter changes
  useEffect(() => {
    if (useAllData) {
      setIsLoadingAllRecords(true);
      fetchAllData()
        .then((data) => {
          setAllData(data);
          setRecordCounts({
            total: data.length,
            filtered: data.length,
          });
        })
        .catch((error) => {
          console.error("Error fetching all data:", error);
          toast({
            title: "Error",
            description:
              "Failed to fetch all records. Using table data instead.",
            variant: "destructive",
          });
        })
        .finally(() => {
          setIsLoadingAllRecords(false);
        });
    }
  }, [filtering, selectedGroup, advancedFilterData, useAllData]);

  // New function to fetch all data with optimized batch processing
  const fetchAllData = async () => {
    try {
      const response = await axios.post(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/clients/fetchall`,
        {
          filter: filtering,
          group: selectedGroup,
          advancedFilterData: {
            ...advancedFilterData,
            subscriptionType, // Include subscription type for proper data fetching
          },
          batchSize: 1000, // Use optimized batch size
          enableBatchProcessing: true, // Enable batch processing
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
          timeout: 300000, // 5 minute timeout for large datasets
        }
      );

      if (response.data && response.data.combinedData) {
        return response.data.combinedData;
      }
      return [];
    } catch (error) {
      console.error("Error fetching all data:", error);

      // Provide more specific error messages
      if (error.code === "ECONNABORTED") {
        throw new Error(
          "Request timed out. The dataset may be too large. Try reducing the filter criteria."
        );
      } else if (error.response?.status === 500) {
        throw new Error(
          "Server error occurred while fetching data. Please try again."
        );
      } else if (error.response?.status === 401) {
        throw new Error("Authentication failed. Please log in again.");
      } else {
        throw new Error(`Failed to fetch data: ${error.message}`);
      }
    }
  };

  // Fetch templates by department
  const fetchAllTemplates = async () => {
    setIsLoading(true);
    try {
      // Determine fetch strategy based on roles
      const roleString = Array.isArray(userRole)
        ? userRole.join(" ")
        : userRole;
      const upperRoles = String(roleString || "").toUpperCase();
      const isAdmin = upperRoles.includes("ADMIN");
      const hasMultipleRoles = /[\s,\/|]+/.test(upperRoles.trim());

      // When admin or multiple roles, fetch all templates and filter client-side
      // Otherwise, fetch by the single department for efficiency
      const baseUrl = `http://${
        import.meta.env.VITE_IP_ADDRESS
      }:3001/util/templates`;
      const url =
        isAdmin || hasMultipleRoles
          ? baseUrl
          : `${baseUrl}?department=${encodeURIComponent(upperRoles)}`;

      const templatesResponse = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      const templatesData = templatesResponse.data;

      // Add the templates to state (filter to label/standard only)
      const validTemplates = (
        Array.isArray(templatesData) ? templatesData : []
      ).filter((t) => (t.previewType || "standard") === "standard");

      // If no templates were found, add a default template
      if (validTemplates.length === 0) {
        validTemplates.push({
          _id: "DEFAULT",
          name: "Default Template",
          description: "Default Mailing Label Template",
          department: upperRoles,
          layout: {
            fontSize: 12,
            leftPosition: 10,
            topPosition: 10,
            columnWidth: 300,
            labelHeight: 100,
            horizontalSpacing: 20,
            rowSpacing: 63.5,
            paperWidth: 215.9,
            paperHeight: 279.4,
            rowsPerPage: 3,
            columnsPerPage: 2,
            labelWidthIn: 3.5,
            topMargin: 4,
            rowSpacingLines: 14,
            col2X: 255,
          },
          selectedFields: [],
          previewType: "standard",
        });
      }

      setSavedTemplates(validTemplates);
    } catch (error) {
      console.error("Error in fetchAllTemplates:", error);

      // Add only a default template
      const roleString = Array.isArray(userRole)
        ? userRole.join(" ")
        : userRole;
      const upperRoles = String(roleString || "").toUpperCase();
      setSavedTemplates([
        {
          _id: "DEFAULT",
          name: "Default Template",
          description: "Default Mailing Label Template",
          department: upperRoles,
          layout: {
            fontSize: 12,
            leftPosition: 10,
            topPosition: 10,
            columnWidth: 300,
            labelHeight: 100,
            horizontalSpacing: 20,
            rowSpacing: 63.5,
            paperWidth: 215.9,
            paperHeight: 279.4,
            rowsPerPage: 3,
            columnsPerPage: 2,
            labelWidthIn: 3.5,
            topMargin: 4,
            rowSpacingLines: 14,
            col2X: 255,
          },
          selectedFields: [],
          previewType: "standard",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle template selection
  const handleTemplateSelect = (templateName) => {
    const selected = savedTemplates.find(
      (template) => template.name === templateName
    );

    if (selected) {
      // Set all layout settings from template
      setFontSize(selected.layout.fontSize || 12);
      setLeftPosition(selected.layout.leftPosition || 10);
      setTopPosition(selected.layout.topPosition || 10);
      setColumnWidth(selected.layout.columnWidth || 300);
      setLabelHeight(selected.layout.labelHeight || 100);
      setHorizontalSpacing(selected.layout.horizontalSpacing || 20);
      setRowSpacing(selected.layout.rowSpacing || 63.5);
      setSelectedFields(selected.selectedFields || []);

      // Set paper size
      setPaperWidth(selected.layout.paperWidth || 215.9);
      setPaperHeight(selected.layout.paperHeight || 279.4);

      // Set page layout
      setRowsPerPage(selected.layout.rowsPerPage || 3);
      setColumnsPerPage(selected.layout.columnsPerPage || 2);

      // Set raw printer controls configuration from template
      setLabelAdjustments({
        labelWidthIn: selected.layout.labelWidthIn ?? 3.5,
        topMargin: selected.layout.topMargin ?? 4,
        rowSpacing: selected.layout.rowSpacingLines ?? 14,
        col2X: selected.layout.col2X ?? 255,
      });

      // Note: We don't need to set selectedPrinter state anymore
      // The template's printer is passed directly to RawPrinterControls

      setSelectedTemplate(selected);
    }
  };

  // Handle template saved callback
  const handleTemplateSaved = (newTemplate) => {
    setSavedTemplates([...savedTemplates, newTemplate]);
  };

  // Handle template updated callback
  const handleTemplateUpdated = (updatedTemplate) => {
    setSavedTemplates((prevTemplates) =>
      prevTemplates.map((template) =>
        template._id === updatedTemplate._id ? updatedTemplate : template
      )
    );
    // Update selected template if it was the one updated
    if (selectedTemplate && selectedTemplate._id === updatedTemplate._id) {
      setSelectedTemplate(updatedTemplate);
    }
  };

  // Handle template deleted callback
  const handleTemplateDeleted = (deletedTemplateId) => {
    setSavedTemplates((prevTemplates) =>
      prevTemplates.filter((template) => template._id !== deletedTemplateId)
    );
    // Clear selected template if it was the one deleted
    if (selectedTemplate && selectedTemplate._id === deletedTemplateId) {
      setSelectedTemplate(null);
    }
  };

  // Check if data contains special characters that need CP850 encoding
  const checkForSpecialCharacters = (rows) => {
    const specialChars = [
      "Ñ",
      "ñ",
      "Á",
      "á",
      "É",
      "é",
      "Í",
      "í",
      "Ó",
      "ó",
      "Ú",
      "ú",
      "Ü",
      "ü",
      "¡",
      "¿",
    ];
    return rows.some((row) => {
      const data = row.original;
      const fullName = data.fname + " " + data.lname;
      const company = data.company || "";
      const address = data.address || "";
      const allText = fullName + company + address;
      return specialChars.some((char) => allText.includes(char));
    });
  };

  // Removed legacy HTML preview printing in favor of CP850/JSPM raw printing

  // Handle CP850-aware printing with JSPrintManager
  const handleCp850PrintWithRange = async (mode = "new") => {
    // Ensure JSPrintManager is connected before attempting to print
    const ensureJspmConnected = async (timeoutMs = 15000) => {
      if (!window.JSPM || !window.JSPM.JSPrintManager) return false;
      try {
        // Enable auto-reconnect and start if not already started
        window.JSPM.JSPrintManager.auto_reconnect = true;
        try {
          await window.JSPM.JSPrintManager.start();
        } catch (e) {
          // start() may throw if already started; ignore
        }

        const isOpen = () =>
          (window.JSPM.JSPrintManager.websocket_status ||
            window.JSPM.JSPrintManager.WS?.status) ===
          window.JSPM.WSStatus.Open;

        if (isOpen()) return true;

        // Wait until WS opens or timeout
        return await new Promise((resolve) => {
          let done = false;
          const timer = setTimeout(() => {
            if (!done) {
              done = true;
              resolve(false);
            }
          }, timeoutMs);

          const prevHandler = window.JSPM.JSPrintManager.WS
            ? window.JSPM.JSPrintManager.WS.onStatusChanged
            : null;

          if (window.JSPM.JSPrintManager.WS) {
            window.JSPM.JSPrintManager.WS.onStatusChanged = (s) => {
              if (s === window.JSPM.WSStatus.Open && !done) {
                done = true;
                clearTimeout(timer);
                // restore any previous handler
                window.JSPM.JSPrintManager.WS.onStatusChanged =
                  prevHandler || null;
                resolve(true);
              }
              // pass through to previous handler if it exists
              if (typeof prevHandler === "function") prevHandler(s);
            };
          } else {
            // No WS object exposed; resolve based on periodic check
            const interval = setInterval(() => {
              if (isOpen() && !done) {
                done = true;
                clearInterval(interval);
                clearTimeout(timer);
                resolve(true);
              }
            }, 200);
          }
        });
      } catch (err) {
        return false;
      }
    };

    let templateToUse = selectedTemplate;
    if (!templateToUse) {
      templateToUse = {
        name: "Default Template",
        layout: {
          fontSize,
          leftPosition: mmToPx(leftPosition),
          topPosition: mmToPx(topPosition),
          columnWidth: mmToPx(columnWidth),
          labelHeight: mmToPx(labelHeight),
          horizontalSpacing: mmToPx(horizontalSpacing),
        },
        selectedFields: selectedFields || [],
      };
    }

    // Determine which data to use - use effectiveRows (after duplicate removal)
    let rowsToUse = effectiveRows;
    if (useAllData) {
      try {
        const allData = await fetchAllData();
        const allDataRows = allData.map((item) => ({ original: item }));
        // Apply exclusions to all data as well
        rowsToUse = allDataRows.filter(
          (row) => !excludedIds.has(row?.original?.id?.toString())
        );
      } catch (error) {
        console.error("Error fetching all data:", error);
        toast({
          title: "Error",
          description:
            "Failed to fetch all records. Using available rows instead.",
          variant: "destructive",
        });
      }
    }

    // Always use JSPrintManager raw printing. Do not fall back to HTML preview here.
    try {
      // Guard: Ensure JSPrintManager is available and ready
      if (!window.JSPM || !window.JSPM.JSPrintManager) {
        toast({
          title: "JSPrintManager Not Available",
          description:
            "JSPrintManager client not detected or websocket not open.",
          variant: "destructive",
        });
        return;
      }

      // Try to establish the websocket connection if not yet open
      const connected = await ensureJspmConnected(15000);
      if (!connected) {
        toast({
          title: "Printer Not Ready",
          description:
            "Could not establish JSPrintManager WebSocket connection. Ensure the client app is running and allowed.",
          variant: "destructive",
        });
        return;
      }

      const rawCommands = generateCp850RawPrintContent(
        startClientId,
        endClientId,
        startPosition,
        rowsToUse,
        templateToUse,
        undefined, // leftPosition ignored by generator
        undefined, // topPosition ignored by generator
        undefined, // columnWidth ignored by generator
        undefined, // horizontalSpacing ignored by generator
        undefined, // rowSpacing ignored by generator
        undefined, // labelHeight ignored by generator
        templateToUse.selectedFields || selectedFields || [],
        userRole,
        subscriptionType,
        rowsPerPage,
        2, // Always use 2 columns for raw
        mode === "queue", // isPrintJobResumed when appending
        true, // useCp850Encoding
        labelAdjustments, // Pass label adjustments
        afterSpecifiedStart,
        mode === "queue" // appendToQueue
      );

      // Use printer from template if available, otherwise use selected printer
      const printerToUse =
        selectedTemplate?.selectedPrinter || selectedPrinter || "";

      await printWithJsPrintManager(
        rawCommands,
        printerToUse,
        !printerToUse, // useDefaultPrinter = true only if no printer selected
        {
          setStatus: (status) => {
            if (typeof status === "string" && status.includes("Error:")) {
              toast({
                title: "Print Error",
                description: status,
                variant: "destructive",
              });
            }
          },
          setPrintJobStatus: (status) => {
            if (status === "failed" || status === "error") {
              toast({
                title: "Print Job Failed",
                description: "Check console for detailed error information",
                variant: "destructive",
              });
            }
          },
          addPrinterEvent: (event, data) => {
            if (data?.error) console.error("Printer error details:", data);
          },
        }
      );
      // On successful send to printer, record printed IDs
      try {
        const clientIds = rowsToUse
          .map((r) => r.original.id?.toString())
          .filter(Boolean);
        if (currentQueueId && clientIds.length > 0) {
          await markQueuePrinted(currentQueueId, {
            clientIds,
            jobId: undefined,
            printerName: printerToUse || undefined,
            templateRefId: selectedTemplate?._id || undefined,
            actionType: currentAction || "label",
          });
        }
      } catch (recordErr) {
        console.error("Failed to record printed items:", recordErr);
      }
      toast({
        title: "Print Job Completed",
        description: "Raw printing completed successfully!",
      });
    } catch (error) {
      console.error("Raw print error:", error);
      let errorMessage = error.message;
      if (error.message?.includes("timeout")) {
        errorMessage =
          "Print job timed out. Check printer is ready, queue is clear, and driver works.";
      }
      toast({
        title: "Print Error",
        description: errorMessage,
        variant: "destructive",
      });
      // Do not fallback to HTML preview here to avoid unintended generatePrintHTML calls
      return;
    }
  };

  // Execute print job
  const executePrintJob = async () => {
    if (!savedPrinterJobData) {
      alert("No print job data available");
      return;
    }

    setIsLoading(true);

    try {
      // Send the data to the backend for printing
      const response = await axios.post(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/print-dot-matrix`,
        {
          ...savedPrinterJobData,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Close the printer settings modal
      setPrinterSettingsModalOpen(false);

      // Check if successful
      if (response.data.success) {
        alert(`Success! ${response.data.message}`);
      } else {
        alert(`Printing failed: ${response.data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error sending print job to printer:", error);
      alert(
        `Error: ${
          error.response?.data?.error ||
          error.message ||
          "Failed to send print job"
        }`
      );
    } finally {
      setIsLoading(false);
      setSavedPrinterJobData(null);
    }
  };

  // Helper function to extract date from filter data
  const getFilterDate = () => {
    if (!advancedFilterData) return null;

    // Check specifically for Date Encoded/Added date range
    // These are the only date fields that represent when records were added/encoded
    const {
      startDateMonth,
      startDateDay,
      startDateYear,
      endDateMonth,
      endDateDay,
      endDateYear,
    } = advancedFilterData;

    // Only use these specific date fields (Date Encoded/Added range)
    // NOT the subscription active/expiry dates (wmmActiveFromMonth, wmmExpiringFromMonth, etc.)

    // If we have a start date, use it
    if (startDateMonth && startDateDay && startDateYear) {
      const month = String(startDateMonth).padStart(2, "0");
      const day = String(startDateDay).padStart(2, "0");
      const year = String(startDateYear);
      return `${year}-${month}-${day}`;
    }

    // If we have an end date, use it
    if (endDateMonth && endDateDay && endDateYear) {
      const month = String(endDateMonth).padStart(2, "0");
      const day = String(endDateDay).padStart(2, "0");
      const year = String(endDateYear);
      return `${year}-${month}-${day}`;
    }

    return null;
  };

  // Show checklist title input
  const handlePrintChecklist = () => {
    setShowChecklistTitleInput(true);
  };

  // Actually print the checklist
  const executePrintChecklist = () => {
    const filteredColumns = table
      .getAllColumns()
      .filter(
        (column) => column.id !== "addedBy" && column.id !== "Added Info"
      );

    // Get the filter date or use current date
    const filterDate = getFilterDate();

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(
        generateChecklistHTML(
          filteredColumns,
          effectiveRows,
          checklistTitle,
          filterDate,
          activeFilters
        )
      );
      printWindow.document.close();
    } else {
      alert(
        "Could not open print window. Please check your pop-up blocker settings."
      );
    }

    // Hide the input after printing
    setShowChecklistTitleInput(false);
  };

  // Cancel checklist printing
  const cancelPrintChecklist = () => {
    setShowChecklistTitleInput(false);
  };

  // Toggle modal visibilities
  const toggleModal = async () => {
    setModalOpen(!modalOpen);
    if (!modalOpen && !allData) {
      setIsLoadingAllRecords(true);
      try {
        const data = await fetchAllData();
        setAllData(data);
        setRecordCounts({
          total: data.length,
          filtered: data.length,
        });
      } catch (error) {
        console.error("Error fetching all data:", error);
        toast({
          title: "Error",
          description: "Failed to fetch all records. Using table data instead.",
          variant: "destructive",
        });
      }
      setIsLoadingAllRecords(false);
    }
  };
  const closeModal = () => setModalOpen(false);
  const toggleShowInputs = () => setShowInputs(!showInputs);

  // Handle import completion
  const handleImportComplete = (results) => {
    if (results && results.success + results.updated > 0) {
      // Optionally refresh data or show notification
      alert(
        `Successfully imported/updated ${
          results.success + results.updated
        } subscribers.`
      );
    }
  };

  // Function to update renewal notice positions from shared config
  const updateRenewalNoticePositions = (positions) => {
    setRenewalNoticeConfig((prev) => ({
      ...prev,
      positions: positions,
    }));
  };

  // Function to sync configurations
  const syncConfigToRenewalNotice = () => {
    if (renewalNoticeRef.current) {
      const currentPositions = renewalNoticeRef.current.getPositions();
      setRenewalNoticeConfig({
        positions: currentPositions,
        updatePositions: updateRenewalNoticePositions,
      });
    }
  };

  // Function to preview renewal notice in the mailing modal
  const previewRenewalNotice = () => {
    if (renewalNoticeRef.current) {
      // First sync the config if needed
      syncConfigToRenewalNotice();

      // Generate the preview using the component's method
      renewalNoticeRef.current.generatePreview();
    } else {
      // If the ref isn't available, open the modal to create it
      setRenewalNoticeModalOpen(true);
    }
  };

  // Function to update thank you letter positions from shared config
  const updateThankYouLetterPositions = (positions) => {
    setThankYouLetterConfig((prev) => ({
      ...prev,
      positions: positions,
    }));
  };

  // Function to sync configurations for thank you letter
  const syncConfigToThankYouLetter = () => {
    if (thankYouLetterRef.current) {
      const currentPositions = thankYouLetterRef.current.getPositions();
      setThankYouLetterConfig({
        positions: currentPositions,
        updatePositions: updateThankYouLetterPositions,
      });
    }
  };

  // Function to preview thank you letter in the mailing modal
  const previewThankYouLetter = () => {
    if (thankYouLetterRef.current) {
      // First sync the config if needed
      syncConfigToThankYouLetter();

      // Generate the preview using the component's method
      thankYouLetterRef.current.generatePreview();
    } else {
      // If the ref isn't available, open the modal to create it
      setThankYouLetterModalOpen(true);
    }
  };

  // Add refresh function with processing info
  const refreshAllData = async () => {
    try {
      const response = await axios.post(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/clients/fetchall`,
        {
          filter: filtering,
          group: selectedGroup,
          advancedFilterData: {
            ...advancedFilterData,
            subscriptionType, // Include subscription type for proper data fetching
          },
          batchSize: 1000, // Use optimized batch size
          enableBatchProcessing: true, // Enable batch processing
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
          timeout: 300000, // 5 minute timeout for large datasets
        }
      );

      if (response.data && response.data.combinedData) {
        const data = response.data.combinedData;
        setAllData(data);
        setRecordCounts({
          total: data.length,
          filtered: data.length,
        });

        // Return both data and processing info
        return {
          data,
          processingInfo: response.data.processingInfo,
        };
      }

      const emptyData = [];
      setAllData(emptyData);
      setRecordCounts({
        total: 0,
        filtered: 0,
      });
      return { data: emptyData, processingInfo: null };
    } catch (error) {
      console.error("Error fetching all data:", error);

      // Provide more specific error messages
      let errorMessage =
        "Failed to fetch all records. Using table data instead.";
      if (error.code === "ECONNABORTED") {
        errorMessage =
          "Request timed out. The dataset may be too large. Try reducing the filter criteria.";
      } else if (error.response?.status === 500) {
        errorMessage =
          "Server error occurred while fetching data. Please try again.";
      } else if (error.response?.status === 401) {
        errorMessage = "Authentication failed. Please log in again.";
      } else {
        errorMessage = `Failed to fetch data: ${error.message}`;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Update parent component when modal closes
  const handleClose = () => {
    setModalOpen(false);
    if (onClose) {
      onClose();
    }
  };

  // Simplified automated print queue functions
  const createAutoQueue = async () => {
    if (currentQueueId) return currentQueueId;

    try {
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const queue = await createPrintQueue({
        name: `Mailing-${currentAction}-${timestamp}`,
        actionType: currentAction,
        department: userRole,
      });
      setCurrentQueueId(queue._id);
      return queue._id;
    } catch (error) {
      console.error("Error creating auto queue:", error);
      toast({
        title: "Error",
        description: "Failed to create print queue",
        variant: "destructive",
      });
      return null;
    }
  };

  const autoEnqueueData = async () => {
    // Ensure we have a valid queue ID and use it locally to avoid race conditions
    let queueId = currentQueueId;
    if (!queueId) {
      queueId = await createAutoQueue();
      if (!queueId) return;
    }

    setQueueLoading(true);
    try {
      const clientIds = availableRows.map((row) => row.original.id.toString());

      // Check both queue duplicates and print history
      const [queueResult, historyResult] = await Promise.all([
        enqueueSelectionToQueue(queueId, clientIds),
        checkPrintHistory(clientIds),
      ]);

      // Check for queue duplicates
      const queueDuplicates = queueResult.duplicatesSample || [];
      const hasQueueDuplicates = queueResult.alreadyInQueueCount > 0;

      // Check for previously printed items
      const printedDuplicates = historyResult.printedIds || [];
      const hasPrintedDuplicates = historyResult.totalPrinted > 0;

      // Show duplicate panel if any duplicates found
      if (hasQueueDuplicates || hasPrintedDuplicates) {
        setQueueDuplicates(queueDuplicates);
        setPrintedDuplicates(printedDuplicates);
        setPrintHistory(historyResult.printHistory || {});
        setShowDuplicatePanel(true);

        let message = "";
        if (hasQueueDuplicates && hasPrintedDuplicates) {
          message = `${queueResult.alreadyInQueueCount} items already in queue, ${historyResult.totalPrinted} items already printed. Review duplicates below.`;
        } else if (hasQueueDuplicates) {
          message = `${queueResult.alreadyInQueueCount} items already in queue. Review duplicates below.`;
        } else if (hasPrintedDuplicates) {
          message = `${historyResult.totalPrinted} items already printed. Review duplicates below.`;
        }

        toast({
          title: "Duplicates Found",
          description: message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error auto-enqueuing:", error);
      toast({
        title: "Error",
        description: "Failed to add items to queue",
        variant: "destructive",
      });
    } finally {
      setQueueLoading(false);
    }
  };

  // Debounced recheck of duplicates when the current selection changes
  const recheckDuplicates = useCallback(async () => {
    if (!modalOpen || !currentQueueId) return;
    if (effectiveRows.length === 0) {
      setShowDuplicatePanel(false);
      setQueueDuplicates([]);
      setPrintedDuplicates([]);
      setPrintHistory({});
      return;
    }

    setQueueLoading(true);
    try {
      const clientIds = effectiveRows.map((row) => row.original.id.toString());
      const [queueResult, historyResult] = await Promise.all([
        enqueueSelectionToQueue(currentQueueId, clientIds),
        checkPrintHistory(clientIds),
      ]);

      const queueDuplicatesLocal = queueResult.duplicatesSample || [];
      const hasQueueDuplicatesLocal = queueResult.alreadyInQueueCount > 0;

      const printedDuplicatesLocal = historyResult.printedIds || [];
      const hasPrintedDuplicatesLocal = historyResult.totalPrinted > 0;

      if (hasQueueDuplicatesLocal || hasPrintedDuplicatesLocal) {
        setQueueDuplicates(queueDuplicatesLocal);
        setPrintedDuplicates(printedDuplicatesLocal);
        setPrintHistory(historyResult.printHistory || {});
        setShowDuplicatePanel(true);
      } else {
        setShowDuplicatePanel(false);
        setQueueDuplicates([]);
        setPrintedDuplicates([]);
        setPrintHistory({});
      }
    } catch (error) {
      console.error("Error rechecking duplicates:", error);
    } finally {
      setQueueLoading(false);
    }
  }, [modalOpen, currentQueueId, effectiveRows]);

  // Watch selection-related inputs and recheck duplicates with debounce
  useEffect(() => {
    if (!modalOpen || !currentQueueId) return;
    if (recheckTimerRef.current) clearTimeout(recheckTimerRef.current);
    recheckTimerRef.current = setTimeout(() => {
      recheckDuplicates();
    }, 400);
    return () => {
      if (recheckTimerRef.current) clearTimeout(recheckTimerRef.current);
    };
  }, [
    modalOpen,
    currentQueueId,
    availableRows,
    effectiveRows,
    startClientId,
    endClientId,
    dataSource,
    useAllData,
    recheckDuplicates,
  ]);

  const removeDuplicatesFromMailing = () => {
    // Exclude both queue duplicates and previously printed items for this run
    const allDuplicateIds = new Set([
      ...queueDuplicates.map((x) => x.toString()),
      ...printedDuplicates.map((x) => x.toString()),
    ]);
    const next = new Set(excludedIds);
    allDuplicateIds.forEach((id) => next.add(id));
    setExcludedIds(next);

    const totalRemoved = allDuplicateIds.size;
    toast({
      title: "Duplicates Removed",
      description: `Removed ${totalRemoved} duplicate items from this print run`,
    });

    setShowDuplicatePanel(false);
    setQueueDuplicates([]);
    setPrintedDuplicates([]);
    setPrintHistory({});
    // Recheck with the new effective set to keep UI accurate
    recheckDuplicates();
  };

  const keepDuplicatesInQueue = () => {
    // Just hide the duplicate panel - duplicates stay in queue
    setShowDuplicatePanel(false);
    setQueueDuplicates([]);
    setPrintedDuplicates([]);
    setPrintHistory({});
    toast({
      title: "Duplicates Kept",
      description: "Duplicate items will be printed",
    });
  };

  const removeOnlyPrintedDuplicates = () => {
    // Exclude only the previously printed IDs for this run
    const next = new Set(excludedIds);
    printedDuplicates.forEach((id) => next.add(id.toString()));
    setExcludedIds(next);

    toast({
      title: "Printed Duplicates Removed",
      description: `Removed ${printedDuplicates.length} previously printed items from this print run`,
    });

    setPrintedDuplicates([]);
    if (queueDuplicates.length === 0) {
      setShowDuplicatePanel(false);
      setPrintHistory({});
    }
    recheckDuplicates();
  };

  const [currentAction, setCurrentAction] = useState(initialAction);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);

  // Update currentAction when initialAction changes
  useEffect(() => {
    setCurrentAction(initialAction);
    // Show appropriate modal based on action
    if (initialAction === "document") {
      setShowDocumentModal(true);
    } else if (initialAction === "csv") {
      setShowCsvModal(true);
    }
  }, [initialAction]);

  // Reset template operation triggers after they've been used
  useEffect(() => {
    if (triggerTemplateUpdate) {
      setTriggerTemplateUpdate(false);
    }
  }, [triggerTemplateUpdate]);

  useEffect(() => {
    if (triggerTemplateDelete) {
      setTriggerTemplateDelete(false);
    }
  }, [triggerTemplateDelete]);

  // Function to render content based on current action
  const renderContent = () => {
    switch (currentAction) {
      case "document":
        return (
          <DocumentGenerator
            startClientId={startClientId}
            endClientId={endClientId}
            availableRows={availableRows}
            allData={allData}
            useAllData={useAllData}
            setUseAllData={setUseAllData}
            onRefreshAllData={refreshAllData}
          />
        );
      case "csv":
        return (
          <CsvExport
            selectedRows={availableRows}
            dataSource={dataSource}
            startClientId={startClientId}
            endClientId={endClientId}
            setDataSource={setDataSource}
            setStartClientId={setStartClientId}
            setEndClientId={setEndClientId}
            getRowCount={getRowCount}
            table={table}
            allData={allData}
            useAllData={useAllData}
            setUseAllData={setUseAllData}
            onRefreshAllData={refreshAllData}
            subscriptionType={subscriptionType}
          />
        );
      case "label":
      default:
        return (
          <>
            <h2 className="flex justify-center text-xl font-bold text-black mb-4">
              Mailing Label Options
            </h2>

            <div className="flex w-full gap-6">
              {/* Left Panel - Configuration Controls */}
              <div className="w-[550px] flex-shrink-0">
                <div className="h-fullborder rounded-lg p-4 shadow-sm">
                  {/* Standardized Data Source Toggle */}
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex flex-col">
                      <h4 className="font-medium text-gray-700 mb-2">
                        Data Source
                      </h4>
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={() => setUseAllData(false)}
                          size="sm"
                          variant={useAllData ? "outline" : "default"}
                          className={`flex-1 ${
                            !useAllData ? "bg-blue-600 text-white" : ""
                          }`}
                        >
                          Selected ({availableRows.length})
                        </Button>
                        <Button
                          onClick={async () => {
                            setUseAllData(true);
                            setIsLoadingAllRecords(true);
                            try {
                              const data = await fetchAllData();
                              setAllData(data);
                              setRecordCounts({
                                total: data.length,
                                filtered: data.length,
                              });
                            } catch (error) {
                              console.error("Error fetching all data:", error);
                              toast({
                                title: "Error",
                                description:
                                  "Failed to fetch all records. Using table data instead.",
                                variant: "destructive",
                              });
                            } finally {
                              setIsLoadingAllRecords(false);
                            }
                          }}
                          size="sm"
                          variant={useAllData ? "default" : "outline"}
                          className={`flex-1 ${
                            useAllData ? "bg-blue-600 text-white" : ""
                          }`}
                        >
                          {isLoadingAllRecords ? (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Loading...</span>
                            </div>
                          ) : (
                            `All Records (${
                              recordCounts?.total || allData?.length || 0
                            })`
                          )}
                        </Button>
                      </div>
                      {isLoadingAllRecords && (
                        <p className="text-xs mt-2 text-blue-700">
                          Fetching all records...
                        </p>
                      )}
                      {recordCounts && !isLoadingAllRecords && (
                        <p className="text-xs mt-2 text-blue-700">
                          {recordCounts.total} total records available
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Configuration Toggle and Checklist Button */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    <Button
                      onClick={toggleShowInputs}
                      variant="outline"
                      className="w-full"
                    >
                      {showInputs
                        ? currentAction === "label"
                          ? "Hide Raw Printer Config"
                          : "Hide Configuration"
                        : currentAction === "label"
                        ? "Show Raw Printer Config"
                        : "Show Configuration"}
                    </Button>
                    <Button
                      onClick={handlePrintChecklist}
                      variant="outline"
                      disabled={!hasAvailableRows || isLoading}
                      className="w-full"
                    >
                      Print Checklist
                    </Button>
                  </div>

                  {/* Checklist Title Input - Only show when printing checklist */}
                  {showChecklistTitleInput && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Checklist Title
                      </label>
                      <input
                        type="text"
                        value={checklistTitle}
                        onChange={(e) => setChecklistTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                        placeholder="Enter checklist title..."
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={executePrintChecklist}
                          size="sm"
                          className="bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Print Checklist
                        </Button>
                        <Button
                          onClick={cancelPrintChecklist}
                          size="sm"
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Duplicate Handling Panel - Only show when duplicates detected */}
                  {showDuplicatePanel &&
                    (queueDuplicates.length > 0 ||
                      printedDuplicates.length > 0) && (
                      <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <h4 className="font-medium mb-3 text-yellow-800">
                          Duplicate Items Found
                        </h4>
                        <p className="text-sm text-yellow-700 mb-3">
                          {queueDuplicates.length > 0 &&
                          printedDuplicates.length > 0
                            ? `${queueDuplicates.length} items already in queue, ${printedDuplicates.length} items already printed.`
                            : queueDuplicates.length > 0
                            ? `${queueDuplicates.length} items already in queue.`
                            : `${printedDuplicates.length} items already printed.`}{" "}
                          Choose how to handle these duplicates:
                        </p>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          {/* Queue Duplicates */}
                          {queueDuplicates.length > 0 && (
                            <div className="p-3 bg-white rounded border text-sm">
                              <div className="font-medium mb-2 text-blue-700">
                                Already in Queue ({queueDuplicates.length}):
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {queueDuplicates
                                  .slice(0, 15)
                                  .map((id, index) => (
                                    <span
                                      key={index}
                                      className="px-2 py-1 bg-blue-100 rounded text-xs"
                                    >
                                      {id}
                                    </span>
                                  ))}
                                {queueDuplicates.length > 15 && (
                                  <span className="px-2 py-1 bg-blue-100 rounded text-xs">
                                    +{queueDuplicates.length - 15} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Previously Printed Duplicates */}
                          {printedDuplicates.length > 0 && (
                            <div className="p-3 bg-white rounded border text-sm">
                              <div className="font-medium mb-2 text-red-700">
                                Already Printed ({printedDuplicates.length}):
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {printedDuplicates
                                  .slice(0, 15)
                                  .map((id, index) => {
                                    const history = printHistory[id];
                                    return (
                                      <span
                                        key={index}
                                        className="px-2 py-1 bg-red-100 rounded text-xs"
                                        title={
                                          history
                                            ? `Last printed: ${new Date(
                                                history.lastPrinted
                                              ).toLocaleString()}`
                                            : ""
                                        }
                                      >
                                        {id}
                                      </span>
                                    );
                                  })}
                                {printedDuplicates.length > 15 && (
                                  <span className="px-2 py-1 bg-red-100 rounded text-xs">
                                    +{printedDuplicates.length - 15} more
                                  </span>
                                )}
                              </div>
                              {printedDuplicates.length > 0 && (
                                <div className="mt-2 text-xs text-gray-600">
                                  Last printed:{" "}
                                  {new Date(
                                    printHistory[
                                      printedDuplicates[0]
                                    ]?.lastPrinted
                                  ).toLocaleString() || "Unknown"}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Button
                              onClick={removeDuplicatesFromMailing}
                              size="sm"
                              className="bg-red-600 text-white hover:bg-red-700"
                              title="Removes both queue duplicates and previously printed IDs from this run"
                            >
                              Remove All Duplicates
                            </Button>
                            <Button
                              onClick={keepDuplicatesInQueue}
                              size="sm"
                              variant="outline"
                              className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                              title="Keeps all items, including duplicates, and proceeds to print"
                            >
                              Print All (Including Duplicates)
                            </Button>
                          </div>

                          {printedDuplicates.length > 0 && (
                            <Button
                              onClick={removeOnlyPrintedDuplicates}
                              size="sm"
                              variant="outline"
                              className="w-full mt-2 text-red-700 border-red-300 hover:bg-red-50"
                              title="Removes only IDs with prior print history; keeps items already in this queue"
                            >
                              Remove Only Previously Printed Items
                            </Button>
                          )}

                          {excludedIds.size > 0 && (
                            <Button
                              onClick={() => {
                                setExcludedIds(new Set());
                                setShowDuplicatePanel(false);
                                setQueueDuplicates([]);
                                setPrintedDuplicates([]);
                                setPrintHistory({});
                                toast({
                                  title: "Exclusions Reset",
                                  description:
                                    "All duplicate exclusions have been cleared. You can now re-run duplicate detection.",
                                });
                              }}
                              size="sm"
                              variant="outline"
                              className="w-full mt-2 text-blue-700 border-blue-300 hover:bg-blue-50"
                              title="Clears all duplicate exclusions and allows re-running duplicate detection"
                            >
                              Reset Exclusions & Re-check
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                  {/* Configuration Panel - Show different configs based on action */}
                  {showInputs && (
                    <div className="mb-6">
                      {currentAction === "label" ? (
                        // For label mode: Show RawPrinterControls configuration
                        <div>
                          <h4 className="font-medium mb-3 text-gray-800">
                            Raw Printer Configuration
                          </h4>
                          <RawPrinterControls
                            startClientId={startClientId}
                            endClientId={endClientId}
                            startPosition={startPosition}
                            rows={effectiveRows}
                            selectedFields={selectedFields}
                            userRole={userRole}
                            subscriptionType={subscriptionType}
                            rowsPerPage={rowsPerPage}
                            columnsPerPage={columnsPerPage}
                            labelAdjustments={labelAdjustments}
                            setLabelAdjustments={setLabelAdjustments}
                            onPositionChange={handleRawPrinterControlsChange}
                            setSelectedFields={setSelectedFields}
                            onPrinterChange={handlePrinterChange}
                            selectedPrinter={
                              selectedTemplate?.selectedPrinter ||
                              selectedPrinter
                            }
                          />
                        </div>
                      ) : (
                        // For document mode: Show existing ConfigurationPanel
                        <ConfigurationPanel
                          fontSize={fontSize}
                          setFontSize={setFontSize}
                          columnWidth={columnWidth}
                          setColumnWidth={setColumnWidth}
                          leftPosition={leftPosition}
                          setLeftPosition={setLeftPosition}
                          topPosition={topPosition}
                          setTopPosition={setTopPosition}
                          labelHeight={labelHeight}
                          setLabelHeight={setLabelHeight}
                          horizontalSpacing={horizontalSpacing}
                          setHorizontalSpacing={setHorizontalSpacing}
                          rowSpacing={rowSpacing}
                          setRowSpacing={setRowSpacing}
                          selectedFields={selectedFields}
                          setSelectedFields={setSelectedFields}
                          paperWidth={paperWidth}
                          setPaperWidth={setPaperWidth}
                          paperHeight={paperHeight}
                          setPaperHeight={setPaperHeight}
                          rowsPerPage={rowsPerPage}
                          setRowsPerPage={setRowsPerPage}
                          columnsPerPage={columnsPerPage}
                          setColumnsPerPage={setColumnsPerPage}
                        />
                      )}
                    </div>
                  )}

                  {/* Template Saver */}
                  <div className="mb-6">
                    <TemplateSaver
                      fontSize={fontSize}
                      columnWidth={columnWidth}
                      leftPosition={leftPosition}
                      topPosition={topPosition}
                      labelHeight={labelHeight}
                      horizontalSpacing={horizontalSpacing}
                      rowSpacing={rowSpacing}
                      selectedFields={selectedFields}
                      paperWidth={paperWidth}
                      paperHeight={paperHeight}
                      rowsPerPage={rowsPerPage}
                      columnsPerPage={columnsPerPage}
                      labelAdjustments={labelAdjustments}
                      userRole={userRole}
                      selectedPrinter={selectedPrinter}
                      selectedTemplate={selectedTemplate}
                      savedTemplates={savedTemplates}
                      onTemplateSaved={handleTemplateSaved}
                      onTemplateUpdated={handleTemplateUpdated}
                      onTemplateDeleted={handleTemplateDeleted}
                      triggerUpdate={triggerTemplateUpdate}
                      triggerDelete={triggerTemplateDelete}
                      showInputs={showInputs}
                    />
                  </div>

                  {/* Configuration Panel with Thank You Letter options - Only for document mode */}
                  {showInputs && currentAction !== "label" && (
                    <div className="mb-6 border rounded p-3 bg-blue-50">
                      <h4 className="font-medium mb-2">Form Integration</h4>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          onClick={syncConfigToRenewalNotice}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          Sync Renewal Notice
                        </Button>
                        <Button
                          onClick={previewRenewalNotice}
                          variant="outline"
                          size="sm"
                          className="text-xs bg-white"
                        >
                          Preview Renewal Notice
                        </Button>
                        <Button
                          onClick={syncConfigToThankYouLetter}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          Sync Thank You Letter
                        </Button>
                        <Button
                          onClick={previewThankYouLetter}
                          variant="outline"
                          size="sm"
                          className="text-xs bg-white"
                        >
                          Preview Thank You Letter
                        </Button>
                      </div>
                      <p className="text-xs mt-2 text-blue-700">
                        Use these options to configure form overlays from this
                        interface
                      </p>
                    </div>
                  )}

                  {/* Template Selector */}
                  <div className="mb-6">
                    <TemplateSelector
                      selectedTemplate={selectedTemplate}
                      savedTemplates={savedTemplates}
                      isLoading={isLoading}
                      onTemplateSelect={handleTemplateSelect}
                      userRole={userRole}
                    />
                  </div>

                  {/* Range Selector */}
                  <div className="mb-6">
                    <RangeSelector
                      startClientId={startClientId}
                      setStartClientId={setStartClientId}
                      endClientId={endClientId}
                      setEndClientId={setEndClientId}
                      afterSpecifiedStart={afterSpecifiedStart}
                      setAfterSpecifiedStart={setAfterSpecifiedStart}
                      startPosition={startPosition}
                      setStartPosition={setStartPosition}
                      availableRows={effectiveRows}
                      onSetFromSelection={setRangeFromSelection}
                      showStartPosition={true}
                    />
                  </div>
                </div>
              </div>

              {/* Right Panel - Preview */}
              <div className="flex-grow">
                <div className="border rounded-lg p-6 bg-white shadow-sm h-full">
                  <h3 className="text-center font-semibold mb-4">
                    Label Preview
                  </h3>
                  <div className="flex flex-col">
                    {/* Preview Area */}
                    <div className="flex-grow flex items-center justify-center">
                      <LabelPreview
                        isLoading={isLoading}
                        selectedTemplate={selectedTemplate}
                        hasAvailableRows={effectiveRows.length > 0}
                        availableRows={effectiveRows}
                        fontSize={fontSize}
                        columnWidth={columnWidth}
                        horizontalSpacing={horizontalSpacing}
                        labelHeight={labelHeight}
                        selectedFields={selectedFields}
                        startPosition={startPosition}
                        rowSpacing={rowSpacing}
                        topPosition={topPosition}
                        leftPosition={leftPosition}
                        userRole={userRole}
                        paperWidth={paperWidth}
                        paperHeight={paperHeight}
                        rowsPerPage={rowsPerPage}
                        columnsPerPage={columnsPerPage}
                        subscriptionType={subscriptionType}
                      />
                    </div>

                    {/* Preview Info */}
                    <div className="text-sm text-gray-600 mt-4 text-center">
                      <p>Real-time preview of how labels will print</p>
                      <p className="text-xs">
                        Layout dimensions: {Math.max(columnWidth * 2, 200)}px ×{" "}
                        {Math.max(labelHeight * 2, 100)}px
                      </p>
                      {selectedTemplate?.selectedPrinter && (
                        <p className="text-xs text-blue-600 mt-2">
                          📄 Template printer:{" "}
                          <strong>{selectedTemplate.selectedPrinter}</strong>
                        </p>
                      )}
                      {effectiveRows.length > 0 && currentQueueId && (
                        <p className="text-xs text-green-600 mt-2">
                          ✓ {effectiveRows.length} items automatically added to
                          print queue
                          {excludedIds.size > 0 && (
                            <span className="text-orange-600 ml-1">
                              ({excludedIds.size} duplicates excluded)
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Mailing Actions */}
                    <div className="mt-6 flex justify-center">
                      <div className="w-full max-w-lg">
                        <MailingActions
                          isLoading={isLoading}
                          hasAvailableRows={effectiveRows.length > 0}
                          selectedTemplate={selectedTemplate}
                          onPrintPreview={() => setIsPrintModeModalOpen(true)}
                          queueLoading={queueLoading}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  if (!table) return null;

  return (
    <div>
      {/* Main Mailing Modal - only show for label printing */}
      <Modal isOpen={isOpen && currentAction === "label"} onClose={handleClose}>
        <div className="w-full max-w-[98vw] min-w-[1200px]">
          {renderContent()}
        </div>
      </Modal>

      {/* Print Mode Modal moved from RawPrinterControls */}
      {isPrintModeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsPrintModeModalOpen(false)}
          />
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-sm p-4">
            <h6 className="text-sm font-semibold text-gray-800 mb-2">
              Choose Print Mode
            </h6>
            <p className="text-xs text-gray-600 mb-4">
              New Print starts at the top margin on a new sheet. Add to Queue
              continues on the current sheet with proper spacing.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                onClick={async () => {
                  setIsPrintModeModalOpen(false);
                  await handleCp850PrintWithRange("new");
                }}
                className="w-full bg-green-600 text-white hover:bg-green-700"
              >
                New Print
              </Button>
              <Button
                onClick={async () => {
                  setIsPrintModeModalOpen(false);
                  await handleCp850PrintWithRange("queue");
                }}
                variant="secondary"
                className="w-full bg-blue-600 text-white hover:bg-blue-700"
              >
                Add to Queue
              </Button>
              <Button
                onClick={() => setIsPrintModeModalOpen(false)}
                variant="ghost"
                className="w-full text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Document Generator Modal */}
      {currentAction === "document" && (
        <DocumentGenerator
          startClientId={startClientId}
          endClientId={endClientId}
          availableRows={availableRows}
          allData={allData}
          useAllData={useAllData}
          setUseAllData={setUseAllData}
          onRefreshAllData={refreshAllData}
          isOpen={isOpen}
          onClose={handleClose}
          subscriptionType={subscriptionType}
        />
      )}

      {/* CSV Export Modal */}
      {currentAction === "csv" && (
        <CsvExport
          selectedRows={availableRows}
          dataSource={dataSource}
          startClientId={startClientId}
          endClientId={endClientId}
          setDataSource={setDataSource}
          setStartClientId={setStartClientId}
          setEndClientId={setEndClientId}
          getRowCount={getRowCount}
          table={table}
          allData={allData}
          useAllData={useAllData}
          setUseAllData={setUseAllData}
          onRefreshAllData={refreshAllData}
          isOpen={isOpen}
          onClose={handleClose}
          subscriptionType={subscriptionType}
        />
      )}

      {/* CSV Export Modal */}
      <Modal
        isOpen={csvExportOpen}
        onClose={() => {
          setCsvExportOpen(false);
          setUseAllData(false);
        }}
      >
        <CsvExport
          selectedRows={availableRows}
          dataSource={dataSource}
          startClientId={startClientId}
          endClientId={endClientId}
          setDataSource={setDataSource}
          setStartClientId={setStartClientId}
          setEndClientId={setEndClientId}
          getRowCount={getRowCount}
          table={table}
          allData={allData}
          useAllData={useAllData}
          setUseAllData={setUseAllData}
          onRefreshAllData={refreshAllData}
          onClose={() => {
            setCsvExportOpen(false);
            setUseAllData(false);
          }}
          subscriptionType={subscriptionType}
        />
      </Modal>

      {/* Printer Settings Modal */}
      <Modal
        isOpen={printerSettingsModalOpen}
        onClose={() => setPrinterSettingsModalOpen(false)}
      >
        <h2 className="flex justify-center text-xl font-bold text-black mb-4">
          Dot Matrix Printer Settings
        </h2>
      </Modal>

      {/* Renewal Notice Modal */}
      <Modal
        isOpen={renewalNoticeModalOpen}
        onClose={() => setRenewalNoticeModalOpen(false)}
      >
        <div className="w-full max-w-[1500px]">
          <h2 className="text-2xl font-bold mb-3 text-center">
            Renewal Notice Printing
          </h2>
          <p className="text-sm text-gray-600 mb-5 text-center max-w-2xl mx-auto border-b pb-4">
            This tool allows you to print variable data onto pre-printed renewal
            notice forms. You can adjust positions of all data fields to match
            your specific form layout.
          </p>
          <RenewalNoticeDataOverlay
            ref={renewalNoticeRef}
            startId={startClientId}
            endId={endClientId}
            availableRows={availableRows}
            useSharedConfig={!!renewalNoticeConfig}
            sharedConfig={renewalNoticeConfig}
          />
        </div>
      </Modal>

      {/* Thank You Letter Modal */}
      <Modal
        isOpen={thankYouLetterModalOpen}
        onClose={() => setThankYouLetterModalOpen(false)}
      >
        <div className="w-full max-w-[1500px]">
          <h2 className="text-2xl font-bold mb-3 text-center">
            Thank You Letter Printing
          </h2>
          <p className="text-sm text-gray-600 mb-5 text-center max-w-2xl mx-auto border-b pb-4">
            This tool allows you to print variable data onto pre-printed thank
            you letter forms. You can adjust positions of all data fields to
            match your specific form layout.
          </p>
          <ThankYouLetterDataOverlay
            ref={thankYouLetterRef}
            startId={startClientId}
            endId={endClientId}
            availableRows={availableRows}
            useSharedConfig={!!thankYouLetterConfig}
            sharedConfig={thankYouLetterConfig}
          />
        </div>
      </Modal>
    </div>
  );
};

export default Mailing;
