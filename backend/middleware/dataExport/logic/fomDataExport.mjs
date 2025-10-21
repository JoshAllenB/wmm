import mongoose from "mongoose";
import ExcelJS from "exceljs";
import dotenv from "dotenv";
import FomModel from "../../../models/fom.mjs";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import chalk from "chalk";
import cliProgress from "cli-progress";

dotenv.config();

/**
 * Determines which quarter a date belongs to
 * @param {Date} date - The date to check
 * @returns {number} Quarter number (1-4)
 */
function getQuarter(date) {
  const month = date.getMonth() + 1; // getMonth() returns 0-11, we need 1-12
  if (month >= 1 && month <= 3) return 1;
  if (month >= 4 && month <= 6) return 2;
  if (month >= 7 && month <= 9) return 3;
  if (month >= 10 && month <= 12) return 4;
  return 0; // fallback
}

/**
 * Process FOM data and generate quarterly report
 * @param {number} year - Year (e.g., 2025)
 * @param {string} reportDate - Report date string (e.g., "23 Sept. 2025")
 * @param {Object} io - Socket.io instance for real-time updates
 * @param {string} userId - User ID for targeted notifications
 */
export async function processFomQuarterlyReport(
  year,
  reportDate,
  io = null,
  userId = null
) {
  const sendProgressUpdate = (message, progress = null) => {
    console.log(chalk.cyan(message));
    if (io && userId) {
      io.emit(`export-progress-${userId}`, { message, progress });
    }
  };

  console.log(
    chalk.bold.blue(
      `\n========== STARTING FOM QUARTERLY REPORT GENERATION FOR ${year} ==========\n`
    )
  );

  // Connect to the database
  sendProgressUpdate("Connecting to MongoDB database...");
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME_CLIENT,
    });
    sendProgressUpdate("✅ Database connection successful");
  } catch (error) {
    console.error(chalk.red("❌ Database connection failed:"), error.message);
    throw error;
  }

  try {
    // Step 1: Retrieve all FOM data for the specified year
    sendProgressUpdate("Retrieving FOM data from database...");

    // Get all FOM records for the year
    const allFomData = await FomModel.find({}).lean();

    // Filter FOM data for the specified year based on recvdate
    const yearFomData = allFomData.filter((record) => {
      try {
        const recvDate = new Date(record.recvdate);
        return recvDate.getFullYear() === year;
      } catch (error) {
        console.log(
          chalk.red(`Error parsing date "${record.recvdate}": ${error.message}`)
        );
        return false;
      }
    });

    sendProgressUpdate(
      `✅ Retrieved ${yearFomData.length} FOM records for year ${year}`
    );

    // Step 2: Group data by donation amount and quarter
    sendProgressUpdate("Processing donation data by amount and quarter...");

    // Predefined donation amounts (rows 6-13)
    const predefinedAmounts = [100, 500, 1000, 2000, 3000, 5000, 7000, 10000];

    // Initialize data structure
    const quarterlyData = {
      predefined: {},
      custom: {},
      totals: {
        q1: { qty: 0, amount: 0 },
        q2: { qty: 0, amount: 0 },
        q3: { qty: 0, amount: 0 },
        q4: { qty: 0, amount: 0 },
        yearTotal: { qty: 0, amount: 0 },
      },
    };

    // Initialize predefined amounts
    predefinedAmounts.forEach((amount) => {
      quarterlyData.predefined[amount] = {
        qty: 0,
        q1: { qty: 0, amount: 0 },
        q2: { qty: 0, amount: 0 },
        q3: { qty: 0, amount: 0 },
        q4: { qty: 0, amount: 0 },
        yearTotal: { qty: 0, amount: 0 },
      };
    });

    // Process each FOM record
    const progressBar = new cliProgress.SingleBar({
      format:
        "Processing FOM Records |" +
        chalk.cyan("{bar}") +
        "| {percentage}% || {value}/{total}",
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true,
    });

    progressBar.start(yearFomData.length, 0);
    let processedCount = 0;

    for (const record of yearFomData) {
      try {
        const recvDate = new Date(record.recvdate);
        const quarter = getQuarter(recvDate);
        const amount = record.paymtamt || 0;

        if (quarter === 0 || amount <= 0) {
          processedCount++;
          progressBar.update(processedCount);
          continue;
        }

        const quarterKey = `q${quarter}`;

        // Check if it's a predefined amount
        if (predefinedAmounts.includes(amount)) {
          quarterlyData.predefined[amount].qty++;
          quarterlyData.predefined[amount][quarterKey].qty++;
          quarterlyData.predefined[amount][quarterKey].amount += amount;
          quarterlyData.predefined[amount].yearTotal.qty++;
          quarterlyData.predefined[amount].yearTotal.amount += amount;
        } else {
          // Custom amount
          if (!quarterlyData.custom[amount]) {
            quarterlyData.custom[amount] = {
              qty: 0,
              q1: { qty: 0, amount: 0 },
              q2: { qty: 0, amount: 0 },
              q3: { qty: 0, amount: 0 },
              q4: { qty: 0, amount: 0 },
              yearTotal: { qty: 0, amount: 0 },
            };
          }

          quarterlyData.custom[amount].qty++;
          quarterlyData.custom[amount][quarterKey].qty++;
          quarterlyData.custom[amount][quarterKey].amount += amount;
          quarterlyData.custom[amount].yearTotal.qty++;
          quarterlyData.custom[amount].yearTotal.amount += amount;
        }

        // Update totals
        quarterlyData.totals[quarterKey].qty++;
        quarterlyData.totals[quarterKey].amount += amount;
        quarterlyData.totals.yearTotal.qty++;
        quarterlyData.totals.yearTotal.amount += amount;

        processedCount++;
        progressBar.update(processedCount);

        // Send progress update every 100 records
        if (processedCount % 100 === 0 && io && userId) {
          io.emit(`export-progress-${userId}`, {
            message: `Processing FOM records: ${processedCount}/${yearFomData.length}`,
            progress: Math.round((processedCount / yearFomData.length) * 100),
          });
        }
      } catch (error) {
        console.error(
          chalk.red(`❌ Error processing FOM record ${record.id}:`),
          error.message
        );
        processedCount++;
        progressBar.update(processedCount);
      }
    }

    progressBar.stop();
    sendProgressUpdate(`✅ Processed ${processedCount} FOM records`);

    // Step 3: Calculate mailing costs (placeholder - would need actual data)
    sendProgressUpdate("Calculating mailing costs...");

    // These would typically come from another data source
    const mailingCosts = {
      q1: { amount: 0, cpsSend: 0 },
      q2: { amount: 0, cpsSend: 0 },
      q3: { amount: 0, cpsSend: 0 },
      q4: { amount: 0, cpsSend: 0 },
      total: { amount: 0, cpsSend: 0 },
    };

    // Compile final report data
    const reportData = {
      year,
      reportDate,
      quarterlyData,
      mailingCosts,
      // Summary statistics
      summary: {
        totalDonations: quarterlyData.totals.yearTotal.qty,
        totalAmount: quarterlyData.totals.yearTotal.amount,
        predefinedAmounts: predefinedAmounts.length,
        customAmounts: Object.keys(quarterlyData.custom).length,
      },
    };

    sendProgressUpdate(`✅ Report compilation complete for year ${year}`);
    sendProgressUpdate(`Total donations: ${reportData.summary.totalDonations}`);
    sendProgressUpdate(
      `Total amount: ₱${reportData.summary.totalAmount.toLocaleString()}`
    );

    return reportData;
  } catch (error) {
    console.error(
      chalk.red(
        `\n❌ CRITICAL ERROR: Failed to generate FOM quarterly report:`
      ),
      error
    );
    throw error;
  } finally {
    // Close the database connection
    sendProgressUpdate("Closing database connection...");
    await mongoose.connection.close();
    sendProgressUpdate("✅ Database connection closed");
  }
}

