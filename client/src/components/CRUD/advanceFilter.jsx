import { useState, useEffect } from "react";
import { Button } from "../UI/ShadCN/button";
import Modal from "../modal";
import InputField from "../CRUD/input";
import {
  fetchSubclasses,
  fetchAreas,
  fetchTypes,
  fetchUsers,
} from "../Table/Data/utilData";
import { useUser } from "../../utils/Hooks/userProvider";

// Utility function to format date to "MM/DD/YY"
const formatDateToMMDDYY = (date) => {
  if (!date) return "";

  let d;
  try {
    d = new Date(date);
    if (isNaN(d.getTime())) {
      return date; // Return original if not valid date
    }
  } catch (error) {
    return date; // Return original if parsing fails
  }

  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear().toString().slice(-2);
  return `${month}/${day}/${year}`;
};

// Parse date from MM/DD/YY format
const parseDate = (dateString) => {
  if (!dateString) return null;

  // Try to handle various date formats
  let date;

  // Check if it's MM/DD/YY format
  if (typeof dateString === "string" && dateString.includes("/")) {
    const parts = dateString.split("/");
    if (parts.length === 3) {
      const month = parseInt(parts[0]) - 1;
      const day = parseInt(parts[1]);
      let year = parseInt(parts[2]);
      // Adjust two-digit year
      if (year < 100) {
        year = year < 50 ? 2000 + year : 1900 + year;
      }
      date = new Date(year, month, day);
      // Set time to midnight
      date.setHours(0, 0, 0, 0);
      return date;
    }
  }

  // Otherwise use the standard date constructor
  date = new Date(dateString);
  // Set time to midnight
  date.setHours(0, 0, 0, 0);

  return date;
};

// Format date to ISO format for backend (YYYY-MM-DD)
const formatDateToISO = (date) => {
  if (!date) return "";
  const d = parseDate(date);
  if (!d) return "";

  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
};

