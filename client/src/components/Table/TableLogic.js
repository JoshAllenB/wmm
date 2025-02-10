import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { v4 as uuidv4 } from "uuid";

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
  
  // Initialize column visibility based on columns
  const initialColumnVisibility = useMemo(() => {
    const visibility = {};
    columns.forEach((column) => {
      visibility[column.id] = column.isVisible !== undefined ? column.isVisible : true;
    });
    return visibility;
  }, [columns]);

  const [columnVisibility, setColumnVisibility] = useState(initialColumnVisibility);

  // Ensure data and columns are valid arrays
  const tableData = useMemo(() => {
    if (!Array.isArray(data)) {
      console.warn("Table data is not an array");
      return [];
    }
    return data;
  }, [data]);

  const tableColumns = useMemo(() => {
    if (!Array.isArray(columns)) {
      console.warn("Table columns are not an array");
      return [];
    }
    return columns;
  }, [columns]);

  // Create table instance
  const table = useReactTable({
    data: tableData,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(usePagination
      ? {
          getPaginationRowModel: getPaginationRowModel(),
          manualPagination: true,
        }
      : {}),
    state: {
      sorting,
      rowSelection: rowSelection || {},
      globalFilter: filtering,
      pagination: {
        pageIndex: Math.max(0, page - 1),
        pageSize: Math.max(1, pageSize),
      },
      columnVisibility,
    },
    onRowSelectionChange: setRowSelection || (() => {}),
    getRowId: (row) => row?.id || row?._id || uuidv4(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setFiltering,
    enableRowSelection: true,
    enableMultiRowSelection: true,
  });

  return { table, setColumnVisibility, columnVisibility };
}
