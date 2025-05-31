import { useState, useMemo, useEffect } from "react";
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
  setRowSelection,
  userRole,
  columnVisibility,
  setColumnVisibility
) {
  const [sorting, setSorting] = useState([]);
  const [filtering, setFiltering] = useState("");

  // Calculate effective column visibility without updating state during render
  const effectiveColumnVisibility = useMemo(() => {
    if (columnVisibility && Object.keys(columnVisibility).length > 0) {
      return columnVisibility;
    }

    // Create default visibility if none provided
    const defaultVisibility = {};
    columns.forEach((column) => {
      defaultVisibility[column.id] =
        column.isVisible !== undefined ? column.isVisible : true;
    });

    return defaultVisibility;
  }, [columns, columnVisibility]);

  // Update parent state in an effect, not during render
  useEffect(() => {
    if (setColumnVisibility && 
        (!columnVisibility || Object.keys(columnVisibility).length === 0)) {
      // Create default visibility
      const defaultVisibility = {};
      columns.forEach((column) => {
        defaultVisibility[column.id] =
          column.isVisible !== undefined ? column.isVisible : true;
      });
      
      // Update parent state
      setColumnVisibility(defaultVisibility);
    }
  }, [columns, columnVisibility, setColumnVisibility]);

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
      columnVisibility: effectiveColumnVisibility,
    },
    onRowSelectionChange: setRowSelection || (() => {}),
    getRowId: (row) => row?.id || row?._id || uuidv4(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setFiltering,
    onColumnVisibilityChange: setColumnVisibility || (() => {}),
    enableRowSelection: true,
    enableMultiRowSelection: true,
  });

  return { table };
}
