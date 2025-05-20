import React from "react";
import { Button } from "../UI/ShadCN/button";

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

  return (
    <div className="flex flex-col space-y-4 w-full max-w-lg mx-auto">
      {/* Add Discover Printers button at the top */}
      <div className="flex justify-center mb-2">
        <Button
          onClick={discoverPrinters}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={isDiscoveringPrinters}
        >
          {isDiscoveringPrinters ? (
            <div className="flex items-center">
              <div className="animate-spin h-4 w-4 mr-2 border-2 border-white rounded-full border-t-transparent"></div>
              <span>Discovering Printers...</span>
            </div>
          ) : (
            'Discover Printers'
          )}
        </Button>
      </div>
      
      {discoveredPrinters.length > 0 && (
        <div className="mb-4">
          <label className="text-sm font-medium mb-1">Discovered Printers:</label>
          <select 
            className="w-full border border-gray-300 rounded p-2 mt-1"
            onChange={handleDiscoveredPrinterSelect}
          >
            <option value="">-- Select a discovered printer --</option>
            {discoveredPrinters.map((printer, index) => (
              <option key={index} value={index}>
                {printer.description} ({printer.type})
              </option>
            ))}
          </select>
        </div>
      )}
      
      <div className="flex flex-col">
        <label className="text-sm font-medium mb-1">Printer Connection Type:</label>
        <div className="flex space-x-4">
          <div className="flex items-center">
            <input
              type="radio"
              id="network-printer"
              name="printerType"
              value="network"
              checked={printerSettings.type === 'network'}
              onChange={() => handlePrinterTypeChange('network')}
              className="mr-2"
            />
            <label htmlFor="network-printer">Network Printer</label>
          </div>
          <div className="flex items-center">
            <input
              type="radio"
              id="usb-printer"
              name="printerType"
              value="usb"
              checked={printerSettings.type === 'usb'}
              onChange={() => handlePrinterTypeChange('usb')}
              className="mr-2"
            />
            <label htmlFor="usb-printer">USB Printer</label>
          </div>
        </div>
      </div>
      
      {/* CUPS/lpr printing option */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="use-cups"
          name="useCups"
          checked={printerSettings.useCups}
          onChange={handleUseCupsChange}
          className="mr-2"
        />
        <label htmlFor="use-cups" className="text-sm">
          Use CUPS/lpr printing (recommended for Linux/Mac)
        </label>
      </div>
      
      {printerSettings.useCups && (
        <div className="flex flex-col">
          <label htmlFor="queue-name" className="text-sm font-medium mb-1">
            Printer Queue Name (optional):
          </label>
          <input
            type="text"
            id="queue-name"
            name="queueName"
            value={printerSettings.queueName}
            onChange={handlePrinterSettingChange}
            placeholder="lp or raw"
            className="border border-gray-300 rounded p-2"
          />
          <p className="text-xs text-gray-600 mt-1">
            If left empty, the system default printer will be used.
          </p>
        </div>
      )}
      
      {printerSettings.type === 'network' && (
        <>
          <div className="flex flex-col">
            <label htmlFor="printer-address" className="text-sm font-medium mb-1">
              IP Address:
            </label>
            <input
              type="text"
              id="printer-address"
              name="address"
              value={printerSettings.address}
              onChange={handlePrinterSettingChange}
              placeholder="192.168.1.100"
              className="border border-gray-300 rounded p-2"
            />
          </div>
          
          <div className="flex flex-col">
            <label htmlFor="printer-port" className="text-sm font-medium mb-1">
              Port:
            </label>
            <input
              type="number"
              id="printer-port"
              name="port"
              value={printerSettings.port}
              onChange={handlePrinterSettingChange}
              placeholder="9100"
              className="border border-gray-300 rounded p-2"
            />
          </div>
        </>
      )}
      
      {printerSettings.type === 'usb' && (
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
          <p className="text-xs text-amber-600">
            Note: USB printing requires the ESC/POS USB driver to be installed on the server.
          </p>
        </>
      )}
      
      <div className="bg-amber-50 border border-amber-200 p-3 rounded-md text-sm">
        <p className="font-medium text-amber-800 mb-1">Important Notes:</p>
        <ul className="list-disc list-inside text-amber-700">
          <li>Make sure the printer is properly connected and turned on</li>
          <li>Network printers must have a static IP address</li>
          <li>For USB printers, the backend server must have physical access to the printer</li>
          <li>If using CUPS/lpr, ensure cups-client is installed on the server</li>
          <li>The CUPS fallback method is more reliable for Linux environments</li>
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