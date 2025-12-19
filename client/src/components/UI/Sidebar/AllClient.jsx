import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import DataTable from "../../Table/DataTable";
import Add from "../../CRUD/AllClient/add";
import Mailing from "../../mailing";
import { Input } from "../ShadCN/input";
import { fetchClients } from "../../Table/Data/clientdata";
import { fetchGroups, fetchUsers } from "../../Table/Data/utilData";
import { useColumns } from "../../Table/Structure/clientColumn";
import View from "../../CRUD/AllClient/view";
import { useUser } from "../../../utils/Hooks/userProvider";
import useDebounce from "../../../utils/Hooks/useDebounce";
import FilterDropdown from "../../filterDropdown";
import { Button } from "../ShadCN/button";
import AdvancedFilter from "../../CRUD/advanceFilter";
import { ColumnToggle } from "../../Table/ColumnToggle";
import {
  ArrowDown,
  Calendar,
  Package,
  Mail,
  Settings2,
  FileText,
  FileSpreadsheet,
  AlertTriangle,
} from "lucide-react";
import { toast } from "../ShadCN/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ShadCN/dialog";
import { RadioGroup, RadioGroupItem } from "../ShadCN/radio-group";
import { Label } from "../ShadCN/label";
import CalendarUpdate from "../../Calendar";
import SpackUpdate from "../../SpackUpdate";
import RTSUpdate from "../../RTSUpdate";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "../ShadCN/dropdown-menu";

