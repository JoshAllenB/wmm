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
  generatePrintHTML,
  generateChecklistHTML,
  generateCp850RawPrintContent,
  printWithJsPrintManager,
  diagnosePrinterIssues,
} from "./Mailing/PrintGenerator";

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

  // Add state for skipped data handling
  const [skippedData, setSkippedData] = useState([]);
  const [showSkippedData, setShowSkippedData] = useState(false);

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

  // State for checklist title
  const [checklistTitle, setChecklistTitle] = useState("Mailing Checklist");
  const [showChecklistTitleInput, setShowChecklistTitleInput] = useState(false);

  // Callback to handle changes from RawPrinterControls
  const handleRawPrinterControlsChange = (changes) => {
    setLabelAdjustments(changes);
  };

  // Callback to handle printer selection changes
  const handlePrinterChange = (printerName) => {
    setSelectedPrinter(printerName);
  };

  // Function to handle skipped data updates
  const handleSkippedDataUpdate = (skippedRecords) => {
    setSkippedData(skippedRecords);
    // If there are skipped records, automatically show them
    if (skippedRecords && skippedRecords.length > 0) {
      setShowSkippedData(true);
    }
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
        const isAfterStart = trimmedStartId ? clientId >= trimmedStartId : true;
        const isBeforeEnd = trimmedEndId ? clientId <= trimmedEndId : true;
        return isAfterStart && isBeforeEnd;
      }).length;
    }
    return 0;
  }, [table, dataSource, availableRows, startClientId, endClientId]);

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
    }
  }, [modalOpen]);

  // Update modal open state when isOpen prop changes
  useEffect(() => {
    setModalOpen(isOpen);
  }, [isOpen]);

  // Fetch templates on component mount
  useEffect(() => {
    fetchAllTemplates();
  }, []);

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
          advancedFilterData,
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
      // Fetch templates filtered by user's department
      const templatesResponse = await axios.get(
        `http://${
          import.meta.env.VITE_IP_ADDRESS
        }:3001/util/templates?department=${userRole}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
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
          department: userRole,
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
          selectedFields: ["cellno"],
          previewType: "standard",
        });
      }

      setSavedTemplates(validTemplates);
    } catch (error) {
      console.error("Error in fetchAllTemplates:", error);

      // Add only a default template
      setSavedTemplates([
        {
          _id: "DEFAULT",
          name: "Default Template",
          description: "Default Mailing Label Template",
          department: userRole,
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
          selectedFields: ["cellno"],
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

      // Set raw printer controls
      setLabelAdjustments({
        labelWidthIn: selected.layout.labelWidthIn || 3.5,
        topMargin: selected.layout.topMargin || 4,
        rowSpacing: selected.layout.rowSpacingLines || 14,
        col2X: selected.layout.col2X || 255,
      });

      setSelectedTemplate(selected);
    }
  };

  // Handle template saved callback
  const handleTemplateSaved = (newTemplate) => {
    setSavedTemplates([...savedTemplates, newTemplate]);
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

  // Handle print with range
  const handlePrintWithRange = async () => {
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

    // Determine which data to use
    let rowsToUse = availableRows;
    if (useAllData) {
      try {
        const allData = await fetchAllData();
        rowsToUse = allData.map((item) => ({ original: item }));
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
    // Generate print preview HTML (fallback when JSPrintManager isn't available)
    const htmlContent = generatePrintHTML(
      startClientId,
      endClientId,
      startPosition,
      rowsToUse,
      templateToUse,
      mmToPx(leftPosition),
      mmToPx(topPosition),
      mmToPx(columnWidth),
      mmToPx(horizontalSpacing),
      mmToPx(rowSpacing),
      fontSize,
      mmToPx(labelHeight),
      templateToUse.selectedFields || selectedFields || [],
      userRole,
      subscriptionType, // Add subscription type here
      rowsPerPage,
      columnsPerPage
    );

    const printWindow = window.open("", "_blank", "height=600,width=800");
    if (printWindow) {
      printWindow.document.write("<!DOCTYPE html>");
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      // Wait for resources to load before printing
      printWindow.onload = () => {
        try {
          printWindow.print();
          // Only close after printing is done or cancelled
          printWindow.onafterprint = () => {
            printWindow.close();
          };
        } catch (error) {
          console.error("Print error:", error);
          // Keep window open if print fails
        }
      };
    } else {
      alert(
        "Could not open print window. Please check your pop-up blocker settings."
      );
    }
  };

  // Handle CP850-aware printing with JSPrintManager
  const handleCp850PrintWithRange = async () => {
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

    // Determine which data to use
    let rowsToUse = availableRows;
    if (useAllData) {
      try {
        const allData = await fetchAllData();
        rowsToUse = allData.map((item) => ({ original: item }));
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

    // Always try JSPrintManager raw printing first when available
    try {
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
        false, // isPrintJobResumed
        true, // useCp850Encoding
        labelAdjustments // Pass label adjustments
      );

      if (window.JSPM && window.JSPM.JSPrintManager) {
        await printWithJsPrintManager(
          rawCommands,
          selectedPrinter || "", // Use selected printer or default
          !selectedPrinter, // useDefaultPrinter = true only if no printer selected
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
        toast({
          title: "Print Job Completed",
          description: "Raw printing completed successfully!",
        });
      } else {
        toast({
          title: "JSPrintManager Not Available",
          description:
            "JSPrintManager client not detected or websocket not open.",
          variant: "destructive",
        });
        handlePrintWithRange();
      }
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
      handlePrintWithRange();
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
          availableRows,
          checklistTitle,
          filterDate
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
          advancedFilterData,
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
            onSkippedDataUpdate={handleSkippedDataUpdate}
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
              <div className="w-[400px] flex-shrink-0">
                <div
                  className="border rounded-lg p-4 bg-white shadow-sm"
                  style={{ maxHeight: "calc(90vh - 100px)", overflowY: "auto" }}
                >
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
                  <div className="flex justify-center gap-2 mb-4">
                    <Button onClick={toggleShowInputs} variant="outline">
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
                            rows={availableRows}
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
                      onTemplateSaved={handleTemplateSaved}
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
                      startPosition={startPosition}
                      setStartPosition={setStartPosition}
                      availableRows={availableRows}
                      onSetFromSelection={setRangeFromSelection}
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
                  <div className="flex flex-col items-center justify-center h-[calc(90vh-200px)]">
                    <LabelPreview
                      isLoading={isLoading}
                      selectedTemplate={selectedTemplate}
                      hasAvailableRows={hasAvailableRows}
                      availableRows={availableRows}
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
                      subscriptionType={subscriptionType} // Add subscription type here
                    />
                    <div className="text-sm text-gray-600 mt-4 text-center">
                      <p>Real-time preview of how labels will print</p>
                      <p className="text-xs">
                        Layout dimensions: {Math.max(columnWidth * 2, 200)}px ×{" "}
                        {Math.max(labelHeight * 2, 100)}px
                      </p>
                    </div>

                    {/* Add Mailing Actions */}
                    <div className="mt-6 w-full max-w-md">
                      <MailingActions
                        isLoading={isLoading}
                        hasAvailableRows={hasAvailableRows}
                        selectedTemplate={selectedTemplate}
                        onPrintPreview={handleCp850PrintWithRange}
                      />
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
        <div className="w-full max-w-[95vw]">{renderContent()}</div>
      </Modal>

      {/* Document Generator Modal */}
      {currentAction === "document" && (
        <DocumentGenerator
          startClientId={startClientId}
          endClientId={endClientId}
          availableRows={availableRows}
          allData={allData}
          useAllData={useAllData}
          setUseAllData={setUseAllData}
          onSkippedDataUpdate={handleSkippedDataUpdate}
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

      {/* Display skipped data information */}
      {skippedData.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-yellow-50 rounded-lg shadow-lg border border-yellow-200 p-4 max-w-md">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-yellow-800">
                Records Not Being Printed ({skippedData.length})
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSkippedData(!showSkippedData)}
                className="text-yellow-800 hover:text-yellow-900"
              >
                {showSkippedData ? "Hide Details" : "Show Details"}
              </Button>
            </div>

            {showSkippedData && (
              <ScrollArea className="h-[200px] w-full rounded border border-yellow-200 bg-white">
                <div className="p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-yellow-200">
                        <th className="pb-2">ID</th>
                        <th className="pb-2">Name/Company</th>
                        <th className="pb-2">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {skippedData.map((record, index) => (
                        <tr
                          key={index}
                          className="border-b border-yellow-100 last:border-0"
                        >
                          <td className="py-2">{record.id}</td>
                          <td className="py-2">
                            {record.name || record.company || "N/A"}
                          </td>
                          <td className="py-2 text-yellow-700">
                            {record.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
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
