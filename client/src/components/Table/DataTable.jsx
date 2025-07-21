import { useState, useEffect, useRef, useCallback } from "react";
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
  const [tableWidth, setTableWidth] = useState(0);
  const containerRef = useRef(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const lastSyncRef = useRef(Date.now());
  const currentDataRef = useRef(null);
  const abortControllerRef = useRef(null);
  const [localLoading, setLocalLoading] = useState(true);

  // Enhanced responsive height adjustment based on viewport and container width
  useEffect(() => {
    const updateTableDimensions = () => {
      if (!containerRef.current) return;

      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const containerWidth = containerRef.current.offsetWidth;
      
      // Base height calculation from viewport
      const reservedSpace = 300; // Space for header, footer, etc.
      let calculatedHeight = Math.max(400, viewportHeight - reservedSpace);
      
      // Adjust height based on width to maintain aspect ratio
      // Use different ratios for different screen sizes
      if (viewportWidth < 640) { // mobile
        calculatedHeight = Math.min(calculatedHeight, containerWidth * 1.2); // taller ratio for mobile
      } else if (viewportWidth < 1024) { // tablet
        calculatedHeight = Math.min(calculatedHeight, containerWidth * 0.8); // balanced ratio for tablet
      } else { // desktop
        calculatedHeight = Math.min(calculatedHeight, containerWidth * 0.6); // wider ratio for desktop
      }

      // Ensure minimum height
      calculatedHeight = Math.max(400, calculatedHeight);
      
      setTableHeight(`${calculatedHeight}px`);
      setTableWidth(containerWidth);
    };

    // Initial calculation
    updateTableDimensions();

    // Add event listeners for resize and orientation change
    window.addEventListener("resize", updateTableDimensions);
    window.addEventListener("orientationchange", updateTableDimensions);

    // Cleanup
    return () => {
      window.removeEventListener("resize", updateTableDimensions);
      window.removeEventListener("orientationchange", updateTableDimensions);
    };
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

  const fetchData = useCallback(async (isSync = false) => {
    if (!fetchFunction) return;

    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    if (!isSync) {
      setIsTransitioning(true);
      setAnimationComplete(false);
      setLocalLoading(true);
    }

    try {
      const result = await fetchFunction(
        page,
        pageSize,
        searchTerm,
        selectedGroup,
        advancedFilterData
      );

      if (result === null || controller.signal.aborted) return;

      // Store the result in ref for comparison
      currentDataRef.current = result;

      let dataToSet = [];
      let pagesToSet = 1;
      let pageToSet = page;

      // Case 1: Direct array response (like in admin panel)
      if (Array.isArray(result)) {
        dataToSet = result;
        pagesToSet = Math.ceil(result.length / pageSize) || 1;
        pageToSet = Math.min(page, pagesToSet);
      }
      // Case 2: Object response with data/combinedData (paginated response)
      else if (result && typeof result === 'object') {
        if (Array.isArray(result.data)) {
          dataToSet = result.data;
        } else if (Array.isArray(result.combinedData)) {
          dataToSet = result.combinedData;
        } else if (result.data || result.combinedData) {
          dataToSet = Array.isArray(result.data || result.combinedData) ? 
            (result.data || result.combinedData) : [];
        }
        
        pagesToSet = result.totalPages || Math.ceil(dataToSet.length / pageSize) || 1;
        pageToSet = Math.min(result.currentPage || page, pagesToSet);
      }
      // Case 3: Invalid/unexpected response
      else {
        console.warn("[Table] Unexpected data format:", result);
        dataToSet = [];
        pagesToSet = 1;
        pageToSet = 1;
      }

      // Update state in the correct order to prevent UI jumps
      if (pagesToSet !== totalPages) {
        setTotalPages(pagesToSet);
      }
      if (pageToSet !== page) {
        setPage(pageToSet);
      }
      setLocalData(dataToSet);

      // Add a small delay before completing the transition
      setTimeout(() => {
        if (!controller.signal.aborted) {
          setIsTransitioning(false);
          setTimeout(() => {
            if (!controller.signal.aborted) {
              setAnimationComplete(true);
              setLocalLoading(false);
            }
          }, 100);
        }
      }, 300);

    } catch (error) {
      if (!controller.signal.aborted) {
        console.error("[Table] Error loading data:", error);
        setError(error.message);
        setLocalData([]);
        setTotalPages(1);
        setLocalLoading(false);
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [
    page,
    pageSize,
    searchTerm,
    selectedGroup,
    advancedFilterData,
    fetchFunction,
    totalPages
  ]);

  // Initial data load
  useEffect(() => {
    fetchData(false);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [
    page,
    pageSize,
    searchTerm,
    selectedGroup,
    JSON.stringify(advancedFilterData),
    fetchFunction
  ]);

  // Remove duplicate effect
  useEffect(() => {
    if (initialTotalPages !== undefined && initialTotalPages !== totalPages) {
      setTotalPages(initialTotalPages);
    }
  }, [initialTotalPages]);

  // Optimize data sync
  useEffect(() => {
    if (Array.isArray(data) && data !== localData) {
      setLocalData(data);
    }
  }, [data]);

  // Optimize table instance updates
  useEffect(() => {
    if (!setTableInstance || !table) return;

    const updatedTable = {
      ...table,
      getSelectedRowModel: () => ({
        rows: table.getSelectedRowModel().rows,
      }),
      getRowModel: () => ({
        rows: table.getRowModel().rows || [],
      }),
      getFilteredRowModel: () => ({
        rows: table.getFilteredRowModel().rows || [],
      }),
      options: {
        ...table.options,
        data: localData || []
      }
    };
    setTableInstance(updatedTable);
  }, [table, setTableInstance, rowSelection, localData]);

  // Handle socket updates with improved sync logic
  useEffect(() => {
    if (!socketData) return;

    // Handle sync events
    if (socketData.type === "sync-complete") {
      setIsSyncing(false);
      lastSyncRef.current = Date.now();
      fetchData(true);
      return;
    }

    if (socketData.type === "sync-start") {
      setIsSyncing(true);
      return;
    }

    // Skip updates during sync
    if (isSyncing) {
      return;
    }

    // For normal updates, apply them to the local data
    setLocalData((prevData) => {
      // Skip updates that are older than our last sync
      if (socketData.timestamp && socketData.timestamp < lastSyncRef.current) {
        return prevData;
      }

      // Don't update if we don't have any data yet
      if (!currentDataRef.current) {
        socket.emit("request-data-sync", {
          timestamp: Date.now()
        });
        return prevData;
      }

      const updatedData = (() => {
        switch (socketData.type) {
          case "add":
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
            return prevData.map((item) => {
              if (item.id === socketData.data.id) {
                // Deep merge subscription arrays
                const updatedItem = {
                    ...item,
                    ...socketData.data,
                  // Only override subscription data if the new data has items
                  wmmData: socketData.data.wmmData?.length > 0 ? socketData.data.wmmData : (item.wmmData || []),
                  hrgData: socketData.data.hrgData?.length > 0 ? socketData.data.hrgData : (item.hrgData || []),
                  fomData: socketData.data.fomData?.length > 0 ? socketData.data.fomData : (item.fomData || []),
                  calData: socketData.data.calData?.length > 0 ? socketData.data.calData : (item.calData || []),
                    // Merge services arrays without duplicates
                    services: Array.from(new Set([
                      ...(item.services || []),
                      ...(socketData.data.services || [])
                    ]))
                };
                return updatedItem;
              }
              return item;
            });
          case "delete":
            return prevData.filter((item) => item.id !== socketData.data.id);
          default:
            return prevData;
        }
      })();

      return updatedData;
    });
  }, [socketData, socket, fetchData]);

  if (isLoading || localLoading) {
    return (
      <div className="rounded-md border w-full overflow-hidden" style={{ height: tableHeight }}>
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
      <div className="flex items-center justify-center" style={{ height: tableHeight }}>
        <div className="text-center text-red-500">
          <div className="text-lg mb-2">Error loading data</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  // Update PaginationComponent props
  return (
    <>
      <div
        ref={containerRef}
        className={`transition-opacity duration-300 ease-in-out ${
          isTransitioning ? "opacity-0" : "opacity-100"
        }`}
      >
        <ScrollArea className="rounded-md border w-full" style={{ height: tableHeight }}>
          <TableComponent
            table={table}
            theme={theme}
            handleRowClick={handleRowClick}
            userRole={userRole}
            animationComplete={animationComplete}
            stats={stats}
            containerWidth={tableWidth}
            subscriptionType={advancedFilterData?.subscriptionType || "WMM"} // Pass subscription type from advancedFilterData
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
                handlePageJump={(newPage) => {
                  if (newPage > 0 && newPage <= totalPages && newPage !== page) {
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
                    );
                  }
                }}
                pageSize={pageSize}
                setPageSize={(newSize) => {
                  if (newSize !== pageSize) {
                    setPageSize(newSize);
                    setPage(1);
                    fetchFunction(
                      1,
                      newSize,
                      searchTerm,
                      selectedGroup,
                      advancedFilterData
                    );
                  }
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
