import { useState, useEffect, useRef } from "react";
import { ScrollArea, ScrollBar } from "../UI/ShadCN/scroll-area";
import { useTheme } from "@mui/material";
import { PaginationComponent } from "./Features/Pagination";
import { useTableLogic } from "./TableLogic";
import { TableComponent } from "./TableComponent";
import { useSocket } from "../../utils/Websocket/useSocket";
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
  const [isSyncing, setIsSyncing] = useState(false);
  const lastSyncRef = useRef(Date.now());
  const currentDataRef = useRef(null);

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

  // Add helper function for safe date formatting
  const formatTimestamp = (timestamp) => {
    try {
      if (!timestamp) return 'N/A';
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? 'Invalid Date' : date.toISOString();
    } catch (error) {
      console.warn('[Table] Error formatting timestamp:', error);
      return 'Invalid Date';
    }
  };

  const loadData = async (isSync = false) => {
    if (isLoading) return;

    if (!isSync) {
      setIsTransitioning(false);
      setAnimationComplete(false);
    }

    try {
      console.log("[Table] Fetching data with params:", {
        page,
        pageSize,
        searchTerm,
        selectedGroup,
        isSync
      });

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

      // Store the result in ref for comparison
      currentDataRef.current = result;

      if (Array.isArray(result)) {
        setLocalData(result);
        setTotalPages(1);
      } else if (result && (result.data || result.combinedData)) {
        const dataArray = result.data || result.combinedData || [];
        if (dataArray.length > 0) {
          console.log("[Table] Received data:", {
            count: dataArray.length,
            firstItem: dataArray[0]?.id || 'no-id',
            lastItem: dataArray[dataArray.length - 1]?.id || 'no-id'
          });
        }
        setLocalData([...dataArray]);
        setTotalPages(result.totalPages || 1);
      } else {
        console.error("[Table] Invalid data format received:", result);
        setError("Invalid data format received from server");
      }
    } catch (error) {
      console.error("[Table] Error loading data:", error);
      setError(error.message);
    } finally {
      if (!isSync) {
        setIsTransitioning(true);
        setTimeout(() => {
          setIsTransitioning(false);
          setAnimationComplete(true);
        }, 300);
      }
    }
  };

  // Initial data load
  useEffect(() => {
    loadData();
  }, [
    page,
    pageSize,
    searchTerm,
    selectedGroup,
    advancedFilterData,
    isLoading,
  ]);

  // Handle socket updates with improved sync logic
  useEffect(() => {
    if (!socketData) return;

    console.log("[Table] Received socket data:", {
      type: socketData.type,
      timestamp: formatTimestamp(socketData.timestamp),
      currentData: !!currentDataRef.current
    });

    // Handle sync events
    if (socketData.type === "sync-complete") {
      console.log("[Table] Sync completed, refreshing data");
      setIsSyncing(false);
      lastSyncRef.current = Date.now();
      loadData(true);
      return;
    }

    if (socketData.type === "sync-start") {
      console.log("[Table] Sync started");
      setIsSyncing(true);
      return;
    }

    // Skip updates during sync
    if (isSyncing) {
      console.log("[Table] Skipping update during sync");
      return;
    }

    // For normal updates, apply them to the local data
    setLocalData((prevData) => {
      // Skip updates that are older than our last sync
      if (socketData.timestamp && socketData.timestamp < lastSyncRef.current) {
        console.log("[Table] Skipping outdated update, timestamp:", formatTimestamp(socketData.timestamp));
        return prevData;
      }

      // Don't update if we don't have any data yet
      if (!currentDataRef.current) {
        console.log("[Table] No current data, requesting sync");
        socket.emit("request-data-sync", {
          timestamp: Date.now()
        });
        return prevData;
      }

      // Log the received data for debugging
      console.log("[Table] Processing update:", {
        type: socketData.type,
        id: socketData.data?.id,
        hasSubscriptionData: {
          wmm: Array.isArray(socketData.data?.wmmData),
          hrg: Array.isArray(socketData.data?.hrgData),
          fom: Array.isArray(socketData.data?.fomData),
          cal: Array.isArray(socketData.data?.calData)
        }
      });

      const updatedData = (() => {
        switch (socketData.type) {
          case "add":
            console.log("[Table] Adding new item");
            if (!prevData.some((item) => item.id === socketData.data.id)) {
              return [{
                ...socketData.data,
                wmmData: socketData.data.wmmData || [],
                hrgData: socketData.data.hrgData || [],
                fomData: socketData.data.fomData || [],
                calData: socketData.data.calData || [],
                services: socketData.data.services || []
              }, ...prevData];
            }
            return prevData;
          case "update":
            console.log("[Table] Updating item");
            return prevData.map((item) =>
              item.id === socketData.data.id 
                ? {
                    ...item,
                    ...socketData.data,
                    // Always use the new subscription data if provided
                    wmmData: socketData.data.wmmData || item.wmmData || [],
                    hrgData: socketData.data.hrgData || item.hrgData || [],
                    fomData: socketData.data.fomData || item.fomData || [],
                    calData: socketData.data.calData || item.calData || [],
                    // Merge services arrays without duplicates
                    services: Array.from(new Set([
                      ...(item.services || []),
                      ...(socketData.data.services || [])
                    ]))
                  }
                : item
            );
          case "delete":
            console.log("[Table] Deleting item");
            return prevData.filter((item) => item.id !== socketData.data.id);
          default:
            return prevData;
        }
      })();

      return updatedData;
    });
  }, [socketData, socket]);

  useEffect(() => {
    if (initialTotalPages !== undefined) {
      setTotalPages(initialTotalPages);
    }
  }, [initialTotalPages]);

  useEffect(() => {
    setLocalData(Array.isArray(data) ? data : []);
  }, [data]);

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
