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
  handleRowHover,
  handleRowClick,
  setHoverRowmetadata,
}) {
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
                  header.getContext(),
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
              onMouseEnter={() => handleRowHover(row)}
              onMouseLeave={() => setHoverRowmetadata(null)}
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
                    <ul style={{ paddingLeft: "20px" }}>
                      {cell.getValue().map((sub, index) => (
                        <li key={index}>
                          {sub.subsdate}, {sub.enddate}, {sub.copies}
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
    </Table>
  );
}
