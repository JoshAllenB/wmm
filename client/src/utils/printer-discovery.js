// WebUSB printer discovery and printing utilities

// Common printer vendor IDs
const PRINTER_VENDORS = {
  EPSON: 0x04b8,
  STAR: 0x0519,
  BIXOLON: 0x1504,
  CUSTOM: 0x0483,
};

// Check if WebUSB is supported and available
export const checkWebUsbSupport = () => {
  const hasWebUsb = 'usb' in navigator;
  const isSecureContext = window.isSecureContext;
  const isLocalhost = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';

  return {
    canAccessUsb: hasWebUsb && (isSecureContext || isLocalhost),
    isSecureContext,
    isLocalhost,
    hasWebUsb
  };
};

// Discover USB printers
export const discoverUsbPrinters = async () => {
  try {
    // Request USB device with printer interface
    const device = await navigator.usb.requestDevice({
      filters: [
        // Common printer vendor IDs
        { vendorId: PRINTER_VENDORS.EPSON },
        { vendorId: PRINTER_VENDORS.STAR },
        { vendorId: PRINTER_VENDORS.BIXOLON },
        { vendorId: PRINTER_VENDORS.CUSTOM },
        // Generic printer class
        { classCode: 0x07 } // Printer class
      ]
    });

    // Get device info
    const deviceInfo = {
      vendorId: device.vendorId,
      productId: device.productId,
      manufacturerName: device.manufacturerName,
      productName: device.productName,
      serialNumber: device.serialNumber,
      type: 'usb'
    };

    return [deviceInfo];
  } catch (error) {
    console.error('Error discovering USB printers:', error);
    if (error.name === 'NotFoundError') {
      throw new Error('No USB printer found. Please make sure your printer is connected and try again.');
    }
    throw error;
  }
};

// Connect to a USB printer
export const connectToUsbPrinter = async (vendorId, productId) => {
  try {
    // Request the specific device
    const device = await navigator.usb.requestDevice({
      filters: [{ vendorId, productId }]
    });

    // Open a connection to the device
    await device.open();
    
    // Select the first configuration
    await device.selectConfiguration(1);
    
    // Claim the first interface
    await device.claimInterface(0);

    return device;
  } catch (error) {
    console.error('Error connecting to USB printer:', error);
    throw error;
  }
};

// Send data to USB printer
export const sendToUsbPrinter = async (device, data) => {
  try {
    // Find the bulk out endpoint
    const endpoint = device.configuration.interfaces[0].alternate.endpoints.find(
      ep => ep.direction === 'out'
    );

    if (!endpoint) {
      throw new Error('No suitable endpoint found for printing');
    }

    // Convert data to Uint8Array if it's not already
    const printData = data instanceof Uint8Array ? data : new TextEncoder().encode(data);

    // Send data in chunks to avoid buffer size limitations
    const chunkSize = endpoint.packetSize;
    for (let i = 0; i < printData.length; i += chunkSize) {
      const chunk = printData.slice(i, i + chunkSize);
      await device.transferOut(endpoint.endpointNumber, chunk);
    }

    // Close the connection
    await device.close();
  } catch (error) {
    console.error('Error sending data to USB printer:', error);
    throw error;
  }
};

// Get printer status
export const getPrinterStatus = async (device) => {
  try {
    // Find the bulk in endpoint
    const endpoint = device.configuration.interfaces[0].alternate.endpoints.find(
      ep => ep.direction === 'in'
    );

    if (!endpoint) {
      throw new Error('No suitable endpoint found for status check');
    }

    // Request status
    const result = await device.transferIn(endpoint.endpointNumber, 1);
    const status = new Uint8Array(result.data.buffer)[0];

    return {
      isOnline: (status & 0x08) === 0,
      hasPaper: (status & 0x20) === 0,
      hasError: (status & 0x40) !== 0,
      isBusy: (status & 0x80) !== 0
    };
  } catch (error) {
    console.error('Error getting printer status:', error);
    throw error;
  }
}; 