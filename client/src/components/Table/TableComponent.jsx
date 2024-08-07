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
  theme,
  handleRowHover,
  handleRowClick,
  setHoverRowmetadata,
}) {
  return (
    <Table>
      <TableHeader
        className={
          theme.palette.mode === "dark" ? "bg-gray-700" : "bg-gray-400"
        }
      >
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                key={header.id}
                onClick={header.column.getToggleSortingHandler()}
                className={`sticky top-0 ${
                    theme.palette.mode === "dark"
                      ? "bg-gray-700"
                      : "bg-gray-400"
                  }`}
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
          table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className={
                theme.palette.mode === "dark"
                  ? "hover:bg-gray-600 cursor-pointer"
                  : "hover:bg-gray-300 cursor-pointer"
              }
              onMouseEnter={() => handleRowHover(row)}
              onMouseLeave={() => setHoverRowmetadata(null)}
              onClick={(event) => handleRowClick(event, row)}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  style={{ width: cell.column.columnDef.size }}
                  className={
                    cell.column.id === "select" ? "checkbox-cell" : ""
                  }
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={table.getVisibleLeafColumns().length}>
              No data
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
