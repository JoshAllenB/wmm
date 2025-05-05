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

export function TableComponent({
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
}) {
  // Check if role contains WMM (either as a single role or part of a composite role)
  const hasWmmRole = userRole === "WMM" || userRole?.includes("WMM");
  
  // Client count display for roles that include WMM
  const clientCountDisplay = hasWmmRole ? (
    <span className="text-base mr-4 text-gray-800">
      Clients: <span className="font-bold">{Number(pageSpecificClients || 0).toLocaleString()}</span> <span className="text-gray-500 text-xs">(Page)</span> / <span className="font-bold">{Number(totalClients || 0).toLocaleString()}</span> <span className="text-gray-500 text-xs">(Total)</span>
    </span>
  ) : null;
  
  const getTotalLabel = () => {
    switch (userRole) {
      case "WMM":
        return (
          <div className="flex flex-wrap justify-between px-2 py-1">
            {clientCountDisplay}
            <span className="text-base text-gray-800 font-medium">
              Copies: <span className="font-bold">{Number(pageSpecificCopies || 0).toLocaleString()}</span> <span className="text-gray-500 text-xs">(Page)</span> / <span className="font-bold">{Number(totalCopies || 0).toLocaleString()}</span> <span className="text-gray-500 text-xs">(Total)</span>
            </span>
          </div>
        );
      case "CAL":
        return (
          <div className="flex flex-wrap justify-between px-2 py-1">
            <span className="text-sm sm:text-base">
              <span className="mr-2 sm:mr-4 text-gray-800 font-medium">Qty: <span className="font-bold">{Number(pageSpecificCalQty || 0).toLocaleString()}</span> <span className="text-gray-500 text-xs">(Page)</span> / <span className="font-bold">{Number(totalCalQty || 0).toLocaleString()}</span> <span className="text-gray-500 text-xs">(Total)</span></span>
              <span className="text-gray-800 font-medium">Amt: <span className="font-bold">{Number(pageSpecificCalAmt || 0).toLocaleString()}</span> <span className="text-gray-500 text-xs">(Page)</span> / <span className="font-bold">{Number(totalCalAmt || 0).toLocaleString()}</span> <span className="text-gray-500 text-xs">(Total)</span> Php</span>
            </span>
          </div>
        );
      case "HRG":
        return (
          <div className="flex justify-between px-2 py-1">
            <span className="text-base text-blue-700 font-medium">
              HRG Payment: <span className="font-bold">{Number(pageSpecificHrgAmt || 0).toLocaleString()}</span> <span className="text-gray-500 text-xs">(Page)</span> / <span className="font-bold">{Number(totalHrgAmt || 0).toLocaleString()}</span> <span className="text-gray-500 text-xs">(Total)</span> Php
            </span>
          </div>
        );
      case "FOM":
        return (
          <div className="flex justify-between px-2 py-1">
            <span className="text-base text-green-700 font-medium">
              FOM Payment: <span className="font-bold">{Number(pageSpecificFomAmt || 0).toLocaleString()}</span> <span className="text-gray-500 text-xs">(Page)</span> / <span className="font-bold">{Number(totalFomAmt || 0).toLocaleString()}</span> <span className="text-gray-500 text-xs">(Total)</span> Php
            </span>
          </div>
        );
        case "HRG FOM CAL":
          return (
            <div className="flex flex-nowrap items-center gap-2 p-2 bg-white border border-gray-200 text-sm overflow-x-auto">
              {/* HRG Section */}
              <div className="flex items-center shrink-0">
                <span className="font-semibold text-blue-700 mr-1">HRG:</span>
                <span className="text-blue-700 font-medium">{Number(pageSpecificHrgAmt || 0).toLocaleString()}</span>
                <span className="text-gray-500 mx-1">/</span>
                <span className="text-blue-700 font-medium">{Number(totalHrgAmt || 0).toLocaleString()}</span>
                <span className="text-gray-500 ml-1">Php</span>
              </div>
        
              <div className="w-px h-5 bg-gray-300 shrink-0"></div>
        
              {/* FOM Section */}
              <div className="flex items-center shrink-0">
                <span className="font-semibold text-green-700 mr-1">FOM:</span>
                <span className="text-green-700 font-medium">{Number(pageSpecificFomAmt || 0).toLocaleString()}</span>
                <span className="text-gray-500 mx-1">/</span>
                <span className="text-green-700 font-medium">{Number(totalFomAmt || 0).toLocaleString()}</span>
                <span className="text-gray-500 ml-1">Php</span>
              </div>
        
              <div className="w-px h-5 bg-gray-300 shrink-0"></div>
        
              {/* CAL Section - Compact version */}
              <div className="flex items-center shrink-0">
                <span className="font-semibold text-amber-700 mr-1">CAL:</span>
        
                {/* Quantity */}
                <span className="text-gray-500 mr-1">Qty:</span>
                <span className="text-amber-700 font-medium">{Number(pageSpecificCalQty || 0).toLocaleString()}</span>
                <span className="text-gray-500 mx-1">/</span>
                <span className="text-amber-700 font-medium">{Number(totalCalQty || 0).toLocaleString()}</span>
        
                <span className="mx-2 text-gray-300">|</span>
        
                {/* Sold */}
                <span className="text-gray-500 mr-1">Sold:</span>
                <span className="text-amber-700 font-medium">{Number(pageSpecificCalAmt || 0).toLocaleString()}</span>
                <span className="text-gray-500 mx-1">/</span>
                <span className="text-amber-700 font-medium">{Number(totalCalAmt || 0).toLocaleString()}</span>
                <span className="text-gray-500 ml-1">Php</span>
        
                <span className="mx-2 text-gray-300">|</span>
        
                {/* Paid */}
                <span className="text-gray-500 mr-1">Paid:</span>
                <span className="text-amber-700 font-medium">{Number(pageSpecificCalPaymtAmt || 0).toLocaleString()}</span>
                <span className="text-gray-500 mx-1">/</span>
                <span className="text-amber-700 font-medium">{Number(totalCalPaymtAmt || 0).toLocaleString()}</span>
                <span className="text-gray-500 ml-1">Php</span>
              </div>
            </div>
          );              default:
        // For composite roles or other roles
        return (
          <div className="flex flex-col px-2 py-1">
            {/* Add client count here if WMM is part of the role */}
            {hasWmmRole && (
              <div className="mb-2">
                {clientCountDisplay}
              </div>
            )}
            <div className="text-base">
              <span className="text-blue-700 mr-4">
                <span className="font-bold">HRG:</span> {Number(pageSpecificHrgAmt || 0).toLocaleString()} <span className="text-gray-500 text-xs">(Page)</span> / {Number(totalHrgAmt || 0).toLocaleString()} <span className="text-gray-500 text-xs">(Total)</span> Php
              </span>
              <span className="text-green-700 mr-4">
                <span className="font-bold">FOM:</span> {Number(pageSpecificFomAmt || 0).toLocaleString()} <span className="text-gray-500 text-xs">(Page)</span> / {Number(totalFomAmt || 0).toLocaleString()} <span className="text-gray-500 text-xs">(Total)</span> Php
              </span>
              <span className="text-amber-700">
                <span className="font-bold">CAL:</span>
                <div className="inline-block ml-1 border-l-2 border-amber-300 pl-2">
                  <div className="mb-1">
                    <span className="font-bold">Quantity:</span> {Number(pageSpecificCalQty || 0).toLocaleString()} <span className="text-gray-500 text-xs">(Page)</span> / {Number(totalCalQty || 0).toLocaleString()} <span className="text-gray-500 text-xs">(Total)</span>
                  </div>
                  <div>
                    <span className="font-bold">Amount:</span> {Number(pageSpecificCalAmt || 0).toLocaleString()} <span className="text-gray-500 text-xs">(Page)</span> / {Number(totalCalAmt || 0).toLocaleString()} <span className="text-gray-500 text-xs">(Total)</span> Php
                  </div>
                </div>
              </span>
            </div>
          </div>
        );
    }
  };

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
                      maxWidth: cellWidth ? `${cellWidth}px` : 'auto',
                      minWidth: cellWidth ? `${cellWidth}px` : 'auto',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word'
                    }}
                    className={`${
                      cell.column.id === "select" ? "p-0 " : "px-4 py-2"
                    } overflow-visible`}
                    onClick={(event) => handleCellClick(event, row, cell)}
                  >
                    {cell.column.id === "Client Name" ? (
                      <div style={{ textAlign: "left" }}>
                        <Tooltip title={cell.getValue().split("<br>")[0]} arrow placement="top-start">
                          <div className="truncate">{cell.getValue().split("<br>")[0]}</div>
                        </Tooltip>
                        {cell.getValue().split("<br>")[1] && (
                          <div className="font-bold truncate">
                            {cell.getValue().split("<br>")[1]}
                          </div>
                        )}
                      </div>
                    ) : cell.column.id === "Address" ? (
                      <div style={{ textAlign: "left" }}>
                        <Tooltip title={cell.getValue().split("<br>")[0]} arrow placement="top-start">
                          <div className="truncate">{cell.getValue().split("<br>")[0]}</div>
                        </Tooltip>
                        {cell.getValue().split("<br>")[1] && (
                          <div className="font-bold truncate">
                            {cell
                              .getValue()
                              .split("<br>")[1]
                              .replace(/<\/?strong>/g, "")}
                          </div>
                        )}
                      </div>
                    ) : cell.column.id === "Contact Info" ? (
                      <Tooltip title={cell.getValue()} arrow placement="top-start">
                        <div className="truncate">{cell.getValue()}</div>
                      </Tooltip>
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
                                    {sub.paymtref && <span>Ref: {sub.paymtref}</span>}
                                    {sub.paymtref && sub.paymtamt && <span> • </span>}
                                    {sub.paymtamt && <span>Amt: {sub.paymtamt}</span>}
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
                          cell.getValue().map((hrg, index) => (
                            <div 
                              key={index} 
                              className="mb-2 pb-2 border-b border-gray-900 last:border-b-0"
                            >
                              <div className="flex flex-wrap items-center">
                                <span className="font-xs mr-1">{hrg.recvdate} - {hrg.paymtamt}</span>
                                <span className="font-xs mr-1">Ref: #{hrg.paymtref}</span>
                                <span className={hrg.status === "Active" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                                  {hrg.status}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-500 italic">No HRG data</div>
                        )}
                      </div>
                    ) : cell.column.id === "FOM Data" &&
                      Array.isArray(cell.getValue()) ? (
                      <div className="w-full max-h-[150px] overflow-y-auto">
                        {cell.getValue().length > 0 ? (
                          cell.getValue().map((fom, index) => (
                            <div 
                              key={index} 
                              className="mb-2 pb-2 border-b border-gray-900 last:border-b-0"
                            >
                              <div className="flex flex-wrap items-center">
                                <span className="font-xs mr-1">{fom.recvdate} - {fom.paymtamt}</span>
                                <span className={fom.status === "Active" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                                  {fom.status}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-500 italic">No FOM data</div>
                        )}
                      </div>
                    ) : cell.column.id === "CAL Data" &&
                      Array.isArray(cell.getValue()) ? (
                      <div className="w-full max-h-[150px] overflow-y-auto">
                        {cell.getValue().length > 0 ? (
                          cell.getValue().map((cal, index) => (
                            <div 
                              key={index} 
                              className="mb-2 pb-2 border-b border-gray-900 last:border-b-0"
                            >
                              <div className="flex flex-wrap items-center">
                                <span className="font-medium mr-1">{cal.recvdate} - {cal.caltype}</span>
                                <span className="font-medium mr-1">Qty: {cal.calqty} - Cost: {cal.calamt}</span>
                                <span className="font-medium">Ref: #{cal.paymtref} - {cal.paymtform}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-500 italic">No CAL data</div>
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
                      flexRender(cell.column.columnDef.cell, cell.getContext())
                    )}
                  </TableCell>
                )})}
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
              {getTotalLabel()}
            </TableCell>
          </TableRow>
        </tfoot>
      </Table>
    </div>
  );
}
