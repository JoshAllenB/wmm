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
async function processFomQuarterlyReport(
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
async function generateFomExcelReport(reportData, outputPath) {
  console.log(
    chalk.bold(`\n----- GENERATING FOM QUARTERLY EXCEL REPORT -----`)
  );
  console.log(chalk.cyan(`Creating Excel workbook...`));

  const workbook = new ExcelJS.Workbook();

  try {
    // Create a new worksheet
    const worksheet = workbook.addWorksheet("FOM Quarterly Report");

    // Set up the report structure based on the image
    // Title and header
    worksheet.mergeCells("A1:H1");
    worksheet.getCell("A1").value = `FOM DONATIONS YEAR ${reportData.year}`;
    worksheet.getCell("A1").font = { bold: true, size: 14 };
    worksheet.getCell("A1").alignment = { horizontal: "center" };

    worksheet.mergeCells("A2:H2");
    worksheet.getCell("A2").value = `REPORT AS OF (${reportData.reportDate})`;
    worksheet.getCell("A2").font = { bold: true };
    worksheet.getCell("A2").alignment = { horizontal: "center" };

    // Headers for donations section
    worksheet.mergeCells("A4:A5");
    worksheet.getCell("A4").value = "DONATION";
    worksheet.getCell("A4").font = { bold: true };
    worksheet.getCell("A4").alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    worksheet.mergeCells("B4:B5");
    worksheet.getCell("B4").value = "QTY";
    worksheet.getCell("B4").font = { bold: true };
    worksheet.getCell("B4").alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    // Quarter headers
    const quarterHeaders = [
      "1ST QUARTER",
      "2ND QUARTER",
      "3RD QUARTER",
      "4TH QUARTER",
    ];
    const quarterColumns = ["C", "D", "E", "F"];

    quarterHeaders.forEach((header, index) => {
      const col = quarterColumns[index];
      worksheet.mergeCells(`${col}4:${col}5`);
      worksheet.getCell(`${col}4`).value = header;
      worksheet.getCell(`${col}4`).font = { bold: true };
      worksheet.getCell(`${col}4`).alignment = {
        horizontal: "center",
        vertical: "middle",
      };
    });

    // Year Total header
    worksheet.mergeCells("G4:H4");
    worksheet.getCell("G4").value = "YEAR TOTAL";
    worksheet.getCell("G4").font = { bold: true };
    worksheet.getCell("G4").alignment = { horizontal: "center" };

    worksheet.mergeCells("G5:H5");
    worksheet.getCell("G5").value = "";
    worksheet.getCell("G5").font = { bold: true };
    worksheet.getCell("G5").alignment = { horizontal: "center" };

    // Predefined amounts (rows 6-13)
    const predefinedAmounts = [100, 500, 1000, 2000, 3000, 5000, 7000, 10000];
    let currentRow = 6;

    predefinedAmounts.forEach((amount) => {
      const data = reportData.quarterlyData.predefined[amount];

      worksheet.getCell(`A${currentRow}`).value = amount;
      worksheet.getCell(`B${currentRow}`).value = data ? data.qty : 0;

      // Quarter data
      worksheet.getCell(`C${currentRow}`).value = data
        ? data.q1.amount || ""
        : "";
      worksheet.getCell(`D${currentRow}`).value = data
        ? data.q2.amount || ""
        : "";
      worksheet.getCell(`E${currentRow}`).value = data
        ? data.q3.amount || ""
        : "";
      worksheet.getCell(`F${currentRow}`).value = data
        ? data.q4.amount || ""
        : "";

      // Year total
      worksheet.getCell(`G${currentRow}`).value = data
        ? data.yearTotal.amount || ""
        : "";

      currentRow++;
    });

    // Custom amounts (starting from row 15)
    const customAmounts = Object.keys(reportData.quarterlyData.custom)
      .map((amount) => parseInt(amount))
      .sort((a, b) => a - b);

    currentRow = 15; // Start custom amounts from row 15
    customAmounts.forEach((amount) => {
      const data = reportData.quarterlyData.custom[amount];

      worksheet.getCell(`A${currentRow}`).value = amount;
      worksheet.getCell(`B${currentRow}`).value = data ? data.qty : 0;

      // Quarter data
      worksheet.getCell(`C${currentRow}`).value = data
        ? data.q1.amount || ""
        : "";
      worksheet.getCell(`D${currentRow}`).value = data
        ? data.q2.amount || ""
        : "";
      worksheet.getCell(`E${currentRow}`).value = data
        ? data.q3.amount || ""
        : "";
      worksheet.getCell(`F${currentRow}`).value = data
        ? data.q4.amount || ""
        : "";

      // Year total
      worksheet.getCell(`G${currentRow}`).value = data
        ? data.yearTotal.amount || ""
        : "";

      currentRow++;
    });

    // Summary row (after all data)
    const summaryRow = currentRow + 1;
    worksheet.getCell(`A${summaryRow}`).value = "TOTAL";
    worksheet.getCell(`A${summaryRow}`).font = { bold: true };
    worksheet.getCell(`B${summaryRow}`).value =
      reportData.quarterlyData.totals.yearTotal.qty;
    worksheet.getCell(`B${summaryRow}`).font = { bold: true };

    // Quarter totals
    worksheet.getCell(`C${summaryRow}`).value =
      reportData.quarterlyData.totals.q1.amount;
    worksheet.getCell(`C${summaryRow}`).font = { bold: true };
    worksheet.getCell(`D${summaryRow}`).value =
      reportData.quarterlyData.totals.q2.amount;
    worksheet.getCell(`D${summaryRow}`).font = { bold: true };
    worksheet.getCell(`E${summaryRow}`).value =
      reportData.quarterlyData.totals.q3.amount;
    worksheet.getCell(`E${summaryRow}`).font = { bold: true };
    worksheet.getCell(`F${summaryRow}`).value =
      reportData.quarterlyData.totals.q4.amount;
    worksheet.getCell(`F${summaryRow}`).font = { bold: true };

    // Year total
    worksheet.getCell(`G${summaryRow}`).value =
      reportData.quarterlyData.totals.yearTotal.amount;
    worksheet.getCell(`G${summaryRow}`).font = { bold: true };

    // Costs section (starting a few rows after summary)
    const costsStartRow = summaryRow + 3;

    // Cost headers
    worksheet.mergeCells(`C${costsStartRow}:F${costsStartRow}`);
    worksheet.getCell(`C${costsStartRow}`).value = "1st QUARTER";
    worksheet.getCell(`C${costsStartRow}`).font = { bold: true };
    worksheet.getCell(`C${costsStartRow}`).alignment = { horizontal: "center" };

    worksheet.getCell(`D${costsStartRow}`).value = "2ND QUARTER";
    worksheet.getCell(`D${costsStartRow}`).font = { bold: true };
    worksheet.getCell(`D${costsStartRow}`).alignment = { horizontal: "center" };

    worksheet.getCell(`E${costsStartRow}`).value = "3RD QUARTER";
    worksheet.getCell(`E${costsStartRow}`).font = { bold: true };
    worksheet.getCell(`E${costsStartRow}`).alignment = { horizontal: "center" };

    worksheet.getCell(`F${costsStartRow}`).value = "4TH QUARTER";
    worksheet.getCell(`F${costsStartRow}`).font = { bold: true };
    worksheet.getCell(`F${costsStartRow}`).alignment = { horizontal: "center" };

    worksheet.mergeCells(`G${costsStartRow}:H${costsStartRow}`);
    worksheet.getCell(`G${costsStartRow}`).value = "TOTAL COST";
    worksheet.getCell(`G${costsStartRow}`).font = { bold: true };
    worksheet.getCell(`G${costsStartRow}`).alignment = { horizontal: "center" };

    // Mailing Cost row
    const mailingRow = costsStartRow + 1;
    worksheet.getCell(`A${mailingRow}`).value = "MAILING COST";
    worksheet.getCell(`C${mailingRow}`).value =
      reportData.mailingCosts.q1.amount;
    worksheet.getCell(`D${mailingRow}`).value =
      reportData.mailingCosts.q2.amount;
    worksheet.getCell(`E${mailingRow}`).value =
      reportData.mailingCosts.q3.amount;
    worksheet.getCell(`F${mailingRow}`).value =
      reportData.mailingCosts.q4.amount;
    worksheet.getCell(`G${mailingRow}`).value =
      reportData.mailingCosts.total.amount;

    // CPS SEND row
    const cpsRow = mailingRow + 1;
    worksheet.getCell(`A${cpsRow}`).value = "CPS SEND";
    worksheet.getCell(`C${cpsRow}`).value = reportData.mailingCosts.q1.cpsSend;
    worksheet.getCell(`D${cpsRow}`).value = reportData.mailingCosts.q2.cpsSend;
    worksheet.getCell(`E${cpsRow}`).value = reportData.mailingCosts.q3.cpsSend;
    worksheet.getCell(`F${cpsRow}`).value = reportData.mailingCosts.q4.cpsSend;
    worksheet.getCell(`G${cpsRow}`).value =
      reportData.mailingCosts.total.cpsSend;

    // Format columns
    worksheet.columns = [
      { width: 15 }, // A - Donation
      { width: 8 }, // B - QTY
      { width: 12 }, // C - Q1
      { width: 12 }, // D - Q2
      { width: 12 }, // E - Q3
      { width: 12 }, // F - Q4
      { width: 12 }, // G - Year Total
      { width: 12 }, // H - (merged with G)
    ];

    // Add light gray borders to data area
    const dataRange = `A4:H${cpsRow}`;
    for (let row = 4; row <= cpsRow; row++) {
      for (let col = 1; col <= 8; col++) {
        const cell = worksheet.getCell(row, col);
        cell.border = {
          top: { style: "thin", color: { argb: "FFCCCCCC" } },
          left: { style: "thin", color: { argb: "FFCCCCCC" } },
          bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
          right: { style: "thin", color: { argb: "FFCCCCCC" } },
        };
      }
    }

    // Save the workbook
    console.log(chalk.cyan(`Saving Excel file to ${outputPath}...`));
    await workbook.xlsx.writeFile(outputPath);
    console.log(
      chalk.green(`✅ FOM Quarterly Report saved successfully to ${outputPath}`)
    );

    return {
      success: true,
      path: outputPath,
      data: reportData,
    };
  } catch (error) {
    console.error(chalk.red("❌ Error generating FOM Excel report:"), error);
    throw error;
  }
}

export { processFomQuarterlyReport, generateFomExcelReport };
