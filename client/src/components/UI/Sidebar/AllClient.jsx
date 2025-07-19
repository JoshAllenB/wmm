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
import { ArrowDown, Calendar, Package, Mail, Settings2, FileText, FileSpreadsheet } from "lucide-react";
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
  const debouncedFiltering = useDebounce(filtering, 300);
  const [pageSize, setPageSize] = useState(20);
  const [rowSelection, setRowSelection] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [stats, setStats] = useState({
    clientCount: {
      total: 0,
      page: 0
    },
    metrics: []
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
    setAddedToday((prev) => !prev);
    setPage(1); // Reset to first page when toggling filter
    // Do NOT call fetchData here!
  };

  const handleClearAllFilters = () => {
    setFiltering("");
    setAddedToday(false);

    // Get role-based services
    const roleBasedServices = [];
    if (hasRole("WMM")) roleBasedServices.push("WMM");
    if (hasRole("FOM")) roleBasedServices.push("FOM");
    if (hasRole("HRG")) roleBasedServices.push("HRG");
    if (hasRole("CAL")) roleBasedServices.push("CAL");

    // Create new filter with just services and keep the selected group if there is one
    const newFilter = {
      services: roleBasedServices,
      group: selectedGroup || "",
    };

    // Create a snapshot of what the filter will be
    const filterSnapshot = JSON.stringify({
      services: roleBasedServices,
      page,
      filtering: "",
      group: selectedGroup,
      addedToday: false,
    });

    // Update last filter ref to prevent bounce
    lastFilterRef.current = filterSnapshot;

    // Update the filter state
    setAdvancedFilterData(newFilter);

    // Fetch with the role-based services
    fetchData(page, pageSize, "", selectedGroup, newFilter);
  };

  const [isLoading, setIsLoading] = useState(true);
  const initialLoadComplete = useRef(false);
  const lastFilterRef = useRef(null);

  // Create a dependency value that will change when services changes
  const servicesDependency = Array.isArray(advancedFilterData.services)
    ? advancedFilterData.services.join(",")
    : "";

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
        !filters.paymentRef
      ) {
        filters.fullName = searchValue;
        searchValue = ""; // Since we're treating the whole thing as a full name
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
      try {
        // Show loading state if it will take time
        if (Object.keys(advancedFilterData).length > 2) {
          setIsLoading(true);
        }

        // Clone the filter object to avoid mutations
        let filtersToUse = { ...advancedFilterData };

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

        // Use role-based services if no valid services provided
        if (shouldUseRoleBasedServices && roleBasedServices.length > 0) {
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
              // The database stores dates like "M/D/YYYY h:mm:ss AM/PM"
              // Passing a regex as a string since MongoDB will interpret it
              filtersToUse.adddate_regex = `^${month}\\/${day}\\/${year}`;
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

        const currentSubscriptionType = overrideSubscriptionType || subscriptionType;

        const response = await fetchClients(
          currentPage,
          currentPageSize,
          filter,
          group,
          filtersToUse,
          currentSubscriptionType
        );

        // Skip state updates if the request was cancelled (response is null)
        if (!response) {
          setIsLoading(false);
          return null;
        }

        setClientData(response.data);
        setTotalPages(response.totalPages || 0);
        setStats(response.stats || {
          clientCount: {
            total: response.totalClients || 0,
            page: response.data?.length || 0
          },
          metrics: []
        });

        // Always remove loading state when done
        setIsLoading(false);

        return response;
      } catch (error) {
        console.error("❌ Error fetching clients:", error);
        // Ensure loading state is cleared even on error
        setIsLoading(false);
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

    // Load groups first to have them available
    const loadGroups = async () => {
      try {
        const groupsData = await fetchGroups();
        setGroups(groupsData);
      } catch (error) {
        console.error("Error loading groups:", error);
      }
    };
    loadGroups();

    // Load users for filter display
    const loadUsers = async () => {
      try {
        const userData = await fetchUsers();
        if (userData && userData.users) {
          setUsers(userData.users);
        }
      } catch (error) {
        console.error("Error loading users:", error);
      }
    };
    loadUsers();

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
        initialFilter.adddate_regex = `^${month}\\/${day}\\/${year}`;
      }

      // Save as last filter to prevent bouncing
      lastFilterRef.current = JSON.stringify({
        services: roleBasedServices,
        page,
        filtering: debouncedFiltering,
        group: selectedGroup,
        addedToday,
      });

      // Set the filter state
      setAdvancedFilterData(initialFilter);
    }

    // Mark initial load as complete
    initialLoadComplete.current = true;

    // Continue to data loading after a short delay
    setTimeout(() => {
      setIsLoading(false);
    }, 100);
  }, [
    hasRole,
    advancedFilterData, // Since we're spreading this, we need it as a dependency
    page,
    debouncedFiltering,
    selectedGroup,
    addedToday,
  ]);

  // Main data loading effect (runs AFTER role-based services are set)
  useEffect(() => {
    // Skip this effect during initial load when services are being set up
    if (isLoading) {
      return;
    }

    // Create a snapshot of the current filter
    const currentFilter = JSON.stringify({
      services: advancedFilterData.services,
      page,
      filtering: debouncedFiltering,
      group: selectedGroup,
      addedToday,
    });

    // If this is the same as our last filter, skip to prevent bouncing
    if (lastFilterRef.current === currentFilter) {
      return;
    }

    // Update our last filter reference
    lastFilterRef.current = currentFilter;

    // Use a single fetch call with a slight delay to avoid race conditions
    const fetchTimer = setTimeout(() => {
      fetchData(
        page,
        pageSize,
        debouncedFiltering,
        selectedGroup,
        advancedFilterData
      );
    }, 50); // Small delay to debounce multiple sequential state updates

    // Clean up timeout if component unmounts or dependencies change
    return () => clearTimeout(fetchTimer);
  }, [
    page,
    pageSize,
    debouncedFiltering, // Already debounced so this won't cause rapid re-renders
    selectedGroup,
    fetchData,
    advancedFilterData,
    servicesDependency, // This is calculated from advancedFilterData.services
    addedToday,
    isLoading, // Only run when loading is complete
    subscriptionType, // Add subscription type to dependencies
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

  // Update handleSearchChange function
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setFiltering(value);
    setPage(1);

    // Auto-disable Added Today filter when search is used
    if (value.trim() !== "") {
      setAddedToday(false);
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

    // Directly fetch data with the new filter to avoid bouncing
    fetchData(
      1,
      pageSize,
      debouncedFiltering,
      selectedGroup,
      formattedFilterData
    );
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
    if (advancedFilterData.wmmActiveFromDate || advancedFilterData.wmmActiveToDate) {
      const fromDate = advancedFilterData.wmmActiveFromDate;
      const toDate = advancedFilterData.wmmActiveToDate;
      
      if (fromDate && toDate) {
        filters.push(`Active Subscriptions: ${formatDateWithMonthName(fromDate)} to ${formatDateWithMonthName(toDate)}`);
      } else if (fromDate) {
        filters.push(`Active Subscriptions From: ${formatDateWithMonthName(fromDate)}`);
      } else if (toDate) {
        filters.push(`Active Subscriptions To: ${formatDateWithMonthName(toDate)}`);
      }
    }

    // Handle Expiring Subscriptions From/To dates
    if (advancedFilterData.wmmExpiringFromDate || advancedFilterData.wmmExpiringToDate) {
      const fromDate = advancedFilterData.wmmExpiringFromDate;
      const toDate = advancedFilterData.wmmExpiringToDate;
      
      if (fromDate && toDate) {
        filters.push(`Expiring Subscriptions: ${formatDateWithMonthName(fromDate)} to ${formatDateWithMonthName(toDate)}`);
      } else if (fromDate) {
        filters.push(`Expiring Subscriptions From: ${formatDateWithMonthName(fromDate)}`);
      } else if (toDate) {
        filters.push(`Expiring Subscriptions To: ${formatDateWithMonthName(toDate)}`);
      }
    }

    if (advancedFilterData.type)
      filters.push(`Type: ${advancedFilterData.type}`);
    if (advancedFilterData.subsclass)
      filters.push(`Subclass: ${advancedFilterData.subsclass}`);

    // Properly handle areas filter
    if (
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
            .join(", ")}... (${
            advancedFilterData.includeClientIds.length
          } total)`
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
            .join(", ")}... (${
            advancedFilterData.excludeClientIds.length
          } total)`
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
  const [mailingAction, setMailingAction] = useState('label'); // 'label', 'document', or 'csv'

  const handleMailingAction = (action) => {
    setMailingAction(action);
    setShowMailingModal(true);
  };

  // Update handleSubscriptionTypeChange to also update services
  const handleSubscriptionTypeChange = (type) => {
    setSubscriptionType(type);
    setPage(1); // Reset to first page

    // Update services based on subscription type for WMM role
    if (hasRole("WMM")) {
      let newServices = [];
      switch (type) {
        case "Promo":
          newServices = ["PROMO"];
          break;
        case "Complimentary":
          newServices = ["COMP"];
          break;
        default: // WMM
          newServices = ["WMM"];
      }

      // Update advancedFilterData with new services
      setAdvancedFilterData(prev => ({
        ...prev,
        services: newServices,
        subscriptionType: type
      }));
    }

    // Create a snapshot of what the filter will be
    const filterSnapshot = JSON.stringify({
      services: advancedFilterData.services,
      page: 1,
      filtering: debouncedFiltering,
      group: selectedGroup,
      addedToday,
      subscriptionType: type,
    });
    // Update last filter ref to prevent bounce
    lastFilterRef.current = filterSnapshot;

    // Fetch data with updated subscription type
    const updatedAdvancedFilterData = {
      ...advancedFilterData,
      subscriptionType: type,
      services: hasRole("WMM") ? (type === "Promo" ? ["PROMO"] : type === "Complimentary" ? ["COMP"] : ["WMM"]) : advancedFilterData.services
    };

    fetchData(1, pageSize, debouncedFiltering, selectedGroup, updatedAdvancedFilterData, type);
  };

  return (
    <div className="mr-[10px] ml-[10px] mt-[10px]">
      <div className="flex justify-between items-center mb-4">
        <Add fetchClients={() => fetchClients(setClientData)} />
        
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
                <DropdownMenuItem onSelect={() => handleMailingAction('label')}>
                  <Mail className="h-4 w-4 mr-2" />
                  Print Mailing Label
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleMailingAction('document')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Print Documents
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleMailingAction('csv')}>
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
          setMailingAction('label'); // Reset to default
        }}
        initialAction={mailingAction}
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

      <div className="flex gap-4 mb-4">
        <Input
          placeholder="Search by name, company, ID, or payment ref (e.g., MS 001234 or ref:MS 001234)"
          value={filtering}
          onChange={handleSearchChange}
          className="max-w-sm"
        />
        <AdvancedFilter
          onApplyFilter={handleApplyFilter}
          groups={groups}
          selectedGroup={selectedGroup}
          subscriptionType={subscriptionType}
        />
        <Button
          onClick={handleAddedTodayClick}
          className={`${
            addedToday
              ? "bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200"
              : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
          } transition-colors duration-200 font-medium`}
        >
          Added/Updated Today
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
      />
      {showViewModal && (
        <View
          rowData={selectedRow}
          onClose={handleViewClose}
          onDeleteSuccess={handleDeleteSuccess}
        />
      )}

      {/* Reference element for scrolling to bottom */}
      <div ref={bottomRef} />
    </div>
  );
};

AllClient.displayName = "AllClient";

export default AllClient;
