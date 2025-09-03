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
    if (io && userId) {
      io.emit(`export-progress-${userId}`, { message, progress });
    }
  };

  try {
    // Connect to database
    sendProgressUpdate("Connecting to MongoDB database...");
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME_CLIENT,
    });
    sendProgressUpdate("✅ Database connection successful");

    const { startOfMonth, endOfMonth } = getReportDates(month, year);

    // Get all HRG records once; we'll compute per-year metrics client-side for reliability
    sendProgressUpdate("Retrieving HRG data from database...");
    const allHrg = await HrgModel.find({}).lean();

    const baseYear = year;
    const prevYear = baseYear - 1;
    const nextYear = baseYear + 1;
    // Cutoff dates derived from A5 requirement (Nov 1 YYYY 23:59:59)
    const cutoffBase = new Date(baseYear, 10, 1, 23, 59, 59);
    const cutoffPrev = new Date(prevYear, 10, 1, 23, 59, 59);
    const cutoffNext = new Date(nextYear, 10, 1, 23, 59, 59);

    // Helpers to parse different stored formats
    const extractYear = (value) => {
      if (!value) return null;
      if (value instanceof Date) return value.getFullYear();
      if (typeof value === "number") return new Date(value).getFullYear();
      if (typeof value === "string") {
        // Try ISO first
        const d = new Date(value);
        if (!isNaN(d)) return d.getFullYear();
        // Fallback: take last 4-digit year in the string
        const m = value.match(/(\d{4})$/);
        return m ? parseInt(m[1], 10) : null;
      }
      return null;
    };

    const ensureNumber = (n) => (typeof n === "number" && isFinite(n) ? n : 0);

    // Buckets we need: counts and amounts
    const metrics = {
      renewals: {
        [prevYear]: {
          lt1000: { count: 0, amount: 0 },
          gte1000: { count: 0, amount: 0 },
        },
        [baseYear]: {
          lt1000: { count: 0, amount: 0 },
          gte1000: { count: 0, amount: 0 },
        },
      },
      newMembers: {
        [prevYear]: {
          lt1000: { count: 0, amount: 0 },
          gte1000: { count: 0, amount: 0 },
        },
        [baseYear]: {
          lt1000: { count: 0, amount: 0 },
          gte1000: { count: 0, amount: 0 },
        },
        [nextYear]: {
          lt1000: { count: 0, amount: 0 },
          gte1000: { count: 0, amount: 0 },
        },
      },
    };

    // Build prior-subscription lookup sets per cutoff
    const hasPriorBefore = (cutoff) => {
      const s = new Set();
      for (const d of allHrg) {
        const cd = d.campaigndate ? new Date(d.campaigndate) : null;
        if (cd && cd < cutoff) s.add(d.clientid);
      }
      return s;
    };
    const priorBeforePrev = hasPriorBefore(cutoffPrev);
    const priorBeforeBase = hasPriorBefore(cutoffBase);
    const priorBeforeNext = hasPriorBefore(cutoffNext);

    // Helper to test range
    const bucketOf = (amount) =>
      amount >= 1000 ? "gte1000" : amount >= 250 ? "lt1000" : null;

    // Tally by year based on campaigndate year and prior existence
    for (const doc of allHrg) {
      const amount = ensureNumber(doc.paymtamt);
      const cdYear = extractYear(doc.campaigndate);
      const bucket = bucketOf(amount);
      if (!bucket || !cdYear) continue;

      if (cdYear === prevYear) {
        const isRenewal = priorBeforePrev.has(doc.clientid);
        const target = isRenewal
          ? metrics.renewals[prevYear]
          : metrics.newMembers[prevYear];
        target[bucket].count += 1;
        target[bucket].amount += amount;
      } else if (cdYear === baseYear) {
        const isRenewal = priorBeforeBase.has(doc.clientid);
        const target = isRenewal
          ? metrics.renewals[baseYear]
          : metrics.newMembers[baseYear];
        target[bucket].count += 1;
        target[bucket].amount += amount;
      } else if (cdYear === nextYear) {
        const isRenewal = priorBeforeNext.has(doc.clientid);
        // For nextYear section we only track new members per template
        const target = metrics.newMembers[nextYear];
        // If renewal, it will still be included in newMembers per legacy template? Keep only new
        if (!isRenewal) {
          target[bucket].count += 1;
          target[bucket].amount += amount;
        }
      }
    }

    const reportData = {
      baseYear,
      prevYear,
      nextYear,
      // Counts for placement in Excel
      counts: {
        renewals: {
          [baseYear]: {
            between250and999: metrics.renewals[baseYear].lt1000.count,
            gte1000: metrics.renewals[baseYear].gte1000.count,
            total:
              metrics.renewals[baseYear].lt1000.count +
              metrics.renewals[baseYear].gte1000.count,
          },
          [prevYear]: {
            between250and999: metrics.renewals[prevYear].lt1000.count,
            gte1000: metrics.renewals[prevYear].gte1000.count,
            total:
              metrics.renewals[prevYear].lt1000.count +
              metrics.renewals[prevYear].gte1000.count,
          },
        },
        newMembers: {
          [baseYear]: {
            between250and999: metrics.newMembers[baseYear].lt1000.count,
            gte1000: metrics.newMembers[baseYear].gte1000.count,
            total:
              metrics.newMembers[baseYear].lt1000.count +
              metrics.newMembers[baseYear].gte1000.count,
          },
          [prevYear]: {
            between250and999: metrics.newMembers[prevYear].lt1000.count,
            gte1000: metrics.newMembers[prevYear].gte1000.count,
            total:
              metrics.newMembers[prevYear].lt1000.count +
              metrics.newMembers[prevYear].gte1000.count,
          },
          [nextYear]: {
            between250and999: metrics.newMembers[nextYear].lt1000.count,
            gte1000: metrics.newMembers[nextYear].gte1000.count,
            total:
              metrics.newMembers[nextYear].lt1000.count +
              metrics.newMembers[nextYear].gte1000.count,
          },
        },
      },
      // Per-bucket amounts for direct placement in Excel
      amountBuckets: {
        renewals: {
          [baseYear]: {
            lt1000: metrics.renewals[baseYear].lt1000.amount,
            gte1000: metrics.renewals[baseYear].gte1000.amount,
          },
          [prevYear]: {
            lt1000: metrics.renewals[prevYear].lt1000.amount,
            gte1000: metrics.renewals[prevYear].gte1000.amount,
          },
        },
        newMembers: {
          [baseYear]: {
            lt1000: metrics.newMembers[baseYear].lt1000.amount,
            gte1000: metrics.newMembers[baseYear].gte1000.amount,
          },
          [prevYear]: {
            lt1000: metrics.newMembers[prevYear].lt1000.amount,
            gte1000: metrics.newMembers[prevYear].gte1000.amount,
          },
          [nextYear]: {
            lt1000: metrics.newMembers[nextYear].lt1000.amount,
            gte1000: metrics.newMembers[nextYear].gte1000.amount,
          },
        },
      },
      amounts: {
        renewals: {
          [baseYear]:
            metrics.renewals[baseYear].lt1000.amount +
            metrics.renewals[baseYear].gte1000.amount,
          [prevYear]:
            metrics.renewals[prevYear].lt1000.amount +
            metrics.renewals[prevYear].gte1000.amount,
        },
        newMembers: {
          [baseYear]:
            metrics.newMembers[baseYear].lt1000.amount +
            metrics.newMembers[baseYear].gte1000.amount,
          [prevYear]:
            metrics.newMembers[prevYear].lt1000.amount +
            metrics.newMembers[prevYear].gte1000.amount,
          [nextYear]:
            metrics.newMembers[nextYear].lt1000.amount +
            metrics.newMembers[nextYear].gte1000.amount,
        },
      },
    };

    // Total income across all categories we are populating
    reportData.totalIncome =
      reportData.amounts.renewals[baseYear] +
      reportData.amounts.renewals[prevYear] +
      reportData.amounts.newMembers[baseYear] +
      reportData.amounts.newMembers[prevYear] +
      reportData.amounts.newMembers[nextYear];

    // Campaign expenses left blank; net equals income for now
    reportData.totalExpenses = 0;
    reportData.netProfit = reportData.totalIncome - reportData.totalExpenses;

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
 * Generate Excel report for HRG monthly data with direct value population
 * @param {Object} reportData - Processed HRG report data
 * @param {string} outputPath - Path to save the Excel file
 */
