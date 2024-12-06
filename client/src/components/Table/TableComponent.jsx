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
  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                key={header.id}
                onClick={header.column.getToggleSortingHandler()}
                className="text-center bg-blue-500 text-white sticky top-0"
              >
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext()
                )}
                {header.column.getIsSorted() === "asc" && <ArrowDropUpSharp />}
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
          table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className="bg-gray-100 hover:bg-blue-100 hover:cursor-pointer"
              onClick={(event) => handleRowClick(event, row)}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  style={{ width: cell.column.columnDef.size }}
                  className={`text-center${
                    cell.column.id === "select" ? "checkbox-cell" : ""
                  }`}
                >
                  {cell.column.id === "Subscription" &&
                  Array.isArray(cell.getValue()) ? (
                    <ul className="max-h-[200px] max-w-[350px] overflow-y-auto scrollbar-hide">
                      {cell.getValue().map((sub, index) => (
                        <li
                          key={index}
                          className="text-left border-b border-gray-500 last:border-none pb-2 mb-2"
                        >
                          <strong>Start Date:</strong> {sub.subsdate},<br />
                          <strong>End Date:</strong> {sub.enddate},<br />
                          <strong>Copies:</strong> {sub.copies}
                        </li>
                      ))}
                    </ul>
                  ) : cell.column.id === "HRG Data" &&
                    Array.isArray(cell.getValue()) ? (
                    <ul>
                      {cell.getValue().map((hrg, index) => (
                        <li key={index} style={{ textAlign: "left" }}>
                          <strong>Received Date:</strong> {hrg.recvdate}, <br />
                          <strong>Renew Date:</strong> {hrg.renewdate}, <br />
                          <strong>Campaign Date: </strong> {hrg.campaigndate},
                          <br />
                          <strong>Payment Reference: </strong> {hrg.paymtref},
                          <br />
                          <strong>Payment Amount: </strong>
                          {hrg.paymtamt ? `${hrg.paymtamt}` : ""}, <br />
                          <strong>Unsubscribe: </strong>
                          {hrg.unsubscribe ? "Active" : "Unsubscribed"}, <br />
                        </li>
                      ))}
                    </ul>
                  ) : cell.column.id === "FOM Data" &&
                    Array.isArray(cell.getValue()) ? (
                    <ul>
                      {cell.getValue().map((fom, index) => (
                        <li key={index} style={{ textAlign: "left" }}>
                          <strong>Received Date:</strong> {fom.recvdate}, <br />
                          <strong>Remarks:</strong> {fom.remarks}, <br />
                          <strong>Payment Amount:</strong> {fom.paymtamt},{" "}
                          <br />
                          <strong>Status:</strong> {fom.unsubscribe}, <br />
                          <strong>Added Date:</strong> {fom.adddate}, <br />
                          <strong>Added By:</strong> {fom.adduser}
                        </li>
                      ))}
                    </ul>
                  ) : cell.column.id === "CAL Data" &&
                    Array.isArray(cell.getValue()) ? (
                    <ul>
                      {cell.getValue().map((cal, index) => (
                        <li key={index} style={{ textAlign: "left" }}>
                          <strong>Received Date:</strong> {cal.recvdate}, <br />
                          <strong>Type:</strong> {cal.caltype}, <br />
                          <strong>Quantity:</strong> {cal.calqty}, <br />
                          <strong>Amount:</strong> {cal.calamt}, <br />
                          <strong>Payment Reference:</strong> {cal.paymtref},{" "}
                          <br />
                          <strong>Payment Amount:</strong> {cal.paymtamt},{" "}
                          <br />
                          <strong>Payment Form:</strong> {cal.paymtform}, <br />
                          <strong>Payment Date:</strong> {cal.paymtdate}, <br />
                          <strong>Added Date:</strong> {cal.adddate}, <br />
                          <strong>Added By:</strong> {cal.adduser}
                        </li>
                      ))}
                    </ul>
                  ) : cell.column.id === "Services" &&
                    Array.isArray(cell.getValue()) ? (
                    <ul>
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
  );
}
