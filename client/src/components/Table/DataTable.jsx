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
import { useSocket } from "../../utils/Websocket/useSocket";
import { webSocketService } from "../../services/WebSocketService";

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
  totalCalQty: initialTotalCalQty,
  totalCalAmt: initialTotalCalAmt,
  userRole,
  searchTerm,
  handleRowClick,
}) {
  const theme = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [localData, setLocalData] = useState([]);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [totalCopies, setTotalCopies] = useState(initialTotalCopies);
  const [pageSpecificCopies, setPageSpecificCopies] = useState(
    initialPageSpecificCopies
  );
  const [totalCalQty, setTotalCalQty] = useState(initialTotalCalQty);
  const [totalCalAmt, setTotalCalAmt] = useState(initialTotalCalAmt);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageSpecificCalQty, setPageSpecificCalQty] = useState(0);
  const [pageSpecificCalAmt, setPageSpecificCalAmt] = useState(0);
  const { socket, socketData } = useSocket();

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
    setRowSelection,
    userRole
  );

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const result = await fetchFunction(page, pageSize, searchTerm);

        if (result && result.data) {
          setLocalData([...result.data]);
          setTotalPages(result.totalPages);
          setTotalCopies(result.totalCopies);
          setPageSpecificCopies(result.pageSpecificCopies);
          setTotalCalQty(result.totalCalQty);
          setTotalCalAmt(result.totalCalAmt);
          setPageSpecificCalQty(result.pageSpecificCalQty);
          setPageSpecificCalAmt(result.pageSpecificCalAmt);
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
  }, [page, pageSize, fetchFunction, searchTerm]);

  useEffect(() => {
    if (!socketData) return;

    setLocalData((prevData) => {
      const updatedData = (() => {
        switch (socketData.type) {
          case "add":
            if (!prevData.some((item) => item.id === socketData.data.id)) {
              return [socketData.data, ...prevData];
            }
            return prevData;
          case "update":
            return prevData.map((item) =>
              item.id === socketData.data.id ? socketData.data : item
            );
          case "delete":
            return prevData.filter((item) => item.id !== socketData.data.id);
          case "init":
            return socketData.data;
          default:
            return prevData;
        }
      })();
      return updatedData;
    });
  }, [socketData]);

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

  console.log("Rendering table with data:", tableData);

  return (
    <>
      <ScrollArea className="rounded-md border h-[730px] w-full">
        <TableComponent
          table={table}
          theme={theme}
          handleRowClick={handleRowClick}
          totalCopies={totalCopies}
          pageSpecificCopies={pageSpecificCopies}
          totalCalQty={totalCalQty}
          totalCalAmt={totalCalAmt}
          pageSpecificCalQty={pageSpecificCalQty}
          pageSpecificCalAmt={pageSpecificCalAmt}
          userRole={userRole}
        />
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
        </div>
      )}
    </>
  );
}
