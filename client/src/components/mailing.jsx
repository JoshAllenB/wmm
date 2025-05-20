import React, { useState, useCallback, useEffect, useRef } from "react";
import Modal from "./modal";
import { Button } from "./UI/ShadCN/button";
import axios from "axios";

// Import components
import TemplateSelector from "./Mailing/TemplateSelector";
import PrinterSettings from "./Mailing/PrinterSettings";
import LabelPreview from "./Mailing/LabelPreview";
import RangeSelector from "./Mailing/RangeSelector";
import ConfigurationPanel from "./Mailing/ConfigurationPanel";
import CsvExport from "./Mailing/CsvExport";
import CsvImport from "./Mailing/CsvImport";
import MailingActions from "./Mailing/MailingActions";
import RenewalNoticeDataOverlay from "./Mailing/RenewalNotice";
import ThankYouLetterDataOverlay from "./Mailing/ThankYouLetter";

// Import utility functions
import { generatePrintHTML, generateChecklistHTML } from "./Mailing/PrintGenerator";

// Helper functions
const convertLegacyLabelToTemplate = (label) => {
  // Handle initialization command field which could be "init" or "initCommand"
  const initValue = label.init || label.initCommand || "";
  
  // Handle format field which could be "format" or "formatStr"
  const formatValue = label.format || label.formatStr || "";
  
  // Handle reset field which could be "reset" or "resetCommand"
  const resetValue = label.reset || label.resetCommand || "";
  
  return {
    id: label.id || `label-${Math.random().toString(36).substr(2, 9)}`,
    name: label.description || label.id || "Unnamed Label",
    description: label.description || `${label.id || "Legacy"} Label Template`,
    layout: {
      left: label.left || 1,
      width: label.width || 43,
      height: label.height || 22,
      columns: label.columns || 2,
      fontSize: 12,
      leftPosition: label.left || 1,
      topPosition: 10,
      columnWidth: (label.width || 43) * 6, // Converting character width to pixels (approx)
      labelHeight: (label.height || 22) * 12, // Converting character height to pixels (approx)
      horizontalSpacing: 20,
    },
    // Determine if this legacy label includes cell number based on content
    selectedFields: 
      (formatValue && 
      (String(formatValue).includes("Cell#") || 
       String(formatValue).includes("cellno"))) 
      ? ["contactnos"] 
      : [],
    isLegacy: true,
    printer: label.printer || "Dot Matrix Printer",
    // Use original field names for better compatibility
    init: initValue,
    format: formatValue,
    reset: resetValue,
    type: label.type || "LEGACY"
  };
};

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
  // State variables
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
  const [showTemplateNameInput, setShowTemplateNameInput] = useState(false);
  const [useLegacyFormat, setUseLegacyFormat] = useState(false);
  const [legacyLabels, setLegacyLabels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startClientId, setStartClientId] = useState("");
  const [endClientId, setEndClientId] = useState("");
  const [startPosition, setStartPosition] = useState("left");
  const [printerSettingsModalOpen, setPrinterSettingsModalOpen] = useState(false);
  const [printerSettings, setPrinterSettings] = useState(() => {
    // Try to load saved settings from localStorage
    const savedSettings = localStorage.getItem('dotMatrixPrinterSettings');
    if (savedSettings) {
      try {
        return JSON.parse(savedSettings);
      } catch (e) {
        console.error('Error parsing saved printer settings:', e);
      }
    }
    
    // Default settings if none were saved
    return {
      type: 'network',
      address: '192.168.1.100',
      port: 9100,
      vendorId: '',
      productId: '',
      queueName: '',
      useCups: false
    };
  });
  const [savedPrinterJobData, setSavedPrinterJobData] = useState(null);
  const [isDiscoveringPrinters, setIsDiscoveringPrinters] = useState(false);
  const [discoveredPrinters, setDiscoveredPrinters] = useState([]);
  
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

  // Get rows from table
  const getAvailableRows = useCallback(() => {
    if (!table || typeof table.getRowModel !== "function") return [];
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
      return [];
    }
  }, [table]);

  const availableRows = getAvailableRows();
  const hasAvailableRows = availableRows.length > 0;

  // Fetch templates and legacy labels
  const fetchAllTemplates = async () => {
    setIsLoading(true);
    try {
      // Fetch modern templates
      const templatesResponse = await axios.get(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/templates`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      const templatesData = templatesResponse.data;
      
      // Fetch legacy labels
      let legacyLabelsData = [];
      try {
        const labelsResponse = await axios.get(
          `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/labels`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }
        );
        legacyLabelsData = labelsResponse.data;
      } catch (labelError) {
        console.error("Error fetching legacy labels:", labelError);
        legacyLabelsData = [];
      }
      
      setLegacyLabels(legacyLabelsData);
      
      // Convert legacy labels to template format
      let legacyTemplates = [];
      
      if (legacyLabelsData && legacyLabelsData.length > 0) {
        // First try to filter only WMM types
        const wmmLabels = legacyLabelsData.filter(label => {
          const isWMM = label && label.type === "WMM";
          return isWMM;
        });
        
        // If no WMM labels, use all labels
        const labelsToConvert = wmmLabels.length > 0 ? wmmLabels : legacyLabelsData;
        
        // Safely convert each label, skipping any that cause errors
        legacyTemplates = labelsToConvert
          .map(label => {
            try {
              const template = convertLegacyLabelToTemplate(label);
              return template;
            } catch (conversionError) {
              console.error(`Error converting label ${label?.id || 'unknown'}:`, conversionError);
              return null;
            }
          })
          .filter(Boolean); // Remove any null entries
      } 
      
      // Add the templates to state
      const validLegacyTemplates = Array.isArray(legacyTemplates) ? legacyTemplates : [];
      const validModernTemplates = Array.isArray(templatesData) ? templatesData : [];
      const allTemplates = [...validModernTemplates, ...validLegacyTemplates];
      
      // If no templates were found, add a default template
      if (allTemplates.length === 0) {
        allTemplates.push({
          id: "DEFAULT",
          name: "Default Template",
          description: "Default Mailing Label Template",
          layout: {
            left: 1,
            width: 43,
            height: 22,
            columns: 2,
            fontSize: 12,
            leftPosition: 10,
            topPosition: 10,
            columnWidth: 300,
            labelHeight: 100,
            horizontalSpacing: 20,
          },
          selectedFields: ["contactnos"],
          isLegacy: false,
        });
      }
      
      setSavedTemplates(allTemplates);
    } catch (error) {
      console.error("Error in fetchAllTemplates:", error);
      
      // Add only a default template
      setSavedTemplates([{
        id: "DEFAULT",
        name: "Default Template",
        description: "Default Mailing Label Template",
        layout: {
          left: 1,
          width: 43,
          height: 22,
          columns: 2,
          fontSize: 12,
          leftPosition: 10,
          topPosition: 10,
          columnWidth: 300,
          labelHeight: 100,
          horizontalSpacing: 20,
        },
        selectedFields: ["contactnos"],
        isLegacy: false,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize client ID range when available rows change
  useEffect(() => {
    if (hasAvailableRows) {
      const firstId = availableRows[0]?.original?.id?.toString() || "";
      const lastId = availableRows[availableRows.length - 1]?.original?.id?.toString() || "";

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
    } else {
      setStartClientId("");
      setEndClientId("");
    }
  }, [availableRows]);

  // Fetch templates on component mount
  useEffect(() => {
    fetchAllTemplates();
  }, []);

  // Handle template selection
  const handleTemplateSelect = (templateName) => {
    const selected = savedTemplates.find(
      (template) => template.name === templateName
    );
    
    if (selected) {
      // Check if this is a legacy template
      if (selected.isLegacy) {
        setUseLegacyFormat(true);
        
        // Set the layout settings from the legacy template
        setFontSize(selected.layout.fontSize);
        setLeftPosition(selected.layout.leftPosition);
        setTopPosition(selected.layout.topPosition);
        setColumnWidth(selected.layout.columnWidth);
        setLabelHeight(selected.layout.labelHeight);
        setHorizontalSpacing(selected.layout.horizontalSpacing);
        setSelectedFields(selected.selectedFields);
      } else {
        setUseLegacyFormat(false);
        
        // Regular template settings
        setFontSize(selected.layout.fontSize);
        setLeftPosition(selected.layout.leftPosition);
        setTopPosition(selected.layout.topPosition);
        setColumnWidth(selected.layout.columnWidth);
        setLabelHeight(selected.layout.labelHeight || 100);
        setHorizontalSpacing(selected.layout.horizontalSpacing || 20);
        setSelectedFields(selected.selectedFields);
      }
      setSelectedTemplate(selected);
    }
  };

  // Save template to server
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
      alert("Error saving template. Please try again.");
    }
  };

  // Handle print with range
  const handlePrintWithRange = () => {
    // If no template is selected but we need to print, create a default template
    let templateToUse = selectedTemplate;
    if (!templateToUse) {
      // Create a default template based on current settings
      templateToUse = {
        name: "Default Template",
        layout: {
          fontSize,
          leftPosition,
          topPosition,
          columnWidth,
          labelHeight,
          horizontalSpacing,
        },
        selectedFields,
        isLegacy: useLegacyFormat
      };
    }

    const htmlContent = generatePrintHTML(
      startClientId,
      endClientId,
      startPosition,
      availableRows,
      useLegacyFormat,
      templateToUse,
      leftPosition,
      topPosition,
      columnWidth,
      horizontalSpacing,
      fontSize,
      labelHeight,
      selectedFields
    );
    
    const printWindow = window.open("", "_blank", "height=600,width=800");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } else {
      alert("Could not open print window. Please check your pop-up blocker settings.");
    }
  };

  // Handle direct print to dot matrix
  const handleDirectPrintToDotMatrix = async () => {
    if (!selectedTemplate || !selectedTemplate.isLegacy) {
      alert("Please select a legacy dot matrix template first");
      return;
    }

    try {
      // Filter rows based on start/end Client IDs
      const filteredRows = availableRows.filter((row) => {
        const clientId = row?.original?.id?.toString();
        if (!clientId) return false;
        
        const trimmedStartId = startClientId?.trim();
        const trimmedEndId = endClientId?.trim();
        const isAfterStart = trimmedStartId ? clientId >= trimmedStartId : true;
        const isBeforeEnd = trimmedEndId ? clientId <= trimmedEndId : true;
        return isAfterStart && isBeforeEnd;
      });

      if (filteredRows.length === 0) {
        alert("No labels found for the specified Client ID range. Check IDs and selection.");
        return;
      }

      // Format the data for the printer
      const printData = filteredRows.map(row => {
        const original = row.original;
        const wmmData = original?.wmmData;
        const subscription = wmmData?.records?.[0] || wmmData || {};
        
        return {
          id: original.id || "",
          expdate: subscription.enddate || new Date(),
          copies: subscription.copies || "1",
          acode: original.acode || "",
          title: original.title || "",
          fname: original.fname || "",
          mname: original.mname || "",
          lname: original.lname || "",
          sname: original.sname || "",
          company: original.company || "",
          address: original.address || "",
          cellno: original.cellno || "",
          contactnos: original.contactnos || "",
        };
      });

      // Save the data for later use after printer settings are confirmed
      setSavedPrinterJobData({
        labelId: selectedTemplate.id,
        data: printData,
      });

      // Open the printer settings modal
      setPrinterSettingsModalOpen(true);
    } catch (error) {
      console.error("Error preparing print job:", error);
      alert(`Error: ${error.message || "Failed to prepare print job"}`);
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
          printerConfig: printerSettings,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            'Content-Type': 'application/json',
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
      alert(`Error: ${error.response?.data?.error || error.message || "Failed to send print job"}`);
    } finally {
      setIsLoading(false);
      setSavedPrinterJobData(null);
    }
  };

  // Discover printers
  const discoverPrinters = async () => {
    setIsDiscoveringPrinters(true);
    setDiscoveredPrinters([]);
    
    try {
      // Call the backend API to discover printers
      const response = await axios.get(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/discover-printers`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
          params: {
            network: 'false' // Set to 'true' to include network scanning (slower)
          }
        }
      );
      
      if (response.data.success && response.data.printers) {
        // Combine all printer types into one list
        const allPrinters = response.data.printers.all || [];
        setDiscoveredPrinters(allPrinters);
        
        if (allPrinters.length === 0) {
          alert('No printers were discovered. Make sure your printer is connected and try again.');
        }
      } else {
        alert('Failed to discover printers. Please check the server logs for details.');
      }
    } catch (error) {
      console.error('Error discovering printers:', error);
      alert(`Error discovering printers: ${error.message || 'Unknown error'}`);
    } finally {
      setIsDiscoveringPrinters(false);
    }
  };

  // Handle discovered printer selection
  const handleDiscoveredPrinterSelect = (event) => {
    const selectedIndex = parseInt(event.target.value, 10);
    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= discoveredPrinters.length) {
      return;
    }
    
    const selectedPrinter = discoveredPrinters[selectedIndex];
    let newSettings = { ...printerSettings };
    
    // Update settings based on printer type
    if (selectedPrinter.type === 'network') {
      newSettings = {
        ...newSettings,
        type: 'network',
        address: selectedPrinter.address,
        port: selectedPrinter.port || 9100,
        useCups: false
      };
    } else if (selectedPrinter.type === 'usb') {
      newSettings = {
        ...newSettings,
        type: 'usb',
        vendorId: selectedPrinter.vendorId,
        productId: selectedPrinter.productId,
        useCups: false
      };
    } else if (selectedPrinter.type === 'cups') {
      newSettings = {
        ...newSettings,
        type: 'network', // Default to network for CUPS
        queueName: selectedPrinter.queueName,
        useCups: true
      };
    }
    
    // Update the settings
    setPrinterSettings(newSettings);
    
    // Save to localStorage
    try {
      localStorage.setItem('dotMatrixPrinterSettings', JSON.stringify(newSettings));
    } catch (e) {
      console.error('Error saving printer settings:', e);
    }
  };

  // Print checklist
  const handlePrintChecklist = () => {
    const filteredColumns = table.getAllColumns().filter(
      column => column.id !== "addedBy" && column.id !== "Added Info"
    );
    
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(generateChecklistHTML(filteredColumns, availableRows));
      printWindow.document.close();
    } else {
      alert("Could not open print window. Please check your pop-up blocker settings.");
    }
  };

  // Toggle modal visibilities
  const toggleModal = () => setModalOpen(!modalOpen);
  const closeModal = () => setModalOpen(false);
  const toggleShowInputs = () => setShowInputs(!showInputs);

  // Handle import completion
  const handleImportComplete = (results) => {
    if (results && results.success + results.updated > 0) {
      // Optionally refresh data or show notification
      alert(`Successfully imported/updated ${results.success + results.updated} subscribers.`);
    }
  };

  // Get row count based on selected dataSource
  const getRowCount = useCallback(() => {
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

  // Function to update renewal notice positions from shared config
  const updateRenewalNoticePositions = (positions) => {
    setRenewalNoticeConfig(prev => ({
      ...prev,
      positions: positions
    }));
  };

  // Function to sync configurations
  const syncConfigToRenewalNotice = () => {
    if (renewalNoticeRef.current) {
      const currentPositions = renewalNoticeRef.current.getPositions();
      setRenewalNoticeConfig({
        positions: currentPositions,
        updatePositions: updateRenewalNoticePositions
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
    setThankYouLetterConfig(prev => ({
      ...prev,
      positions: positions
    }));
  };

  // Function to sync configurations for thank you letter
  const syncConfigToThankYouLetter = () => {
    if (thankYouLetterRef.current) {
      const currentPositions = thankYouLetterRef.current.getPositions();
      setThankYouLetterConfig({
        positions: currentPositions,
        updatePositions: updateThankYouLetterPositions
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

  if (!table) return null;

  return (
    <div className="flex flex-col justify-between">
      {hasAvailableRows && (
        <div className="flex gap-2">
          <Button
            onClick={toggleModal}
            className="text-sm bg-green-600 hover:bg-green-800 text-white"
            disabled={isLoading}
          >
            {isLoading ? 'Loading Templates...' : `Print Mailing Label (${availableRows.length})`}
          </Button>
          
          {/* Renewal Notice Button */}
          <Button
            onClick={() => setRenewalNoticeModalOpen(true)}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isLoading}
          >
            <span className="mr-1">🖨️</span> Renewal Notice
          </Button>
          
          {/* Thank You Letter Button */}
          <Button
            onClick={() => setThankYouLetterModalOpen(true)}
            className="text-sm bg-purple-600 hover:bg-purple-700 text-white"
            disabled={isLoading}
          >
            <span className="mr-1">🖨️</span> Thank You Letter
          </Button>
          
          {/* Add CSV Export Component */}
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
          />
          
          {/* Add CSV Import Component */}
          <CsvImport onImportComplete={handleImportComplete} />
        </div>
      )}
      
      {/* Main Mailing Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal}>
        <h2 className="flex justify-center text-xl font-bold text-black mb-4">
          Mailing Label Options
        </h2>

        <div className="flex w-full max-w-6xl mx-auto">
          {/* Left Panel - Configuration Controls */}
          <div className="pr-4 overflow-y-auto" style={{ maxHeight: "70vh" }}>
            {/* Configuration Toggle and Checklist Button */}
            <div className="flex justify-center gap-2 mb-4">
              <Button onClick={toggleShowInputs} variant="outline">
                {showInputs ? "Hide Configuration" : "Show Configuration"}
              </Button>
              <Button
                onClick={handlePrintChecklist}
                variant="outline"
                disabled={!hasAvailableRows || isLoading}
              >
                Print Checklist
              </Button>
            </div>

            {/* Configuration Panel */}
            {showInputs && (
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
                selectedFields={selectedFields}
                setSelectedFields={setSelectedFields}
                templateName={templateName}
                setTemplateName={setTemplateName}
                showTemplateNameInput={showTemplateNameInput}
                setShowTemplateNameInput={setShowTemplateNameInput}
                saveTemplate={saveTemplate}
              />
            )}

            {/* Configuration Panel with Thank You Letter options */}
            {showInputs && (
              <div className="mt-4 border rounded p-3 bg-blue-50">
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
                  Use these options to configure form overlays from this interface
                </p>
              </div>
            )}

            {/* Template Selector */}
            <TemplateSelector
              selectedTemplate={selectedTemplate}
              savedTemplates={savedTemplates}
              isLoading={isLoading}
              onTemplateSelect={handleTemplateSelect}
            />

            {/* Range Selector */}
            <RangeSelector
              startClientId={startClientId}
              setStartClientId={setStartClientId}
              endClientId={endClientId}
              setEndClientId={setEndClientId}
              startPosition={startPosition}
              setStartPosition={setStartPosition}
              availableRows={availableRows}
            />
          </div>

          {/* Right Panel - Preview */}
          <div className="pl-4 flex flex-col items-center">
            <h3 className="text-center font-semibold mb-4">
              Label Preview
            </h3>
            <div className="border rounded p-6 w-full bg-white flex flex-col items-center justify-center">
              <LabelPreview
                isLoading={isLoading}
                selectedTemplate={selectedTemplate}
                hasAvailableRows={hasAvailableRows}
                availableRows={availableRows}
                useLegacyFormat={useLegacyFormat}
                fontSize={fontSize}
                columnWidth={columnWidth}
                horizontalSpacing={horizontalSpacing}
                labelHeight={labelHeight}
                selectedFields={selectedFields}
                startPosition={startPosition}
              />
              <div className="text-sm text-gray-600 mt-2 text-center">
                <p>Real-time preview of how labels will print</p>
                <p className="text-xs">
                  {useLegacyFormat && selectedTemplate?.isLegacy ? 
                    `Legacy format: optimized for ${selectedTemplate.printer || "dot matrix printers"}` :
                    `Layout dimensions: ${Math.max(columnWidth * 2, 200)}px × ${Math.max(labelHeight * 2, 100)}px`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 mt-6 mx-auto" style={{ maxWidth: "600px" }}>
          <Button
            onClick={handlePrintWithRange}
            className="bg-green-600 hover:bg-green-700 text-white flex-grow"
            disabled={!hasAvailableRows || isLoading}
          >
            {isLoading ? 'Loading...' : 'Print Preview'}
          </Button>
          
          {selectedTemplate?.isLegacy && (
            <Button
              onClick={handleDirectPrintToDotMatrix}
              className="bg-blue-600 hover:bg-blue-700 text-white flex-grow"
              disabled={!hasAvailableRows || isLoading}
            >
              {isLoading ? 'Printing...' : 'Print to Dot Matrix'}
            </Button>
          )}
          
          <Button
            onClick={closeModal}
            variant="secondary"
            className="flex-grow-0 w-24"
          >
            Cancel
          </Button>
        </div>
      </Modal>

      {/* Printer Settings Modal */}
      <Modal isOpen={printerSettingsModalOpen} onClose={() => setPrinterSettingsModalOpen(false)}>
        <h2 className="flex justify-center text-xl font-bold text-black mb-4">
          Dot Matrix Printer Settings
        </h2>
        
        <PrinterSettings
          printerSettings={printerSettings}
          setPrinterSettings={setPrinterSettings}
          isDiscoveringPrinters={isDiscoveringPrinters}
          discoveredPrinters={discoveredPrinters}
          discoverPrinters={discoverPrinters}
          handleDiscoveredPrinterSelect={handleDiscoveredPrinterSelect}
          isLoading={isLoading}
          executePrintJob={executePrintJob}
          onClose={() => setPrinterSettingsModalOpen(false)}
        />
      </Modal>

      {/* Renewal Notice Modal */}
      <Modal isOpen={renewalNoticeModalOpen} onClose={() => setRenewalNoticeModalOpen(false)}>
        <div className="w-full max-w-[1500px]">
          <h2 className="text-2xl font-bold mb-3 text-center">Renewal Notice Printing</h2>
          <p className="text-sm text-gray-600 mb-5 text-center max-w-2xl mx-auto border-b pb-4">
            This tool allows you to print variable data onto pre-printed renewal notice forms.
            You can adjust positions of all data fields to match your specific form layout.
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
      <Modal isOpen={thankYouLetterModalOpen} onClose={() => setThankYouLetterModalOpen(false)}>
        <div className="w-full max-w-[1500px]">
          <h2 className="text-2xl font-bold mb-3 text-center">Thank You Letter Printing</h2>
          <p className="text-sm text-gray-600 mb-5 text-center max-w-2xl mx-auto border-b pb-4">
            This tool allows you to print variable data onto pre-printed thank you letter forms.
            You can adjust positions of all data fields to match your specific form layout.
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