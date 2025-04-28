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
}) {
  const getTotalLabel = () => {
    switch (userRole) {
      case "WMM":
        return (
          <div className="flex space-x-1">
            <div>
              Page Total Copies: {pageSpecificCopies || 0} | Total Copies:{" "}
              {totalCopies || 0}
            </div>
          </div>
        );
      case "CAL":
        return (
          <div className="flex justify-between m-1">
            <div>
              Page Total Cal Qty: {pageSpecificCalQty || 0} | Page Total Cal
              Amt: Php {pageSpecificCalAmt || 0}
            </div>
            <div>
              Total Cal Qty: {totalCalQty || 0} | Total Cal Amt: Php{" "}
              {totalCalAmt || 0}
            </div>
          </div>
        );
      default:
        return "";
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
                      <ul className="max-h-[200px] max-w-[350px] overflow-y-auto scrollbar-hide">
                        {cell.getValue().length > 0 ? (
                          cell.getValue().map((hrg, index) => (
                            <li key={index} style={{ textAlign: "left" }}>
                              <div>
                                <strong>Recv:</strong> {hrg.recvdate}
                              </div>
                              <div>
                                <strong>Renew:</strong> {hrg.renewdate}
                              </div>
                              <div>
                                <strong>Camp:</strong> {hrg.campaigndate}
                              </div>
                              <div>
                                <strong>Ref:</strong> {hrg.paymtref}
                              </div>
                              <div>
                                <strong>Amt:</strong> {hrg.paymtamt}
                              </div>
                              <div>
                                <strong>Status:</strong> {hrg.unsubscribe}
                              </div>
                            </li>
                          ))
                        ) : (
                          <li>No HRG data</li>
                        )}
                      </ul>
                    ) : cell.column.id === "FOM Data" &&
                      Array.isArray(cell.getValue()) ? (
                      <ul className="max-h-[200px] max-w-[350px] overflow-y-auto scrollbar-hide">
                        {cell.getValue().length > 0 ? (
                          cell.getValue().map((fom, index) => (
                            <li key={index} style={{ textAlign: "left" }}>
                              <div>
                                <strong>Recv:</strong> {fom.recvdate}
                              </div>
                              <div>
                                <strong>Amt:</strong> {fom.paymtamt}
                              </div>
                              <div>
                                <strong>Status:</strong> {fom.unsubscribe}
                              </div>
                              <div>
                                <strong>Remarks:</strong> {fom.remarks}
                              </div>
                            </li>
                          ))
                        ) : (
                          <li>No FOM data</li>
                        )}
                      </ul>
                    ) : cell.column.id === "CAL Data" &&
                      Array.isArray(cell.getValue()) ? (
                      <ul className="max-h-[200px] max-w-[350px] overflow-y-auto scrollbar-hide">
                        {cell.getValue().length > 0 ? (
                          cell.getValue().map((cal, index) => (
                            <li key={index} style={{ textAlign: "left" }}>
                              <div>
                                <strong>Recv:</strong> {cal.recvdate}
                              </div>
                              <div>
                                <strong>Type:</strong> {cal.caltype}
                              </div>
                              <div>
                                <strong>Qty:</strong> {cal.calqty}
                              </div>
                              <div>
                                <strong>Amt:</strong> {cal.calamt}
                              </div>
                              <div>
                                <strong>Ref:</strong> {cal.paymtref}
                              </div>
                              <div>
                                <strong>Pay:</strong> {cal.paymtamt}
                              </div>
                              <div>
                                <strong>Form:</strong> {cal.paymtform}
                              </div>
                              <div>
                                <strong>Date:</strong> {cal.paymtdate}
                              </div>
                              <div>
                                <strong>Added:</strong> {cal.adddate}
                              </div>
                              <div>
                                <strong>By:</strong> {cal.adduser}
                              </div>
                            </li>
                          ))
                        ) : (
                          <li>No CAL data</li>
                        )}
                      </ul>
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