/**
 * Generate Excel report for FOM quarterly data
 * @param {Object} reportData - Processed FOM quarterly report data
 * @param {string} outputPath - Path to save the Excel file
 */

export const generateFomExcelReport = async (reportData, savePath) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("FOM Report");

  worksheet.pageSetup = {
    paperSize: 1, // US Letter
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    verticalCentered: false,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.5,
      bottom: 0.5,
      header: 0.3,
      footer: 0.3,
    },
  };

  worksheet.columns = [
    { width: 14 },
    { width: 6 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 14 },
  ];

  // ================================
  // BORDER HELPERS
  // ================================
  const applyThinBorders = (startCell, endCell) => {
    const borderStyle = { style: "thin", color: { argb: "000000" } };
    const start = worksheet.getCell(startCell);
    const end = worksheet.getCell(endCell);
    for (let r = start.row; r <= end.row; r++) {
      const row = worksheet.getRow(r);
      for (let c = start.col; c <= end.col; c++) {
        const cell = row.getCell(c);
        cell.border = {
          top: borderStyle,
          bottom: borderStyle,
          left: borderStyle,
          right: borderStyle,
        };
      }
    }
  };

  const applyThickOutline = (startCell, endCell) => {
    const thin = { style: "thin", color: { argb: "000000" } };
    const thick = { style: "medium", color: { argb: "000000" } };
    const start = worksheet.getCell(startCell);
    const end = worksheet.getCell(endCell);
    for (let r = start.row; r <= end.row; r++) {
      const row = worksheet.getRow(r);
      for (let c = start.col; c <= end.col; c++) {
        const cell = row.getCell(c);
        const isTop = r === start.row;
        const isBottom = r === end.row;
        const isLeft = c === start.col;
        const isRight = c === end.col;
        cell.border = {
          top: isTop ? thick : thin,
          bottom: isBottom ? thick : thin,
          left: isLeft ? thick : thin,
          right: isRight ? thick : thin,
        };
      }
    }
  };

  const applyDottedInsideBorders = (startCell, endCell) => {
    const dotted = { style: "hair", color: { argb: "000000" } };
    const start = worksheet.getCell(startCell);
    const end = worksheet.getCell(endCell);
    for (let r = start.row; r <= end.row; r++) {
      const row = worksheet.getRow(r);
      for (let c = start.col; c <= end.col; c++) {
        const cell = row.getCell(c);
        const isTop = r === start.row;
        const isBottom = r === end.row;
        const isLeft = c === start.col;
        const isRight = c === end.col;
        
        // Preserve existing border or set undefined for outer edges
        cell.border = {
          top: !isTop ? dotted : cell.border?.top,
          bottom: !isBottom ? dotted : cell.border?.bottom,
          left: !isLeft ? dotted : cell.border?.left,
          right: !isRight ? dotted : cell.border?.right,
        };
      }
    }
  };

  // ================
  // HEADER SECTION
  // ================
  worksheet.mergeCells("A1:G1");
  worksheet.getCell("A1").value = `FOM DONATIONS YEAR ${reportData.year}`;
  worksheet.getCell("A1").alignment = { horizontal: "center" };
  worksheet.getCell("A1").font = { bold: true, size: 14 };

  worksheet.mergeCells("A2:G2");
  worksheet.getCell("A2").value = `REPORT AS OF ${new Date().toLocaleDateString(
    "en-US",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  )}`;
  worksheet.getCell("A2").alignment = { horizontal: "center" };
  worksheet.getCell("A2").font = { italic: true, size: 11 };

  // ================
  // DONATIONS TABLE
  // ================
  const headers = ["AMOUNTS PHP", "QTY", "Q1", "Q2", "Q3", "Q4", "YEAR TOTAL"];
  const headerRow = worksheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: "center" };
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: "medium" },
      bottom: { style: "medium" },
      left: { style: "medium" },
      right: { style: "medium" },
    };
  });

  let currentRow = 4;
  const predefinedAmounts = Object.keys(reportData.quarterlyData.predefined)
    .map(Number)
    .sort((a, b) => a - b);
  const val = (n) => (n && n !== 0 ? n : "");

  // Predefined amounts
  predefinedAmounts.forEach((amount) => {
    const data = reportData.quarterlyData.predefined[amount];
    const row = worksheet.addRow([
      amount,
      val(data.qty),
      val(data.q1.amount),
      val(data.q2.amount),
      val(data.q3.amount),
      val(data.q4.amount),
      val(data.yearTotal.amount),
    ]);
    row.eachCell((cell, colNumber) => {
      cell.alignment = { horizontal: "center" };
      if (colNumber >= 3 && colNumber <= 7 && cell.value !== "")
        cell.numFmt = "#,##0.00";

      if (colNumber === 2 && cell.value !== "") cell.numFmt = "#,##0";

      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });
    currentRow++;
  });

  worksheet.addRow([]);
  currentRow++;

  const customAmounts = Object.keys(reportData.quarterlyData.custom)
    .map(Number)
    .sort((a, b) => a - b);

  customAmounts.forEach((amount) => {
    const data = reportData.quarterlyData.custom[amount];
    const row = worksheet.addRow([
      amount,
      val(data.qty),
      val(data.q1.amount),
      val(data.q2.amount),
      val(data.q3.amount),
      val(data.q4.amount),
      val(data.yearTotal.amount),
    ]);
    row.eachCell((cell, colNumber) => {
      cell.alignment = { horizontal: "center" };
      if (colNumber >= 3 && colNumber <= 7 && cell.value !== "")
        cell.numFmt = "#,##0.00";

      if (colNumber === 2 && cell.value !== "") cell.numFmt = "#,##0";

      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });
    currentRow++;
  });

  const totalRow = worksheet.addRow([
    "TOTAL",
    reportData.quarterlyData.totals.yearTotal.qty,
    val(reportData.quarterlyData.totals.q1.amount),
    val(reportData.quarterlyData.totals.q2.amount),
    val(reportData.quarterlyData.totals.q3.amount),
    val(reportData.quarterlyData.totals.q4.amount),
    val(reportData.quarterlyData.totals.yearTotal.amount),
  ]);

  totalRow.font = { bold: true };
  totalRow.eachCell((cell, colNumber) => {
    cell.alignment = { horizontal: "center" };
    // Exclude QTY (col 2) from decimal format
    if (colNumber !== 2 && typeof cell.value === "number")
      cell.numFmt = "#,##0.00";

    // Keep QTY as whole number
    if (colNumber === 2 && typeof cell.value === "number")
      cell.numFmt = "#,##0";

    cell.border = {
      top: { style: "medium" },
      bottom: { style: "medium" },
      left: { style: "medium" },
      right: { style: "medium" },
    };
  });

  // Apply consistent outline around the whole donation section
  applyThickOutline("A3", `G${totalRow.number}`);

  // Apply dotted inside borders to cells A4:G22
  applyDottedInsideBorders("A4", "G22");

  currentRow += 2;

  // =======================
  // CPS / MAILING COST BOX
  // =======================
  const cpsStartRow = currentRow;
  worksheet.mergeCells(`A${cpsStartRow}:B${cpsStartRow}`);
  worksheet.getCell(`A${cpsStartRow}`).value = "CPS / MAILING COSTS";
  worksheet.getCell(`A${cpsStartRow}`).font = { bold: true, size: 12 };
  worksheet.getCell(`A${cpsStartRow}`).alignment = { horizontal: "center" };

  ["Q1", "Q2", "Q3", "Q4", "TOTAL COST"].forEach((header, i) => {
    const col = String.fromCharCode(67 + i);
    const cell = worksheet.getCell(`${col}${cpsStartRow}`);
    cell.value = header;
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center" };
  });

  const cpsLabels = [
    "CPS Send Domestic",
    "Mailing Cost Domestic",
    "CPS Send Foreign",
    "Mailing Cost Foreign",
  ];

  cpsLabels.forEach((label, i) => {
    const row = cpsStartRow + 1 + i;
    worksheet.mergeCells(`A${row}:B${row}`);
    worksheet.getCell(`A${row}`).value = label;

    ["C", "D", "E", "F"].forEach((col) => {
      const cell = worksheet.getCell(`${col}${row}`);
      cell.value = "";
      cell.alignment = { horizontal: "center" };
      cell.numFmt = "#,##0.00";
    });

    worksheet.getCell(`G${row}`).value = { formula: `=SUM(C${row}:F${row})` };
    worksheet.getCell(`G${row}`).alignment = { horizontal: "center" };
    worksheet.getCell(`G${row}`).numFmt = "#,##0.00";
  });

  const cpsEndRow = cpsStartRow + cpsLabels.length;
  applyThickOutline(`A${cpsStartRow}`, `G${cpsEndRow}`);

  // Apply dotted inside borders to cells A25:G28
  applyDottedInsideBorders("A25", "G28");

  currentRow = cpsEndRow + 2;
  // =======================
  // TOTAL DONATION / SPENT / BALANCE BOX
  // =======================

  // Merge columns E and F for labels
  worksheet.mergeCells(`E${currentRow}:F${currentRow}`);
  worksheet.mergeCells(`E${currentRow + 1}:F${currentRow + 1}`);
  worksheet.mergeCells(`E${currentRow + 2}:F${currentRow + 2}`);

  // Set labels
  worksheet.getCell(`E${currentRow}`).value = "Total Donations";
  worksheet.getCell(`E${currentRow + 1}`).value = "Total Spent";
  worksheet.getCell(`E${currentRow + 2}`).value = "Balance";

  // Set values in G column
  worksheet.getCell(`G${currentRow}`).value =
    reportData.quarterlyData.totals.yearTotal.amount;
  worksheet.getCell(`G${currentRow + 1}`).value = {
    formula: `=SUM(G${cpsStartRow + 1}:G${cpsEndRow})`,
  };
  worksheet.getCell(`G${currentRow + 2}`).value = {
    formula: `=G${currentRow}-G${currentRow + 1}`,
  };

  // Style formatting (center, border, bold)
  for (let i = 0; i < 3; i++) {
    const labelCell = worksheet.getCell(`E${currentRow + i}`);
    const valueCell = worksheet.getCell(`G${currentRow + i}`);

    // Center horizontally and vertically
    labelCell.alignment = { horizontal: "center", vertical: "middle" };
    valueCell.alignment = { horizontal: "center", vertical: "middle" };

    // Add borders
    labelCell.border = valueCell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    // Bold text for labels
    labelCell.font = { bold: true };
    valueCell.numFmt = "#,##0.00";
  }

  applyThickOutline(`F${currentRow}`, `G${currentRow + 2}`);

  // =======================
  // SAVE FILE
  // =======================
  await workbook.xlsx.writeFile(savePath);
  console.log(chalk.green(`✅ Excel report generated: ${savePath}`));
  return savePath;
};

export default processFomQuarterlyReport;