const AllClient = () => {
  const [clientData, setClientData] = useState([]);
  const [filtering, setFiltering] = useState("");
  const debouncedFiltering = useDebounce(filtering, 500); // Increased from 300 to 500ms
  const [pageSize, setPageSize] = useState(50);
  const [rowSelection, setRowSelection] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [stats, setStats] = useState({
    clientCount: {
      total: 0,
      page: 0,
    },
    metrics: [],
  });
  const columns = useColumns();
  const { hasRole } = useUser();
  const [addedToday, setAddedToday] = useState(true);
  const [columnVisibility, setColumnVisibility] = useState({});

  // State for selected row and modal visibility
  const [selectedRow, setSelectedRow] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [users, setUsers] = useState([]);

  const [tableInstance, setTableInstance] = useState(null);

  // Add subscription type state
  const [subscriptionType, setSubscriptionType] = useState("WMM");

  const [showAdvancedFilterModal, setShowAdvancedFilterModal] = useState(false);
  const [advancedFilterData, setAdvancedFilterData] = useState(() => {
    // Initialize with default empty values
    const initialState = {
      lname: "",
      fname: "",
      mname: "",
      sname: "",
      address: "",
      contactnos: "",
      cellno: "",
      ofcno: "",
      email: "",
      birthdate: "",
      startDate: "",
      endDate: "",
      wmmStartSubsDate: "",
      wmmEndSubsDate: "",
      wmmStartEndDate: "",
      wmmEndEndDate: "",
      copiesRange: "",
      minCopies: "",
      maxCopies: "",
      group: "",
      type: "",
      subsclass: "",
      area: "",
      acode: "",
      services: [], // Always initialize as an empty array
    };

    return initialState;
  });

  const openAdvancedFilterModal = () => setShowAdvancedFilterModal(true);
  const closeAdvancedFilterModal = () => setShowAdvancedFilterModal(false);

  const handleAdvancedFilterChange = (e) => {
    const { name, value } = e.target;
    setAdvancedFilterData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAdvancedFilterSubmit = () => {
    // Ensure dates are in MM/DD/YY format
    const formattedFilterData = {
      ...advancedFilterData,
      startDate: advancedFilterData.startDate
        ? new Date(advancedFilterData.startDate).toLocaleDateString("en-US")
        : "",
      endDate: advancedFilterData.endDate
        ? new Date(advancedFilterData.endDate).toLocaleDateString("en-US")
        : "",
    };

    // Send formattedFilterData to the backend
    setAdvancedFilterData(formattedFilterData);
    closeAdvancedFilterModal();
  };

  const handleAddedTodayClick = () => {
    // Toggle the Added/Updated Today filter (only control that changes it)
    if (isAddedTodayLoading || isLoading) return;
    setIsAddedTodayLoading(true);
    setAddedToday((prev) => !prev);
    setPage(1);

    // Reset last filter ref to ensure fetch happens
    lastFilterRef.current = null;
  };

  const handleClearAllFilters = () => {
    // Clear search input only; do not change Added/Updated Today state
    setFiltering("");

    // Get role-based services
    const roleBasedServices = [];
    if (hasRole("WMM")) {
      // For WMM role, use subscription type to determine service
      switch (subscriptionType) {
        case "Promo":
          roleBasedServices.push("PROMO");
          break;
        case "Complimentary":
          roleBasedServices.push("COMP");
          break;
        default:
          roleBasedServices.push("WMM");
      }
    }
    if (hasRole("FOM")) roleBasedServices.push("FOM");
    if (hasRole("HRG")) roleBasedServices.push("HRG");
    if (hasRole("CAL")) roleBasedServices.push("CAL");

    // Create new filter with just services, subscription type, and keep the selected group if there is one
    const newFilter = {
      services: roleBasedServices,
      group: selectedGroup || "",
      subscriptionType,
    };

    // Create a snapshot of what the filter will be (preserve current addedToday state)
    const filterSnapshot = JSON.stringify({
      services: roleBasedServices,
      page,
      filtering: "",
      group: selectedGroup,
      addedToday,
      subscriptionType,
    });

    // Update last filter ref to prevent bounce
    lastFilterRef.current = filterSnapshot;

    // Update the filter state
    setAdvancedFilterData(newFilter);

    // Fetch with the role-based services and preserved subscription type
    fetchData(page, pageSize, "", selectedGroup, newFilter);
  };

  const [isLoading, setIsLoading] = useState(true);
  const [isAddedTodayLoading, setIsAddedTodayLoading] = useState(false);
  const initialLoadComplete = useRef(false);
  const lastFilterRef = useRef(null);
  const currentRequestRef = useRef(null); // Add this to track current request
  const skipNextFetchRef = useRef(false); // Track when to skip fetch after clearing search

  // Create a dependency value that will change when services changes
  // const servicesDependency = Array.isArray(advancedFilterData.services)
  //   ? advancedFilterData.services.join(",")
  //   : "";

  // Memoize the current filter snapshot to prevent unnecessary re-renders
  const currentFilterSnapshot = useMemo(() => {
    return JSON.stringify({
      services: advancedFilterData.services,
      page,
      filtering: debouncedFiltering,
      group: selectedGroup,
      addedToday,
      subscriptionType,
    });
  }, [
    advancedFilterData.services,
    page,
    debouncedFiltering,
    selectedGroup,
    addedToday,
    subscriptionType,
  ]);

  // Memoized parsing function for tagged search
  const parseTaggedSearch = useMemo(() => {
    return (searchValue) => {
      const filters = {
        search: "",
        clientId: "",
        paymentRef: "",
        fullName: "",
      };

      // Avoid computation on empty search
      if (!searchValue) return filters;

      // Check for tagged search patterns
      const idMatch = searchValue.match(/\bid:\s*(\S+)/i);
      const refMatch = searchValue.match(
        /\bref:\s*([A-Z]{2}\s*\d{6}[\s\d\/]*)/i
      );
      const nameMatch = searchValue.match(/\bname:\s*([^:]+?)(?=\s+\w+:|$)/i);

      if (idMatch) {
        filters.clientId = idMatch[1];
        // Remove the matched pattern from the search string
        searchValue = searchValue.replace(idMatch[0], "").trim();
      }

      if (refMatch) {
        filters.paymentRef = refMatch[1];
        // Remove the matched pattern from the search string
        searchValue = searchValue.replace(refMatch[0], "").trim();
      }

      if (nameMatch) {
        filters.fullName = nameMatch[1].trim();
        // Remove the matched pattern from the search string
        searchValue = searchValue.replace(nameMatch[0], "").trim();
      }

      // Check if the untagged search looks like a payment reference (MS followed by numbers)
      const untaggedRefMatch = searchValue.match(
        /\b([A-Z]{2}\s*\d{6}[\s\d\/]*)\b/i
      );
      if (!filters.paymentRef && untaggedRefMatch) {
        filters.paymentRef = untaggedRefMatch[1];
        // Remove the matched pattern from the search string
        searchValue = searchValue.replace(untaggedRefMatch[0], "").trim();
      }

      // Check if the untagged search looks like a full name (contains space)
      if (
        !filters.fullName &&
        searchValue.includes(" ") &&
        !filters.clientId &&
        !filters.paymentRef &&
        searchValue.trim().length > 0
      ) {
        // Check if it looks like a name (contains letters and spaces, not just numbers)
        const namePattern = /^[a-zA-Z\s]+$/;
        if (namePattern.test(searchValue.trim())) {
          filters.fullName = searchValue.trim();
          searchValue = ""; // Since we're treating the whole thing as a full name
        }
      }

      // Any remaining text is treated as a general search
      filters.search = searchValue;

      return filters;
    };
  }, []);

  // Determine active search and advanced filters (excluding services/subscriptionType/group)
  const isSearchActive = useMemo(() => {
    return !!(debouncedFiltering && debouncedFiltering.trim().length >= 2);
  }, [debouncedFiltering]);

  const hasNonServiceAdvancedFilters = useMemo(() => {
    const f = advancedFilterData || {};
    return Object.entries(f).some(([key, value]) => {
      if (
        ["services", "subscriptionType", "group", "adddate_regex"].includes(key)
      )
        return false;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "string") return value.trim() !== "";
      return value === true || (typeof value === "number" && !isNaN(value));
    });
  }, [advancedFilterData]);

  const effectiveAddedToday =
    addedToday && !isSearchActive && !hasNonServiceAdvancedFilters;

  // Modified fetchData to handle tagged search and client counts - use memoized version
  const fetchData = useCallback(
    async (
      currentPage,
      currentPageSize,
      filter = "",
      group = "",
      advancedFilterData = {},
      overrideSubscriptionType = null
    ) => {
      // Declare timeoutId outside try/catch to avoid scope issues on errors
      let timeoutId = null;
      try {
        // Cancel any existing request
        if (currentRequestRef.current) {
          currentRequestRef.current.cancel = true;
        }

        // Create a new request ID
        const requestId = Date.now();
        currentRequestRef.current = { id: requestId, cancel: false };

        // Show loading state for all requests to provide better UX
        setIsLoading(true);

        // Add a timeout to prevent indefinite loading
        timeoutId = setTimeout(() => {
          if (currentRequestRef.current?.id === requestId) {
            console.warn("Request timeout - forcing loading state reset");
            setIsLoading(false);
            setIsAddedTodayLoading(false);
            toast({
              title: "Request Timeout",
              description:
                "The search request took too long. Please try again with different filters.",
              variant: "destructive",
            });
          }
        }, 30000); // 30 second timeout
        // Clone the filter object to avoid mutations
        let filtersToUse = { ...advancedFilterData };

        // Determine subscription type early
        const currentSubscriptionType =
          overrideSubscriptionType || subscriptionType;

        // Parse the filter for tagged search
        if (filter) {
          const parsedFilters = parseTaggedSearch(filter);

          // Add parsed filters to filtersToUse
          if (parsedFilters.clientId) {
            filtersToUse.clientId = parsedFilters.clientId;
          }

          if (parsedFilters.paymentRef) {
            filtersToUse.paymentRef = parsedFilters.paymentRef;
          }

          if (parsedFilters.fullName) {
            filtersToUse.fullName = parsedFilters.fullName;
          }

          // Only use general search if there's non-tagged content
          filter = parsedFilters.search;
        }

        // Properly handle services array
        // Get role-based services first
        const roleBasedServices = [];
        if (hasRole("WMM")) roleBasedServices.push("WMM");
        if (hasRole("FOM")) roleBasedServices.push("FOM");
        if (hasRole("HRG")) roleBasedServices.push("HRG");
        if (hasRole("CAL")) roleBasedServices.push("CAL");

        // Check if services exists and is properly formatted
        let shouldUseRoleBasedServices = true;

        if (filtersToUse.services) {
          // Always ensure services is an array to prevent backend errors
          if (
            typeof filtersToUse.services === "string" &&
            filtersToUse.services.trim() !== ""
          ) {
            // Convert string to array (e.g. "WMM,FOM" -> ["WMM", "FOM"])
            filtersToUse.services = filtersToUse.services
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            shouldUseRoleBasedServices = false;
          }
          // If it's already an array with items, keep it
          else if (
            Array.isArray(filtersToUse.services) &&
            filtersToUse.services.length > 0
          ) {
            shouldUseRoleBasedServices = false;
          }
          // If it's neither a valid string nor array, default to role-based
          else {
            shouldUseRoleBasedServices = true;
          }
        }

        // If ANY search term is present (general filter OR fullName OR clientId), show ALL services without restriction
        const hasAnySearchTerm =
          (filter && filter.trim().length > 0) ||
          filtersToUse.fullName ||
          filtersToUse.clientId;
        if (hasAnySearchTerm) {
          // When searching by name or ID, remove ALL restrictions to show all services (WMM, PROMO, COMP, HRG, FOM, CAL)
          delete filtersToUse.services;
          // delete filtersToUse.subscriptionType;
          // Signal the transport not to send standalone subscriptionType param
          filtersToUse.ignoreSubscriptionParam = true;
        } else if (shouldUseRoleBasedServices && roleBasedServices.length > 0) {
          filtersToUse.services = roleBasedServices;
        }

        // IMPORTANT: Always ensure services is an array even if it's empty
        if (!Array.isArray(filtersToUse.services)) {
          filtersToUse.services = [];
        }

        // Determine if advanced filters (other than services/subscriptionType/group) are active
        const hasAdvancedFiltersActive = Object.entries(filtersToUse).some(
          ([key, value]) => {
            if (
              [
                "services",
                "subscriptionType",
                "group",
                "adddate_regex",
              ].includes(key)
            )
              return false;
            if (Array.isArray(value)) return value.length > 0;
            if (typeof value === "string") return value.trim() !== "";
            return (
              value === true || (typeof value === "number" && !isNaN(value))
            );
          }
        );

        // Disable Added/Updated Today when searching or when any advanced filter is active
        const applyAddedTodayFilter =
          addedToday && !(hasAnySearchTerm || hasAdvancedFiltersActive);

        if (applyAddedTodayFilter) {
          try {
            const today = new Date();
            // Create date pattern to match the beginning of the string
            const month = today.getMonth() + 1;
            const day = today.getDate();
            const year = today.getFullYear();

            // Ensure all parts are valid numbers to prevent regex errors
            if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
              // We want to match the date part regardless of the time part
              // The database stores dates in YYYY-MM-DD format (e.g., "2025-08-22" or "2025-08-22 14:43:50")
              // Create regex pattern to match YYYY-MM-DD format
              const paddedMonth = month.toString().padStart(2, "0");
              const paddedDay = day.toString().padStart(2, "0");
              filtersToUse.adddate_regex = `^${year}-${paddedMonth}-${paddedDay}`;
            } else {
              console.error("Invalid date components for addedToday filter");
              delete filtersToUse.adddate_regex;
            }
          } catch (error) {
            console.error("Error creating adddate_regex:", error);
            delete filtersToUse.adddate_regex;
          }
        } else {
          // Explicitly remove adddate filter when not applied
          delete filtersToUse.adddate_regex;
        }

        // Check if request was cancelled before making the API call
        if (currentRequestRef.current?.cancel) {
          if (timeoutId) clearTimeout(timeoutId);
          setIsLoading(false);
          setIsAddedTodayLoading(false);
          return null;
        }

        const response = await fetchClients(
          currentPage,
          currentPageSize,
          filter,
          group,
          filtersToUse,
          currentSubscriptionType
        );

        // Clear the timeout since request completed
        if (timeoutId) clearTimeout(timeoutId);

        // Check if request was cancelled during the API call
        if (
          currentRequestRef.current?.cancel ||
          currentRequestRef.current?.id !== requestId
        ) {
          if (timeoutId) clearTimeout(timeoutId);
          setIsLoading(false);
          setIsAddedTodayLoading(false);
          return null;
        }

        // Skip state updates if the request was cancelled (response is null)
        if (!response) {
          setIsLoading(false);
          setIsAddedTodayLoading(false);
          return null;
        }

        // When Added Today filter is applied, sort by effective added date timestamp (newest first)
        const pageData = Array.isArray(response.data) ? response.data : [];
        const applyAddedTodaySorting = applyAddedTodayFilter; // same condition as filter application
        const sortedPageData = applyAddedTodaySorting
          ? [...pageData].sort((a, b) => {
              // Prefer subscription-level adddate (most recent subscription record)
              // then fall back to client-level adddate/addedAt/updatedAt.
              const getEffectiveDateValue = (row) => {
                try {
                  // Check common subscription containers for records
                  const subsKeys = ["wmmData", "promoData", "compData"];
                  let latest = null;
                  for (const key of subsKeys) {
                    const sdata = row?.[key];
                    if (!sdata) continue;
                    const records =
                      sdata.filteredRecords ||
                      sdata.matchedRecords ||
                      sdata.records ||
                      [];
                    if (!Array.isArray(records) || records.length === 0)
                      continue;
                    for (const rec of records) {
                      const cand =
                        rec?.adddate ||
                        rec?.addedAt ||
                        rec?.updatedAt ||
                        rec?.subsdate ||
                        null;
                      if (!cand) continue;
                      const candTime = Date.parse(cand);
                      if (isNaN(candTime)) continue;
                      if (!latest || candTime > latest) latest = candTime;
                    }
                  }
                  if (latest) return new Date(latest).toISOString();
                } catch (e) {
                  // ignore and fallback
                }

                return row?.adddate || row?.addedAt || row?.updatedAt || null;
              };

              const aDate = getEffectiveDateValue(a);
              const bDate = getEffectiveDateValue(b);

              // Handle missing dates - put them at the end
              if (!aDate && !bDate) return 0;
              if (!aDate) return 1;
              if (!bDate) return -1;

              const aTime = Date.parse(aDate);
              const bTime = Date.parse(bDate);
              const aValid = !isNaN(aTime);
              const bValid = !isNaN(bTime);

              // If both dates are valid, sort by time (newest first)
              if (aValid && bValid) {
                return bTime - aTime;
              }

              // If only one is valid, treat the valid date as more recent
              if (aValid && !bValid) return -1;
              if (!aValid && bValid) return 1;

              // Fallback: string comparison descending to keep order deterministic
              return String(bDate).localeCompare(String(aDate));
            })
          : pageData;

        setClientData(sortedPageData);
        setTotalPages(response.totalPages || 0);
        setStats(
          response.stats || {
            clientCount: {
              total: response.totalClients || 0,
              page: response.data?.length || 0,
            },
            metrics: [],
          }
        );

        // Always remove loading state when done
        setIsLoading(false);
        setIsAddedTodayLoading(false);

        return response;
      } catch (error) {
        console.error("❌ Error fetching clients:", error);

        // Clear any existing timeout (guard against scope issues)
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        // Show specific error messages to user
        if (
          error.message === "Request timeout" ||
          error.code === "ECONNABORTED"
        ) {
          toast({
            title: "Request Timeout",
            description:
              "The request took too long to complete. Please try again or reduce your filter criteria.",
            variant: "destructive",
          });
        } else if (error.response?.status === 500) {
          toast({
            title: "Server Error",
            description: "An error occurred on the server. Please try again.",
            variant: "destructive",
          });
        } else if (error.code === "ERR_NETWORK") {
          toast({
            title: "Network Error",
            description:
              "Unable to connect to server. Please check your connection.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to fetch data. Please try again.",
            variant: "destructive",
          });
        }

        // Ensure loading state is cleared even on error
        setIsLoading(false);
        setIsAddedTodayLoading(false);
        return null;
      }
    },
    [addedToday, hasRole, parseTaggedSearch, subscriptionType]
  );

  // Auto-set services based on user roles on component mount (run this FIRST)
  useEffect(() => {
    if (initialLoadComplete.current) {
      return; // Only run once on initial load
    }

    const initializeComponent = async () => {
      try {
        // Load groups and users in parallel
        const [groupsData, userData] = await Promise.all([
          fetchGroups().catch((error) => {
            console.error("Error loading groups:", error);
            return [];
          }),
          fetchUsers().catch((error) => {
            console.error("Error loading users:", error);
            return { users: [] };
          }),
        ]);

        setGroups(groupsData);
        if (userData && userData.users) {
          setUsers(userData.users);
        }

        // Initialize services based on user roles
        const roleBasedServices = [];

        // Check each role and add corresponding service
        if (hasRole("WMM")) roleBasedServices.push("WMM");
        if (hasRole("FOM")) roleBasedServices.push("FOM");
        if (hasRole("HRG")) roleBasedServices.push("HRG");
        if (hasRole("CAL")) roleBasedServices.push("CAL");

        // Only update if we found matching roles
        if (roleBasedServices.length > 0) {
          // Create initial filter with role-based services
          const initialFilter = {
            ...advancedFilterData,
            services: roleBasedServices,
          };

          // Add addedToday filter since it's on by default
          if (addedToday) {
            const today = new Date();
            const month = today.getMonth() + 1;
            const day = today.getDate();
            const year = today.getFullYear();
            // Create regex pattern to match YYYY-MM-DD format
            const paddedMonth = month.toString().padStart(2, "0");
            const paddedDay = day.toString().padStart(2, "0");
            initialFilter.adddate_regex = `^${year}-${paddedMonth}-${paddedDay}`;
          }

          // Set the filter state first
          setAdvancedFilterData(initialFilter);

          // Don't set lastFilterRef here - let the main data loading effect handle it
          // This ensures the filter snapshot is calculated correctly
        }

        // Mark initial load as complete
        initialLoadComplete.current = true;

        // Set loading to false to trigger the main data loading effect
        setIsLoading(false);
        setIsAddedTodayLoading(false); // Ensure this is also reset
      } catch (error) {
        console.error("Error during component initialization:", error);
        // Even if there's an error, we should still allow the component to function
        initialLoadComplete.current = true;
        setIsLoading(false);
        setIsAddedTodayLoading(false);
      }
    };

    initializeComponent();
  }, [hasRole, addedToday]); // Simplified dependencies to prevent infinite loops

  // Cleanup effect to cancel pending requests on unmount
  useEffect(() => {
    return () => {
      if (currentRequestRef.current) {
        currentRequestRef.current.cancel = true;
      }
    };
  }, []);

  // Main data loading effect (runs AFTER role-based services are set)
  useEffect(() => {
    // Skip this effect during initial load when services are being set up
    if (isLoading && initialLoadComplete.current) {
      return;
    }

    // Skip if we intentionally cleared search to keep results
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }

    // Skip if search term is too short (less than 2 characters) unless it's empty
    if (debouncedFiltering && debouncedFiltering.trim().length < 2) {
      // Reset loading states if search is too short
      setIsLoading(false);
      setIsAddedTodayLoading(false);
      return;
    }

    // If this is the same as our last filter, skip to prevent bouncing
    // BUT allow initial load when lastFilterRef.current is null
    if (
      lastFilterRef.current === currentFilterSnapshot &&
      lastFilterRef.current !== null
    ) {
      return;
    }

    // Update our last filter reference
    lastFilterRef.current = currentFilterSnapshot;

    // Use a single fetch call with a slight delay to avoid race conditions
    // Add extra delay for addedToday filter to prevent rapid toggling
    const delay = addedToday ? 200 : 100;
    const fetchTimer = setTimeout(() => {
      fetchData(
        page,
        pageSize,
        debouncedFiltering,
        selectedGroup,
        advancedFilterData
      ).catch((error) => {
        console.error("Fetch data error in useEffect:", error);
        // Ensure loading states are reset even if fetchData throws
        setIsLoading(false);
        setIsAddedTodayLoading(false);
      });
    }, delay);

    // Clean up timeout if component unmounts or dependencies change
    return () => clearTimeout(fetchTimer);
  }, [
    currentFilterSnapshot, // Use memoized snapshot instead of individual dependencies
    pageSize,
    isLoading, // Only run when loading is complete
    // Removed individual dependencies since they're now in currentFilterSnapshot
  ]);

  const handleDeleteSuccess = useCallback(
    (deletedId) => {
      // Optimistically remove the client from the current page
      setClientData((prevData) =>
        prevData.filter((client) => client.id !== deletedId)
      );

      // Reset last filter ref to ensure fetch happens
      lastFilterRef.current = null;

      // Refresh data using the current filters (including Added/Updated Today)
      fetchData(
        page,
        pageSize,
        debouncedFiltering,
        selectedGroup,
        advancedFilterData
      ).catch((error) => {
        console.error("Error refreshing clients after delete:", error);
        // Ensure loading states are reset on error
        setIsLoading(false);
        setIsAddedTodayLoading(false);
      });
    },
    [
      page,
      pageSize,
      debouncedFiltering,
      selectedGroup,
      advancedFilterData,
      fetchData,
    ]
  );

  const handleRowClick = (event, row) => {
    setSelectedRow(row.original); // Set the selected row data
    setShowViewModal(true); // Show the View component
  };

  const handleViewClose = () => {
    setShowViewModal(false);
    setSelectedRow(null);
  };

  // Handle successful edit
  const handleEditSuccess = useCallback(() => {
    // Reset last filter ref so the next fetch isn't skipped as a "duplicate"
    // This ensures we always re-fetch, even when filters themselves didn't change
    lastFilterRef.current = null;

    // Re-fetch using the current filters (search + advanced filters + Added Today state)
    // without forcing any filter changes. This keeps the user's view consistent.
    fetchData(
      page,
      pageSize,
      debouncedFiltering,
      selectedGroup,
      advancedFilterData
    ).catch((error) => {
      console.error("Error refreshing clients after edit:", error);
      // Ensure loading states are reset on error
      setIsLoading(false);
      setIsAddedTodayLoading(false);
    });
  }, [
    page,
    pageSize,
    debouncedFiltering,
    selectedGroup,
    advancedFilterData,
    fetchData,
  ]);
  const handleSearchChange = (e) => {
    const value = e.target.value;

    // Only update if the value actually changed
    if (value !== filtering) {
      setFiltering(value);
      setPage(1);
      // Do not auto-disable 'Added/Updated Today' when searching
    }
  };

  // Auto-select all text in search when focused or when clicking while already focused
  const handleSearchFocus = (e) => {
    if (e.target.value) {
      e.target.select();
    }
  };

  const handleSearchMouseDown = (e) => {
    const input = e.target;
    if (input.value && document.activeElement === input) {
      // Prevent caret move and select all instead when clicking an already-focused input
      e.preventDefault();
      input.select();
    }
  };

  const handleTableInstanceUpdate = useCallback((instance) => {
    setTableInstance(instance);
  }, []);

  const handleApplyFilter = (filterData) => {
    const formatDate = (dateString) => {
      if (!dateString) return "";
      const date = new Date(dateString);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    };

    // Process services data - ensure it's always an array
    let services = [];

    try {
      if (filterData.services) {
        if (Array.isArray(filterData.services)) {
          services = [...filterData.services];
        } else if (typeof filterData.services === "string") {
          services = filterData.services.split(",").map((s) => s.trim());
        }
      }
    } catch (error) {
      console.error("Error processing services:", error);
      // Fallback to empty array if there's an error
      services = [];
    }

    // Make sure areas is always an array
    let areas = [];
    try {
      if (filterData.areas) {
        if (Array.isArray(filterData.areas)) {
          areas = [...filterData.areas];
        } else if (typeof filterData.areas === "string") {
          areas = filterData.areas.split(",").map((a) => a.trim());
        }
      }
    } catch (error) {
      console.error("Error processing areas:", error);
      areas = [];
    }

    // Create formatted data with properly handled services and areas
    const formattedFilterData = {
      ...filterData,
      startDate: formatDate(filterData.startDate),
      endDate: formatDate(filterData.endDate),
      services: services,
      areas: areas,
    };

    // Keep 'Added/Updated Today' persistent even when applying advanced filters
    // Check if any filter other than services (which are auto-populated) is set
    // const hasNonServiceFilters = Object.entries(formattedFilterData).some(
    //   ([key, value]) => {
    //     if (key === "services") return false;
    //     if (Array.isArray(value)) return value.length > 0;
    //     if (typeof value === "string") return value.trim() !== "";
    //     return !!value;
    //   }
    // );

    // Do not change the Added/Updated Today state when applying advanced filters

    // Create a snapshot of what the filter will be
    const filterSnapshot = JSON.stringify({
      services: services,
      page: 1, // Always reset to page 1 when applying filters
      filtering: debouncedFiltering,
      group: selectedGroup,
      addedToday,
    });

    // Update last filter ref to prevent bounce
    lastFilterRef.current = filterSnapshot;

    // Update state and trigger data fetch
    setAdvancedFilterData(formattedFilterData);
    setPage(1); // Reset to first page with new filters
  };

  // Update the getActiveFilters function to display tagged search filters
  const getActiveFilters = () => {
    const filters = [];

    // // Helper function to safely format dates
    // const formatSafeDate = (dateStr) => {
    //   if (!dateStr) return "";

    //   try {
    //     const date = new Date(dateStr);
    //     if (isNaN(date.getTime())) {
    //       // If invalid date, return the string as is
    //       return dateStr;
    //     }

    //     // Format as MM/DD/YYYY
    //     const month = date.getMonth() + 1;
    //     const day = date.getDate();
    //     const year = date.getFullYear();
    //     return `${month}/${day}/${year}`;
    //   } catch (error) {
    //     console.error("Error formatting date:", error);
    //     return dateStr; // Return original string on error
    //   }
    // };

    // Helper function to format dates with month names
    const formatDateWithMonthName = (dateStr) => {
      if (!dateStr) return "";

      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          // If invalid date, return the string as is
          return dateStr;
        }

        // List of month names
        const months = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];

        // Format as "Month Day, Year"
        const monthName = months[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear();
        return `${monthName} ${day}, ${year}`;
      } catch (error) {
        console.error("Error formatting date with month name:", error);
        return dateStr; // Return original string on error
      }
    };

    // Helper to get month name from month number
    const getMonthName = (monthNumber) => {
      try {
        const months = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];
        const index = parseInt(monthNumber) - 1;
        if (index >= 0 && index < 12) {
          return months[index];
        }
        return monthNumber;
      } catch (error) {
        console.error("Error getting month name:", error);
        return monthNumber;
      }
    };

    // Parse the current filtering value
    if (debouncedFiltering) {
      const parsedFilters = parseTaggedSearch(debouncedFiltering);

      if (parsedFilters.clientId) {
        filters.push(`Client ID: ${parsedFilters.clientId}`);
      }

      if (parsedFilters.paymentRef) {
        filters.push(`Payment Ref: ${parsedFilters.paymentRef}`);
      }

      if (parsedFilters.fullName) {
        filters.push(`Full Name: "${parsedFilters.fullName}"`);
      }

      if (parsedFilters.search) {
        filters.push(`Search: "${parsedFilters.search}"`);
      } else if (
        !parsedFilters.clientId &&
        !parsedFilters.paymentRef &&
        !parsedFilters.fullName
      ) {
        filters.push(`Search: "${debouncedFiltering}"`);
      }
    }

    // Check each filter and add readable description if it's active
    if (selectedGroup) filters.push(`Group: ${selectedGroup}`);
    if (effectiveAddedToday) filters.push("Added/Updated Today");

    // Check advanced filters
    if (advancedFilterData.lname)
      filters.push(`Last Name: ${advancedFilterData.lname}`);
    if (advancedFilterData.fname)
      filters.push(`First Name: ${advancedFilterData.fname}`);
    if (advancedFilterData.mname)
      filters.push(`Middle Name: ${advancedFilterData.mname}`);
    if (advancedFilterData.sname)
      filters.push(`Suffix: ${advancedFilterData.sname}`);
    if (advancedFilterData.address)
      filters.push(
        `Address: ${advancedFilterData.address.substring(0, 20)}${
          advancedFilterData.address.length > 20 ? "..." : ""
        }`
      );
    if (advancedFilterData.email)
      filters.push(`Email: ${advancedFilterData.email}`);
    if (advancedFilterData.cellno)
      filters.push(`Cell Number: ${advancedFilterData.cellno}`);
    if (advancedFilterData.ofcno)
      filters.push(`Office Number: ${advancedFilterData.ofcno}`);
    if (advancedFilterData.contactnos)
      filters.push(`Other Contact: ${advancedFilterData.contactnos}`);
    if (advancedFilterData.birthdate)
      filters.push(
        `Birth Date: ${formatDateWithMonthName(advancedFilterData.birthdate)}`
      );

    if (advancedFilterData.startDate && advancedFilterData.endDate)
      filters.push(
        `Date Range: ${formatDateWithMonthName(
          advancedFilterData.startDate
        )} to ${formatDateWithMonthName(advancedFilterData.endDate)}`
      );
    else if (advancedFilterData.startDate)
      filters.push(
        `From: ${formatDateWithMonthName(advancedFilterData.startDate)}`
      );
    else if (advancedFilterData.endDate)
      filters.push(
        `Until: ${formatDateWithMonthName(advancedFilterData.endDate)}`
      );

    // Handle Active Subscriptions From/To dates
    if (
      advancedFilterData.wmmActiveFromDate ||
      advancedFilterData.wmmActiveToDate
    ) {
      const fromDate = advancedFilterData.wmmActiveFromDate;
      const toDate = advancedFilterData.wmmActiveToDate;

      if (fromDate && toDate) {
        filters.push(
          `Active Subscriptions: ${formatDateWithMonthName(
            fromDate
          )} to ${formatDateWithMonthName(toDate)}`
        );
      } else if (fromDate) {
        filters.push(
          `Active Subscriptions From: ${formatDateWithMonthName(fromDate)}`
        );
      } else if (toDate) {
        filters.push(
          `Active Subscriptions To: ${formatDateWithMonthName(toDate)}`
        );
      }
    }

    // Handle Expiring Subscriptions From/To dates
    if (
      advancedFilterData.wmmExpiringFromDate ||
      advancedFilterData.wmmExpiringToDate
    ) {
      const fromDate = advancedFilterData.wmmExpiringFromDate;
      const toDate = advancedFilterData.wmmExpiringToDate;

      if (fromDate && toDate) {
        filters.push(
          `Expiring Subscriptions: ${formatDateWithMonthName(
            fromDate
          )} to ${formatDateWithMonthName(toDate)}`
        );
      } else if (fromDate) {
        filters.push(
          `Expiring Subscriptions From: ${formatDateWithMonthName(fromDate)}`
        );
      } else if (toDate) {
        filters.push(
          `Expiring Subscriptions To: ${formatDateWithMonthName(toDate)}`
        );
      }
    }

    if (advancedFilterData.type)
      filters.push(`Type: ${advancedFilterData.type}`);
    if (advancedFilterData.subsclass)
      filters.push(`Subclass: ${advancedFilterData.subsclass}`);

    // Areas: Prefer selectedAreaGroups (Local/Foreign) if provided; else list codes
    if (
      Array.isArray(advancedFilterData.selectedAreaGroups) &&
      advancedFilterData.selectedAreaGroups.length > 0
    ) {
      filters.push(
        `Areas: ${advancedFilterData.selectedAreaGroups.join(", ")}`
      );
    } else if (
      advancedFilterData.areas &&
      Array.isArray(advancedFilterData.areas) &&
      advancedFilterData.areas.length > 0
    ) {
      if (advancedFilterData.areas.length <= 3) {
        // Show specific areas if there are only a few
        filters.push(`Areas: ${advancedFilterData.areas.join(", ")}`);
      } else {
        // Show first few areas with a count if there are many
        filters.push(
          `Areas: ${advancedFilterData.areas.slice(0, 3).join(", ")}... (${
            advancedFilterData.areas.length
          } total)`
        );
      }
    }

    if (advancedFilterData.copiesRange) {
      const rangeMap = {
        lt5: "Less than 5 copies",
        "5to10": "5 to 10 copies",
        gt10: "More than 10 copies",
        custom: `${advancedFilterData.minCopies || "0"} to ${
          advancedFilterData.maxCopies || "any"
        } copies`,
      };
      filters.push(
        `Copies: ${
          rangeMap[advancedFilterData.copiesRange] ||
          advancedFilterData.copiesRange
        }`
      );
    }

    // Enhanced services handling
    if (advancedFilterData.services) {
      let services = [];

      try {
        // Handle different possible formats
        if (Array.isArray(advancedFilterData.services)) {
          if (advancedFilterData.services.length > 0) {
            services = [...advancedFilterData.services];
          }
        } else if (
          typeof advancedFilterData.services === "string" &&
          advancedFilterData.services.trim() !== ""
        ) {
          // Handle case where services might be a comma-separated string
          services = advancedFilterData.services
            .split(",")
            .map((s) => s.trim());
        }

        if (services.length > 0) {
          // Determine which services match the user's roles
          const roleBasedServices = [];
          if (hasRole("WMM")) roleBasedServices.push("WMM");
          if (hasRole("FOM")) roleBasedServices.push("FOM");
          if (hasRole("HRG")) roleBasedServices.push("HRG");
          if (hasRole("CAL")) roleBasedServices.push("CAL");

          // Check if all selected services exactly match role-based ones
          const isExactlyRoleBased =
            services.length === roleBasedServices.length &&
            services.every((service) => roleBasedServices.includes(service));

          if (isExactlyRoleBased && roleBasedServices.length > 0) {
            filters.push(
              `Services: ${services.join(", ")} (based on your roles)`
            );
          } else {
            filters.push(`Services: ${services.join(", ")}`);
          }
        }
      } catch (error) {
        console.error("Error processing services in getActiveFilters:", error);
      }
    }

    // Add client ID filters
    if (
      advancedFilterData.includeClientIds &&
      advancedFilterData.includeClientIds.length > 0
    ) {
      if (advancedFilterData.includeClientIds.length <= 5) {
        filters.push(
          `Include Clients: ${advancedFilterData.includeClientIds.join(", ")}`
        );
      } else {
        filters.push(
          `Include Clients: ${advancedFilterData.includeClientIds
            .slice(0, 5)
            .join(", ")}... (${`
            ${advancedFilterData.includeClientIds.length}
          `} total)`
        );
      }
    }

    if (
      advancedFilterData.excludeClientIds &&
      advancedFilterData.excludeClientIds.length > 0
    ) {
      if (advancedFilterData.excludeClientIds.length <= 5) {
        filters.push(
          `Exclude Clients: ${advancedFilterData.excludeClientIds.join(", ")}`
        );
      } else {
        filters.push(
          `Exclude Clients: ${advancedFilterData.excludeClientIds
            .slice(0, 5)
            .join(", ")}... (${`
            ${advancedFilterData.excludeClientIds.length}
          `} total)`
        );
      }
    }

    // Add exclude SPack clients filter
    if (advancedFilterData.excludeSPackClients) {
      filters.push("Exclude SPack Clients");
    }

    // Add subscription status filter
    if (
      advancedFilterData.subscriptionStatus &&
      advancedFilterData.subscriptionStatus !== "all"
    ) {
      const statusMap = {
        active: "Active Only",
        unsubscribed: "Unsubscribed Only",
      };
      filters.push(
        `Subscription Status: ${
          statusMap[advancedFilterData.subscriptionStatus] ||
          advancedFilterData.subscriptionStatus
        }`
      );
    }

    // Add user filter with actual username if available
    if (advancedFilterData.userId) {
      // Try to find the username if possible
      const username = users?.find(
        (u) => u._id === advancedFilterData.userId
      )?.username;
      filters.push(`User: ${username || advancedFilterData.userId}`);
    }

    // Calendar status
    if (advancedFilterData.calendarReceived) filters.push("Calendar: Received");
    if (advancedFilterData.calendarNotReceived)
      filters.push("Calendar: Not Received");

    // Spack status
    if (advancedFilterData.spackReceived) filters.push("SPack: Received");
    if (advancedFilterData.spackNotReceived)
      filters.push("SPack: Not Received");

    // RTS statuses and limits
    if (advancedFilterData.rtsMaxReached) filters.push("RTS: Max Reached");
    if (advancedFilterData.rtsActive) filters.push("RTS: Active");
    if (advancedFilterData.rtsNone) filters.push("RTS: None");
    if (advancedFilterData.excludeRTSMax) filters.push("Exclude RTS Max");
    if (advancedFilterData.rtsMinCount || advancedFilterData.rtsMaxCount) {
      const min = advancedFilterData.rtsMinCount ?? "0";
      const max = advancedFilterData.rtsMaxCount ?? "∞";
      filters.push(`RTS Count: ${min} - ${max}`);
    }

    // Payment type
    if (advancedFilterData.massPaid) filters.push("Payment Type: Mass Paid");
    if (advancedFilterData.cashPaid) filters.push("Payment Type: Cash Paid");

    // HRG/FOM subscription status
    if (
      advancedFilterData.hrgFomSubscriptionStatus &&
      advancedFilterData.hrgFomSubscriptionStatus !== "all"
    ) {
      const v = advancedFilterData.hrgFomSubscriptionStatus;
      filters.push(`HRG/FOM Status: ${v.charAt(0).toUpperCase()}${v.slice(1)}`);
    }

    // Helper for ranges
    const addRange = (label, from, to) => {
      if (from && to)
        filters.push(
          `${label}: ${formatDateWithMonthName(
            from
          )} to ${formatDateWithMonthName(to)}`
        );
      else if (from)
        filters.push(`${label} From: ${formatDateWithMonthName(from)}`);
      else if (to) filters.push(`${label} To: ${formatDateWithMonthName(to)}`);
    };
    // CAL/HRG/FOM ranges
    addRange(
      "CAL Order Received",
      advancedFilterData.calReceivedFromDate,
      advancedFilterData.calReceivedToDate
    );
    addRange(
      "CAL Payment",
      advancedFilterData.calPaymentFromDate,
      advancedFilterData.calPaymentToDate
    );
    addRange(
      "HRG Payment",
      advancedFilterData.hrgPaymentFromDate,
      advancedFilterData.hrgPaymentToDate
    );
    addRange(
      "FOM Payment",
      advancedFilterData.fomPaymentFromDate,
      advancedFilterData.fomPaymentToDate
    );

    // HRG Campaign info
    if (
      advancedFilterData.hrgCampaignYear &&
      advancedFilterData.hrgCampaignMonth
    ) {
      filters.push(
        `HRG Campaign: ${getMonthName(advancedFilterData.hrgCampaignMonth)} ${
          advancedFilterData.hrgCampaignYear
        }`
      );
    } else if (
      advancedFilterData.hrgCampaignFromMonth &&
      advancedFilterData.hrgCampaignFromYear &&
      advancedFilterData.hrgCampaignToMonth &&
      advancedFilterData.hrgCampaignToYear
    ) {
      filters.push(
        `HRG Campaign: ${getMonthName(
          advancedFilterData.hrgCampaignFromMonth
        )} ${advancedFilterData.hrgCampaignFromYear} to ${getMonthName(
          advancedFilterData.hrgCampaignToMonth
        )} ${advancedFilterData.hrgCampaignToYear}`
      );
    } else if (advancedFilterData.hrgCampaignYear) {
      filters.push(`HRG Campaign Year: ${advancedFilterData.hrgCampaignYear}`);
    }

    // CAL Calendar Year
    if (advancedFilterData.calYear)
      filters.push(`Calendar Year: ${advancedFilterData.calYear}`);

    // Date range name
    if (advancedFilterData.dateRangeName)
      filters.push(`Date Range: ${advancedFilterData.dateRangeName}`);

    // Expiry and entitlement flags
    if (advancedFilterData.expiryDateRangeOnly)
      filters.push("Expiry Date Range Only");
    if (advancedFilterData.calendarEntitledOnly)
      filters.push("Calendar Entitled Only");

    // Exclude lists for special clients
    if (advancedFilterData.excludeDCSClients) filters.push("Exclude DCS");
    if (advancedFilterData.excludeCMCClients)
      filters.push("Exclude CMCClients");

    return filters;
  };

  // Function to determine the user role for table display - memoized to prevent re-renders
  const determineUserRole = useMemo(() => {
    const roles = [];
    if (hasRole("WMM")) roles.push("WMM");
    if (hasRole("HRG")) roles.push("HRG");
    if (hasRole("FOM")) roles.push("FOM");
    if (hasRole("CAL")) roles.push("CAL");

    // First check if user has WMM role - PRIORITIZE WMM OVER ADMIN
    if (hasRole("WMM")) {
      return "WMM";
    }

    // Then check for Admin role
    if (hasRole("Admin")) {
      return "Admin";
    }

    // Check for all three specific roles
    if (hasRole("HRG") && hasRole("FOM") && hasRole("CAL")) {
      return "HRG FOM CAL";
    }

    // For other combinations, join the roles with spaces
    return roles.length > 0 ? roles.join(" ") : "default";
  }, [hasRole]); // Only recalculate when hasRole changes

  // Ref for scrolling the DataTable to bottom
  const dataTableRef = useRef(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);

  const handleScrollToggle = () => {
    // If we have a DataTable ref, scroll it to bottom or top based on current state
    if (dataTableRef.current) {
      const scrollableElement = dataTableRef.current.querySelector('[data-radix-scroll-area-viewport]') || 
                              dataTableRef.current;
      
      // Check if we're near the bottom (within 100px of the bottom)
      const { scrollHeight, scrollTop, clientHeight } = scrollableElement;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      if (isAtBottom) {
        // Scroll to top
        scrollableElement.scrollTo({ top: 0, behavior: "smooth" });
        setIsScrolledToBottom(false);
      } else {
        // Scroll to bottom
        scrollableElement.scrollTo({ top: scrollHeight, behavior: "smooth" });
        setIsScrolledToBottom(true);
      }
    }
  };
  
  // Add scroll listener to track if user scrolls manually
  useEffect(() => {
    // Set up a mutation observer to detect when the DataTable is rendered
    const observer = new MutationObserver(() => {
      if (dataTableRef.current) {
        const scrollableElement = dataTableRef.current.querySelector('[data-radix-scroll-area-viewport]') || 
                                 dataTableRef.current.querySelector('.overflow-y-auto') ||
                                 dataTableRef.current;
        
        // Check if we already have this element set up
        if (!scrollableElement.getAttribute('data-scroll-listener')) {
          // Mark this element so we don't attach duplicate listeners
          scrollableElement.setAttribute('data-scroll-listener', 'true');
          
          const handleScroll = () => {
            const { scrollHeight, scrollTop, clientHeight } = scrollableElement;
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
            setIsScrolledToBottom(isAtBottom);
          };
          
          // Initial check
          handleScroll();
          
          scrollableElement.addEventListener('scroll', handleScroll, { passive: true });
          
          // Clean up function
          return () => {
            scrollableElement.removeEventListener('scroll', handleScroll);
            scrollableElement.removeAttribute('data-scroll-listener');
          };
        }
      }
    });

    // Start observing the document for changes to find the DataTable
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Clean up
    return () => {
      observer.disconnect();
      if (dataTableRef.current) {
        const scrollableElement = dataTableRef.current.querySelector('[data-radix-scroll-area-viewport]') || 
                                 dataTableRef.current.querySelector('.overflow-y-auto') ||
                                 dataTableRef.current;
        if (scrollableElement) {
          scrollableElement.removeEventListener('scroll', () => {});
        }
      }
    };
  }, []);

  const [showMailingModal, setShowMailingModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showSpackModal, setShowSpackModal] = useState(false);
  const [showRTSModal, setShowRTSModal] = useState(false);
  const [mailingAction, setMailingAction] = useState("label"); // 'label', 'document', or 'csv'

  const handleMailingAction = (action) => {
    setMailingAction(action);
    setShowMailingModal(true);
  };

  // Update handleSubscriptionTypeChange to also update services
  const handleSubscriptionTypeChange = (type) => {
    // Determine new services for WMM role
    let newServices = advancedFilterData.services || [];
    if (hasRole("WMM")) {
      if (type === "Promo") newServices = ["PROMO"];
      else if (type === "Complimentary") newServices = ["COMP"];
      else newServices = ["WMM"]; // default
    }

    // Update state first and let the main effect trigger the fetch
    setSubscriptionType(type);
    setPage(1);
    setAdvancedFilterData((prev) => ({
      ...prev,
      services: newServices,
      subscriptionType: type,
    }));

    // Do NOT touch lastFilterRef here; allow the main effect to detect changes and refetch
  };

  return (
    <div className="mr-[10px] ml-[10px] mt-[10px]">
      <div className="flex justify-between items-center mb-4">
        <Add
          // Use the same fetchData pipeline so new/duplicate clients
          // respect the current filters and Added/Updated Today state
          fetchClients={() =>
            fetchData(
              page,
              pageSize,
              debouncedFiltering,
              selectedGroup,
              advancedFilterData
            )
          }
          subscriptionType={subscriptionType}
          onAfterDuplicateEditSuccess={() => {
            // Preserve Search or Advanced filters; only force "Added/Updated Today" when none are active
            const searchActive = !!(
              debouncedFiltering && debouncedFiltering.trim().length >= 2
            );
            const advancedActive = hasNonServiceAdvancedFilters;

            // Ensure next fetch isn't skipped as duplicate
            lastFilterRef.current = null;

            if (searchActive || advancedActive) {
              // Proactively refetch with current filters to avoid any stale state from the add flow
              fetchData(
                page,
                pageSize,
                debouncedFiltering,
                selectedGroup,
                advancedFilterData
              ).catch(() => {
                // Ensure loading flags clear even if refetch throws
                setIsLoading(false);
                setIsAddedTodayLoading(false);
              });
              return;
            }

            // No search or advanced filters -> default back to Added/Updated Today
            if (!addedToday && !isAddedTodayLoading && !isLoading) {
              setIsAddedTodayLoading(true);
              setAddedToday(true);
              setPage(1);
            }
          }}
        />

        {/* Subscription Type Toggle - Only show for WMM and Admin roles */}
        {(hasRole("WMM") || hasRole("Admin")) && (
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => handleSubscriptionTypeChange("WMM")}
                className={`px-3 py-1.5 text-base font-medium rounded-md transition-all duration-200 ${
                  subscriptionType === "WMM"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-200"
                }`}
              >
                WMM
              </button>
              <button
                onClick={() => handleSubscriptionTypeChange("Promo")}
                className={`px-3 py-1.5 text-base font-medium rounded-md transition-all duration-200 ${
                  subscriptionType === "Promo"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-200"
                }`}
              >
                Promo
              </button>
              <button
                onClick={() => handleSubscriptionTypeChange("Complimentary")}
                className={`px-3 py-1.5 text-base font-medium rounded-md transition-all duration-200 ${
                  subscriptionType === "Complimentary"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-200"
                }`}
              >
                Complimentary
              </button>
            </div>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300">
              <Settings2 className="h-4 w-4 mr-2" />
              Client Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Mail className="h-4 w-4 mr-2" />
                Mailing Options
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onSelect={() => handleMailingAction("label")}>
                  <Mail className="h-4 w-4 mr-2" />
                  Print Mailing Label
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => handleMailingAction("document")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Print Documents
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleMailingAction("csv")}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export CSV
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onSelect={() => setShowCalendarModal(true)}>
              <Calendar className="h-4 w-4 mr-2" />
              Update Calendar Status
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setShowSpackModal(true)}>
              <Package className="h-4 w-4 mr-2" />
              Update Spack Status
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setShowRTSModal(true)}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Manage RTS
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Render modals */}
      <Mailing
        table={tableInstance}
        advancedFilterData={advancedFilterData}
        selectedGroup={selectedGroup}
        filtering={filtering}
        isOpen={showMailingModal}
        onClose={() => {
          setShowMailingModal(false);
          setMailingAction("label"); // Reset to default
        }}
        initialAction={mailingAction}
        subscriptionType={subscriptionType} // Add subscription type here
        activeFilters={getActiveFilters()}
      />

      <CalendarUpdate
        filtering={filtering}
        selectedGroup={selectedGroup}
        advancedFilterData={advancedFilterData}
        onUpdateSuccess={fetchData}
        page={page}
        pageSize={pageSize}
        debouncedFiltering={debouncedFiltering}
        table={tableInstance}
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        subscriptionType={subscriptionType} // Add this line
      />

      <SpackUpdate
        filtering={filtering}
        selectedGroup={selectedGroup}
        advancedFilterData={advancedFilterData}
        onUpdateSuccess={fetchData}
        page={page}
        pageSize={pageSize}
        debouncedFiltering={debouncedFiltering}
        table={tableInstance}
        isOpen={showSpackModal}
        onClose={() => setShowSpackModal(false)}
      />

      <RTSUpdate
        filtering={filtering}
        selectedGroup={selectedGroup}
        advancedFilterData={advancedFilterData}
        onUpdateSuccess={fetchData}
        page={page}
        pageSize={pageSize}
        debouncedFiltering={debouncedFiltering}
        table={tableInstance}
        isOpen={showRTSModal}
        onClose={() => setShowRTSModal(false)}
      />

      <div className="flex gap-4 mb-4">
        <div className="relative max-w-sm">
          <Input
            placeholder="Search by full name, company, ID, or payment ref (e.g., 'rodrigo remedios', 'MS 001234', or ref:MS 001234)"
            value={filtering}
            onChange={handleSearchChange}
            onFocus={handleSearchFocus}
            onMouseDown={handleSearchMouseDown}
            className="max-w-sm"
          />
          {isLoading && filtering && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          )}
          {filtering && filtering.trim().length === 1 && (
            <div className="absolute -bottom-6 left-0 text-xs text-gray-500">
              Type at least 2 characters to search
            </div>
          )}
        </div>
        <AdvancedFilter
          onApplyFilter={handleApplyFilter}
          groups={groups}
          selectedGroup={selectedGroup}
          subscriptionType={subscriptionType}
        />
        <Button
          onClick={handleAddedTodayClick}
          disabled={isAddedTodayLoading}
          className={`${
            addedToday
              ? "bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200"
              : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
          } transition-colors duration-200 font-medium ${
            isAddedTodayLoading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isAddedTodayLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
              Loading...
            </>
          ) : (
            "Added/Updated Today"
          )}
        </Button>
        <Button
          onClick={handleClearAllFilters}
          className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors duration-200 font-medium"
        >
          Clear All Filters
        </Button>

        {/* Add ColumnToggle component here */}
        <ColumnToggle
          columns={columns.filter((column) => column.id !== "select")}
          columnVisibility={columnVisibility}
          setColumnVisibility={setColumnVisibility}
          serviceFilters={advancedFilterData.services || []}
        />
        <Button
          onClick={handleScrollToggle}
          title={isScrolledToBottom ? "Scroll Table to Top" : "Scroll Table to Bottom"}
          className="bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors duration-200 font-medium flex items-center gap-1"
        >
          {isScrolledToBottom ? (
            <ArrowDown className="h-4 w-4 rotate-180" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )}
          <span>{isScrolledToBottom ? "Scroll Top" : "Scroll Bottom"}</span>
        </Button>
      </div>

      {/* Filter Status Display */}
      <div className="mb-2 p-1 bg-gray-50 rounded-md border border-gray-200 overflow-x-auto">
        <div className="flex items-center gap-4 min-w-min">
          <h3 className="text-base font-semibold text-gray-800 whitespace-nowrap">
            Active Filters:
          </h3>
          <div className="flex flex-wrap gap-3 items-center">
            {getActiveFilters().length > 0 ? (
              getActiveFilters().map((filter, index) => (
                <span
                  key={index}
                  className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium shadow-sm hover:bg-blue-200 transition-colors duration-200"
                >
                  {filter}
                </span>
              ))
            ) : (
              <span className="text-gray-500 text-base italic">
                No filters applied
              </span>
            )}
          </div>
        </div>
      </div>

      <DataTable
        ref={dataTableRef}
        columns={columns}
        data={clientData}
        fetchFunction={fetchData}
        initialPageSize={pageSize}
        initialPage={page}
        totalPages={totalPages}
        rowSelection={rowSelection}
        setRowSelection={setRowSelection}
        usePagination={true}
        useHoverCard={false}
        ViewComponent={View}
        stats={stats}
        userRole={determineUserRole}
        searchTerm={debouncedFiltering}
        handleRowClick={handleRowClick}
        setTableInstance={handleTableInstanceUpdate}
        advancedFilterData={advancedFilterData}
        selectedGroup={selectedGroup}
        columnVisibility={columnVisibility}
        setColumnVisibility={setColumnVisibility}
        isLoading={isLoading}
        addedToday={effectiveAddedToday}
      />
      {showViewModal && (
        <View
          rowData={selectedRow}
          onClose={handleViewClose}
          onDeleteSuccess={handleDeleteSuccess}
          onEditSuccess={handleEditSuccess}
        />
      )}

      {/* DataTable ref handles scrolling to bottom - no need for this element */}
    </div>
  );
};

AllClient.displayName = "AllClient";

export default AllClient;
