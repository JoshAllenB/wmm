import React, { useState, useEffect } from "react";
import { Button } from "../UI/ShadCN/button";
import { Checkbox } from "../UI/ShadCN/checkbox";
import { toast } from "react-hot-toast";

// Custom hook for managing label adjustments
const useLabelAdjustments = () => {
  const [labelAdjustments, setLabelAdjustments] = useState({
    labelWidthIn: 3.5, // inches (known working width)
    topMargin: 4, // lines (known working: 4 lines = ~0.67 inches)
    rowSpacing: 14, // lines (known working: 14 lines = ~1.87 inches spacing)
    col2X: 255, // dots (known working: col1X=0, col2X=255)
  });

  const getAdjustments = () => labelAdjustments;

  return {
    labelAdjustments,
    setLabelAdjustments,
    getAdjustments,
  };
};

const useRawPrinter = (callbacks = {}) => {
  const [printers, setPrinters] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState("");
  const [printerCategories, setPrinterCategories] = useState({
    installed: [],
    network: [],
    usb: [],
    shared: [],
    other: [],
  });

  // Enhanced printer discovery function
  const discoverPrinters = async () => {
    if (!window.JSPM || !window.JSPM.JSPrintManager) {
      throw new Error("JSPrintManager not available");
    }

    setIsScanning(true);
    setScanProgress("Initializing printer discovery...");

    try {
      // Get all available printers using the standard getPrinters method
      setScanProgress("Scanning for printers...");
      const allPrinters = await window.JSPM.JSPrintManager.getPrinters();
      toast.success(`Found ${allPrinters.length} printers`);

      if (!allPrinters || allPrinters.length === 0) {
        setScanProgress("No printers found");
        setPrinterCategories({
          installed: [],
          network: [],
          usb: [],
          shared: [],
          other: [],
        });
        setPrinters([]);
        return;
      }

      // Categorize printers based on their names and properties
      const categorized = categorizePrinters(allPrinters);
      toast.success(
        `Categorized ${
          categorized.installed.length +
          categorized.network.length +
          categorized.usb.length +
          categorized.shared.length +
          categorized.other.length
        } printers`
      );

      // Add connection type information to each printer
      const enhancedPrinters = categorized.installed
        .concat(categorized.network)
        .concat(categorized.usb)
        .concat(categorized.shared)
        .concat(categorized.other)
        .map((printer) => ({
          ...printer,
          connectionType: getPrinterConnectionType(printer, categorized),
          category: getPrinterCategory(printer, categorized),
        }));

      setPrinterCategories(categorized);
      setPrinters(enhancedPrinters);
      setScanProgress(`Found ${enhancedPrinters.length} printers`);

      toast.success(
        `Enhanced ${enhancedPrinters.length} printers with connection types`
      );
    } catch (error) {
      console.error("Error during printer discovery:", error);
      setInitError(`Printer discovery failed: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Helper function to categorize printers based on name patterns
  const categorizePrinters = (printers) => {
    const categories = {
      installed: [],
      network: [],
      usb: [],
      shared: [],
      other: [],
    };

    // Handle different printer data formats from JSPrintManager
    const normalizedPrinters = printers.map((printer, index) => {
      let printerName = "";

      // Check if printer is a string (direct printer name)
      if (typeof printer === "string") {
        printerName = printer;
      }
      // Check if printer is an array of characters (JSPrintManager sometimes returns this)
      else if (Array.isArray(printer)) {
        printerName = printer.join("");
      }
      // Check if printer is an object with a name property
      else if (printer && typeof printer === "object" && printer.name) {
        printerName = printer.name;
      }
      // Fallback: use index as name
      else {
        printerName = `Printer ${index + 1}`;
      }

      return {
        name: printerName,
        originalData: printer,
      };
    });

    normalizedPrinters.forEach((printer) => {
      const name = printer.name.toLowerCase();

      // Network printer indicators
      if (
        name.includes("network") ||
        name.includes("ethernet") ||
        name.includes("wifi") ||
        name.includes("wireless") ||
        name.includes("ip") ||
        name.includes("tcp") ||
        name.includes("http") ||
        name.includes("://") ||
        name.includes("\\") ||
        name.includes("//")
      ) {
        categories.network.push(printer);
      }
      // USB printer indicators
      else if (
        name.includes("usb") ||
        name.includes("serial") ||
        name.includes("com") ||
        name.includes("lpt") ||
        name.includes("parallel")
      ) {
        categories.usb.push(printer);
      }
      // Shared printer indicators
      else if (
        name.includes("shared") ||
        name.includes("\\") ||
        name.includes("//") ||
        name.includes("smb") ||
        name.includes("cifs")
      ) {
        categories.shared.push(printer);
      }
      // Default to installed (local) printers
      else {
        categories.installed.push(printer);
      }
    });

    return categories;
  };

  // Helper function to determine printer connection type
  const getPrinterConnectionType = (printer, categories) => {
    if (categories.installed.some((p) => p.name === printer.name))
      return "Installed";
    if (categories.network.some((p) => p.name === printer.name))
      return "Network";
    if (categories.usb.some((p) => p.name === printer.name)) return "USB";
    if (categories.shared.some((p) => p.name === printer.name)) return "Shared";
    return "Unknown";
  };

  // Helper function to get printer category
  const getPrinterCategory = (printer, categories) => {
    if (categories.installed.some((p) => p.name === printer.name))
      return "installed";
    if (categories.network.some((p) => p.name === printer.name))
      return "network";
    if (categories.usb.some((p) => p.name === printer.name)) return "usb";
    if (categories.shared.some((p) => p.name === printer.name)) return "shared";
    return "other";
  };

  // Get printer details and capabilities
  const getPrinterDetails = async (printerName) => {
    if (!window.JSPM || !window.JSPM.JSPrintManager) {
      throw new Error("JSPrintManager not available");
    }

    try {
      // Create a printer instance
      const printer = new window.JSPM.InstalledPrinter(printerName);

      // Get basic printer information
      const details = {
        name: printerName,
        type: "Installed Printer",
        status: "Available",
        capabilities: {
          // Basic capabilities that most printers support
          rawPrinting: true,
          textPrinting: true,
          binaryCommands: true,
        },
        // Add any additional properties that might be available
        properties: {
          // These are common printer properties
          isDefault: false, // Would need to check against default printer
          isNetwork:
            printerName.toLowerCase().includes("network") ||
            printerName.toLowerCase().includes("ethernet") ||
            printerName.toLowerCase().includes("wifi"),
          isUSB:
            printerName.toLowerCase().includes("usb") ||
            printerName.toLowerCase().includes("serial"),
          isShared:
            printerName.toLowerCase().includes("shared") ||
            printerName.includes("\\") ||
            printerName.includes("//"),
        },
      };

      // Try to get additional information if available
      try {
        // Check if printer has any additional methods
        if (typeof printer.getStatus === "function") {
          details.status = await printer.getStatus();
        }

        if (typeof printer.getCapabilities === "function") {
          details.capabilities = await printer.getCapabilities();
        }
      } catch (methodError) {
        console.log("Some printer methods not available:", methodError.message);
      }

      return details;
    } catch (error) {
      console.error("Error getting printer details:", error);
      return {
        name: printerName,
        type: "Unknown",
        status: "Error",
        error: error.message,
        capabilities: {
          rawPrinting: true, // Assume basic capabilities
          textPrinting: true,
          binaryCommands: true,
        },
      };
    }
  };

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 50; // 5 seconds maximum wait time

    const initializeJSPrintManager = () => {
      if (window.JSPM && window.JSPM.JSPrintManager) {
        // Set WebSocket settings as per documentation
        window.JSPM.JSPrintManager.auto_reconnect = true;

        // Start the connection first
        window.JSPM.JSPrintManager.start()
          .then(() => {
            toast.success("JSPrintManager started successfully");

            // Set up status change handler after connection is established
            if (window.JSPM.JSPrintManager.WS) {
              window.JSPM.JSPrintManager.WS.onStatusChanged = function () {
                if (jspmWSStatus()) {
                  // Perform enhanced printer discovery
                  discoverPrinters()
                    .then(() => {
                      setIsReady(true);
                    })
                    .catch((error) => {
                      console.error("Error during printer discovery:", error);
                      setInitError("Error discovering printers");
                    });
                }
              };

              // Check initial status
              if (jspmWSStatus()) {
                discoverPrinters()
                  .then(() => {
                    setIsReady(true);
                  })
                  .catch((error) => {
                    console.error("Error during printer discovery:", error);
                    setInitError("Error discovering printers");
                  });
              }
            }
          })
          .catch((error) => {
            console.error("JSPrintManager error:", error);
            setInitError("Error: JSPrintManager not available");
          });
      } else if (retryCount < maxRetries) {
        retryCount++;
        // Retry after a short delay if JSPrintManager is not yet available
        setTimeout(initializeJSPrintManager, 100);
      } else {
        toast.error(
          "JSPrintManager not found after maximum retries. Please ensure the JSPrintManager library is loaded."
        );
        setInitError("JSPrintManager library not loaded");
      }
    };

    // Check JSPM WebSocket status
    const jspmWSStatus = () => {
      if (window.JSPM && window.JSPM.JSPrintManager) {
        if (
          window.JSPM.JSPrintManager.websocket_status ===
          window.JSPM.WSStatus.Open
        )
          return true;
        else if (
          window.JSPM.JSPrintManager.websocket_status ===
          window.JSPM.WSStatus.Closed
        ) {
          toast.error(
            "JSPrintManager (JSPM) is not installed or not running! Download JSPM Client App from https://neodynamic.com/downloads/jspm"
          );
          setInitError("JSPrintManager client app not running");
          return false;
        } else if (
          window.JSPM.JSPrintManager.websocket_status ===
          window.JSPM.WSStatus.Blocked
        ) {
          console.warn("JSPM has blocked this website!");
          setInitError("JSPrintManager has blocked this website");
          return false;
        }
      }
      return false;
    };

    initializeJSPrintManager();
  }, []);

  return {
    printers,
    isReady,
    initError,
    isScanning,
    scanProgress,
    printerCategories,
    discoverPrinters,
    getPrinterDetails,
  };
};

const RawPrinterControls = ({
  startClientId,
  endClientId,
  startPosition,
  rows,
  selectedFields,
  userRole,
  subscriptionType,
  rowsPerPage = 3,
  columnsPerPage = 2,
  labelAdjustments,
  setLabelAdjustments,
  onPositionChange, // Callback to notify parent of position changes
  setSelectedFields, // Callback to update selectedFields in parent
  onPrinterChange, // Callback to notify parent of printer selection changes
  selectedPrinter: externalSelectedPrinter, // External selected printer from template
}) => {
  const [selectedPrinter, setSelectedPrinter] = useState(
    externalSelectedPrinter || ""
  );

  // Notify parent component when adjustments change
  useEffect(() => {
    if (onPositionChange) {
      onPositionChange(labelAdjustments);
    }
  }, [labelAdjustments, onPositionChange]);

  // Update internal selectedPrinter when external prop changes
  useEffect(() => {
    if (
      externalSelectedPrinter &&
      externalSelectedPrinter !== selectedPrinter
    ) {
      setSelectedPrinter(externalSelectedPrinter);
    }
  }, [externalSelectedPrinter]);

  // Notify parent component when printer selection changes
  useEffect(() => {
    if (onPrinterChange) {
      onPrinterChange(selectedPrinter);
    }
  }, [selectedPrinter, onPrinterChange]);

  const {
    printers,
    isReady,
    initError,
    isScanning,
    scanProgress,
    printerCategories,
    discoverPrinters,
  } = useRawPrinter({});

  // Auto-select first available printer (only if no external printer is set)
  useEffect(() => {
    // Only auto-select if:
    // 1. JSPrintManager is ready
    // 2. We have printers available
    // 3. No printer is currently selected
    // 4. No external printer is provided (template should always override)
    if (
      isReady &&
      printers.length > 0 &&
      !selectedPrinter &&
      !externalSelectedPrinter
    ) {
      // Get the first available printer from any category
      const allPrinters = [
        ...printerCategories.installed,
        ...printerCategories.network,
        ...printerCategories.usb,
        ...printerCategories.shared,
        ...printerCategories.other,
      ];

      if (allPrinters.length > 0) {
        setSelectedPrinter(allPrinters[0].name);
      }
    }
  }, [isReady, printers, printerCategories, externalSelectedPrinter]);

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <h4 className="font-medium mb-3 text-gray-800">Raw Printer Controls</h4>

      {/* Printer Selection */}
      <div className="mb-4">
        <h5 className="text-sm font-medium text-gray-700 mb-2">
          Printer Selection
        </h5>

        {/* Printer Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Select Printer:
            </label>
            <Button
              onClick={discoverPrinters}
              disabled={isScanning || !isReady}
              variant="ghost"
              size="sm"
              className="text-xs"
            >
              {isScanning ? (
                <div className="flex items-center gap-1">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                  <span>Scanning...</span>
                </div>
              ) : (
                "Refresh"
              )}
            </Button>
          </div>

          {/* Scan Progress */}
          {isScanning && scanProgress && (
            <div className="mb-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
              {scanProgress}
            </div>
          )}

          {/* Printer Categories */}
          <div className="space-y-2">
            {/* Installed Printers */}
            {printerCategories.installed.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  📋 Installed Printers
                </label>
                <select
                  value={selectedPrinter}
                  onChange={(e) => setSelectedPrinter(e.target.value)}
                  disabled={!isReady || isScanning}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">Select Installed Printer</option>
                  {printerCategories.installed.map((p, index) => (
                    <option key={`installed-${p.name}-${index}`} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Network Printers */}
            {printerCategories.network.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  🌐 Network Printers
                </label>
                <select
                  value={selectedPrinter}
                  onChange={(e) => setSelectedPrinter(e.target.value)}
                  disabled={!isReady || isScanning}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">Select Network Printer</option>
                  {printerCategories.network.map((p, index) => (
                    <option key={`network-${p.name}-${index}`} value={p.name}>
                      {p.name} (Network)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* USB Printers */}
            {printerCategories.usb.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  🔌 USB Printers
                </label>
                <select
                  value={selectedPrinter}
                  onChange={(e) => setSelectedPrinter(e.target.value)}
                  disabled={!isReady || isScanning}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">Select USB Printer</option>
                  {printerCategories.usb.map((p, index) => (
                    <option key={`usb-${p.name}-${index}`} value={p.name}>
                      {p.name} (USB)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Shared Printers */}
            {printerCategories.shared.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  🤝 Shared Printers
                </label>
                <select
                  value={selectedPrinter}
                  onChange={(e) => setSelectedPrinter(e.target.value)}
                  disabled={!isReady || isScanning}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">Select Shared Printer</option>
                  {printerCategories.shared.map((p, index) => (
                    <option key={`shared-${p.name}-${index}`} value={p.name}>
                      {p.name} (Shared)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Combined List (if no categories have printers) */}
            {Object.values(printerCategories).every(
              (category) => category.length === 0
            ) &&
              printers.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    🖨️ Available Printers
                  </label>
                  <select
                    value={selectedPrinter}
                    onChange={(e) => setSelectedPrinter(e.target.value)}
                    disabled={!isReady || isScanning}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="">Select Printer</option>
                    {printers.map((p, index) => (
                      <option key={`${p.name}-${index}`} value={p.name}>
                        {p.name}{" "}
                        {p.connectionType ? `(${p.connectionType})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
          </div>
        </div>

        {!isReady && (
          <p className="text-xs text-orange-600 mt-1">
            {isScanning
              ? "Scanning for printers..."
              : "Initializing JSPrintManager..."}
          </p>
        )}
      </div>

      {/* Label Adjustment Controls */}
      <div className="mb-4">
        <h5 className="text-sm font-medium text-gray-700 mb-2">
          Label Adjustments
        </h5>

        {/* Cell Number Toggle */}
        <div className="mb-3 p-3 bg-white rounded border">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="cellno-toggle"
              checked={selectedFields.includes("cellno")}
              onCheckedChange={(checked) => {
                const newSelectedFields = checked
                  ? [...selectedFields.filter((f) => f !== "cellno"), "cellno"]
                  : selectedFields.filter((f) => f !== "cellno");
                // Update selectedFields in parent component
                if (setSelectedFields) {
                  setSelectedFields(newSelectedFields);
                }
              }}
            />
            <label
              htmlFor="cellno-toggle"
              className="text-sm font-medium text-gray-700"
            >
              Include Cell Numbers
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            When checked, contact information (cell and office numbers) will be
            included in the printed labels.
          </p>
        </div>

        {/* Adjustment Controls */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Label Width (inches)
            </label>
            <input
              type="number"
              step="0.1"
              value={labelAdjustments.labelWidthIn}
              onChange={(e) =>
                setLabelAdjustments((prev) => ({
                  ...prev,
                  labelWidthIn: parseFloat(e.target.value) || 3.5,
                }))
              }
              className="w-full p-1 text-sm border border-gray-300 rounded"
              min="2.0"
              max="5.0"
            />
            <div className="text-xs text-gray-500 mt-1">
              {labelAdjustments.labelWidthIn}" width
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Top Margin (lines)
            </label>
            <input
              type="number"
              value={labelAdjustments.topMargin}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setLabelAdjustments((prev) => ({
                  ...prev,
                  topMargin: isNaN(value) ? prev.topMargin : value,
                }));
              }}
              className="w-full p-1 text-sm border border-gray-300 rounded"
              min="0"
              max="20"
            />
            <div className="text-xs text-gray-500 mt-1">
              {(labelAdjustments.topMargin / 6).toFixed(2)}" margin
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Row Spacing (lines)
            </label>
            <input
              type="number"
              value={labelAdjustments.rowSpacing}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setLabelAdjustments((prev) => ({
                  ...prev,
                  rowSpacing: isNaN(value) ? prev.rowSpacing : value,
                }));
              }}
              className="w-full p-1 text-sm border border-gray-300 rounded"
              min="0"
              max="30"
            />
            <div className="text-xs text-gray-500 mt-1">
              {(labelAdjustments.rowSpacing / 6).toFixed(2)}" spacing
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Right Column Position (col2X dots)
            </label>
            <input
              type="number"
              value={labelAdjustments.col2X}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setLabelAdjustments((prev) => ({
                  ...prev,
                  col2X: isNaN(value) ? prev.col2X : value,
                }));
              }}
              className="w-full p-1 text-sm border border-gray-300 rounded"
              min="10"
              max="260"
            />
            <div className="text-xs text-gray-500 mt-1">
              {(labelAdjustments.col2X / 120).toFixed(2)}" from left edge
            </div>
          </div>
        </div>
      </div>

      {/* Status */}
      {initError && (
        <div className="text-sm p-2 rounded bg-red-100 text-red-700 border border-red-200">
          {initError}
        </div>
      )}
    </div>
  );
};

export default RawPrinterControls;
