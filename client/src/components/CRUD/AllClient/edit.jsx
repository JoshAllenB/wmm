import { useUser } from "../../../utils/Hooks/userProvider";
import { roleConfigs } from "../../../utils/roleConfigs";
import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";
import AddressForm from "../../../utils/addressLogic";
import AreaForm from "../../../utils/areaform";
import InputField from "../input";
import { fetchSubclasses, fetchTypes } from "../../Table/Data/utilData";

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
  if (typeof dateString === 'string' && dateString.includes('/')) {
    const parts = dateString.split('/');
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
  const [formData, setFormData] = useState({
    lname: "",
    fname: "",
    mname: "",
    sname: "",
    title: "",
    bdate: "",
    company: "",
    address: "",
    zipcode: "",
    area: "",
    acode: "",
    contactnos: "",
    cellno: "",
    ofcno: "",
    email: "",
    type: "",
    group: "",
    remarks: "",
    copies: "1",
    subsclass: "",
    subscriptionFreq: "",
    subscriptionStart: "",
    subscriptionEnd: "",
  });

  const [addressData, setAddressData] = useState({
    street1: "",
    street2: "",
    province: "",
    city: "",
    municipality: "",
    subMunicipality: "",
    barangay: "",
  });

  const [combinedAddress, setCombinedAddress] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [roleSpecificData, setRoleSpecificData] = useState({});
  const [areaData, setAreaData] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [renewalType, setRenewalType] = useState("current");
  const [lastSubscriptionEnd, setLastSubscriptionEnd] = useState(null);
  const [subscriptionFreq, setSubscriptionFreq] = useState("");
  const [groups, setGroups] = useState([]);
  const [subclasses, setSubclasses] = useState([]);
  const [types, setTypes] = useState([]);
  const [selectedRole, setSelectedRole] = useState("HRG"); // Default to HRG

  // Track if we're editing an existing subscription or adding a new one
  const [subscriptionMode, setSubscriptionMode] = useState("edit");
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [availableSubscriptions, setAvailableSubscriptions] = useState([]);
  const [newSubscriptionData, setNewSubscriptionData] = useState({
    subsdate: formatDateToMMDDYY(new Date()),
    enddate: "",
    subsclass: "",
    copies: 1,
    subsyear: 1,
    remarks: "",
    paymtamt: 0,
    paymtref: "",
    paymtmasses: 0,
    calendar: false,
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

  useEffect(() => {
    if (rowData) {
      setFormData({
        ...rowData,
        // Initialize subscription-related fields
        subscriptionFreq: rowData.subscriptionFreq || "",
        subscriptionStart: rowData.subsdate ? formatDateToMMDDYY(parseDate(rowData.subsdate)) : "",
        subscriptionEnd: rowData.enddate ? formatDateToMMDDYY(parseDate(rowData.enddate)) : "",
      });
      setShowModal(true);

      const addressParts = rowData.address ? rowData.address.split(", ") : [];
      setAddressData({
        street1: addressParts[0] || "",
        street2: addressParts[1] || "",
        barangay: addressParts[2] || "",
        city: addressParts[3] || "",
        province: addressParts[4] || "",
      });

      const userRole = Object.keys(roleConfigs).find((role) => hasRole(role));

      if (userRole && roleConfigs[userRole]) {
        const initialRoleData = Object.keys(
          roleConfigs[userRole].groupFields
        ).reduce((acc, field) => {
          acc[field] = rowData[field] || ""; // Prefill with existing data
          return acc;
        }, {});
        setRoleSpecificData(initialRoleData);
      }

      if (hasRole("WMM")) {
        // Get subscription records from wmmData
        const subscriptionRecords = rowData.wmmData?.records || [];
        
        if (subscriptionRecords.length > 0) {
          // Clean dates in subscription records
          const cleanedSubscriptions = subscriptionRecords.map(record => ({
            ...record,
            subsdate: record.subsdate ? formatDateToMMDDYY(parseDate(record.subsdate)) : "",
            enddate: record.enddate ? formatDateToMMDDYY(parseDate(record.enddate)) : "",
            renewdate: record.renewdate ? formatDateToMMDDYY(parseDate(record.renewdate)) : "",
          }));
          
          // Get all subscription records and sort them by date (newest first)
          const subscriptions = [...cleanedSubscriptions].sort((a, b) => {
            const dateA = parseDate(a.subsdate) || new Date(0);
            const dateB = parseDate(b.subsdate) || new Date(0);
            return dateB - dateA;
          });

          setAvailableSubscriptions(subscriptions);

          // Set the most recent subscription as the selected one
          const latestSubscription = subscriptions[0];
          setSelectedSubscription(latestSubscription);

          const wmmData = {
            id: latestSubscription.id,
            subsdate: latestSubscription.subsdate || "",
            enddate: latestSubscription.enddate || "",
            renewdate: latestSubscription.renewdate || "",
            subsyear: latestSubscription.subsyear || 0,
            copies: latestSubscription.copies || 1,
            paymtamt: latestSubscription.paymtamt || 0,
            paymtmasses: latestSubscription.paymtmasses || 0,
            calendar: latestSubscription.calendar || false,
            subsclass: latestSubscription.subsclass || "",
            donorid: latestSubscription.donorid || 0,
            paymtref: latestSubscription.paymtref || "",
            remarks: latestSubscription.remarks || "",
          };
          setRoleSpecificData(wmmData);
        } else {
          // No subscription records, initialize with empty data
          const wmmData = {
            subsdate: rowData.subsdate ? formatDateToMMDDYY(parseDate(rowData.subsdate)) : "",
            enddate: rowData.enddate ? formatDateToMMDDYY(parseDate(rowData.enddate)) : "",
            renewdate: rowData.renewdate ? formatDateToMMDDYY(parseDate(rowData.renewdate)) : "",
            subsyear: rowData.subsyear || 0,
            copies: rowData.copies || 1,
            paymtamt: rowData.paymtamt || 0,
            paymtmasses: rowData.paymtmasses || 0,
            calendar: rowData.calendar || false,
            subsclass: rowData.subsclass || "",
            donorid: rowData.donorid || 0,
            paymtref: rowData.paymtref || "",
            remarks: rowData.remarks || "",
          };
          setRoleSpecificData(wmmData);
        }
      } else if (hasRole("HRG")) {
        const hrgData = {
          recvdate: rowData.recvdate ? formatDateToMMDDYY(parseDate(rowData.recvdate)) : "",
          renewdate: rowData.renewdate ? formatDateToMMDDYY(parseDate(rowData.renewdate)) : "",
          campaigndate: rowData.campaigndate ? formatDateToMMDDYY(parseDate(rowData.campaigndate)) : "",
          paymtref: rowData.paymtref || "",
          paymtamt: rowData.paymtamt || 0,
          unsubscribe: rowData.unsubscribe || false,
        };
        setRoleSpecificData(hrgData);
      } else if (hasRole("FOM")) {
        const fomData = {
          recvdate: rowData.recvdate || "",
          paymtamt: rowData.paymtamt || 0,
          paymtform: rowData.paymtform || "",
          paymtref: rowData.paymtref || "",
          unsubscribe: rowData.unsubscribe || false,
        };
        setRoleSpecificData(fomData);
      } else if (hasRole("CAL")) {
        const calData = {
          recvdate: rowData.recvdate || "",
          caltype: rowData.caltype || "",
          calqty: rowData.calqty || "",
          calamt: rowData.calamt || "",
          paymtref: rowData.paymtref || "",
          paymtamt: rowData.paymtamt || 0,
          paymtform: rowData.paymtform || "",
          paymtdate: rowData.paymtdate || "",
        };
        setRoleSpecificData(calData);
      }
    }
  }, [rowData, hasRole]);

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
      const start = parseDate(startDate);
      if (!start || isNaN(start.getTime())) {
        throw new Error("Invalid start date");
      }

      // Create a new date object and add months
      const endDate = new Date(start);
      endDate.setMonth(endDate.getMonth() + parseInt(monthsToAdd));
      
      // Ensure time component is zeroed out
      endDate.setHours(0, 0, 0, 0);

      // Adjust for month length differences
      // If the start date is the last day of the month, make the end date the last day of its month
      const startDay = start.getDate();
      const endDay = endDate.getDate();

      if (startDay !== endDay) {
        endDate.setDate(0); // Set to the last day of the previous month
      }

      return endDate;
    } catch (error) {
      console.error("Error calculating end date:", error);
      return null;
    }
  };

  const handleChange = async (e) => {
    const { name, value } = e.target;

    if (name === "subscriptionFreq") {
      const monthsToAdd = parseInt(value);

      // Use subsdate from roleSpecificData or today if not available
      const startDate = roleSpecificData.subsdate
        ? new Date(roleSpecificData.subsdate)
        : new Date();

      const subscriptionStart = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        1,
        0,
        0,
        0,
        0
      );
      // Calculate subscription end and reset it to the 1st of its respective month
      const rawEndDate = calculateEndMonth(subscriptionStart, monthsToAdd);
      const subscriptionEnd = new Date(
        rawEndDate.getFullYear(),
        rawEndDate.getMonth(),
        1, // Set day to 1
        0,
        0,
        0,
        0
      );
      // Update `formData` and `roleSpecificData` states for dates
      setFormData({
        ...formData,
        subscriptionFreq: value,
        subscriptionStart: formatDateToMMDDYY(subscriptionStart),
        subscriptionEnd: formatDateToMMDDYY(subscriptionEnd),
      });

      setRoleSpecificData((prev) => ({
        ...prev,
        subsdate: formatDateToMMDDYY(subscriptionStart),
        enddate: formatDateToMMDDYY(subscriptionEnd),
        copies: prev.copies || 1,
      }));
      return;
    }

    if (name === "renewalType") {
      setRenewalType(value);
      setFormData((prev) => ({
        ...prev,
        subscriptionFreq: "",
        subscriptionStart: "",
        subscriptionEnd: "",
      }));
      return;
    }

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleAddressChange = (type, value) => {
    setAddressData((prev) => ({
      ...prev,
      [type]: value,
    }));
  };

  const updateCombinedAddress = (addressData) => {
    const addressComponents = [
      addressData.street1,
      addressData.street2,
      formData.area,
      addressData.barangay,
      addressData.city ? addressData.city.replace(/^City of\s+/i, "") : "", // Remove "City of" if it exists
      addressData.province,
    ];
    const address = addressComponents.filter(Boolean).join(", ");
    setCombinedAddress(address);
  };

  useEffect(() => {
    updateCombinedAddress(addressData);
  }, [addressData]);

  const handleCitySelect = (cityname) => {
    setSelectedCity(cityname);
  };

  const handleAreaChange = (name, value) => {
    // Update the area data with the new value
    setAreaData((prev) => ({ 
      ...prev, 
      [name]: value 
    }));
    
    // If zipcode is updated, also update it in the formData to keep states in sync
    if (name === "zipcode") {
      setFormData(prev => ({
        ...prev,
        zipcode: value ? String(value) : ""
      }));
    }
  };

  const handleRoleSpecificChange = (e) => {
    const { name, value, type, checked } = e.target;
    setRoleSpecificData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
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

    // Reset role-specific data
    let roleData = {};

    // Fetch role-specific data from rowData based on the selected role
    if (role === "HRG" && rowData.hrgData) {
      roleData = {
        recvdate: rowData.hrgData.recvdate || "",
        renewdate: rowData.hrgData.renewdate || "",
        campaigndate: rowData.hrgData.campaigndate || "",
        paymtref: rowData.hrgData.paymtref || "",
        paymtamt: rowData.hrgData.paymtamt || 0,
        unsubscribe: rowData.hrgData.unsubscribe || false,
      };
    } else if (role === "FOM" && rowData.fomData) {
      const fomData = rowData.fomData[0] || {}; // Assuming fomData is an array
      roleData = {
        recvdate: fomData.recvdate || "",
        paymtamt: fomData.paymtamt || 0,
        paymtform: fomData.paymtform || "",
        paymtref: fomData.paymtref || "",
        unsubscribe: fomData.unsubscribe || false,
      };
    } else if (role === "CAL" && rowData.calData) {
      roleData = {
        recvdate: rowData.calData.recvdate || "",
        caltype: rowData.calData.caltype || "",
        calqty: rowData.calData.calqty || "",
        calamt: rowData.calData.calamt || "",
        paymtref: rowData.calData.paymtref || "",
        paymtamt: rowData.calData.paymtamt || 0,
        paymtform: rowData.calData.paymtform || "",
        paymtdate: rowData.calData.paymtdate || "",
      };
    }

    setRoleSpecificData(roleData);
  };

  const handleNewSubscriptionChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewSubscriptionData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubscriptionModeChange = (mode) => {
    setSubscriptionMode(mode);

    if (mode === "edit" && selectedSubscription) {
      // Switch to edit mode and load the selected subscription
      setRoleSpecificData({
        id: selectedSubscription.id,
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
        remarks: selectedSubscription.remarks || "",
      });
    } else if (mode === "add") {
      // Switch to add mode and initialize with new subscription data
      setRoleSpecificData(newSubscriptionData);
    }
  };

  const handleSelectedSubscriptionChange = (e) => {
    const subscriptionId = parseInt(e.target.value);
    const subscription = availableSubscriptions.find(
      (sub) => sub.id === subscriptionId
    );

    if (subscription) {
      // Clean any dates before setting them in state
      const cleanSubscription = {
        ...subscription,
        subsdate: subscription.subsdate ? formatDateToMMDDYY(parseDate(subscription.subsdate)) : "",
        enddate: subscription.enddate ? formatDateToMMDDYY(parseDate(subscription.enddate)) : "",
        renewdate: subscription.renewdate ? formatDateToMMDDYY(parseDate(subscription.renewdate)) : "",
      };
      
      setSelectedSubscription(cleanSubscription);

      // Update role-specific data with selected subscription
      setRoleSpecificData({
        id: subscription.id,
        subsdate: cleanSubscription.subsdate,
        enddate: cleanSubscription.enddate,
        renewdate: cleanSubscription.renewdate,
        subsyear: subscription.subsyear || 0,
        copies: subscription.copies || 1,
        paymtamt: subscription.paymtamt || 0,
        paymtmasses: subscription.paymtmasses || 0,
        calendar: subscription.calendar || false,
        subsclass: subscription.subsclass || "",
        donorid: subscription.donorid || 0,
        remarks: subscription.remarks || "",
      });
    }
  };

  const handleSubscriptionFreqChange = (e) => {
    const { value } = e.target;
    const monthsToAdd = parseInt(value);

    // Use current start date or today
    let startDate;
    if (subscriptionMode === "edit" && roleSpecificData.subsdate) {
      startDate = parseDate(roleSpecificData.subsdate);
    } else if (subscriptionMode === "add" && newSubscriptionData.subsdate) {
      startDate = parseDate(newSubscriptionData.subsdate);
    } else {
      startDate = new Date();
    }

    // Ensure day is set to 1st of month
    startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    startDate.setHours(0, 0, 0, 0);

    // Calculate end date
    const rawEndDate = calculateEndMonth(startDate, monthsToAdd);
    const endDate = new Date(
      rawEndDate.getFullYear(),
      rawEndDate.getMonth(),
      1
    );
    endDate.setHours(0, 0, 0, 0);
    
    // Format dates
    const formattedStart = formatDateToMMDDYY(startDate);
    const formattedEnd = formatDateToMMDDYY(endDate);

    // Update the appropriate state
    if (subscriptionMode === "edit") {
      setRoleSpecificData((prev) => ({
        ...prev,
        subsdate: formattedStart,
        enddate: formattedEnd,
        subsyear: Math.round(monthsToAdd / 12),
      }));
    } else {
      setNewSubscriptionData((prev) => ({
        ...prev,
        subsdate: formattedStart,
        enddate: formattedEnd,
        subsyear: Math.round(monthsToAdd / 12),
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (hasRole("WMM") && subscriptionMode === "add") {
      // Validate new subscription data
      const { isValid, errors } = validateNewSubscription(newSubscriptionData);

      if (!isValid) {
        setValidationErrors(errors);
        return; // Stop submission if validation fails
      }
    }

    // Clear any existing validation errors
    setValidationErrors({});

    const addressComponents = [
      addressData.street1,
      addressData.street2,
      formData.area,
      addressData.barangay,
      addressData.city?.replace(/^City of\s+/i, ""), // Remove "City of" prefix
      addressData.province,
    ];

    const {
      subscriptionFreq,
      subscriptionStart,
      subscriptionEnd,
      subsclass,
      ...baseClientData
    } = formData;

    const updatedClientData = {
      ...baseClientData,
      address: combinedAddress,
      ...areaData, // Include area data in clientData
    };

    try {
      if (hasRole("WMM") && subscriptionMode === "add") {
        // When adding a new subscription, send a separate request specifically for adding a subscription

        // Create current timestamp
        const timestamp = new Date()
          .toLocaleString("en-US", {
            month: "numeric",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          })
          .replace(",", "");

        // Clean and format the dates to ensure no time components
        const cleanSubsdate = newSubscriptionData.subsdate 
          ? formatDateToMMDDYY(parseDate(newSubscriptionData.subsdate))
          : formatDateToMMDDYY(new Date());
          
        const cleanEnddate = newSubscriptionData.enddate
          ? formatDateToMMDDYY(parseDate(newSubscriptionData.enddate))
          : "";

        // Prepare new subscription data
        const newSubscriptionRequest = {
          clientid: parseInt(rowData.id),
          subsdate: cleanSubsdate,
          enddate: cleanEnddate,
          subsclass: newSubscriptionData.subsclass,
          copies: parseInt(newSubscriptionData.copies) || 1,
          subsyear: parseInt(newSubscriptionData.subsyear) || 1,
          remarks: newSubscriptionData.remarks || "",
          paymtamt: parseFloat(newSubscriptionData.paymtamt) || 0,
          paymtmasses: parseInt(newSubscriptionData.paymtmasses) || 0,
          calendar: newSubscriptionData.calendar || false,
          paymtref: newSubscriptionData.paymtref || "",
          // Add the current date as the add date
          adddate: timestamp,
        };


        // Make a direct call to create a new WMM entry
        const subscriptionResponse = await axios.post(
          `http://${import.meta.env.VITE_IP_ADDRESS}:3001/wmm/add`,
          newSubscriptionRequest,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }
        );

        if (subscriptionResponse.data && subscriptionResponse.data.id) {

          // Now update the client data separately
          const clientUpdateResponse = await axios.put(
            `http://${import.meta.env.VITE_IP_ADDRESS}:3001/clients/update/${
              rowData.id
            }`,
            {
              clientData: updatedClientData,
            },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
              },
            }
          );

          if (clientUpdateResponse.data.success) {
            onEditSuccess({
              ...updatedClientData,
              // Add new subscription data to the response so the UI updates
              wmmData: {
                records: [
                  ...(rowData.wmmData?.records || []),
                  subscriptionResponse.data,
                ],
              },
            });
            closeModal();
          }
        }
      } else {
        // Regular update for editing existing subscriptions or other roles
        let submissionData = {
          clientData: updatedClientData,
          roleType: selectedRole,
          roleData: {},
        };

        if (hasRole("WMM") && subscriptionMode === "edit") {
          // Clean and format dates to ensure no time components
          const cleanSubsdate = roleSpecificData.subsdate
            ? formatDateToMMDDYY(parseDate(roleSpecificData.subsdate))
            : formatDateToMMDDYY(new Date());
            
          const cleanEnddate = roleSpecificData.enddate
            ? formatDateToMMDDYY(parseDate(roleSpecificData.enddate))
            : "";

          // Edit existing subscription
          submissionData.roleType = "WMM";
          submissionData.roleData = {
            ...roleSpecificData,
            subsdate: cleanSubsdate,
            enddate: cleanEnddate,
            subsclass: roleSpecificData.subsclass || formData.subsclass,
            copies: roleSpecificData.copies || 1,
            id: selectedSubscription?.id, // Include the subscription ID for reference
          };

          // Calculate subsyear based on subsdate and enddate if not provided
          if (
            !roleSpecificData.subsyear &&
            roleSpecificData.subsdate &&
            roleSpecificData.enddate
          ) {
            try {
              const startDate = parseDate(roleSpecificData.subsdate);
              const endDate = parseDate(roleSpecificData.enddate);
              const monthsApart =
                (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                endDate.getMonth() -
                startDate.getMonth();
              submissionData.roleData.subsyear = Math.round(monthsApart / 12);
            } catch (error) {
              console.error("Error calculating subscription year:", error);
            }
          }
        } else if (hasRole("HRG")) {
          submissionData.roleType = "HRG";
          submissionData.roleData = {
            recvdate: roleSpecificData.recvdate,
            renewdate: roleSpecificData.renewdate,
            campaigndate: roleSpecificData.campaigndate,
            paymtref: roleSpecificData.paymtref,
            paymtamt: roleSpecificData.paymtamt,
            unsubscribe: roleSpecificData.unsubscribe,
          };
        } else if (hasRole("FOM")) {
          submissionData.roleType = "FOM";
          submissionData.roleData = {
            recvdate: roleSpecificData.recvdate,
            paymtamt: roleSpecificData.paymtamt,
            paymtform: roleSpecificData.paymtform,
            paymtref: roleSpecificData.paymtref,
            unsubscribe: roleSpecificData.unsubscribe,
          };
        } else if (hasRole("CAL")) {
          submissionData.roleType = "CAL";
          submissionData.roleData = {
            recvdate: roleSpecificData.recvdate,
            caltype: roleSpecificData.caltype,
            calqty: roleSpecificData.calqty,
            calamt: roleSpecificData.calamt,
            paymtref: roleSpecificData.paymtref,
            paymtamt: roleSpecificData.paymtamt,
            paymtform: roleSpecificData.paymtform,
            paymtdate: roleSpecificData.paymtdate,
          };
        }


        const response = await axios.put(
          `http://${import.meta.env.VITE_IP_ADDRESS}:3001/clients/update/${
            rowData.id
          }`,
          submissionData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }
        );

        if (response.data.success) {
          onEditSuccess(updatedClientData);
          closeModal();
        }
      }
    } catch (error) {
      console.error("Error processing client data:", error);
    }
  };

  return (
    <Modal isOpen={showModal} onClose={closeModal}>
      <h2 className="text-xl font-bold text-black mb-4">
        Edit Client Information ID: {rowData.id}
      </h2>
      <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {/* Personal Information Card */}
          <div className="p-4 border rounded-lg shadow-sm">
            <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
              Personal Information
            </h2>
            <div className="space-y-3">
              <InputField
                label="Title:"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                uppercase={true}
              />
              <InputField
                label="First Name:"
                id="fname"
                name="fname"
                value={formData.fname}
                onChange={handleChange}
                uppercase={true}
              />
              <InputField
                label="Middle Name:"
                id="mname"
                name="mname"
                value={formData.mname}
                onChange={handleChange}
                uppercase={true}
              />
              <InputField
                label="Last Name:"
                id="lname"
                name="lname"
                value={formData.lname}
                onChange={handleChange}
                uppercase={true}
              />
              <InputField
                label="Suffix:"
                id="sname"
                name="sname"
                value={formData.sname}
                onChange={handleChange}
                uppercase={true}
              />
              <InputField
                label="Birth Date:"
                id="bdate"
                name="bdate"
                value={formData.bdate}
                onChange={handleChange}
              />
              <InputField
                label="Company:"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                uppercase={true}
              />
            </div>
          </div>

          {/* Address Information Card */}
          <div className="p-4 border rounded-lg shadow-sm">
            <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
              Address Information
            </h2>
            <div className="space-y-3">
              <InputField
                label="Address 1 (house/building number street name):"
                id="street1"
                name="street1"
                value={addressData.street1}
                onChange={(e) => handleAddressChange("street1", e.target.value)}
                uppercase={true}
              />
              <InputField
                label="Address 2 (subdivision/compound/building name):"
                id="street2"
                name="street2"
                value={addressData.street2}
                onChange={(e) => handleAddressChange("street2", e.target.value)}
                uppercase={true}
              />
              <AreaForm
                onAreaChange={handleAreaChange}
                initialAreaData={{
                  acode: rowData.acode || "",
                  zipcode: rowData.zipcode || "",
                }}
              />
              <div className="mt-4">
                <h2 className="text-black font-bold">Address Preview:</h2>
                <textarea
                  id="combinedAddress"
                  name="combinedAddress"
                  value={combinedAddress}
                  onChange={(e) => {
                    // Apply uppercase transformation
                    setCombinedAddress(e.target.value.toUpperCase());
                  }}
                  className="w-full h-[160px] p-2 border rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Contact Information Card */}
          <div className="p-4 border rounded-lg shadow-sm">
            <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
              Contact Information
            </h2>
            <div className="space-y-3">
              <InputField
                label="Contact Numbers:"
                id="contactnos"
                name="contactnos"
                value={formData.contactnos}
                onChange={handleChange}
              />
              <InputField
                label="Cell Number:"
                id="cellno"
                name="cellno"
                value={formData.cellno}
                onChange={handleChange}
              />
              <InputField
                label="Office Number:"
                id="ofcno"
                name="ofcno"
                value={formData.ofcno}
                onChange={handleChange}
              />
              <InputField
                label="Email:"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                type="email"
              />
            </div>
          </div>

          {/* Role-Specific Information Card */}
          {hasRole("HRG") && hasRole("FOM") && hasRole("CAL") && (
            <div className="p-4 border rounded-lg shadow-sm">
              <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                Role-Specific Information
              </h2>
              <div className="space-y-3">
                <div className="flex space-x-4 mb-4 mt-2">
                  <label>
                    <input
                      type="radio"
                      name="role"
                      value="HRG"
                      checked={selectedRole === "HRG"}
                      onChange={() => handleRoleToggle("HRG")}
                    />
                    HRG
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="role"
                      value="FOM"
                      checked={selectedRole === "FOM"}
                      onChange={() => handleRoleToggle("FOM")}
                    />
                    FOM
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="role"
                      value="CAL"
                      checked={selectedRole === "CAL"}
                      onChange={() => handleRoleToggle("CAL")}
                    />
                    CAL
                  </label>
                </div>
                <div className="flex flex-col-2 gap-5">
                  <div className="flex flex-col-2 gap-4 mb-2 p-2">
                    {selectedRole === "HRG" && (
                      <div>
                        <h1 className="text-black mb-2 font-bold">HRG Edit</h1>
                        <InputField
                          label="Received Date:"
                          id="recvdate"
                          name="recvdate"
                          value={roleSpecificData.recvdate}
                          onChange={handleRoleSpecificChange}
                        />
                        <InputField
                          label="Renewal Date:"
                          id="renewdate"
                          name="renewdate"
                          value={roleSpecificData.renewdate}
                          onChange={handleRoleSpecificChange}
                        />
                        <InputField
                          label="Campaign Date:"
                          id="campaigndate"
                          name="campaigndate"
                          value={roleSpecificData.campaigndate}
                          onChange={handleRoleSpecificChange}
                        />
                        <InputField
                          label="Payment Reference:"
                          id="paymtref"
                          name="paymtref"
                          value={roleSpecificData.paymtref}
                          onChange={handleRoleSpecificChange}
                        />
                        <label
                          htmlFor="unsubscribe"
                          className="text-black font-bold mr-2"
                        >
                          Unsubscribe:
                        </label>
                        <input
                          type="checkbox"
                          id="unsubscribe"
                          name="unsubscribe"
                          checked={roleSpecificData.unsubscribe}
                          onChange={(e) =>
                            setRoleSpecificData((prev) => ({
                              ...prev,
                              unsubscribe: e.target.checked,
                            }))
                          }
                        />
                      </div>
                    )}
                    {selectedRole === "FOM" && (
                      <div>
                        <h1 className="text-black mb-2 font-bold">FOM Edit</h1>
                        <InputField
                          label="Received Date:"
                          id="recvdate"
                          name="recvdate"
                          value={roleSpecificData.recvdate}
                          onChange={handleRoleSpecificChange}
                        />
                        <InputField
                          label="Payment Reference:"
                          id="paymtref"
                          name="paymtref"
                          value={roleSpecificData.paymtref}
                          onChange={handleRoleSpecificChange}
                        />
                        <InputField
                          label="Payment Amount:"
                          id="paymtamt"
                          name="paymtamt"
                          value={roleSpecificData.paymtamt}
                          onChange={handleRoleSpecificChange}
                        />
                        <InputField
                          label="Payment Form:"
                          id="paymtform"
                          name="paymtform"
                          value={roleSpecificData.paymtform}
                          onChange={handleRoleSpecificChange}
                        />
                        <label
                          htmlFor="unsubscribe"
                          className="text-black font-bold mr-2"
                        >
                          Unsubscribe:
                        </label>
                        <input
                          type="checkbox"
                          id="unsubscribe"
                          name="unsubscribe"
                          checked={roleSpecificData.unsubscribe}
                          onChange={(e) =>
                            setRoleSpecificData((prev) => ({
                              ...prev,
                              unsubscribe: e.target.checked,
                            }))
                          }
                        />
                      </div>
                    )}
                    {selectedRole === "CAL" && (
                      <div>
                        <h1 className="text-black mb-2 font-bold">CAL Edit</h1>
                        <div className="flex gap-5">
                          <div>
                            <InputField
                              label="Received Date:"
                              id="recvdate"
                              name="recvdate"
                              value={roleSpecificData.recvdate}
                              onChange={handleRoleSpecificChange}
                            />
                            <InputField
                              label="Calendar Type:"
                              id="caltype"
                              name="caltype"
                              value={roleSpecificData.caltype}
                              onChange={handleRoleSpecificChange}
                            />
                            <InputField
                              label="Calendar Quantity:"
                              id="calqty"
                              name="calqty"
                              value={roleSpecificData.calqty}
                              onChange={handleRoleSpecificChange}
                            />
                            <InputField
                              label="Calendar Amount:"
                              id="calamt"
                              name="calamt"
                              value={roleSpecificData.calamt}
                              onChange={handleRoleSpecificChange}
                            />
                          </div>
                          <div>
                            <InputField
                              label="Payment Reference:"
                              id="paymtref"
                              name="paymtref"
                              value={roleSpecificData.paymtref}
                              onChange={handleRoleSpecificChange}
                            />
                            <InputField
                              label="Payment Amount:"
                              id="paymtamt"
                              name="paymtamt"
                              value={roleSpecificData.paymtamt}
                              onChange={handleRoleSpecificChange}
                            />
                            <InputField
                              label="Payment Form:"
                              id="paymtform"
                              name="paymtform"
                              value={roleSpecificData.paymtform}
                              onChange={handleRoleSpecificChange}
                            />
                            <InputField
                              label="Payment Date:"
                              id="paymtdate"
                              name="paymtdate"
                              value={roleSpecificData.paymtdate}
                              onChange={handleRoleSpecificChange}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Group and Subscription Information Card */}
          {(hasRole("WMM") || hasRole("Admin")) && (
            <div className="p-4 border rounded-lg shadow-sm">
              <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                Group and Subscription Information
              </h2>
              <div className="space-y-3">
                <p className="text-gray-500 text-sm">
                  Select the type of client, group, and subscription
                  classification from the options below.
                </p>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Select a type</option>
                  {types.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.id} - {type.name}
                    </option>
                  ))}
                </select>
                <select
                  id="group"
                  name="group"
                  value={formData.group}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Select a group</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.id} - {group.name}
                    </option>
                  ))}
                </select>                
                <h6 className="text-black font-bold">Remarks:</h6>
                <p className="text-gray-500 text-sm">
                  Provide any additional information or notes about the client
                  here.
                </p>
                <InputField
                  label=""
                  id="remarks"
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  type="textarea"
                  uppercase={true}
                  className="h-[160px]"
                />
              </div>
            </div>
          )}

          {/* Subscription Card for WMM users */}
          {hasRole("WMM") && (
            <div className="p-4 border rounded-lg shadow-sm mt-4">
              <div className="flex flex-col space-y-4">
                {/* Mode Selection - More Prominent */}
                <div className="flex justify-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <button
                    onClick={() => handleSubscriptionModeChange("add")}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                      subscriptionMode === "add"
                        ? "bg-green-600 text-white shadow-md"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Add New Subscription
                  </button>
                  <button
                    onClick={() => handleSubscriptionModeChange("edit")}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                      subscriptionMode === "edit"
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Edit Existing Subscription
                  </button>
                </div>

                {/* Subscription History - Always Visible */}
                <div className="border rounded-lg p-4 bg-white">
                  <h3 className="text-lg font-semibold mb-3">Subscription History</h3>
                  <div className="max-h-60 overflow-y-auto">
                    {availableSubscriptions.length > 0 ? (
                      <div className="space-y-3">
                        {availableSubscriptions.map((sub, idx) => (
                          <div
                            key={sub.id || idx}
                            className={`p-3 rounded-lg border ${
                              selectedSubscription?.id === sub.id
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold">
                                  {sub.subsclass || "Unknown Class"}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {sub.subsdate
                                    ? formatDateToMMDDYY(sub.subsdate)
                                    : "N/A"}{" "}
                                  to{" "}
                                  {sub.enddate ? formatDateToMMDDYY(sub.enddate) : "N/A"}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm">Copies: {sub.copies || 1}</p>
                                {sub.paymtamt > 0 && (
                                  <p className="text-sm">Amount: {sub.paymtamt}</p>
                                )}
                              </div>
                            </div>
                            {subscriptionMode === "edit" && (
                              <button
                                onClick={() => handleSelectedSubscriptionChange({ target: { value: sub.id } })}
                                className={`mt-2 w-full py-1 text-sm rounded ${
                                  selectedSubscription?.id === sub.id
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                }`}
                              >
                                {selectedSubscription?.id === sub.id
                                  ? "Currently Selected"
                                  : "Select to Edit"}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">
                        No subscription history available
                      </p>
                    )}
                  </div>
                </div>

                {/* Edit/Add Form Section */}
                <div className="border rounded-lg p-4 bg-white">
                  {subscriptionMode === "edit" ? (
                    <>
                      <h3 className="text-lg font-semibold mb-4">Edit Selected Subscription</h3>
                      {selectedSubscription ? (
                        <div className="space-y-4">
                          <InputField
                            label="Subscription Start (MM/DD/YY):"
                            id="subsdate"
                            name="subsdate"
                            value={roleSpecificData.subsdate || ""}
                            onChange={handleRoleSpecificChange}
                            placeholder="MM/DD/YY"
                          />

                          <div className="my-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Subscription Duration:
                            </label>
                            <select
                              id="subscriptionFreq"
                              name="subscriptionFreq"
                              onChange={handleSubscriptionFreqChange}
                              className="w-full p-2 border rounded-md"
                            >
                              <option value="">Select Duration</option>
                              <option value="5">6 Months</option>
                              <option value="11">1 Year</option>
                              <option value="22">2 Years</option>
                              <option value="others">Others</option>
                            </select>
                          </div>

                          <InputField
                            label="Subscription End (MM/DD/YY):"
                            id="enddate"
                            name="enddate"
                            value={roleSpecificData.enddate || ""}
                            onChange={handleRoleSpecificChange}
                            placeholder="MM/DD/YY"
                          />

                          <div className="grid grid-cols-2 gap-4">
                            <InputField
                              label="Copies:"
                              id="copies"
                              name="copies"
                              type="number"
                              min="1"
                              value={roleSpecificData.copies || 1}
                              onChange={handleRoleSpecificChange}
                            />
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Subscription Class:
                              </label>
                              <select
                                id="subsclass"
                                name="subsclass"
                                value={roleSpecificData.subsclass || ""}
                                onChange={handleRoleSpecificChange}
                                className="w-full p-2 border rounded-md"
                              >
                                <option value="">Select a classification</option>
                                {subclasses.map((subclass) => (
                                  <option key={subclass.id} value={subclass.id}>
                                    {subclass.name} ({subclass.id})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <InputField
                              label="Payment Reference:"
                              id="paymtref"
                              name="paymtref"
                              value={roleSpecificData.paymtref || ""}
                              onChange={handleRoleSpecificChange}
                            />
                            <InputField
                              label="Payment Amount:"
                              id="paymtamt"
                              name="paymtamt"
                              type="number"
                              min="0"
                              step="0.01"
                              value={roleSpecificData.paymtamt || 0}
                              onChange={handleRoleSpecificChange}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Remarks:
                            </label>
                            <textarea
                              id="remarks"
                              name="remarks"
                              value={roleSpecificData.remarks || ""}
                              onChange={handleRoleSpecificChange}
                              className="w-full p-2 border rounded-md h-24"
                            ></textarea>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">
                          Please select a subscription to edit from the history above
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold mb-4">Add New Subscription</h3>
                      <div className="space-y-4">
                        <InputField
                          label="Subscription Start (MM/DD/YY):"
                          id="subsdate"
                          name="subsdate"
                          value={newSubscriptionData.subsdate || ""}
                          onChange={handleNewSubscriptionChange}
                          placeholder="MM/DD/YY"
                          className={validationErrors.subsdate ? "border-red-500" : ""}
                        />
                        {validationErrors.subsdate && (
                          <p className="text-red-500 text-xs mt-1">
                            {validationErrors.subsdate}
                          </p>
                        )}

                        <div className="my-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Subscription Duration:
                          </label>
                          <select
                            id="subscriptionFreq"
                            name="subscriptionFreq"
                            onChange={handleSubscriptionFreqChange}
                            className="w-full p-2 border rounded-md"
                          >
                            <option value="">Select Duration</option>
                            <option value="5">6 Months</option>
                            <option value="11">1 Year</option>
                            <option value="22">2 Years</option>
                            <option value="others">Others</option>
                          </select>
                        </div>

                        <InputField
                          label="Subscription End (MM/DD/YY):"
                          id="enddate"
                          name="enddate"
                          value={newSubscriptionData.enddate || ""}
                          onChange={handleNewSubscriptionChange}
                          placeholder="MM/DD/YY"
                          className={validationErrors.enddate ? "border-red-500" : ""}
                        />
                        {validationErrors.enddate && (
                          <p className="text-red-500 text-xs mt-1">
                            {validationErrors.enddate}
                          </p>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <InputField
                            label="Copies:"
                            id="copies"
                            name="copies"
                            type="number"
                            min="1"
                            value={newSubscriptionData.copies || 1}
                            onChange={handleNewSubscriptionChange}
                          />
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Subscription Class:
                            </label>
                            <select
                              id="subsclass"
                              name="subsclass"
                              value={newSubscriptionData.subsclass || ""}
                              onChange={handleNewSubscriptionChange}
                              className={`w-full p-2 border rounded-md ${
                                validationErrors.subsclass ? "border-red-500" : ""
                              }`}
                            >
                              <option value="">Select a classification</option>
                              {subclasses.map((subclass) => (
                                <option key={subclass.id} value={subclass.id}>
                                  {subclass.name} ({subclass.id})
                                </option>
                              ))}
                            </select>
                            {validationErrors.subsclass && (
                              <p className="text-red-500 text-xs mt-1">
                                {validationErrors.subsclass}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <InputField
                            label="Payment Reference:"
                            id="paymtref"
                            name="paymtref"
                            value={newSubscriptionData.paymtref || ""}
                            onChange={handleNewSubscriptionChange}
                          />
                          <InputField
                            label="Payment Amount:"
                            id="paymtamt"
                            name="paymtamt"
                            type="number"
                            min="0"
                            step="0.01"
                            value={newSubscriptionData.paymtamt || 0}
                            onChange={handleNewSubscriptionChange}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Remarks:
                          </label>
                          <textarea
                            id="remarks"
                            name="remarks"
                            value={newSubscriptionData.remarks || ""}
                            onChange={handleNewSubscriptionChange}
                            className="w-full p-2 border rounded-md h-24"
                          ></textarea>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 pt-4 border-t flex justify-end gap-3">
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
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default Edit;
