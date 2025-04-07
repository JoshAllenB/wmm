import mongoose from "mongoose";
import ExcelJS from "exceljs";
import dotenv from "dotenv";
import ClientModel from "./models/clients.mjs";
import TypesModel from "./models/types.mjs";
import WmmModel from "./models/wmm.mjs";
import ComplimentaryModel from "./models/complimentary.mjs";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import os from "os";
import chalk from "chalk";
import cliProgress from "cli-progress";

dotenv.config();

/**
 * Converts month/year to date objects for filtering
 * Includes special case handling for May as per original Excel formula
 * @param {number} month - Month (1-12)
 * @param {number} year - Year (e.g., 2025)
 * @returns {Object} Date objects for report
 */
function getReportDates(month, year) {
  let startOfMonth;

  // Special case for May (month 5) as specified in cell A6 formula
  if (month === 5) {
    // For May, use the last day of April as the start date
    startOfMonth = new Date(year, 4, 0); // Last day of April
  } else {
    // For all other months, use the first day of the month
    startOfMonth = new Date(year, month - 1, 1);
  }

  // Create end of month (last day)
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  // Format dates for regex matching (needed for string date fields)
  const monthRegex = new RegExp(`^(${month})/\\d{1,2}/${year}`);

  console.log(
    `Report period: ${startOfMonth.toDateString()} to ${endOfMonth.toDateString()}`
  );

  return { startOfMonth, endOfMonth, monthRegex };
}

// Create client type lookup map - moved outside function to avoid recreating on each call
const TYPE_GROUPS = {
  "Priest and Religious": [
    "BP",
    "CHAP",
    "REL",
    "RELMEN",
    "RELWOMEN",
    "PAR",
    "ADMIN",
  ],
  "Lay Person": ["LAY", "VAR", "EXC"],
  "Schools/Libraries": ["SCH", "LIB"],
  "Campus Ministries": ["MIN"],
  "GIFT Subscription": ["GIFT"],
  Others: [],
};

// Complementary type groups - moved outside function to avoid recreation
const COMPLIMENTARY_TYPE_GROUPS = {
  Parishes: ["PAR", "ADMIN"],
  "Various/Bishop/Religious/Campus M/Library/School": [
    "BP",
    "CHAP",
    "REL",
    "RELMEN",
    "RELWOMEN",
    "VAR",
    "MIN",
    "SCH",
    "LIB",
    "GIFT",
    "LAY",
  ],
  Exchange: ["EXC"],
  Promotional: [],
  Gifts: ["MP", "EDITOR", "ADMIN"],
  Others: [],
};

// Helper function to create a client ID lookup map
function createClientLookupMap(clients) {
  const clientMap = new Map();
  for (const client of clients) {
    clientMap.set(client.id, client);
  }
  return clientMap;
}

// Helper function to determine client category
function getClientCategory(clientType, typeGroups) {
  for (const [group, types] of Object.entries(typeGroups)) {
    if (types.includes(clientType)) {
      return group;
    }
  }
  return "Others";
}

/**
 * Process data and generate monthly distribution report
 * @param {number} month - Month (1-12)
 * @param {number} year - Year (e.g., 2025)
 */
