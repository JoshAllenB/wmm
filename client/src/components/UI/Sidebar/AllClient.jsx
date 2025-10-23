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
    // Prevent rapid clicking
    if (isAddedTodayLoading || isLoading) {
      return;
    }

    setIsAddedTodayLoading(true);
    setAddedToday((prev) => !prev);
    setPage(1); // Reset to first page when toggling filter

    // Add a safety timeout to prevent stuck loading state
    setTimeout(() => {
      if (isAddedTodayLoading) {
        console.warn('Added Today loading state stuck - resetting');
        setIsAddedTodayLoading(false);
      }
    }, 10000); // 10 second safety timeout

    // The data fetch will be triggered by the useEffect that watches currentFilterSnapshot
    // We don't need to call fetchData here as it will be handled automatically
  };

  const handleClearAllFilters = () => {
    setFiltering("");
    setAddedToday(false);

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
      subscriptionType, // Preserve the subscription type
    };

    // Create a snapshot of what the filter will be
    const filterSnapshot = JSON.stringify({
      services: roleBasedServices,
      page,
      filtering: "",
      group: selectedGroup,
      addedToday: false,
      subscriptionType, // Include subscription type in snapshot
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

  // Create a dependency value that will change when services changes
  const servicesDependency = Array.isArray(advancedFilterData.services)
    ? advancedFilterData.services.join(",")
    : "";

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
            console.warn('Request timeout - forcing loading state reset');
            setIsLoading(false);
            setIsAddedTodayLoading(false);
            toast({
              title: "Request Timeout",
              description: "The search request took too long. Please try again with different filters.",
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

        // If ANY search term is present (general filter OR fullName), do NOT restrict to just Promo/Comp/WMM services (search all)
        const hasAnySearchTerm = (filter && filter.trim().length > 0) || filtersToUse.fullName;
        if (hasAnySearchTerm) {
          // When searching, remove ALL restrictions: don't send services or subscriptionType filter at all
          delete filtersToUse.services;
          delete filtersToUse.subscriptionType;
        } else if (shouldUseRoleBasedServices && roleBasedServices.length > 0) {
          filtersToUse.services = roleBasedServices;
        }

        // IMPORTANT: Always ensure services is an array even if it's empty
        if (!Array.isArray(filtersToUse.services)) {
          filtersToUse.services = [];
        }

        // Add addedToday filter if enabled - always use state value
        if (addedToday) {
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
          // Explicitly remove adddate filter when addedToday is false
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

        // When Added Today filter is active, ensure Client ID is arranged newest to oldest
        const pageData = Array.isArray(response.data) ? response.data : [];
        const sortedPageData = addedToday
          ? [...pageData].sort((a, b) => {
              const aId = Number(a?.id);
              const bId = Number(b?.id);
              if (Number.isFinite(aId) && Number.isFinite(bId)) {
                return bId - aId;
              }
              // Fallback: string compare descending
              const aStr = String(a?.id ?? "");
              const bStr = String(b?.id ?? "");
              return bStr.localeCompare(aStr);
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
        if (error.message === "Request timeout" || error.code === 'ECONNABORTED') {
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
        } else if (error.code === 'ERR_NETWORK') {
          toast({
            title: "Network Error",
            description: "Unable to connect to server. Please check your connection.",
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
        console.error('Fetch data error in useEffect:', error);
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
      setClientData((prevData) =>
        prevData.filter((client) => client.id !== deletedId)
      );
      fetchClients((data) => setClientData(data), page, pageSize);
    },
    [page, pageSize]
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
  const handleEditSuccess = () => {
    // Prevent multiple refresh calls if already loading
    if (isLoading) {
      console.log('Edit success - skipping refresh, already loading');
      return;
    }
    
    // Clear search input and enable "Added Today" filter
    setFiltering(""); 
    setPage(1); // Reset to first page
    
    // Enable the "Added Today" filter if it's not already enabled
    if (!addedToday) {
      console.log('Edit success - activating Added Today filter');
      setAddedToday(true);
      setIsAddedTodayLoading(true);
      
      // Add a safety timeout to prevent stuck loading state
      setTimeout(() => {
        if (isAddedTodayLoading) {
          console.warn('Added Today loading state stuck after edit - resetting');
          setIsAddedTodayLoading(false);
        }
      }, 10000); // 10 second safety timeout
    } else {
      // If "Added Today" is already active, just refresh the data
      console.log('Edit success - Added Today already active, refreshing data');
      
      const safetyTimeoutId = setTimeout(() => {
        console.warn('Edit success refresh taking too long - resetting loading state');
        setIsLoading(false);
        setIsAddedTodayLoading(false);
      }, 10000);
      
      setTimeout(() => {
        if (!isLoading) {
          fetchData(page, pageSize, "", selectedGroup, advancedFilterData)
            .then(() => {
              clearTimeout(safetyTimeoutId);
            })
            .catch((error) => {
              console.error('Error refreshing data after edit success:', error);
              clearTimeout(safetyTimeoutId);
              setIsLoading(false);
              setIsAddedTodayLoading(false);
            });
        } else {
          clearTimeout(safetyTimeoutId);
        }
      }, 100);
    }
    
    // The useEffect watching currentFilterSnapshot will automatically trigger data fetch
    // when addedToday changes from false to true
  };

  // Update handleSearchChange function
  const handleSearchChange = (e) => {
    const value = e.target.value;

    // Only update if the value actually changed
    if (value !== filtering) {
      setFiltering(value);
      setPage(1);

      // Auto-disable Added Today filter when search is used
      if (value.trim() !== "" && addedToday) {
        setAddedToday(false);
      }
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

    // Auto-disable Added Today filter when advanced filter is applied
    // Check if any filter other than services (which are auto-populated) is set
    const hasNonServiceFilters = Object.entries(formattedFilterData).some(
      ([key, value]) => {
        if (key === "services") return false;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === "string") return value.trim() !== "";
        return !!value;
      }
    );

    if (hasNonServiceFilters) {
      setAddedToday(false);
    }

    // Create a snapshot of what the filter will be
    const filterSnapshot = JSON.stringify({
      services: services,
      page: 1, // Always reset to page 1 when applying filters
      filtering: debouncedFiltering,
      group: selectedGroup,
      addedToday: hasNonServiceFilters ? false : addedToday, // Update based on filtered status
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

    // Helper function to safely format dates
    const formatSafeDate = (dateStr) => {
      if (!dateStr) return "";

      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          // If invalid date, return the string as is
          return dateStr;
        }

        // Format as MM/DD/YYYY
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
      } catch (error) {
        console.error("Error formatting date:", error);
        return dateStr; // Return original string on error
      }
    };

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
    if (addedToday) filters.push("Added/Updated Today");

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

  // Ref for scrolling to bottom
  const bottomRef = useRef(null);

  const handleScrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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
          fetchClients={() => fetchClients(setClientData)}
          subscriptionType={subscriptionType}
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
          onClick={handleScrollToBottom}
          title="Go to Bottom"
          className="bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors duration-200 font-medium flex items-center gap-1"
        >
          <ArrowDown className="h-4 w-4" />
          <span>Go Bottom</span>
        </Button>
      </div>

      {/* Filter Status Display */}
      <div className="mb-2 p-1 bg-gray-50 rounded-md border border-gray-200">
        <div className="flex items-center gap-4">
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
      />
      {showViewModal && (
        <View
          rowData={selectedRow}
          onClose={handleViewClose}
          onDeleteSuccess={handleDeleteSuccess}
          onEditSuccess={handleEditSuccess}
        />
      )}

      {/* Reference element for scrolling to bottom */}
      <div ref={bottomRef} />
    </div>
  );
};

AllClient.displayName = "AllClient";

export default AllClient;
