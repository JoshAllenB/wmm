/**
 * Printer Discovery Utility
 * 
 * This script provides functions to automatically discover printers:
 * - USB printers using escpos-usb
 * - Network printers using network scanning
 * - CUPS printers using lpstat command
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { networkInterfaces } from 'os';
import net from 'net';

// Convert exec to promise-based
const execAsync = promisify(exec);

/**
 * Discover USB printers using escpos-usb
 * @returns {Promise<Array>} List of USB printers with vendorId and productId
 */
export async function discoverUsbPrinters() {
  try {
    // Dynamic import for ESM compatibility
    const escposUsb = await import('escpos-usb');
    
    // Find all connected USB printers
    const devices = escposUsb.default.findPrinter();
    
    // Format the results
    return devices.map(device => ({
      type: 'usb',
      vendorId: device.deviceDescriptor.idVendor.toString(16).padStart(4, '0'),
      productId: device.deviceDescriptor.idProduct.toString(16).padStart(4, '0'),
      manufacturer: device.deviceDescriptor.iManufacturer || 'Unknown',
      description: `USB Printer (${device.deviceDescriptor.idVendor.toString(16)}:${device.deviceDescriptor.idProduct.toString(16)})`,
    }));
  } catch (error) {
    console.error('Error discovering USB printers:', error);
    return [];
  }
}

/**
 * Discover CUPS printers using lpstat command
 * @returns {Promise<Array>} List of CUPS printers with queue names
 */
export async function discoverCupsPrinters() {
  try {
    // Run lpstat to get printer list
    const { stdout } = await execAsync('lpstat -p');
    
    // Parse the output
    const printers = [];
    const lines = stdout.split('\n');
    
    for (const line of lines) {
      // Look for lines starting with "printer"
      if (line.startsWith('printer')) {
        // Extract printer name and status
        const match = line.match(/printer\s+(\S+)\s+is\s+(.+)/);
        if (match) {
          printers.push({
            type: 'cups',
            queueName: match[1],
            status: match[2],
            description: `CUPS Printer: ${match[1]} (${match[2]})`,
          });
        }
      }
    }
    
    return printers;
  } catch (error) {
    console.error('Error discovering CUPS printers:', error);
    // Return empty array on error, don't fail completely
    return [];
  }
}

/**
 * Check if a host has an open port
 * @param {string} host - Host IP address
 * @param {number} port - Port number to check
 * @param {number} timeout - Connection timeout in ms
 * @returns {Promise<boolean>} True if port is open
 */
function checkPort(host, port, timeout = 1000) {
  return new Promise(resolve => {
    const socket = new net.Socket();
    let status = false;
    
    // Set timeout
    socket.setTimeout(timeout);
    
    // Handle connection
    socket.on('connect', () => {
      status = true;
      socket.destroy();
    });
    
    // Handle errors and timeouts
    socket.on('error', () => {
      socket.destroy();
    });
    
    socket.on('timeout', () => {
      socket.destroy();
    });
    
    // Resolve when socket is closed
    socket.on('close', () => {
      resolve(status);
    });
    
    // Connect to host
    socket.connect(port, host);
  });
}

/**
 * Scan a network range for printers on common printer ports
 * @param {string} baseIp - Base IP address (e.g., '192.168.1')
 * @param {number} startRange - Start of IP range to scan
 * @param {number} endRange - End of IP range to scan
 * @returns {Promise<Array>} List of potential network printers
 */
export async function scanNetworkForPrinters(baseIp, startRange = 1, endRange = 254) {
  const printers = [];
  const commonPrinterPorts = [9100, 515, 631];
  
  console.log(`Scanning network range ${baseIp}.${startRange}-${endRange} for printers...`);
  
  // Scan the IP range
  for (let i = startRange; i <= endRange; i++) {
    const ip = `${baseIp}.${i}`;
    
    // Check each common printer port
    for (const port of commonPrinterPorts) {
      try {
        const isOpen = await checkPort(ip, port);
        if (isOpen) {
          printers.push({
            type: 'network',
            address: ip,
            port: port,
            description: `Network Printer at ${ip}:${port}`,
          });
          // Once we find an open port, no need to check others
          break;
        }
      } catch (error) {
        // Ignore errors and continue scanning
      }
    }
  }
  
  return printers;
}

/**
 * Get local network information to determine scan range
 * @returns {Array} List of network interfaces with IP and subnet
 */
export function getLocalNetworks() {
  const interfaces = networkInterfaces();
  const networks = [];
  
  // Process each network interface
  Object.keys(interfaces).forEach(ifName => {
    interfaces[ifName].forEach(iface => {
      // Only include IPv4 addresses that are not internal
      if (iface.family === 'IPv4' && !iface.internal) {
        // Extract the base IP (e.g., '192.168.1' from '192.168.1.5')
        const ipParts = iface.address.split('.');
        const baseIp = ipParts.slice(0, 3).join('.');
        
        networks.push({
          name: ifName,
          address: iface.address,
          baseIp: baseIp,
        });
      }
    });
  });
  
  return networks;
}

/**
 * Discover all available printers (USB, Network, CUPS)
 * @param {boolean} includeNetworkScan - Whether to include network scanning
 * @returns {Promise<Object>} Object with categorized printer lists
 */
export async function discoverAllPrinters(includeNetworkScan = false) {
  // Start all discovery processes in parallel
  const [usbPrinters, cupsPrinters] = await Promise.all([
    discoverUsbPrinters(),
    discoverCupsPrinters(),
  ]);
  
  // Network scanning is optional as it can be slow
  let networkPrinters = [];
  if (includeNetworkScan) {
    const networks = getLocalNetworks();
    // Scan each network
    for (const network of networks) {
      const printers = await scanNetworkForPrinters(network.baseIp);
      networkPrinters = [...networkPrinters, ...printers];
    }
  }
  
  return {
    usb: usbPrinters,
    network: networkPrinters,
    cups: cupsPrinters,
    all: [...usbPrinters, ...networkPrinters, ...cupsPrinters],
  };
}

// If this script is run directly, perform discovery and print results
if (import.meta.url === import.meta.main) {
  console.log('Printer Discovery Utility');
  console.log('========================');
  
  try {
    console.log('Discovering printers...');
    const printers = await discoverAllPrinters(true);
    
    console.log('\nUSB Printers:');
    if (printers.usb.length === 0) {
      console.log('  No USB printers found');
    } else {
      printers.usb.forEach((printer, index) => {
        console.log(`  ${index + 1}. ${printer.description} (VendorID: 0x${printer.vendorId}, ProductID: 0x${printer.productId})`);
      });
    }
    
    console.log('\nNetwork Printers:');
    if (printers.network.length === 0) {
      console.log('  No network printers found');
    } else {
      printers.network.forEach((printer, index) => {
        console.log(`  ${index + 1}. ${printer.description} (${printer.address}:${printer.port})`);
      });
    }
    
    console.log('\nCUPS Printers:');
    if (printers.cups.length === 0) {
      console.log('  No CUPS printers found');
    } else {
      printers.cups.forEach((printer, index) => {
        console.log(`  ${index + 1}. ${printer.description}`);
      });
    }
    
    console.log('\nTotal printers found:', printers.all.length);
  } catch (error) {
    console.error('Error during printer discovery:', error);
  }
} 