async function processMonthlyDistribution(month, year) {
  console.log(
    chalk.bold.blue(
      `\n========== STARTING REPORT GENERATION FOR ${month}/${year} ==========\n`
    )
  );

  // Connect to the database
  console.log(chalk.cyan("Connecting to MongoDB database..."));
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME_CLIENT,
    });
    console.log(chalk.green("✅ Database connection successful"));
  } catch (error) {
    console.error(chalk.red("❌ Database connection failed:"), error.message);
    throw error;
  }

  try {
    const { startOfMonth, endOfMonth, monthRegex } = getReportDates(
      month,
      year
    );

    // Step 1: Retrieve all required data in parallel
    console.log(chalk.bold(`\n----- STEP 1: RETRIEVING DATA -----`));

    const [
      clients,
      allSubscriptions,
      allComplimentary,
      clientsAddedThisMonth,
      subsStartedThisMonth,
    ] = await Promise.all([
      ClientModel.find({}).lean(),
      WmmModel.find({}).lean(),
      ComplimentaryModel.find({}).lean(),
      ClientModel.find({ adddate: { $regex: monthRegex } }).lean(),
      WmmModel.find({ subsdate: { $regex: monthRegex } }).lean(),
    ]);

    console.log(
      chalk.green(
        `✅ Retrieved ${clients.length} clients, ${allSubscriptions.length} subscriptions, ${allComplimentary.length} complimentary subscriptions`
      )
    );

    // Create client lookup map for faster access
    const clientMap = createClientLookupMap(clients);

    // Step 2: Filter active subscriptions
    const activeSubscriptions = allSubscriptions.filter((sub) => {
      const subDate = new Date(sub.subsdate);
      const endDate = new Date(sub.enddate);
      return subDate <= endOfMonth && endDate >= startOfMonth;
    });

    const activeComplimentary = allComplimentary.filter((sub) => {
      const subDate = new Date(sub.subsdate);
      const endDate = new Date(sub.enddate);
      return subDate <= endOfMonth && endDate >= startOfMonth;
    });

    console.log(
      chalk.green(
        `✅ Found ${activeSubscriptions.length} active subscriptions and ${activeComplimentary.length} complimentary subscriptions for the month`
      )
    );

    // Group clients by type - more efficient approach
    const clientsByType = {};
    for (const category of Object.keys(TYPE_GROUPS)) {
      clientsByType[category] = [];
    }

    for (const client of clients) {
      const category = getClientCategory(client.type, TYPE_GROUPS);
      if (!clientsByType[category]) {
        clientsByType[category] = [];
      }
      clientsByType[category].push(client.id);
    }

    // Step 3: Process paid subscriptions
    console.log(
      chalk.bold(`\n----- STEP 2: PROCESSING PAID SUBSCRIPTIONS -----`)
    );

    // Initialize logging
    const detailedLog = {
      paidSubscribers: {},
      complimentarySubscribers: {},
    };

    // Initialize categorized counts with proper structure
    const paidSubscribers = {};
    for (const category of [...Object.keys(TYPE_GROUPS), "TOTAL"]) {
      paidSubscribers[category] = { LOCAL: 0, ABROAD: 0, TOTAL: 0, MASS: 0 };
      detailedLog.paidSubscribers[category] = { LOCAL: [], ABROAD: [] };
    }

    // Process each subscription in bulk instead of individual queries
    console.log(chalk.bold("Categorizing paid subscribers..."));
    const paidProgressBar = new cliProgress.SingleBar({
      format:
        "Paid Subscribers |" +
        chalk.cyan("{bar}") +
        "| {percentage}% || {value}/{total}",
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true,
    });

    paidProgressBar.start(activeSubscriptions.length, 0);
    let processedCount = 0;
    let skippedCount = 0;

    // Process subscriptions in chunks for better memory management
    const CHUNK_SIZE = 100;
    for (let i = 0; i < activeSubscriptions.length; i += CHUNK_SIZE) {
      const chunk = activeSubscriptions.slice(i, i + CHUNK_SIZE);

      for (const sub of chunk) {
        try {
          const client = clientMap.get(sub.clientid);
          if (!client) {
            skippedCount++;
            continue;
          }

          const isAbroad = client.acode && client.acode.includes("ZONE");
          const location = isAbroad ? "ABROAD" : "LOCAL";

          // Only count if copies is a valid number or can be converted to a valid number
          let copies = 0;
          if (sub.copies) {
            copies =
              typeof sub.copies === "string"
                ? parseInt(sub.copies, 10)
                : sub.copies;

            // Only use if it's a valid number
            if (isNaN(copies) || copies <= 0) {
              copies = 0;
            }
          }

          const hasMass = sub.paymtmasses > 0;

          // Find which category this client belongs to
          const category = getClientCategory(client.type, TYPE_GROUPS);

          // Add to category counts
          paidSubscribers[category][location] += copies;
          paidSubscribers[category].TOTAL += copies;

          // Only update MASS for "Priest and Religious" category
          if (category === "Priest and Religious" && hasMass) {
            paidSubscribers[category].MASS += copies;
          } else if (category === "Lay Person" && hasMass) {
            paidSubscribers[category].MASS += copies;
          }

          // Add to total counts
          paidSubscribers.TOTAL[location] += copies;
          paidSubscribers.TOTAL.TOTAL += copies;
          if (category === "Priest and Religious" && hasMass) {
            paidSubscribers.TOTAL.MASS += copies;
          } else if (category === "Lay Person" && hasMass) {
            paidSubscribers.TOTAL.MASS += copies;
          }

          // Add to detailed log
          detailedLog.paidSubscribers[category][location].push({
            clientId: client.id,
            subscriptionId: sub.id,
            subscriptionDate: sub.subsdate,
            endDate: sub.enddate,
            type: client.type,
            copies,
            hasMass,
          });

          processedCount++;
          paidProgressBar.update(processedCount);
        } catch (error) {
          console.error(
            chalk.red(`❌ Error processing subscription ${sub.id}:`),
            error.message
          );
          skippedCount++;
        }
      }
    }

    paidProgressBar.stop();
    console.log(
      chalk.green(
        `✅ Processed ${processedCount} subscriptions (${skippedCount} skipped)`
      )
    );

    // Step 4: Process renewals vs new subscriptions
    console.log(
      chalk.bold(`\n----- STEP 3: PROCESSING NEW SUBSCRIBERS & RENEWALS -----`)
    );

    console.log(
      chalk.green(
        `✅ Found ${clientsAddedThisMonth.length} clients added this month`
      )
    );
    console.log(
      chalk.green(
        `✅ Found ${subsStartedThisMonth.length} subscriptions started this month`
      )
    );

    // More efficient renewal detection using bulk operations
    const renewals = [];
    const newSubs = [];

    // Get all client IDs with new subscriptions
    const clientIdsWithNewSubs = subsStartedThisMonth.map(
      (sub) => sub.clientid
    );

    // Find all previous subscriptions for these clients in one query
    const allPreviousSubs = await WmmModel.find({
      clientid: { $in: clientIdsWithNewSubs },
      subsdate: { $lt: startOfMonth },
    }).lean();

    // Group previous subscriptions by client ID
    const previousSubsByClient = {};
    for (const sub of allPreviousSubs) {
      if (!previousSubsByClient[sub.clientid]) {
        previousSubsByClient[sub.clientid] = [];
      }
      previousSubsByClient[sub.clientid].push(sub);
    }

    // Determine renewals vs new subscriptions
    for (const sub of subsStartedThisMonth) {
      try {
        const subDate = new Date(sub.subsdate);
        const prevSubs = previousSubsByClient[sub.clientid] || [];

        // Check if any previous subscription ended within 90 days
        const isRenewal = prevSubs.some((prevSub) => {
          try {
            const prevEndDate = new Date(prevSub.enddate);
            const daysDiff = (subDate - prevEndDate) / (1000 * 60 * 60 * 24);
            return daysDiff <= 90 && daysDiff >= 0;
          } catch {
            return false;
          }
        });

        if (isRenewal) {
          renewals.push(sub);
        } else {
          newSubs.push(sub);
        }
      } catch (error) {
        console.error(
          chalk.red(`❌ Error analyzing subscription ${sub.id}:`),
          error.message
        );
      }
    }

    console.log(
      chalk.green(
        `✅ Analysis complete: ${newSubs.length} new subscriptions, ${renewals.length} renewals`
      )
    );

    // Step 5: Process complimentary subscriptions
    console.log(
      chalk.bold(`\n----- STEP 4: PROCESSING COMPLIMENTARY COPIES -----`)
    );

    // Initialize result structure with proper default values
    const complimentaryResult = {};
    for (const category of [
      ...Object.keys(COMPLIMENTARY_TYPE_GROUPS),
      "TOTAL",
    ]) {
      complimentaryResult[category] = { LOCAL: 0, ABROAD: 0, TOTAL: 0 };
      if (!detailedLog.complimentarySubscribers[category]) {
        detailedLog.complimentarySubscribers[category] = {
          LOCAL: [],
          ABROAD: [],
        };
      }
    }

    if (activeComplimentary.length === 0) {
      console.log(
        chalk.yellow(
          "⚠️ No active complimentary subscriptions found for this period!"
        )
      );
    } else {
      // Process complimentary subscriptions in bulk
      console.log(chalk.bold("Categorizing complimentary subscriptions..."));
      const complimentaryProgressBar = new cliProgress.SingleBar({
        format:
          "Complimentary Subscribers |" +
          chalk.magenta("{bar}") +
          "| {percentage}% || {value}/{total}",
        barCompleteChar: "\u2588",
        barIncompleteChar: "\u2591",
        hideCursor: true,
      });

      complimentaryProgressBar.start(activeComplimentary.length, 0);
      let processedCount = 0;
      let skippedCount = 0;

      // Process in chunks for better memory management
      for (let i = 0; i < activeComplimentary.length; i += CHUNK_SIZE) {
        const chunk = activeComplimentary.slice(i, i + CHUNK_SIZE);

        for (const doc of chunk) {
          try {
            // Check all possible client ID field names
            const clientIdField = doc.clientId || doc.clientid || doc.client_id;

            if (!clientIdField) {
              skippedCount++;
              continue;
            }

            // Get client data from our map instead of database query
            const clientInfo = clientMap.get(clientIdField);

            // Skip if no client info
            if (!clientInfo) {
              skippedCount++;
              continue;
            }

            // Determine if local or abroad
            const isAbroad =
              clientInfo.acode && clientInfo.acode.includes("ZONE");
            const location = isAbroad ? "ABROAD" : "LOCAL";

            // Determine category based on client type
            const clientType = clientInfo.type || "";
            const category = getClientCategory(
              clientType,
              COMPLIMENTARY_TYPE_GROUPS
            );

            // Get copies count (default to 1 if not specified)
            let copies = 0;
            if (doc.copies) {
              copies =
                typeof doc.copies === "string"
                  ? parseInt(doc.copies, 10)
                  : doc.copies;

              // Only use if it's a valid number
              if (isNaN(copies) || copies <= 0) {
                copies = 0;
              }
            }

            // Add to the appropriate category
            complimentaryResult[category][location] += copies;
            complimentaryResult[category].TOTAL += copies;

            // Add to totals
            complimentaryResult.TOTAL[location] += copies;
            complimentaryResult.TOTAL.TOTAL += copies;

            // Log detailed data
            detailedLog.complimentarySubscribers[category][location].push({
              clientId: clientInfo.id,
              copies,
            });

            processedCount++;
            complimentaryProgressBar.update(processedCount);
          } catch (error) {
            console.error(
              chalk.red(`❌ Error processing complimentary doc ${doc.id}:`),
              error.message
            );
            skippedCount++;
          }
        }
      }

      complimentaryProgressBar.stop();
      console.log(
        chalk.green(
          `✅ Processed ${processedCount} complimentary subscriptions (${skippedCount} skipped)`
        )
      );
    }

    // Save detailed log to a file
    const logFilePath = path.join(
      reportConfig.outputDirectory,
      `Detailed_Log_${month}_${year}.json`
    );
    fs.writeFileSync(logFilePath, JSON.stringify(detailedLog, null, 2));
    console.log(chalk.green(`Detailed log saved to ${logFilePath}`));

    // ======= COMPILE REPORT RESULTS =======
    console.log(chalk.bold(`\n----- STEP 5: COMPILING FINAL REPORT -----`));

    const reportData = {
      month,
      year,
      paidSubscribers,
      newSubscribers: newSubs.length,
      renewals: renewals.length,
      complimentary: complimentaryResult,
      // These would be filled in manually or from another source
      consignments: {
        Schools: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
        Bookstores: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
        "Religious Communities": { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
        TOTAL: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
      },
      sales: {
        DCS: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
        Cebu: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
        "Mission Promotion/Sucat": { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
        TOTAL: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
      },
      inStock: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
      printedCopies: 0,
    };

    // Calculate total copies released
    reportData.totalCopiesReleased = {
      LOCAL:
        reportData.paidSubscribers.TOTAL.LOCAL +
        reportData.complimentary.TOTAL.LOCAL +
        reportData.consignments.TOTAL.LOCAL +
        reportData.sales.TOTAL.LOCAL +
        reportData.inStock.LOCAL,
      ABROAD:
        reportData.paidSubscribers.TOTAL.ABROAD +
        reportData.complimentary.TOTAL.ABROAD +
        reportData.consignments.TOTAL.ABROAD +
        reportData.sales.TOTAL.ABROAD +
        reportData.inStock.ABROAD,
      TOTAL:
        reportData.paidSubscribers.TOTAL.TOTAL +
        reportData.complimentary.TOTAL.TOTAL +
        reportData.consignments.TOTAL.TOTAL +
        reportData.sales.TOTAL.TOTAL +
        reportData.inStock.TOTAL,
    };

    // Calculate available copies
    reportData.available =
      reportData.printedCopies - reportData.totalCopiesReleased.TOTAL;

    console.log(
      chalk.green(`\n✅ Report compilation complete for ${month}/${year}`)
    );

    return reportData;
  } catch (error) {
    console.error(
      chalk.red(`\n❌ CRITICAL ERROR: Failed to generate report:`),
      error
    );
    process.exit(1);
  } finally {
    // Close the database connection
    console.log(chalk.cyan("Closing database connection..."));
    await mongoose.connection.close();
    console.log(chalk.green("✅ Database connection closed"));
  }
}

// Configuration for the report file path
// Can be easily changed here or loaded from a config file
const reportConfig = {
  // Default path for Windows when running in WSL
  outputDirectory: "/mnt/d/WMM Template and example/Monthly Report",
  // Whether to open Excel after generation
  openExcelAfterGeneration: true,
};

// Function to generate an Excel file from the report data
async function generateExcelReport(reportData, outputPath) {
  console.log(chalk.bold(`\n----- GENERATING EXCEL REPORT -----`));
  console.log(chalk.cyan(`Loading Excel template...`));

  const workbook = new ExcelJS.Workbook();

  try {
    // Load the template
    await workbook.xlsx.readFile("./Template/MonthlyReportTemplate.xlsx");
    console.log(chalk.green("✅ Template loaded successfully"));

    const worksheet = workbook.worksheets[0];

    // Set the report month and year
    const monthNames = [
      "JANUARY",
      "FEBRUARY",
      "MARCH",
      "APRIL",
      "MAY",
      "JUNE",
      "JULY",
      "AUGUST",
      "SEPTEMBER",
      "OCTOBER",
      "NOVEMBER",
      "DECEMBER",
    ];

    // Update cell with month/year (cell A2)
    const monthName = monthNames[reportData.month - 1];
    worksheet.getCell("A2").value = `${monthName} 1, ${reportData.year}`;

    // Format and add the "For the issue of MONTH YEAR" text to Row 9
    const issueText = `For the issue of ${monthName} ${reportData.year}`;

    // Fill cells E9 to J9 with the issue text
    for (let col = 5; col <= 10; col++) {
      worksheet.getCell(9, col).value = issueText;
    }

    // Fill in paid subscribers (rows 14-21)
    let row = 14;
    for (const [category, data] of Object.entries(reportData.paidSubscribers)) {
      if (category === "TOTAL") {
        row = 21; // Skip to total row
      }
      if (row <= 21) {
        // Use number values to avoid type issues
        worksheet.getCell(`F${row}`).value = Number(data.MASS || 0);
        worksheet.getCell(`G${row}`).value = Number(data.LOCAL || 0);
        worksheet.getCell(`H${row}`).value = Number(data.ABROAD || 0);
        worksheet.getCell(`I${row}`).value = Number(data.TOTAL || 0);
      }
      row++;
    }

    // Fill in new subscribers and renewals (rows 25-26)
    worksheet.getCell("I25").value = Number(reportData.newSubscribers || 0);
    worksheet.getCell("I26").value = Number(reportData.renewals || 0);

    // Fill in complimentary (rows 51-58)
    row = 51;
    for (const [category, data] of Object.entries(reportData.complimentary)) {
      if (category === "TOTAL") {
        row = 58; // Skip to total row
      }
      if (row <= 58) {
        worksheet.getCell(`G${row}`).value = Number(data.LOCAL || 0);
        worksheet.getCell(`H${row}`).value = Number(data.ABROAD || 0);
        worksheet.getCell(`I${row}`).value = Number(data.TOTAL || 0);
      }
      row++;
    }

    // Fill in consignments (rows 31-35)
    row = 31;
    for (const [category, data] of Object.entries(reportData.consignments)) {
      if (category === "TOTAL") {
        row = 35; // Skip to total row
      }
      worksheet.getCell(`G${row}`).value = Number(data.LOCAL || 0);
      worksheet.getCell(`H${row}`).value = Number(data.ABROAD || 0);
      worksheet.getCell(`I${row}`).value = Number(data.TOTAL || 0);
      row++;
    }

    // Fill in sales (rows 40-44)
    row = 40;
    for (const [category, data] of Object.entries(reportData.sales)) {
      if (category === "TOTAL") {
        row = 44; // Skip to total row
      }
      worksheet.getCell(`G${row}`).value = Number(data.LOCAL || 0);
      worksheet.getCell(`H${row}`).value = Number(data.ABROAD || 0);
      worksheet.getCell(`I${row}`).value = Number(data.TOTAL || 0);
      row++;
    }

    // Fill in stock, total copies, and print run
    worksheet.getCell("G61").value = Number(reportData.inStock.LOCAL || 0);
    worksheet.getCell("H61").value = Number(reportData.inStock.ABROAD || 0);
    worksheet.getCell("I61").value = Number(reportData.inStock.TOTAL || 0);
    worksheet.getCell("I63").value = Number(reportData.printedCopies || 0);

    // Save the workbook with optimization options
    const options = {
      useStyles: true,
      useSharedStrings: true,
    };

    console.log(chalk.cyan(`Saving Excel file to ${outputPath}...`));
    await workbook.xlsx.writeFile(outputPath, options);
    console.log(chalk.green(`✅ Report saved successfully to ${outputPath}`));
  } catch (error) {
    console.error(chalk.red("❌ Error generating Excel report:"), error);
    throw error;
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    month: new Date().getMonth(), // Default to current month
    year: new Date().getFullYear(), // Default to current year
    outputDir: reportConfig.outputDirectory,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--month" || args[i] === "-m") {
      params.month = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--year" || args[i] === "-y") {
      params.year = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--output" || args[i] === "-o") {
      params.outputDir = args[i + 1];
      i++;
    } else if (!args[i].startsWith("-")) {
      params.outputDir = args[i]; // Legacy support for positional output directory
    }
  }

  return params;
}

