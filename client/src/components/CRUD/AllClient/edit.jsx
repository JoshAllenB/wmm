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

  const [formData, setFormData] = useState({
    lname: "",
    fname: "",
    mname: "",
    sname: "",
    title: "",
    bdate: "",
    bdateMonth: "",
    bdateDay: "",
    bdateYear: "",
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
  const [newSubscriptionData, setNewSubscriptionData] = useState(() => {
    // Get current date for defaults
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const year = String(today.getFullYear());

    return {
      subsdate: `${month}/${day}/${year}`,
      subsDateMonth: month,
      subsDateDay: day,
      subsDateYear: year,
      enddate: "",
      endDateMonth: "",
      endDateDay: "",
      endDateYear: "",
      subsclass: "",
      copies: 1,
      subsyear: 1,
      remarks: "",
      paymtamt: 0,
      paymtref: "",
      paymtmasses: 0,
      calendar: false,
    };
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

  useEffect(() => {
    if (rowData) {
      // Parse birth date into components if it exists
      let bdateMonth = "";
      let bdateDay = "";
      let bdateYear = "";

      if (rowData.bdate) {
        const dateParts = rowData.bdate.split("/");
        if (dateParts.length === 3) {
          bdateMonth = dateParts[0];
          bdateDay = dateParts[1];
          bdateYear = dateParts[2];
        }
      }

      setFormData({
        ...rowData,
        // Initialize birth date components
        bdateMonth,
        bdateDay,
        bdateYear,
        // Initialize subscription-related fields
        subscriptionFreq: rowData.subscriptionFreq || "",
        subscriptionStart: rowData.subsdate
          ? formatDateToMMDDYY(parseDate(rowData.subsdate))
          : "",
        subscriptionEnd: rowData.enddate
          ? formatDateToMMDDYY(parseDate(rowData.enddate))
          : "",
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
          const cleanedSubscriptions = subscriptionRecords.map((record) => ({
            ...record,
            subsdate: record.subsdate
              ? formatDateToMMDDYY(parseDate(record.subsdate))
              : "",
            enddate: record.enddate
              ? formatDateToMMDDYY(parseDate(record.enddate))
              : "",
            renewdate: record.renewdate
              ? formatDateToMMDDYY(parseDate(record.renewdate))
              : "",
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
            subsdate: rowData.subsdate
              ? formatDateToMMDDYY(parseDate(rowData.subsdate))
              : "",
            enddate: rowData.enddate
              ? formatDateToMMDDYY(parseDate(rowData.enddate))
              : "",
            renewdate: rowData.renewdate
              ? formatDateToMMDDYY(parseDate(rowData.renewdate))
              : "",
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
        // Process HRG data
        if (
          rowData.hrgData &&
          rowData.hrgData.records &&
          rowData.hrgData.records.length > 0
        ) {
          // Clean dates in records
          const cleanedRecords = rowData.hrgData.records.map((record) => ({
            ...record,
            recvdate: record.recvdate
              ? formatDateToMMDDYY(parseDate(record.recvdate))
              : "",
            renewdate: record.renewdate
              ? formatDateToMMDDYY(parseDate(record.renewdate))
              : "",
            campaigndate: record.campaigndate
              ? formatDateToMMDDYY(parseDate(record.campaigndate))
              : "",
          }));

          // Sort by date (newest first)
          const sortedRecords = [...cleanedRecords].sort((a, b) => {
            const dateA = parseDate(a.recvdate) || new Date(0);
            const dateB = parseDate(b.recvdate) || new Date(0);
            return dateB - dateA;
          });

          setHrgRecords(sortedRecords);

          // Set the most recent record as selected
          const latestRecord = sortedRecords[0];
          setSelectedHrgRecord(latestRecord);

          // Populate the form with the latest record
          const hrgData = {
            id: latestRecord.id || latestRecord._id,
            recvdate: latestRecord.recvdate || "",
            renewdate: latestRecord.renewdate || "",
            campaigndate: latestRecord.campaigndate || "",
            paymtref: latestRecord.paymtref || "",
            paymtamt: latestRecord.paymtamt || 0,
            unsubscribe: latestRecord.unsubscribe || false,
            remarks: latestRecord.remarks || "",
          };

          if (selectedRole === "HRG") {
            setRoleSpecificData(hrgData);
          }
        } else {
          // No records, initialize with empty data
          const hrgData = {
            recvdate: formatDateToMMDDYY(new Date()),
            renewdate: "",
            campaigndate: "",
            paymtref: "",
            paymtamt: 0,
            unsubscribe: false,
            remarks: "",
          };

          if (selectedRole === "HRG") {
            setRoleSpecificData(hrgData);
          }
        }
      }

      if (hasRole("FOM")) {
        // Process FOM data
        if (
          rowData.fomData &&
          rowData.fomData.records &&
          rowData.fomData.records.length > 0
        ) {
          // Clean dates in records
          const cleanedRecords = rowData.fomData.records.map((record) => ({
            ...record,
            recvdate: record.recvdate
              ? formatDateToMMDDYY(parseDate(record.recvdate))
              : "",
          }));

          // Sort by date (newest first)
          const sortedRecords = [...cleanedRecords].sort((a, b) => {
            const dateA = parseDate(a.recvdate) || new Date(0);
            const dateB = parseDate(b.recvdate) || new Date(0);
            return dateB - dateA;
          });

          setFomRecords(sortedRecords);

          // Set the most recent record as selected
          const latestRecord = sortedRecords[0];
          setSelectedFomRecord(latestRecord);

          // Populate the form with the latest record
          const fomData = {
            id: latestRecord.id || latestRecord._id,
            recvdate: latestRecord.recvdate || "",
            paymtamt: latestRecord.paymtamt || 0,
            paymtform: latestRecord.paymtform || "",
            paymtref: latestRecord.paymtref || "",
            unsubscribe: latestRecord.unsubscribe || false,
            remarks: latestRecord.remarks || "",
          };

          if (selectedRole === "FOM") {
            setRoleSpecificData(fomData);
          }
        } else {
          // No records, initialize with empty data
          const fomData = {
            recvdate: formatDateToMMDDYY(new Date()),
            paymtamt: 0,
            paymtform: "",
            paymtref: "",
            unsubscribe: false,
            remarks: "",
          };

          if (selectedRole === "FOM") {
            setRoleSpecificData(fomData);
          }
        }
      }

      if (hasRole("CAL")) {
        // Process CAL data
        if (
          rowData.calData &&
          rowData.calData.records &&
          rowData.calData.records.length > 0
        ) {
          // Clean dates in records
          const cleanedRecords = rowData.calData.records.map((record) => ({
            ...record,
            recvdate: record.recvdate
              ? formatDateToMMDDYY(parseDate(record.recvdate))
              : "",
            paymtdate: record.paymtdate
              ? formatDateToMMDDYY(parseDate(record.paymtdate))
              : "",
          }));

          // Sort by date (newest first)
          const sortedRecords = [...cleanedRecords].sort((a, b) => {
            const dateA = parseDate(a.recvdate) || new Date(0);
            const dateB = parseDate(b.recvdate) || new Date(0);
            return dateB - dateA;
          });

          setCalRecords(sortedRecords);

          // Set the most recent record as selected
          const latestRecord = sortedRecords[0];
          setSelectedCalRecord(latestRecord);

          // Populate the form with the latest record
          const calData = {
            id: latestRecord.id || latestRecord._id,
            recvdate: latestRecord.recvdate || "",
            caltype: latestRecord.caltype || "",
            calqty: latestRecord.calqty || 0,
            calamt: latestRecord.calamt || 0,
            paymtref: latestRecord.paymtref || "",
            paymtamt: latestRecord.paymtamt || 0,
            paymtform: latestRecord.paymtform || "",
            paymtdate: latestRecord.paymtdate || "",
            remarks: latestRecord.remarks || "",
          };

          if (selectedRole === "CAL") {
            setRoleSpecificData(calData);
          }
        } else {
          // No records, initialize with empty data
          const calData = {
            recvdate: formatDateToMMDDYY(new Date()),
            caltype: "",
            calqty: 0,
            calamt: 0,
            paymtref: "",
            paymtamt: 0,
            paymtform: "",
            paymtdate: "",
            remarks: "",
          };

          if (selectedRole === "CAL") {
            setRoleSpecificData(calData);
          }
        }
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

      // Keep the same day of the month to count full months correctly
      // For example, April 15 + 1 month = May 15

      return endDate;
    } catch (error) {
      console.error("Error calculating end date:", error);
      return null;
    }
  };

  const handleChange = async (e) => {
    const { name, value } = e.target;

    // Handle bdate parts
    if (name === "bdateMonth" || name === "bdateDay" || name === "bdateYear") {
      setFormData((prevData) => {
        const newData = {
          ...prevData,
          [name]: value,
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
          [name]: value,
        };

        // Combine the date parts into subscriptionStart if all are present
        if (
          newData.subStartMonth &&
          newData.subStartDay &&
          newData.subStartYear
        ) {
          newData.subscriptionStart = `${newData.subStartMonth}/${newData.subStartDay}/${newData.subStartYear}`;

          // If frequency is selected, recalculate end date based on the new start date
          if (newData.subscriptionFreq) {
            const startDate = new Date(
              parseInt(newData.subStartYear),
              parseInt(newData.subStartMonth) - 1,
              parseInt(newData.subStartDay)
            );

            const monthsToAdd = parseInt(newData.subscriptionFreq);
            const endDate = calculateEndMonth(startDate, monthsToAdd);

            if (endDate) {
              // Format end date parts
              newData.subEndMonth = String(endDate.getMonth() + 1).padStart(
                2,
                "0"
              );
              newData.subEndDay = String(endDate.getDate()).padStart(2, "0");
              newData.subEndYear = String(endDate.getFullYear());
              newData.subscriptionEnd = `${newData.subEndMonth}/${newData.subEndDay}/${newData.subEndYear}`;

              // Also update roleSpecificData
              setTimeout(() => {
                setRoleSpecificData((prev) => ({
                  ...prev,
                  subsdate: newData.subscriptionStart,
                  enddate: newData.subscriptionEnd,
                }));
              }, 0);
            }
          }
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
          [name]: value,
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

    if (name === "subscriptionFreq") {
      const monthsToAdd = parseInt(value);

      // Use subsdate from roleSpecificData or today if not available
      const startDate = roleSpecificData.subsdate
        ? new Date(roleSpecificData.subsdate)
        : new Date();

      // Set start date (keeping day of month)
      const subscriptionStart = new Date(startDate);

      // Calculate end date by adding months
      const rawEndDate = calculateEndMonth(subscriptionStart, monthsToAdd);
      const subscriptionEnd = new Date(rawEndDate);

      // Format date parts for start date
      const startMonth = String(subscriptionStart.getMonth() + 1).padStart(
        2,
        "0"
      );
      const startDay = String(subscriptionStart.getDate()).padStart(2, "0");
      const startYear = String(subscriptionStart.getFullYear());

      // Format date parts for end date
      const endMonth = String(subscriptionEnd.getMonth() + 1).padStart(2, "0");
      const endDay = String(subscriptionEnd.getDate()).padStart(2, "0");
      const endYear = String(subscriptionEnd.getFullYear());

      // Update `formData` and `roleSpecificData` states for dates
      setFormData({
        ...formData,
        subscriptionFreq: value,
        subscriptionStart: formatDateToMMDDYY(subscriptionStart),
        subscriptionEnd: formatDateToMMDDYY(subscriptionEnd),
        subStartMonth: startMonth,
        subStartDay: startDay,
        subStartYear: startYear,
        subEndMonth: endMonth,
        subEndDay: endDay,
        subEndYear: endYear,
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
      [name]: value,
    }));

    // If zipcode is updated, also update it in the formData to keep states in sync
    if (name === "zipcode") {
      setFormData((prev) => ({
        ...prev,
        zipcode: value ? String(value) : "",
      }));
    }
  };

  const handleRoleSpecificChange = (e) => {
    const { name, value, type, checked } = e.target;
    setRoleSpecificData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? checked : type === "textarea" ? value : value,
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
      });
    }
  };

  // Update the existing handler to use _id instead of id
  const handleSelectedSubscriptionChange = (e) => {
    // Make sure we have a proper event object
    if (!e || !e.target) {
      console.error("Invalid event in handleSelectedSubscriptionChange:", e);
      return;
    }

    const subscriptionId = e.target.value;

    if (!subscriptionId) {
      console.error("Invalid subscription ID:", e.target.value);
      return;
    }

    // Find subscription by either id or _id
    const subscription = availableSubscriptions.find(
      (sub) =>
        String(sub.id) === String(subscriptionId) ||
        String(sub._id) === String(subscriptionId)
    );

    if (subscription) {
      selectSubscription(subscription);
    } else {
      console.error("Subscription not found with ID:", subscriptionId);
    }
  };

  const handleSubscriptionFreqChange = (e) => {
    const freq = e.target.value;
    setSubscriptionFreq(freq);

    // Initialize dates
    let startDate, monthsToAdd;

    // Convert frequency to months
    if (freq === "5") monthsToAdd = 6;
    else if (freq === "11") monthsToAdd = 12;
    else if (freq === "22") monthsToAdd = 24;
    else return; // Return if not a standard option

    // Handle subscription mode (edit existing or add new)
    if (subscriptionMode === "edit" && selectedSubscription) {
      startDate = parseDate(roleSpecificData.subsdate);

      if (startDate) {
        // Calculate end date preserving the day of month
        const newEndDate = new Date(startDate);
        newEndDate.setMonth(startDate.getMonth() + monthsToAdd);

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
        }));
      }
    } else {
      // Handle new subscription
      startDate = parseDate(newSubscriptionData.subsdate);

      if (startDate) {
        // Calculate end date preserving the day of month
        const newEndDate = new Date(startDate);
        newEndDate.setMonth(startDate.getMonth() + monthsToAdd);

        // Format for display
        const formattedDate = formatDateToMMDDYY(newEndDate);

        // Extract month, day, year for end date
        const endDateMonth = String(newEndDate.getMonth() + 1).padStart(2, "0");
        const endDateDay = String(newEndDate.getDate()).padStart(2, "0");
        const endDateYear = String(newEndDate.getFullYear());

        // Update state with both formatted date and components
        setNewSubscriptionData((prev) => ({
          ...prev,
          enddate: formattedDate,
          endDateMonth,
          endDateDay,
          endDateYear,
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // First collect the basic client data
      const addressComponents = [
        addressData.street1,
        addressData.street2,
        formData.area,
        addressData.barangay,
        addressData.city,
        addressData.province,
      ];
      const address = addressComponents.filter(Boolean).join(", ");

      // Format the birth date properly
      const formatBdate = () => {
        if (formData.bdateMonth && formData.bdateDay && formData.bdateYear) {
          return `${formData.bdateMonth}/${formData.bdateDay}/${formData.bdateYear}`;
        }
        return formData.bdate || "";
      };

      // Prepare the client data for submission
      const clientData = {
        ...formData,
        bdate: formatBdate(),
        address,
        ...areaData,
      };

      // Determine what role-specific data to submit
      let roleData = {};
      let roleType = "";

      if (hasRole("WMM")) {
        roleType = "WMM";

        if (subscriptionMode === "edit" && selectedSubscription) {
          // If editing an existing subscription
          roleData = {
            id: selectedSubscription.id || selectedSubscription._id,
            subsdate: roleSpecificData.subsdate,
            enddate: roleSpecificData.enddate,
            renewdate: roleSpecificData.renewdate,
            subsyear: roleSpecificData.subsyear || 0,
            copies: roleSpecificData.copies || 1,
            paymtamt: roleSpecificData.paymtamt || 0,
            paymtmasses: roleSpecificData.paymtmasses || 0,
            calendar: roleSpecificData.calendar || false,
            subsclass: roleSpecificData.subsclass || "",
            donorid: roleSpecificData.donorid || 0,
            paymtref: roleSpecificData.paymtref || "",
            remarks: roleSpecificData.remarks || "",
          };
        } else if (subscriptionMode === "add") {
          // Validate new subscription data
          const validation = validateNewSubscription(newSubscriptionData);
          if (!validation.isValid) {
            setValidationErrors(validation.errors);
            return;
          }

          // If adding a new subscription
          roleData = {
            subsdate: newSubscriptionData.subsdate,
            enddate: newSubscriptionData.enddate,
            renewdate: newSubscriptionData.renewdate || "",
            subsyear: newSubscriptionData.subsyear || 1,
            copies: newSubscriptionData.copies || 1,
            paymtamt: newSubscriptionData.paymtamt || 0,
            paymtmasses: newSubscriptionData.paymtmasses || 0,
            calendar: newSubscriptionData.calendar || false,
            subsclass: newSubscriptionData.subsclass || "",
            donorid: newSubscriptionData.donorid || 0,
            paymtref: newSubscriptionData.paymtref || "",
            remarks: newSubscriptionData.remarks || "",
            isNewSubscription: true,
          };
        }
      } else {
        // Handle other role types (HRG, FOM, CAL)
        if (selectedRole === "HRG" && hasRole("HRG")) {
          roleType = "HRG";
          if (roleRecordMode === "edit" && selectedHrgRecord) {
            roleData = {
              id: selectedHrgRecord.id || selectedHrgRecord._id,
              recvdate: roleSpecificData.recvdate,
              renewdate: roleSpecificData.renewdate,
              campaigndate: roleSpecificData.campaigndate,
              paymtref: roleSpecificData.paymtref,
              paymtamt: roleSpecificData.paymtamt,
              unsubscribe: roleSpecificData.unsubscribe,
              remarks: roleSpecificData.remarks,
            };
          } else {
            roleData = {
              recvdate: newRoleData.recvdate,
              renewdate: newRoleData.renewdate,
              campaigndate: newRoleData.campaigndate,
              paymtref: newRoleData.paymtref,
              paymtamt: newRoleData.paymtamt,
              unsubscribe: newRoleData.unsubscribe,
              remarks: newRoleData.remarks,
              isNewRecord: true,
            };
          }
        } else if (selectedRole === "FOM" && hasRole("FOM")) {
          roleType = "FOM";
          if (roleRecordMode === "edit" && selectedFomRecord) {
            roleData = {
              id: selectedFomRecord.id || selectedFomRecord._id,
              recvdate: roleSpecificData.recvdate,
              paymtamt: roleSpecificData.paymtamt,
              paymtform: roleSpecificData.paymtform,
              paymtref: roleSpecificData.paymtref,
              unsubscribe: roleSpecificData.unsubscribe,
              remarks: roleSpecificData.remarks,
            };
          } else {
            roleData = {
              recvdate: newRoleData.recvdate,
              paymtamt: newRoleData.paymtamt,
              paymtform: newRoleData.paymtform,
              paymtref: newRoleData.paymtref,
              unsubscribe: newRoleData.unsubscribe,
              remarks: newRoleData.remarks,
              isNewRecord: true,
            };
          }
        } else if (selectedRole === "CAL" && hasRole("CAL")) {
          roleType = "CAL";
          if (roleRecordMode === "edit" && selectedCalRecord) {
            roleData = {
              id: selectedCalRecord.id || selectedCalRecord._id,
              recvdate: roleSpecificData.recvdate,
              caltype: roleSpecificData.caltype,
              calqty: roleSpecificData.calqty,
              calamt: roleSpecificData.calamt,
              paymtref: roleSpecificData.paymtref,
              paymtamt: roleSpecificData.paymtamt,
              paymtform: roleSpecificData.paymtform,
              paymtdate: roleSpecificData.paymtdate,
              remarks: roleSpecificData.remarks,
            };
          } else {
            roleData = {
              recvdate: newRoleData.recvdate,
              caltype: newRoleData.caltype,
              calqty: newRoleData.calqty,
              calamt: newRoleData.calamt,
              paymtref: newRoleData.paymtref,
              paymtamt: newRoleData.paymtamt,
              paymtform: newRoleData.paymtform,
              paymtdate: newRoleData.paymtdate,
              remarks: newRoleData.remarks,
              isNewRecord: true,
            };
          }
        }
      }

      // Prepare the submission data
      const submissionData = {
        clientId: rowData.id,
        clientData,
        roleType,
        roleData,
      };

      // Send the update request
      const response = await axios.put(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/clients/update`,
        submissionData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (response.data.success) {
        if (onEditSuccess) {
          // Send back the updated data to the parent component
          onEditSuccess({
            ...rowData,
            ...clientData,
            ...(hasRole("WMM") && { wmmData: response.data.wmmData }),
            ...(hasRole("HRG") && { hrgData: response.data.hrgData }),
            ...(hasRole("FOM") && { fomData: response.data.fomData }),
            ...(hasRole("CAL") && { calData: response.data.calData }),
          });
        }
        closeModal();
      }
    } catch (error) {
      console.error("Error updating client:", error);
      // Handle error state here
    }
  };

  return (
    <Modal isOpen={showModal} onClose={closeModal} title="Edit Client">
      <form onSubmit={handleSubmit}>
        {/* Rest of the component content */}
        <div className="mt-8 pt-4 border-t flex flex-wrap justify-end gap-3">
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
