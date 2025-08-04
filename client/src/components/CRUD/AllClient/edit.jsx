import { useUser } from "../../../utils/Hooks/userProvider";
import { roleConfigs } from "../../../utils/roleConfigs";
import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";
import AreaForm from "../../../utils/areaform";
import InputField from "../input";
import {
  fetchSubclasses,
  fetchTypes,
  fetchAreas,
} from "../../Table/Data/utilData";
import { webSocketService } from "../../../services/WebSocketService";

// Utility function to format date to "yyyy-MM-dd"
const formatDateToInput = (date) => {
  const d = new Date(date);
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
};

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

// Add a helper function to parse dates consistently
const parseDate = (dateString) => {
  if (!dateString) return null;

  // Try to handle various date formats
  let date;

  // Check if it's already MM/DD/YY format
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

const Edit = ({ rowData, onDeleteSuccess, onClose, onEditSuccess }) => {
  const { user, hasRole } = useUser();

  // Add months array at the top of the component
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

  // Update initial state to ensure all values are defined
  const [formData, setFormData] = useState({
    lname: rowData?.lname || "",
    fname: rowData?.fname || "",
    mname: rowData?.mname || "",
    sname: rowData?.sname || "",
    title: rowData?.title || "",
    bdate: rowData?.bdate || "",
    bdateMonth: rowData?.bdate ? rowData.bdate.split("/")[0] : "",
    bdateDay: rowData?.bdate ? rowData.bdate.split("/")[1] : "",
    bdateYear: rowData?.bdate ? rowData.bdate.split("/")[2] : "",
    company: rowData?.company || "",
    address: rowData?.address || "",
    housestreet: rowData?.housestreet || "",
    subdivision: rowData?.subdivision || "",
    barangay: rowData?.barangay || "",
    zipcode: rowData?.zipcode || "",
    area: rowData?.area || "",
    acode: rowData?.acode || "",
    contactnos: rowData?.contactnos || "",
    cellno: rowData?.cellno || "",
    ofcno: rowData?.ofcno || "",
    email: rowData?.email || "",
    type: rowData?.type || "",
    group: rowData?.group || "",
    remarks: rowData?.remarks || "",
    subscriptionType: rowData?.subscriptionType || "WMM", // Add subscription type
    referralid: rowData?.referralid || "", // Add referral ID for Promo subscriptions
    subscriptionFreq: rowData?.subscriptionFreq || "",
    subscriptionStart: rowData?.subscriptionStart || "",
    subscriptionEnd: rowData?.subscriptionEnd || "",
    subStartMonth: rowData?.subStartMonth || "",
    subStartDay: rowData?.subStartDay || "",
    subStartYear: rowData?.subStartYear || "",
    subEndMonth: rowData?.subEndMonth || "",
    subEndDay: rowData?.subEndDay || "",
    subEndYear: rowData?.subEndYear || "",
    subsclass: rowData?.subsclass || "",
  });

  const [addressData, setAddressData] = useState({
    housestreet: rowData?.housestreet || "",
    subdivision: rowData?.subdivision || "",
    barangay: rowData?.barangay || "",
    city: rowData?.area || "",
    zipcode: rowData?.zipcode || "",
  });

  const [combinedAddress, setCombinedAddress] = useState(rowData.address || "");
  const [isEditingCombinedAddress, setIsEditingCombinedAddress] =
    useState(false);
  const [selectedCity, setSelectedCity] = useState("");
  const [roleSpecificData, setRoleSpecificData] = useState({
    recvdate: rowData?.recvdate || "",
    renewdate: rowData?.renewdate || "",
    campaigndate: rowData?.campaigndate || "",
    paymtref: rowData?.paymtref || "",
    paymtamt: rowData?.paymtamt || 0,
    unsubscribe: rowData?.unsubscribe || false,
    remarks: rowData?.remarks || "",
    subsdate: rowData?.subdate || "",
    enddate: rowData?.enddate || "",
    subsyear: rowData?.subsyear || 0,
    copies: rowData?.copies || "1",
    paymtmasses: rowData?.paymtmasses || 0,
    calendar: rowData?.calendar || false,
    subsclass: rowData?.subsclass || "",
    donorid: rowData?.donorid || "",
  });
  const [areaData, setAreaData] = useState({
    acode: rowData?.acode || "",
    zipcode: rowData?.zipcode || "",
    area: rowData?.area || "",
    city: rowData?.area || "",
  });
  const [showModal, setShowModal] = useState(false);
  const [renewalType, setRenewalType] = useState("current");
  const [lastSubscriptionEnd, setLastSubscriptionEnd] = useState(null);
  const [subscriptionFreq, setSubscriptionFreq] = useState("");
  const [groups, setGroups] = useState([]);
  const [subclasses, setSubclasses] = useState([]);
  const [types, setTypes] = useState([]);
  const [selectedRole, setSelectedRole] = useState("HRG"); // Default to HRG

  // Track if we're editing an existing subscription or adding a new one
  const [subscriptionMode, setSubscriptionMode] = useState("add");
  const [selectedSubscription, setSelectedSubscription] = useState({
    subsdate: "",
    enddate: "",
    renewdate: "",
    subsyear: "",
    copies: "1",
    paymtamt: "",
    paymtmasses: "",
    calendar: false,
    subsclass: "",
    donorid: "",
    paymtref: "",
  });
  const [availableSubscriptions, setAvailableSubscriptions] = useState([]);
  const [newSubscription, setNewSubscription] = useState({
    subsdate: "",
    enddate: "",
    renewdate: "",
    subsyear: "",
    copies: "1",
    paymtamt: "",
    paymtmasses: "",
    calendar: false,
    subsclass: "",
    donorid: "",
    paymtref: "",
  });

  // Add validation function for new subscription data
  const validateNewSubscription = (data) => {
    const errors = {};

    if (!data.subsdate) {
      errors.subsdate = "Subscription start date is required";
    }

    if (!data.enddate) {
      errors.enddate = "Subscription end date is required";
    }

    if (!data.subsclass) {
      errors.subsclass = "Subscription class is required";
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  // Add state for validation errors
  const [validationErrors, setValidationErrors] = useState({});

  // After the state declarations, around line 50-60, add these new state variables:
  const [hrgRecords, setHrgRecords] = useState([]);
  const [fomRecords, setFomRecords] = useState([]);
  const [calRecords, setCalRecords] = useState([]);
  const [selectedHrgRecord, setSelectedHrgRecord] = useState(null);
  const [selectedFomRecord, setSelectedFomRecord] = useState(null);
  const [selectedCalRecord, setSelectedCalRecord] = useState(null);
  const [roleRecordMode, setRoleRecordMode] = useState("edit"); // "edit" or "add"
  const [newRoleData, setNewRoleData] = useState({
    // HRG default fields
    recvdate: formatDateToMMDDYY(new Date()),
    renewdate: "",
    campaigndate: "",
    paymtref: "",
    paymtamt: 0,
    unsubscribe: false,
    remarks: "",
  });

  const [areas, setAreas] = useState(null);
  const [isLoadingAreas, setIsLoadingAreas] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fetch areas data
    const loadAreas = async () => {
      try {
        setIsLoadingAreas(true);
        const areasData = await fetchAreas();
        setAreas(areasData);
      } catch (error) {
        console.error("Error loading areas:", error);
      } finally {
        setIsLoadingAreas(false);
      }
    };

    loadAreas();
  }, []);

  useEffect(() => {
    if (!areas && !isLoadingAreas) {
      setIsLoadingAreas(true);
      fetchAreas()
        .then((areasData) => {
          setAreas(areasData);
          setIsLoadingAreas(false);
        })
        .catch(() => setIsLoadingAreas(false));
    }
  }, [areas, isLoadingAreas]);

  useEffect(() => {
    if (rowData) {
      // Parse birth date into components if it exists
      let bdateMonth = "";
      let bdateDay = "";
      let bdateYear = "";

      if (rowData.bdate) {
        const dateParts = rowData.bdate.split("/");
        if (dateParts.length === 3) {
          bdateMonth = dateParts[0].padStart(2, "0");
          bdateDay = dateParts[1].padStart(2, "0");
          bdateYear = dateParts[2];
        }
      }

      // Initialize all form fields with default values
      setFormData({
        lname: rowData.lname || "",
        fname: rowData.fname || "",
        mname: rowData.mname || "",
        sname: rowData.sname || "",
        title: rowData.title || "",
        bdate: rowData.bdate || "",
        bdateMonth: bdateMonth || "",
        bdateDay: bdateDay || "",
        bdateYear: bdateYear || "",
        company: rowData.company || "",
        address: rowData.address || "",
        housestreet: rowData.housestreet || "",
        subdivision: rowData.subdivision || "",
        barangay: rowData.barangay || "",
        zipcode: rowData.zipcode || "",
        area: rowData.area || "",
        acode: rowData.acode || "",
        contactnos: rowData.contactnos || "",
        cellno: rowData.cellno || "",
        ofcno: rowData.ofcno || "",
        email: rowData.email || "",
        type: rowData.type || "",
        group: rowData.group || "",
        remarks: rowData.remarks || "",
        subscriptionFreq: rowData.subscriptionFreq || "",
        subscriptionStart: rowData.subscriptionStart || "",
        subscriptionEnd: rowData.subscriptionEnd || "",
        subStartMonth: "",
        subStartDay: "",
        subStartYear: "",
        subEndMonth: "",
        subEndDay: "",
        subEndYear: "",
        subsclass: rowData.subsclass || "",
      });

      // Initialize role-specific data
      setRoleSpecificData((prev) => ({
        ...prev,
        recvdate: rowData.recvdate || "",
        renewdate: rowData.renewdate || "",
        campaigndate: rowData.campaigndate || "",
        paymtref: rowData.paymtref || "",
        paymtamt: rowData.paymtamt || "",
        unsubscribe: rowData.unsubscribe || false,
        remarks: rowData.remarks || "",
      }));
    }
  }, [rowData]);

  // Initialize WMM subscription data
  useEffect(() => {
    if (rowData) {
      // Get subscription type from rowData or default to WMM
      const subscriptionType = rowData.subscriptionType || "WMM";

      // Get the appropriate subscription data based on type
      let subscriptionData;
      if (subscriptionType === "Promo") {
        subscriptionData = rowData.promoData?.records || [];
      } else if (subscriptionType === "Complimentary") {
        subscriptionData = rowData.complimentaryData?.records || [];
      } else {
        subscriptionData = rowData.wmmData?.records || [];
      }

      // Set available subscriptions
      setAvailableSubscriptions(subscriptionData);

      // If there are subscriptions, select the latest one
      if (subscriptionData.length > 0) {
        const latestSubscription =
          subscriptionData[subscriptionData.length - 1];

        // Select the latest subscription
        setSelectedSubscription(latestSubscription);

        // Initialize subscription mode to add (renew) by default
        setSubscriptionMode("add");

        // Parse dates
        const subsdate = parseDate(latestSubscription.subsdate);
        const enddate = parseDate(latestSubscription.enddate);

        if (subsdate && enddate) {
          // Calculate the difference in months
          const diffMonths =
            (enddate.getFullYear() - subsdate.getFullYear()) * 12 +
            (enddate.getMonth() - subsdate.getMonth());

          // Set subscription frequency based on month difference
          let frequency = "";
          if (diffMonths >= 22 && diffMonths <= 26) {
            frequency = "22"; // 2 years
          } else if (diffMonths >= 10 && diffMonths <= 14) {
            frequency = "11"; // 1 year
          } else if (diffMonths >= 5 && diffMonths <= 7) {
            frequency = "5"; // 6 months
          }

          setSubscriptionFreq(frequency);

          // Extract month, day, year for start date
          const subStartMonth = String(subsdate.getMonth() + 1).padStart(
            2,
            "0"
          );
          const subStartDay = String(subsdate.getDate()).padStart(2, "0");
          const subStartYear = String(subsdate.getFullYear());

          // Extract month, day, year for end date
          const subEndMonth = String(enddate.getMonth() + 1).padStart(2, "0");
          const subEndDay = String(enddate.getDate()).padStart(2, "0");
          const subEndYear = String(enddate.getFullYear());

          // Format dates for display
          const formattedStartDate = `${subStartMonth}/${subStartDay}/${subStartYear}`;
          const formattedEndDate = `${subEndMonth}/${subEndDay}/${subEndYear}`;

          // Update formData with subscription details (without subsclass conversion for now)
          setFormData((prev) => ({
            ...prev,
            subscriptionType,
            subscriptionFreq: frequency,
            subscriptionStart: formattedStartDate,
            subscriptionEnd: formattedEndDate,
            subStartMonth,
            subStartDay,
            subStartYear,
            subEndMonth,
            subEndDay,
            subEndYear,
            subsclass: latestSubscription.subsclass || "",
            referralid:
              subscriptionType === "Promo"
                ? latestSubscription.referralid || ""
                : "",
          }));

          // Update roleSpecificData with subscription details (without subsclass conversion for now)
          setRoleSpecificData((prev) => ({
            ...prev,
            subsdate: formattedStartDate,
            enddate: formattedEndDate,
            subsDateMonth: subStartMonth,
            subsDateDay: subStartDay,
            subsDateYear: subStartYear,
            endDateMonth: subEndMonth,
            endDateDay: subEndDay,
            endDateYear: subEndYear,
            subsyear: latestSubscription.subsyear || 0,
            copies: latestSubscription.copies || 1,
            paymtamt: latestSubscription.paymtamt || "",
            paymtmasses: latestSubscription.paymtmasses || "",
            calendar: latestSubscription.calendar || false,
            subsclass: latestSubscription.subsclass || "",
            donorid: latestSubscription.donorid || "",
            paymtref: latestSubscription.paymtref || "",
            remarks: latestSubscription.remarks || "",
            referralid:
              subscriptionType === "Promo"
                ? latestSubscription.referralid || ""
                : undefined,
          }));
        }
      }
    }
  }, [rowData]);

  // Convert subsclass names to IDs after subclasses are loaded
  useEffect(() => {
    if (subclasses.length > 0 && rowData) {
      // Convert subsclass in formData
      setFormData((prev) => {
        if (prev.subsclass && typeof prev.subsclass === "string") {
          const subclass = subclasses.find((s) => s.name === prev.subsclass);
          if (subclass) {
            return {
              ...prev,
              subsclass: subclass.id,
            };
          }
        }
        return prev;
      });

      // Convert subsclass in roleSpecificData
      setRoleSpecificData((prev) => {
        if (prev.subsclass && typeof prev.subsclass === "string") {
          const subclass = subclasses.find((s) => s.name === prev.subsclass);
          if (subclass) {
            return {
              ...prev,
              subsclass: subclass.id,
            };
          }
        }
        return prev;
      });

      // Also convert subsclass in selectedSubscription if it exists
      if (selectedSubscription && selectedSubscription.subsclass) {
        const subclass = subclasses.find(
          (s) => s.name === selectedSubscription.subsclass
        );
        if (subclass) {
          setSelectedSubscription((prev) => ({
            ...prev,
            subsclass: subclass.id,
          }));
        }
      }
    }
  }, [subclasses, rowData, selectedSubscription]);

  // Clear subscription fields when component loads with default "add" mode
  useEffect(() => {
    if (subscriptionMode === "add" && rowData) {
      // Clear subscription-related fields in formData
      setFormData((prev) => ({
        ...prev,
        subscriptionFreq: "",
        subscriptionStart: "",
        subscriptionEnd: "",
        subStartMonth: "",
        subStartDay: "",
        subStartYear: "",
        subEndMonth: "",
        subEndDay: "",
        subEndYear: "",
        subsclass: "",
        referralid: formData.subscriptionType === "Promo" ? "" : undefined,
      }));

      // Clear subscription data in roleSpecificData
      setRoleSpecificData((prev) => ({
        ...prev,
        subsdate: "",
        enddate: "",
        renewdate: "",
        subsyear: 0,
        copies: 1,
        paymtamt: "",
        paymtmasses: "",
        calendar: false,
        subsclass: "",
        donorid: "",
        paymtref: "",
        remarks: "",
        referralid: formData.subscriptionType === "Promo" ? "" : undefined,
      }));

      // Initialize with today's date for the new subscription
      const today = new Date();
      const startMonth = String(today.getMonth() + 1).padStart(2, "0");
      const startDay = String(today.getDate()).padStart(2, "0");
      const startYear = String(today.getFullYear());
      const formattedStartDate = `${startMonth}/${startDay}/${startYear}`;

      // Update formData with today's date as the start date
      setFormData((prev) => ({
        ...prev,
        subStartMonth: startMonth,
        subStartDay: startDay,
        subStartYear: startYear,
        subscriptionStart: formattedStartDate,
      }));

      // Also update roleSpecificData
      setRoleSpecificData((prev) => ({
        ...prev,
        subsdate: formattedStartDate,
      }));
    }
  }, [subscriptionMode, rowData]);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await axios.get(
          `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/groups`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }
        );
        setGroups(response.data);
      } catch (error) {
        console.error("Error fetching groups:", error);
      }
    };
    fetchGroups();
  }, []);

  useEffect(() => {
    const loadSubclasses = async () => {
      try {
        const subclassesData = await fetchSubclasses();
        // Sort subclasses by leading numbers in name, then alphabetically
        const sortedSubclasses = [...subclassesData].sort((a, b) => {
          // Extract leading numbers from name strings
          const aMatch = a.name.match(/^(\d+)/);
          const bMatch = b.name.match(/^(\d+)/);

          // If both have leading numbers, compare numerically
          if (aMatch && bMatch) {
            return parseInt(aMatch[0]) - parseInt(bMatch[0]);
          }
          // If only one has a leading number, prioritize it
          if (aMatch) return -1;
          if (bMatch) return 1;

          // Otherwise sort alphabetically
          return a.name.localeCompare(b.name);
        });
        setSubclasses(sortedSubclasses);
      } catch (error) {
        console.error("Error loading subclasses:", error);
      }
    };
    loadSubclasses();
  }, []);

  useEffect(() => {
    const loadTypes = async () => {
      try {
        const typesData = await fetchTypes();
        setTypes(typesData);
      } catch (error) {
        console.error("Error loading types:", error);
      }
    };
    loadTypes();
  }, []);

  const closeModal = () => {
    setShowModal(false);
    onClose();
  };

  const formatDateToMonthYear = (date) => {
    if (!date) return "";

    let d;
    try {
      // Try to create a new date from the input
      d = new Date(date);

      // Check if date is valid
      if (isNaN(d.getTime())) {
        // Try parsing MM/DD/YY format
        const parts = date.split("/");
        if (parts.length === 3) {
          const month = parseInt(parts[0]) - 1;
          const day = parseInt(parts[1]);
          let year = parseInt(parts[2]);
          // Adjust two-digit year
          if (year < 100) {
            year = year < 50 ? 2000 + year : 1900 + year;
          }
          d = new Date(year, month, day);
        }
      }

      // Check if date is now valid
      if (isNaN(d.getTime())) {
        return date; // Return original string if cannot parse
      }
    } catch (error) {
      console.error("Error parsing date:", error);
      return date; // Return original string if error
    }

    // Format the date
    const month = d.toLocaleString("en-US", { month: "short" });
    const day = d.getDate();
    const year = d.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  const calculateEndMonth = (startDate, monthsToAdd) => {
    if (!startDate || !monthsToAdd) return null;

    try {
      // Use our parse function to ensure consistent date handling
      let start;
      if (typeof startDate === "string") {
        start = parseDate(startDate);
      } else {
        start = new Date(startDate);
      }

      if (!start || isNaN(start.getTime())) {
        throw new Error("Invalid start date");
      }

      // Create a new date object and add months
      const endDate = new Date(start);
      endDate.setMonth(endDate.getMonth() + parseInt(monthsToAdd));

      // Keep the same day of the month to count full months correctly
      // For example, April 15 + 1 month = May 15

      return endDate;
    } catch (error) {
      console.error("Error calculating end date:", error);
      return null;
    }
  };

  // Update handleChange to ensure values are never undefined
  const handleChange = async (e) => {
    const { name, value } = e.target;
    const safeValue = value ?? ""; // Ensure value is never undefined

    // Handle bdate parts
    if (name === "bdateMonth" || name === "bdateDay" || name === "bdateYear") {
      setFormData((prevData) => {
        const newData = {
          ...prevData,
          [name]: safeValue,
        };

        // Combine the date parts into bdate if all are present
        if (newData.bdateMonth && newData.bdateDay && newData.bdateYear) {
          newData.bdate = `${newData.bdateMonth}/${newData.bdateDay}/${newData.bdateYear}`;
        } else {
          newData.bdate = "";
        }

        return newData;
      });
      return;
    }

    // Handle subscription start date parts
    if (
      name === "subStartMonth" ||
      name === "subStartDay" ||
      name === "subStartYear"
    ) {
      setFormData((prevData) => {
        const newData = {
          ...prevData,
          [name]: safeValue,
        };

        // Combine the date parts into subscriptionStart if all are present
        if (
          newData.subStartMonth &&
          newData.subStartDay &&
          newData.subStartYear
        ) {
          newData.subscriptionStart = `${newData.subStartMonth}/${newData.subStartDay}/${newData.subStartYear}`;
        } else {
          newData.subscriptionStart = "";
        }

        return newData;
      });
      return;
    }

    // Handle subscription end date parts
    if (
      name === "subEndMonth" ||
      name === "subEndDay" ||
      name === "subEndYear"
    ) {
      setFormData((prevData) => {
        const newData = {
          ...prevData,
          [name]: safeValue,
        };

        // Combine the date parts into subscriptionEnd if all are present
        if (newData.subEndMonth && newData.subEndDay && newData.subEndYear) {
          newData.subscriptionEnd = `${newData.subEndMonth}/${newData.subEndDay}/${newData.subEndYear}`;
        } else {
          newData.subscriptionEnd = "";
        }

        return newData;
      });
      return;
    }

    // Handle subscription frequency change
    if (name === "subscriptionFreq") {
      const monthsToAdd = parseInt(value);
      const today = new Date();

      // Calculate end date
      const endDate = calculateEndMonth(today, monthsToAdd);
      const endMonth = String(endDate.getMonth() + 1).padStart(2, "0");
      const endDay = String(endDate.getDate()).padStart(2, "0");
      const endYear = String(endDate.getFullYear());
      const formattedEndDate = `${endMonth}/${endDay}/${endYear}`;

      // Update form state
      setFormData((prev) => ({
        ...prev,
        subscriptionFreq: value,
        subscriptionEnd: formattedEndDate,
        subEndMonth: endMonth,
        subEndDay: endDay,
        subEndYear: endYear,
      }));

      // Update role-specific data
      setRoleSpecificData((prev) => ({
        ...prev,
        enddate: formattedEndDate,
        subsyear: monthsToAdd === 12 ? 1 : monthsToAdd === 24 ? 2 : 0.5,
      }));
      return;
    }

    // For all other fields
    setFormData((prevData) => ({
      ...prevData,
      [name]: safeValue,
    }));
  };

  // Update handleRoleSpecificChange to ensure values are never undefined
  const handleRoleSpecificChange = (e) => {
    const { name, value, type, checked } = e.target;
    const safeValue = type === "checkbox" ? checked : value ?? "";

    setRoleSpecificData((prev) => {
      // Don't convert donorid to uppercase, preserve the original value
      const fieldValue =
        name === "donorid"
          ? value
          : type === "checkbox"
          ? checked
          : safeValue.toUpperCase();

      return {
        ...prev,
        [name]: fieldValue,
      };
    });
  };

  // Update handleSelectedSubscriptionChange to ensure values are never undefined
  const handleSelectedSubscriptionChange = (e) => {
    const { name, value } = e.target;
    const safeValue = value ?? "";

    setSelectedSubscription((prev) => ({
      ...prev,
      [name]: safeValue,
    }));
  };

  // Update handleNewSubscriptionChange to ensure values are never undefined
  const handleNewSubscriptionChange = (e) => {
    const { name, value } = e.target;
    const safeValue = value ?? "";

    setNewSubscription((prev) => ({
      ...prev,
      [name]: safeValue,
    }));
  };

  const formatAddressLines = (addressData, area, areaData) => {
    const lines = [];

    // Line 1: House/Building Number and Street name
    if (addressData.housestreet) lines.push(addressData.housestreet.trim());

    // Line 2: Subdivision/Compound Name
    if (addressData.subdivision) lines.push(addressData.subdivision.trim());

    // Line 3: Barangay
    if (addressData.barangay) lines.push(addressData.barangay.trim());

    // Line 4: Zipcode and City (no comma for last line)
    const zipcode = areaData.zipcode || addressData.zipcode;
    const cityName = area || "";
    // Ensure we use the complete city name
    const lastLine = [
      zipcode,
      cityName.length > 0 ? cityName.toUpperCase() : "",
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (lastLine) lines.push(lastLine);

    return lines.join("\n");
  };

  // Update handleAddressChange to ensure values are never undefined
  const handleAddressChange = (type, value) => {
    let cleanedValue = value || ""; // Ensure value is never undefined
    if (["housestreet", "subdivision", "barangay"].includes(type)) {
      cleanedValue = cleanedValue.replace(/,\s*$/, "");
    }

    setAddressData((prev) => {
      const newAddressData = {
        ...prev,
        [type]: cleanedValue,
      };

      const formattedAddress = formatAddressLines(
        newAddressData,
        formData.area || "",
        areaData
      );
      setCombinedAddress(formattedAddress);

      setFormData((prev) => ({
        ...prev,
        address: formattedAddress || "",
        housestreet: newAddressData.housestreet || "",
        subdivision: newAddressData.subdivision || "",
        barangay: newAddressData.barangay || "",
      }));

      return newAddressData;
    });
  };

  // Update handleAreaChange to ensure values are never undefined
  const handleAreaChange = (field, value) => {
    // Allow empty string values to persist
    const safeValue = value === undefined ? "" : value;

    setAreaData((prevData) => {
      const newAreaData = {
        ...prevData,
        [field]: safeValue,
      };

      // Update address data and form data based on field
      if (field === "zipcode") {
        setAddressData((prev) => ({
          ...prev,
          zipcode: safeValue,
        }));

        setFormData((prev) => ({
          ...prev,
          zipcode: safeValue ? parseInt(safeValue) : "", // Allow empty string
        }));
      } else if (field === "city") {
        // Ensure we store the complete city name
        const upperValue = safeValue.toUpperCase();
        setFormData((prev) => ({
          ...prev,
          area: upperValue,
        }));
        // Update the combined address immediately for city changes
        const formattedAddress = formatAddressLines(addressData, upperValue, {
          ...newAreaData,
          zipcode: addressData.zipcode || newAreaData.zipcode,
        });
        setCombinedAddress(formattedAddress);
        setFormData((prev) => ({
          ...prev,
          area: upperValue,
          address: formattedAddress,
        }));
      } else if (field === "acode") {
        setFormData((prev) => ({
          ...prev,
          acode: safeValue,
        }));
      }

      // Only update combined address for non-city changes
      if (field !== "city") {
        const updatedAddressData = {
          ...addressData,
          zipcode: field === "zipcode" ? safeValue : addressData.zipcode,
        };

        const formattedAddress = formatAddressLines(
          updatedAddressData,
          formData.area,
          {
            ...newAreaData,
            zipcode: field === "zipcode" ? safeValue : newAreaData.zipcode,
          }
        );

        setCombinedAddress(formattedAddress);
        setFormData((prev) => ({
          ...prev,
          address: formattedAddress,
        }));
      }

      return newAreaData;
    });
  };

  // Update handleCombinedAddressChange to ensure values are never undefined
  const handleCombinedAddressChange = (e) => {
    const value = e.target.value || ""; // Ensure value is never undefined
    setIsEditingCombinedAddress(true);
    setCombinedAddress(value);

    const lines = value
      .split("\n")
      .map((line) => line.trim().replace(/,\s*$/, ""))
      .filter((line) => line);

    setAddressData((prev) => {
      const lastLine = lines[lines.length - 1] || "";
      const zipMatch = lastLine.match(/^\d+/);
      const zipcode = zipMatch ? zipMatch[0] : "";

      return {
        housestreet: lines[0] || "",
        subdivision: lines[1] || "",
        barangay: lines[2] || "",
        city: prev.city || "", // Ensure city is never undefined
        zipcode: zipcode || "",
      };
    });

    setFormData((prev) => {
      const lastLine = lines[lines.length - 1] || "";
      const zipMatch = lastLine.match(/^\d+/);
      const zipcode = zipMatch ? zipMatch[0] : "";
      const city = lastLine.replace(zipcode, "").trim();

      return {
        ...prev,
        address: value,
        housestreet: lines[0] || "",
        subdivision: lines[1] || "",
        barangay: lines[2] || "",
        zipcode: zipcode ? parseInt(zipcode) : 0, // Use 0 instead of empty string
        area: city || "",
      };
    });

    if (lines.length > 0) {
      const lastLine = lines[lines.length - 1];
      const zipMatch = lastLine.match(/^\d+/);
      const zipcode = zipMatch ? zipMatch[0] : "";
      const city = lastLine.replace(zipcode, "").trim();

      setAreaData((prev) => ({
        ...prev,
        zipcode: zipcode || "",
        city: city || "",
      }));
    }
  };

  // Add focus and blur handlers
  const handleCombinedAddressFocus = () => {
    setIsEditingCombinedAddress(true);
  };

  const handleCombinedAddressBlur = () => {
    setIsEditingCombinedAddress(false);
    // Format the address properly when blurring
    const formattedAddress = formatAddressLines(
      addressData,
      formData.area || "",
      areaData
    );
    setCombinedAddress(formattedAddress);
  };

  const handleCitySelect = (cityname) => {
    setSelectedCity(cityname);
    handleAddressChange("city", cityname);
  };

  const handleRenewDateToday = () => {
    const today = new Date();
    setRoleSpecificData((prev) => ({
      ...prev,
      renewdate: formatDateToInput(today),
    }));
  };

  const handleRoleToggle = (role) => {
    setSelectedRole(role);
    setRoleRecordMode("edit"); // Reset to edit mode when changing roles

    // Reset role-specific data based on selected role and available records
    if (role === "HRG") {
      if (hrgRecords.length > 0 && selectedHrgRecord) {
        setRoleSpecificData({
          ...selectedHrgRecord,
        });
      } else {
        // No records available, set up empty form
        setRoleSpecificData({
          recvdate: formatDateToMMDDYY(new Date()),
          renewdate: "",
          campaigndate: "",
          paymtref: "",
          paymtamt: 0,
          unsubscribe: false,
          remarks: "",
        });
      }
    } else if (role === "FOM") {
      if (fomRecords.length > 0 && selectedFomRecord) {
        setRoleSpecificData({
          ...selectedFomRecord,
        });
      } else {
        // No records available, set up empty form
        setRoleSpecificData({
          recvdate: formatDateToMMDDYY(new Date()),
          paymtamt: 0,
          paymtform: "",
          paymtref: "",
          unsubscribe: false,
          remarks: "",
        });
      }
    } else if (role === "CAL") {
      if (calRecords.length > 0 && selectedCalRecord) {
        setRoleSpecificData({
          ...selectedCalRecord,
        });
      } else {
        // No records available, set up empty form
        setRoleSpecificData({
          recvdate: formatDateToMMDDYY(new Date()),
          caltype: "",
          calqty: 0,
          calamt: 0,
          paymtref: "",
          paymtamt: 0,
          paymtform: "",
          paymtdate: "",
          remarks: "",
        });
      }
    }
  };

  const handleSubscriptionModeChange = (mode) => {
    setSubscriptionMode(mode);

    if (mode === "edit" && selectedSubscription) {
      // Switch to edit mode and load the selected subscription
      setRoleSpecificData({
        id: selectedSubscription.id || selectedSubscription._id,
        subsdate: selectedSubscription.subsdate || "",
        enddate: selectedSubscription.enddate || "",
        renewdate: selectedSubscription.renewdate || "",
        subsyear: selectedSubscription.subsyear || 0,
        copies: selectedSubscription.copies || 1,
        paymtamt: selectedSubscription.paymtamt || 0,
        paymtmasses: selectedSubscription.paymtmasses || 0,
        calendar: selectedSubscription.calendar || false,
        subsclass: selectedSubscription.subsclass || "",
        donorid: selectedSubscription.donorid || 0,
        paymtref: selectedSubscription.paymtref || "",
        remarks: selectedSubscription.remarks || "",
        referralid:
          formData.subscriptionType === "Promo"
            ? selectedSubscription.referralid || ""
            : undefined,
      });
    } else if (mode === "add") {
      // Clear subscription-related fields in formData
      setFormData((prev) => ({
        ...prev,
        subscriptionFreq: "",
        subscriptionStart: "",
        subscriptionEnd: "",
        subStartMonth: "",
        subStartDay: "",
        subStartYear: "",
        subEndMonth: "",
        subEndDay: "",
        subEndYear: "",
        subsclass: "",
        referralid: formData.subscriptionType === "Promo" ? "" : undefined,
      }));

      // Clear subscription data in roleSpecificData
      setRoleSpecificData((prev) => ({
        ...prev,
        subsdate: "",
        enddate: "",
        renewdate: "",
        subsyear: 0,
        copies: 1,
        paymtamt: "",
        paymtmasses: "",
        calendar: false,
        subsclass: "",
        donorid: "",
        paymtref: "",
        remarks: "",
        referralid: formData.subscriptionType === "Promo" ? "" : undefined,
      }));

      // Initialize with today's date for the new subscription
      const today = new Date();
      const startMonth = String(today.getMonth() + 1).padStart(2, "0");
      const startDay = String(today.getDate()).padStart(2, "0");
      const startYear = String(today.getFullYear());
      const formattedStartDate = `${startMonth}/${startDay}/${startYear}`;

      // Update formData with today's date as the start date
      setFormData((prev) => ({
        ...prev,
        subStartMonth: startMonth,
        subStartDay: startDay,
        subStartYear: startYear,
        subscriptionStart: formattedStartDate,
      }));

      // Also update roleSpecificData
      setRoleSpecificData((prev) => ({
        ...prev,
        subsdate: formattedStartDate,
      }));
    }
  };

  // Add a helper function to check if a subscription is selected
  const isSubscriptionSelected = (sub, selectedSub) => {
    if (!sub || !selectedSub) return false;

    // Compare using string conversion to handle different ID types
    const subId = sub._id || sub.id;
    const selectedId = selectedSub._id || selectedSub.id;

    return String(subId) === String(selectedId);
  };

  // Update the helper function to handle _id instead of id
  const selectSubscription = (subscription) => {
    if (!subscription) return;

    // Get the subscription ID (could be either _id or id field)
    const subscriptionId = subscription._id || subscription.id;

    // Find the subscription in the array by ID
    const selectedSub = availableSubscriptions.find(
      (sub) => (sub._id || sub.id) === subscriptionId
    );

    if (selectedSub) {
      setSelectedSubscription(selectedSub);

      // Parse start and end dates
      let subsdate = parseDate(selectedSub.subsdate);
      let enddate = parseDate(selectedSub.enddate);

      // Extract month, day, year for start date
      const subsDateMonth = subsdate
        ? String(subsdate.getMonth() + 1).padStart(2, "0")
        : "";
      const subsDateDay = subsdate
        ? String(subsdate.getDate()).padStart(2, "0")
        : "";
      const subsDateYear = subsdate ? String(subsdate.getFullYear()) : "";

      // Extract month, day, year for end date
      const endDateMonth = enddate
        ? String(enddate.getMonth() + 1).padStart(2, "0")
        : "";
      const endDateDay = enddate
        ? String(enddate.getDate()).padStart(2, "0")
        : "";
      const endDateYear = enddate ? String(enddate.getFullYear()) : "";

      // Format for display in the subscription form
      const formattedSubsDate = subsdate ? formatDateToMMDDYY(subsdate) : "";
      const formattedEndDate = enddate ? formatDateToMMDDYY(enddate) : "";

      // Set all values to roleSpecificData
      setRoleSpecificData({
        ...selectedSub,
        // Add the individual date components
        subsDateMonth,
        subsDateDay,
        subsDateYear,
        endDateMonth,
        endDateDay,
        endDateYear,
        // Add subscription type specific fields
        referralid:
          formData.subscriptionType === "Promo"
            ? selectedSub.referralid || ""
            : undefined,
      });

      // Also update the formData for consistency
      setFormData((prevFormData) => ({
        ...prevFormData,
        subscriptionStart: formattedSubsDate,
        subscriptionEnd: formattedEndDate,
        subStartMonth: subsDateMonth,
        subStartDay: subsDateDay,
        subStartYear: subsDateYear,
        subEndMonth: endDateMonth,
        subEndDay: endDateDay,
        subEndYear: endDateYear,
        subsclass: selectedSub.subsclass || "",
        referralid:
          formData.subscriptionType === "Promo"
            ? selectedSub.referralid || ""
            : "",
      }));

      // Determine subscription frequency based on the subscription period
      if (subsdate && enddate) {
        const startDate = new Date(subsdate);
        const endDate = new Date(enddate);

        // Calculate the difference in months
        const diffMonths =
          (endDate.getFullYear() - startDate.getFullYear()) * 12 +
          (endDate.getMonth() - startDate.getMonth());

        // Set subscription frequency based on month difference
        let frequency = "";
        if (diffMonths >= 22 && diffMonths <= 26) {
          frequency = "22"; // 2 years
        } else if (diffMonths >= 10 && diffMonths <= 14) {
          frequency = "11"; // 1 year
        } else if (diffMonths >= 5 && diffMonths <= 7) {
          frequency = "5"; // 6 months
        }

        if (frequency) {
          setSubscriptionFreq(frequency);
          setFormData((prev) => ({
            ...prev,
            subscriptionFreq: frequency,
          }));
        }
      }
    }
  };

  const handleSubscriptionFreqChange = (e) => {
    const freq = e.target.value;
    setSubscriptionFreq(freq);

    // Get months to add based on frequency
    let monthsToAdd;
    if (freq === "5") monthsToAdd = 6;
    else if (freq === "11") monthsToAdd = 12;
    else if (freq === "22") monthsToAdd = 24;
    else return; // Return if not a standard option

    // Handle different subscription modes
    if (subscriptionMode === "edit" && selectedSubscription) {
      // When editing existing subscription
      let startDate = parseDate(roleSpecificData.subsdate);

      if (!startDate || isNaN(startDate.getTime())) {
        // If no valid start date, use today
        startDate = new Date();
      }

      // Calculate end date preserving the day of month
      const newEndDate = calculateEndMonth(startDate, monthsToAdd);

      if (!newEndDate) return; // Safety check

      // Format for display
      const formattedDate = formatDateToMMDDYY(newEndDate);

      // Extract month, day, year for end date
      const endDateMonth = String(newEndDate.getMonth() + 1).padStart(2, "0");
      const endDateDay = String(newEndDate.getDate()).padStart(2, "0");
      const endDateYear = String(newEndDate.getFullYear());

      // Update state with both formatted date and components
      setRoleSpecificData((prev) => ({
        ...prev,
        enddate: formattedDate,
        endDateMonth,
        endDateDay,
        endDateYear,
        subsyear: monthsToAdd === 12 ? 1 : monthsToAdd === 24 ? 2 : 0.5,
      }));

      // Also update formData for consistency
      setFormData((prev) => ({
        ...prev,
        subscriptionFreq: freq,
        subscriptionEnd: formattedDate,
        subEndMonth: endDateMonth,
        subEndDay: endDateDay,
        subEndYear: endDateYear,
      }));
    } else {
      // Handle new subscription
      let startDate = parseDate(newSubscription.subsdate);

      if (!startDate || isNaN(startDate.getTime())) {
        // If no valid start date, use today
        startDate = new Date();

        // Also update the start date in newSubscription
        const today = new Date();
        const startMonth = String(today.getMonth() + 1).padStart(2, "0");
        const startDay = String(today.getDate()).padStart(2, "0");
        const startYear = String(today.getFullYear());
        const formattedStartDate = `${startMonth}/${startDay}/${startYear}`;

        setTimeout(() => {
          setNewSubscription((prev) => ({
            ...prev,
            subsdate: formattedStartDate,
            subsDateMonth: startMonth,
            subsDateDay: startDay,
            subsDateYear: startYear,
          }));
        }, 0);
      }

      // Calculate end date preserving the day of month
      const newEndDate = calculateEndMonth(startDate, monthsToAdd);

      if (!newEndDate) return; // Safety check

      // Format for display
      const formattedDate = formatDateToMMDDYY(newEndDate);

      // Extract month, day, year for end date
      const endDateMonth = String(newEndDate.getMonth() + 1).padStart(2, "0");
      const endDateDay = String(newEndDate.getDate()).padStart(2, "0");
      const endDateYear = String(newEndDate.getFullYear());

      // Update state with both formatted date and components
      setNewSubscription((prev) => ({
        ...prev,
        enddate: formattedDate,
        endDateMonth,
        endDateDay,
        endDateYear,
        subsyear: monthsToAdd === 12 ? 1 : monthsToAdd === 24 ? 2 : 0.5,
      }));
    }
  };

  // Add removeEmptyFields helper function before handleSubmit
  const removeEmptyFields = (obj) => {
    const result = {};
    for (const key in obj) {
      if (obj[key] !== null && obj[key] !== undefined && obj[key] !== "") {
        if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
          const nestedResult = removeEmptyFields(obj[key]);
          if (Object.keys(nestedResult).length > 0) {
            result[key] = nestedResult;
          }
        } else {
          result[key] = obj[key];
        }
      }
    }
    return result;
  };

  // Add subscription type styles
  const getSubscriptionTypeStyles = () => {
    switch (formData.subscriptionType) {
      case "Promo":
        return "bg-emerald-600 text-white border-emerald-700";
      case "Complimentary":
        return "bg-purple-600 text-white border-purple-700";
      default: // WMM
        return "bg-blue-600 text-white border-blue-700";
    }
  };

  // Add date formatting functions
  const formatDateForWMM = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDateForPromo = (date) => {
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Update handleSubmit to use the new date formatting functions
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Format birth date if all parts are present
    const formatBdate = () => {
      if (formData.bdateMonth && formData.bdateDay && formData.bdateYear) {
        return `${formData.bdateMonth}/${formData.bdateDay}/${formData.bdateYear}`;
      }
      return formData.bdate || "";
    };

    // Prepare base client data
    const baseClientData = {
      ...formData,
      bdate: formatBdate(),
      address: combinedAddress,
      ...areaData,
    };

    // Clean the client data by removing empty fields
    const clientData = removeEmptyFields(baseClientData);

    // Determine role type based on subscription type
    let roleType = "";
    let roleData = {};

    // Prepare role submissions
    const roleSubmissions = [];

    // Helper function to check if subscription data has meaningful content
    const hasSubscriptionData = () => {
      // Check if any subscription-related fields have been filled
      const hasStartDate =
        formData.subscriptionStart && formData.subscriptionStart.trim() !== "";
      const hasEndDate =
        formData.subscriptionEnd && formData.subscriptionEnd.trim() !== "";
      const hasFrequency =
        formData.subscriptionFreq && formData.subscriptionFreq !== "";
      const hasCopies = roleSpecificData.copies && roleSpecificData.copies > 1;
      const hasPaymentInfo =
        (roleSpecificData.paymtref &&
          roleSpecificData.paymtref.trim() !== "") ||
        (roleSpecificData.paymtamt &&
          roleSpecificData.paymtamt.trim() !== "") ||
        (roleSpecificData.paymtmasses &&
          roleSpecificData.paymtmasses.trim() !== "");
      const hasDonorId =
        roleSpecificData.donorid && roleSpecificData.donorid.trim() !== "";
      const hasSubsclass =
        formData.subsclass && formData.subsclass.trim() !== "";
      const hasReferralId =
        formData.referralid && formData.referralid.trim() !== "";
      const hasRemarks =
        roleSpecificData.remarks && roleSpecificData.remarks.trim() !== "";
      const hasCalendar = roleSpecificData.calendar === true;

      return (
        hasStartDate ||
        hasEndDate ||
        hasFrequency ||
        hasCopies ||
        hasPaymentInfo ||
        hasDonorId ||
        hasSubsclass ||
        hasReferralId ||
        hasRemarks ||
        hasCalendar
      );
    };

    // Only add subscription data if user has WMM role AND has provided subscription data
    if (hasRole("WMM") && hasSubscriptionData()) {
      // Get subscription specific data based on subscription type
      const getSubscriptionSpecificData = () => {
        const baseData = {
          subsyear: formData.subscriptionFreq
            ? parseInt(formData.subscriptionFreq)
            : 0,
          copies: parseInt(roleSpecificData.copies) || 1,
          remarks: roleSpecificData.remarks || "",
          calendar: roleSpecificData.calendar || false,
          adddate: new Date().toLocaleDateString("en-US", {
            month: "numeric",
            day: "numeric",
            year: "numeric",
          }),
        };

        // Format dates based on subscription type
        if (formData.subscriptionType === "Promo") {
          return {
            ...baseData,
            subsdate: formData.subscriptionStart
              ? formatDateForPromo(
                  new Date(
                    formData.subStartYear,
                    formData.subStartMonth - 1,
                    formData.subStartDay
                  )
                )
              : "",
            enddate: formData.subscriptionEnd
              ? formatDateForPromo(
                  new Date(
                    formData.subEndYear,
                    formData.subEndMonth - 1,
                    formData.subEndDay
                  )
                )
              : "",
            referralid: formData.referralid || 0,
            adddate: new Date().toLocaleString("en-US", {
              month: "numeric",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            }),
          };
        } else if (formData.subscriptionType === "Complimentary") {
          return {
            ...baseData,
            subsdate: formData.subscriptionStart
              ? formatDateForWMM(
                  new Date(
                    formData.subStartYear,
                    formData.subStartMonth - 1,
                    formData.subStartDay
                  )
                )
              : "",
            enddate: formData.subscriptionEnd
              ? formatDateForWMM(
                  new Date(
                    formData.subEndYear,
                    formData.subEndMonth - 1,
                    formData.subEndDay
                  )
                )
              : "",
            adddate: formatDateForWMM(new Date()),
          };
        } else {
          // WMM
          return {
            ...baseData,
            subsdate: formData.subscriptionStart
              ? formatDateForWMM(
                  new Date(
                    formData.subStartYear,
                    formData.subStartMonth - 1,
                    formData.subStartDay
                  )
                )
              : "",
            enddate: formData.subscriptionEnd
              ? formatDateForWMM(
                  new Date(
                    formData.subEndYear,
                    formData.subEndMonth - 1,
                    formData.subEndDay
                  )
                )
              : "",
            paymtref: roleSpecificData.paymtref || "",
            paymtamt: roleSpecificData.paymtamt || "",
            paymtmasses: roleSpecificData.paymtmasses || "",
            donorid: roleSpecificData.donorid || "",
            subsclass: formData.subsclass || "",
            adddate: formatDateForWMM(new Date()),
          };
        }
      };

      const subscriptionData = getSubscriptionSpecificData();

      // Map subscription types to their model types
      const modelType = {
        WMM: "WMM",
        Promo: "PROMO",
        Complimentary: "COMP",
      }[formData.subscriptionType];

      roleSubmissions.push({
        roleType: modelType,
        roleData: subscriptionData,
      });
    }

    // Determine service type based on actual role submissions, not just user role
    const getServiceFromRoleSubmissions = () => {
      if (roleSubmissions.length === 0) {
        return ""; // No service if no role submissions
      }

      // Check if any subscription type is in the role submissions
      const subscriptionTypes = roleSubmissions.map((sub) => sub.roleType);
      if (subscriptionTypes.includes("WMM")) return "WMM";
      if (subscriptionTypes.includes("PROMO")) return "PROMO";
      if (subscriptionTypes.includes("COMP")) return "COMP";

      // If no subscription types, return empty string
      return "";
    };

    const submissionData = {
      clientData: {
        ...clientData,
        service: getServiceFromRoleSubmissions(),
        subscriptionType:
          roleSubmissions.length > 0 ? formData.subscriptionType : "",
      },
      roleSubmissions,
      adddate: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };

    try {
      const response = await axios.put(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/clients/update/${
          rowData.id
        }`,
        submissionData
      );

      if (response.data) {
        // Backend already emits the WebSocket event, so we don't need to emit it again
        if (onEditSuccess) {
          onEditSuccess({
            id: rowData.id,
            ...clientData,
            services: [getServiceFromRoleSubmissions()],
            subscriptionType: formData.subscriptionType,
            wmmData: response.data.wmmData || [],
            hrgData: response.data.hrgData || [],
            fomData: response.data.fomData || [],
            calData: response.data.calData || [],
            promoData: response.data.promoData || [],
            complimentaryData: response.data.complimentaryData || [],
          });
        }
        onClose();
      }
    } catch (error) {
      console.error("Error updating client:", error);
    }
  };

  return (
    <>
      {onClose && onEditSuccess ? (
        // When rendered inside View component, just render the form without a modal
        <form onSubmit={handleSubmit} className="w-full">
          {/* Add form content here (fields, sections, etc.) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-4">
            {/* Personal Information */}
            <div className="p-4 border rounded-lg shadow-sm">
              <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                Personal Information
              </h2>
              <div className="space-y-3">
                <div className="mb-4">
                  <label className="block text-black text-xl mb-1">
                    Special Package:
                  </label>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="spack"
                      name="spack"
                      checked={formData.spack || false}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          spack: e.target.checked,
                        }))
                      }
                      className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label
                      htmlFor="spack"
                      className="ml-2 text-gray-700 text-base"
                    >
                      Mark as Special Package
                    </label>
                  </div>
                </div>
                <InputField
                  label="Title:"
                  id="title"
                  name="title"
                  value={formData.title || ""}
                  onChange={handleChange}
                  uppercase={true}
                  className="text-base"
                />
                <InputField
                  label="First Name:"
                  id="fname"
                  name="fname"
                  value={formData.fname || ""}
                  onChange={handleChange}
                  uppercase={true}
                  className="text-base"
                />
                <InputField
                  label="Middle Name:"
                  id="mname"
                  name="mname"
                  value={formData.mname || ""}
                  onChange={handleChange}
                  uppercase={true}
                  className="text-base"
                />
                <InputField
                  label="Last Name:"
                  id="lname"
                  name="lname"
                  value={formData.lname || ""}
                  onChange={handleChange}
                  uppercase={true}
                  className="text-base"
                />
                <InputField
                  label="Suffix:"
                  id="sname"
                  name="sname"
                  value={formData.sname}
                  onChange={handleChange}
                  uppercase={true}
                  className="text-base"
                />
                <div className="mb-2">
                  <label className="block text-black text-base mb-1">
                    Birth Date:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="relative">
                      <select
                        id="bdateMonth"
                        name="bdateMonth"
                        value={formData.bdateMonth}
                        onChange={handleChange}
                        className="w-full p-2 text-base border rounded-md border-gray-300"
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
                      id="bdateDay"
                      name="bdateDay"
                      value={formData.bdateDay}
                      onChange={handleChange}
                      placeholder="DD"
                      className="w-full p-2 text-base border rounded-md border-gray-300"
                      maxLength="2"
                    />
                    <input
                      type="text"
                      id="bdateYear"
                      name="bdateYear"
                      value={formData.bdateYear}
                      onChange={handleChange}
                      placeholder="YYYY"
                      className="w-full p-2 text-base border rounded-md border-gray-300"
                      maxLength="4"
                    />
                  </div>
                </div>
                <InputField
                  label="Company:"
                  id="company"
                  name="company"
                  value={formData.company || ""}
                  onChange={handleChange}
                  uppercase={true}
                  className="text-base"
                />
              </div>
            </div>

            {/* Address Information */}
            <div className="p-4 border rounded-lg shadow-sm">
              <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                Address Information
              </h2>
              <div className="space-y-3">
                <InputField
                  label="House/Building Number & Street Name:"
                  id="housestreet"
                  name="housestreet"
                  value={addressData.housestreet}
                  onChange={(e) =>
                    handleAddressChange("housestreet", e.target.value)
                  }
                  uppercase={true}
                  className="text-base"
                  autoComplete="off"
                />
                <InputField
                  label="Subdivision/Compound Name:"
                  id="subdivision"
                  name="subdivision"
                  value={addressData.subdivision}
                  onChange={(e) =>
                    handleAddressChange("subdivision", e.target.value)
                  }
                  uppercase={true}
                  className="text-base"
                  autoComplete="off"
                />
                <InputField
                  label="Barangay:"
                  id="barangay"
                  name="barangay"
                  value={addressData.barangay}
                  onChange={(e) =>
                    handleAddressChange("barangay", e.target.value)
                  }
                  uppercase={true}
                  className="text-base"
                  autoComplete="off"
                />
                {areas && (
                  <AreaForm
                    onAreaChange={handleAreaChange}
                    initialAreaData={{
                      acode: formData.acode || areaData.acode || "",
                      zipcode: formData.zipcode || areaData.zipcode || "",
                      city:
                        formData.area ||
                        areaData.city ||
                        addressData.city ||
                        "",
                    }}
                    areas={areas}
                  />
                )}
                <div className="mt-4">
                  <InputField
                    label="Address Preview:"
                    id="combinedAddress"
                    name="combinedAddress"
                    value={combinedAddress}
                    type="textarea"
                    onChange={handleCombinedAddressChange}
                    onFocus={handleCombinedAddressFocus}
                    onBlur={handleCombinedAddressBlur}
                    className="w-full h-[160px] p-2 border rounded-md text-base whitespace-pre-line"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="p-4 border rounded-lg shadow-sm">
              <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                Contact Information
              </h2>
              <div className="space-y-3">
                <InputField
                  label="Contact Numbers:"
                  id="contactnos"
                  name="contactnos"
                  value={formData.contactnos || ""}
                  onChange={handleChange}
                  className="text-base"
                />
                <InputField
                  label="Cell Number:"
                  id="cellno"
                  name="cellno"
                  value={formData.cellno || ""}
                  onChange={handleChange}
                  className="text-base"
                />
                <InputField
                  label="Office Number:"
                  id="ofcno"
                  name="ofcno"
                  value={formData.ofcno || ""}
                  onChange={handleChange}
                  className="text-base"
                />
                <InputField
                  label="Email:"
                  id="email"
                  name="email"
                  value={formData.email || ""}
                  onChange={handleChange}
                  type="email"
                  className="text-base"
                />
              </div>
            </div>

            {/* Group Information */}
            <div className="p-4 border rounded-lg shadow-sm">
              <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                Group Information
              </h2>
              <div className="space-y-3">
                <div className="relative w-full">
                  <label className="block text-black text-base mb-1">
                    Type:
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type || ""}
                    onChange={handleChange}
                    className="w-full p-2 text-base border rounded-md border-gray-300"
                  >
                    <option value="">Select a type</option>
                    {types.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.id} - {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative w-full">
                  <label className="block text-black text-base mb-1">
                    Group:
                  </label>
                  <select
                    id="group"
                    name="group"
                    value={formData.group || ""}
                    onChange={handleChange}
                    className="w-full p-2 text-base border rounded-md border-gray-300"
                  >
                    <option value="">Select a group</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.id} - {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                <InputField
                  label="Remarks:"
                  id="remarks"
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  type="textarea"
                  className="w-full p-2 border rounded-md text-base"
                />
              </div>
            </div>

            {/* WMM Subscription Information - Only show if user has WMM role */}
            {hasRole("WMM") && (
              <div className="p-4 border rounded-lg shadow-sm col-span-2">
                <h2
                  className={`${getSubscriptionTypeStyles()} p-2 font-bold text-center mb-2`}
                >
                  {formData.subscriptionType} Subscription
                </h2>

                {/* Mode toggle - Edit existing or Add new */}
                <div className="mb-4">
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => handleSubscriptionModeChange("edit")}
                      className={`px-3 py-1 rounded-md ${
                        subscriptionMode === "edit"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      Edit Existing Subscription
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSubscriptionModeChange("add")}
                      className={`px-3 py-1 rounded-md ${
                        subscriptionMode === "add"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      Renew
                    </button>
                  </div>

                  {subscriptionMode === "edit" &&
                    availableSubscriptions.length > 0 && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Select Subscription:
                        </label>
                        <select
                          value={
                            selectedSubscription
                              ? selectedSubscription.id ||
                                selectedSubscription._id
                              : ""
                          }
                          onChange={handleSelectedSubscriptionChange}
                          className="w-full p-2 border rounded-md text-base"
                        >
                          {availableSubscriptions.map((sub) => (
                            <option
                              key={sub.id || sub._id}
                              value={sub.id || sub._id}
                            >
                              {sub.subsdate
                                ? formatDateToMonthYear(parseDate(sub.subsdate))
                                : "Unknown"}{" "}
                              to{" "}
                              {sub.enddate
                                ? formatDateToMonthYear(parseDate(sub.enddate))
                                : "Unknown"}{" "}
                              - {sub.subsclass || "No Class"}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                </div>

                {/* Subscription Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column */}
                  <div>
                    {/* Subscription Classification - Only for WMM - FIRST */}
                    {formData.subscriptionType === "WMM" && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Subscription Classification:
                        </label>
                        <select
                          id="subsclass"
                          name="subsclass"
                          value={formData.subsclass}
                          onChange={handleChange}
                          className="w-full p-2 border rounded-md text-base"
                        >
                          <option value="">Select a classification</option>
                          {subclasses.map((subclass) => (
                            <option key={subclass.id} value={subclass.id}>
                              {subclass.name} ({subclass.id})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Start Date Fields - SECOND */}
                    <div className="mb-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subscription Start:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="relative">
                          <select
                            id="subStartMonth"
                            name="subStartMonth"
                            value={formData.subStartMonth || ""}
                            onChange={handleChange}
                            className="w-full p-2 text-base border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
                          id="subStartDay"
                          name="subStartDay"
                          value={formData.subStartDay || ""}
                          onChange={handleChange}
                          placeholder="DD"
                          className="w-full p-2 text-base border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          maxLength="2"
                        />
                        <input
                          type="text"
                          id="subStartYear"
                          name="subStartYear"
                          value={formData.subStartYear || ""}
                          onChange={handleChange}
                          placeholder="YYYY"
                          className="w-full p-2 text-base border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          maxLength="4"
                        />
                      </div>
                    </div>

                    {/* Subscription Duration - THIRD */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subscription Duration:
                      </label>
                      <select
                        id="subscriptionFreq"
                        name="subscriptionFreq"
                        value={formData.subscriptionFreq}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-md text-base"
                      >
                        <option value="">Select Subscription Duration</option>
                        <option value="6">6 Months</option>
                        <option value="11">1 Year</option>
                        <option value="22">2 Years</option>
                        <option value="others">Others</option>
                      </select>
                    </div>

                    {/* End Date - FOURTH */}
                    <div className="mb-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subscription End:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="relative">
                          <select
                            id="subEndMonth"
                            name="subEndMonth"
                            value={formData.subEndMonth || ""}
                            onChange={handleChange}
                            className="w-full p-2 text-base border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
                          id="subEndDay"
                          name="subEndDay"
                          value={formData.subEndDay || ""}
                          onChange={handleChange}
                          placeholder="DD"
                          className="w-full p-2 text-base border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          maxLength="2"
                        />
                        <input
                          type="text"
                          id="subEndYear"
                          name="subEndYear"
                          value={formData.subEndYear || ""}
                          onChange={handleChange}
                          placeholder="YYYY"
                          className="w-full p-2 text-base border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          maxLength="4"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div>
                    {/* Common fields for copies and calendar */}
                    <div className="flex space-x-4 mb-4">
                      <div className="flex flex-row items-center justify-center gap-2">
                        <label className="block text-lg font-medium leading-6 text-black">
                          Copies:
                        </label>
                        <input
                          id="copies"
                          name="copies"
                          value={roleSpecificData.copies}
                          onChange={handleRoleSpecificChange}
                          type="number"
                          min="1"
                          className="block w-[80px] rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-2 ring-gray-300 placeholder:text-gray-300 focus:ring-3 p-3 text-base"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="calendar"
                          className="text-lg font-medium"
                        >
                          Calendar Received:
                        </label>
                        <input
                          type="checkbox"
                          id="calendar"
                          name="calendar"
                          checked={roleSpecificData.calendar || false}
                          onChange={handleRoleSpecificChange}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Subscription Type Specific Fields */}
                    {formData.subscriptionType === "WMM" && (
                      <>
                        <div className="mt-4 space-y-4">
                          <InputField
                            label="Payment Reference:"
                            id="paymtref"
                            name="paymtref"
                            value={roleSpecificData.paymtref}
                            onChange={handleRoleSpecificChange}
                            className="w-full p-2 border rounded-md text-base"
                          />
                          <InputField
                            label="Payment Amount:"
                            id="paymtamt"
                            name="paymtamt"
                            value={roleSpecificData.paymtamt}
                            onChange={handleRoleSpecificChange}
                            className="w-full p-2 border rounded-md text-base"
                          />
                          <InputField
                            label="Payment Masses:"
                            id="paymtmasses"
                            name="paymtmasses"
                            value={roleSpecificData.paymtmasses}
                            onChange={handleRoleSpecificChange}
                            className="w-full p-2 border rounded-md text-base"
                          />
                          <div className="mb-4">
                            <label className="block text-black text-xl mb-1">
                              Donor:
                            </label>
                            <div className="donor-add-container">
                              <input
                                type="text"
                                name="donorid"
                                value={roleSpecificData.donorid}
                                onChange={handleRoleSpecificChange}
                                className="w-full p-2 border rounded-md text-base"
                                placeholder="Enter donor ID"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {formData.subscriptionType === "Promo" && (
                      <div className="mt-4">
                        <InputField
                          label="Referral ID:"
                          id="referralid"
                          name="referralid"
                          value={formData.referralid}
                          onChange={handleChange}
                          className="w-full p-2 border rounded-md text-base"
                          placeholder="Enter referral ID"
                        />
                      </div>
                    )}

                    {/* Remarks field - Common for all types */}
                    <div className="mt-4">
                      <InputField
                        label="Remarks:"
                        id="remarks"
                        name="remarks"
                        value={roleSpecificData.remarks}
                        onChange={handleRoleSpecificChange}
                        type="textarea"
                        className="w-full p-2 border rounded-md text-base"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Role-specific sections for HRG, FOM, CAL */}
            {(hasRole("HRG") || hasRole("FOM") || hasRole("CAL")) && (
              <div className="p-4 border rounded-lg shadow-sm col-span-2">
                <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                  Role-Specific Information
                </h2>

                {/* Role toggle buttons */}
                {hasRole("HRG") && hasRole("FOM") && hasRole("CAL") && (
                  <div className="flex mb-4 mt-2">
                    <div className="flex w-full bg-gray-100 rounded-lg overflow-hidden">
                      {hasRole("HRG") && (
                        <button
                          type="button"
                          className={`flex-1 py-2.5 text-sm font-medium text-center ${
                            selectedRole === "HRG"
                              ? "bg-blue-600 text-white shadow-md"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          } transition-colors`}
                          onClick={() => handleRoleToggle("HRG")}
                        >
                          HRG
                        </button>
                      )}
                      {hasRole("FOM") && (
                        <button
                          type="button"
                          className={`flex-1 py-2.5 text-sm font-medium text-center ${
                            selectedRole === "FOM"
                              ? "bg-blue-600 text-white shadow-md"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          } transition-colors`}
                          onClick={() => handleRoleToggle("FOM")}
                        >
                          FOM
                        </button>
                      )}
                      {hasRole("CAL") && (
                        <button
                          type="button"
                          className={`flex-1 py-2.5 text-sm font-medium text-center ${
                            selectedRole === "CAL"
                              ? "bg-blue-600 text-white shadow-md"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          } transition-colors`}
                          onClick={() => handleRoleToggle("CAL")}
                        >
                          CAL
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Mode toggle - Edit existing or Add new */}
                <div className="mb-4">
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setRoleRecordMode("edit")}
                      className={`px-3 py-1 rounded-md ${
                        roleRecordMode === "edit"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      Edit Existing Subscription
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleRecordMode("add")}
                      className={`px-3 py-1 rounded-md ${
                        roleRecordMode === "add"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      Add New Subscription
                    </button>
                  </div>

                  {/* Record selection for editing */}
                  {roleRecordMode === "edit" && (
                    <div className="mb-4">
                      {selectedRole === "HRG" && hrgRecords.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select HRG Record:
                          </label>
                          <select
                            value={
                              selectedHrgRecord
                                ? selectedHrgRecord.id ||
                                  selectedHrgRecord._id ||
                                  ""
                                : ""
                            }
                            onChange={(e) => {
                              const record = hrgRecords.find(
                                (r) => String(r.id || r._id) === e.target.value
                              );
                              if (record) {
                                setSelectedHrgRecord(record);
                                setRoleSpecificData({
                                  ...record,
                                });
                              }
                            }}
                            className="w-full p-2 border rounded-md text-base"
                          >
                            {hrgRecords.map((record) => (
                              <option
                                key={record.id || record._id}
                                value={record.id || record._id}
                              >
                                {record.recvdate
                                  ? formatDateToMonthYear(
                                      parseDate(record.recvdate)
                                    )
                                  : "Unknown"}
                                {record.paymtamt
                                  ? ` - Php ${record.paymtamt}`
                                  : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {selectedRole === "FOM" && fomRecords.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select FOM Record:
                          </label>
                          <select
                            value={
                              selectedFomRecord
                                ? selectedFomRecord.id ||
                                  selectedFomRecord._id ||
                                  ""
                                : ""
                            }
                            onChange={(e) => {
                              const record = fomRecords.find(
                                (r) => String(r.id || r._id) === e.target.value
                              );
                              if (record) {
                                setSelectedFomRecord(record);
                                setRoleSpecificData({
                                  ...record,
                                });
                              }
                            }}
                            className="w-full p-2 border rounded-md text-base"
                          >
                            {fomRecords.map((record) => (
                              <option
                                key={record.id || record._id}
                                value={record.id || record._id}
                              >
                                {record.recvdate
                                  ? formatDateToMonthYear(
                                      parseDate(record.recvdate)
                                    )
                                  : "Unknown"}
                                {record.paymtamt
                                  ? ` - Php ${record.paymtamt}`
                                  : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {selectedRole === "CAL" && calRecords.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select CAL Record:
                          </label>
                          <select
                            value={
                              selectedCalRecord
                                ? selectedCalRecord.id ||
                                  selectedCalRecord._id ||
                                  ""
                                : ""
                            }
                            onChange={(e) => {
                              const record = calRecords.find(
                                (r) => String(r.id || r._id) === e.target.value
                              );
                              if (record) {
                                setSelectedCalRecord(record);
                                setRoleSpecificData({
                                  ...record,
                                });
                              }
                            }}
                            className="w-full p-2 border rounded-md text-base"
                          >
                            {calRecords.map((record) => (
                              <option
                                key={record.id || record._id}
                                value={record.id || record._id}
                              >
                                {record.recvdate
                                  ? formatDateToMonthYear(
                                      parseDate(record.recvdate)
                                    )
                                  : "Unknown"}
                                {record.caltype ? ` - ${record.caltype}` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Role-specific form fields */}
                {selectedRole === "HRG" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <InputField
                        label="Received Date:"
                        id="recvdate"
                        name="recvdate"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.recvdate || ""
                            : newRoleData.recvdate || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  recvdate: e.target.value,
                                })
                        }
                        className="text-base"
                      />

                      <InputField
                        label="Renewal Date:"
                        id="renewdate"
                        name="renewdate"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.renewdate || ""
                            : newRoleData.renewdate || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  renewdate: e.target.value,
                                })
                        }
                        className="text-base"
                      />

                      <div className="flex items-center mt-2 mb-2">
                        <Button
                          className="bg-blue-500 text-white text-xs py-1 px-2 rounded"
                          type="button"
                          onClick={handleRenewDateToday}
                        >
                          Set Renewal to Today
                        </Button>
                      </div>

                      <InputField
                        label="Campaign Date:"
                        id="campaigndate"
                        name="campaigndate"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.campaigndate || ""
                            : newRoleData.campaigndate || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  campaigndate: e.target.value,
                                })
                        }
                        className="text-base"
                      />
                    </div>

                    <div>
                      <InputField
                        label="Payment Reference:"
                        id="paymtref"
                        name="paymtref"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.paymtref || ""
                            : newRoleData.paymtref || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  paymtref: e.target.value,
                                })
                        }
                        className="text-base"
                      />

                      <InputField
                        label="Payment Amount:"
                        id="paymtamt"
                        name="paymtamt"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.paymtamt || ""
                            : newRoleData.paymtamt || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  paymtamt: e.target.value,
                                })
                        }
                        className="text-base"
                      />

                      <div className="mb-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            id="unsubscribe"
                            name="unsubscribe"
                            checked={
                              roleRecordMode === "edit"
                                ? roleSpecificData.unsubscribe || false
                                : newRoleData.unsubscribe || false
                            }
                            onChange={
                              roleRecordMode === "edit"
                                ? handleRoleSpecificChange
                                : (e) =>
                                    setNewRoleData({
                                      ...newRoleData,
                                      unsubscribe: e.target.checked,
                                    })
                            }
                            className="mr-2"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Unsubscribe
                          </span>
                        </label>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Remarks:
                        </label>
                        <textarea
                          id="remarks"
                          name="remarks"
                          value={
                            roleRecordMode === "edit"
                              ? roleSpecificData.remarks || ""
                              : newRoleData.remarks || ""
                          }
                          onChange={
                            roleRecordMode === "edit"
                              ? handleRoleSpecificChange
                              : (e) =>
                                  setNewRoleData({
                                    ...newRoleData,
                                    remarks: e.target.value,
                                  })
                          }
                          className="w-full p-2 border rounded-md text-base"
                          rows="3"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedRole === "FOM" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <InputField
                        label="Received Date:"
                        id="recvdate"
                        name="recvdate"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.recvdate || ""
                            : newRoleData.recvdate || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  recvdate: e.target.value,
                                })
                        }
                        className="text-base"
                      />

                      <InputField
                        label="Payment Reference:"
                        id="paymtref"
                        name="paymtref"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.paymtref || ""
                            : newRoleData.paymtref || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  paymtref: e.target.value,
                                })
                        }
                        className="text-base"
                      />
                    </div>

                    <div>
                      <InputField
                        label="Payment Amount:"
                        id="paymtamt"
                        name="paymtamt"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.paymtamt || ""
                            : newRoleData.paymtamt || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  paymtamt: e.target.value,
                                })
                        }
                        className="text-base"
                      />

                      <InputField
                        label="Payment Form:"
                        id="paymtform"
                        name="paymtform"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.paymtform || ""
                            : newRoleData.paymtform || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  paymtform: e.target.value,
                                })
                        }
                        className="text-base"
                      />

                      <div className="mb-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            id="unsubscribe"
                            name="unsubscribe"
                            checked={
                              roleRecordMode === "edit"
                                ? roleSpecificData.unsubscribe || false
                                : newRoleData.unsubscribe || false
                            }
                            onChange={
                              roleRecordMode === "edit"
                                ? handleRoleSpecificChange
                                : (e) =>
                                    setNewRoleData({
                                      ...newRoleData,
                                      unsubscribe: e.target.checked,
                                    })
                            }
                            className="mr-2"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Unsubscribe
                          </span>
                        </label>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Remarks:
                        </label>
                        <textarea
                          id="remarks"
                          name="remarks"
                          value={
                            roleRecordMode === "edit"
                              ? roleSpecificData.remarks || ""
                              : newRoleData.remarks || ""
                          }
                          onChange={
                            roleRecordMode === "edit"
                              ? handleRoleSpecificChange
                              : (e) =>
                                  setNewRoleData({
                                    ...newRoleData,
                                    remarks: e.target.value,
                                  })
                          }
                          className="w-full p-2 border rounded-md text-base"
                          rows="3"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedRole === "CAL" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <InputField
                        label="Received Date:"
                        id="recvdate"
                        name="recvdate"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.recvdate || ""
                            : newRoleData.recvdate || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  recvdate: e.target.value,
                                })
                        }
                        className="text-base"
                      />

                      <InputField
                        label="Calendar Type:"
                        id="caltype"
                        name="caltype"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.caltype || ""
                            : newRoleData.caltype || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  caltype: e.target.value,
                                })
                        }
                        className="text-base"
                      />

                      <InputField
                        label="Calendar Quantity:"
                        id="calqty"
                        name="calqty"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.calqty || ""
                            : newRoleData.calqty || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  calqty: e.target.value,
                                })
                        }
                        className="text-base"
                      />

                      <InputField
                        label="Calendar Amount:"
                        id="calamt"
                        name="calamt"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.calamt || ""
                            : newRoleData.calamt || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  calamt: e.target.value,
                                })
                        }
                        className="text-base"
                      />
                    </div>

                    <div>
                      <InputField
                        label="Payment Reference:"
                        id="paymtref"
                        name="paymtref"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.paymtref || ""
                            : newRoleData.paymtref || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  paymtref: e.target.value,
                                })
                        }
                        className="text-base"
                      />

                      <InputField
                        label="Payment Amount:"
                        id="paymtamt"
                        name="paymtamt"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.paymtamt || ""
                            : newRoleData.paymtamt || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  paymtamt: e.target.value,
                                })
                        }
                        className="text-base"
                      />

                      <InputField
                        label="Payment Form:"
                        id="paymtform"
                        name="paymtform"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.paymtform || ""
                            : newRoleData.paymtform || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  paymtform: e.target.value,
                                })
                        }
                        className="text-base"
                      />

                      <InputField
                        label="Payment Date:"
                        id="paymtdate"
                        name="paymtdate"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.paymtdate || ""
                            : newRoleData.paymtdate || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  paymtdate: e.target.value,
                                })
                        }
                        className="text-base"
                      />

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Remarks:
                        </label>
                        <textarea
                          id="remarks"
                          name="remarks"
                          value={
                            roleRecordMode === "edit"
                              ? roleSpecificData.remarks || ""
                              : newRoleData.remarks || ""
                          }
                          onChange={
                            roleRecordMode === "edit"
                              ? handleRoleSpecificChange
                              : (e) =>
                                  setNewRoleData({
                                    ...newRoleData,
                                    remarks: e.target.value,
                                  })
                          }
                          className="w-full p-2 border rounded-md text-base"
                          rows="3"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 border-t flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={`px-4 py-2 text-white rounded-md text-base flex items-center gap-2 ${
                isSubmitting
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      ) : (
        // When rendered as a standalone component, use a modal
        <Modal isOpen={showModal} onClose={closeModal} title="Edit Client">
          <form onSubmit={handleSubmit}>
            {/* Rest of the component content */}
            <div className="mt-8 pt-4 border-t flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className={`px-4 py-2 text-white rounded-md text-base flex items-center gap-2 ${
                  isSubmitting
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};

export default Edit;
