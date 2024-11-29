import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";

export function useTableLogic(
  data,
  columns,
  usePagination,
  page,
  pageSize,
  rowSelection,
  setRowSelection
) {
  const [sorting, setSorting] = useState([]);
  const [filtering, setFiltering] = useState("");

  // Ensure data is always an array
  const tableData = Array.isArray(data) ? data : [];

  // Use useCallback to memoize the table creation
  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(usePagination
      ? {
          getPaginationRowModel: getPaginationRowModel(),
          // Explicitly set manual pagination
          manualPagination: true,
        }
      : {}),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      rowSelection,
      globalFilter: filtering,
      pagination: {
        pageIndex: page - 1, // tanstack uses 0-indexed pages
        pageSize,
      },
    },
    getRowId: (row) => row?.id || crypto.randomUUID(), // fallback to a unique ID
    onSortingChange: setSorting,
    onGlobalFilterChange: setFiltering,
  });

  return table;
}
