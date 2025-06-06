import escpos from 'escpos';
import escposUSB from 'escpos-usb';

// Attach the USB dependency to escpos
escpos.USB = escposUSB;

// Sample data
const receiptData1 = {
  receiptNumber: '000123-S-06/30/25-2cps/XYZ',
  customerName: 'John Doe',
  address1: '123 Main St',
  address2: 'Apt 4B',
  cityState: 'New York, NY'
};

const receiptData2 = {
  receiptNumber: '000124-S-06/30/25-2cps/XYZ',
  customerName: 'Jane Smith',
  address1: '789 Longstreet Boulevard, Building Complex A',
  address2: 'Suite 1234, Floor 15, West Wing Section',
  cityState: 'San Francisco, CA 94105'
};

// Function to wrap text to a specified width
function wrapText(text, width) {
  if (text.length <= width) return [text];
  
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    if (currentLine.length + word.length + 1 <= width) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

// Function to format a line for duplicate printing with text wrapping
function formatDuplicateLine(leftText, rightText = leftText, columnWidth = 40) {
  const leftLines = wrapText(leftText, columnWidth);
  const rightLines = wrapText(rightText, columnWidth);
  
  const maxLines = Math.max(leftLines.length, rightLines.length);
  let result = '';

  for (let i = 0; i < maxLines; i++) {
    const left = (i < leftLines.length) ? leftLines[i].padEnd(columnWidth, ' ') : ''.padEnd(columnWidth, ' ');
    const right = (i < rightLines.length) ? rightLines[i].padEnd(columnWidth, ' ') : ''.padEnd(columnWidth, ' ');
    result += left + '    ' + right;
    if (i < maxLines - 1) result += '\n'; // Add newline except for last line
  }

  return result;
}

// Step 1: Create the device
const device = new escpos.USB(0x067b, 0x2305); // Vendor ID and Product ID

// Step 2: Create the printer instance with options
const options = { encoding: "ascii" }; // Use ASCII encoding for compatibility
const printer = new escpos.Printer(device, options);

// Step 3: Print duplicate receipts
(async () => {
  try {
    console.log('Connecting to the printer...');
    await new Promise((resolve, reject) => {
      device.open((err) => {
        if (err) reject(err);
        else {
          console.log('Printer connected!');
          resolve();
        }
      });
    });

    console.log('Printing duplicate receipts...');
    await new Promise((resolve, reject) => {
      printer
        .raw(Buffer.from('\x1B\x40')) // ESC @ (Initialize printer)

        // Insert blank lines using line feeds
        .raw(Buffer.from('\x0A'.repeat(12))) // 5 line feeds
        
        // Print content for first receipt
        .raw(Buffer.from('\x1B\x33\x10')) // Sets line spacing to 16 dots
        .text(formatDuplicateLine(receiptData1.receiptNumber))
        .text(formatDuplicateLine(receiptData1.customerName))
        .text(formatDuplicateLine(receiptData1.address1))
        .text(formatDuplicateLine(receiptData1.address2))
        .text(formatDuplicateLine(receiptData1.cityState))
        
        .raw(Buffer.from('\x0A'.repeat(40))) // 10 line feeds
        // Print content for second receipt
        .text(formatDuplicateLine(receiptData2.receiptNumber))
        .text(formatDuplicateLine(receiptData2.customerName))
        .text(formatDuplicateLine(receiptData2.address1))
        .text(formatDuplicateLine(receiptData2.address2))
        .text(formatDuplicateLine(receiptData2.cityState))

        // Cut the paper
        .raw(Buffer.from('\x1B\x69')) // ESC i (Full cut)
        .close(() => {
          console.log('Done!');
          resolve();
        });
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    device.close();
  }
})();