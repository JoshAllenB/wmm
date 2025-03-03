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
        <TableHeader>
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
                className="bg-gray-100 hover:bg-blue-100 hover:cursor-pointer border-b border-gray-500 last:border-none"
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
                        <div className="text font-bold">
                          {cell.getValue().split("<br>")[1]}
                        </div>
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
                      <ul className="max-h-[200px] max-w-[350px] overflow-y-auto scrollbar-hide">
                        {cell.getValue().map((sub, index) => (
                          <li key={index}>
                            <strong>{sub.subsclass}</strong>: {sub.subsdate} -{" "}
                            {sub.enddate}, Cps: {sub.copies}
                          </li>
                        ))}
                      </ul>
                    ) : cell.column.id === "HRG Data" &&
                      Array.isArray(cell.getValue()) ? (
                      <ul>
                        {cell.getValue().map((hrg, index) => (
                          <li key={index} style={{ textAlign: "left" }}>
                            <strong>Received Date:</strong> {hrg.recvdate},{" "}
                            <br />
                            <strong>Renew Date:</strong> {hrg.renewdate}, <br />
                            <strong>Campaign Date: </strong> {hrg.campaigndate},
                            <br />
                            <strong>Payment Reference: {hrg.paymtref}</strong> ,
                            <br />
                            <strong>Payment Amount: {hrg.paymtamt}</strong>
                            <br />
                            <strong>Status:</strong> {hrg.unsubscribe} <br />
                          </li>
                        ))}
                      </ul>
                    ) : cell.column.id === "FOM Data" &&
                      Array.isArray(cell.getValue()) ? (
                      <ul>
                        {cell.getValue().map((fom, index) => (
                          <li key={index} style={{ textAlign: "left" }}>
                            <strong>Received Date:</strong> {fom.recvdate},{" "}
                            <br />
                            <strong>Payment Amount:</strong> {fom.paymtamt},{" "}
                            <br />
                            <strong>Status:</strong> {fom.unsubscribe} <br />
                            <strong>Remarks:</strong> {fom.remarks}, <br />
                          </li>
                        ))}
                      </ul>
                    ) : cell.column.id === "CAL Data" &&
                      Array.isArray(cell.getValue()) ? (
                      <ul>
                        {cell.getValue().map((cal, index) => (
                          <li key={index} style={{ textAlign: "left" }}>
                            <strong>Received Date:</strong> {cal.recvdate},{" "}
                            <br />
                            <strong>Type:</strong> {cal.caltype}, <br />
                            <strong>Quantity:</strong> {cal.calqty}, <br />
                            <strong>Amount:</strong> {cal.calamt}, <br />
                            <strong>Payment Reference:</strong> {cal.paymtref},{" "}
                            <br />
                            <strong>Payment Amount:</strong> {cal.paymtamt},{" "}
                            <br />
                            <strong>Payment Form:</strong> {cal.paymtform},{" "}
                            <br />
                            <strong>Payment Date:</strong> {cal.paymtdate},{" "}
                            <br />
                            <strong>Added Date:</strong> {cal.adddate}, <br />
                            <strong>Added By:</strong> {cal.adduser}
                          </li>
                        ))}
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
              className="h-[30px] sticky bottom-0 bg-white text-xs font-bold"
            >
              {getTotalLabel()}
            </TableCell>
          </TableRow>
        </tfoot>
      </Table>
    </div>
  );
}