async function main() {
  const params = parseArgs();
  const { month, year, outputDir } = params;

  reportConfig.outputDirectory = outputDir;

  console.log(
    chalk.bold(`\n========== MONTHLY DISTRIBUTION REPORT GENERATOR ==========`)
  );
  console.log(chalk.cyan(`Generating report for ${month}/${year}`));
  console.log(chalk.cyan(`Output directory: ${reportConfig.outputDirectory}`));

  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(reportConfig.outputDirectory)) {
      console.log(
        chalk.cyan(`Creating output directory: ${reportConfig.outputDirectory}`)
      );
      fs.mkdirSync(reportConfig.outputDirectory, { recursive: true });
    }

    // Generate the report data
    const reportData = await processMonthlyDistribution(month, year);

    // Generate Excel report
    const outputPath = path.join(
      reportConfig.outputDirectory,
      `Monthly_Report_${month}_${year}.xlsx`
    );

    await generateExcelReport(reportData, outputPath);

    console.log(chalk.green(`\n✅ REPORT GENERATION COMPLETE`));
    console.log(chalk.green(`Report saved to ${outputPath}`));

    if (reportConfig.openExcelAfterGeneration) {
      console.log(chalk.bold("Opening Excel with the generated report..."));
      // Convert WSL path to Windows path for Excel to open it
      let windowsPath = outputPath;
      if (outputPath.startsWith("/mnt/")) {
        // Convert /mnt/d/path to D:/path
        const driveLetter = outputPath.charAt(5).toUpperCase();
        const pathPart = outputPath.substring(7).replace(/\//g, "\\");
        windowsPath = `${driveLetter}:\\${pathPart}`;
      }

      // Open in Windows Excel
      exec(`cmd.exe /c start excel.exe "${windowsPath}"`, (error) => {
        if (error) {
          console.error(chalk.red("❌ Could not open Excel:"), error.message);
          // Fallback to open with default application
          exec(`cmd.exe /c start "" "${windowsPath}"`);
        }
      });
    }
  } catch (error) {
    console.error(
      chalk.red(`\n❌ CRITICAL ERROR: Failed to generate report:`),
      error
    );
    process.exit(1);
  }
}

main();
