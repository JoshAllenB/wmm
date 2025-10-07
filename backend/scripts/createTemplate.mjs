import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createMonthlyDistributionTemplate() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Monthly Distribution Report");

  // Set column widths
  worksheet.getColumn("A").width = 5;
  worksheet.getColumn("B").width = 5;
  worksheet.getColumn("C").width = 5;
  worksheet.getColumn("D").width = 5;
  worksheet.getColumn("E").width = 35;
  worksheet.getColumn("F").width = 12;
  worksheet.getColumn("G").width = 12;
  worksheet.getColumn("H").width = 12;
  worksheet.getColumn("I").width = 12;
  worksheet.getColumn("J").width = 5;

  // Header Section (Rows 1-12)

  // Row 1: Company Name
  worksheet.mergeCells("A1:J1");
  const companyCell = worksheet.getCell("A1");
  companyCell.value = "WORLD MISSION PUBLICATIONS";
  companyCell.font = { bold: true, size: 16 };
  companyCell.alignment = { horizontal: "center", vertical: "middle" };

  // Row 2: Address
  worksheet.mergeCells("A2:J2");
  const addressCell = worksheet.getCell("A2");
  addressCell.value =
    "#7885 Segundo Mendoza Street, Villa Mendoza Subd., Sucat, Parañaque City";
  addressCell.font = { size: 12 };
  addressCell.alignment = { horizontal: "center", vertical: "middle" };

  // Row 3: Phone
  worksheet.mergeCells("A3:J3");
  const phoneCell = worksheet.getCell("A3");
  phoneCell.value = "Tel. Nos.: 8829-0740 / 8829-7481";
  phoneCell.font = { size: 12 };
  phoneCell.alignment = { horizontal: "center", vertical: "middle" };

  // Row 4: Empty
  worksheet.getRow(4).height = 20;

  // Row 5: Report Title Box
  worksheet.mergeCells("A5:J5");
  const titleCell = worksheet.getCell("A5");
  titleCell.value = "MONTHLY DISTRIBUTION REPORT";
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  // Add border around the title
  titleCell.border = {
    top: { style: "double" },
    left: { style: "double" },
    bottom: { style: "double" },
    right: { style: "double" },
  };

  // Row 6: Empty
  worksheet.getRow(6).height = 15;

  // Row 7: Issue Date
  worksheet.mergeCells("A7:J7");
  const issueCell = worksheet.getCell("A7");
  issueCell.value = "For the issue of AUGUST 2025";
  issueCell.font = { size: 12 };
  issueCell.alignment = { horizontal: "center", vertical: "middle" };
  issueCell.border = {
    bottom: { style: "thin" },
  };

  // Row 8: Empty
  worksheet.getRow(8).height = 15;

  // Row 9: Copies Printed
  worksheet.mergeCells("F9:J9");
  const copiesCell = worksheet.getCell("F9");
  copiesCell.value = "NUMBER OF COPIES PRINTED:";
  copiesCell.font = { size: 12 };
  copiesCell.alignment = { horizontal: "right", vertical: "middle" };

  // Row 10: Total Copies
  worksheet.mergeCells("F10:J10");
  const totalCell = worksheet.getCell("F10");
  totalCell.value = "TOTAL";
  totalCell.font = { size: 12 };
  totalCell.alignment = { horizontal: "right", vertical: "middle" };

  // Row 11: Copies Number
  worksheet.mergeCells("F11:J11");
  const numberCell = worksheet.getCell("F11");
  numberCell.value = "4,800";
  numberCell.font = { size: 12, bold: true };
  numberCell.alignment = { horizontal: "right", vertical: "middle" };

  // Row 12: Empty
  worksheet.getRow(12).height = 15;

  // Main Report Body (Starting from Row 13)

  // Row 13: PAID SUBSCRIBERS Header
  const paidHeaderCell = worksheet.getCell("A13");
  paidHeaderCell.value = "PAID SUBSCRIBERS";
  paidHeaderCell.font = { bold: true, size: 12 };
  paidHeaderCell.border = {
    bottom: { style: "thin" },
  };

  // Row 14: Column Headers
  worksheet.getCell("E14").value = "Paid w/ Mass = 223";
  worksheet.getCell("F14").value = "Local";
  worksheet.getCell("G14").value = "Abroad";
  worksheet.getCell("H14").value = "Total";
  worksheet.getCell("I14").value = "Total";

  // Row 15: Priest and Religious
  worksheet.getCell("A15").value = "Priest and Religious";
  worksheet.getCell("F15").value = 250;
  worksheet.getCell("G15").value = 41;
  worksheet.getCell("H15").value = 291;
  worksheet.getCell("I15").value = 291;

  // Row 16: Lay Persons
  worksheet.getCell("A16").value = "Lay Persons";
  worksheet.getCell("F16").value = 2966;
  worksheet.getCell("G16").value = 11;
  worksheet.getCell("H16").value = 2977;
  worksheet.getCell("I16").value = 2977;

  // Row 17: Schools/Libraries
  worksheet.getCell("A17").value = "Schools/Libraries";
  worksheet.getCell("F17").value = 8;
  worksheet.getCell("G17").value = 4;
  worksheet.getCell("H17").value = 12;
  worksheet.getCell("I17").value = 12;

  // Row 18: Campus Ministries
  worksheet.getCell("A18").value = "Campus Ministries";
  worksheet.getCell("F18").value = 0;
  worksheet.getCell("G18").value = 0;
  worksheet.getCell("H18").value = 0;
  worksheet.getCell("I18").value = 0;

  // Row 19: Paid by Others (GIFT Subscription)
  worksheet.getCell("A19").value = "Paid by Others (GIFT Subscription)";
  worksheet.getCell("F19").value = 137;
  worksheet.getCell("G19").value = 3;
  worksheet.getCell("H19").value = 140;
  worksheet.getCell("I19").value = 140;

  // Row 20: Unencoded MP
  worksheet.getCell("A20").value = "Unencoded MP:";
  worksheet.getCell("E20").value = "July (39) & August (346)";
  worksheet.getCell("F20").value = 385;
  worksheet.getCell("G20").value = 0;
  worksheet.getCell("H20").value = 385;
  worksheet.getCell("I20").value = 385;

  // Row 21: Total Paid Subscribers
  worksheet.getCell("A21").value = "Total Paid Subscribers";
  worksheet.getCell("A21").font = { bold: true };
  worksheet.getCell("A21").border = {
    top: { style: "thin" },
  };
  worksheet.getCell("F21").value = 3746;
  worksheet.getCell("F21").font = { bold: true };
  worksheet.getCell("F21").border = {
    top: { style: "thin" },
  };
  worksheet.getCell("G21").value = 59;
  worksheet.getCell("G21").font = { bold: true };
  worksheet.getCell("G21").border = {
    top: { style: "thin" },
  };
  worksheet.getCell("H21").value = 3805;
  worksheet.getCell("H21").font = { bold: true };
  worksheet.getCell("H21").border = {
    top: { style: "thin" },
  };
  worksheet.getCell("I21").value = 3805;
  worksheet.getCell("I21").font = { bold: true };
  worksheet.getCell("I21").border = {
    top: { style: "thin" },
  };

  // Row 22: Empty
  worksheet.getRow(22).height = 15;

  // Row 23: NEW SUBSCRIBERS
  worksheet.getCell("A23").value = "NEW SUBSCRIBERS for the month";
  worksheet.getCell("I23").value = 235;

  // Row 24: RENEWALS
  worksheet.getCell("A24").value = "RENEWALS during the month of AUGUST 2025";
  worksheet.getCell("I24").value = 31;

  // Row 25: DUE FOR RENEWAL
  worksheet.getCell("A25").value = "DUE FOR RENEWAL for the mo. of AUGUST 2025";
  worksheet.getCell("E25").value = "Renewed = 8";
  worksheet.getCell("I25").value = 384;

  // Row 26: Empty
  worksheet.getRow(26).height = 15;

  // Row 27: SALES Header
  const salesHeaderCell = worksheet.getCell("A27");
  salesHeaderCell.value = "SALES";
  salesHeaderCell.font = { bold: true, size: 12 };
  salesHeaderCell.border = {
    bottom: { style: "thin" },
  };

  // Row 28: Column Headers for Sales
  worksheet.getCell("F28").value = "Local";
  worksheet.getCell("G28").value = "Abroad";
  worksheet.getCell("H28").value = "Total";
  worksheet.getCell("I28").value = "Total";

  // Row 29: CMC
  worksheet.getCell("A29").value = "CMC";
  worksheet.getCell("F29").value = 39;
  worksheet.getCell("G29").value = 0;
  worksheet.getCell("H29").value = 39;
  worksheet.getCell("I29").value = 39;

  // Row 30: DCS (MP)
  worksheet.getCell("A30").value = "DCS (MP)";
  worksheet.getCell("F30").value = 34;
  worksheet.getCell("G30").value = 0;
  worksheet.getCell("H30").value = 34;
  worksheet.getCell("I30").value = 34;

  // Row 31: DELEGATE
  worksheet.getCell("A31").value = "DELEGATE";
  worksheet.getCell("F31").value = 0;
  worksheet.getCell("G31").value = 0;
  worksheet.getCell("H31").value = 0;
  worksheet.getCell("I31").value = 0;

  // Row 32: Total Sales
  worksheet.getCell("A32").value = "Total Sales";
  worksheet.getCell("A32").font = { bold: true };
  worksheet.getCell("A32").border = {
    top: { style: "thin" },
  };
  worksheet.getCell("F32").value = 73;
  worksheet.getCell("F32").font = { bold: true };
  worksheet.getCell("F32").border = {
    top: { style: "thin" },
  };
  worksheet.getCell("G32").value = 0;
  worksheet.getCell("G32").font = { bold: true };
  worksheet.getCell("G32").border = {
    top: { style: "thin" },
  };
  worksheet.getCell("H32").value = 73;
  worksheet.getCell("H32").font = { bold: true };
  worksheet.getCell("H32").border = {
    top: { style: "thin" },
  };
  worksheet.getCell("I32").value = 73;
  worksheet.getCell("I32").font = { bold: true };
  worksheet.getCell("I32").border = {
    top: { style: "thin" },
  };

  // Row 33: TOTAL NUMBER OF COPIES SOLD
  worksheet.getCell("A33").value = "TOTAL NUMBER OF COPIES SOLD";
  worksheet.getCell("A33").font = { bold: true };
  worksheet.getCell("F33").value = 3819;
  worksheet.getCell("F33").font = { bold: true };
  worksheet.getCell("G33").value = 59;
  worksheet.getCell("G33").font = { bold: true };
  worksheet.getCell("H33").value = 3878;
  worksheet.getCell("H33").font = { bold: true };
  worksheet.getCell("I33").value = 3878;
  worksheet.getCell("I33").font = { bold: true };

  // Row 34: Empty
  worksheet.getRow(34).height = 15;

  // Row 35: CONSIGNMENTS Header
  const consignmentsHeaderCell = worksheet.getCell("A35");
  consignmentsHeaderCell.value = "CONSIGNMENTS";
  consignmentsHeaderCell.font = { bold: true, size: 12 };
  consignmentsHeaderCell.border = {
    bottom: { style: "thin" },
  };

  // Row 36: Column Headers for Consignments
  worksheet.getCell("F36").value = "Local";
  worksheet.getCell("G36").value = "Abroad";
  worksheet.getCell("H36").value = "Total";
  worksheet.getCell("I36").value = "Total";

  // Row 37: Schools
  worksheet.getCell("A37").value = "Schools";
  worksheet.getCell("F37").value = 288;
  worksheet.getCell("G37").value = 0;
  worksheet.getCell("H37").value = 288;
  worksheet.getCell("I37").value = 288;

  // Row 38: Bookstores
  worksheet.getCell("A38").value = "Bookstores";
  worksheet.getCell("F38").value = 20;
  worksheet.getCell("G38").value = 0;
  worksheet.getCell("H38").value = 20;
  worksheet.getCell("I38").value = 20;

  // Row 39: Religious Communities
  worksheet.getCell("A39").value = "Religious Communities";
  worksheet.getCell("F39").value = 0;
  worksheet.getCell("G39").value = 0;
  worksheet.getCell("H39").value = 0;
  worksheet.getCell("I39").value = 0;

  // Row 40: Total Consignments
  worksheet.getCell("A40").value = "Total Consignments";
  worksheet.getCell("A40").font = { bold: true };
  worksheet.getCell("A40").border = {
    top: { style: "thin" },
  };
  worksheet.getCell("F40").value = 308;
  worksheet.getCell("F40").font = { bold: true };
  worksheet.getCell("F40").border = {
    top: { style: "thin" },
  };
  worksheet.getCell("G40").value = 0;
  worksheet.getCell("G40").font = { bold: true };
  worksheet.getCell("G40").border = {
    top: { style: "thin" },
  };
  worksheet.getCell("H40").value = 308;
  worksheet.getCell("H40").font = { bold: true };
  worksheet.getCell("H40").border = {
    top: { style: "thin" },
  };
  worksheet.getCell("I40").value = 308;
  worksheet.getCell("I40").font = { bold: true };
  worksheet.getCell("I40").border = {
    top: { style: "thin" },
  };

  // Row 41: Empty
  worksheet.getRow(41).height = 15;

  // Row 42: COMPLIMENTARY Header
  const complimentaryHeaderCell = worksheet.getCell("A42");
  complimentaryHeaderCell.value = "COMPLIMENTARY";
  complimentaryHeaderCell.font = { bold: true, size: 12 };
  complimentaryHeaderCell.border = {
    bottom: { style: "thin" },
  };

  // Row 43: Column Headers for Complimentary
  worksheet.getCell("F43").value = "Local";
  worksheet.getCell("G43").value = "Abroad";
  worksheet.getCell("H43").value = "Total";
  worksheet.getCell("I43").value = "Total";

  // Row 44: Parishes
  worksheet.getCell("A44").value = "Parishes";
  worksheet.getCell("F44").value = 124;
  worksheet.getCell("G44").value = 0;
  worksheet.getCell("H44").value = 124;
  worksheet.getCell("I44").value = 124;

  // Row 45: Various/Bishop/Religious/Campus M/Library/School
  worksheet.getCell("A45").value =
    "Various/Bishop/Religious/Campus M/Library/School";
  worksheet.getCell("F45").value = 120;
  worksheet.getCell("G45").value = 65;
  worksheet.getCell("H45").value = 185;
  worksheet.getCell("I45").value = 185;

  // Row 46: Exchange
  worksheet.getCell("A46").value = "Exchange";
  worksheet.getCell("F46").value = 2;
  worksheet.getCell("G46").value = 6;
  worksheet.getCell("H46").value = 8;
  worksheet.getCell("I46").value = 8;

  // Row 47: Gifts (MP/Editor/Administrator)
  worksheet.getCell("A47").value = "Gifts (MP/Editor/Administrator)";
  worksheet.getCell("F47").value = 7;
  worksheet.getCell("G47").value = 0;
  worksheet.getCell("H47").value = 7;
  worksheet.getCell("I47").value = 7;

  // Row 48: Total Complimentary
  worksheet.getCell("A48").value = "Total Complimentary";
  worksheet.getCell("A48").font = { bold: true };
  worksheet.getCell("A48").border = {
    top: { style: "thin" },
  };
  worksheet.getCell("F48").value = 253;
  worksheet.getCell("F48").font = { bold: true };
  worksheet.getCell("F48").border = {
    top: { style: "thin" },
  };
  worksheet.getCell("G48").value = 71;
  worksheet.getCell("G48").font = { bold: true };
  worksheet.getCell("G48").border = {
    top: { style: "thin" },
  };
  worksheet.getCell("H48").value = 324;
  worksheet.getCell("H48").font = { bold: true };
  worksheet.getCell("H48").border = {
    top: { style: "thin" },
  };
  worksheet.getCell("I48").value = 324;
  worksheet.getCell("I48").font = { bold: true };
  worksheet.getCell("I48").border = {
    top: { style: "thin" },
  };

  // Row 49: Empty
  worksheet.getRow(49).height = 15;

  // Row 50: IN STOCK
  worksheet.getCell("A50").value = "IN STOCK (Archives/Bound copies)";
  worksheet.getCell("I50").value = 56;

  // Row 51: Empty
  worksheet.getRow(51).height = 15;

  // Row 52: TOTAL NUMBER OF COPIES RELEASED
  worksheet.getCell("A52").value = "TOTAL NUMBER OF COPIES RELEASED";
  worksheet.getCell("A52").font = { bold: true };
  // Formula: Sum of all local copies released
  worksheet.getCell("F52").value = { formula: "G21+G32+G40+G48" };
  worksheet.getCell("F52").font = { bold: true };
  // Formula: Sum of all abroad copies released
  worksheet.getCell("G52").value = { formula: "H21+H32+H40+H48" };
  worksheet.getCell("G52").font = { bold: true };
  // Formula: Sum of all total copies released
  worksheet.getCell("H52").value = { formula: "I21+I32+I40+I48" };
  worksheet.getCell("H52").font = { bold: true };
  // Formula: Same as H52 for consistency
  worksheet.getCell("I52").value = { formula: "I21+I32+I40+I48" };
  worksheet.getCell("I52").font = { bold: true };

  // Row 53: Empty
  worksheet.getRow(53).height = 15;

  // Row 54: TOTAL NUMBER OF COPIES AVAILABLE
  worksheet.getCell("A54").value = "TOTAL NUMBER OF COPIES AVAILABLE:";
  // Formula: F11 (printed copies) - I21 (total paid) - I32 (total sales) - I40 (total consignments) - I48 (total complimentary) - I50 (in stock)
  worksheet.getCell("I54").value = { formula: "F11-I21-I32-I40-I48-I50" };

  // Row 55: Empty
  worksheet.getRow(55).height = 30;

  // Footer Section
  // Row 56: Prepared by
  worksheet.getCell("A56").value = "Prepared by:";
  worksheet.getCell("A56").font = { size: 12 };

  // Row 57: Signature line (empty for signature)
  worksheet.getRow(57).height = 20;

  // Row 58: Name
  worksheet.getCell("A58").value = "{NAME}";
  worksheet.getCell("A58").font = { size: 12 };

  // Row 59: Title
  worksheet.getCell("A59").value = "{TITLE}";
  worksheet.getCell("A59").font = { size: 12 };

  // Row 60: Empty
  worksheet.getRow(60).height = 15;

  // Row 61: Date (will be updated dynamically)
  worksheet.getCell("A61").value = "Date: [CURRENT_DATE]";
  worksheet.getCell("A61").font = { size: 12 };

  // Set row heights for better spacing
  for (let i = 1; i <= 61; i++) {
    if (!worksheet.getRow(i).height) {
      worksheet.getRow(i).height = 20;
    }
  }

  // Save the template
  const templatePath = path.join(
    __dirname,
    "../Template/MonthlyDistributionTemplate.xlsx"
  );
  await workbook.xlsx.writeFile(templatePath);

  console.log(`Template created successfully at: ${templatePath}`);
}

// Run the function
createMonthlyDistributionTemplate().catch(console.error);
