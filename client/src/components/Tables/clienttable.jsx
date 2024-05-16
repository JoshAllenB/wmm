import { useState, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { ScrollArea, ScrollBar } from "../UI/ShadCN/scroll-area";
import {
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  TableHeader,
} from "../UI/ShadCN/table";
import { Input } from "../UI/ShadCN/input";
import HoverCard from "../UI/HoverCard";
import Edit from "../edit";
import { fetchClients } from "./Data/clientdata";
import { useTheme } from "@mui/material";
import ArrowDropUpSharpIcon from "@mui/icons-material/ArrowDropUpSharp";
import ArrowDropDownSharpIcon from "@mui/icons-material/ArrowDropDownSharp";
import { Button } from "../UI/ShadCN/button";
import { tokens } from "../UI/Theme/theme.utils";

export default function ClientTable({ columns }) {
  const [data, setData] = useState([]);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [selectedRow, setSelectedRow] = useState();
  const [showEditModal, setShowEditModal] = useState();

  useEffect(() => {
    fetchClients(setData);
  }, []);

  const [sorting, setSorting] = useState([]);
  const [filtering, setFiltering] = useState("");

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting: sorting,
      globalFilter: filtering,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFiltering,
  });

  const bgColor =
    theme.palette.mode === "dark" ? colors.mirage[500] : colors.mirage[500];

  const [hoverRowMetadata, setHoverRowMetadata] = useState(null);

  const handleRowHover = (rowData) => {
    const { original } = rowData;
    const { adduser, adddate, metadata } = original;

    setHoverRowMetadata({ metadata, adduser, adddate });
  };

  const handleRowClick = (rowData) => {
    const rowValues = rowData.original;
    setSelectedRow(rowValues);
  };

  const [page, setPage] = useState(1);

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
      fetchClients(setData, page - 1);
    }
  };

  const handleNextPage = () => {
    setPage(page + 1);
    fetchClients(setData, page + 1);
  };

  return (
    <>
      <Input
        type="text"
        value={filtering}
        onChange={(e) => setFiltering(e.target.value)}
        placeholder="Search Client"
        className="w-[300px] mb-3 border-2 border-secondary"
      />
      <ScrollArea className="rounded-md border border-secondary h-[700px]">
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
                  >
                    <>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getIsSorted() === "asc" && (
                        <ArrowDropUpSharpIcon />
                      )}
                      {header.column.getIsSorted() === "desc" && (
                        <ArrowDropDownSharpIcon />
                      )}
                    </>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={
                  theme.palette.mode === "dark"
                    ? "hover:bg-gray-600 cursor-pointer"
                    : "hover:bg-gray-300 cursor-pointer"
                }
                onMouseEnter={() => handleRowHover(row)}
                onMouseLeave={() => setHoverRowMetadata(null)}
                onClick={() => handleRowClick(row)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" className="red-400" />
      </ScrollArea>
      <div className="mt-4 flex gap-2">
        <Button
          disabled={!table.getCanPreviousPage}
          onClick={handlePreviousPage}
          style={{ backgroundColor: bgColor }}
          className="text-white"
        >
          Previous
        </Button>
        <Button
          disabled={!table.getCanNextPage}
          onClick={handleNextPage}
          style={{
            backgroundColor: bgColor,
            ":hover": {
              backgroundColor: colors.mirage[600],
            },
          }}
          className="text-white"
        >
          Next
        </Button>
        {selectedRow && (
          <Edit
            rowData={selectedRow}
            onClose={() => {
              setSelectedRow(null);
              setShowEditModal(false);
            }}
            showModal={showEditModal}
            setShowModal={setShowEditModal}
          />
        )}
        {hoverRowMetadata && (
          <HoverCard
            metadata={hoverRowMetadata.metadata}
            adduser={hoverRowMetadata.adduser}
            adddate={hoverRowMetadata.adddate}
          />
        )}
      </div>
    </>
  );
}
