import React, { useEffect, useState } from "react";
import { Button } from "../UI/ShadCN/button";
import { checkWebUsbSupport, discoverUsbPrinters, connectToUsbPrinter, sendToUsbPrinter, getPrinterStatus } from "../../utils/printer-discovery";

const PrinterSettings = ({ 
  printerSettings, 
  setPrinterSettings, 
  isDiscoveringPrinters,
  discoveredPrinters,
  discoverPrinters,
  handleDiscoveredPrinterSelect,
  isLoading,
  executePrintJob,
  onClose
}) => {
  const [usbSupport, setUsbSupport] = useState(null);
  const [printerStatus, setPrinterStatus] = useState(null);

  useEffect(() => {
    // Check USB support when component mounts
    setUsbSupport(checkWebUsbSupport());
  }, []);

  // Handle printer settings change
  const handlePrinterSettingChange = (e) => {
    const { name, value } = e.target;
    const newSettings = {
      ...printerSettings,
      [name]: value,
    };
    setPrinterSettings(newSettings);
    
    // Save to localStorage for persistence
    try {
      localStorage.setItem('dotMatrixPrinterSettings', JSON.stringify(newSettings));
    } catch (e) {
      console.error('Error saving printer settings:', e);
    }
  };

  // Handle printer type change
  const handlePrinterTypeChange = (type) => {
    const newSettings = {
      ...printerSettings,
      type,
    };
    setPrinterSettings(newSettings);
    
    // Save to localStorage for persistence
    try {
      localStorage.setItem('dotMatrixPrinterSettings', JSON.stringify(newSettings));
    } catch (e) {
      console.error('Error saving printer settings:', e);
    }
  };

  // Handle CUPS option toggle
  const handleUseCupsChange = (e) => {
    const newSettings = {
      ...printerSettings,
      useCups: e.target.checked
    };
    setPrinterSettings(newSettings);
    
    // Save to localStorage
    try {
      localStorage.setItem('dotMatrixPrinterSettings', JSON.stringify(newSettings));
    } catch (e) {
      console.error('Error saving printer settings:', e);
    }
  };

  // Discover USB printers
  const handleDiscoverUsbPrinters = async () => {
    try {
      const printers = await discoverUsbPrinters();
      if (printers.length > 0) {
        // Update printer settings with the first discovered printer
        const printer = printers[0];
        const newSettings = {
          ...printerSettings,
          type: 'usb',
          vendorId: printer.vendorId,
          productId: printer.productId,
          useCups: false
        };
        setPrinterSettings(newSettings);
        
        // Save to localStorage
        try {
          localStorage.setItem('dotMatrixPrinterSettings', JSON.stringify(newSettings));
        } catch (e) {
          console.error('Error saving printer settings:', e);
        }
      }
    } catch (error) {
      console.error('Error discovering USB printers:', error);
      alert(error.message);
    }
  };

  // Check printer status
  const handleCheckPrinterStatus = async () => {
    if (printerSettings.type !== 'usb' || !printerSettings.vendorId || !printerSettings.productId) {
      alert('Please select a USB printer first');
      return;
    }

    try {
      const device = await connectToUsbPrinter(
        parseInt(printerSettings.vendorId, 16),
        parseInt(printerSettings.productId, 16)
      );
      const status = await getPrinterStatus(device);
      setPrinterStatus(status);
    } catch (error) {
      console.error('Error checking printer status:', error);
      alert(error.message);
    }
  };

  return (
    <div className="flex flex-col space-y-4 w-full max-w-lg mx-auto">
      {/* Add Discover Printers button at the top */}
      <div className="flex justify-center mb-2">
        <Button
          onClick={handleDiscoverUsbPrinters}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={!usbSupport?.canAccessUsb}
        >
          Discover USB Printers
        </Button>
      </div>
      
      {/* Printer Status */}
      {printerStatus && (
        <div className="bg-gray-50 border border-gray-200 p-3 rounded-md text-sm">
          <p className="font-medium text-gray-800 mb-1">Printer Status:</p>
          <ul className="list-disc list-inside text-gray-700">
            <li>Online: {printerStatus.isOnline ? 'Yes' : 'No'}</li>
            <li>Has Paper: {printerStatus.hasPaper ? 'Yes' : 'No'}</li>
            <li>Has Error: {printerStatus.hasError ? 'Yes' : 'No'}</li>
            <li>Busy: {printerStatus.isBusy ? 'Yes' : 'No'}</li>
          </ul>
        </div>
      )}
      
      <div className="flex flex-col">
        <label className="text-sm font-medium mb-1">Printer Connection Type:</label>
        <div className="flex space-x-4">
          <div className="flex items-center">
            <input
              type="radio"
              id="usb-printer"
              name="printerType"
              value="usb"
              checked={printerSettings.type === 'usb'}
              onChange={() => handlePrinterTypeChange('usb')}
              className="mr-2"
              disabled={!usbSupport?.canAccessUsb}
            />
            <label htmlFor="usb-printer" className={!usbSupport?.canAccessUsb ? "text-gray-500" : ""}>
              USB Printer
            </label>
          </div>
        </div>
      </div>
      
      {/* USB Support Warning */}
      {!usbSupport?.canAccessUsb && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-md text-sm">
          <p className="font-medium text-red-800 mb-1">USB Access Not Available:</p>
          <ul className="list-disc list-inside text-red-700">
            <li>Web USB requires either HTTPS or localhost access</li>
            <li>For LAN environments, consider using one of these options:</li>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>Access the application via localhost (http://localhost:port)</li>
              <li>Use HTTPS for secure access</li>
            </ul>
          </ul>
        </div>
      )}
      
      {printerSettings.type === 'usb' && usbSupport?.canAccessUsb && (
        <>
          <div className="flex flex-col">
            <label htmlFor="vendor-id" className="text-sm font-medium mb-1">
              Vendor ID (hex):
            </label>
            <input
              type="text"
              id="vendor-id"
              name="vendorId"
              value={printerSettings.vendorId}
              onChange={handlePrinterSettingChange}
              placeholder="0x04b8"
              className="border border-gray-300 rounded p-2"
            />
          </div>
          
          <div className="flex flex-col">
            <label htmlFor="product-id" className="text-sm font-medium mb-1">
              Product ID (hex):
            </label>
            <input
              type="text"
              id="product-id"
              name="productId"
              value={printerSettings.productId}
              onChange={handlePrinterSettingChange}
              placeholder="0x0202"
              className="border border-gray-300 rounded p-2"
            />
          </div>

          <Button
            onClick={handleCheckPrinterStatus}
            className="bg-gray-600 hover:bg-gray-700 text-white"
          >
            Check Printer Status
          </Button>
        </>
      )}
      
      <div className="bg-amber-50 border border-amber-200 p-3 rounded-md text-sm">
        <p className="font-medium text-amber-800 mb-1">Important Notes:</p>
        <ul className="list-disc list-inside text-amber-700">
          <li>Make sure the printer is properly connected and turned on</li>
          <li>For USB printers in LAN environments:</li>
          <ul className="list-disc list-inside ml-4 mt-1">
            <li>Access the application via localhost (http://localhost:port)</li>
            <li>Or use HTTPS for secure access</li>
          </ul>
        </ul>
      </div>
      
      <div className="flex justify-center space-x-4 mt-4">
        <Button
          onClick={executePrintJob}
          className="bg-green-600 hover:bg-green-700 text-white"
          disabled={isLoading}
        >
          {isLoading ? 'Printing...' : 'Send to Printer'}
        </Button>
        
        <Button
          onClick={onClose}
          variant="secondary"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default PrinterSettings; 