const AdvancedFilter = ({ onApplyFilter, groups, selectedGroup }) => {
  const { hasRole, user } = useUser();
  const [showModal, setShowModal] = useState(false);

  // Add months array for dropdown selection
  const months = [
    { value: "01", name: "January" },
    { value: "02", name: "February" },
    { value: "03", name: "March" },
    { value: "04", name: "April" },
    { value: "05", name: "May" },
    { value: "06", name: "June" },
    { value: "07", name: "July" },
    { value: "08", name: "August" },
    { value: "09", name: "September" },
    { value: "10", name: "October" },
    { value: "11", name: "November" },
    { value: "12", name: "December" },
  ];

  // Add a helper function to check if user has only HRG, FOM, or CAL roles but not WMM
  const hasOnlyNonWMMRoles = () => {
    return (
      (hasRole("HRG") || hasRole("FOM") || hasRole("CAL")) && !hasRole("WMM")
    );
  };

  const [filterData, setFilterData] = useState({
    lname: "",
    fname: "",
    mname: "",
    sname: "",
    birthdate: "",
    contactnos: "",
    cellno: "",
    ofcno: "",
    email: "",
    address: "",
    // Date range fields with separate Month/Day/Year
    startDateMonth: "",
    startDateDay: "",
    startDateYear: "",
    endDateMonth: "",
    endDateDay: "",
    endDateYear: "",
    // Active subscription date components
    wmmActiveMonth: "",
    wmmActiveDay: "",
    wmmActiveYear: "",
    // Expiring subscription date components
    wmmExpiringMonth: "",
    wmmExpiringDay: "",
    wmmExpiringYear: "",
    copiesRange: "",
    minCopies: "",
    maxCopies: "",
    group: selectedGroup || "",
    type: "",
    subsclass: "",
    areas: [],
    acode: "",
    services: [],
    clientIncludeIds: "",
    clientExcludeIds: "",
    clientIdFilterType: "include",
    excludeSPackClients: false,
    userId: "",
    subscriptionStatus: "all",
  });

  const [subclasses, setSubclasses] = useState([]);
  const [areas, setAreas] = useState([]);
  const [types, setTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Load subclasses, areas, and types on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [subclassesData, areasData, typesData, usersData] =
          await Promise.all([
            fetchSubclasses(),
            fetchAreas(),
            fetchTypes(),
            fetchUsers(),
          ]);
        setSubclasses(subclassesData);
        setAreas(areasData);
        setTypes(typesData);

        // Check if users exist in the response and set them properly
        const receivedUsers = usersData?.users || [];

        setUsers(receivedUsers);

        // Set current user from API response
        if (usersData?.currentUser) {
          setCurrentUser(usersData.currentUser);
        }
      } catch (error) {
        console.error("Error loading filter data:", error);
      }
    };
    loadData();
  }, []);

  // Auto-set services based on user roles
  useEffect(() => {
    // Only set services if the filter is empty to avoid overriding user selections
    if (filterData.services.length === 0) {
      const roleBasedServices = [];

      // Check each role and add corresponding service
      if (hasRole("WMM")) roleBasedServices.push("WMM");
      if (hasRole("FOM")) roleBasedServices.push("FOM");
      if (hasRole("HRG")) roleBasedServices.push("HRG");
      if (hasRole("CAL")) roleBasedServices.push("CAL");

      // Only update if we found matching roles
      if (roleBasedServices.length > 0) {
        setFilterData((prev) => ({
          ...prev,
          services: roleBasedServices,
        }));
      }
    }
  }, [hasRole]);

  const openModal = () => {
    // Reset the filter form when opening the modal
    resetFilterData();
    setShowModal(true);
  };

  // Reset filter fields when closing modal
  const closeModal = () => {
    setShowModal(false);
    // Don't reset here as the filter has already been applied
  };

  // Initialize/reset filter data
  const resetFilterData = () => {
    // Get current date parts for any initial values if needed
    const today = new Date();
    const currentMonth = (today.getMonth() + 1).toString();
    const currentDay = today.getDate().toString();
    const currentYear = today.getFullYear().toString();

    setFilterData({
      lname: "",
      fname: "",
      mname: "",
      sname: "",
      birthdate: "",
      contactnos: "",
      cellno: "",
      ofcno: "",
      email: "",
      address: "",
      // Date range components
      startDateMonth: "",
      startDateDay: "",
      startDateYear: "",
      endDateMonth: "",
      endDateDay: "",
      endDateYear: "",
      // Active subscription date components
      wmmActiveMonth: "",
      wmmActiveDay: "",
      wmmActiveYear: "",
      // Expiring subscription date components
      wmmExpiringMonth: "",
      wmmExpiringDay: "",
      wmmExpiringYear: "",
      copiesRange: "",
      minCopies: "",
      maxCopies: "",
      group: selectedGroup || "",
      type: "",
      subsclass: "",
      areas: [],
      acode: "",
      services: [],
      clientIncludeIds: "",
      clientExcludeIds: "",
      clientIdFilterType: "include",
      excludeSPackClients: false,
      userId: "",
      subscriptionStatus: "all",
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Handle date components separately
    const dateComponentFields = [
      "startDateMonth",
      "startDateDay",
      "startDateYear",
      "endDateMonth",
      "endDateDay",
      "endDateYear",
      "wmmActiveMonth",
      "wmmActiveDay",
      "wmmActiveYear",
      "wmmExpiringMonth",
      "wmmExpiringDay",
      "wmmExpiringYear",
    ];

    if (dateComponentFields.includes(name)) {
      // Allow only numbers for day and year fields
      if ((name.endsWith("Day") || name.endsWith("Year")) && value !== "") {
        if (!/^\d+$/.test(value)) {
          return; // Skip update if not a number
        }
      }

      // For day fields, limit to 1-31
      if (name.endsWith("Day") && value !== "") {
        const day = parseInt(value);
        if (day < 1 || day > 31) {
          return; // Skip update if outside valid range
        }
      }

      // For year fields, limit length
      if (name.endsWith("Year") && value.length > 4) {
        return; // Skip update if year is too long
      }

      setFilterData((prev) => ({
        ...prev,
        [name]: value,
      }));
    } else {
      // Regular input handling for non-date fields
      setFilterData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // New handler for area checkbox changes
  const handleAreaChange = (areaId) => {
    setFilterData((prev) => {
      const areas = [...prev.areas];
      const areaIndex = areas.indexOf(areaId);

      if (areaIndex === -1) {
        areas.push(areaId);
      } else {
        areas.splice(areaIndex, 1);
      }

      return { ...prev, areas, exactAreaMatch: true };
    });
  };

  const handleServiceChange = (service) => {
    setFilterData((prev) => {
      const services = [...prev.services];
      const serviceIndex = services.indexOf(service);

      if (serviceIndex === -1) {
        services.push(service);
      } else {
        services.splice(serviceIndex, 1);
      }

      return { ...prev, services };
    });
  };

  // Handle client ID filter type change
  const handleClientIdFilterTypeChange = (type) => {
    setFilterData((prev) => ({
      ...prev,
      clientIdFilterType: type,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Format month-based filters from separate components
    const formatMonthRangeFromComponents = (month, day, year) => {
      if (!month || !day || !year) return { start: "", end: "" };

      // Create date from components
      const date = getDateFromComponents(month, day, year);

      if (!date || isNaN(date.getTime())) {
        return { start: "", end: "" };
      }

      // Get first day of the month
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      // Get last day of the month
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      // Format dates as YYYY-MM-DD for backend
      return {
        start: formatDateComponentsToISO(
          start.getMonth() + 1,
          start.getDate(),
          start.getFullYear()
        ),
        end: formatDateComponentsToISO(
          end.getMonth() + 1,
          end.getDate(),
          end.getFullYear()
        ),
      };
    };

    // Process services for exact matching (always use exact matching now)
    const processExactServices = (services) => {
      if (!services || !services.length) return services || [];

      // Make sure we're working with an array
      let serviceArray = services;
      if (!Array.isArray(serviceArray)) {
        serviceArray =
          typeof serviceArray === "string"
            ? serviceArray.split(",").map((s) => s.trim())
            : [];
      }

      // Ensure service names are properly cased
      serviceArray = serviceArray.map((service) => {
        // Normalize service names to uppercase
        const normalizedService = String(service).toUpperCase();
        // Make sure it's one of our valid service types
        if (["WMM", "HRG", "FOM", "CAL"].includes(normalizedService)) {
          return normalizedService;
        }
        // If not valid, return original
        return service;
      });

      // When using exact match, we're looking for clients with ONLY these services
      // WMM is ignored in this comparison (it can be present or not)
      const coreServices = serviceArray.filter((service) => service !== "WMM");

      return coreServices;
    };

    // Get the date ranges from components
    const activeMonthRange = formatMonthRangeFromComponents(
      filterData.wmmActiveMonth,
      filterData.wmmActiveDay,
      filterData.wmmActiveYear
    );

    const expiringMonthRange = formatMonthRangeFromComponents(
      filterData.wmmExpiringMonth,
      filterData.wmmExpiringDay,
      filterData.wmmExpiringYear
    );

    // Process client IDs for inclusion/exclusion
    const processClientIds = (idsString) => {
      if (!idsString.trim()) return [];

      // Split by commas, newlines, or spaces and filter out empty entries
      return idsString
        .split(/[\s,]+/)
        .map((id) => id.trim())
        .filter((id) => id !== "" && !isNaN(parseInt(id)))
        .map((id) => parseInt(id));
    };

    // Trim text fields and format data
    const formattedData = {
      ...filterData,
      fname: filterData.fname.trim(),
      lname: filterData.lname.trim(),
      mname: filterData.mname.trim(),
      sname: filterData.sname.trim(),
      // Format start/end dates for general date range
      startDate: formatDateComponentsToISO(
        filterData.startDateMonth,
        filterData.startDateDay,
        filterData.startDateYear
      ),
      endDate: formatDateComponentsToISO(
        filterData.endDateMonth,
        filterData.endDateDay,
        filterData.endDateYear
      ),
      // Subscription dates
      wmmStartSubsDate: activeMonthRange.start,
      wmmEndSubsDate: activeMonthRange.end,
      wmmStartEndDate: expiringMonthRange.start,
      wmmEndEndDate: expiringMonthRange.end,
      includeClientIds: processClientIds(filterData.clientIncludeIds),
      excludeClientIds: processClientIds(filterData.clientExcludeIds),
      exactServiceMatch: true, // Always use exact service matching
      serviceMatchExcludeWMM: true, // Always ignore WMM in exact service matching
      // Process services for exact matching (always exact now)
      exactServices: processExactServices(filterData.services),
      excludeSPackClients: filterData.excludeSPackClients,
      userId: filterData.userId || "", // Include userId in formatted data
      subscriptionStatus: filterData.subscriptionStatus || "all", // Include subscription status
      exactAreaMatch: true, // Always use exact area matching
    };

    // Debug log formatted date values
    console.log("Date values being sent to backend:", {
      startDate: formattedData.startDate,
      endDate: formattedData.endDate,
      wmmStartSubsDate: formattedData.wmmStartSubsDate,
      wmmEndSubsDate: formattedData.wmmEndSubsDate,
      wmmStartEndDate: formattedData.wmmStartEndDate,
      wmmEndEndDate: formattedData.wmmEndEndDate,
    });

    // Apply the filter with the formatted data
    onApplyFilter(formattedData);

    // Just close the modal - data will be reset when reopened
    setShowModal(false);
  };

  const clearAllFilters = () => {
    // Use resetFilterData for consistency
    resetFilterData();
  };

  const getFilterButtonText = () => {
    if (hasRole("WMM")) {
      return filterData.group ? `Group: ${filterData.group}` : "Filter Group";
    }
    return "Filter Group";
  };

  // Function to count active filters
  const countActiveFilters = () => {
    let count = 0;

    // Count standard field filters
    Object.entries(filterData).forEach(([key, value]) => {
      // Skip group if it's the selected group from props
      if (key === "group" && value === selectedGroup) return;

      // Count arrays (like areas) if they're not empty
      if (Array.isArray(value)) {
        if (value.length > 0) count++;
        return;
      }

      // Count strings if they're not empty
      if (typeof value === "string") {
        if (value.trim() !== "") count++;
        return;
      }

      // Count booleans that are true
      if (typeof value === "boolean") {
        if (value === true) count++;
        return;
      }

      // Count any other truthy values
      if (value) count++;
    });

    // Special case for custom copies range
    if (filterData.copiesRange === "custom") {
      // Don't double count - we already counted copiesRange
      // But we might need to adjust if min/max copies are set
      if (!filterData.minCopies && !filterData.maxCopies) {
        // If neither is set, reduce count since an empty custom range isn't useful
        count--;
      }
    }

    return count;
  };

  // Helper to get month name
  const getMonthName = (monthNumber) => {
    const monthIndex = parseInt(monthNumber) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return months[monthIndex].name;
    }
    return monthNumber;
  };

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

      // Get month name from the months array
      const monthIndex = date.getMonth();
      const monthName = months[monthIndex].name;

      // Format as "Month Day, Year"
      const day = date.getDate();
      const year = date.getFullYear();
      return `${monthName} ${day}, ${year}`;
    } catch (error) {
      console.error("Error formatting date with month name:", error);
      return dateStr; // Return original string on error
    }
  };

  // Get active filters for display
  const getActiveFilters = () => {
    // Define field mappings with their display labels
    const fieldMappings = {
      fname: "First Name",
      lname: "Last Name",
      mname: "Middle Name",
      sname: "Suffix",
      email: "Email",
      cellno: "Cell Number",
      ofcno: "Office Number",
      contactnos: "Other Contact",
      address: "Address",
      group: "Group",
      type: "Type",
      subsclass: "Subclass",
      areas: "Areas",
    };

    // Special case formatters
    const formatters = {
      address: (value) =>
        value.length > 20 ? `${value.substring(0, 20)}...` : value,
      type: (value) => types.find((t) => t.id === value)?.name || value,
      subsclass: (value) =>
        subclasses.find((s) => s.id === value)?.name || value,
    };

    // Handle date range as a special case
    const active = [];

    // Helper to format date from components
    const formatDateDisplay = (month, day, year) => {
      if (!month && !day && !year) return "";

      let displayParts = [];

      if (month) {
        displayParts.push(getMonthName(month));
      }

      if (day) {
        displayParts.push(day);
      }

      if (year) {
        // Format year based on length
        const yearDisplay =
          year.length <= 2 ? `20${year.padStart(2, "0")}` : year;
        displayParts.push(yearDisplay);
      }

      return displayParts.join(" ");
    };

    // Handle date range as a special case
    if (
      (filterData.startDateMonth ||
        filterData.startDateDay ||
        filterData.startDateYear) &&
      (filterData.endDateMonth ||
        filterData.endDateDay ||
        filterData.endDateYear)
    ) {
      const startDisplay = formatDateDisplay(
        filterData.startDateMonth,
        filterData.startDateDay,
        filterData.startDateYear
      );

      const endDisplay = formatDateDisplay(
        filterData.endDateMonth,
        filterData.endDateDay,
        filterData.endDateYear
      );

      if (startDisplay && endDisplay) {
        active.push({
          label: "Date Range",
          value: `${startDisplay} to ${endDisplay}`,
          key: "dateRange",
        });
      }
    } else if (
      filterData.startDateMonth ||
      filterData.startDateDay ||
      filterData.startDateYear
    ) {
      const startDisplay = formatDateDisplay(
        filterData.startDateMonth,
        filterData.startDateDay,
        filterData.startDateYear
      );

      if (startDisplay) {
        active.push({
          label: "From Date",
          value: startDisplay,
          key: "startDate",
        });
      }
    } else if (
      filterData.endDateMonth ||
      filterData.endDateDay ||
      filterData.endDateYear
    ) {
      const endDisplay = formatDateDisplay(
        filterData.endDateMonth,
        filterData.endDateDay,
        filterData.endDateYear
      );

      if (endDisplay) {
        active.push({
          label: "To Date",
          value: endDisplay,
          key: "endDate",
        });
      }
    }

    // Handle active month as a special case
    if (
      filterData.wmmActiveMonth ||
      filterData.wmmActiveDay ||
      filterData.wmmActiveYear
    ) {
      // Check if we have all required components
      if (filterData.wmmActiveMonth) {
        const monthName = getMonthName(filterData.wmmActiveMonth);
        const year =
          filterData.wmmActiveYear || new Date().getFullYear().toString();
        const day = filterData.wmmActiveDay || "";

        let displayValue = `${monthName} ${year}`;
        if (day) {
          displayValue = `${monthName} ${day}, ${year}`;
        }

        active.push({
          label: "Active Month",
          value: displayValue,
          key: "wmmActiveMonth",
        });
      } else {
        const activeDisplay = formatDateDisplay(
          filterData.wmmActiveMonth,
          filterData.wmmActiveDay,
          filterData.wmmActiveYear
        );

        if (activeDisplay) {
          active.push({
            label: "Active Month",
            value: activeDisplay,
            key: "wmmActiveMonth",
          });
        }
      }
    }

    // Handle expiring month as a special case
    if (
      filterData.wmmExpiringMonth ||
      filterData.wmmExpiringDay ||
      filterData.wmmExpiringYear
    ) {
      // Check if we have all required components
      if (filterData.wmmExpiringMonth) {
        const monthName = getMonthName(filterData.wmmExpiringMonth);
        const year =
          filterData.wmmExpiringYear || new Date().getFullYear().toString();
        const day = filterData.wmmExpiringDay || "";

        let displayValue = `${monthName} ${year}`;
        if (day) {
          displayValue = `${monthName} ${day}, ${year}`;
        }

        active.push({
          label: "Expiring Month",
          value: displayValue,
          key: "wmmExpiringMonth",
        });
      } else {
        const expiringDisplay = formatDateDisplay(
          filterData.wmmExpiringMonth,
          filterData.wmmExpiringDay,
          filterData.wmmExpiringYear
        );

        if (expiringDisplay) {
          active.push({
            label: "Expiring Month",
            value: expiringDisplay,
            key: "wmmExpiringMonth",
          });
        }
      }
    }

    // Handle copies range as a special case
    if (filterData.copiesRange) {
      const rangeMap = {
        1: "1",
        2: "2",
        gt1: "More than 1",
        custom: `${filterData.minCopies || "0"} to ${
          filterData.maxCopies || "∞"
        }`,
      };

      active.push({
        label: "Copies",
        value: rangeMap[filterData.copiesRange] || filterData.copiesRange,
        key: "copiesRange",
      });
    }

    // Handle services as a special case
    if (filterData.services.length > 0) {
      active.push({
        label: "Services",
        value: filterData.services.join(", "),
        key: "services",
      });
    }

    // Handle client ID filters as a special case
    if (
      filterData.clientIdFilterType === "include" &&
      filterData.clientIncludeIds.trim()
    ) {
      const idsList = filterData.clientIncludeIds
        .split(/[\s,]+/)
        .filter((id) => id.trim() !== "");

      let displayValue;
      if (idsList.length <= 5) {
        displayValue = idsList.join(", ");
      } else {
        displayValue = `${idsList.slice(0, 5).join(", ")}... (${
          idsList.length
        } total)`;
      }

      active.push({
        label: "Include Clients",
        value: displayValue,
        key: "clientIncludeIds",
      });
    }

    if (
      filterData.clientIdFilterType === "exclude" &&
      filterData.clientExcludeIds.trim()
    ) {
      const idsList = filterData.clientExcludeIds
        .split(/[\s,]+/)
        .filter((id) => id.trim() !== "");

      let displayValue;
      if (idsList.length <= 5) {
        displayValue = idsList.join(", ");
      } else {
        displayValue = `${idsList.slice(0, 5).join(", ")}... (${
          idsList.length
        } total)`;
      }

      active.push({
        label: "Exclude Clients",
        value: displayValue,
        key: "clientExcludeIds",
      });
    }

    // Add "Exclude SPack Clients" filter if active
    if (filterData.excludeSPackClients) {
      active.push({
        label: "Exclude SPack",
        value: "Yes",
        key: "excludeSPackClients",
      });
    }

    // Add subscription status filter if not set to "all"
    if (
      filterData.subscriptionStatus &&
      filterData.subscriptionStatus !== "all"
    ) {
      const statusDisplayMap = {
        active: "Active Only",
        unsubscribed: "Unsubscribed Only",
      };

      active.push({
        label: "Subscription Status",
        value:
          statusDisplayMap[filterData.subscriptionStatus] ||
          filterData.subscriptionStatus,
        key: "subscriptionStatus",
      });
    }

    // Add User filter as a special case
    if (filterData.userId) {
      let userLabel = "Unknown User";

      // Check if it's the current user
      if (user && filterData.userId === user._id) {
        userLabel = `Me (${user.username})`;
      } else {
        // Find the user in the users list
        const selectedUser = users.find((u) => u._id === filterData.userId);
        if (selectedUser) {
          userLabel = selectedUser.username;
        }
      }

      active.push({
        label: "User",
        value: userLabel,
        key: "userId",
      });
    }

    // Add Areas as a special case - making sure this works properly
    if (filterData.areas && filterData.areas.length > 0) {
      // Create area labels by finding area names in the areas array
      const areaLabels = filterData.areas.map((areaId) => {
        const area = areas.find((a) => a._id === areaId);
        return area ? area._id : areaId;
      });

      // Show all area names, or first few with ellipsis if there are many
      let displayValue = "";
      if (areaLabels.length <= 3) {
        displayValue = areaLabels.join(", ");
      } else {
        displayValue = `${areaLabels.slice(0, 3).join(", ")}... (${
          areaLabels.length
        } total)`;
      }

      active.push({
        label: "Areas",
        value: displayValue,
        key: "areas",
      });
    }

    // Process all other standard fields
    Object.entries(fieldMappings).forEach(([key, label]) => {
      // Skip areas since we handled it as a special case
      if (key === "areas") return;

      // Skip birthdate too as it's handled separately
      if (key === "birthdate") return;

      const value = filterData[key];

      // Skip empty values, group if it matches selectedGroup, and already handled special cases
      if (
        !value ||
        (key === "group" && value === selectedGroup) ||
        key === "startDate" ||
        key === "endDate" ||
        (Array.isArray(value) && value.length === 0)
      ) {
        return;
      }

      // Format the value if a formatter exists, otherwise use the raw value
      const displayValue = formatters[key] ? formatters[key](value) : value;

      active.push({ label, value: displayValue, key });
    });

    // Add birthdate separately with proper formatting
    if (filterData.birthdate) {
      active.push({
        label: "Birth Date",
        value: formatDateWithMonthName(filterData.birthdate),
        key: "birthdate",
      });
    }

    return active;
  };

  // Remove a specific filter
  const removeFilter = (key) => {
    setFilterData((prev) => {
      const updates = {};

      // Handle special cases
      switch (key) {
        case "dateRange":
          updates.startDateMonth = "";
          updates.startDateDay = "";
          updates.startDateYear = "";
          updates.endDateMonth = "";
          updates.endDateDay = "";
          updates.endDateYear = "";
          break;
        case "startDate":
          updates.startDateMonth = "";
          updates.startDateDay = "";
          updates.startDateYear = "";
          break;
        case "endDate":
          updates.endDateMonth = "";
          updates.endDateDay = "";
          updates.endDateYear = "";
          break;
        case "wmmActiveMonth":
          updates.wmmActiveMonth = "";
          updates.wmmActiveDay = "";
          updates.wmmActiveYear = "";
          break;
        case "wmmExpiringMonth":
          updates.wmmExpiringMonth = "";
          updates.wmmExpiringDay = "";
          updates.wmmExpiringYear = "";
          break;
        case "copiesRange":
          updates.copiesRange = "";
          updates.minCopies = "";
          updates.maxCopies = "";
          break;
        case "services":
          updates.services = [];
          break;
        case "areas":
          updates.areas = [];
          break;
        case "clientIncludeIds":
          updates.clientIncludeIds = "";
          break;
        case "clientExcludeIds":
          updates.clientExcludeIds = "";
          break;
        case "excludeSPackClients":
          updates.excludeSPackClients = false;
          break;
        case "subscriptionStatus":
          updates.subscriptionStatus = "all";
          break;
        default:
          updates[key] = "";
      }

      return { ...prev, ...updates };
    });
  };

  // Helper function to categorize areas
  const categorizeAreas = () => {
    const local = [];
    const foreign = [];

    if (Array.isArray(areas)) {
      areas.forEach((area) => {
        // Check if area name contains "ZONE" to identify foreign areas
        const isZone = area._id.includes("ZONE");
        if (isZone) {
          foreign.push(area);
        } else {
          local.push(area);
        }
      });
    }

    return { local, foreign };
  };

  const { local, foreign } = categorizeAreas();

  // Handle select all local areas
  const handleSelectAllLocal = (e) => {
    const isChecked = e.target.checked;
    setFilterData((prev) => {
      let updatedAreas = [...prev.areas];

      if (isChecked) {
        // Add all local area IDs that aren't already selected
        local.forEach((area) => {
          if (!updatedAreas.includes(area._id)) {
            updatedAreas.push(area._id);
          }
        });
      } else {
        // Remove all local area IDs
        updatedAreas = updatedAreas.filter(
          (areaId) => !local.some((area) => area._id === areaId)
        );
      }

      return { ...prev, areas: updatedAreas, exactAreaMatch: true };
    });
  };

  // Handle select all foreign areas
  const handleSelectAllForeign = (e) => {
    const isChecked = e.target.checked;
    setFilterData((prev) => {
      let updatedAreas = [...prev.areas];

      if (isChecked) {
        // Add all foreign area IDs that aren't already selected
        foreign.forEach((area) => {
          if (!updatedAreas.includes(area._id)) {
            updatedAreas.push(area._id);
          }
        });
      } else {
        // Remove all foreign area IDs
        updatedAreas = updatedAreas.filter(
          (areaId) => !foreign.some((area) => area._id === areaId)
        );
      }

      return { ...prev, areas: updatedAreas, exactAreaMatch: true };
    });
  };

  // Check if all local areas are selected
  const areAllLocalSelected =
    local.length > 0 &&
    local.every((area) => filterData.areas.includes(area._id));

  // Check if all foreign areas are selected
  const areAllForeignSelected =
    foreign.length > 0 &&
    foreign.every((area) => filterData.areas.includes(area._id));

  // Function to combine date components into ISO format for backend
  const formatDateComponentsToISO = (month, day, year) => {
    if (!month || !day || !year) return "";

    // Handle two-digit years
    let fullYear = parseInt(year);
    if (fullYear < 100) {
      fullYear = fullYear < 50 ? 2000 + fullYear : 1900 + fullYear;
    }

    // Format with padding
    const paddedMonth = month.toString().padStart(2, "0");
    const paddedDay = day.toString().padStart(2, "0");

    return `${fullYear}-${paddedMonth}-${paddedDay}`;
  };

  // Get a Date object from components
  const getDateFromComponents = (month, day, year) => {
    if (!month || !day || !year) return null;

    // Handle two-digit years
    let fullYear = parseInt(year);
    if (fullYear < 100) {
      fullYear = fullYear < 50 ? 2000 + fullYear : 1900 + fullYear;
    }

    // Create date - month is 0-indexed in JavaScript
    return new Date(fullYear, parseInt(month) - 1, parseInt(day));
  };

  return (
    <div>
      <Button
        onClick={openModal}
        className="bg-blue-600 text-white hover:bg-blue-700 rounded-md flex items-center gap-2"
      >
        <span>Advanced Filter</span>
      </Button>

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={closeModal}
          className="max-w-[95vw] w-auto overflow-hidden bg-gray-400 rounded-md bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border border-gray-100"
        >
          <form
            onSubmit={handleSubmit}
            className="max-h-[90vh] overflow-y-auto p-4"
          >
            <div className="mb-6 border-b pb-4">
              <h1 className="text-black text-2xl font-bold">Advanced Filter</h1>
              <p className="text-gray-500 text-sm">
                Use filters to narrow down results
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {/* Personal Information Card */}
              <div className="p-4 border rounded-lg shadow-sm">
                <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                  Personal Information
                </h2>
                <div className="space-y-3">
                  <InputField
                    label="First Name"
                    id="fname"
                    name="fname"
                    value={filterData.fname}
                    onChange={handleChange}
                    className={`w-full ${
                      filterData.fname ? "border-blue-500 bg-blue-50" : ""
                    }`}
                    labelClassName="text-lg font-medium text-black"
                  />
                  <InputField
                    label="Last Name"
                    id="lname"
                    name="lname"
                    value={filterData.lname}
                    onChange={handleChange}
                    className={`w-full ${
                      filterData.lname ? "border-blue-500 bg-blue-50" : ""
                    }`}
                    labelClassName="text-lg font-medium text-black"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <InputField
                      label="Middle Name"
                      id="mname"
                      name="mname"
                      value={filterData.mname}
                      onChange={handleChange}
                      className={`w-full ${
                        filterData.mname ? "border-blue-500 bg-blue-50" : ""
                      }`}
                      labelClassName="text-lg font-medium text-black"
                    />
                    <InputField
                      label="Suffix"
                      id="sname"
                      name="sname"
                      value={filterData.sname}
                      onChange={handleChange}
                      className={`w-full ${
                        filterData.sname ? "border-blue-500 bg-blue-50" : ""
                      }`}
                      labelClassName="text-lg font-medium text-black"
                    />
                  </div>
                  <InputField
                    label="Birth Date"
                    id="birthdate"
                    name="birthdate"
                    type="date"
                    value={filterData.birthdate}
                    onChange={handleChange}
                    className={`w-full ${
                      filterData.birthdate ? "border-blue-500 bg-blue-50" : ""
                    }`}
                    labelClassName="text-lg font-medium text-black"
                  />
                </div>
              </div>

              {/* Contact Information Card */}
              <div className="p-4 border rounded-lg shadow-sm">
                <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                  Contact Information
                </h2>
                <div className="space-y-3">
                  <InputField
                    label="Email Address"
                    id="email"
                    name="email"
                    type="email"
                    value={filterData.email}
                    onChange={handleChange}
                    className={`w-full ${
                      filterData.email ? "border-blue-500 bg-blue-50" : ""
                    }`}
                    labelClassName="text-lg font-medium text-black"
                  />
                  <InputField
                    label="Cell Number"
                    id="cellno"
                    name="cellno"
                    value={filterData.cellno}
                    onChange={handleChange}
                    className={`w-full ${
                      filterData.cellno ? "border-blue-500 bg-blue-50" : ""
                    }`}
                    labelClassName="text-lg font-medium text-black"
                  />
                  <InputField
                    label="Office Number"
                    id="ofcno"
                    name="ofcno"
                    value={filterData.ofcno}
                    onChange={handleChange}
                    className={`w-full ${
                      filterData.ofcno ? "border-blue-500 bg-blue-50" : ""
                    }`}
                    labelClassName="text-lg font-medium text-black"
                  />
                  <InputField
                    label="Other Contact"
                    id="contactnos"
                    name="contactnos"
                    value={filterData.contactnos}
                    onChange={handleChange}
                    className={`w-full ${
                      filterData.contactnos ? "border-blue-500 bg-blue-50" : ""
                    }`}
                    labelClassName="text-lg font-medium text-black"
                  />
                </div>
              </div>

              {/* Address Card */}
              <div className="p-4 border rounded-lg shadow-sm">
                <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                  Address
                </h2>
                <div className="space-y-3">
                  <label className="block text-lg font-medium text-black">
                    Full Address
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 min-h-[120px] ${
                      filterData.address ? "border-blue-500 bg-blue-50" : ""
                    }`}
                    value={filterData.address}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Date Ranges Card */}
              <div className="p-4 border rounded-lg shadow-sm">
                <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                  Date Ranges
                </h2>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium text-black">
                      General Date Range
                    </h3>
                    <div className="mb-2">
                      <label className="block text-black text-lg font-medium mb-1">
                        Start Date:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="relative">
                          <select
                            id="startDateMonth"
                            name="startDateMonth"
                            value={filterData.startDateMonth}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          >
                            <option value="">Month</option>
                            {months.map((month) => (
                              <option key={month.value} value={month.value}>
                                {month.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <input
                          type="text"
                          id="startDateDay"
                          name="startDateDay"
                          value={filterData.startDateDay}
                          onChange={handleChange}
                          placeholder="DD"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          maxLength="2"
                        />
                        <input
                          type="text"
                          id="startDateYear"
                          name="startDateYear"
                          value={filterData.startDateYear}
                          onChange={handleChange}
                          placeholder="YYYY"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          maxLength="4"
                        />
                      </div>
                    </div>

                    <div className="mb-2">
                      <label className="block text-black text-lg font-medium mb-1">
                        End Date:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="relative">
                          <select
                            id="endDateMonth"
                            name="endDateMonth"
                            value={filterData.endDateMonth}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          >
                            <option value="">Month</option>
                            {months.map((month) => (
                              <option key={month.value} value={month.value}>
                                {month.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <input
                          type="text"
                          id="endDateDay"
                          name="endDateDay"
                          value={filterData.endDateDay}
                          onChange={handleChange}
                          placeholder="DD"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          maxLength="2"
                        />
                        <input
                          type="text"
                          id="endDateYear"
                          name="endDateYear"
                          value={filterData.endDateYear}
                          onChange={handleChange}
                          placeholder="YYYY"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          maxLength="4"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Hide subscription date filters for HRG, FOM, CAL roles without WMM */}
                  {!hasOnlyNonWMMRoles() && (
                    <>
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium text-black">
                          Active Subscriptions
                        </h3>
                        <p className="text-xs text-gray-500">
                          Find clients with active subscriptions during this
                          month
                        </p>
                        <div className="mb-2">
                          <label className="block text-black text-lg font-medium mb-1">
                            Month:
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="relative">
                              <select
                                id="wmmActiveMonth"
                                name="wmmActiveMonth"
                                value={filterData.wmmActiveMonth}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              >
                                <option value="">Month</option>
                                {months.map((month) => (
                                  <option key={month.value} value={month.value}>
                                    {month.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <input
                              type="text"
                              id="wmmActiveDay"
                              name="wmmActiveDay"
                              value={filterData.wmmActiveDay}
                              onChange={handleChange}
                              placeholder="DD"
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              maxLength="2"
                            />
                            <input
                              type="text"
                              id="wmmActiveYear"
                              name="wmmActiveYear"
                              value={filterData.wmmActiveYear}
                              onChange={handleChange}
                              placeholder="YYYY"
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              maxLength="4"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Day value is optional - entire month will be
                            considered
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-lg font-medium text-black">
                          Expiring Subscriptions
                        </h3>
                        <p className="text-xs text-gray-500">
                          Find clients whose subscriptions expire this month
                        </p>
                        <div className="mb-2">
                          <label className="block text-black text-lg font-medium mb-1">
                            Month:
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="relative">
                              <select
                                id="wmmExpiringMonth"
                                name="wmmExpiringMonth"
                                value={filterData.wmmExpiringMonth}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              >
                                <option value="">Month</option>
                                {months.map((month) => (
                                  <option key={month.value} value={month.value}>
                                    {month.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <input
                              type="text"
                              id="wmmExpiringDay"
                              name="wmmExpiringDay"
                              value={filterData.wmmExpiringDay}
                              onChange={handleChange}
                              placeholder="DD"
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              maxLength="2"
                            />
                            <input
                              type="text"
                              id="wmmExpiringYear"
                              name="wmmExpiringYear"
                              value={filterData.wmmExpiringYear}
                              onChange={handleChange}
                              placeholder="YYYY"
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              maxLength="4"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Day value is optional - entire month will be
                            considered
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Copies Range Card - Hide for HRG, FOM, CAL roles without WMM */}
              {!hasOnlyNonWMMRoles() && (
                <div className="p-4 border rounded-lg shadow-sm">
                  <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                    Copies Range
                  </h2>
                  <div className="space-y-3">
                    <label className="block text-lg font-medium text-black">
                      Number of Copies
                    </label>
                    <select
                      name="copiesRange"
                      value={filterData.copiesRange}
                      onChange={handleChange}
                      className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 ${
                        filterData.copiesRange
                          ? "border-blue-500 bg-blue-50"
                          : ""
                      }`}
                    >
                      <option value="">Any number of copies</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="gt1">More than 1</option>
                      <option value="custom">Custom range</option>
                    </select>

                    {filterData.copiesRange === "custom" && (
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <InputField
                          label="Min copies"
                          id="minCopies"
                          name="minCopies"
                          type="number"
                          min="0"
                          value={filterData.minCopies}
                          onChange={handleChange}
                          className={`w-full ${
                            filterData.minCopies
                              ? "border-blue-500 bg-blue-50"
                              : ""
                          }`}
                          labelClassName="text-lg font-medium text-black"
                        />
                        <InputField
                          label="Max copies"
                          id="maxCopies"
                          name="maxCopies"
                          type="number"
                          min="0"
                          value={filterData.maxCopies}
                          onChange={handleChange}
                          className={`w-full ${
                            filterData.maxCopies
                              ? "border-blue-500 bg-blue-50"
                              : ""
                          }`}
                          labelClassName="text-lg font-medium text-black"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Category Filters Card */}
              <div className="p-4 border rounded-lg shadow-sm">
                <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                  Category Filters
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-lg font-medium text-black mb-1">
                      Group
                    </label>
                    <select
                      name="group"
                      value={filterData.group}
                      onChange={handleChange}
                      className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 ${
                        filterData.group ? "border-blue-500 bg-blue-50" : ""
                      }`}
                      disabled={!hasRole("WMM")}
                    >
                      <option value="">All Groups</option>
                      {Array.isArray(groups) &&
                        groups.map((group) => (
                          <option key={group._id} value={group.id}>
                            {group.id}
                          </option>
                        ))}
                    </select>
                    {!hasRole("WMM") && (
                      <p className="text-xs text-gray-500 mt-1">
                        Group filtering not available for your role
                      </p>
                    )}
                  </div>

                  <div className="flex items-center mt-2">
                    <input
                      type="checkbox"
                      id="excludeSPackClients"
                      name="excludeSPackClients"
                      checked={filterData.excludeSPackClients}
                      onChange={(e) =>
                        setFilterData((prev) => ({
                          ...prev,
                          excludeSPackClients: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="excludeSPackClients"
                      className="ml-2 text-lg text-black"
                    >
                      Exclude SPack Clients
                    </label>
                    <span className="ml-2 text-xs text-gray-500">
                      (Hide clients with "SPack" in group name)
                    </span>
                  </div>

                  <div>
                    <label className="block text-lg font-medium text-black mb-1">
                      Type
                    </label>
                    <select
                      name="type"
                      value={filterData.type}
                      onChange={handleChange}
                      className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 ${
                        filterData.type ? "border-blue-500 bg-blue-50" : ""
                      }`}
                    >
                      <option value="">All Types</option>
                      {Array.isArray(types) &&
                        types.map((type) => (
                          <option key={type._id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-lg font-medium text-black mb-1">
                      Subclass
                    </label>
                    <select
                      name="subsclass"
                      value={filterData.subsclass}
                      onChange={handleChange}
                      className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 ${
                        filterData.subsclass ? "border-blue-500 bg-blue-50" : ""
                      }`}
                    >
                      <option value="">All Subclasses</option>
                      {Array.isArray(subclasses) &&
                        subclasses.map((subclass) => (
                          <option key={subclass._id} value={subclass.id}>
                            {subclass.id} - {subclass.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Area Filter (Modified to checkboxes grouped by Local/Foreign) */}
                  <div>
                    <label className="block text-lg font-medium mb-2">
                      Areas
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      {filterData.areas.length} areas selected
                    </p>

                    <div className="max-h-[200px] overflow-y-auto border rounded-md p-2 custom-scrollbar">
                      {/* Local Areas */}
                      <div className="mb-3">
                        <h3 className="text-base font-semibold text-bold mb-1 bg-gray-100 p-1 flex justify-between items-center">
                          <span>Local Areas</span>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="select-all-local"
                              checked={areAllLocalSelected}
                              onChange={handleSelectAllLocal}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label
                              htmlFor="select-all-local"
                              className="ml-1 text-md text-gray-700"
                            >
                              Select All
                            </label>
                          </div>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {local.map((area) => (
                            <div key={area._id} className="flex items-center">
                              <input
                                type="checkbox"
                                id={`area-${area._id}`}
                                checked={filterData.areas.includes(area._id)}
                                onChange={() => handleAreaChange(area._id)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <label
                                htmlFor={`area-${area._id}`}
                                className="ml-2 text-base font-medium truncate"
                                title={area._id}
                              >
                                {area._id}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Foreign Areas */}
                      <div>
                        <h3 className="text-base font-semibold text-bold mb-1 bg-gray-100 p-1 flex justify-between items-center">
                          <span>Foreign Areas</span>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="select-all-foreign"
                              checked={areAllForeignSelected}
                              onChange={handleSelectAllForeign}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label
                              htmlFor="select-all-foreign"
                              className="ml-1 text-md text-gray-700"
                            >
                              Select All
                            </label>
                          </div>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {foreign.map((area) => (
                            <div key={area._id} className="flex items-center">
                              <input
                                type="checkbox"
                                id={`area-${area._id}`}
                                checked={filterData.areas.includes(area._id)}
                                onChange={() => handleAreaChange(area._id)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <label
                                htmlFor={`area-${area._id}`}
                                className="ml-2 text-base font-medium truncate"
                                title={area._id}
                              >
                                {area._id}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Add custom scrollbar style */}
                    <style
                      dangerouslySetInnerHTML={{
                        __html: `
                        .custom-scrollbar {
                          scrollbar-width: thin;
                          scrollbar-color: #ccc #f1f1f1;
                        }
                        .custom-scrollbar::-webkit-scrollbar {
                          width: 6px;
                          height: 6px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-track {
                          background: #f1f1f1;
                          border-radius: 3px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb {
                          background: #ccc;
                          border-radius: 3px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                          background: #999;
                        }
                        `,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Services Card */}
              <div className="p-4 border rounded-lg shadow-sm">
                <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                  Services
                </h2>
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 mb-3">
                    Select services to filter clients
                  </p>
                  {hasRole("WMM") ||
                  hasRole("FOM") ||
                  hasRole("HRG") ||
                  hasRole("CAL") ? (
                    <p className="text-xs text-blue-500 mb-3">
                      Services matching your role are automatically selected.
                      You can modify these selections.
                    </p>
                  ) : null}

                  {/* Add explanation of exact matching */}
                  <div className="p-2 bg-blue-50 rounded border border-blue-200 mb-3">
                    <p className="text-xs text-blue-800">
                      <span className="font-bold">Note:</span> When you select a
                      service (HRG, FOM, CAL), you'll only see clients that have
                      exactly that service and no others. WMM service can be
                      present on any client regardless of this filter.
                    </p>
                  </div>

                  {/* Replace checkbox with dropdown for subscription status - hide for WMM role */}
                  {!hasRole("WMM") && (
                    <div className="mb-3">
                      <label className="block text-lg font-medium text-black mb-1">
                        Subscription Status
                      </label>
                      <select
                        name="subscriptionStatus"
                        value={filterData.subscriptionStatus}
                        onChange={handleChange}
                        className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 ${
                          filterData.subscriptionStatus !== "all"
                            ? "border-blue-500 bg-blue-50"
                            : ""
                        }`}
                      >
                        <option value="all">All Subscriptions</option>
                        <option value="active">Active Only</option>
                        <option value="unsubscribed">Unsubscribed Only</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Filter clients by their subscription status
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-y-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="service-wmm"
                        checked={filterData.services.includes("WMM")}
                        onChange={() => handleServiceChange("WMM")}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="service-wmm"
                        className="ml-2 text-lg text-black"
                      >
                        WMM
                      </label>
                      {hasRole("WMM") && (
                        <span className="ml-1 text-xs text-blue-500">
                          (Auto)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="service-fom"
                        checked={filterData.services.includes("FOM")}
                        onChange={() => handleServiceChange("FOM")}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="service-fom"
                        className="ml-2 text-lg text-black"
                      >
                        FOM
                      </label>
                      {hasRole("FOM") && (
                        <span className="ml-1 text-xs text-blue-500">
                          (Auto)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="service-hrg"
                        checked={filterData.services.includes("HRG")}
                        onChange={() => handleServiceChange("HRG")}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="service-hrg"
                        className="ml-2 text-lg text-black"
                      >
                        HRG
                      </label>
                      {hasRole("HRG") && (
                        <span className="ml-1 text-xs text-blue-500">
                          (Auto)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="service-cal"
                        checked={filterData.services.includes("CAL")}
                        onChange={() => handleServiceChange("CAL")}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="service-cal"
                        className="ml-2 text-lg text-black"
                      >
                        CAL
                      </label>
                      {hasRole("CAL") && (
                        <span className="ml-1 text-xs text-blue-500">
                          (Auto)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Client ID Filter Card */}
              <div className="p-4 border rounded-lg shadow-sm">
                <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                  Client ID Filter
                </h2>
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0 mb-2">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="include-clients"
                        name="clientIdFilterType"
                        value="include"
                        checked={filterData.clientIdFilterType === "include"}
                        onChange={() =>
                          handleClientIdFilterTypeChange("include")
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label
                        htmlFor="include-clients"
                        className="ml-2 text-lg text-black"
                      >
                        Include only these clients
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="exclude-clients"
                        name="clientIdFilterType"
                        value="exclude"
                        checked={filterData.clientIdFilterType === "exclude"}
                        onChange={() =>
                          handleClientIdFilterTypeChange("exclude")
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label
                        htmlFor="exclude-clients"
                        className="ml-2 text-lg text-black"
                      >
                        Exclude these clients
                      </label>
                    </div>
                  </div>

                  {filterData.clientIdFilterType === "include" ? (
                    <div className="space-y-2">
                      <label className="block text-lg font-medium text-black">
                        Client IDs to Include
                      </label>
                      <p className="text-xs text-gray-500">
                        Enter client IDs to include in results. Separate with
                        commas or new lines.
                      </p>
                      <textarea
                        id="clientIncludeIds"
                        name="clientIncludeIds"
                        value={filterData.clientIncludeIds}
                        onChange={handleChange}
                        className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 min-h-[100px] ${
                          filterData.clientIncludeIds
                            ? "border-blue-500 bg-blue-50"
                            : ""
                        }`}
                        placeholder="e.g. 1001, 1002, 1003"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-lg font-medium text-black">
                        Client IDs to Exclude
                      </label>
                      <p className="text-xs text-gray-500">
                        Enter client IDs to exclude from results. Separate with
                        commas or new lines.
                      </p>
                      <textarea
                        id="clientExcludeIds"
                        name="clientExcludeIds"
                        value={filterData.clientExcludeIds}
                        onChange={handleChange}
                        className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 min-h-[100px] ${
                          filterData.clientExcludeIds
                            ? "border-blue-500 bg-blue-50"
                            : ""
                        }`}
                        placeholder="e.g. 2001, 2002, 2003"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* User Filter Card - Hide for HRG, FOM, CAL roles without WMM */}
              {!hasOnlyNonWMMRoles() && (
                <div className="p-4 border rounded-lg shadow-sm">
                  <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                    User Filter
                  </h2>
                  <div className="space-y-3">
                    <label className="block text-lg font-medium text-black">
                      Filter by User
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Show entries created or modified by a specific user with
                      your role
                    </p>

                    <select
                      name="userId"
                      value={filterData.userId}
                      onChange={handleChange}
                      className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 ${
                        filterData.userId ? "border-blue-500 bg-blue-50" : ""
                      }`}
                    >
                      <option value="">All Users</option>
                      {currentUser && (
                        <option value={currentUser._id}>
                          Me ({currentUser.username})
                        </option>
                      )}

                      {/* Show all other users */}
                      {users
                        .filter((u) => {
                          // Skip current user as they already have the "Me" option
                          if (!currentUser || u._id === currentUser._id)
                            return false;

                          // If we want to show all users without role filtering, uncomment this line:
                          // return true;

                          // Check if the current user has any roles to filter by
                          if (
                            !currentUser.roles ||
                            currentUser.roles.length === 0
                          )
                            return true;

                          // Get the current user's roles
                          const currentUserRoleNames = currentUser.roles
                            .map((role) => {
                              // Handle different role object structures
                              if (role.role && role.role.name)
                                return role.role.name;
                              if (typeof role.role === "string")
                                return role.role;
                              if (role.name) return role.name;
                              return null;
                            })
                            .filter(Boolean); // Remove null values

                          // If we can't determine current user roles, show all users
                          if (currentUserRoleNames.length === 0) return true;

                          // Check if this user has any matching roles
                          return (
                            u.roles &&
                            u.roles.some((userRole) => {
                              // Get this user's role name
                              let roleName = null;
                              if (userRole.role && userRole.role.name)
                                roleName = userRole.role.name;
                              else if (typeof userRole.role === "string")
                                roleName = userRole.role;
                              else if (userRole.name) roleName = userRole.name;

                              // Check if this role matches any of the current user's roles
                              return (
                                roleName &&
                                currentUserRoleNames.includes(roleName)
                              );
                            })
                          );
                        })
                        .map((u) => (
                          <option key={u._id} value={u._id}>
                            {u.username}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Active Filters Section */}
            {getActiveFilters().length > 0 && (
              <div className="mt-8 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex flex-wrap justify-between items-center mb-2">
                  <h2 className="text-blue-700 text-sm font-bold">
                    Active Filters ({getActiveFilters().length})
                  </h2>
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto custom-scrollbar p-1">
                  {getActiveFilters().map((filter, index) => (
                    <div
                      key={index}
                      className="bg-white border border-blue-300 rounded-full px-3 py-1 text-xs flex items-center mb-1"
                    >
                      <span className="font-semibold mr-1">
                        {filter.label}:
                      </span>
                      <span className="truncate max-w-[150px]">
                        {filter.value}
                      </span>
                      <button
                        type="button"
                        className="ml-2 text-gray-500 hover:text-red-500"
                        onClick={() => removeFilter(filter.key)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                onClick={clearAllFilters}
                className="px-4 py-2 text-red-700 bg-red-100 hover:bg-red-200 rounded-md"
              >
                Clear All
              </Button>
              <Button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Apply Filter
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdvancedFilter;
