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
  SpackFilter,
  RTSFilter,
  PaymentTypeFilter,
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

const AdvancedFilter = ({
  onApplyFilter,
  groups,
  selectedGroup,
  subscriptionType = "WMM",
}) => {
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

  // Helper function to check if user has HRG, FOM, or CAL role
  const hasHRGFOMCALRole = () => {
    return hasRole("HRG") || hasRole("FOM") || hasRole("CAL");
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
    customCopies: "",
    group: selectedGroup || "",
    type: "",
    subsclass: "",
    areas: [],
    acode: "",
    services: [],
    clientIncludeIds: "",
    clientExcludeIds: "",
    clientIdFilterType: "none",
    excludeCMCClients: false,
    excludeDCSClients: false,
    userId: "",
    subscriptionStatus: "all",
    hrgFomSubscriptionStatus: "all", // New field for HRG/FOM subscription status
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
    hrgCampaignYear: "",
    // New: HRG Campaign Month/Year (single or range)
    hrgCampaignMonth: "",
    hrgCampaignFromMonth: "",
    hrgCampaignFromYear: "",
    hrgCampaignToMonth: "",
    hrgCampaignToYear: "",
    // CAL Calendar Year (single)
    calYear: "",
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
    spackReceived: false,
    spackNotReceived: false,
    rtsMaxReached: false,
    rtsActive: false,
    rtsNone: false,
    excludeRTSMax: false,
    rtsMinCount: "",
    rtsMaxCount: "",
    expiryDateRangeOnly: false,
    calendarEntitledOnly: false,
    massPaid: false,
    cashPaid: false,
  });

  const [subclasses, setSubclasses] = useState([]);
  const [areas, setAreas] = useState([]);
  const [types, setTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isClientInfoOpen, setIsClientInfoOpen] = useState(false);

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
      let services = [];

      if (hasRole("WMM")) {
        // For WMM role, use subscription type
        switch (subscriptionType) {
          case "Promo":
            services = ["PROMO"];
            break;
          case "Complimentary":
            services = ["COMP"];
            break;
          default:
            services = ["WMM"];
        }
      } else if (hasRole("Admin")) {
        // For Admin, only set the service based on subscription type
        switch (subscriptionType) {
          case "Promo":
            services = ["PROMO"];
            break;
          case "Complimentary":
            services = ["COMP"];
            break;
          default:
            services = ["WMM"];
        }
      } else {
        // For other roles (HRG, FOM, CAL), add their respective services
        if (hasRole("HRG")) services.push("HRG");
        if (hasRole("FOM")) services.push("FOM");
        if (hasRole("CAL")) services.push("CAL");
      }

      // Only update if we found matching services
      if (services.length > 0) {
        setFilterData((prev) => ({
          ...prev,
          services: services,
        }));
      }
    }
  }, [hasRole, subscriptionType]);

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
    const userRoles = roles.filter((role) => hasRole(role));
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
      customCopies: "",
      group: selectedGroup || "",
      type: "",
      subsclass: "",
      areas: [],
      acode: "",
      services: [],
      clientIncludeIds: "",
      clientExcludeIds: "",
      clientIdFilterType: "none",
      excludeDCSClients: false,
      excludeCMCClients: false,
      userId: "",
      subscriptionStatus: "all",
      hrgFomSubscriptionStatus: "all", // New field for HRG/FOM subscription status
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
      hrgCampaignYear: "",
      // New: HRG Campaign Month/Year (single or range)
      hrgCampaignMonth: "",
      hrgCampaignFromMonth: "",
      hrgCampaignFromYear: "",
      hrgCampaignToMonth: "",
      hrgCampaignToYear: "",
      // CAL Calendar Year (single)
      calYear: "",
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
      spackReceived: false,
      spackNotReceived: false,
      rtsMaxReached: false,
      rtsActive: false,
      rtsNone: false,
      excludeRTSMax: false,
      rtsMinCount: "",
      rtsMaxCount: "",
      expiryDateRangeOnly: false,
      calendarEntitledOnly: false,
      massPaid: false,
      cashPaid: false,
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Handle checkbox inputs
    if (type === "checkbox") {
      setFilterData((prev) => ({
        ...prev,
        [name]: checked,
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
      // HRG Campaign Year (single year)
      "hrgCampaignYear",
      // New HRG Campaign month/year components
      "hrgCampaignMonth",
      "hrgCampaignFromMonth",
      "hrgCampaignFromYear",
      "hrgCampaignToMonth",
      "hrgCampaignToYear",
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
      return services.filter((service) => service !== "WMM");
    };

    const processClientIds = (idsString) => {
      if (!idsString || !idsString.trim()) return [];

      // First split by commas and/or whitespace and clean up
      const ids = idsString
        .split(/[,\s]+/)
        .map((id) => id.trim())
        .filter(Boolean)
        .map((id) => {
          // Remove any non-numeric characters
          const cleanId = id.replace(/[^0-9]/g, "");
          const num = Number(cleanId);
          return !isNaN(num) && isFinite(num) && num > 0 ? num : null;
        })
        .filter((id) => id !== null);

      // Remove duplicates and sort
      return [...new Set(ids)].sort((a, b) => a - b);
    };

    // Helper function to process custom copies
    const processCustomCopies = (copiesString) => {
      if (!copiesString || !copiesString.trim()) return [];

      // Split by commas and/or whitespace and clean up
      const copies = copiesString
        .split(/[,\s]+/)
        .map((copy) => copy.trim())
        .filter(Boolean)
        .map((copy) => {
          // Remove any non-numeric characters
          const cleanCopy = copy.replace(/[^0-9]/g, "");
          const num = Number(cleanCopy);
          return !isNaN(num) && isFinite(num) && num > 0 ? num : null;
        })
        .filter((copy) => copy !== null);

      // Remove duplicates and sort
      return [...new Set(copies)].sort((a, b) => a - b);
    };

    // Helper function to only include non-empty values
    const cleanObject = (obj) => {
      const result = {};
      for (const key in obj) {
        // Skip empty strings, empty arrays, and false booleans
        if (
          (typeof obj[key] === "string" && obj[key] !== "") ||
          (Array.isArray(obj[key]) && obj[key].length > 0) ||
          (typeof obj[key] === "boolean" && obj[key]) ||
          typeof obj[key] === "number" ||
          (obj[key] !== null &&
            obj[key] !== undefined &&
            typeof obj[key] !== "string" &&
            !Array.isArray(obj[key]))
        ) {
          result[key] = obj[key];
        }
      }
      return result;
    };

    // Get services based on subscription type for WMM role
    let services = [...(filterData.services || [])];
    if (hasRole("WMM")) {
      // Remove any existing WMM/PROMO/COMP services
      services = services.filter(
        (service) => !["WMM", "PROMO", "COMP"].includes(service)
      );

      // Add the correct service based on subscription type
      switch (subscriptionType) {
        case "Promo":
          services.push("PROMO");
          break;
        case "Complimentary":
          services.push("COMP");
          break;
        default: // WMM
          services.push("WMM");
      }
    }

    // Process the filter data
    const processedFilterData = cleanObject({
      // Always include subscription type in the filter data
      subscriptionType,

      // Personal info
      ...(filterData.lname && { lname: filterData.lname }),
      ...(filterData.fname && { fname: filterData.fname }),
      ...(filterData.mname && { mname: filterData.mname }),
      ...(filterData.sname && { sname: filterData.sname }),
      ...(filterData.birthdateMonth &&
        filterData.birthdateDay &&
        filterData.birthdateYear && {
          birthdate: `${filterData.birthdateMonth}/${filterData.birthdateDay}/${filterData.birthdateYear}`,
        }),

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

      // Always include services array with subscription type service
      services,

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
        ...(filterData.copiesRange === "custom" &&
          filterData.customCopies && {
            customCopies: parseInt(filterData.customCopies),
          }),
      }),

      // Areas and services
      ...(filterData.areas?.length > 0 && { areas: filterData.areas }),
      ...(filterData.services?.length > 0 && { services: filterData.services }),

      // Provide area group selections for display in AllClient
      ...(filterData.areas?.length > 0 &&
        (areAllLocalSelected || areAllForeignSelected) && {
          selectedAreaGroups: [
            ...(areAllLocalSelected ? ["Local"] : []),
            ...(areAllForeignSelected ? ["Foreign"] : []),
          ],
        }),

      // Handle client ID filters with strict validation
      ...(filterData.clientIdFilterType === "exclude" && {
        excludeClientIds: processClientIds(filterData.clientExcludeIds),
      }),
      ...(filterData.clientIdFilterType === "include" && {
        includeClientIds: processClientIds(filterData.clientIncludeIds),
      }),
      ...(filterData.clientIdFilterType === "both" && {
        includeClientIds: processClientIds(filterData.clientIncludeIds),
        excludeClientIds: processClientIds(filterData.clientExcludeIds),
      }),

      // Other flags
      ...(filterData.excludeDCSClients && { excludeDCSClients: true }),
      ...(filterData.excludeCMCClients && { excludeCMCClients: true }),
      ...(filterData.userId && { userId: filterData.userId }),
      ...(filterData.subscriptionStatus !== "all" && {
        subscriptionStatus: filterData.subscriptionStatus,
      }),
      ...(filterData.hrgFomSubscriptionStatus !== "all" && {
        hrgFomSubscriptionStatus: filterData.hrgFomSubscriptionStatus,
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
      // HRG Campaign Year -> send year number
      ...(filterData.hrgCampaignYear && {
        hrgCampaignYear: parseInt(filterData.hrgCampaignYear),
      }),
      // New HRG Campaign Month/Year support
      ...(filterData.hrgCampaignMonth &&
        filterData.hrgCampaignYear && {
          hrgCampaignMonth: filterData.hrgCampaignMonth,
          hrgCampaignYear: parseInt(filterData.hrgCampaignYear),
        }),
      ...(filterData.hrgCampaignFromMonth &&
        filterData.hrgCampaignFromYear && {
          hrgCampaignFromMonth: filterData.hrgCampaignFromMonth,
          hrgCampaignFromYear: parseInt(filterData.hrgCampaignFromYear),
        }),
      ...(filterData.hrgCampaignToMonth &&
        filterData.hrgCampaignToYear && {
          hrgCampaignToMonth: filterData.hrgCampaignToMonth,
          hrgCampaignToYear: parseInt(filterData.hrgCampaignToYear),
        }),
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

      // CAL Calendar Year (caltype-based)
      ...(filterData.calYear && { calYear: parseInt(filterData.calYear) }),

      // Calendar status
      ...(filterData.calendarReceived && { calendarReceived: true }),
      ...(filterData.calendarNotReceived && { calendarNotReceived: true }),
      // Spack status
      ...(filterData.spackReceived && { spackReceived: true }),
      ...(filterData.spackNotReceived && { spackNotReceived: true }),
      // RTS status
      ...(filterData.rtsMaxReached && { rtsMaxReached: true }),
      ...(filterData.rtsActive && { rtsActive: true }),
      ...(filterData.rtsNone && { rtsNone: true }),
      ...(filterData.excludeRTSMax && { excludeRTSMax: true }),
      ...(filterData.rtsMinCount && {
        rtsMinCount: parseInt(filterData.rtsMinCount),
      }),
      ...(filterData.rtsMaxCount && {
        rtsMaxCount: parseInt(filterData.rtsMaxCount),
      }),
      // Expiry date range only filter
      ...(filterData.expiryDateRangeOnly && { expiryDateRangeOnly: true }),
      // Calendar entitlement filters
      ...(filterData.calendarEntitledOnly && { calendarEntitledOnly: true }),

      // Payment type filters
      ...(filterData.massPaid && { massPaid: true }),
      ...(filterData.cashPaid && { cashPaid: true }),
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
      (filterData.clientIdFilterType === "include" ||
        filterData.clientIdFilterType === "both") &&
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
      (filterData.clientIdFilterType === "exclude" ||
        filterData.clientIdFilterType === "both") &&
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
    if (filterData.excludeDCSClients) {
      active.push({
        label: "Exclude DCS",
        value: "Yes",
        key: "excludeDCSClients",
      });
    }

    // Add "Exclude CMCClients" filter if active
    if (filterData.excludeCMCClients) {
      active.push({
        label: "Exclude CMCClients",
        value: "Yes",
        key: "excludeCMCClients",
      });
    }

    // Add payment type filters if active
    if (filterData.massPaid) {
      active.push({
        label: "Payment Type",
        value: "Mass Paid",
        key: "massPaid",
      });
    }

    if (filterData.cashPaid) {
      active.push({
        label: "Payment Type",
        value: "Cash Paid",
        key: "cashPaid",
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

    // Add HRG/FOM Subscription Status filter as a special case
    if (
      filterData.hrgFomSubscriptionStatus &&
      filterData.hrgFomSubscriptionStatus !== "all"
    ) {
      active.push({
        label: "HRG/FOM Status",
        value:
          filterData.hrgFomSubscriptionStatus.charAt(0).toUpperCase() +
          filterData.hrgFomSubscriptionStatus.slice(1),
        key: "hrgFomSubscriptionStatus",
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
          // If we're in "both" mode and removing include, switch to "exclude" only
          if (filterData.clientIdFilterType === "both") {
            updates.clientIdFilterType = "exclude";
          } else {
            updates.clientIdFilterType = "none";
          }
          break;
        case "clientExcludeIds":
          updates.clientExcludeIds = "";
          // If we're in "both" mode and removing exclude, switch to "include" only
          if (filterData.clientIdFilterType === "both") {
            updates.clientIdFilterType = "include";
          } else {
            updates.clientIdFilterType = "none";
          }
          break;
        case "excludeDCSClients":
          updates.excludeDCSClients = false;
          break;
        case "excludeCMCClients":
          updates.excludeCMCClients = false;
          break;
        case "subscriptionStatus":
          updates.subscriptionStatus = "all";
          break;
        case "hrgFomSubscriptionStatus":
          updates.hrgFomSubscriptionStatus = "all";
          break;
        case "hrgCampaignMonth":
          updates.hrgCampaignMonth = "";
          updates.hrgCampaignYear = "";
          break;
        case "hrgCampaignFromMonth":
        case "hrgCampaignFromYear":
        case "hrgCampaignToMonth":
        case "hrgCampaignToYear":
        case "hrgCampaignRange":
          updates.hrgCampaignFromMonth = "";
          updates.hrgCampaignFromYear = "";
          updates.hrgCampaignToMonth = "";
          updates.hrgCampaignToYear = "";
          break;
        case "expiryDateRangeOnly":
          updates.expiryDateRangeOnly = false;
          break;
        case "calendarEntitledOnly":
          updates.calendarEntitledOnly = false;
          break;
        case "massPaid":
          updates.massPaid = false;
          break;
        case "cashPaid":
          updates.cashPaid = false;
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
                    {!hasHRGFOMCALRole() && (
                      <CalendarFilter
                        filterData={filterData}
                        handleChange={handleChange}
                      />
                    )}
                    {!hasHRGFOMCALRole() && (
                      <SpackFilter
                        filterData={filterData}
                        handleChange={handleChange}
                      />
                    )}
                    <RTSFilter
                      filterData={filterData}
                      handleChange={handleChange}
                    />
                    {hasRole("WMM") && (
                      <PaymentTypeFilter
                        filterData={filterData}
                        handleChange={handleChange}
                      />
                    )}
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
                    {!hasHRGFOMCALRole() && (
                      <SubclassFilter
                        filterData={filterData}
                        handleChange={handleChange}
                        subclasses={subclasses}
                      />
                    )}

                    {/* HRG/FOM Subscription Status Filter */}
                    {hasHRGFOMCALRole() && (
                      <div className="p-4 bg-white rounded-lg shadow-sm border">
                        <h2 className="text-black text-xl font-medium mb-1">
                          Subscription Status
                        </h2>
                        <div className="flex items-center space-x-2">
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="hrgFomSubscriptionStatus"
                              value="all"
                              checked={
                                filterData.hrgFomSubscriptionStatus === "all"
                              }
                              onChange={handleChange}
                              className="rounded border-gray-300"
                            />
                            <span>All</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="hrgFomSubscriptionStatus"
                              value="subscribed"
                              checked={
                                filterData.hrgFomSubscriptionStatus ===
                                "subscribed"
                              }
                              onChange={handleChange}
                              className="rounded border-gray-300"
                            />
                            <span>Subscribed</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="hrgFomSubscriptionStatus"
                              value="unsubscribed"
                              checked={
                                filterData.hrgFomSubscriptionStatus ===
                                "unsubscribed"
                              }
                              onChange={handleChange}
                              className="rounded border-gray-300"
                            />
                            <span>Unsubscribed</span>
                          </label>
                        </div>
                      </div>
                    )}

                    <ServicesFilter
                      filterData={filterData}
                      handleChange={handleChange}
                      handleServiceChange={handleServiceChange}
                      handleClientIdFilterTypeChange={
                        handleClientIdFilterTypeChange
                      }
                      hasRole={hasRole}
                      subscriptionType={subscriptionType}
                    />
                  </div>
                </div>
              </div>

              {/* Client Information */}
              <div className="border rounded-md bg-white">
                <button
                  type="button"
                  onClick={() => setIsClientInfoOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between px-4 py-3"
                  aria-expanded={isClientInfoOpen}
                  aria-controls="client-info-content"
                >
                  <span className="text-xl font-semibold text-gray-700">
                    Client Information Filter
                  </span>
                  <span className="text-gray-500">
                    {isClientInfoOpen ? "▾" : "▸"}
                  </span>
                </button>
                {isClientInfoOpen && (
                  <div id="client-info-content" className="px-4 pb-4">
                    <ClientInfoFilter
                      filterData={filterData}
                      handleChange={handleChange}
                    />
                  </div>
                )}
              </div>
            </div>

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