async function generateHrgExcelReport(reportData, outputPath) {
  const workbook = new ExcelJS.Workbook();

  try {
    // 1. Load the template
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const templateCandidates = [
      path.resolve(__dirname, "../../../Template/HRG REPORT - FORMULA.xlsx"),
      path.resolve(__dirname, "../../../Template/HRG_Monthly_Report.xlsx"),
      path.resolve(__dirname, "./Template/HRG_Monthly_Report.xlsx"),
    ];
    const templatePath = templateCandidates.find((p) => fs.existsSync(p));
    if (!templatePath) {
      throw new Error(
        `HRG template not found. Looked for: ${templateCandidates.join(", ")}`
      );
    }
    await workbook.xlsx.readFile(templatePath);

    // Get worksheet
    const candidateSheetNames = [
      "HRG Campaign (New)",
      "HRG Campaign",
      "HRG",
      "Sheet1",
    ];
    let worksheet = null;
    for (const n of candidateSheetNames) {
      const ws = workbook.getWorksheet(n);
      if (ws) {
        worksheet = ws;
        break;
      }
    }
    if (!worksheet) {
      worksheet = workbook.worksheets[0];
    }

    // 2. Update year placeholders in labels/text
    const y = reportData.baseYear;
    const py = reportData.prevYear;
    const ny = reportData.nextYear;

    const replaceYearsInCell = (cell) => {
      if (!cell) return;
      const val = cell.value;
      if (typeof val === "string") {
        let v = val;
        v = v.replace(/\b2011\b/g, String(y));
        v = v.replace(/\b2010\b/g, String(py));
        v = v.replace(/\b2012\b/g, String(ny));
        v = v.replace(/(CAMPAIGN\s+)\d{4}/i, `$1${y}`);
        if (v !== val) cell.value = v;
        return;
      }
      if (val && val.richText && Array.isArray(val.richText)) {
        let changed = false;
        val.richText.forEach((rt) => {
          if (rt && typeof rt.text === "string") {
            let t = rt.text;
            const orig = t;
            t = t.replace(/\b2011\b/g, String(y));
            t = t.replace(/\b2010\b/g, String(py));
            t = t.replace(/\b2012\b/g, String(ny));
            t = t.replace(/(CAMPAIGN\s+)\d{4}/i, `$1${y}`);
            if (t !== orig) {
              rt.text = t;
              changed = true;
            }
          }
        });
        if (changed) cell.value = { richText: val.richText };
      }
    };

    worksheet.eachRow((row) => {
      row.eachCell((cell) => replaceYearsInCell(cell));
    });

    // 3. Set date-driving cells
    try {
      const a3Date = new Date(y, 0, 15);
      const a5Date = new Date(y, 10, 1);
      const b5Date = new Date(y - 1, 10, 1);
      const b6Date = new Date(y + 1, 10, 1);

      worksheet.getCell("A3").value = a3Date;
      worksheet.getCell("A5").value = a5Date;
      worksheet.getCell("B5").value = b5Date;
      worksheet.getCell("B6").value = b6Date;

      // Update textual labels that previously used formulas, to avoid #NAME? placeholders
      const yearA3 = a3Date.getFullYear();
      const yearA5 = a5Date.getFullYear();
      const yearB5 = b5Date.getFullYear();
      const yearB6 = b6Date.getFullYear();

      // Header campaign line (merged FGHIJKL3 in template; top-left is usually F3)
      const campaignHeaderCell = worksheet.getCell("F3");
      if (campaignHeaderCell) {
        campaignHeaderCell.value = `HOLY REDEEMER GUILD - CAMPAIGN ${yearA3}`;
      }

      // Month line (F8): derive month from A3
      const monthAbbr = [
        "JAN.",
        "FEB.",
        "MAR.",
        "APR.",
        "MAY",
        "JUN.",
        "JUL.",
        "AUG.",
        "SEP.",
        "OCT.",
        "NOV.",
        "DEC.",
      ][a3Date.getMonth()];
      const f8Cell = worksheet.getCell("F8");
      if (f8Cell) {
        f8Cell.value = `   (${monthAbbr} ${yearA3})`;
      }

      // Section labels
      const f19 = worksheet.getCell("F19");
      if (f19) f19.value = `RENEWAL (${yearA5})`;
      const l19 = worksheet.getCell("L19");
      if (l19) l19.value = `RENEWAL (${yearB5})`;
      const f25 = worksheet.getCell("F25");
      if (f25) f25.value = `NEW MEMBER (${yearA5})`;
      const l25 = worksheet.getCell("L25");
      if (l25) l25.value = `NEW MEMBER (${yearB5})`;
      const f31 = worksheet.getCell("F31");
      if (f31) f31.value = `NEW MEMBER (${yearB6})`;
      const f38 = worksheet.getCell("F38");
      if (f38)
        f38.value = `TOTAL NET PROFIT (for campaign ${yearA5}-${yearB6}) ----------------------------------- `;
      const f43 = worksheet.getCell("F43");
      if (f43) f43.value = `  (for campaign ${yearB6})`;
    } catch (_) {}

    // 4. POPULATE DATA DIRECTLY (REPLACING FORMULAS)

    // Campaign Sent section - leave blank as requested but keep sum formulas
    [11, 12, 13, 14].forEach((r) => {
      worksheet.getCell(`G${r}`).value = null;
      worksheet.getCell(`J${r}`).value = null;
    });
    worksheet.getCell("G15").value = { formula: "SUM(G11:G14)" };
    worksheet.getCell("J15").value = { formula: "SUM(J10:J13)" };

    // RENEWALS - CURRENT YEAR (2011)
    worksheet.getCell("G20").value =
      reportData.counts.renewals[y].between250and999;
    worksheet.getCell("J20").value =
      reportData.amountBuckets.renewals[y].lt1000;

    worksheet.getCell("G21").value = reportData.counts.renewals[y].gte1000;
    worksheet.getCell("J21").value =
      reportData.amountBuckets.renewals[y].gte1000;

    worksheet.getCell("G22").value = reportData.counts.renewals[y].total;
    worksheet.getCell("J22").value = reportData.amounts.renewals[y];

    // RENEWALS - PREVIOUS YEAR (2010)
    worksheet.getCell("M20").value =
      reportData.counts.renewals[py].between250and999;
    worksheet.getCell("P20").value =
      reportData.amountBuckets.renewals[py].lt1000;

    worksheet.getCell("M21").value = reportData.counts.renewals[py].gte1000;
    worksheet.getCell("P21").value =
      reportData.amountBuckets.renewals[py].gte1000;

    worksheet.getCell("M22").value = reportData.counts.renewals[py].total;
    worksheet.getCell("P22").value = reportData.amounts.renewals[py];

    // NEW MEMBERS - CURRENT YEAR (2011)
    worksheet.getCell("G26").value =
      reportData.counts.newMembers[y].between250and999;
    worksheet.getCell("J26").value =
      reportData.amountBuckets.newMembers[y].lt1000;

    worksheet.getCell("G27").value = reportData.counts.newMembers[y].gte1000;
    worksheet.getCell("J27").value =
      reportData.amountBuckets.newMembers[y].gte1000;

    worksheet.getCell("G28").value = reportData.counts.newMembers[y].total;
    worksheet.getCell("J28").value = reportData.amounts.newMembers[y];

    // NEW MEMBERS - PREVIOUS YEAR (2010)
    worksheet.getCell("M26").value =
      reportData.counts.newMembers[py].between250and999;
    worksheet.getCell("P26").value =
      reportData.amountBuckets.newMembers[py].lt1000;

    worksheet.getCell("M27").value = reportData.counts.newMembers[py].gte1000;
    worksheet.getCell("P27").value =
      reportData.amountBuckets.newMembers[py].gte1000;

    worksheet.getCell("M28").value = reportData.counts.newMembers[py].total;
    worksheet.getCell("P28").value = reportData.amounts.newMembers[py];

    // NEW MEMBERS - NEXT YEAR (2012)
    worksheet.getCell("G32").value =
      reportData.counts.newMembers[ny].between250and999;
    worksheet.getCell("J32").value =
      reportData.amountBuckets.newMembers[ny].lt1000;

    worksheet.getCell("G33").value = reportData.counts.newMembers[ny].gte1000;
    worksheet.getCell("J33").value =
      reportData.amountBuckets.newMembers[ny].gte1000;

    worksheet.getCell("G34").value = reportData.counts.newMembers[ny].total;
    worksheet.getCell("J34").value = reportData.amounts.newMembers[ny];

    // TOTALS SECTION
    const totalIncome = reportData.totalIncome;
    const totalExpenses = 0; // As per your current implementation
    const netProfit = totalIncome - totalExpenses;

    worksheet.getCell("J36").value = totalIncome;
    worksheet.getCell("G36").value = totalIncome;
    // Fill net profit cells; also mirror J36-J15 into L/M/N/O/P38 as requested
    worksheet.getCell("G38").value = netProfit;
    ["L38", "M38", "N38", "O38", "P38"].forEach((addr) => {
      worksheet.getCell(addr).value = { formula: "J36-J15" };
    });

    // ADDITIONAL CELLS (from your formula dependencies)
    worksheet.getCell("C40").value = reportData.counts.renewals[py].total || 0;
    worksheet.getCell("G40").value = reportData.counts.renewals[py].total || 0;

    worksheet.getCell("C42").value =
      reportData.counts.newMembers[ny].total || 0;
    worksheet.getCell("G42").value =
      reportData.counts.newMembers[ny].total || 0;

    // 5. Also populate the reference cells (C20, D20, etc.) for completeness
    worksheet.getCell("C20").value =
      reportData.counts.renewals[y].between250and999;
    worksheet.getCell("D20").value =
      reportData.counts.renewals[py].between250and999;
    worksheet.getCell("C21").value = reportData.counts.renewals[y].gte1000;
    worksheet.getCell("D21").value = reportData.counts.renewals[py].gte1000;

    worksheet.getCell("C26").value =
      reportData.counts.newMembers[y].between250and999;
    worksheet.getCell("D26").value =
      reportData.counts.newMembers[py].between250and999;
    worksheet.getCell("C27").value = reportData.counts.newMembers[y].gte1000;
    worksheet.getCell("D27").value = reportData.counts.newMembers[py].gte1000;

    worksheet.getCell("C32").value =
      reportData.counts.newMembers[ny].between250and999;
    worksheet.getCell("C33").value = reportData.counts.newMembers[ny].gte1000;

    // 6. Save the workbook
    await workbook.xlsx.writeFile(outputPath);

    return {
      success: true,
      path: outputPath,
      data: reportData,
    };
  } catch (error) {
    console.error(chalk.red("❌ Error generating Excel report:"), error);
    throw error;
  }
}
export { processHrgMonthlyReport, generateHrgExcelReport };
