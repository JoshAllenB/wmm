import mongoose from "mongoose";
import ExcelJS from "exceljs";
import dotenv from "dotenv";
import HrgModel from "../../../models/hrg.mjs";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import chalk from "chalk";
import cliProgress from "cli-progress";

dotenv.config();

/**
 * Converts month/year to date objects for filtering
 * @param {number} month - Month (1-12)
 * @param {number} year - Year (e.g., 2024)
 * @returns {Object} Date objects for report
 */
function getReportDates(month, year) {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);
  const monthRegex = new RegExp(`^(${month})/\\d{1,2}/${year}`);

  console.log(
    `Report period: ${startOfMonth.toDateString()} to ${endOfMonth.toDateString()}`
  );

  return { startOfMonth, endOfMonth, monthRegex };
}

/**
 * Process HRG data and generate monthly report
 * @param {number} month - Month (1-12)
 * @param {number} year - Year (e.g., 2024)
 * @param {Object} io - Socket.io instance for real-time updates
 * @param {string} userId - User ID for targeted notifications
 */
async function processHrgMonthlyReport(month, year, io = null, userId = null) {
  const sendProgressUpdate = (message, progress = null) => {
    console.log(chalk.cyan(message));
    if (io && userId) {
      io.emit(`export-progress-${userId}`, { message, progress });
    }
  };

  console.log(
    chalk.bold.blue(
      `\n========== STARTING HRG REPORT GENERATION FOR ${month}/${year} ==========\n`
    )
  );

  try {
    // Connect to database
    sendProgressUpdate("Connecting to MongoDB database...");
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME_CLIENT,
    });
    sendProgressUpdate("✅ Database connection successful");

    const { startOfMonth, endOfMonth } = getReportDates(month, year);

    // Get all HRG records
    sendProgressUpdate("Retrieving HRG data from database...");
    
    const currentYear = year;
    const prevYear = year - 1;
    const nextYear = year + 1;

    // Total HRG count (Row 3)
    const totalHrgCount = await HrgModel.countDocuments();

    // Current year records (Row 5 - C5)
    const currentYearFilter = {
      campaigndate: {
        $gte: new Date(currentYear, 0, 1),
        $lte: new Date(currentYear, 11, 31)
      }
    };

    // Previous year records (Row 5 - D5)
    const prevYearFilter = {
      campaigndate: {
        $gte: new Date(prevYear, 0, 1),
        $lte: new Date(prevYear, 11, 31)
      }
    };

    // Next year records (Row 6 - D6)
    const nextYearFilter = {
      campaigndate: {
        $gte: new Date(nextYear, 0, 1),
        $lte: new Date(nextYear, 11, 31)
      }
    };

    const [
      currentYearRenewals250to999,
      currentYearRenewals1000plus,
      newMembers250to999,
      newMembers1000plus,
      nextYearNewMembers250to999,
      noResponseCount,
      totalCurrentYearIncome
    ] = await Promise.all([
      // Renewals 250-999.99 (Row 20)
      HrgModel.countDocuments({
        ...currentYearFilter,
        paymtamt: { $gte: 250, $lt: 1000 }
      }),
      // Renewals 1000+ (Row 21)
      HrgModel.countDocuments({
        ...currentYearFilter,
        paymtamt: { $gte: 1000 }
      }),
      // New Members 250-999.99 (Row 26)
      HrgModel.countDocuments({
        ...currentYearFilter,
        $expr: { $eq: ["$recvdate", "$campaigndate"] },
        paymtamt: { $gte: 250, $lt: 1000 }
      }),
      // New Members 1000+ (Row 27)
      HrgModel.countDocuments({
        ...currentYearFilter,
        $expr: { $eq: ["$recvdate", "$campaigndate"] },
        paymtamt: { $gte: 1000 }
      }),
      // Next Year New Members 250-999.99 (Row 32)
      HrgModel.countDocuments({
        ...nextYearFilter,
        paymtamt: { $gte: 250, $lt: 1000 }
      }),
      // No Response (Row 40)
      HrgModel.countDocuments({
        recvdate: {
          $gte: new Date(currentYear, 0, 1),
          $lte: new Date(currentYear, 11, 31)
        },
        campaigndate: null
      }),
      // Calculate total income for current year
      HrgModel.aggregate([
        { $match: currentYearFilter },
        { $group: { _id: null, totalAmount: { $sum: "$paymtamt" } } }
      ])
    ]);

    sendProgressUpdate("✅ Retrieved all HRG data successfully");

    // Campaign metrics (hardcoded as per specification)
    const campaignMetrics = {
      metroManila: { mailings: 1298, expenses: 19312.00 },
      luzon: { mailings: 0, expenses: 0 },
      visayas: { mailings: 0, expenses: 0 },
      mindanao: { mailings: 0, expenses: 0 }
    };

    // Calculate totals
    const totalMailings = Object.values(campaignMetrics).reduce((sum, region) => sum + region.mailings, 0);
    const totalExpenses = Object.values(campaignMetrics).reduce((sum, region) => sum + region.expenses, 0);
    const totalIncome = totalCurrentYearIncome.length > 0 ? totalCurrentYearIncome[0].totalAmount : 0;

    // Compile report data
    const reportData = {
      totalHrgCount,
      currentYear,
      prevYear,
      nextYear,
      campaignMetrics: {
        ...campaignMetrics,
        total: {
          mailings: totalMailings,
          expenses: totalExpenses
        }
      },
      renewals: {
        regular: currentYearRenewals250to999,
        highValue: currentYearRenewals1000plus
      },
      newMembers: {
        regular: newMembers250to999,
        highValue: newMembers1000plus
      },
      nextYearNewMembers: nextYearNewMembers250to999,
      noResponse: noResponseCount,
      totalIncome,
      netProfit: totalIncome - totalExpenses,
      newNamesNextCampaign: totalHrgCount // Using total records as specified
    };

    return reportData;
  } catch (error) {
    console.error(chalk.red("Error processing HRG report:"), error);
    throw error;
  } finally {
    await mongoose.connection.close();
    sendProgressUpdate("✅ Database connection closed");
  }
}

