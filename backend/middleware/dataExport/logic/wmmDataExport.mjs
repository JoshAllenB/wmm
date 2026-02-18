import mongoose from "mongoose";
import ExcelJS from "exceljs";
import dotenv from "dotenv";
import ClientModel from "../../../models/clients.mjs";
import TypesModel from "../../../models/types.mjs";
import WmmModel from "../../../models/wmm.mjs";
import ComplimentaryModel from "../../../models/complimentary.mjs";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import os from "os";
import chalk from "chalk";
import cliProgress from "cli-progress";
import { fileURLToPath } from "url";

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
};

// Complementary type groups - moved outside function to avoid recreation
// Logic: Parishes types (PAR, ADMIN) go to Parishes, Exchange types go to Exchange,
// ALL OTHER types (not in Parishes or Exchange) go to Various/Bishop
const COMPLIMENTARY_TYPE_GROUPS = {
  Parishes: ["PAR", "ADMIN"],
  Exchange: ["EXC"],
  "Various/Bishop/Religious/Campus M/Library/School": [], // Catch-all for everything else
  Promotional: [],
  Gifts: [],
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
// For PAID SUBSCRIPTION: unmapped types go to "Lay Person"
// For COMPLIMENTARY: unmapped types go to "Various/Bishop/Religious/Campus M/Library/School"
function getClientCategory(clientType, typeGroups) {
  if (!clientType) {
    // Handle null/undefined types
    return typeGroups === TYPE_GROUPS
      ? "Lay Person"
      : "Various/Bishop/Religious/Campus M/Library/School";
  }

  const normalizedType = clientType.toUpperCase().trim();

  for (const [group, types] of Object.entries(typeGroups)) {
    if (types.map((t) => t.toUpperCase()).includes(normalizedType)) {
      return group;
    }
  }

  // Default behavior for unmapped types
  if (typeGroups === TYPE_GROUPS) {
    return "Lay Person"; // Paid subscribers - unmapped types go to Lay Person
  } else {
    return "Various/Bishop/Religious/Campus M/Library/School"; // Complimentary - unmapped types go here
  }
}

/**
 * Process data and generate monthly distribution report
 * @param {number} month - Month (1-12)
 * @param {number} year - Year (e.g., 2025)
 * @param {Object} io - Socket.io instance for real-time updates
 * @param {string} userId - User ID for targeted notifications
 */
async function processMonthlyDistribution(
  month,
  year,
  io = null,
  userId = null
) {
  // Function to send progress updates via WebSocket if available
  const sendProgressUpdate = (message, progress = null) => {
    console.log(chalk.cyan(message));
    if (io && userId) {
      io.emit(`export-progress-${userId}`, { message, progress });
    }
  };

  console.log(
    chalk.bold.blue(
      `\n========== STARTING REPORT GENERATION FOR ${month}/${year} ==========\n`
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
    const { startOfMonth, endOfMonth, monthRegex } = getReportDates(
      month,
      year
    );

    // Step 1: Retrieve all required data in parallel
    sendProgressUpdate("Retrieving data from database...");

    const [
      clients,
      allSubscriptions,
      allComplimentary,
      subscriptionsAddedThisMonth,
    ] = await Promise.all([
      ClientModel.find({}).lean(),
      WmmModel.find({}).lean(),
      ComplimentaryModel.find({}).lean(),
      WmmModel.find({
        adddate: {
          $gte: `${year}-${String(month).padStart(2, "0")}-01`,
          $lte: `${year}-${String(month).padStart(2, "0")}-31`,
        },
      }).lean(),
    ]);

    sendProgressUpdate(
      `Retrieved ${clients.length} clients, ${allSubscriptions.length} subscriptions, ${allComplimentary.length} complimentary subscriptions, ${subscriptionsAddedThisMonth.length} subscriptions added this month`
    );

    // Create client lookup map for faster access
    const clientMap = createClientLookupMap(clients);

    // Step 2: Filter active subscriptions
    sendProgressUpdate("Filtering active subscriptions...");
    const activeSubscriptions = allSubscriptions.filter((sub) => {
      const subDate = new Date(sub.subsdate);
      const endDate = new Date(sub.enddate);

      // Check if subscription was active during the month
      const isActive = subDate <= endOfMonth && endDate >= startOfMonth;

      // For Paid Subscriptions: Only include records that existed as of the last day of the month
      // Exclude records that were created after the month's cutoff date
      if (sub.adddate) {
        const addDate = new Date(sub.adddate);
        if (addDate > endOfMonth) {
          return false; // Exclude if created after the cutoff
        }
      }

      // // Exclude records that were edited after the month's cutoff date
      // if (sub.editdate) {
      //   const editDate = new Date(sub.editdate);
      //   if (editDate > endOfMonth) {
      //     return false; // Exclude if edited after the cutoff
      //   }
      // }

      return isActive;
    });

    const activeComplimentary = allComplimentary.filter((sub) => {
      const subDate = new Date(sub.subsdate);
      const endDate = new Date(sub.enddate);
      return subDate <= endOfMonth && endDate >= startOfMonth;
    });

    sendProgressUpdate(
      `Found ${activeSubscriptions.length} active subscriptions and ${activeComplimentary.length} complimentary subscriptions for the month`
    );

    try {
      const rows = [];

      // From paid subscriptions
      for (const sub of activeSubscriptions) {
        const clientid = sub.clientid != null ? sub.clientid : "";
        const client = clientMap.get(clientid);

        rows.push([
          clientid,
          client ? client.lname || "" : "",
          client ? client.fname || "" : "",
          client ? client.mname || "" : "",
          client ? client.company || "" : "",
          sub.subsdate || "",
          sub.enddate || "",
          sub.copies != null ? sub.copies : "",
        ]);
      }

      // Add a blank separator row
      rows.push(["", "", "", "", "", "", "", ""]);
      rows.push(["Complimentary Subscriptions", "", "", "", "", "", "", ""]);

      // From complimentary docs
      for (const doc of activeComplimentary) {
        const clientIdField =
          doc.clientId || doc.clientid || doc.client_id || "";
        const clientInfo = clientMap.get(clientIdField);

        rows.push([
          clientIdField,
          clientInfo ? clientInfo.lname || "" : "",
          clientInfo ? clientInfo.fname || "" : "",
          clientInfo ? clientInfo.mname || "" : "",
          clientInfo ? clientInfo.company || "" : "",
          doc.subsdate || "",
          doc.enddate || "",
          doc.copies != null ? doc.copies : "",
        ]);
      }

      const header =
        [
          "clientid",
          "lname",
          "fname",
          "mname",
          "company",
          "subsdate",
          "enddate",
          "copies",
        ].join(",") + "\n";

      const csvBody = rows
        .map((r) =>
          r
            .map((v) => {
              if (v === null || v === undefined) return "";
              const str = `${v}`;
              // Escape special characters for CSV
              // If contains commas, quotes, or newlines, wrap in quotes
              if (
                str.includes(",") ||
                str.includes('"') ||
                str.includes("\n") ||
                str.includes("\r")
              ) {
                // Escape double quotes by doubling them
                return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
            })
            .join(",")
        )
        .join("\n");

      // Create CSV content with UTF-8 BOM for Excel compatibility
      const csvContent = "\uFEFF" + header + csvBody; // \uFEFF is the UTF-8 BOM

      const outDir = reportConfig.outputDirectory;
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const outPath = path.join(outDir, `AllClients_${month}_${year}.csv`);

      // Write with UTF-8 encoding (default in Node.js is UTF-8)
      fs.writeFileSync(outPath, csvContent, "utf8");

      sendProgressUpdate(`Ungrouped clients CSV saved to ${outPath}`);
    } catch (csvErr) {
      console.error(
        chalk.red("❌ Error writing ungrouped clients CSV:"),
        csvErr.message
      );
    }
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
    sendProgressUpdate("Processing paid subscriptions...");

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
    sendProgressUpdate("Categorizing paid subscribers...");
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

          // Send progress update every 100 records
          if (processedCount % 100 === 0 && io && userId) {
            io.emit(`export-progress-${userId}`, {
              message: `Processing paid subscriptions: ${processedCount}/${activeSubscriptions.length}`,
              progress: Math.round(
                (processedCount / activeSubscriptions.length) * 100
              ),
            });
          }
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
    sendProgressUpdate(
      `✅ Processed ${processedCount} subscriptions (${skippedCount} skipped)`
    );

    // Step 4: Process renewals vs new subscriptions based on adddate and subsclass
    sendProgressUpdate(
      "Processing new subscribers and renewals based on adddate and subsclass..."
    );

    sendProgressUpdate(
      `✅ Found ${subscriptionsAddedThisMonth.length} subscriptions added this month`
    );

    // Count NEW and RENEWALS by checking for any previous subscription
    // If the client's previous subscription `enddate` is within 3 months
    // of the new subscription date, treat it as a RENEWAL; otherwise NEW.
    let renewalCount = 0;
    let newSubCount = 0;

    // Collect rows for NEW vs RENEWAL grouping CSV
    const newRows = [];
    const renewalRows = [];

    // Helper: days difference between two dates
    const daysBetween = (d1, d2) => {
      return Math.floor((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
    };

    for (const subscription of subscriptionsAddedThisMonth) {
      try {
        const clientId = subscription.clientid;

        // Determine the reference date for the "newest subscription"
        const newestDate = subscription.subsdate
          ? new Date(subscription.subsdate)
          : subscription.adddate
          ? new Date(subscription.adddate)
          : null;

        // Debug logging for first few subscriptions
        if (newSubCount + renewalCount < 5) {
          console.log(
            chalk.cyan(
              `Processing subscription ${
                subscription.id
              } (client: ${clientId}, newestDate: ${
                subscription.subsdate || subscription.adddate
              })`
            )
          );
        }

        // If no client or no date, classify as NEW (safe fallback)
        if (!clientId || !newestDate || isNaN(newestDate.getTime())) {
          newSubCount++;
          if (newSubCount <= 5) {
            console.log(
              newSubCount,
              chalk.green(`  -> NEW SUBSCRIBER (missing client/date)`)
            );
          }
          continue;
        }

        // Find previous subscriptions for this client (exclude current record)
        const previousSubs = allSubscriptions.filter(
          (s) =>
            s.clientid === clientId && s.id !== subscription.id && s.enddate
        );

        // Find the latest enddate among previous subscriptions
        let latestEnd = null;
        for (const ps of previousSubs) {
          const ed = new Date(ps.enddate);
          if (!isNaN(ed.getTime())) {
            if (!latestEnd || ed > latestEnd) latestEnd = ed;
          }
        }

        let isRenewal = false;

        if (latestEnd) {
          // If the previous enddate is within 92 days (~3 months) of the newest subscription
          const diffDays = daysBetween(newestDate, latestEnd);
          if (diffDays <= 92) {
            isRenewal = true;
          }
        }

        if (isRenewal) {
          renewalCount++;
          if (renewalCount <= 5) {
            console.log(
              renewalCount,
              chalk.green(`  -> RENEWAL (previous enddate within 3 months)`)
            );
          }

          // Add to renewal rows for grouped CSV
          const clientInfoForRow = clientMap.get(clientId) || {};
          renewalRows.push([
            clientId,
            clientInfoForRow.lname || "",
            clientInfoForRow.fname || "",
            clientInfoForRow.mname || "",
            clientInfoForRow.company || "",
            subscription.subsdate || subscription.adddate || "",
            subscription.enddate || "",
            subscription.copies != null ? subscription.copies : "",
          ]);
        } else {
          newSubCount++;
          if (newSubCount <= 5) {
            console.log(newSubCount, chalk.green(`  -> NEW SUBSCRIBER`));
          }

          // Add to new subscriber rows for grouped CSV
          const clientInfoForRow = clientMap.get(clientId) || {};
          newRows.push([
            clientId,
            clientInfoForRow.lname || "",
            clientInfoForRow.fname || "",
            clientInfoForRow.mname || "",
            clientInfoForRow.company || "",
            subscription.subsdate || subscription.adddate || "",
            subscription.enddate || "",
            subscription.copies != null ? subscription.copies : "",
          ]);
        }
      } catch (error) {
        console.error(
          chalk.red(`❌ Error analyzing subscription ${subscription.id}:`),
          error.message
        );
      }
    }

    console.log(
      chalk.bold.green(
        `✅ Totals: ${newSubCount} NEW SUBSCRIBERS, ${renewalCount} RENEWALS`
      )
    );

    // Write grouped CSV for NEW vs RENEWAL subscribers (subscriptions added this month)
    try {
      const sectionHeader = [
        "clientid",
        "lname",
        "fname",
        "mname",
        "company",
        "subsdate",
        "enddate",
        "copies",
      ];

      const buildCsvSection = (title, rows) => {
        const headerLine = title + "\n" + sectionHeader.join(",") + "\n";
        const body = rows
          .map((r) =>
            r
              .map((v) => {
                if (v === null || v === undefined) return "";
                const str = `${v}`;
                if (
                  str.includes(",") ||
                  str.includes('"') ||
                  str.includes("\n") ||
                  str.includes("\r")
                ) {
                  return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
              })
              .join(",")
          )
          .join("\n");

        return headerLine + body + "\n\n";
      };

      let groupedCsv = "\uFEFF"; // BOM
      groupedCsv += buildCsvSection("NEW SUBSCRIBERS", newRows);
      groupedCsv += buildCsvSection("RENEWALS", renewalRows);

      if (!fs.existsSync(reportConfig.outputDirectory)) {
        fs.mkdirSync(reportConfig.outputDirectory, { recursive: true });
      }
      const groupedPath = path.join(
        reportConfig.outputDirectory,
        `NewVsRenewal_${month}_${year}.csv`
      );
      fs.writeFileSync(groupedPath, groupedCsv, "utf8");
      sendProgressUpdate(`Grouped NEW/RENEWAL CSV saved to ${groupedPath}`);
    } catch (err) {
      console.error(
        chalk.red("❌ Error writing grouped NEW/RENEWAL CSV:"),
        err.message
      );
    }

    // Step 5: Process complimentary subscriptions
    sendProgressUpdate("Processing complimentary copies...");

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
      sendProgressUpdate(
        "⚠️ No active complimentary subscriptions found for this period!"
      );
    } else {
      // Process complimentary subscriptions in bulk
      sendProgressUpdate("Categorizing complimentary subscriptions...");
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

            // Send progress update every 100 records
            if (processedCount % 100 === 0 && io && userId) {
              io.emit(`export-progress-${userId}`, {
                message: `Processing complimentary subscriptions: ${processedCount}/${activeComplimentary.length}`,
                progress: Math.round(
                  (processedCount / activeComplimentary.length) * 100
                ),
              });
            }
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
      sendProgressUpdate(
        `✅ Processed ${processedCount} complimentary subscriptions (${skippedCount} skipped)`
      );
    }

    // Save detailed log to a file
    const logFilePath = path.join(
      reportConfig.outputDirectory,
      `Detailed_Log_${month}_${year}.json`
    );

    // Ensure the output directory exists before writing the file
    if (!fs.existsSync(reportConfig.outputDirectory)) {
      console.log(
        chalk.cyan(`Creating output directory: ${reportConfig.outputDirectory}`)
      );
      fs.mkdirSync(reportConfig.outputDirectory, { recursive: true });
    }

    fs.writeFileSync(logFilePath, JSON.stringify(detailedLog, null, 2));
    sendProgressUpdate(`Detailed log saved to ${logFilePath}`);

    // ======= COMPILE REPORT RESULTS =======
    sendProgressUpdate("Compiling final report...");

    const reportData = {
      month,
      year,
      paidSubscribers,
      newSubscribers: newSubCount,
      renewals: renewalCount,
      complimentary: complimentaryResult,
      // These would be filled in manually or from another source
      consignments: {
        Schools: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
        Bookstores: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
        "Religious Communities": { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
        TOTAL: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
      },
      sales: {
        CMC: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
        DCS: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
        DELEGATE: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
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

    sendProgressUpdate(`✅ Report compilation complete for ${month}/${year}`);

    return reportData;
  } catch (error) {
    console.error(
      chalk.red(`\n❌ CRITICAL ERROR: Failed to generate report:`),
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

// Configuration for the report file path
// Can be easily changed here or loaded from a config file
const reportConfig = {
  // Default path that works on both Windows WSL and native Ubuntu
  outputDirectory: getDefaultOutputPath(),
  // Whether to open Excel after generation
  openExcelAfterGeneration: false, // Changed to false for server-side generation
};

/**
 * Determines the default output path based on the current environment
 * Works on both Windows (native) and WSL2
 * @returns {string} The default path for saving reports
 */
function getDefaultOutputPath() {
  // Check if we're on Windows (native)
  if (process.platform === "win32") {
    // Native Windows - use Windows Documents folder
    const homeDir = os.homedir();
    return path.join(homeDir, "Documents", "WMM Reports");
  }

  // Check if we're in WSL environment
  if (process.env.WSL_DISTRO_NAME || process.env.WSLENV) {
    // WSL environment - try to use Windows Documents folder accessible from WSL
    const homeDir = os.homedir();
    const username = homeDir.split("/").pop();

    // Try Windows Documents folder first
    const windowsDocsPath = `/mnt/c/Users/${username}/Documents/WMM Reports`;
    if (fs.existsSync("/mnt/c/Users/" + username + "/Documents")) {
      return windowsDocsPath;
    }

    // Fallback to D drive if it exists (common external drive)
    if (fs.existsSync("/mnt/d")) {
      return `/mnt/d/WMM Reports`;
    }
  }

  // Linux/macOS - use home directory
  const homeDir = os.homedir();
  return path.join(homeDir, "WMM_Reports");
}

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

    // Helper function to set cell value without modifying borders/styles
    function setCellValue(cellAddress, value) {
      const cell = worksheet.getCell(cellAddress);
      const originalBorder = { ...cell.border };
      const originalFill = { ...cell.fill };

      cell.value = value;

      cell.border = originalBorder;
      cell.fill = originalFill;

      return cell;
    }

    // ===== ADDED: Set cell A9 with month and year =====
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const monthNum = parseInt(reportData.month, 10); // Ensure month is a number, 1-12
    const yearNum = parseInt(reportData.year, 10); // Ensure year is a number
    const monthName = monthNames[monthNum - 1]; // month is 1-12, array is 0-11

    // Special case: for May (month 5), use "April/May" as the month label in the Excel sheet
    const monthLabel = monthNum === 5 ? "April/May" : monthName;

    setCellValue("A9", `For the issue of ${monthLabel} ${yearNum}`);
    worksheet.getCell("A9").font = { bold: true, size: 14 };
    console.log(
      chalk.green(
        `✅ Set cell A9 to: "For the issue of ${monthLabel} ${yearNum}"`
      )
    );

    // Fill in paid subscribers (rows 15-21)
    // Row 15: Priest and Religious
    const priestData = reportData.paidSubscribers["Priest and Religious"] || {
      LOCAL: 0,
      ABROAD: 0,
      TOTAL: 0,
      MASS: 0,
    };
    setCellValue("D17", `Paid w/ Mass = ${Number(priestData.MASS || 0)}`);

    worksheet.getCell("D17").font = { size: 9 };
    worksheet.getColumn("D").width = 16;

    setCellValue("E17").value = Number(priestData.LOCAL);
    setCellValue("F17").value = Number(priestData.ABROAD);
    setCellValue("G17").value = Number(priestData.TOTAL);

    // Row 16: Lay Persons
    const layData = reportData.paidSubscribers["Lay Person"] || {
      LOCAL: 0,
      ABROAD: 0,
      TOTAL: 0,
      MASS: 0,
    };
    // worksheet.getCell("F16").value = Number(layData.MASS );
    setCellValue("E18").value = Number(layData.LOCAL);
    setCellValue("F18").value = Number(layData.ABROAD);
    setCellValue("G18").value = Number(layData.TOTAL);

    // Row 17: Schools/Libraries
    const schoolData = reportData.paidSubscribers["Schools/Libraries"] || {
      LOCAL: 0,
      ABROAD: 0,
      TOTAL: 0,
    };
    setCellValue("E19").value = Number(schoolData.LOCAL);
    setCellValue("F19").value = Number(schoolData.ABROAD);
    setCellValue("G19").value = Number(schoolData.TOTAL);

    // Row 18: Campus Ministries
    const campusData = reportData.paidSubscribers["Campus Ministries"] || {
      LOCAL: 0,
      ABROAD: 0,
      TOTAL: 0,
    };
    worksheet.getCell("E20").value = Number(campusData.LOCAL);
    worksheet.getCell("F20").value = Number(campusData.ABROAD);
    worksheet.getCell("G20").value = Number(campusData.TOTAL);

    // Row 19: Paid by Others (GIFT Subscription)
    const giftData = reportData.paidSubscribers["GIFT Subscription"] || {
      LOCAL: 0,
      ABROAD: 0,
      TOTAL: 0,
    };
    setCellValue("E21").value = Number(giftData.LOCAL);
    setCellValue("F21").value = Number(giftData.ABROAD);
    setCellValue("G21").value = Number(giftData.TOTAL);

    // Row 20: Unencoded MP (placeholder for now)
    setCellValue("E22").value = 0;
    setCellValue("F22").value = 0;
    setCellValue("G22").value = 0;

    // ===== IMPROVED LOGIC FOR ROW 23 TOTALS =====
    // Auto-total for columns E, F, G (rows 17-22)
    setCellValue("E23").value = {
      formula: "SUM(E17:E22)",
    };
    setCellValue("F23").value = {
      formula: "SUM(F17:F22)",
    };
    setCellValue("G23").value = {
      formula: "SUM(G17:G22)",
    };

    // Format the total cells if needed (bold, borders, etc.)
    ["E23", "F23", "G23"].forEach((cellAddress) => {
      const cell = worksheet.getCell(cellAddress);
      cell.font = { bold: true };
    });

    // ===== COLUMN WIDTH AND ALIGNMENT IMPROVEMENTS =====

    // Set Local column (E) to be wider
    worksheet.getColumn("E").width = 12;

    // Center align numbers in Local (E) and Abroad (F) columns for rows 17-23
    for (let row = 17; row <= 23; row++) {
      // Local column (E)
      const localCell = worksheet.getCell(`E${row}`);
      localCell.alignment = { horizontal: "center" };

      // Abroad column (F)
      const abroadCell = worksheet.getCell(`F${row}`);
      abroadCell.alignment = { horizontal: "center" };

      // Total column (G) - keep as is or also center if desired
      const totalCell = worksheet.getCell(`G${row}`);
      totalCell.alignment = { horizontal: "center" };
    }

    const newSubscribers = Number(reportData.newSubscribers) || 0;
    const renewals = Number(reportData.renewals) || 0;

    worksheet.getCell("G25").value = newSubscribers;
    worksheet.getCell("G25").numFmt = "#,##0";

    worksheet.getCell("G26").value = renewals;
    worksheet.getCell("G26").numFmt = "#,##0";

    worksheet.getCell("G34").alignment = { horizontal: "center" };

    // Fill in complimentary (rows 44-48)
    // Row 44: Parishes
    const parishesData = reportData.complimentary.Parishes || {
      LOCAL: 0,
      ABROAD: 0,
      TOTAL: 0,
    };
    worksheet.getCell("E45").value = Number(parishesData.LOCAL || 0);
    worksheet.getCell("F45").value = Number(parishesData.ABROAD || 0);
    worksheet.getCell("G45").value = Number(parishesData.TOTAL || 0);

    // Row 45: Various/Bishop/Religious/Campus M/Library/School
    const variousData = reportData.complimentary[
      "Various/Bishop/Religious/Campus M/Library/School"
    ] || { LOCAL: 0, ABROAD: 0, TOTAL: 0 };
    worksheet.getCell("E46").value = Number(variousData.LOCAL || 0);
    worksheet.getCell("F46").value = Number(variousData.ABROAD || 0);
    worksheet.getCell("G46").value = Number(variousData.TOTAL || 0);

    // Row 46: Exchange
    const exchangeData = reportData.complimentary.Exchange || {
      LOCAL: 0,
      ABROAD: 0,
      TOTAL: 0,
    };
    worksheet.getCell("E47").value = Number(exchangeData.LOCAL || 0);
    worksheet.getCell("F47").value = Number(exchangeData.ABROAD || 0);
    worksheet.getCell("G47").value = Number(exchangeData.TOTAL || 0);

    // ===== IMPROVED LOGIC FOR ROW 49 TOTALS =====

    ["E49", "F49", "G49"].forEach((cellAddress) => {
      const cell = worksheet.getCell(cellAddress);
      cell.font = { bold: true };
    });

    // Auto-total for columns E, F, G (rows 17-22)
    worksheet.getCell("E49").value = {
      formula: "SUM(E45:E48)",
    };
    worksheet.getCell("F49").value = {
      formula: "SUM(F45:F48)",
    };
    worksheet.getCell("G49").value = {
      formula: "SUM(G45:G48)",
    };

    worksheet.getCell("E52").value = { formula: "SUM(E36,E42,E49,E51)" };
    worksheet.getCell("F52").value = { formula: "SUM(F51,F49,F36)" };
    worksheet.getCell("G52").value = { formula: "SUM(G36,G42,G49)+E51" };
    worksheet.getCell("G54").value = { formula: "G13-G52" };

    // Row 61: Current Date
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
    worksheet.getCell("B60").value = `${formattedDate}`;

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

// Only run the main function if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  async function main() {
    const params = parseArgs();
    const { month, year, outputDir } = params;

    reportConfig.outputDirectory = outputDir;

    console.log(
      chalk.bold(
        `\n========== MONTHLY DISTRIBUTION REPORT GENERATOR ==========`
      )
    );
    console.log(chalk.cyan(`Generating report for ${month}/${year}`));
    console.log(
      chalk.cyan(`Output directory: ${reportConfig.outputDirectory}`)
    );

    try {
      // Create output directory if it doesn't exist
      if (!fs.existsSync(reportConfig.outputDirectory)) {
        console.log(
          chalk.cyan(
            `Creating output directory: ${reportConfig.outputDirectory}`
          )
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

      // Only attempt to open Excel if configured to do so and running in WSL
      const isWSL = os.release().toLowerCase().includes("microsoft");
      if (reportConfig.openExcelAfterGeneration && isWSL) {
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
      } else if (reportConfig.openExcelAfterGeneration) {
        console.log(
          chalk.yellow(
            "Excel auto-open is only available in WSL. File saved at:"
          )
        );
        console.log(chalk.yellow(outputPath));
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
}

export { processMonthlyDistribution, generateExcelReport };
