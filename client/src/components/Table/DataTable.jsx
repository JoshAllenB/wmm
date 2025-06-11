import { useState, useEffect, useRef } from "react";
import { ScrollArea, ScrollBar } from "../UI/ShadCN/scroll-area";
import { useTheme } from "@mui/material";
import { PaginationComponent } from "./Features/Pagination";
import { useTableLogic } from "./TableLogic";
import { TableComponent } from "./TableComponent";
import { useSocket } from "../../utils/Websocket/useSocket";
import { fetchClients } from "../Table/Data/clientdata";
import {
  handlePreviousPage,
  handleNextPage,
  handleFirstPage,
  handleLastPage,
  handlePageJump,
} from "./Features/PaginationUtils";
import { LinearProgress } from "@mui/material";

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
  userRole,
  searchTerm,
  selectedGroup,
  handleRowClick,
  setTableInstance,
  advancedFilterData,
  isLoading = false,
  columnVisibility,
  setColumnVisibility,
  stats,
}) {
  const theme = useTheme();
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [localData, setLocalData] = useState([]);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [error, setError] = useState(null);
  const { socket, socketData } = useSocket();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [tableHeight, setTableHeight] = useState("700px");
  const containerRef = useRef(null);

  // Responsive height adjustment based on viewport
  useEffect(() => {
    const updateTableHeight = () => {
      const viewportHeight = window.innerHeight;
      const reservedSpace = 300;
      const calculatedHeight = Math.max(400, viewportHeight - reservedSpace);
      setTableHeight(`${calculatedHeight}px`);
    };

    updateTableHeight();
    window.addEventListener("resize", updateTableHeight);
    return () => window.removeEventListener("resize", updateTableHeight);
  }, []);

  const { table } = useTableLogic(
    localData,
    columns,
    usePagination,
    page,
    pageSize,
    rowSelection,
    setRowSelection,
    userRole,
    columnVisibility,
    setColumnVisibility
  );

  useEffect(() => {
    const loadData = async () => {
      if (isLoading) return;

      setIsTransitioning(false);
      setAnimationComplete(false);
      try {
        const result = await fetchFunction(
          page,
          pageSize,
          searchTerm,
          selectedGroup,
          advancedFilterData
        );

        if (result === null) {
          return;
        }

        if (Array.isArray(result)) {
          setLocalData(result);
          setTotalPages(1);
        } else if (result && (result.data || result.combinedData)) {
          const dataArray = result.data || result.combinedData || [];
          setLocalData([...dataArray]);
          setTotalPages(result.totalPages || 1);
        } else {
          console.error("Invalid data format received:", result);
          setError("Invalid data format received from server");
        }
      } catch (error) {
        console.error("Error loading data:", error);
        setError(error.message);
      } finally {
        setIsTransitioning(true);
        const timer = setTimeout(() => {
          setIsTransitioning(false);
          setAnimationComplete(true);
        }, 300);
        return () => clearTimeout(timer);
      }
    };

    loadData();
  }, [
    page,
    pageSize,
    fetchFunction,
    searchTerm,
    selectedGroup,
    advancedFilterData,
    isLoading,
  ]);

  useEffect(() => {
    if (initialTotalPages !== undefined) {
      setTotalPages(initialTotalPages);
    }
  }, [initialTotalPages]);

  useEffect(() => {
    setLocalData(data);
  }, [data]);

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

  useEffect(() => {
    if (setTableInstance && table) {
      const updatedTable = {
        ...table,
        getSelectedRowModel: () => ({
          rows: table.getSelectedRowModel().rows,
        }),
      };
      setTableInstance(updatedTable);
    }
  }, [table, setTableInstance, rowSelection, localData]);

  if (isLoading) {
    return (
      <div className="rounded-md border h-[700px] w-full overflow-hidden">
        <div className="flex flex-col h-full">
          <div className="flex-1 flex items-center justify-center bg-muted/10">
            <div className="text-center space-y-6 w-2/3 max-w-md">
              <LinearProgress
                color="primary"
                style={{
                  height: 6,
                  borderRadius: 3,
                }}
              />
              <p className="text-muted-foreground text-sm">
                Preparing your data...
              </p>
            </div>
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
      <div
        ref={containerRef}
        className={`transition-opacity duration-300 ease-in-out ${
          isTransitioning ? "opacity-0" : "opacity-100"
        }`}
      >
        <ScrollArea className="rounded-md border h-[700px] w-full">
          <TableComponent
            table={table}
            theme={theme}
            handleRowClick={handleRowClick}
            userRole={userRole}
            animationComplete={animationComplete}
            stats={stats}
          />
          <ScrollBar orientation="vertical" />
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {usePagination && (
          <div className="flex items-center justify-between mt-2">
            <div className="flex-1">
              <PaginationComponent
                totalPages={totalPages}
                handlePreviousPage={() =>
                  handlePreviousPage(
                    page,
                    setPage,
                    fetchFunction,
                    setLocalData,
                    pageSize,
                    searchTerm,
                    selectedGroup,
                    advancedFilterData
                  )
                }
                handleNextPage={() =>
                  handleNextPage(
                    page,
                    setPage,
                    fetchFunction,
                    setLocalData,
                    pageSize,
                    totalPages,
                    searchTerm,
                    selectedGroup,
                    advancedFilterData
                  )
                }
                handleFirstPage={() =>
                  handleFirstPage(
                    setPage,
                    fetchFunction,
                    setLocalData,
                    pageSize,
                    searchTerm,
                    selectedGroup,
                    advancedFilterData
                  )
                }
                handleLastPage={() =>
                  handleLastPage(
                    totalPages,
                    setPage,
                    fetchFunction,
                    setLocalData,
                    pageSize,
                    searchTerm,
                    selectedGroup,
                    advancedFilterData
                  )
                }
                handlePageJump={(newPage) =>
                  handlePageJump(
                    newPage,
                    setPage,
                    fetchFunction,
                    setLocalData,
                    pageSize,
                    totalPages,
                    searchTerm,
                    selectedGroup,
                    advancedFilterData
                  )
                }
                pageSize={pageSize}
                setPageSize={(newSize) => {
                  setPageSize(newSize);
                  setPage(1);
                  fetchFunction(
                    1,
                    newSize,
                    searchTerm,
                    selectedGroup,
                    advancedFilterData
                  );
                }}
                page={page}
                setPage={setPage}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