/**
 * Generate Excel report for HRG monthly data with proper formula handling
 * @param {Object} reportData - Processed HRG report data
 * @param {string} outputPath - Path to save the Excel file
 */
async function generateHrgExcelReport(reportData, outputPath) {
  console.log(chalk.bold(`\n----- GENERATING HRG EXCEL REPORT -----`));
  console.log(chalk.cyan(`Loading Excel template...`));

  const workbook = new ExcelJS.Workbook();
  
  try {
    // 1. Load the template
    await workbook.xlsx.readFile("./Template/HRG_Monthly_Report.xlsx");
    console.log(chalk.green("✅ Template loaded successfully"));
    const worksheet = workbook.worksheets[0];

    // 2. Convert dates to Excel serial format
    const excelDate = (date) => {
      const epoch = new Date(1899, 11, 30);
      return (date - epoch) / (86400 * 1000);
    };

    // 3. Set key date cells that drive calculations
    worksheet.getCell('A3').value = {
      date: new Date(reportData.currentYear, 0, 15), // Jan 15 of report year
      type: ExcelJS.ValueType.Date
    };
    
    worksheet.getCell('A5').value = {
      date: new Date(reportData.currentYear, 10, 1), // Nov 1 of report year
      type: ExcelJS.ValueType.Date
    };

    // Update total HRG count (Row 3)
    worksheet.getCell("C3").value = reportData.totalHrgCount;

    // 4. Update campaign metrics (static values)
    const campaignData = [
      { row: 10, region: 'metroManila' },
      { row: 11, region: 'luzon' },
      { row: 12, region: 'visayas' }, 
      { row: 13, region: 'mindanao' }
    ];

    campaignData.forEach(item => {
      worksheet.getCell(`G${item.row}`).value = 
        reportData.campaignMetrics[item.region].mailings;
      worksheet.getCell(`J${item.row}`).value = 
        reportData.campaignMetrics[item.region].expenses;
    });

    // 5. Update formula-driven cells with both formula and pre-calculated result
    const formulaCells = [
      // Total campaign sent (G15)
      { cell: 'G15', formula: 'SUM(G10:G13)', value: reportData.campaignMetrics.total.mailings },
      
      // Total expenses (J15)
      { cell: 'J15', formula: 'SUM(J10:J13)', value: reportData.campaignMetrics.total.expenses },
      
      // Renewals (C20-C21)
      { cell: 'C20', value: reportData.renewals.regular },
      { cell: 'C21', value: reportData.renewals.highValue },
      
      // New members (C26-C27)
      { cell: 'C26', value: reportData.newMembers.regular },
      { cell: 'C27', value: reportData.newMembers.highValue },
      
      // Next year new members (C32)
      { cell: 'C32', value: reportData.nextYearNewMembers },
      
      // Total income (J36)
      { cell: 'J36', formula: 'J22+J28+J34', value: reportData.totalIncome },
      
      // Net profit (J38)
      { cell: 'J38', formula: 'J36-J15', value: reportData.netProfit },
      
      // No response (C40)
      { cell: 'C40', value: reportData.noResponse },
      
      // New names for next campaign (C42)
      { cell: 'C42', value: reportData.newNamesNextCampaign }
    ];

    formulaCells.forEach(item => {
      const cell = worksheet.getCell(item.cell);
      if (item.formula) {
        cell.value = { formula: item.formula, result: item.value };
      } else {
        cell.value = item.value;
      }
    });

    // 6. Force recalculation of all formulas before saving
    worksheet.eachRow(row => {
      row.eachCell(cell => {
        if (cell.type === ExcelJS.ValueType.Formula) {
          cell.value = { formula: cell.formula };
        }
      });
    });

    // 7. Save with calculation options
    console.log(chalk.cyan(`Saving Excel file to ${outputPath}...`));
    await workbook.xlsx.writeFile(outputPath, {
      calcProperties: {
        calcOnSave: true,
        fullCalcOnLoad: true
      }
    });
    
    console.log(chalk.green(`✅ Report saved successfully to ${outputPath}`));

    // 8. Verify critical calculations
    const verifyCell = (cellRef, expected) => {
      const value = worksheet.getCell(cellRef).value;
      if (value !== expected) {
        console.warn(chalk.yellow(`⚠️  Validation warning: ${cellRef} contains ${value}, expected ${expected}`));
      }
    };

    verifyCell('G15', reportData.campaignMetrics.total.mailings);
    verifyCell('J38', reportData.netProfit);

  } catch (error) {
    console.error(chalk.red("❌ Error generating Excel report:"), error);
    
    // Enhanced error diagnostics
    if (error.message.includes('509')) {
      console.error(chalk.red('Formula error detected. Check:'));
      console.error('- All date cells are properly formatted');
      console.error('- No broken formula references');
      console.error('- No division by zero');
    }
    
    throw error;
  }
}

export { processHrgMonthlyReport, generateHrgExcelReport }; 