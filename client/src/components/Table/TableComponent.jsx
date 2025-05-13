import { flexRender } from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  TableHeader,
} from "../UI/ShadCN/table";
import ArrowDropDownSharp from "@mui/icons-material/ArrowDropDownSharp";
import ArrowDropUpSharp from "@mui/icons-material/ArrowDropUpSharp";
import Tooltip from "@mui/material/Tooltip";
import { memo, useMemo } from "react";

// Wrap the TableComponent with React.memo to prevent unnecessary re-renders
export const TableComponent = memo(function TableComponent({
  table,
  handleRowClick,
  totalCopies,
  pageSpecificCopies,
  totalCalQty,
  totalCalAmt,
  pageSpecificCalQty,
  pageSpecificCalAmt,
  userRole,
  animationComplete,
  totalHrgAmt,
  totalFomAmt,
  totalCalPaymtAmt,
  pageSpecificHrgAmt,
  pageSpecificFomAmt,
  pageSpecificCalPaymtAmt,
  totalClients,
  pageSpecificClients,
  filteredTotalCopies,
  filteredTotalClients,
  absoluteTotalClients,
  absoluteTotalCopies,
}) {
  // Check if role contains WMM (either as a single role or part of a composite role)
  const hasWmmRole = userRole === "WMM" || userRole?.includes("WMM");

  // Client count display for roles that include WMM
  const clientCountDisplay = hasWmmRole ? (
    <span className="text-base mr-4 text-gray-800">
      Clients:{" "}
      <span className="font-bold">
        {Number(pageSpecificClients || 0).toLocaleString()}
      </span>{" "}
      <span className="text-gray-500 text-xs">(Page)</span> /{" "}
      <span className="font-bold">
        {Number(filteredTotalClients || totalClients || 0).toLocaleString()}
      </span>{" "}
      <span className="text-gray-500 text-xs">(Filter)</span>
    </span>
  ) : null;

  // Memoize the label to prevent recalculation on every render
  const totalLabel = useMemo(() => {
    // Force WMM display if user only has WMM role
    if (userRole === "WMM") {
      return (
        <div className="flex flex-wrap px-2 py-1">
          {clientCountDisplay}
          <span className="text-base text-gray-800 font-medium">
            Copies:{" "}
            <span className="font-bold">
              {Number(pageSpecificCopies || 0).toLocaleString()}
            </span>{" "}
            <span className="text-gray-500 text-xs">(Page)</span> /{" "}
            <span className="font-bold">
              {Number(filteredTotalCopies || totalCopies || 0).toLocaleString()}
            </span>{" "}
            <span className="text-gray-500 text-xs">(Filter)</span>
          </span>
        </div>
      );
    }

    switch (userRole) {
      case "CAL":
        return (
          <div className="flex flex-wrap justify-between px-2 py-1">
            <span className="text-sm sm:text-base">
              <span className="mr-2 sm:mr-4 text-gray-800 font-medium">
                Qty:{" "}
                <span className="font-bold">
                  {Number(pageSpecificCalQty || 0).toLocaleString()}
                </span>{" "}
                <span className="text-gray-500 text-xs">(Page)</span> /{" "}
                <span className="font-bold">
                  {Number(totalCalQty || 0).toLocaleString()}
                </span>{" "}
                <span className="text-gray-500 text-xs">(Total)</span>
              </span>
              <span className="text-gray-800 font-medium">
                Amt:{" "}
                <span className="font-bold">
                  {Number(pageSpecificCalAmt || 0).toLocaleString()}
                </span>{" "}
                <span className="text-gray-500 text-xs">(Page)</span> /{" "}
                <span className="font-bold">
                  {Number(totalCalAmt || 0).toLocaleString()}
                </span>{" "}
                <span className="text-gray-500 text-xs">(Total)</span> Php
              </span>
            </span>
          </div>
        );
      case "HRG":
        return (
          <div className="flex justify-between px-2 py-1">
            <span className="text-base text-blue-700 font-medium">
              HRG Payment:{" "}
              <span className="font-bold">
                {Number(pageSpecificHrgAmt || 0).toLocaleString()}
              </span>{" "}
              <span className="text-gray-500 text-xs">(Page)</span> /{" "}
              <span className="font-bold">
                {Number(totalHrgAmt || 0).toLocaleString()}
              </span>{" "}
              <span className="text-gray-500 text-xs">(Total)</span> Php
            </span>
          </div>
        );
      case "FOM":
        return (
          <div className="flex justify-between px-2 py-1">
            <span className="text-base text-green-700 font-medium">
              FOM Payment:{" "}
              <span className="font-bold">
                {Number(pageSpecificFomAmt || 0).toLocaleString()}
              </span>{" "}
              <span className="text-gray-500 text-xs">(Page)</span> /{" "}
              <span className="font-bold">
                {Number(totalFomAmt || 0).toLocaleString()}
              </span>{" "}
              <span className="text-gray-500 text-xs">(Total)</span> Php
            </span>
          </div>
        );
      case "HRG FOM CAL":
        // If the user has WMM role but is seeing HRG FOM CAL display, show the WMM section first
        if (hasWmmRole) {
          return (
            <div className="flex flex-col px-2 py-1">
              {/* WMM Section */}
              <div className="mb-2">
                {clientCountDisplay}
                <span className="text-base ml-4 text-gray-800 font-medium">
                  Copies:{" "}
                  <span className="font-bold">
                    {Number(pageSpecificCopies || 0).toLocaleString()}
                  </span>{" "}
                  <span className="text-gray-500 text-xs">(Page)</span> /{" "}
                  <span className="font-bold">
                    {Number(
                      filteredTotalCopies || totalCopies || 0
                    ).toLocaleString()}
                  </span>{" "}
                  <span className="text-gray-500 text-xs">(Filter)</span>
                </span>
              </div>

              {/* Standard HRG FOM CAL display */}
              <div className="flex flex-nowrap items-center gap-2 p-2 bg-white border border-gray-200 text-sm overflow-x-auto">
                {/* HRG Section */}
                <div className="flex items-center shrink-0">
                  <span className="font-semibold text-blue-700 mr-1">HRG:</span>
                  <span className="text-blue-700 font-medium">
                    {Number(pageSpecificHrgAmt || 0).toLocaleString()}
                  </span>
                  <span className="text-gray-500 mx-1">/</span>
                  <span className="text-blue-700 font-medium">
                    {Number(totalHrgAmt || 0).toLocaleString()}
                  </span>
                  <span className="text-gray-500 ml-1">Php</span>
                </div>

                <div className="w-px h-5 bg-gray-300 shrink-0"></div>

                {/* FOM Section */}
                <div className="flex items-center shrink-0">
                  <span className="font-semibold text-green-700 mr-1">
                    FOM:
                  </span>
                  <span className="text-green-700 font-medium">
                    {Number(pageSpecificFomAmt || 0).toLocaleString()}
                  </span>
                  <span className="text-gray-500 mx-1">/</span>
                  <span className="text-green-700 font-medium">
                    {Number(totalFomAmt || 0).toLocaleString()}
                  </span>
                  <span className="text-gray-500 ml-1">Php</span>
                </div>

                <div className="w-px h-5 bg-gray-300 shrink-0"></div>

                {/* CAL Section - Compact version */}
                <div className="flex items-center shrink-0">
                  <span className="font-semibold text-amber-700 mr-1">
                    CAL:
                  </span>

                  {/* Quantity */}
                  <span className="text-gray-500 mr-1">Qty:</span>
                  <span className="text-amber-700 font-medium">
                    {Number(pageSpecificCalQty || 0).toLocaleString()}
                  </span>
                  <span className="text-gray-500 mx-1">/</span>
                  <span className="text-amber-700 font-medium">
                    {Number(totalCalQty || 0).toLocaleString()}
                  </span>

                  <span className="mx-2 text-gray-300">|</span>

                  {/* Sold */}
                  <span className="text-gray-500 mr-1">Sold:</span>
                  <span className="text-amber-700 font-medium">
                    {Number(pageSpecificCalAmt || 0).toLocaleString()}
                  </span>
                  <span className="text-gray-500 mx-1">/</span>
                  <span className="text-amber-700 font-medium">
                    {Number(totalCalAmt || 0).toLocaleString()}
                  </span>
                  <span className="text-gray-500 ml-1">Php</span>

                  <span className="mx-2 text-gray-300">|</span>

                  {/* Paid */}
                  <span className="text-gray-500 mr-1">Paid:</span>
                  <span className="text-amber-700 font-medium">
                    {Number(pageSpecificCalPaymtAmt || 0).toLocaleString()}
                  </span>
                  <span className="text-gray-500 mx-1">/</span>
                  <span className="text-amber-700 font-medium">
                    {Number(totalCalPaymtAmt || 0).toLocaleString()}
                  </span>
                  <span className="text-gray-500 ml-1">Php</span>
                </div>
              </div>
            </div>
          );
        }

        // Original HRG FOM CAL display (no WMM role)
        return (
          <div className="flex flex-nowrap items-center gap-2 p-2 bg-white border border-gray-200 text-sm overflow-x-auto">
            {/* HRG Section */}
            <div className="flex items-center shrink-0">
              <span className="font-semibold text-blue-700 mr-1">HRG:</span>
              <span className="text-blue-700 font-medium">
                {Number(pageSpecificHrgAmt || 0).toLocaleString()}
              </span>
              <span className="text-gray-500 mx-1">/</span>
              <span className="text-blue-700 font-medium">
                {Number(totalHrgAmt || 0).toLocaleString()}
              </span>
              <span className="text-gray-500 ml-1">Php</span>
            </div>

            <div className="w-px h-5 bg-gray-300 shrink-0"></div>

            {/* FOM Section */}
            <div className="flex items-center shrink-0">
              <span className="font-semibold text-green-700 mr-1">FOM:</span>
              <span className="text-green-700 font-medium">
                {Number(pageSpecificFomAmt || 0).toLocaleString()}
              </span>
              <span className="text-gray-500 mx-1">/</span>
              <span className="text-green-700 font-medium">
                {Number(totalFomAmt || 0).toLocaleString()}
              </span>
              <span className="text-gray-500 ml-1">Php</span>
            </div>

            <div className="w-px h-5 bg-gray-300 shrink-0"></div>

            {/* CAL Section - Compact version */}
            <div className="flex items-center shrink-0">
              <span className="font-semibold text-amber-700 mr-1">CAL:</span>

              {/* Quantity */}
              <span className="text-gray-500 mr-1">Qty:</span>
              <span className="text-amber-700 font-medium">
                {Number(pageSpecificCalQty || 0).toLocaleString()}
              </span>
              <span className="text-gray-500 mx-1">/</span>
              <span className="text-amber-700 font-medium">
                {Number(totalCalQty || 0).toLocaleString()}
              </span>

              <span className="mx-2 text-gray-300">|</span>

              {/* Sold */}
              <span className="text-gray-500 mr-1">Sold:</span>
              <span className="text-amber-700 font-medium">
                {Number(pageSpecificCalAmt || 0).toLocaleString()}
              </span>
              <span className="text-gray-500 mx-1">/</span>
              <span className="text-amber-700 font-medium">
                {Number(totalCalAmt || 0).toLocaleString()}
              </span>
              <span className="text-gray-500 ml-1">Php</span>

              <span className="mx-2 text-gray-300">|</span>

              {/* Paid */}
              <span className="text-gray-500 mr-1">Paid:</span>
              <span className="text-amber-700 font-medium">
                {Number(pageSpecificCalPaymtAmt || 0).toLocaleString()}
              </span>
              <span className="text-gray-500 mx-1">/</span>
              <span className="text-amber-700 font-medium">
                {Number(totalCalPaymtAmt || 0).toLocaleString()}
              </span>
              <span className="text-gray-500 ml-1">Php</span>
            </div>
          </div>
        );
      default:
        // Return empty div if no role matches
        return <div></div>;
    }
  }, [
    userRole,
    hasWmmRole,
    clientCountDisplay,
    totalCopies,
    pageSpecificCopies,
    totalCalQty,
    totalCalAmt,
    pageSpecificCalQty,
    pageSpecificCalAmt,
    totalHrgAmt,
    totalFomAmt,
    totalCalPaymtAmt,
    pageSpecificHrgAmt,
    pageSpecificFomAmt,
    pageSpecificCalPaymtAmt,
    filteredTotalCopies,
    filteredTotalClients,
  ]);

  const handleCellClick = (event, row, cell) => {
    if (cell.column.id === "select") {
      event.stopPropagation();
      return;
    }
    handleRowClick(event, row);
  };

  return (
    <div>
      <Table>
        <TableHeader className="sticky top-0 z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className="bg-blue-600 text-white font-bold text-lg sticky top-0 h-14 whitespace-nowrap"
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                  {header.column.getIsSorted() === "asc" && (
                    <ArrowDropUpSharp />
                  )}
                  {header.column.getIsSorted() === "desc" && (
                    <ArrowDropDownSharp />
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row, rowIndex) => (
              <TableRow
                key={`${row.id}-${rowIndex}`}
                className={`bg-gray-100 hover:bg-blue-100 hover:cursor-pointer border-b border-gray-500 last:border-none transition-all duration-300 ease-in-out ${
                  animationComplete
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-2"
                }`}
                style={{
                  transitionDelay: `${rowIndex * 40}ms`,
                }}
              >
                {row.getVisibleCells().map((cell) => {
                  const cellWidth = cell.column.columnDef.size;
                  return (
                    <TableCell
                      key={`${cell.id}-${rowIndex}`}
                      style={{
                        width: cellWidth,
                        maxWidth: cellWidth ? `${cellWidth}px` : "auto",
                        minWidth: cellWidth ? `${cellWidth}px` : "auto",
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                      }}
                      className={`${
                        cell.column.id === "select" ? "p-0 " : "px-4 py-2"
                      } overflow-visible`}
                      onClick={(event) => handleCellClick(event, row, cell)}
                    >
                      {cell.column.id === "Client Name" ? (
                        <div style={{ textAlign: "left" }}>
                          <div>{cell.getValue().split("<br>")[0]}</div>
                          {cell.getValue().split("<br>")[1] && (
                            <div className="font-bold">
                              {cell.getValue().split("<br>")[1]}
                            </div>
                          )}
                        </div>
                      ) : cell.column.id === "Address" ? (
                        <div style={{ textAlign: "left" }}>
                          <div>{cell.getValue().split("<br>")[0]}</div>
                          {cell.getValue().split("<br>")[1] && (
                            <div className="font-bold">
                              {cell
                                .getValue()
                                .split("<br>")[1]
                                .replace(/<\/?strong>/g, "")}
                            </div>
                          )}
                        </div>
                      ) : cell.column.id === "Contact Info" ? (
                        <div>{cell.getValue()}</div>
                      ) : cell.column.id === "Added Info" ? (
                        <div style={{ textAlign: "left" }}>
                          <div>
                            <strong>By:</strong>{" "}
                            {cell.getValue().split(", ")[0].split(": ")[1]}
                          </div>
                          <div>
                            <strong>Date:</strong>{" "}
                            {cell.getValue().split(", ")[1].split(": ")[1]}
                          </div>
                        </div>
                      ) : cell.column.id === "Subscription" &&
                        Array.isArray(cell.getValue()) ? (
                        <ul className="max-h-[200px] max-w-[450px] overflow-y-auto scrollbar-hide">
                          {cell.getValue().length > 0 ? (
                            cell.getValue().map((sub, index) => {
                              // Get status color class
                              const statusClass =
                                sub.status === "expired"
                                  ? "text-red-600 font-bold"
                                  : sub.status === "expiring-soon"
                                  ? "text-amber-600 font-bold"
                                  : sub.status === "active"
                                  ? "text-green-600"
                                  : "";

                              // Get status indicator
                              const statusIndicator =
                                sub.status === "expired"
                                  ? "🔴 "
                                  : sub.status === "expiring-soon"
                                  ? "🟡 "
                                  : sub.status === "active"
                                  ? "🟢 "
                                  : "";

                              return (
                                <li key={index} className="mb-1">
                                  <span className={statusClass}>
                                    {statusIndicator}
                                    <strong>{sub.subsclass}</strong>:{" "}
                                    {sub.subsdate} - {sub.enddate}, Cps:{" "}
                                    {sub.copies}
                                  </span>
                                  {(sub.paymtref || sub.paymtamt) && (
                                    <div className="text-xs ml-4 text-gray-600">
                                      {sub.paymtref && (
                                        <span>Ref: {sub.paymtref}</span>
                                      )}
                                      {sub.paymtref && sub.paymtamt && (
                                        <span> • </span>
                                      )}
                                      {sub.paymtamt && (
                                        <span>Amt: {sub.paymtamt}</span>
                                      )}
                                    </div>
                                  )}
                                </li>
                              );
                            })
                          ) : (
                            <li>No subscription data</li>
                          )}
                        </ul>
                      ) : cell.column.id === "HRG Data" &&
                        Array.isArray(cell.getValue()) ? (
                        <div className="w-full max-h-[150px] overflow-y-auto">
                          {cell.getValue().length > 0 ? (
                            <>
                              {/* Add status indicator for latest record */}
                              <div className="flex items-center gap-2 mb-2">
                                <span
                                  className={
                                    cell.getValue()[0].status === "Active"
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }
                                >
                                  {cell.getValue()[0].status === "Active"
                                    ? "🟢"
                                    : "🔴"}
                                </span>
                                <span
                                  className={
                                    cell.getValue()[0].status === "Active"
                                      ? "text-green-600 font-medium"
                                      : "text-red-600 font-medium"
                                  }
                                >
                                  {cell.getValue()[0].status}
                                </span>
                              </div>
                              {/* Existing HRG data display */}
                              {cell.getValue().map((hrg, index) => (
                                <div
                                  key={index}
                                  className="mb-2 pb-2 border-b border-gray-900 last:border-b-0"
                                >
                                  <div className="flex flex-wrap items-center">
                                    <div className="font-bold font-xs mr-1">
                                      Campaign Date: {hrg.campaigndate}
                                    </div>
                                    <div className="font-xs mr-1">
                                      Php {hrg.paymtamt} - Ref: #{hrg.paymtref}
                                    </div>
                                    <div className="font-xs mr-1">
                                      Receive Date: {hrg.recvdate}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </>
                          ) : (
                            <div className="text-gray-500 italic">
                              No HRG data
                            </div>
                          )}
                        </div>
                      ) : cell.column.id === "FOM Data" &&
                        Array.isArray(cell.getValue()) ? (
                        <div className="w-full max-h-[150px] overflow-y-auto">
                          {cell.getValue().length > 0 ? (
                            <>
                              {/* Add status indicator for latest record */}
                              <div className="flex items-center gap-2 mb-2">
                                <span
                                  className={
                                    cell.getValue()[0].status === "Active"
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }
                                >
                                  {cell.getValue()[0].status === "Active"
                                    ? "🟢"
                                    : "🔴"}
                                </span>
                                <span
                                  className={
                                    cell.getValue()[0].status === "Active"
                                      ? "text-green-600 font-medium"
                                      : "text-red-600 font-medium"
                                  }
                                >
                                  {cell.getValue()[0].status}
                                </span>
                              </div>
                              {/* Existing FOM data display */}
                              {cell.getValue().map((fom, index) => (
                                <div
                                  key={index}
                                  className="mb-2 pb-2 border-b border-gray-900 last:border-b-0"
                                >
                                  <div className="flex flex-wrap items-center">
                                    <div className="font-xs mr-1">
                                      Receive Date: {fom.recvdate}
                                    </div>
                                    <div className="font-xs mr-1">
                                      Php {fom.paymtamt} - Ref: #{fom.paymtref}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </>
                          ) : (
                            <div className="text-gray-500 italic">
                              No FOM data
                            </div>
                          )}
                        </div>
                      ) : cell.column.id === "CAL Data" &&
                        Array.isArray(cell.getValue()) ? (
                        <div className="w-full max-h-[150px] overflow-y-auto">
                          {cell.getValue().length > 0 ? (
                            <>
                              {cell.getValue().map((cal, index) => (
                                <div
                                  key={index}
                                  className="mb-2 pb-2 border-b border-gray-900 last:border-b-0"
                                >
                                  <div className="flex flex-wrap items-center">
                                    <span className="font-medium mr-1">
                                      {cal.recvdate} - {cal.caltype}
                                    </span>
                                    <span className="mr-1">
                                      Qty: {cal.calqty} - Cost: {cal.calamt} ={" "}
                                      {(
                                        parseInt(cal.calqty || 0) *
                                        parseFloat(
                                          cal.calamt?.replace(/[^\d.-]/g, "") ||
                                            0
                                        )
                                      ).toLocaleString()}
                                    </span>
                                    <span>
                                      Ref: #{cal.paymtref} - {cal.paymtform}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </>
                          ) : (
                            <div className="text-gray-500 italic">
                              No CAL data
                            </div>
                          )}
                        </div>
                      ) : cell.column.id === "Services" &&
                        Array.isArray(cell.getValue()) ? (
                        <ul className="text-center">
                          {cell.getValue().map((service, index) => (
                            <li
                              key={index}
                              style={{
                                textTransform: "uppercase",
                              }}
                            >
                              <strong>{service}</strong>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={table.getVisibleLeafColumns().length}
                className="text-center text-2xl"
              >
                No data
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        <tfoot>
          <TableRow>
            <TableCell
              colSpan={table.getVisibleLeafColumns().length}
              className={`h-[30px] sticky bottom-0 bg-white text-xs font-bold transition-opacity duration-300 ease-in-out ${
                animationComplete ? "opacity-100" : "opacity-0"
              }`}
              style={{
                transitionDelay: `${
                  table.getRowModel().rows.length * 40 + 100
                }ms`,
              }}
            >
              {totalLabel}
            </TableCell>
          </TableRow>
        </tfoot>
      </Table>
    </div>
  );
});
