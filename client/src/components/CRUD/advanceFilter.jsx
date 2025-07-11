import { useState, useEffect } from "react";
import { Button } from "../UI/ShadCN/button";
import Modal from "../modal";
import {
  fetchSubclasses,
  fetchAreas,
  fetchTypes,
  fetchUsers,
} from "../Table/Data/utilData";
import { useUser } from "../../utils/Hooks/userProvider";
import {
  DateRangeFilter,
  ClientInfoFilter,
  GroupFilter,
  TypesFilter,
  SubclassFilter,
  AreasFilter,
  CalendarFilter,
  ServicesFilter,
  UserFilter,
} from "./filterModule";

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
    birthdateMonth: "",
    birthdateDay: "",
    birthdateYear: "",
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
    // Active subscription date components - From Date
    wmmActiveFromMonth: "",
    wmmActiveFromDay: "",
    wmmActiveFromYear: "",
    // Active subscription date components - To Date
    wmmActiveToMonth: "",
    wmmActiveToDay: "",
    wmmActiveToYear: "",
    // Expiring subscription date components - From Date
    wmmExpiringFromMonth: "",
    wmmExpiringFromDay: "",
    wmmExpiringFromYear: "",
    // Expiring subscription date components - To Date
    wmmExpiringToMonth: "",
    wmmExpiringToDay: "",
    wmmExpiringToYear: "",
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
    dateRangeName: "",
    // CAL Order Received Date components
    calReceivedFromMonth: "",
    calReceivedFromDay: "",
    calReceivedFromYear: "",
    calReceivedToMonth: "",
    calReceivedToDay: "",
    calReceivedToYear: "",
    // CAL Payment Date components
    calPaymentFromMonth: "",
    calPaymentFromDay: "",
    calPaymentFromYear: "",
    calPaymentToMonth: "",
    calPaymentToDay: "",
    calPaymentToYear: "",
    // HRG Payment Transaction Date components
    hrgPaymentFromMonth: "",
    hrgPaymentFromDay: "",
    hrgPaymentFromYear: "",
    hrgPaymentToMonth: "",
    hrgPaymentToDay: "",
    hrgPaymentToYear: "",
    // HRG Campaign Date components
    hrgCampaignFromMonth: "",
    hrgCampaignFromDay: "",
    hrgCampaignFromYear: "",
    hrgCampaignToMonth: "",
    hrgCampaignToDay: "",
    hrgCampaignToYear: "",
    // Selected role for date filters
    selectedDateFilterRole: "",
    // FOM Payment Transaction Date components
    fomPaymentFromMonth: "",
    fomPaymentFromDay: "",
    fomPaymentFromYear: "",
    fomPaymentToMonth: "",
    fomPaymentToDay: "",
    fomPaymentToYear: "",
    calendarReceived: false,
    calendarNotReceived: false,
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

    // Set initial role if user has only one of HRG, CAL, or FOM
    let initialRole = "";
    const roles = ["HRG", "CAL", "FOM"];
    const userRoles = roles.filter(role => hasRole(role));
    if (userRoles.length === 1) {
      initialRole = userRoles[0];
    }

    setFilterData({
      lname: "",
      fname: "",
      mname: "",
      sname: "",
      birthdateMonth: "",
      birthdateDay: "",
      birthdateYear: "",
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
      // Active subscription date components - From Date
      wmmActiveFromMonth: "",
      wmmActiveFromDay: "",
      wmmActiveFromYear: "",
      // Active subscription date components - To Date
      wmmActiveToMonth: "",
      wmmActiveToDay: "",
      wmmActiveToYear: "",
      // Expiring subscription date components - From Date
      wmmExpiringFromMonth: "",
      wmmExpiringFromDay: "",
      wmmExpiringFromYear: "",
      // Expiring subscription date components - To Date
      wmmExpiringToMonth: "",
      wmmExpiringToDay: "",
      wmmExpiringToYear: "",
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
      dateRangeName: "",
      // CAL Order Received Date components
      calReceivedFromMonth: "",
      calReceivedFromDay: "",
      calReceivedFromYear: "",
      calReceivedToMonth: "",
      calReceivedToDay: "",
      calReceivedToYear: "",
      // CAL Payment Date components
      calPaymentFromMonth: "",
      calPaymentFromDay: "",
      calPaymentFromYear: "",
      calPaymentToMonth: "",
      calPaymentToDay: "",
      calPaymentToYear: "",
      // HRG Payment Transaction Date components
      hrgPaymentFromMonth: "",
      hrgPaymentFromDay: "",
      hrgPaymentFromYear: "",
      hrgPaymentToMonth: "",
      hrgPaymentToDay: "",
      hrgPaymentToYear: "",
      // HRG Campaign Date components
      hrgCampaignFromMonth: "",
      hrgCampaignFromDay: "",
      hrgCampaignFromYear: "",
      hrgCampaignToMonth: "",
      hrgCampaignToDay: "",
      hrgCampaignToYear: "",
      // Selected role for date filters - set to user's only role if they have just one
      selectedDateFilterRole: initialRole,
      // FOM Payment Transaction Date components
      fomPaymentFromMonth: "",
      fomPaymentFromDay: "",
      fomPaymentFromYear: "",
      fomPaymentToMonth: "",
      fomPaymentToDay: "",
      fomPaymentToYear: "",
      calendarReceived: false,
      calendarNotReceived: false,
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Handle checkbox inputs
    if (type === 'checkbox') {
      setFilterData(prev => ({
        ...prev,
        [name]: checked
      }));
      return;
    }

    // Handle date components separately
    const dateComponentFields = [
      "startDateMonth",
      "startDateDay",
      "startDateYear",
      "endDateMonth",
      "endDateDay",
      "endDateYear",
      "wmmActiveFromMonth",
      "wmmActiveFromDay",
      "wmmActiveFromYear",
      "wmmActiveToMonth",
      "wmmActiveToDay",
      "wmmActiveToYear",
      "wmmExpiringFromMonth",
      "wmmExpiringFromDay",
      "wmmExpiringFromYear",
      "wmmExpiringToMonth",
      "wmmExpiringToDay",
      "wmmExpiringToYear",
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

    const processExactServices = (services) => {
      if (!services || !services.length) return [];
      return services.filter(service => service !== "WMM");
    };

    const processClientIds = (idsString) => {
      if (!idsString || !idsString.trim()) return [];
      
      // First split by commas and/or whitespace and clean up
      const ids = idsString
        .split(/[,\s]+/)
        .map(id => id.trim())
        .filter(Boolean)
        .map(id => {
          // Remove any non-numeric characters
          const cleanId = id.replace(/[^0-9]/g, '');
          const num = Number(cleanId);
          return !isNaN(num) && isFinite(num) && num > 0 ? num : null;
        })
        .filter(id => id !== null);

      // Remove duplicates and sort
      return [...new Set(ids)].sort((a, b) => a - b);
    };

    // Helper function to only include non-empty values
    const cleanObject = (obj) => {
      const result = {};
      for (const key in obj) {
        // Skip empty strings, empty arrays, and false booleans
        if (
          (typeof obj[key] === 'string' && obj[key] !== '') ||
          (Array.isArray(obj[key]) && obj[key].length > 0) ||
          (typeof obj[key] === 'boolean' && obj[key]) ||
          (typeof obj[key] === 'number') ||
          (obj[key] !== null && obj[key] !== undefined && typeof obj[key] !== 'string' && !Array.isArray(obj[key]))
        ) {
          result[key] = obj[key];
        }
      }
      return result;
    };

    // Process the filter data
    const processedFilterData = cleanObject({
      // Personal info
      ...(filterData.lname && { lname: filterData.lname }),
      ...(filterData.fname && { fname: filterData.fname }),
      ...(filterData.mname && { mname: filterData.mname }),
      ...(filterData.sname && { sname: filterData.sname }),
      ...(filterData.birthdateMonth && filterData.birthdateDay && filterData.birthdateYear && { birthdate: `${filterData.birthdateMonth}/${filterData.birthdateDay}/${filterData.birthdateYear}` }),

      // Contact info
      ...(filterData.email && { email: filterData.email }),
      ...(filterData.cellno && { cellno: filterData.cellno }),
      ...(filterData.ofcno && { ofcno: filterData.ofcno }),
      ...(filterData.contactnos && { contactnos: filterData.contactnos }),
      ...(filterData.address && { address: filterData.address }),

      // Category filters
      ...(filterData.group && { group: filterData.group }),
      ...(filterData.type && { type: filterData.type }),
      ...(filterData.subsclass && { subsclass: filterData.subsclass }),
      ...(filterData.acode && { acode: filterData.acode }),

      // Dates
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
      wmmActiveFromDate: formatDateComponentsToISO(
        filterData.wmmActiveFromMonth,
        filterData.wmmActiveFromDay,
        filterData.wmmActiveFromYear
      ),
      wmmActiveToDate: formatDateComponentsToISO(
        filterData.wmmActiveToMonth,
        filterData.wmmActiveToDay,
        filterData.wmmActiveToYear
      ),
      wmmExpiringFromDate: formatDateComponentsToISO(
        filterData.wmmExpiringFromMonth,
        filterData.wmmExpiringFromDay,
        filterData.wmmExpiringFromYear
      ),
      wmmExpiringToDate: formatDateComponentsToISO(
        filterData.wmmExpiringToMonth,
        filterData.wmmExpiringToDay,
        filterData.wmmExpiringToYear
      ),

      // Copies
      ...(filterData.copiesRange && { 
        copiesRange: filterData.copiesRange,
        ...(filterData.copiesRange === 'custom' && {
          minCopies: filterData.minCopies || undefined,
          maxCopies: filterData.maxCopies || undefined
        })
      }),

      // Areas and services
      ...(filterData.areas?.length > 0 && { areas: filterData.areas }),
      ...(filterData.services?.length > 0 && { services: filterData.services }),

      // Handle client ID filters with strict validation
      ...(filterData.clientIdFilterType === 'exclude' && {
        excludeClientIds: processClientIds(filterData.clientExcludeIds)
      }),
      ...(filterData.clientIdFilterType === 'include' && {
        includeClientIds: processClientIds(filterData.clientIncludeIds)
      }),

      // Other flags
      ...(filterData.excludeSPackClients && { excludeSPackClients: true }),
      ...(filterData.userId && { userId: filterData.userId }),
      ...(filterData.subscriptionStatus !== 'all' && { 
        subscriptionStatus: filterData.subscriptionStatus 
      }),

      // Service matching options
      exactServiceMatch: true,
      serviceMatchExcludeWMM: true,
      exactAreaMatch: true,

      // New date fields
      dateRangeName: filterData.dateRangeName,
      calReceivedFromDate: formatDateComponentsToISO(
        filterData.calReceivedFromMonth,
        filterData.calReceivedFromDay,
        filterData.calReceivedFromYear
      ),
      calReceivedToDate: formatDateComponentsToISO(
        filterData.calReceivedToMonth,
        filterData.calReceivedToDay,
        filterData.calReceivedToYear
      ),
      calPaymentFromDate: formatDateComponentsToISO(
        filterData.calPaymentFromMonth,
        filterData.calPaymentFromDay,
        filterData.calPaymentFromYear
      ),
      calPaymentToDate: formatDateComponentsToISO(
        filterData.calPaymentToMonth,
        filterData.calPaymentToDay,
        filterData.calPaymentToYear
      ),
      // HRG Payment Transaction Date
      hrgPaymentFromDate: formatDateComponentsToISO(
        filterData.hrgPaymentFromMonth,
        filterData.hrgPaymentFromDay,
        filterData.hrgPaymentFromYear
      ),
      hrgPaymentToDate: formatDateComponentsToISO(
        filterData.hrgPaymentToMonth,
        filterData.hrgPaymentToDay,
        filterData.hrgPaymentToYear
      ),
      // HRG Campaign Date
      hrgCampaignFromDate: formatDateComponentsToISO(
        filterData.hrgCampaignFromMonth,
        filterData.hrgCampaignFromDay,
        filterData.hrgCampaignFromYear
      ),
      hrgCampaignToDate: formatDateComponentsToISO(
        filterData.hrgCampaignToMonth,
        filterData.hrgCampaignToDay,
        filterData.hrgCampaignToYear
      ),
      // FOM Payment Transaction Date
      fomPaymentFromDate: formatDateComponentsToISO(
        filterData.fomPaymentFromMonth,
        filterData.fomPaymentFromDay,
        filterData.fomPaymentFromYear
      ),
      fomPaymentToDate: formatDateComponentsToISO(
        filterData.fomPaymentToMonth,
        filterData.fomPaymentToDay,
        filterData.fomPaymentToYear
      ),

      // Calendar status
      ...(filterData.calendarReceived && { calendarReceived: true }),
      ...(filterData.calendarNotReceived && { calendarNotReceived: true }),
    });

    // Clean the object to remove any undefined or empty values that might have slipped through
    const finalFilterData = cleanObject(processedFilterData);

    // Apply the filter
    onApplyFilter(finalFilterData);
    closeModal();
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
      filterData.wmmActiveFromMonth ||
      filterData.wmmActiveFromDay ||
      filterData.wmmActiveFromYear ||
      filterData.wmmActiveToMonth ||
      filterData.wmmActiveToDay ||
      filterData.wmmActiveToYear
    ) {
      // Check if we have From date components
      if (filterData.wmmActiveFromMonth) {
        const fromMonthName = getMonthName(filterData.wmmActiveFromMonth);
        const fromYear =
          filterData.wmmActiveFromYear || new Date().getFullYear().toString();
        const fromDay = filterData.wmmActiveFromDay || "";

        let fromDisplayValue = `${fromMonthName} ${fromYear}`;
        if (fromDay) {
          fromDisplayValue = `${fromMonthName} ${fromDay}, ${fromYear}`;
        }

        // Check if we have To date components
        if (filterData.wmmActiveToMonth) {
          const toMonthName = getMonthName(filterData.wmmActiveToMonth);
          const toYear =
            filterData.wmmActiveToYear || new Date().getFullYear().toString();
          const toDay = filterData.wmmActiveToDay || "";

          let toDisplayValue = `${toMonthName} ${toYear}`;
          if (toDay) {
            toDisplayValue = `${toMonthName} ${toDay}, ${toYear}`;
        }

        active.push({
            label: "Active Subscriptions",
            value: `${fromDisplayValue} to ${toDisplayValue}`,
            key: "wmmActiveFromMonth",
        });
      } else {
          active.push({
            label: "Active Subscriptions From",
            value: fromDisplayValue,
            key: "wmmActiveFromMonth",
          });
        }
      } else {
        const activeFromDisplay = formatDateDisplay(
          filterData.wmmActiveFromMonth,
          filterData.wmmActiveFromDay,
          filterData.wmmActiveFromYear
        );

        const activeToDisplay = formatDateDisplay(
          filterData.wmmActiveToMonth,
          filterData.wmmActiveToDay,
          filterData.wmmActiveToYear
        );

        if (activeFromDisplay && activeToDisplay) {
          active.push({
            label: "Active Subscriptions",
            value: `${activeFromDisplay} to ${activeToDisplay}`,
            key: "wmmActiveFromMonth",
          });
        } else if (activeFromDisplay) {
          active.push({
            label: "Active Subscriptions From",
            value: activeFromDisplay,
            key: "wmmActiveFromMonth",
          });
        } else if (activeToDisplay) {
          active.push({
            label: "Active Subscriptions To",
            value: activeToDisplay,
            key: "wmmActiveToMonth",
          });
        }
      }
    }

    // Handle expiring month as a special case
    if (
      filterData.wmmExpiringFromMonth ||
      filterData.wmmExpiringFromDay ||
      filterData.wmmExpiringFromYear ||
      filterData.wmmExpiringToMonth ||
      filterData.wmmExpiringToDay ||
      filterData.wmmExpiringToYear
    ) {
      // Check if we have From date components
      if (filterData.wmmExpiringFromMonth) {
        const fromMonthName = getMonthName(filterData.wmmExpiringFromMonth);
        const fromYear =
          filterData.wmmExpiringFromYear || new Date().getFullYear().toString();
        const fromDay = filterData.wmmExpiringFromDay || "";

        let fromDisplayValue = `${fromMonthName} ${fromYear}`;
        if (fromDay) {
          fromDisplayValue = `${fromMonthName} ${fromDay}, ${fromYear}`;
        }

        // Check if we have To date components
        if (filterData.wmmExpiringToMonth) {
          const toMonthName = getMonthName(filterData.wmmExpiringToMonth);
          const toYear =
            filterData.wmmExpiringToYear || new Date().getFullYear().toString();
          const toDay = filterData.wmmExpiringToDay || "";

          let toDisplayValue = `${toMonthName} ${toYear}`;
          if (toDay) {
            toDisplayValue = `${toMonthName} ${toDay}, ${toYear}`;
        }

        active.push({
            label: "Expiring Subscriptions",
            value: `${fromDisplayValue} to ${toDisplayValue}`,
            key: "wmmExpiringFromMonth",
        });
      } else {
          active.push({
            label: "Expiring Subscriptions From",
            value: fromDisplayValue,
            key: "wmmExpiringFromMonth",
          });
        }
      } else {
        const expiringFromDisplay = formatDateDisplay(
          filterData.wmmExpiringFromMonth,
          filterData.wmmExpiringFromDay,
          filterData.wmmExpiringFromYear
        );

        const expiringToDisplay = formatDateDisplay(
          filterData.wmmExpiringToMonth,
          filterData.wmmExpiringToDay,
          filterData.wmmExpiringToYear
        );

        if (expiringFromDisplay && expiringToDisplay) {
          active.push({
            label: "Expiring Subscriptions",
            value: `${expiringFromDisplay} to ${expiringToDisplay}`,
            key: "wmmExpiringFromMonth",
          });
        } else if (expiringFromDisplay) {
          active.push({
            label: "Expiring Subscriptions From",
            value: expiringFromDisplay,
            key: "wmmExpiringFromMonth",
          });
        } else if (expiringToDisplay) {
          active.push({
            label: "Expiring Subscriptions To",
            value: expiringToDisplay,
            key: "wmmExpiringToMonth",
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
        case "wmmActiveFromMonth":
          updates.wmmActiveFromMonth = "";
          updates.wmmActiveFromDay = "";
          updates.wmmActiveFromYear = "";
          updates.wmmActiveToMonth = "";
          updates.wmmActiveToDay = "";
          updates.wmmActiveToYear = "";
          break;
        case "wmmExpiringFromMonth":
          updates.wmmExpiringFromMonth = "";
          updates.wmmExpiringFromDay = "";
          updates.wmmExpiringFromYear = "";
          updates.wmmExpiringToMonth = "";
          updates.wmmExpiringToDay = "";
          updates.wmmExpiringToYear = "";
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
            <div className="p-2 mb-4 border-b bg-blue-500 text-white">
              <h1 className="text-white text-4xl font-bold">Advanced Filter</h1>
              <p className="text-white text-sm">
                Use filters to narrow down results
              </p>
            </div>

            <div className="space-y-8">
              {/* Most Frequently Used Filters */}
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  <div className="space-y-4">
                    <DateRangeFilter
                      filterData={filterData}
                      handleChange={handleChange}
                      months={months}
                      hasOnlyNonWMMRoles={hasOnlyNonWMMRoles}
                      hasRole={hasRole}
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-white rounded-lg shadow-sm border">
                      <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                        Copies
                      </h2>
                      <div className="space-y-2">
                        <select
                          name="copiesRange"
                          value={filterData.copiesRange}
                          onChange={handleChange}
                          className="w-full p-2 border rounded"
                        >
                          <option value="">Select Range</option>
                          <option value="1">1 Copy</option>
                          <option value="2">2 Copies</option>
                          <option value="gt1">More than 1</option>
                          <option value="custom">Custom Range</option>
                        </select>
                        {filterData.copiesRange === "custom" && (
                          <div className="flex gap-2 mt-2">
                            <input
                              type="number"
                              name="minCopies"
                              placeholder="Min"
                              value={filterData.minCopies}
                              onChange={handleChange}
                              className="w-1/2 p-2 border rounded"
                            />
                            <input
                              type="number"
                              name="maxCopies"
                              placeholder="Max"
                              value={filterData.maxCopies}
                              onChange={handleChange}
                              className="w-1/2 p-2 border rounded"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <CalendarFilter
                      filterData={filterData}
                      handleChange={handleChange}
                    />
                    <AreasFilter
                      filterData={filterData}
                      handleAreaChange={handleAreaChange}
                      handleSelectAllLocal={handleSelectAllLocal}
                      handleSelectAllForeign={handleSelectAllForeign}
                      areas={areas}
                      areAllLocalSelected={areAllLocalSelected}
                      areAllForeignSelected={areAllForeignSelected}
                      local={local}
                      foreign={foreign}
                    />
                  </div>
                  <div className="space-y-4">
                    <GroupFilter
                      filterData={filterData}
                      handleChange={handleChange}
                      groups={groups}
                      hasRole={hasRole}
                    />
                    <TypesFilter
                      filterData={filterData}
                      handleChange={handleChange}
                      types={types}
                    />
                    <SubclassFilter
                      filterData={filterData}
                      handleChange={handleChange}
                      subclasses={subclasses}
                    />
                    <ServicesFilter
                      filterData={filterData}
                      handleChange={handleChange}
                      handleServiceChange={handleServiceChange}
                      handleClientIdFilterTypeChange={handleClientIdFilterTypeChange}
                      hasRole={hasRole}
                    />
                  </div>
                </div>
              </div>

              {/* Client Information */}
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">
                  Client Information
                </h2>
                <ClientInfoFilter
                  filterData={filterData}
                  handleChange={handleChange}
                />
              </div>
            </div>

            {/* Keep existing Active Filters Section */}
            {getActiveFilters().length > 0 && (
              <div className="mt-6 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                {/* ... existing active filters code ... */}
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

      {/* Keep existing custom scrollbar style */}
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
  );
};

export default AdvancedFilter;
