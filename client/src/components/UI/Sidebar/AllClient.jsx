import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import DataTable from "../../Table/DataTable";
import Add from "../../CRUD/AllClient/add";
import Mailing from "../../mailing";
import { Input } from "../ShadCN/input";
import { fetchClients } from "../../Table/Data/clientdata";
import { fetchGroups } from "../../Table/Data/utilData";
import { useColumns } from "../../Table/Structure/clientColumn";
import View from "../../CRUD/AllClient/view";
import { useUser } from "../../../utils/Hooks/userProvider";
import useDebounce from "../../../utils/Hooks/useDebounce";
import FilterDropdown from "../../filterDropdown";
import { Button } from "../ShadCN/button";
import AdvancedFilter from "../../CRUD/advanceFilter";
import { ColumnToggle } from "../../Table/ColumnToggle";

const AllClient = () => {
  const [clientData, setClientData] = useState([]);
  const [filtering, setFiltering] = useState("");
  const debouncedFiltering = useDebounce(filtering, 300);
  const [pageSize, setPageSize] = useState(20);
  const [rowSelection, setRowSelection] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCopies, setTotalCopies] = useState(0);
  const [pageSpecificCopies, setPageSpecificCopies] = useState(0);
  const [totalCalQty, setTotalCalQty] = useState(0);
  const [totalCalAmt, setTotalCalAmt] = useState(0);
  const [pageSpecificCalQty, setPageSpecificCalQty] = useState(0);
  const [pageSpecificCalAmt, setPageSpecificCalAmt] = useState(0);
  const [totalHrgAmt, setTotalHrgAmt] = useState(0);
  const [totalFomAmt, setTotalFomAmt] = useState(0);
  const [totalCalPaymtAmt, setTotalCalPaymtAmt] = useState(0);
  const [pageSpecificHrgAmt, setPageSpecificHrgAmt] = useState(0);
  const [pageSpecificFomAmt, setPageSpecificFomAmt] = useState(0);
  const [pageSpecificCalPaymtAmt, setPageSpecificCalPaymtAmt] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const [pageSpecificClients, setPageSpecificClients] = useState(0);
  const columns = useColumns();
  const { hasRole } = useUser();
  const [addedToday, setAddedToday] = useState(true);
  const [columnVisibility, setColumnVisibility] = useState({});

  // State for selected row and modal visibility
  const [selectedRow, setSelectedRow] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");

  const [tableInstance, setTableInstance] = useState(null);

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
      const today = new Date();
      const month = today.getMonth() + 1;
      const day = today.getDate();
      const year = today.getFullYear();
      initialFilter.adddate_regex = `^${month}\\/${day}\\/${year}`;

      // Save as last filter to prevent bouncing
      lastFilterRef.current = JSON.stringify({
        services: roleBasedServices,
        page,
        filtering: debouncedFiltering,
        group: selectedGroup,
        addedToday: true,
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
    page,
    pageSize,
    debouncedFiltering,
    selectedGroup,
    addedToday,
    advancedFilterData,
  ]);

  // Add this function after handleTableInstanceUpdate
  const parseTaggedSearch = (searchValue) => {
    const filters = { search: "", clientId: "", paymentRef: "", fullName: "" };

    // Check for tagged search patterns
    const idMatch = searchValue.match(/\bid:\s*(\S+)/i);
    const refMatch = searchValue.match(/\bref:\s*([A-Z]{2}\s*\d{6}[\s\d\/]*)/i);
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
    const untaggedRefMatch = searchValue.match(/\b([A-Z]{2}\s*\d{6}[\s\d\/]*)\b/i);
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

  // Modified fetchData to handle tagged search and client counts
  const fetchData = useCallback(
    async (
      currentPage,
      currentPageSize,
      filter = "",
      group = "",
      advancedFilterData = {}
    ) => {
      try {
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
          // Convert to array if it's a string
          if (
            typeof filtersToUse.services === "string" &&
            filtersToUse.services.trim() !== ""
          ) {
            filtersToUse.services = filtersToUse.services
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            shouldUseRoleBasedServices = false;
          }
          // If it's an array and has items, keep it
          else if (
            Array.isArray(filtersToUse.services) &&
            filtersToUse.services.length > 0
          ) {
            shouldUseRoleBasedServices = false;
          }
        }

        // Use role-based services if no valid services provided
        if (shouldUseRoleBasedServices && roleBasedServices.length > 0) {
          filtersToUse.services = roleBasedServices;
        }

        // Add addedToday filter if enabled - always use state value
        if (addedToday) {
          const today = new Date();
          // Create date pattern to match the beginning of the string
          const month = today.getMonth() + 1;
          const day = today.getDate();
          const year = today.getFullYear();
          // We want to match the date part regardless of the time part
          // The database stores dates like "M/D/YYYY h:mm:ss AM/PM"
          // Passing a regex as a string since MongoDB will interpret it
          filtersToUse.adddate_regex = `^${month}\\/${day}\\/${year}`;
        } else {
          // Explicitly remove adddate filter when addedToday is false
          delete filtersToUse.adddate_regex;
        }

        const result = await fetchClients(
          currentPage,
          currentPageSize,
          filter,
          group,
          filtersToUse
        );

        setClientData(result.data);
        setTotalPages(result.totalPages || 0);
        setTotalCopies(result.totalCopies);
        setPageSpecificCopies(result.pageSpecificCopies);
        setTotalCalQty(result.totalCalQty);
        setTotalCalAmt(result.totalCalAmt);
        setPageSpecificCalQty(result.pageSpecificCalQty);
        setPageSpecificCalAmt(result.pageSpecificCalAmt);
        setTotalHrgAmt(result.totalHrgAmt || 0);
        setTotalFomAmt(result.totalFomAmt || 0);
        setTotalCalPaymtAmt(result.totalCalPaymtAmt || 0);
        setPageSpecificHrgAmt(result.pageSpecificHrgAmt || 0);
        setPageSpecificFomAmt(result.pageSpecificFomAmt || 0);
        setPageSpecificCalPaymtAmt(result.pageSpecificCalPaymtAmt || 0);
        
        // Try different property names for totalClients
        const totalClientsValue = result.totalClients || result.totalCount || result.total || 0;
        setTotalClients(totalClientsValue);
        
        // Use result.data.length as fallback for pageSpecificClients
        const pageClientsValue = result.pageSpecificClients || (result.data ? result.data.length : 0);
        setPageSpecificClients(pageClientsValue);
        
        return result;
      } catch (error) {
        console.error("❌ Error fetching clients:", error);
      }
    },
    [addedToday, hasRole]
  );

  // Main data loading effect (runs AFTER role-based services are set)
  useEffect(() => {
    // Skip this effect during initial load when services are being set up
    if (isLoading) {
      return;
    }

    const loadGroups = async () => {
      try {
        const groupsData = await fetchGroups();
        setGroups(groupsData);
      } catch (error) {
        console.error("Error loading groups:", error);
      }
    };

    loadGroups();

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


    fetchData(
      page,
      pageSize,
      debouncedFiltering,
      selectedGroup,
      advancedFilterData
    );
  }, [
    page,
    pageSize,
    debouncedFiltering,
    selectedGroup,
    fetchData,
    advancedFilterData,
    servicesDependency,
    addedToday,
    isLoading, // Only run when loading is complete
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
    if (value.trim() !== '') {
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
          areas = filterData.areas.split(",").map(a => a.trim());
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
      areas: areas
    };

    // Auto-disable Added Today filter when advanced filter is applied
    // Check if any filter other than services (which are auto-populated) is set
    const hasNonServiceFilters = Object.entries(formattedFilterData).some(([key, value]) => {
      if (key === 'services') return false;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim() !== '';
      return !!value;
    });

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
    if (advancedFilterData.startDate && advancedFilterData.endDate)
      filters.push(
        `Date Range: ${advancedFilterData.startDate} to ${advancedFilterData.endDate}`
      );
    else if (advancedFilterData.startDate)
      filters.push(`From: ${advancedFilterData.startDate}`);
    else if (advancedFilterData.endDate)
      filters.push(`Until: ${advancedFilterData.endDate}`);

    // Fix for Active Subscriptions month display
    if (advancedFilterData.wmmActiveMonth) {
      // Use the original month selection directly instead of derived dates
      const [year, month] = advancedFilterData.wmmActiveMonth.split("-");
      const date = new Date(year, parseInt(month) - 1);
      const monthName = date.toLocaleString("default", { month: "long" });
      filters.push(`Active Subscriptions: ${monthName} ${year}`);
    } else if (
      advancedFilterData.wmmStartSubsDate &&
      advancedFilterData.wmmEndSubsDate
    ) {
      // Fallback to using the start/end dates if wmmActiveMonth isn't available
      const date = new Date(advancedFilterData.wmmStartSubsDate);
      const monthName = date.toLocaleString("default", { month: "long" });
      const year = date.getFullYear();
      filters.push(`Active Subscriptions: ${monthName} ${year}`);
    }

    // Fix for Expiring Subscriptions month display
    if (advancedFilterData.wmmExpiringMonth) {
      // Use the original month selection directly
      const [year, month] = advancedFilterData.wmmExpiringMonth.split("-");
      const date = new Date(year, parseInt(month) - 1);
      const monthName = date.toLocaleString("default", { month: "long" });
      filters.push(`Expiring Subscriptions: ${monthName} ${year}`);
    } else if (
      advancedFilterData.wmmStartEndDate &&
      advancedFilterData.wmmEndEndDate
    ) {
      // Fallback
      const date = new Date(advancedFilterData.wmmStartEndDate);
      const monthName = date.toLocaleString("default", { month: "long" });
      const year = date.getFullYear();
      filters.push(`Expiring Subscriptions: ${monthName} ${year}`);
    }

    if (advancedFilterData.type)
      filters.push(`Type: ${advancedFilterData.type}`);
    if (advancedFilterData.subsclass)
      filters.push(`Subclass: ${advancedFilterData.subsclass}`);
      
    // Properly handle areas filter
    if (advancedFilterData.areas && Array.isArray(advancedFilterData.areas) && advancedFilterData.areas.length > 0) {
      if (advancedFilterData.areas.length <= 3) {
        // Show specific areas if there are only a few
        filters.push(`Areas: ${advancedFilterData.areas.join(', ')}`);
      } else {
        // Show count if there are many
        filters.push(`Areas: ${advancedFilterData.areas.length} selected`);
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
    if (advancedFilterData.includeClientIds && advancedFilterData.includeClientIds.length > 0) {
      filters.push(`Include Clients: ${advancedFilterData.includeClientIds.length} client(s)`);
    }
    
    if (advancedFilterData.excludeClientIds && advancedFilterData.excludeClientIds.length > 0) {
      filters.push(`Exclude Clients: ${advancedFilterData.excludeClientIds.length} client(s)`);
    }
    
    // Add exclude SPack clients filter
    if (advancedFilterData.excludeSPackClients) {
      filters.push("Exclude SPack Clients");
    }
    
    // Add subscription status filter
    if (advancedFilterData.subscriptionStatus && advancedFilterData.subscriptionStatus !== "all") {
      const statusMap = {
        active: "Active Only",
        unsubscribed: "Unsubscribed Only"
      };
      filters.push(`Subscription Status: ${statusMap[advancedFilterData.subscriptionStatus] || advancedFilterData.subscriptionStatus}`);
    }
    
    // Add user filter
    if (advancedFilterData.userId) {
      filters.push(`User: ${advancedFilterData.userId}`);
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

  return (
    <div className="mr-[10px] ml-[10px]">
      <div className="flex gap-2">
        <Add fetchClients={() => fetchClients(setClientData)} />
        <Mailing table={tableInstance} />
      </div>
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
        />
        <Button
          onClick={handleAddedTodayClick}
          className={`${
            addedToday ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800"
          }`}
        >
          Added/Updated Today
        </Button>
        <Button onClick={handleClearAllFilters}>Clear All Filters</Button>

        {/* Add ColumnToggle component here */}
        <ColumnToggle
          columns={columns.filter((column) => column.id !== "select")}
          columnVisibility={columnVisibility}
          setColumnVisibility={setColumnVisibility}
          serviceFilters={advancedFilterData.services || []}
        />
      </div>

      {/* Filter Status Display */}
      <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-1">
          Active Filters:
        </h3>
        <div className="flex flex-wrap gap-2">
          {getActiveFilters().length > 0 ? (
            getActiveFilters().map((filter, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
              >
                {filter}
              </span>
            ))
          ) : (
            <span className="text-gray-500 text-sm italic">
              No filters applied
            </span>
          )}
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
        totalCopies={totalCopies}
        pageSpecificCopies={pageSpecificCopies}
        totalCalQty={totalCalQty}
        totalCalAmt={totalCalAmt}
        pageSpecificCalQty={pageSpecificCalQty}
        pageSpecificCalAmt={pageSpecificCalAmt}
        totalHrgAmt={totalHrgAmt}
        totalFomAmt={totalFomAmt}
        totalCalPaymtAmt={totalCalPaymtAmt}
        pageSpecificHrgAmt={pageSpecificHrgAmt}
        pageSpecificFomAmt={pageSpecificFomAmt}
        pageSpecificCalPaymtAmt={pageSpecificCalPaymtAmt}
        totalClients={totalClients}
        pageSpecificClients={pageSpecificClients}
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
    </div>
  );
};

AllClient.displayName = "AllClient";

export default AllClient;
