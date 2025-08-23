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
  const currentDataRef = useRef(null);
  const abortControllerRef = useRef(null);
  const [localLoading, setLocalLoading] = useState(true);

  // Helper function to check if a client matches current filter criteria
  const checkClientVisibility = useCallback(
    (client) => {
      // If no advanced filter data, client is visible
      if (!advancedFilterData || Object.keys(advancedFilterData).length === 0) {
        return true;
      }

      // Check "Added/Updated Today" filter
      if (advancedFilterData.addedToday) {
        const today = new Date();
        const clientDate = new Date(
          client.adddate || client.addedAt || client.updatedAt
        );
        const isToday = clientDate.toDateString() === today.toDateString();
        if (!isToday) {
          return false;
        }
      }

      // Check search term filter
      if (searchTerm && searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        const clientText = [
          client.fname || "",
          client.lname || "",
          client.mname || "",
          client.address || "",
          client.email || "",
          client.cellno || "",
          client.officeno || "",
        ]
          .join(" ")
          .toLowerCase();

        if (!clientText.includes(searchLower)) {
          return false;
        }
      }

      // Check group filter
      if (selectedGroup && client.group !== selectedGroup) {
        return false;
      }

      // Check advanced filters
      if (
        advancedFilterData.lname &&
        !client.lname
          ?.toLowerCase()
          .includes(advancedFilterData.lname.toLowerCase())
      ) {
        return false;
      }
      if (
        advancedFilterData.fname &&
        !client.fname
          ?.toLowerCase()
          .includes(advancedFilterData.fname.toLowerCase())
      ) {
        return false;
      }
      if (
        advancedFilterData.mname &&
        !client.mname
          ?.toLowerCase()
          .includes(advancedFilterData.mname.toLowerCase())
      ) {
        return false;
      }
      if (
        advancedFilterData.email &&
        !client.email
          ?.toLowerCase()
          .includes(advancedFilterData.email.toLowerCase())
      ) {
        return false;
      }
      if (
        advancedFilterData.cellno &&
        !client.cellno?.includes(advancedFilterData.cellno)
      ) {
        return false;
      }
      if (
        advancedFilterData.ofcno &&
        !client.officeno?.includes(advancedFilterData.ofcno)
      ) {
        return false;
      }

      // Check date range filters
      if (advancedFilterData.startDate || advancedFilterData.endDate) {
        const clientDate = new Date(
          client.adddate || client.addedAt || client.updatedAt
        );
        if (
          advancedFilterData.startDate &&
          clientDate < new Date(advancedFilterData.startDate)
        ) {
          return false;
        }
        if (
          advancedFilterData.endDate &&
          clientDate > new Date(advancedFilterData.endDate)
        ) {
          return false;
        }
      }

      return true;
    },
    [advancedFilterData, searchTerm, selectedGroup]
  );

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
      if (viewportWidth < 640) {
        // mobile
        calculatedHeight = Math.min(calculatedHeight, containerWidth * 1.2); // taller ratio for mobile
      } else if (viewportWidth < 1024) {
        // tablet
        calculatedHeight = Math.min(calculatedHeight, containerWidth * 0.8); // balanced ratio for tablet
      } else {
        // desktop
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
      if (!timestamp) return "N/A";
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? "Invalid Date" : date.toISOString();
    } catch (error) {
      console.warn("[Table] Error formatting timestamp:", error);
      return "Invalid Date";
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

  const fetchData = useCallback(
    async (isSync = false) => {
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
        else if (result && typeof result === "object") {
          if (Array.isArray(result.data)) {
            dataToSet = result.data;
          } else if (Array.isArray(result.combinedData)) {
            dataToSet = result.combinedData;
          } else if (result.data || result.combinedData) {
            dataToSet = Array.isArray(result.data || result.combinedData)
              ? result.data || result.combinedData
              : [];
          }

          pagesToSet =
            result.totalPages || Math.ceil(dataToSet.length / pageSize) || 1;
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
    },
    [
      page,
      pageSize,
      searchTerm,
      selectedGroup,
      advancedFilterData,
      fetchFunction,
      totalPages,
    ]
  );

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
    fetchFunction,
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
        data: localData || [],
      },
    };
    setTableInstance(updatedTable);
  }, [table, setTableInstance, rowSelection, localData]);

  // Handle WebSocket updates with simple data replacement
  useEffect(() => {
    if (!socketData) return;

    // Debug: Log the entire socketData to understand its structure
    console.log("[DataTable] Full socketData received:", socketData);
    console.log("[DataTable] Current filter state:", {
      advancedFilterData,
      searchTerm,
      selectedGroup,
      localDataLength: localData.length,
    });

    // Handle array-like objects (socketData with numeric keys like {0: {...}})
    let processedSocketData = socketData;
    if (
      socketData &&
      typeof socketData === "object" &&
      !Array.isArray(socketData)
    ) {
      // Check if it's an array-like object with numeric keys
      const keys = Object.keys(socketData);
      if (keys.length === 1 && !isNaN(keys[0])) {
        // Extract the actual data from the array-like object
        processedSocketData = socketData[keys[0]];
        console.log(
          "[DataTable] Extracted data from array-like object:",
          processedSocketData
        );
      }
    }

    // Only process client-related updates (data-update, hrg-update)
    // Skip user-update, accounting-update, payment-update
    if (
      processedSocketData.type &&
      ![
        "data-update",
        "hrg-update",
        "add",
        "update",
        "delete",
        "filter-update",
      ].includes(processedSocketData.type)
    ) {
      console.log(
        "[DataTable] Skipping non-client update type:",
        processedSocketData.type
      );
      return;
    }

    // Check if this is a valid data update
    if (!processedSocketData.data && !processedSocketData.type) {
      console.log(
        "[DataTable] Skipping invalid socketData:",
        processedSocketData
      );
      return;
    }

    // Handle different data structures
    let updateType = processedSocketData.type;
    let updateData = processedSocketData.data;

    // If data is nested differently, try to extract it
    if (!updateData && processedSocketData.combinedData) {
      updateData = processedSocketData.combinedData;
      updateType = updateType || "filter-update";
    }

    // If still no data, skip this update
    if (!updateData) {
      console.log("[DataTable] No valid data found in socketData");
      return;
    }

    // Additional check: ensure we have a client ID
    const clientId = updateData.id || updateData.clientid;
    if (!clientId && updateType !== "filter-update") {
      console.log("[DataTable] No client ID found, skipping update");
      return;
    }

    // Prevent updates if we don't have proper filter context yet
    if (localData.length === 0 && updateType !== "filter-update") {
      console.log(
        "[DataTable] No local data yet, skipping individual client update"
      );
      return;
    }

    console.log("[DataTable] Processing client update:", {
      type: updateType,
      clientId: clientId,
      hasWmmData: updateData.wmmData?.records?.length > 0,
      hasHrgData: updateData.hrgData?.records?.length > 0,
      wmmRecordsCount: updateData.wmmData?.records?.length || 0,
      hrgRecordsCount: updateData.hrgData?.records?.length || 0,
      currentFilterState: {
        addedToday: advancedFilterData?.addedToday,
        searchTerm,
        selectedGroup,
        advancedFilters: Object.keys(advancedFilterData || {}).filter(
          (key) => advancedFilterData[key]
        ),
      },
    });

    setLocalData((prevData) => {
      switch (updateType) {
        case "add":
          // Add new client if not already present
          if (!prevData.some((item) => item.id === clientId)) {
            console.log("[DataTable] Adding new client:", clientId);
            return [updateData, ...prevData];
          }
          return prevData;

        case "update":
          // Update client while maintaining filter state
          console.log("[DataTable] Updating client:", clientId);

          // Check if the client exists in current filtered data
          const existingClientIndex = prevData.findIndex(
            (item) => item.id === clientId
          );

          if (existingClientIndex !== -1) {
            // Client exists in filtered view, update it
            const updatedData = [...prevData];
            updatedData[existingClientIndex] = updateData;

            // Check if the updated client should still be visible with current filters
            const shouldKeepClient = checkClientVisibility(updateData);
            if (!shouldKeepClient) {
              console.log(
                "[DataTable] Updated client no longer matches current filters, removing from view"
              );
              return updatedData.filter((item) => item.id !== clientId);
            }

            return updatedData;
          } else {
            // Client not in current filtered view, check if it should be added
            const shouldAddClient = checkClientVisibility(updateData);
            if (shouldAddClient) {
              console.log(
                "[DataTable] Updated client now matches current filters, adding to view"
              );
              return [updateData, ...prevData];
            } else {
              console.log(
                "[DataTable] Updated client doesn't match current filters, keeping current data"
              );
              return prevData;
            }
          }

        case "delete":
          // Remove deleted client
          console.log("[DataTable] Deleting client:", clientId);
          return prevData.filter((item) => item.id !== clientId);

        case "filter-update":
          // Handle filter updates (bulk data replacement)
          console.log("[DataTable] Filter update received");

          // Check if this is a legitimate filter update or just noise from client updates
          // If we have active filters and this filter-update doesn't contain filtered data,
          // it's likely an unnecessary update triggered by a client update
          const hasActiveFilters =
            advancedFilterData &&
            (advancedFilterData.addedToday ||
              searchTerm ||
              selectedGroup ||
              Object.keys(advancedFilterData).some(
                (key) => advancedFilterData[key] && key !== "services"
              ));

          // If we have active filters and the update doesn't contain the expected filtered data,
          // skip it to maintain the current filtered view
          if (hasActiveFilters && prevData.length > 0) {
            // Check if the update data actually contains filtered results
            const updateDataArray = Array.isArray(updateData)
              ? updateData
              : updateData.combinedData &&
                Array.isArray(updateData.combinedData)
              ? updateData.combinedData
              : null;

            if (!updateDataArray || updateDataArray.length === 0) {
              console.log(
                "[DataTable] Skipping filter-update - maintaining current filtered view (no valid filtered data)"
              );
              return prevData;
            }

            // If the update contains all data instead of filtered data, skip it
            if (updateDataArray.length > prevData.length * 2) {
              console.log(
                "[DataTable] Skipping filter-update - appears to be full data instead of filtered data"
              );
              return prevData;
            }
          }

          // Only update if we have valid combinedData
          if (Array.isArray(updateData)) {
            return updateData;
          } else if (
            updateData.combinedData &&
            Array.isArray(updateData.combinedData)
          ) {
            return updateData.combinedData;
          }
          // If no valid data, keep current data
          console.log(
            "[DataTable] No valid combinedData in filter-update, keeping current data"
          );
          return prevData;

        default:
          console.log(
            "[DataTable] Unknown update type:",
            updateType,
            "Data:",
            updateData
          );
          return prevData;
      }
    });
  }, [socketData]);

  if (isLoading || localLoading) {
    return (
      <div
        className="rounded-md border w-full overflow-hidden"
        style={{ height: tableHeight }}
      >
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
      <div
        className="flex items-center justify-center"
        style={{ height: tableHeight }}
      >
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
        <ScrollArea
          className="rounded-md border w-full"
          style={{ height: tableHeight }}
        >
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
                  if (
                    newPage > 0 &&
                    newPage <= totalPages &&
                    newPage !== page
                  ) {
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
