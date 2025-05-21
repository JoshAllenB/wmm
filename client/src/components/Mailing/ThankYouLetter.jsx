import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Button } from "../UI/ShadCN/button";

const ThankYouLetterDataOverlay = forwardRef(({ 
  startId, 
  endId, 
  availableRows, 
  parentPrintAlignmentTest = null,
  parentPrintDataOverlay = null,
  // Add shared configuration props
  useSharedConfig = false,
  sharedConfig = null
}, ref) => {
  const [isLoading, setIsLoading] = useState(false);
  const [filteredSubscribers, setFilteredSubscribers] = useState([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [showConfig, setShowConfig] = useState(false);
  
  // Configuration state for positions (defaulted to current values)
  const [positions, setPositions] = useState(() => {
    // If shared configuration is provided, use it
    if (useSharedConfig && sharedConfig) {
      return sharedConfig.positions || {
        // Only have the address fields group (similar to group2 from renewal)
        addressGroup: {
          top: 3.3, // ~30% of page height (matching renewal notice)
          left: 0.5, // Position address group further right to match renewal notice
          width: 4.0, // Wide enough for address fields (matching renewal notice)
          lineSpacing: 0.175, // For compact address fields (matching renewal notice)
          fontSize: 12,
          fontWeight: "normal",
          fontFamily: "Arial"
        },
        // Month Year date display
        monthYear: {
          top: 2.0, // Position at top of page
          fontSize: 12,
          fontFamily: "Arial"
        },
        // Greeting field
        greeting: {
          top: 6.0, // Position below address
          left: 0.5, // Match address left position
          width: 4.0, // Width for greeting
          fontSize: 14,
          fontWeight: "normal",
          fontFamily: "Arial"
        },
        // Spacing configurations
        spacing: {
          monthYearToAddress: 0.5, // Spacing between Month Year and Address Group
          addressToGreeting: 0.8, // Spacing between Address Group and Greeting
        }
      };
    }
    
    // Try to load saved settings from localStorage
    try {
      const savedPositions = localStorage.getItem('thankYouLetterPositions');
      if (savedPositions) {
        return JSON.parse(savedPositions);
      }
    } catch (error) {
      console.error('Error loading saved positions:', error);
    }
    
    // Default positions based on renewal notice group2 values for consistent positioning
    return {
      // Address group (copied from renewal notice group2)
      addressGroup: {
        top: 3.3, // ~30% of page height (11 inches * 0.30 = 3.3 inches)
        left: 0.5, // Position address group further right to match renewal notice
        width: 4.0, // Wide enough for address fields
        lineSpacing: 0.175, // Reduced spacing to make fields appear closer together
        fontSize: 12,
        fontWeight: "normal",
        fontFamily: "Arial"
      },
      // Month Year date display
      monthYear: {
        top: 2.0, // Position at top of page
        fontSize: 12,
        fontFamily: "Arial"
      },
      // Greeting field
      greeting: {
        top: 6.0, // Position below address
        left: 0.5, // Match address left position
        width: 4.0, // Width for greeting
        fontSize: 14,
        fontWeight: "normal",
        fontFamily: "Arial"
      },
      // Spacing configurations
      spacing: {
        monthYearToAddress: 0.5, // Spacing between Month Year and Address Group
        addressToGreeting: 1.0, // Spacing between Address Group and Greeting
      }
    };
  });

  // State for storing preview HTML
  const [previewHTML, setPreviewHTML] = useState(null);

  // Hide preview modal
  const hidePreview = () => {
    setPreviewHTML(null);
  };

  // Filter subscribers when ID range or available rows change
  useEffect(() => {
    if (!availableRows) return;
    
    // Filter subscribers within the selected ID range
    const filtered = availableRows.filter((row) => {
      const clientId = row?.original?.id?.toString();
      if (!clientId) return false;
      
      const trimmedStartId = startId?.trim();
      const trimmedEndId = endId?.trim();
      const isAfterStart = trimmedStartId ? clientId >= trimmedStartId : true;
      const isBeforeEnd = trimmedEndId ? clientId <= trimmedEndId : true;
      return isAfterStart && isBeforeEnd;
    });
    
    setFilteredSubscribers(filtered);
    setSubscriberCount(filtered.length);
  }, [startId, endId, availableRows]);

  // Format date as human-readable Month Year
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
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
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
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Process each row into the expected format for thank you letters
  const processSubscriberData = (row) => {
    if (!row) return null;
    
    const original = row.original;
    if (!original) return null;
    
    // Get subscription data from wmmData
    const wmmData = original.wmmData;
    const subscription = wmmData?.records?.[0] || wmmData || {};
    
    // Get current date for the letter
    const currentDate = new Date();
    const formattedCurrentDate = formatDate(currentDate);
    const formattedMonthYear = formatMonthYear(currentDate);
    
    // Handle address field which could be a single string or split into address1, address2, etc.
    let address1 = original.address1 || "";
    let address2 = original.address2 || "";
    let address3 = original.address3 || "";
    let address4 = original.address4 || "";
    
    // If there's a single address field but no individual address fields
    if (original.address && !address1) {
      // Try to split the address into multiple lines if it contains newlines or commas
      const addressParts = original.address.split(/[\n,]+/).map(part => part.trim()).filter(Boolean);
      
      if (addressParts.length >= 1) address1 = addressParts[0];
      if (addressParts.length >= 2) address2 = addressParts[1];
      if (addressParts.length >= 3) address3 = addressParts[2];
      if (addressParts.length >= 4) address4 = addressParts[3];
    }
    
    // Check if we have personal name fields
    const hasPersonalName = !!(original.fname || original.lname || original.title);
    
    // Format subscriber data for the thank you letter
    return {
      id: original.id || "",
      copies: subscription.copies || "1",
      accountCode: original.acode || "",
      title: original.title || "Mr.",
      firstName: original.fname || "",
      middleName: original.mname || "",
      lastName: original.lname || "",
      company: original.company || "",
      address1,
      address2,
      address3,
      address4,
      currentDate: formattedCurrentDate,
      monthYear: formattedMonthYear,
      hasPersonalName, // Flag to indicate if we have a personal name
      hasCompany: !!original.company // Flag to indicate if we have a company name
    };
  };

  // Handle position change for address group fields
  const handleGroupPositionChange = (group, field, value) => {
    setPositions(prev => ({
      ...prev,
      [group]: {
        ...prev[group],
        [field]: parseFloat(value)
      }
    }));
  };
  
  // Save current positions to localStorage and to shared config if available
  const savePositions = () => {
    try {
      localStorage.setItem('thankYouLetterPositions', JSON.stringify(positions));
      
      // If using shared config and there's a callback for updating it
      if (useSharedConfig && sharedConfig && sharedConfig.updatePositions) {
        sharedConfig.updatePositions(positions);
      }
      
      alert('Positions saved successfully!');
    } catch (error) {
      console.error('Error saving positions:', error);
      alert('Error saving positions. Please try again.');
    }
  };
  
  // Load positions from localStorage
  const loadPositions = () => {
    try {
      const savedPositions = localStorage.getItem('thankYouLetterPositions');
      if (savedPositions) {
        setPositions(JSON.parse(savedPositions));
        alert('Positions loaded successfully!');
      } else {
        alert('No saved positions found.');
      }
    } catch (error) {
      console.error('Error loading positions:', error);
      alert('Error loading positions. Please try again.');
    }
  };
  
  // Reset positions to defaults
  const resetPositions = () => {
    if (confirm('Are you sure you want to reset to default positions?')) {
      setPositions({
        addressGroup: {
          top: 3.3, // ~30% of page height (11 inches * 0.30 = 3.3 inches)
          left: 0.5, // Position address group further right to match renewal notice
          width: 4.0, // Wide enough for address fields
          lineSpacing: 0.175, // Reduced spacing to make fields appear closer together
          fontSize: 12,
          fontWeight: "normal",
          fontFamily: "Arial"
        },
        // Month Year date display
        monthYear: {
          top: 2.0, // Position at top of page
          fontSize: 12,
          fontFamily: "Arial"
        },
        // Greeting field
        greeting: {
          top: 6.0, // Position below address
          left: 0.5, // Match address left position
          width: 4.0, // Width for greeting
          fontSize: 14,
          fontWeight: "normal",
          fontFamily: "Arial"
        },
        // Spacing configurations
        spacing: {
          monthYearToAddress: 0.5, // Spacing between Month Year and Address Group
          addressToGreeting: 1.0, // Spacing between Address Group and Greeting
        }
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
          .date-field {
            position: absolute;
            top: ${positions.addressGroup.top - 0.5}in;
            width: 100%;
            text-align: center;
            font-size: 12pt;
            border: 1px dashed blue;
            background-color: rgba(0, 0, 255, 0.1);
            padding: 2px;
          }
          .greeting-field {
            position: absolute;
            top: ${positions.addressGroup.top + positions.addressGroup.lineSpacing * 12}in;
            left: ${positions.addressGroup.left}in;
            font-size: 14pt; 
=            border: 1px dashed purple;
            background-color: rgba(128, 0, 128, 0.1);
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
          <!-- Month Year at top center -->
          <div class="date-field">
            ${sampleSubscriber.monthYear}
          </div>
          
          <!-- Address Group: ID Header, Name & Address -->
          <div class="group" style="top: ${positions.addressGroup.top - 0.2}in; left: ${positions.addressGroup.left - 0.2}in; width: ${positions.addressGroup.width + 0.4}in; height: ${positions.addressGroup.lineSpacing * 6 + 0.4}in;">
            <!-- ID header section with ID and status -->
            <div class="data-field" style="top: 0.2in; left: 0.2in; width: ${positions.addressGroup.width}in; line-height: 1.2;">
              ${sampleSubscriber.id}/${sampleSubscriber.copies}cps/${sampleSubscriber.accountCode}
            </div>
            
            <!-- Name and address block -->
            <div class="data-field" style="top: ${0.2 + positions.addressGroup.lineSpacing}in; left: 0.2in; width: ${positions.addressGroup.width}in; line-height: 1.2;">
              ${sampleSubscriber.title} ${sampleSubscriber.firstName} ${sampleSubscriber.middleName} ${sampleSubscriber.lastName}<br>
              ${sampleSubscriber.company ? `${sampleSubscriber.company}<br>` : ""}
              ${sampleSubscriber.address1 ? `${sampleSubscriber.address1}<br>` : ""}
              ${sampleSubscriber.address2 ? `${sampleSubscriber.address2}<br>` : ""}
              ${sampleSubscriber.address3 ? `${sampleSubscriber.address3}<br>` : ""}
              ${sampleSubscriber.address4 ? `${sampleSubscriber.address4}` : ""}
            </div>
          </div>
          
          <!-- Greeting below address -->
          <div class="greeting-field">
            Dear ${sampleSubscriber.title} ${sampleSubscriber.lastName},
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
      addressGroup: positions.addressGroup
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
          .address-field {
            font-family: ${positions.addressGroup.fontFamily}, sans-serif;
            font-size: ${positions.addressGroup.fontSize}pt;
            font-weight: ${positions.addressGroup.fontWeight};
          }
          .date-field {
            position: absolute;
            top: ${positions.addressGroup.top - 0.5}in;
            width: 8.5in;
            text-align: center;
            font-family: ${positions.addressGroup.fontFamily}, sans-serif;
            font-size: ${positions.addressGroup.fontSize}pt;
            z-index: 1000;
          }
          .greeting-field {
            position: absolute;
            top: ${positions.addressGroup.top + positions.addressGroup.lineSpacing * 12}in;
            left: ${positions.addressGroup.left}in;
            font-family: ${positions.addressGroup.fontFamily}, sans-serif;
            font-size: ${positions.addressGroup.fontSize + 2}pt;
            z-index: 1000;
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
            .data-field, .date-field, .greeting-field {
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
      
      // Determine if we need to adjust positions based on missing fields
      let namePosition = positions.addressGroup.top + positions.addressGroup.lineSpacing;
      let companyPosition = positions.addressGroup.top + positions.addressGroup.lineSpacing * 2;
      let addressStartPosition = positions.addressGroup.top + positions.addressGroup.lineSpacing * 3;
      
      // If company exists but no personal name, use company as the name
      const displayName = subscriber.hasPersonalName ? 
        `${subscriber.title} ${subscriber.firstName} ${subscriber.middleName} ${subscriber.lastName}`.trim() :
        '';
      
      // For the greeting
      const greetingName = subscriber.hasPersonalName ?
        `${subscriber.title} ${subscriber.lastName}` :
        (subscriber.hasCompany ? subscriber.company : "Customer");
      
      // If there's no personal name, company name goes in the name position
      if (!subscriber.hasPersonalName && subscriber.hasCompany) {
        namePosition = positions.addressGroup.top + positions.addressGroup.lineSpacing;
        // Skip the company position since it's now in the name position
        addressStartPosition = positions.addressGroup.top + positions.addressGroup.lineSpacing * 2;
      }
      
      // If there's no company, move address up
      if (!subscriber.hasCompany) {
        addressStartPosition = positions.addressGroup.top + positions.addressGroup.lineSpacing * 2;
      }
      
      overlayHTML += `
        <div class="data-overlay">
          <!-- Month Year centered at top -->
          <div class="date-field">
            ${subscriber.monthYear}
          </div>
          
          <!-- Address Group: ID Header, Name & Address -->
          <div class="data-field address-field" style="top: ${positions.addressGroup.top}in; left: ${positions.addressGroup.left}in; width: ${positions.addressGroup.width}in;">
            ${subscriber.id}/${subscriber.copies}cps/${subscriber.accountCode}
          </div>
      `;
      
      // Add personal name if it exists
      if (subscriber.hasPersonalName) {
        overlayHTML += `
          <div class="data-field address-field" style="top: ${namePosition}in; left: ${positions.addressGroup.left}in; width: ${positions.addressGroup.width}in;">
            ${displayName}
          </div>
        `;
      }
      
      // Add company if it exists (and wasn't already used as the name)
      if (subscriber.hasCompany && subscriber.hasPersonalName) {
        overlayHTML += `
          <div class="data-field address-field" style="top: ${companyPosition}in; left: ${positions.addressGroup.left}in; width: ${positions.addressGroup.width}in;">
            ${subscriber.company}
          </div>
        `;
      } else if (subscriber.hasCompany && !subscriber.hasPersonalName) {
        // Company being used as the name
        overlayHTML += `
          <div class="data-field address-field" style="top: ${namePosition}in; left: ${positions.addressGroup.left}in; width: ${positions.addressGroup.width}in;">
            ${subscriber.company}
          </div>
        `;
      }
      
      // Add address fields with adjusted positions
      if (subscriber.address1) {
        overlayHTML += `
          <div class="data-field address-field" style="top: ${addressStartPosition}in; left: ${positions.addressGroup.left}in; width: ${positions.addressGroup.width}in;">
            ${subscriber.address1}
          </div>
        `;
      }
      
      if (subscriber.address2) {
        overlayHTML += `
          <div class="data-field address-field" style="top: ${addressStartPosition + positions.addressGroup.lineSpacing}in; left: ${positions.addressGroup.left}in; width: ${positions.addressGroup.width}in;">
            ${subscriber.address2}
          </div>
        `;
      }
      
      if (subscriber.address3) {
        overlayHTML += `
          <div class="data-field address-field" style="top: ${addressStartPosition + positions.addressGroup.lineSpacing * 2}in; left: ${positions.addressGroup.left}in; width: ${positions.addressGroup.width}in;">
            ${subscriber.address3}
          </div>
        `;
      }
      
      if (subscriber.address4) {
        overlayHTML += `
          <div class="data-field address-field" style="top: ${addressStartPosition + positions.addressGroup.lineSpacing * 3}in; left: ${positions.addressGroup.left}in; width: ${positions.addressGroup.width}in;">
            ${subscriber.address4}
          </div>
        `;
      }
      
      // Add the "Dear Title Lastname" greeting much lower and larger
      overlayHTML += `
        <div class="greeting-field">
          Dear ${greetingName},
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
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    
    // When iframe loads, write the content and print
    iframe.onload = function() {
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(htmlContent);
      doc.close();
      
      // Add script to handle printing
      const script = doc.createElement('script');
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

  // Use useImperativeHandle to expose methods to parent component
  useImperativeHandle(ref, () => ({
    // Method to get current positions configuration
    getPositions: () => positions,
    
    // Method to generate preview
    generatePreview: () => {
      generatePreview();
    }
  }));

  return (
    <div className="p-4 border rounded shadow-sm bg-white w-[1000px]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Thank You Letter Data Overlay</h3>
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
            <span className="text-xs text-gray-500 italic">Using shared configuration</span>
          )}
        </div>
      </div>

      {/* Reorganized to two-column layout with config on left, preview on right */}
      <div className="flex flex-row w-full gap-4">
        {/* Left side: Configuration */}
        <div className="w-2/5">
          {(showConfig || useSharedConfig) && !useSharedConfig && (
            <div className="mb-6 border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium">Position Configuration</h4>
                <div className="flex gap-2">
                  <Button onClick={savePositions} variant="secondary" size="sm">Save</Button>
                  <Button onClick={loadPositions} variant="secondary" size="sm">Load</Button>
                  <Button onClick={resetPositions} variant="outline" size="sm">Reset</Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4 mb-4">
                {/* Spacing Configuration */}
                <fieldset className="border rounded p-3">
                  <legend className="text-sm font-medium px-1">Spacing Configuration</legend>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs mb-1">Month Year to Address (in)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={positions.spacing.monthYearToAddress} 
                        onChange={(e) => handleGroupPositionChange('spacing', 'monthYearToAddress', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Address to Greeting (in)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={positions.spacing.addressToGreeting} 
                        onChange={(e) => handleGroupPositionChange('spacing', 'addressToGreeting', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                  </div>
                </fieldset>

                {/* Address Group Configuration */}
                <fieldset className="border rounded p-3">
                  <legend className="text-sm font-medium px-1">Address Group</legend>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs mb-1">Top (in)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={positions.addressGroup.top} 
                        onChange={(e) => handleGroupPositionChange('addressGroup', 'top', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Left (in)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={positions.addressGroup.left} 
                        onChange={(e) => handleGroupPositionChange('addressGroup', 'left', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Width (in)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={positions.addressGroup.width} 
                        onChange={(e) => handleGroupPositionChange('addressGroup', 'width', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Line Spacing (in)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={positions.addressGroup.lineSpacing} 
                        onChange={(e) => handleGroupPositionChange('addressGroup', 'lineSpacing', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                  </div>
                  
                  {/* Font settings for Address Group */}
                  <div className="mt-2 border-t pt-2">
                    <div className="text-xs font-medium mb-1">Font Settings</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs mb-1">Size (pt)</label>
                        <input 
                          type="number" 
                          step="1"
                          value={positions.addressGroup.fontSize} 
                          onChange={(e) => handleGroupPositionChange('addressGroup', 'fontSize', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">Weight</label>
                        <select
                          value={positions.addressGroup.fontWeight}
                          onChange={(e) => handleGroupPositionChange('addressGroup', 'fontWeight', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                        >
                          <option value="normal">Normal</option>
                          <option value="bold">Bold</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs mb-1">Font Family</label>
                        <select
                          value={positions.addressGroup.fontFamily}
                          onChange={(e) => handleGroupPositionChange('addressGroup', 'fontFamily', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                        >
                          <option value="Arial">Arial</option>
                          <option value="Times New Roman">Times New Roman</option>
                          <option value="Courier New">Courier New</option>
                          <option value="Verdana">Verdana</option>
                          <option value="Tahoma">Tahoma</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </fieldset>

                {/* Month Year Configuration */}
                <fieldset className="border rounded p-3">
                  <legend className="text-sm font-medium px-1">Month Year</legend>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs mb-1">Top (in)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={positions.monthYear.top} 
                        onChange={(e) => handleGroupPositionChange('monthYear', 'top', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Font Size (pt)</label>
                      <input 
                        type="number" 
                        step="1"
                        value={positions.monthYear.fontSize} 
                        onChange={(e) => handleGroupPositionChange('monthYear', 'fontSize', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Font Family</label>
                      <select
                        value={positions.monthYear.fontFamily}
                        onChange={(e) => handleGroupPositionChange('monthYear', 'fontFamily', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                      >
                        <option value="Arial">Arial</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Courier New">Courier New</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Tahoma">Tahoma</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs mb-1">Spacing to Address Group (in)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={positions.spacing.monthYearToAddress} 
                      onChange={(e) => handleGroupPositionChange('spacing', 'monthYearToAddress', e.target.value)}
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  </div>
                </fieldset>

                {/* Greeting Configuration */}
                <fieldset className="border rounded p-3">
                  <legend className="text-sm font-medium px-1">Greeting</legend>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs mb-1">Top (in)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={positions.greeting.top} 
                        onChange={(e) => handleGroupPositionChange('greeting', 'top', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Left (in)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={positions.greeting.left} 
                        onChange={(e) => handleGroupPositionChange('greeting', 'left', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Width (in)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={positions.greeting.width} 
                        onChange={(e) => handleGroupPositionChange('greeting', 'width', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Font Size (pt)</label>
                      <input 
                        type="number" 
                        step="1"
                        value={positions.greeting.fontSize} 
                        onChange={(e) => handleGroupPositionChange('greeting', 'fontSize', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs mb-1">Font Weight</label>
                      <select
                        value={positions.greeting.fontWeight}
                        onChange={(e) => handleGroupPositionChange('greeting', 'fontWeight', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                      >
                        <option value="normal">Normal</option>
                        <option value="bold">Bold</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Font Family</label>
                      <select
                        value={positions.greeting.fontFamily}
                        onChange={(e) => handleGroupPositionChange('greeting', 'fontFamily', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                      >
                        <option value="Arial">Arial</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Courier New">Courier New</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Tahoma">Tahoma</option>
                      </select>
                    </div>
                  </div>
                </fieldset>
              </div>
              
              <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                <p className="font-medium text-blue-700">Measurement Tips:</p>
                <p className="text-xs text-blue-600">
                  All positions are measured in inches from the top-left corner of the page. 
                  Use the preview button to verify layout before printing.
                </p>
              </div>
            </div>
          )}
          
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <span className="mr-2 text-sm">ID Range:</span>
              <span className="font-medium">{startId || "Start"} - {endId || "End"}</span>
            </div>
            
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm">
                <span className="font-medium">{subscriberCount}</span> subscribers selected for printing
              </div>
              
              <div className="text-xs text-gray-500">
                {subscriberCount > 0 && subscriberCount < 20 && 
                  `Estimated pages: ${subscriberCount} (one subscriber per page)`
                }
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
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
        <div className="w-3/5">
          <div className="border rounded-lg shadow-sm bg-white p-4 h-full">
            <h3 className="text-center font-semibold text-sm mb-3">Live Preview</h3>
            
            <div className="relative flex items-center justify-center overflow-auto border rounded">
              {filteredSubscribers.length > 0 ? (
                <div className="relative w-full bg-gray-50">
                  <div className="mx-auto" style={{
                    width: "100%",
                    maxWidth: "650px", 
                    height: "750px",
                    backgroundColor: "white",
                    margin: "10px auto",
                    boxShadow: "0 0 10px rgba(0,0,0,0.1)",
                    position: "relative",
                    overflow: "hidden"
                  }}>
                    {/* Page representation */}
                    <div style={{
                      position: "absolute",
                      top: "0",
                      left: "0",
                      width: "100%",
                      height: "100%",
                      transform: "scale(0.95)", 
                      transformOrigin: "top center"
                    }}>
                      {/* Real-time preview of the first subscriber */}
                      {(() => {
                        if (filteredSubscribers.length === 0) return null;
                        
                        const subscriber = processSubscriberData(filteredSubscribers[0]);
                        if (!subscriber) return null;
                        
                        // Calculate scale factors to convert inches to pixels in our preview
                        // For a standard 8.5x11 inch page in our container
                        const scaleX = 650 / 8.5; // pixels per inch horizontally
                        const scaleY = 750 / 11;  // pixels per inch vertically
                        
                        // Determine if we need to adjust positions based on missing fields
                        let namePosition = positions.addressGroup.top + positions.addressGroup.lineSpacing;
                        let companyPosition = positions.addressGroup.top + positions.addressGroup.lineSpacing * 2;
                        let addressStartPosition = positions.addressGroup.top + positions.addressGroup.lineSpacing * 3;
                        
                        // If company exists but no personal name, use company as the name
                        const displayName = subscriber.hasPersonalName ? 
                          `${subscriber.title} ${subscriber.firstName} ${subscriber.middleName} ${subscriber.lastName}`.trim() :
                          '';
                        
                        // For the greeting
                        const greetingName = subscriber.hasPersonalName ?
                          `${subscriber.title} ${subscriber.lastName}` :
                          (subscriber.hasCompany ? subscriber.company : "Customer");
                        
                        // If there's no personal name, company name goes in the name position
                        if (!subscriber.hasPersonalName && subscriber.hasCompany) {
                          namePosition = positions.addressGroup.top + positions.addressGroup.lineSpacing;
                          // Skip the company position since it's now in the name position
                          addressStartPosition = positions.addressGroup.top + positions.addressGroup.lineSpacing * 2;
                        }
                        
                        // If there's no company, move address up
                        if (!subscriber.hasCompany) {
                          addressStartPosition = positions.addressGroup.top + positions.addressGroup.lineSpacing * 2;
                        }
                        
                        return (
                          <>
                            {/* Month Year centered at top */}
                            <div 
                              className="absolute bg-blue-50 border border-blue-200 p-1 text-sm font-mono"
                              style={{
                                top: `${(positions.addressGroup.top - positions.spacing.monthYearToAddress) * scaleY}px`,
                                left: '0',
                                width: '100%',
                                textAlign: 'center',
                                fontFamily: positions.addressGroup.fontFamily,
                                fontSize: `${positions.addressGroup.fontSize}px`,
                                fontWeight: positions.addressGroup.fontWeight
                              }}
                            >
                              <div className="absolute text-xs text-blue-500 font-mono -top-4 left-1/2 transform -translate-x-1/2">Month Year</div>
                              {subscriber.monthYear}
                            </div>
                            
                            {/* Address Group */}
                            <div 
                              className="absolute bg-green-50 border border-green-200 p-2 text-sm font-mono"
                              style={{
                                top: `${positions.addressGroup.top * scaleY}px`,
                                left: `${positions.addressGroup.left * scaleX}px`,
                                width: `${positions.addressGroup.width * scaleX}px`,
                                minHeight: `${positions.addressGroup.lineSpacing * 7 * scaleY}px`,
                                fontFamily: positions.addressGroup.fontFamily,
                                fontSize: `${positions.addressGroup.fontSize}px`,
                                fontWeight: positions.addressGroup.fontWeight
                              }}
                            >
                              <div className="absolute text-xs text-green-500 font-mono -top-4 -left-1">Address Group</div>
                              <div style={{
                                position: "absolute",
                                top: "0px",
                                left: "0px",
                                width: "100%"
                              }}>
                                {subscriber.id}/{subscriber.copies}cps/{subscriber.accountCode}
                              </div>
                              
                              {/* Add personal name if it exists */}
                              {subscriber.hasPersonalName && (
                                <div style={{
                                  position: "absolute",
                                  top: `${positions.addressGroup.lineSpacing * scaleY}px`,
                                  left: "0px",
                                  width: "100%"
                                }}>
                                  {displayName}
                                </div>
                              )}
                              
                              {/* Add company if it exists (and wasn't already used as the name) */}
                              {subscriber.hasCompany && subscriber.hasPersonalName && (
                                <div style={{
                                  position: "absolute",
                                  top: `${positions.addressGroup.lineSpacing * 2 * scaleY}px`,
                                  left: "0px",
                                  width: "100%"
                                }}>
                                  {subscriber.company}
                                </div>
                              )}
                              
                              {/* Company being used as the name */}
                              {subscriber.hasCompany && !subscriber.hasPersonalName && (
                                <div style={{
                                  position: "absolute",
                                  top: `${positions.addressGroup.lineSpacing * scaleY}px`,
                                  left: "0px",
                                  width: "100%"
                                }}>
                                  {subscriber.company}
                                </div>
                              )}
                              
                              {/* Address fields with adjusted positions */}
                              {subscriber.address1 && (
                                <div style={{
                                  position: "absolute",
                                  top: `${(addressStartPosition - positions.addressGroup.top) * scaleY}px`,
                                  left: "0px",
                                  width: "100%"
                                }}>
                                  {subscriber.address1}
                                </div>
                              )}
                              
                              {subscriber.address2 && (
                                <div style={{
                                  position: "absolute",
                                  top: `${(addressStartPosition - positions.addressGroup.top + positions.addressGroup.lineSpacing) * scaleY}px`,
                                  left: "0px",
                                  width: "100%"
                                }}>
                                  {subscriber.address2}
                                </div>
                              )}
                              
                              {subscriber.address3 && (
                                <div style={{
                                  position: "absolute",
                                  top: `${(addressStartPosition - positions.addressGroup.top + positions.addressGroup.lineSpacing * 2) * scaleY}px`,
                                  left: "0px",
                                  width: "100%"
                                }}>
                                  {subscriber.address3}
                                </div>
                              )}
                              
                              {subscriber.address4 && (
                                <div style={{
                                  position: "absolute",
                                  top: `${(addressStartPosition - positions.addressGroup.top + positions.addressGroup.lineSpacing * 3) * scaleY}px`,
                                  left: "0px",
                                  width: "100%"
                                }}>
                                  {subscriber.address4}
                                </div>
                              )}
                            </div>
                            
                            {/* Greeting below address */}
                            <div 
                              className="absolute bg-purple-50 border border-purple-200 p-1 text-sm font-mono"
                              style={{
                                top: `${(positions.addressGroup.top + positions.addressGroup.lineSpacing * 12 + positions.spacing.addressToGreeting) * scaleY}px`,
                                left: `${positions.addressGroup.left * scaleX}px`,
                                fontFamily: positions.addressGroup.fontFamily,
                                fontSize: `${parseInt(positions.addressGroup.fontSize) + 2}px`,
                              }}
                            >
                              <div className="absolute text-xs text-purple-500 font-mono -top-4 -left-1">Greeting</div>
                              Dear {greetingName},
                            </div>
                            
                            {/* Page guides */}
                            <div className="absolute text-xs text-gray-400 font-bold" style={{ top: "10px", left: "10px" }}>
                              8.5" × 11"
                            </div>
                            
                            {/* Grid lines for reference - using the scale factors */}
                            <div className="absolute inset-0 pointer-events-none">
                              <div className="h-full w-full opacity-30" style={{
                                backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)',
                                backgroundSize: `${650/8.5}px ${750/11}px` // This makes grid lines at 1-inch intervals
                              }}></div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-4 h-[400px]">
                  <p className="text-gray-500">No subscribers selected to preview</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Select subscribers and specify an ID range to see the preview
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-2 text-center text-xs text-gray-500">
              Live preview shows placement for the first subscriber in your range
            </div>
          </div>
        </div>
      </div>
      
      {previewHTML && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-medium">Thank You Letter Preview</h3>
              <Button onClick={hidePreview} variant="ghost" size="sm">Close</Button>
            </div>
            <div className="flex-grow overflow-auto p-4">
              <iframe
                srcDoc={previewHTML}
                className="w-full h-full border-0"
                title="Thank You Letter Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default ThankYouLetterDataOverlay;
