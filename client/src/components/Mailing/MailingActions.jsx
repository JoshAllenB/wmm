import axios from "axios";
import React, { useState, useRef } from "react";
import RenewalNoticeDataOverlay from "./RenewalNotice";
import Modal from "../modal";
import { Button } from "../UI/ShadCN/button";

// Convert legacy label to template format
export const convertLegacyLabelToTemplate = (label) => {
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

// Fetch all templates (modern and legacy)
export const fetchAllTemplates = async (setIsLoading, setSavedTemplates) => {
  setIsLoading(true);
  try {
    // Fetch modern templates
    const templatesData = await fetchPrintTemplates();
    
    // Fetch legacy labels - no fallback to sample data
    let legacyLabelsData = [];
    try {
      legacyLabelsData = await fetchLegacyLabels();
    } catch (labelError) {
      console.error("Error fetching legacy labels:", labelError);
      legacyLabelsData = [];
    }
    
    // Convert legacy labels to template format
    let legacyTemplates = [];
    
    // Check if we have any legacy labels
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
    
    // Add the templates to state - make sure we have valid templates
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
    return allTemplates;
  } catch (error) {
    console.error("Error in fetchAllTemplates:", error);
    
    // Add only a default template
    const defaultTemplate = {
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
    };
    
    setSavedTemplates([defaultTemplate]);
    return [defaultTemplate];
  } finally {
    setIsLoading(false);
  }
};

// Fetches print templates from the server
export const fetchPrintTemplates = async () => {
  try {
    const response = await axios.get(
      `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/templates`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching print templates:", error);
    return [];
  }
};

// Fetches legacy label formats from the server
export const fetchLegacyLabels = async () => {
  try {
    const response = await axios.get(
      `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/labels`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching legacy labels:", error);
    return [];
  }
};

// Save a template to the server
export const saveTemplateToServer = async (template) => {
  try {
    const response = await axios.post(
      `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/templates-add`,
      template,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error saving template:", error);
    throw error;
  }
};

// Discover printers via the backend
export const discoverPrinters = async () => {
  try {
    const response = await axios.get(
      `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/discover-printers`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        params: {
          network: 'false'
        }
      }
    );
    
    if (response.data.success && response.data.printers) {
      return response.data.printers.all || [];
    }
    return [];
  } catch (error) {
    console.error('Error discovering printers:', error);
    throw error;
  }
};

// Send print job to the server
export const sendPrintJob = async (printJobData, printerSettings) => {
  try {
    const response = await axios.post(
      `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/print-dot-matrix`,
      {
        ...printJobData,
        printerConfig: printerSettings,
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error sending print job to printer:", error);
    throw error;
  }
};

// Utility function to get available rows
const getFilteredRows = (availableRows, startClientId, endClientId) => {
  return availableRows.filter((row) => {
    const clientId = row?.original?.id?.toString();
    if (!clientId) return false;
    
    const trimmedStartId = startClientId?.trim();
    const trimmedEndId = endClientId?.trim();
    const isAfterStart = trimmedStartId ? clientId >= trimmedStartId : true;
    const isBeforeEnd = trimmedEndId ? clientId <= trimmedEndId : true;
    return isAfterStart && isBeforeEnd;
  });
};

const MailingActions = ({ 
  table, 
  availableRows, 
  startClientId,
  endClientId,
  setStartClientId,
  setEndClientId,
  hasAvailableRows,
  isLoading
}) => {
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);
  const renewalComponentRef = useRef(null);

  // Toggle renewal notice modal
  const openRenewalModal = () => setRenewalModalOpen(true);
  const closeRenewalModal = () => setRenewalModalOpen(false);

  // Reference functions for printing
  const handleAlignmentTest = () => {
    openRenewalModal();
    // Let the modal open first, then trigger the alignment test
    setTimeout(() => {
      if (renewalComponentRef.current && renewalComponentRef.current.handlePrintAlignmentTest) {
        renewalComponentRef.current.handlePrintAlignmentTest();
      }
    }, 300);
  };

  const handlePrintData = () => {
    openRenewalModal();
    // Let the modal open first, then trigger the print data
    setTimeout(() => {
      if (renewalComponentRef.current && renewalComponentRef.current.handlePrintDataOverlay) {
        renewalComponentRef.current.handlePrintDataOverlay();
      }
    }, 300);
  };

  // Calculate selected subscribers count
  const selectedSubscribersCount = startClientId && endClientId ? 
    availableRows?.filter(row => {
      const clientId = row?.original?.id?.toString();
      if (!clientId) return false;
      const isAfterStart = clientId >= startClientId?.trim();
      const isBeforeEnd = clientId <= endClientId?.trim();
      return isAfterStart && isBeforeEnd;
    })?.length || 0 : 0;

  return (
    <div className="mt-4">
      {/* Renewal Notice Section */}
      {hasAvailableRows && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-lg font-bold text-gray-800">Renewal Notice Printing</h2>
            <Button 
              onClick={openRenewalModal} 
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              Show Configuration
            </Button>
          </div>
          
          <div className="p-4 text-sm text-gray-700">
            <p>Print renewal notice data on pre-printed forms. The system will only print the variable data (subscriber information) in the correct positions on your forms.</p>
            <p className="mt-2">Last issue date is automatically calculated as one month before the expiry date.</p>
            
            {/* Display ID Range if specified */}
            {startClientId && endClientId && (
              <div className="mt-3 p-2 bg-gray-50 border rounded-md">
                <p className="flex justify-between">
                  <span className="font-medium">ID Range:</span> 
                  <span>{startClientId} - {endClientId}</span>
                </p>
                <p className="flex justify-between mt-1">
                  <span className="font-medium">Selected subscribers:</span>
                  <span>{selectedSubscribersCount}</span>
                </p>
              </div>
            )}
            
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={handleAlignmentTest}
                variant="outline" 
                size="sm"
                className="mr-2"
              >
                <span className="mr-1">📐</span> Print Alignment Test
              </Button>
              <Button 
                onClick={handlePrintData}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
                disabled={selectedSubscribersCount === 0}
              >
                <span className="mr-1">🖨️</span> Print Data Only
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Renewal Notice Modal */}
      <Modal isOpen={renewalModalOpen} onClose={closeRenewalModal}>
        <div className="w-full max-w-4xl">
          <h2 className="text-2xl font-bold mb-6 text-center">Renewal Notice Data Overlay</h2>
          <RenewalNoticeDataOverlay 
            ref={renewalComponentRef}
            startId={startClientId}
            endId={endClientId}
            availableRows={availableRows}
          />
        </div>
      </Modal>
      
      {/* You can add more mailing action sections here */}
    </div>
  );
};

export default MailingActions; 