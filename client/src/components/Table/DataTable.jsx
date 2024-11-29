import { useState, useEffect, useMemo } from "react";
import { ScrollArea, ScrollBar } from "../UI/ShadCN/scroll-area";
import HoverCard from "../UI/HoverCard";
import { useTheme } from "@mui/material";
import { useRowHandlers } from "./Features/RowHandler";
import { PaginationComponent } from "./Features/Pagination";
import { useTableLogic } from "./TableLogic";
import { useDataFetching } from "./TableDataFetch";
import { TableComponent } from "./TableComponent";
import Mailing from "../mailing";

export default function DataTable({
  columns,
  data,
  fetchFunction,
  initialPageSize = 20,
  initialPage = 1,
  totalPages: initialTotalPages,
  rowSelection,
  setRowSelection,
  usePagination = false,
  useHoverCard = false,
  enableEdit = false,
  ViewComponent = null,
  EditComponent = null,
  onDelete = null,
  totalCopies: initialTotalCopies,
  pageSpecificCopies: initialPageSpecificCopies,
}) {
  const theme = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [localData, setLocalData] = useState([]);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [totalCopies, setTotalCopies] = useState(initialTotalCopies);
  const [pageSpecificCopies, setPageSpecificCopies] = useState(
    initialPageSpecificCopies
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize table with data from props or local state
  const tableData = useMemo(() => {
    return localData.length > 0 ? localData : data || [];
  }, [localData, data]);

  const table = useTableLogic(
    tableData,
    columns,
    usePagination,
    page,
    pageSize,
    rowSelection,
    setRowSelection
  );

  console.log("Total table rows:", table.getRowModel().rows.length);
  console.log("Table data length:", tableData.length);
  console.log("Columns:", columns);
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const result = await fetchFunction(page, pageSize);

        if (result && result.data) {
          // Create a new array to trigger re-render
          setLocalData([...result.data]);
          setTotalPages(result.totalPages);
          setTotalCopies(result.totalCopies);
          setPageSpecificCopies(result.pageSpecificCopies);
        } else {
          console.error("Invalid data format received:", result);
          setError("Invalid data format received from server");
        }
      } catch (error) {
        console.error("Error loading data:", error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (fetchFunction) {
      loadData();
    }
  }, [page, pageSize, fetchFunction]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[730px]">
        <div className="text-center">
          <div className="text-lg mb-2">Loading data...</div>
          <div className="text-sm text-gray-500">
            Page {page} of {totalPages || "?"}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[730px]">
        <div className="text-center text-red-500">
          <div className="text-lg mb-2">Error loading data</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="rounded-md border h-[730px] w-full">
        <TableComponent table={table} theme={theme} />
        <ScrollBar orientation="vertical" />
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {usePagination && (
        <div className="flex items-center justify-between p-4">
          <div className="flex-1">
            <PaginationComponent
              totalPages={totalPages}
              handlePreviousPage={() =>
                setPage((prev) => Math.max(1, prev - 1))
              }
              handleNextPage={() =>
                setPage((prev) => Math.min(totalPages, prev + 1))
              }
              pageSize={pageSize}
              setPageSize={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              page={page}
              setPage={setPage}
            />
          </div>
          <div className="flex gap-4">
            <span className="text-sm">
              Page Copies: {pageSpecificCopies || 0}
            </span>
            <span className="text-sm">Total Copies: {totalCopies || 0}</span>
          </div>
        </div>
      )}
    </>
  );
}
