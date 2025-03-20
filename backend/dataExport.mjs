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
    // (This matches the Excel formula behavior)
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
    const { startOfMonth, endOfMonth } = getReportDates(month, year);

    // Define monthRegex for matching dates
    const monthRegex = new RegExp(`^${month}/\\d{1,2}/${year}`);

    // Step 1: Retrieve and filter clients
    console.log(chalk.bold(`\n----- STEP 1: RETRIEVING CLIENTS -----`));
    const clients = await ClientModel.find({}).lean();
    console.log(
      chalk.green(`✅ Retrieved ${clients.length} clients from database`)
    );

    // Group clients by type
    const typeGroups = {
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

    const clientsByType = {};
    for (const client of clients) {
      let category = "Others";
      for (const [group, types] of Object.entries(typeGroups)) {
        if (types.includes(client.type)) {
          category = group;
          break;
        }
      }
      if (!clientsByType[category]) {
        clientsByType[category] = [];
      }
      clientsByType[category].push(client.id);
    }

    // Step 2: Retrieve and filter subscriptions
    console.log(chalk.bold(`\n----- STEP 2: RETRIEVING SUBSCRIPTIONS -----`));
    const allSubscriptions = await WmmModel.find({}).lean();
    const allComplimentary = await ComplimentaryModel.find({}).lean();
    console.log(
      chalk.green(
        `✅ Retrieved ${allSubscriptions.length} total subscriptions from WMM`
      )
    );
    console.log(
      chalk.green(
        `✅ Retrieved ${allComplimentary.length} total complimentary subscriptions`
      )
    );

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
        `✅ Found ${activeSubscriptions.length} active subscriptions for the month`
      )
    );
    console.log(
      chalk.green(
        `✅ Found ${activeComplimentary.length} active complimentary subscriptions for the month`
      )
    );

    // Step 3: Process and log data
    const detailedLog = {
      paidSubscribers: {},
      complimentarySubscribers: {},
    };

    for (const [category, clientIds] of Object.entries(clientsByType)) {
      detailedLog.paidSubscribers[category] = { LOCAL: [], ABROAD: [] };
      detailedLog.complimentarySubscribers[category] = {
        LOCAL: [],
        ABROAD: [],
      };

      for (const sub of activeSubscriptions) {
        if (clientIds.includes(sub.clientid)) {
          const client = clients.find((c) => c.id === sub.clientid);
          const isAbroad = client.acode && client.acode.includes("ZONE");
          const location = isAbroad ? "ABROAD" : "LOCAL";
          detailedLog.paidSubscribers[category][location].push({
            id: sub.id,
            clientId: sub.clientid,
            subsdate: sub.subsdate,
            enddate: sub.enddate,
            copies: sub.copies,
            paymtmasses: sub.paymtmasses,
          });
        }
      }

      for (const sub of activeComplimentary) {
        if (clientIds.includes(sub.clientId)) {
          const client = clients.find((c) => c.id === sub.clientId);
          const isAbroad = client.acode && client.acode.includes("ZONE");
          const location = isAbroad ? "ABROAD" : "LOCAL";
          detailedLog.complimentarySubscribers[category][location].push({
            id: sub.id,
            clientId: sub.clientId,
            subsdate: sub.subsdate,
            enddate: sub.enddate,
            copies: sub.copies,
            paymtmasses: sub.paymtmasses,
          });
        }
      }
    }

    // Save detailed log to a file
    const logFilePath = path.join(
      reportConfig.outputDirectory,
      `Detailed_Log_${month}_${year}.json`
    );
    fs.writeFileSync(logFilePath, JSON.stringify(detailedLog, null, 2));
    console.log(chalk.green(`Detailed log saved to ${logFilePath}`));

    // ======= PART 1: PAID SUBSCRIBERS =======

    // Initialize categorized counts
    const paidSubscribers = {
      "Priest and Religious": { LOCAL: 0, ABROAD: 0, TOTAL: 0, MASS: 0 },
      "Lay Person": { LOCAL: 0, ABROAD: 0, TOTAL: 0, MASS: 0 },
      "Schools/Libraries": { LOCAL: 0, ABROAD: 0, TOTAL: 0, MASS: 0 },
      "Campus Ministries": { LOCAL: 0, ABROAD: 0, TOTAL: 0, MASS: 0 },
      "GIFT Subscription": { LOCAL: 0, ABROAD: 0, TOTAL: 0, MASS: 0 },
      Others: { LOCAL: 0, ABROAD: 0, TOTAL: 0, MASS: 0 },
      TOTAL: { LOCAL: 0, ABROAD: 0, TOTAL: 0, MASS: 0 },
    };

    // Process each subscription
    console.log(chalk.bold("Categorizing paid subscribers..."));

    // Initialize the progress bar for paid subscribers
    const paidProgressBar = new cliProgress.SingleBar({
      format:
        "Paid Subscribers |" +
        chalk.cyan("{bar}") +
        "| {percentage}% || {value}/{total} Subscriptions",
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true,
    });

    paidProgressBar.start(activeSubscriptions.length, 0);

    let processedCount = 0;
    let skippedCount = 0;

    for (const sub of activeSubscriptions) {
      try {
        const client = await ClientModel.findOne({ id: sub.clientid }).lean();
        if (!client) {
          skippedCount++;
          continue;
        }

        const isAbroad = client.acode && client.acode.includes("ZONE");
        const location = isAbroad ? "ABROAD" : "LOCAL";
        const copies = sub.copies || 1;
        const hasMass = sub.paymtmasses > 0;

        // Find which category this client belongs to
        let category = "Others";
        for (const [group, types] of Object.entries(typeGroups)) {
          if (types.includes(client.type)) {
            category = group;
            break;
          }
        }

        // Add to category counts
        paidSubscribers[category][location] += copies;
        paidSubscribers[category].TOTAL += copies;

        // Only update MASS for "Priest and Religious" category
        if (category === "Priest and Religious" && hasMass) {
          paidSubscribers[category].MASS += copies;
        }

        // Add to total counts
        paidSubscribers.TOTAL[location] += copies;
        paidSubscribers.TOTAL.TOTAL += copies;
        if (category === "Priest and Religious" && hasMass) {
          paidSubscribers.TOTAL.MASS += copies;
        }

        // Log detailed data for paid subscribers
        if (!detailedLog.paidSubscribers[category]) {
          detailedLog.paidSubscribers[category] = { LOCAL: [], ABROAD: [] };
        }
        detailedLog.paidSubscribers[category][location].push({
          clientId: client.id,
          copies,
          hasMass,
        });

        processedCount++;

        // Update the progress bar
        paidProgressBar.update(processedCount);
      } catch (error) {
        console.error(
          chalk.red(`❌ Error processing subscription ${sub.id}:`),
          error.message
        );
        skippedCount++;
      }
    }

    // Stop the progress bar
    paidProgressBar.stop();

    console.log(
      chalk.green(
        `✅ Processed ${processedCount} subscriptions (${skippedCount} skipped)`
      )
    );
    console.log(chalk.bold("Paid subscribers summary:"));
    for (const [category, data] of Object.entries(paidSubscribers)) {
      if (category !== "TOTAL") {
        console.log(
          `  - ${category}: ${data.TOTAL} total (${data.LOCAL} local, ${
            data.ABROAD
          } abroad${
            category === "Priest and Religious"
              ? `, ${data.MASS} with Mass`
              : ""
          })`
        );
      }
    }
    console.log(
      `  - TOTAL: ${paidSubscribers.TOTAL.TOTAL} (${paidSubscribers.TOTAL.LOCAL} local, ${paidSubscribers.TOTAL.ABROAD} abroad, ${paidSubscribers.TOTAL.MASS} with Mass)`
    );

    // ======= PART 2: NEW SUBSCRIBERS & RENEWALS =======
    console.log(
      chalk.bold(`\n----- STEP 2: PROCESSING NEW SUBSCRIBERS & RENEWALS -----`)
    );

    // Find clients added during this month
    console.log(chalk.cyan(`Finding clients added during ${month}/${year}...`));
    let clientsAddedThisMonth;
    try {
      clientsAddedThisMonth = await ClientModel.find({
        adddate: { $regex: monthRegex },
      }).lean();
      console.log(
        chalk.green(
          `✅ Found ${clientsAddedThisMonth.length} clients added this month`
        )
      );
    } catch (error) {
      console.error(
        chalk.red("❌ Error finding clients added this month:"),
        error.message
      );
      clientsAddedThisMonth = [];
    }

    // Find subscriptions that started this month
    console.log(
      chalk.cyan(
        `Finding subscriptions that started during ${month}/${year}...`
      )
    );
    let subsStartedThisMonth;
    try {
      subsStartedThisMonth = await WmmModel.find({
        subsdate: { $regex: monthRegex },
      }).lean();
      console.log(
        chalk.green(
          `✅ Found ${subsStartedThisMonth.length} subscriptions started this month`
        )
      );
    } catch (error) {
      console.error(
        chalk.red("❌ Error finding subscriptions started this month:"),
        error.message
      );
      subsStartedThisMonth = [];
    }

    // Get client IDs for clients with subscriptions that started this month
    const clientIdsWithNewSubs = new Set(
      subsStartedThisMonth.map((sub) => sub.clientid)
    );

    // Check which are renewals (had previous subscriptions that ended within 90 days)
    console.log(
      chalk.bold(
        "Analyzing subscriptions to identify renewals vs. new subscriptions..."
      )
    );
    const renewals = [];
    const newSubs = [];
    let processedSubsCount = 0;

    for (const sub of subsStartedThisMonth) {
      try {
        const subDate = new Date(sub.subsdate);

        // Look for previous subscriptions for this client
        const previousSubs = await WmmModel.find({
          clientid: sub.clientid,
          enddate: { $ne: sub.enddate }, // Not the same subscription
          subsdate: { $lt: sub.subsdate }, // Started before this one
        }).lean();

        // Check if any previous subscription ended within 90 days of this one starting
        const isRenewal = previousSubs.some((prevSub) => {
          try {
            const prevEndDate = new Date(prevSub.enddate);
            const daysDiff = (subDate - prevEndDate) / (1000 * 60 * 60 * 24);
            return daysDiff <= 90 && daysDiff >= 0;
          } catch (error) {
            return false;
          }
        });

        if (isRenewal) {
          renewals.push(sub);
        } else {
          newSubs.push(sub);
        }

        processedSubsCount++;

        // Log progress every 50 subscriptions
        if (processedSubsCount % 50 === 0) {
          console.log(
            `Progress: Analyzed ${processedSubsCount}/${subsStartedThisMonth.length} subscriptions`
          );
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

    // ======= PART 3: COMPLIMENTARY COPIES =======
    console.log(
      chalk.bold(`\n----- STEP 3: PROCESSING COMPLIMENTARY COPIES -----`)
    );

    // Get complimentary subscriptions data
    async function getComplimentaryData(startDate, endDate) {
      try {
        // Define category groups for complimentary subscriptions
        const complimentaryTypeGroups = {
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
          Promotional: [], // Add types if needed
          Gifts: ["MP", "EDITOR", "ADMIN"], // Add types if needed
          Others: [],
        };

        // Get all complimentary subscriptions
        const allComplimentaryDocs = await ComplimentaryModel.find({}).lean();
        console.log(
          chalk.green(
            `Retrieved ${allComplimentaryDocs.length} total complimentary subscriptions`
          )
        );

        // Log the structure of the first few documents to debug
        if (allComplimentaryDocs.length > 0) {
          console.log("First 3 complimentary documents:");
          for (let i = 0; i < Math.min(3, allComplimentaryDocs.length); i++) {
            console.log(
              `Document ${i + 1}:`,
              JSON.stringify(allComplimentaryDocs[i], null, 2)
            );
          }
        } else {
          console.log("No complimentary documents found in database!");
          return {
            Parishes: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
            "Various/Bishop/Religious/Campus M/Library/School": {
              LOCAL: 0,
              ABROAD: 0,
              TOTAL: 0,
            },
            Exchange: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
            Promotional: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
            Gifts: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
            Others: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
            TOTAL: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
          };
        }

        // Filter for active during the report month (in memory)
        console.log(
          chalk.cyan(
            `Filtering for complimentary subscriptions active during ${startDate.toISOString()} to ${endDate.toISOString()}`
          )
        );
        const complimentaryDocs = allComplimentaryDocs.filter((doc) => {
          try {
            // Use the correct field names from the ComplimentarySchema
            const subDate = new Date(doc.subsdate);
            const endDate = new Date(doc.enddate);

            // Log some date parsing examples
            if (doc === allComplimentaryDocs[0]) {
              console.log("Date parsing example:");
              console.log(`  - Original subsdate: ${doc.subsdate}`);
              console.log(`  - Parsed subDate: ${subDate.toISOString()}`);
              console.log(`  - Original enddate: ${doc.enddate}`);
              console.log(`  - Parsed endDate: ${endDate.toISOString()}`);
              console.log(
                chalk.green(
                  `  - Is active? ${
                    subDate <= endOfMonth && endDate >= startOfMonth
                  }`
                )
              );
            }

            return subDate <= endOfMonth && endDate >= startOfMonth;
          } catch (error) {
            console.warn(
              chalk.yellow(
                `⚠️ Skipping complimentary with invalid dates: ${doc.id}, Error: ${error.message}`
              )
            );
            console.log("Document:", JSON.stringify(doc, null, 2));
            return false;
          }
        });

        console.log(
          chalk.green(
            `✅ Found ${complimentaryDocs.length} complimentary subscriptions active during the month`
          )
        );

        if (complimentaryDocs.length === 0) {
          console.log(
            chalk.yellow(
              "⚠️ No active complimentary subscriptions found for this period!"
            )
          );
          return {
            Parishes: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
            "Various/Bishop/Religious/Campus M/Library/School": {
              LOCAL: 0,
              ABROAD: 0,
              TOTAL: 0,
            },
            Exchange: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
            Promotional: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
            Gifts: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
            Others: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
            TOTAL: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
          };
        }

        // Initialize result structure
        const result = {
          Parishes: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
          "Various/Bishop/Religious/Campus M/Library/School": {
            LOCAL: 0,
            ABROAD: 0,
            TOTAL: 0,
          },
          Exchange: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
          Promotional: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
          Gifts: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
          Others: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
          TOTAL: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
        };

        // Process each complimentary subscription
        console.log(chalk.bold("Categorizing complimentary subscriptions..."));
        let processedCount = 0;
        let skippedCount = 0;

        // Initialize the progress bar for complimentary subscribers
        const complimentaryProgressBar = new cliProgress.SingleBar({
          format:
            "Complimentary Subscribers |" +
            chalk.magenta("{bar}") +
            "| {percentage}% || {value}/{total} Subscriptions",
          barCompleteChar: "\u2588",
          barIncompleteChar: "\u2591",
          hideCursor: true,
        });

        complimentaryProgressBar.start(activeComplimentary.length, 0);

        for (const doc of complimentaryDocs) {
          try {
            // Check all possible client ID field names
            const clientIdField = doc.clientId || doc.clientid || doc.client_id;

            if (!clientIdField) {
              console.warn(
                chalk.yellow(
                  `⚠️ No client ID found in complimentary subscription ${doc.id}`
                )
              );
              console.log("Document fields:", Object.keys(doc).join(", "));
              console.log("Document:", JSON.stringify(doc, null, 2));
              skippedCount++;
              continue;
            }

            // Get client data
            const clientInfo = await ClientModel.findOne({
              id: clientIdField,
            }).lean();

            // Skip if no client info
            if (!clientInfo) {
              console.warn(
                chalk.yellow(
                  `⚠️ No client found for complimentary subscription ${doc.id}, clientId: ${clientIdField}`
                )
              );
              // Try to find if client exists with different ID format
              const anyClient = await ClientModel.findOne({}).lean();
              if (anyClient) {
                console.log(
                  "Sample client document:",
                  JSON.stringify(anyClient, null, 2)
                );
              }
              skippedCount++;
              continue;
            }

            // Determine if local or abroad
            const isAbroad =
              clientInfo.acode && clientInfo.acode.includes("ZONE");
            const location = isAbroad ? "ABROAD" : "LOCAL";

            // Determine category based on client type using the typeGroups
            let category = "Others";
            const clientType = clientInfo.type || "";

            // Find which category this client belongs to
            for (const [group, types] of Object.entries(
              complimentaryTypeGroups
            )) {
              if (types.includes(clientType)) {
                category = group;
                break;
              }
            }

            // Get copies count (default to 1 if not specified)
            const copies = doc.copies || 1;

            // Add to the appropriate category
            result[category][location] += copies;
            result[category].TOTAL += copies;

            // Add to totals
            result.TOTAL[location] += copies;
            result.TOTAL.TOTAL += copies;

            // Log detailed data for complimentary subscribers
            if (!detailedLog.complimentarySubscribers[category]) {
              detailedLog.complimentarySubscribers[category] = {
                LOCAL: [],
                ABROAD: [],
              };
            }
            detailedLog.complimentarySubscribers[category][location].push({
              clientId: clientInfo.id,
              copies,
            });

            processedCount++;

            // Update the progress bar
            complimentaryProgressBar.update(processedCount);
          } catch (error) {
            console.error(
              chalk.red(`❌ Error processing complimentary doc ${doc.id}:`),
              error.message
            );
            console.log("Document:", JSON.stringify(doc, null, 2));
            skippedCount++;
          }
        }

        // Stop the progress bar
        complimentaryProgressBar.stop();

        console.log(
          chalk.green(
            `✅ Processed ${processedCount} complimentary subscriptions (${skippedCount} skipped)`
          )
        );
        console.log(chalk.bold("Complimentary summary:"));
        for (const [category, data] of Object.entries(result)) {
          if (category !== "TOTAL") {
            console.log(
              `  - ${category}: ${data.TOTAL} total (${data.LOCAL} local, ${data.ABROAD} abroad)`
            );
          }
        }
        console.log(
          `  - TOTAL: ${result.TOTAL.TOTAL} (${result.TOTAL.LOCAL} local, ${result.TOTAL.ABROAD} abroad)`
        );

        return result;
      } catch (error) {
        console.error(
          chalk.red("❌ Error processing complimentary data:"),
          error.message
        );
        console.error(error.stack);
        // Return empty data structure in case of error
        return {
          Parishes: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
          "Various/Bishop/Religious/Campus M/Library/School": {
            LOCAL: 0,
            ABROAD: 0,
            TOTAL: 0,
          },
          Exchange: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
          Promotional: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
          Gifts: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
          Others: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
          TOTAL: { LOCAL: 0, ABROAD: 0, TOTAL: 0 },
        };
      }
    }

    const complimentaryData = await getComplimentaryData(
      startOfMonth,
      endOfMonth
    );

    // ======= COMPILE REPORT RESULTS =======
    console.log(chalk.bold(`\n----- STEP 4: COMPILING FINAL REPORT -----`));

    const reportData = {
      month,
      year,
      paidSubscribers,
      newSubscribers: newSubs.length,
      renewals: renewals.length,
      complimentary: complimentaryData,
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
    console.log(chalk.bold("Summary of report data:"));
    console.log(
      `- Paid subscribers: ${reportData.paidSubscribers.TOTAL.TOTAL}`
    );
    console.log(`- New subscribers: ${reportData.newSubscribers}`);
    console.log(`- Renewals: ${reportData.renewals}`);
    console.log(
      `- Complimentary copies: ${reportData.complimentary.TOTAL.TOTAL}`
    );
    console.log(
      `- Total copies released: ${reportData.totalCopiesReleased.TOTAL}`
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
  // Whether to open Excel after generating report
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

    // Add this after loading the template
    console.log("Named ranges in template:", workbook.definedNames.names);
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

    console.log(chalk.bold("Filling in report data..."));

    // Update cell with month/year (cell A2)
    // Use a simple value instead of a Date object to avoid formula corruption
    const monthName = monthNames[reportData.month - 1];
    worksheet.getCell("A2").value = `${monthName} 1, ${reportData.year}`;
    console.log(
      chalk.green(`Set report date to ${monthName} 1, ${reportData.year}`)
    );

    // Format and add the "For the issue of MONTH YEAR" text to Row 9
    const issueText = `For the issue of ${monthName} ${reportData.year}`;

    // Fill cells E9 to J9 with the issue text
    for (let col = 5; col <= 10; col++) {
      worksheet.getCell(9, col).value = issueText;
    }
    console.log(chalk.green(`Set issue text: "${issueText}"`));

    // Fill in paid subscribers (rows 14-21)
    console.log(chalk.bold("Filling in paid subscribers data..."));
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
        console.log(
          chalk.green(
            `  - Row ${row} (${category}): Mass=${data.MASS}, Local=${data.LOCAL}, Abroad=${data.ABROAD}, Total=${data.TOTAL}`
          )
        );
      }
      row++;
    }

    // Fill in new subscribers and renewals (rows 25-26)
    console.log(chalk.bold("Filling in new subscribers and renewals data..."));
    worksheet.getCell("I25").value = Number(reportData.newSubscribers || 0);
    worksheet.getCell("I26").value = Number(reportData.renewals || 0);
    console.log(
      chalk.green(`  - New subscribers: ${reportData.newSubscribers}`)
    );
    console.log(chalk.green(`  - Renewals: ${reportData.renewals}`));

    // Fill in complimentary (rows 51-58)
    console.log(chalk.bold("Filling in complimentary data..."));
    row = 51;
    for (const [category, data] of Object.entries(reportData.complimentary)) {
      if (category === "TOTAL") {
        row = 58; // Skip to total row
      }
      if (row <= 58) {
        worksheet.getCell(`G${row}`).value = Number(data.LOCAL || 0);
        worksheet.getCell(`H${row}`).value = Number(data.ABROAD || 0);
        worksheet.getCell(`I${row}`).value = Number(data.TOTAL || 0);
        console.log(
          chalk.green(
            `  - Row ${row} (${category}): Local=${data.LOCAL}, Abroad=${data.ABROAD}, Total=${data.TOTAL}`
          )
        );
      }
      row++;
    }

    // Fill in consignments (rows 31-35)
    console.log(chalk.bold("Filling in consignments data..."));
    row = 31;
    for (const [category, data] of Object.entries(reportData.consignments)) {
      if (category === "TOTAL") {
        row = 35; // Skip to total row
      }
      worksheet.getCell(`G${row}`).value = Number(data.LOCAL || 0);
      worksheet.getCell(`H${row}`).value = Number(data.ABROAD || 0);
      worksheet.getCell(`I${row}`).value = Number(data.TOTAL || 0);
      console.log(
        chalk.green(
          `  - Row ${row} (${category}): Local=${data.LOCAL}, Abroad=${data.ABROAD}, Total=${data.TOTAL}`
        )
      );
      row++;
    }

    // Fill in sales (rows 40-44)
    console.log(chalk.bold("Filling in sales data..."));
    row = 40;
    for (const [category, data] of Object.entries(reportData.sales)) {
      if (category === "TOTAL") {
        row = 44; // Skip to total row
      }
      worksheet.getCell(`G${row}`).value = Number(data.LOCAL || 0);
      worksheet.getCell(`H${row}`).value = Number(data.ABROAD || 0);
      worksheet.getCell(`I${row}`).value = Number(data.TOTAL || 0);
      console.log(
        chalk.green(
          `  - Row ${row} (${category}): Local=${data.LOCAL}, Abroad=${data.ABROAD}, Total=${data.TOTAL}`
        )
      );
      row++;
    }

    // Fill in stock, total copies, and print run
    console.log(chalk.bold("Filling in stock and printed copies data..."));
    worksheet.getCell("G61").value = Number(reportData.inStock.LOCAL || 0);
    worksheet.getCell("H61").value = Number(reportData.inStock.ABROAD || 0);
    worksheet.getCell("I61").value = Number(reportData.inStock.TOTAL || 0);
    console.log(
      chalk.green(
        `  - In stock: Local=${reportData.inStock.LOCAL}, Abroad=${reportData.inStock.ABROAD}, Total=${reportData.inStock.TOTAL}`
      )
    );

    worksheet.getCell("I63").value = Number(reportData.printedCopies || 0);
    console.log(chalk.green(`  - Printed copies: ${reportData.printedCopies}`));

    // Total released and available should update via formulas
    console.log(
      chalk.bold("Formulas will calculate total released and available copies")
    );

    // Save the workbook with optimization options
    const options = {
      // Use these options to make the file more compatible
      useStyles: true,
      useSharedStrings: true,
    };

    console.log(chalk.cyan(`Saving Excel file to ${outputPath}...`));
    // Save the workbook
    await workbook.xlsx.writeFile(outputPath, options);
    console.log(chalk.green(`✅ Report saved successfully to ${outputPath}`));
  } catch (error) {
    console.error(chalk.red("❌ Error generating Excel report:"), error);
    throw error;
  }
}

// Example usage
async function main() {
  const month = 2;
  const year = 2025;

  console.log(
    chalk.bold(`\n========== MONTHLY DISTRIBUTION REPORT GENERATOR ==========`)
  );
  console.log(chalk.cyan(`Generating report for ${month}/${year}`));

  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(reportConfig.outputDirectory)) {
      console.log(
        chalk.cyan(`Creating output directory: ${reportConfig.outputDirectory}`)
      );
      fs.mkdirSync(reportConfig.outputDirectory, { recursive: true });
    }

    // Generate the report data
    console.log(chalk.bold("Processing distribution data..."));
    const reportData = await processMonthlyDistribution(month, year);

    // Generate Excel report in Windows directory
    const outputPath = path.join(
      reportConfig.outputDirectory,
      `Monthly_Report_${month}_${year}.xlsx`
    );

    await generateExcelReport(reportData, outputPath);

    console.log(chalk.green(`\n✅ REPORT GENERATION COMPLETE`));
    console.log(chalk.green(`Report saved to ${outputPath}`));

    if (reportConfig.openExcelAfterGeneration) {
      console.log(
        chalk.bold("Attempting to open Excel with the generated report...")
      );
      // Convert WSL path to Windows path for Excel to open it
      // Extract drive letter and path from the WSL mount point
      let windowsPath = outputPath;
      if (outputPath.startsWith("/mnt/")) {
        // Convert /mnt/d/path to D:/path
        const driveLetter = outputPath.charAt(5).toUpperCase();
        const pathPart = outputPath.substring(7).replace(/\//g, "\\");
        windowsPath = `${driveLetter}:\\${pathPart}`;
        console.log(
          chalk.green(`Converted WSL path to Windows path: ${windowsPath}`)
        );
      }

      // Open in Windows Excel
      exec(`cmd.exe /c start excel.exe "${windowsPath}"`, (error) => {
        if (error) {
          console.error(chalk.red("❌ Could not open Excel:"), error.message);
          // Fallback to open with default application
          console.log(
            chalk.yellow("Trying to open with default application...")
          );
          exec(`cmd.exe /c start "" "${windowsPath}"`);
        } else {
          console.log(
            chalk.green("✅ Excel opened successfully with the report")
          );
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

// Allow command-line arguments to override the output directory
// Example: node dataExport.mjs "/mnt/c/Users/YourName/Desktop"
if (process.argv.length > 2) {
  reportConfig.outputDirectory = process.argv[2];
  console.log(
    chalk.green(`Output directory set to: ${reportConfig.outputDirectory}`)
  );
}

main();
