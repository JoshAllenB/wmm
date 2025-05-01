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
    <span className="text-sm mr-4">
      Clients: <span className="font-medium">{Number(pageSpecificClients || 0).toLocaleString()}</span> <span className="text-gray-500">(Page)</span> / <span className="font-medium">{Number(totalClients || 0).toLocaleString()}</span> <span className="text-gray-500">(Total)</span>
    </span>
  ) : null;
  
  const getTotalLabel = () => {
    switch (userRole) {
      case "WMM":
        return (
          <div className="flex justify-between px-2 py-1">
            {clientCountDisplay}
            <span className="text-sm">
              Copies: <span className="font-medium">{Number(pageSpecificCopies || 0).toLocaleString()}</span> <span className="text-gray-500">(Page)</span> / <span className="font-medium">{Number(totalCopies || 0).toLocaleString()}</span> <span className="text-gray-500">(Total)</span>
            </span>
          </div>
        );
      case "CAL":
        return (
          <div className="flex justify-between px-2 py-1">
            <span className="text-sm">
              <span className="mr-4">Quantity: <span className="font-medium">{Number(pageSpecificCalQty || 0).toLocaleString()}</span> <span className="text-gray-500">(Page)</span> / <span className="font-medium">{Number(totalCalQty || 0).toLocaleString()}</span> <span className="text-gray-500">(Total)</span></span>
              <span>Amount: <span className="font-medium">{Number(pageSpecificCalAmt || 0).toLocaleString()}</span> <span className="text-gray-500">(Page)</span> / <span className="font-medium">{Number(totalCalAmt || 0).toLocaleString()}</span> <span className="text-gray-500">(Total)</span> Php</span>
            </span>
          </div>
        );
      case "HRG":
        return (
          <div className="flex justify-between px-2 py-1">
            <span className="text-sm text-blue-600">
              HRG Payment: <span className="font-medium">{Number(pageSpecificHrgAmt || 0).toLocaleString()}</span> <span className="text-gray-500">(Page)</span> / <span className="font-medium">{Number(totalHrgAmt || 0).toLocaleString()}</span> <span className="text-gray-500">(Total)</span> Php
            </span>
          </div>
        );
      case "FOM":
        return (
          <div className="flex justify-between px-2 py-1">
            <span className="text-sm text-green-600">
              FOM Payment: <span className="font-medium">{Number(pageSpecificFomAmt || 0).toLocaleString()}</span> <span className="text-gray-500">(Page)</span> / <span className="font-medium">{Number(totalFomAmt || 0).toLocaleString()}</span> <span className="text-gray-500">(Total)</span> Php
            </span>
          </div>
        );
      case "HRG FOM CAL":
        return (
          <div className="flex items-center justify-between px-2 py-1 bg-gray-50 rounded-md border border-gray-200">
            <div className="text-blue-600 text-sm whitespace-nowrap">
              <span className="font-medium">HRG: </span>
              <span className="font-medium">{Number(pageSpecificHrgAmt || 0).toLocaleString()}</span> <span className="text-gray-500 text-xs">(Page)</span> / <span className="font-medium">{Number(totalHrgAmt || 0).toLocaleString()}</span> <span className="text-gray-500 text-xs">(Total)</span> Php
            </div>
            
            <div className="text-green-600 text-sm mx-4 whitespace-nowrap">
              <span className="font-medium">FOM: </span>
              <span className="font-medium">{Number(pageSpecificFomAmt || 0).toLocaleString()}</span> <span className="text-gray-500 text-xs">(Page)</span> / <span className="font-medium">{Number(totalFomAmt || 0).toLocaleString()}</span> <span className="text-gray-500 text-xs">(Total)</span> Php
            </div>
            
            <div className="text-amber-600 text-sm whitespace-nowrap">
              <span className="font-medium">CAL:</span>
              <div className="inline-flex flex-col ml-1">
                <div>
                  <span className="font-medium">Quantity:</span> <span className="font-medium">{Number(pageSpecificCalQty || 0).toLocaleString()}</span> <span className="text-gray-500 text-xs">(Page)</span> / <span className="font-medium">{Number(totalCalQty || 0).toLocaleString()}</span> <span className="text-gray-500 text-xs">(Total)</span>
                </div>
                <div>
                  <span className="font-medium">Amount:</span> <span className="font-medium">{Number(pageSpecificCalAmt || 0).toLocaleString()}</span> <span className="text-gray-500 text-xs">(Page)</span> / <span className="font-medium">{Number(totalCalAmt || 0).toLocaleString()}</span> <span className="text-gray-500 text-xs">(Total)</span> Php
                </div>
                <div>
                  <span className="font-medium">Payment:</span> <span className="font-medium">{Number(pageSpecificCalPaymtAmt || 0).toLocaleString()}</span> <span className="text-gray-500 text-xs">(Page)</span> / <span className="font-medium">{Number(totalCalPaymtAmt || 0).toLocaleString()}</span> <span className="text-gray-500 text-xs">(Total)</span> Php
                </div>
              </div>
            </div>
          </div>
        );
      default:
        // For composite roles or other roles
        return (
          <div className="flex flex-col px-2 py-1">
            {/* Add client count here if WMM is part of the role */}
            {hasWmmRole && (
              <div className="mb-2">
                {clientCountDisplay}
              </div>
            )}
            <div className="text-sm">
              <span className="text-blue-600 mr-4">
                <span className="font-medium">HRG:</span> {Number(pageSpecificHrgAmt || 0).toLocaleString()} <span className="text-gray-500 text-xs">(Page)</span> / {Number(totalHrgAmt || 0).toLocaleString()} <span className="text-gray-500 text-xs">(Total)</span> Php
              </span>
              <span className="text-green-600 mr-4">
                <span className="font-medium">FOM:</span> {Number(pageSpecificFomAmt || 0).toLocaleString()} <span className="text-gray-500 text-xs">(Page)</span> / {Number(totalFomAmt || 0).toLocaleString()} <span className="text-gray-500 text-xs">(Total)</span> Php
              </span>
              <span className="text-amber-600">
                <span className="font-medium">CAL:</span>
                <div className="inline-block ml-1 border-l-2 border-amber-200 pl-2">
                  <div>
                    <span className="font-medium">Quantity:</span> {Number(pageSpecificCalQty || 0).toLocaleString()} <span className="text-gray-500 text-xs">(Page)</span> / {Number(totalCalQty || 0).toLocaleString()} <span className="text-gray-500 text-xs">(Total)</span>
                  </div>
                  <div>
                    <span className="font-medium">Amount:</span> {Number(pageSpecificCalAmt || 0).toLocaleString()} <span className="text-gray-500 text-xs">(Page)</span> / {Number(totalCalAmt || 0).toLocaleString()} <span className="text-gray-500 text-xs">(Total)</span> Php
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
                  className="bg-blue-500 text-white sticky top-0 h-12"
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
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={`${cell.id}-${rowIndex}`}
                    style={{ width: cell.column.columnDef.size }}
                    className={`${
                      cell.column.id === "select" ? "p-0 " : "px-4 py-2"
                    }`}
                    onClick={(event) => handleCellClick(event, row, cell)}
                  >
                    {cell.column.id === "Client Name" ? (
                      <div style={{ textAlign: "left" }}>
                        <div>{cell.getValue().split("<br>")[0]}</div>
                        {cell.getValue().split("<br>")[1] && (
                          <div className="text font-bold">
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
                      <div className="max-h-[200px] overflow-y-auto pr-2">
                        {cell.getValue().length > 0 ? (
                          cell.getValue().map((hrg, index) => (
                            <div key={index} className="mb-1 text-sm">
                              <span className="text-gray-600">{hrg.recvdate}</span>
                              <span className="mx-1">•</span>
                              <span className={hrg.status === "Active" ? "text-green-600" : "text-red-600"}>
                                {hrg.status}
                              </span>
                              <span className="mx-1">•</span>
                              <span className="text-gray-600">{hrg.paymtamt}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-500 italic">No HRG data</div>
                        )}
                      </div>
                    ) : cell.column.id === "FOM Data" &&
                      Array.isArray(cell.getValue()) ? (
                      <div className="max-h-[200px] overflow-y-auto pr-2">
                        {cell.getValue().length > 0 ? (
                          cell.getValue().map((fom, index) => (
                            <div key={index} className="mb-1 text-sm">
                              <span className="text-gray-600">{fom.recvdate}</span>
                              <span className="mx-1">•</span>
                              <span className={fom.status === "Active" ? "text-green-600" : "text-red-600"}>
                                {fom.status}
                              </span>
                              <span className="mx-1">•</span>
                              <span className="text-gray-600">{fom.paymtamt}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-500 italic">No FOM data</div>
                        )}
                      </div>
                    ) : cell.column.id === "CAL Data" &&
                      Array.isArray(cell.getValue()) ? (
                      <div className="max-h-[200px] overflow-y-auto pr-2">
                        {cell.getValue().length > 0 ? (
                          cell.getValue().map((cal, index) => (
                            <div key={index} className="mb-1 text-sm">
                              <span className="text-gray-600">{cal.recvdate}</span>
                              <span className="mx-1">•</span>
                              <span className="text-gray-600">{cal.caltype}</span>
                              <span className="mx-1">•</span>
                              <span className="text-gray-600">Qty: {cal.calqty}</span>
                              <span className="mx-1">•</span>
                              <span className="text-gray-600">{cal.calamt}</span>
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
                ))}
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
