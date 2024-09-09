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
  setRowSelection,
) {
  const [sorting, setSorting] = useState([]);
  const [filtering, setFiltering] = useState("");

  const tableData = Array.isArray(data) ? data : [];

  return useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(usePagination
      ? { getPaginationRowModel: getPaginationRowModel() }
      : {}),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      rowSelection,
      globalFilter: filtering,
      ...(usePagination
        ? { pagination: { pageIndex: page - 1, pageSize } }
        : {}),
    },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onGlobalFilterChange: setFiltering,
  });
}
