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
  setColumnVisibility,
  screenSize = "desktop",
  tableWidth = 0
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
    if (
      setColumnVisibility &&
      (!columnVisibility || Object.keys(columnVisibility).length === 0)
    ) {
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

    // Adjust column sizes based on screen size and available width
    return columns.map((column) => {
      if (!column.size) return column;

      let adjustedSize = column.size;

      // Apply responsive multipliers based on screen size
      switch (screenSize) {
        case "mobile":
          adjustedSize = Math.max(80, column.size * 0.6);
          break;
        case "tablet":
          adjustedSize = Math.max(120, column.size * 0.75);
          break;
        case "laptop":
          adjustedSize = Math.max(150, column.size * 0.9);
          break;
        default: // desktop
          adjustedSize = column.size;
      }

      return {
        ...column,
        size: adjustedSize,
        minSize:
          screenSize === "mobile" ? 60 : screenSize === "tablet" ? 80 : 100,
        maxSize:
          screenSize === "mobile"
            ? 200
            : screenSize === "tablet"
            ? 300
            : undefined,
      };
    });
  }, [columns, screenSize, tableWidth]);

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
