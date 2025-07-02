import { useUser } from "../../../utils/Hooks/userProvider";
import { roleConfigs } from "../../../utils/roleConfigs";
import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";
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
    region: "", // Add region field
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

  // New effect to initialize subscriptionFreq based on existing subscription data
  useEffect(() => {
    if (selectedSubscription && subscriptionMode === "edit") {
      // Parse start and end dates
      const subsdate = parseDate(selectedSubscription.subsdate);
      const enddate = parseDate(selectedSubscription.enddate);
      
      if (subsdate && enddate) {
        // Calculate the difference in months
        const diffMonths = (enddate.getFullYear() - subsdate.getFullYear()) * 12 + 
                          (enddate.getMonth() - subsdate.getMonth());
        
        // Set subscription frequency based on month difference
        let frequency = "";
        if (diffMonths >= 22 && diffMonths <= 26) {
          frequency = "22"; // 2 years
        } else if (diffMonths >= 10 && diffMonths <= 14) {
          frequency = "11"; // 1 year
        } else if (diffMonths >= 5 && diffMonths <= 7) {
          frequency = "5";  // 6 months
        }
        
        if (frequency) {
          setSubscriptionFreq(frequency);
        }
        
        // Extract month, day, year for start date
        const subStartMonth = String(subsdate.getMonth() + 1).padStart(2, "0");
        const subStartDay = String(subsdate.getDate()).padStart(2, "0");
        const subStartYear = String(subsdate.getFullYear());

        // Extract month, day, year for end date
        const subEndMonth = String(enddate.getMonth() + 1).padStart(2, "0");
        const subEndDay = String(enddate.getDate()).padStart(2, "0");
        const subEndYear = String(enddate.getFullYear());

        // Format dates for display
        const formattedStartDate = `${subStartMonth}/${subStartDay}/${subStartYear}`;
        const formattedEndDate = `${subEndMonth}/${subEndDay}/${subEndYear}`;

        // Update formData with the date components
        setFormData(prev => ({
          ...prev,
          subscriptionFreq: frequency,
          subscriptionStart: formattedStartDate,
          subscriptionEnd: formattedEndDate,
          subStartMonth,
          subStartDay,
          subStartYear,
          subEndMonth,
          subEndDay,
          subEndYear
        }));
        
        // Also update roleSpecificData with formatted dates
        setRoleSpecificData(prev => ({
          ...prev,
          subsdate: formattedStartDate,
          enddate: formattedEndDate,
          subsDateMonth: subStartMonth,
          subsDateDay: subStartDay, 
          subsDateYear: subStartYear,
          endDateMonth: subEndMonth,
          endDateDay: subEndDay,
          endDateYear: subEndYear
        }));
      }
    }
  }, [selectedSubscription, subscriptionMode]);

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
      if (typeof startDate === 'string') {
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

      // Get current date for defaults
      let subscriptionStart;
      
      // If we have a valid subsdate in roleSpecificData, use that as the start date
      if (roleSpecificData.subsdate) {
        subscriptionStart = parseDate(roleSpecificData.subsdate);
      } else {
        // Otherwise use today's date
        subscriptionStart = new Date();
      }

      // Safety check
      if (!subscriptionStart || isNaN(subscriptionStart.getTime())) {
        subscriptionStart = new Date();
      }

      // Calculate end date by adding months
      const subscriptionEnd = calculateEndMonth(subscriptionStart, monthsToAdd);

      if (!subscriptionEnd) {
        // If end date calculation failed, just update the frequency
        setFormData({
          ...formData,
          subscriptionFreq: value,
        });
        return;
      }

      // Format date parts for start date
      const startMonth = String(subscriptionStart.getMonth() + 1).padStart(2, "0");
      const startDay = String(subscriptionStart.getDate()).padStart(2, "0");
      const startYear = String(subscriptionStart.getFullYear());

      // Format date parts for end date
      const endMonth = String(subscriptionEnd.getMonth() + 1).padStart(2, "0");
      const endDay = String(subscriptionEnd.getDate()).padStart(2, "0");
      const endYear = String(subscriptionEnd.getFullYear());

      // Format dates for display
      const formattedStartDate = `${startMonth}/${startDay}/${startYear}`;
      const formattedEndDate = `${endMonth}/${endDay}/${endYear}`;

      // Update `formData` with dates and components
      setFormData({
        ...formData,
        subscriptionFreq: value,
        subscriptionStart: formattedStartDate,
        subscriptionEnd: formattedEndDate,
        subStartMonth: startMonth,
        subStartDay: startDay,
        subStartYear: startYear,
        subEndMonth: endMonth,
        subEndDay: endDay,
        subEndYear: endYear,
      });

      // Also update roleSpecificData with formatted dates
      setRoleSpecificData((prev) => ({
        ...prev,
        subsdate: formattedStartDate,
        enddate: formattedEndDate,
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
    setAddressData((prev) => {
      const newAddressData = {
        ...prev,
        [type]: value,
      };

      // Update combined address
      const addressComponents = [
        newAddressData.street1,
        newAddressData.street2,
        formData.area,
      ].filter(Boolean);

      const newCombinedAddress = addressComponents.join(", ");
      setCombinedAddress(newCombinedAddress);
      
      return newAddressData;
    });
  };

  const handleCitySelect = (cityname) => {
    setSelectedCity(cityname);
    handleAddressChange('city', cityname);
  };

  useEffect(() => {
    if (rowData && rowData.address) {
      // Split the address into components
      const addressParts = rowData.address.split(", ");
      
      // Initialize with empty values
      const newAddressData = {
        street1: "",
        street2: "",
        barangay: "",
        city: "",
        province: "",
        region: "",
      };

      // Try to map the parts to address components
      if (addressParts.length >= 1) newAddressData.street1 = addressParts[0];
      if (addressParts.length >= 2) newAddressData.street2 = addressParts[1];
      if (addressParts.length >= 4) newAddressData.barangay = addressParts[3];
      if (addressParts.length >= 5) newAddressData.city = addressParts[4];
      if (addressParts.length >= 6) newAddressData.province = addressParts[5];
      
      setAddressData(newAddressData);
      setCombinedAddress(rowData.address);
    }
  }, [rowData]);

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
        endDateYear
      });

      // Also update the formData for consistency
      setFormData(prevFormData => ({
        ...prevFormData,
        subscriptionStart: formattedSubsDate,
        subscriptionEnd: formattedEndDate,
        subStartMonth: subsDateMonth,
        subStartDay: subsDateDay,
        subStartYear: subsDateYear,
        subEndMonth: endDateMonth,
        subEndDay: endDateDay,
        subEndYear: endDateYear
      }));

      // Determine subscription frequency based on the subscription period
      if (subsdate && enddate) {
        const startDate = new Date(subsdate);
        const endDate = new Date(enddate);
        
        // Calculate the difference in months
        const diffMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                          (endDate.getMonth() - startDate.getMonth());
        
        // Set subscription frequency based on month difference
        let frequency = "";
        if (diffMonths >= 22 && diffMonths <= 26) {
          frequency = "22"; // 2 years
        } else if (diffMonths >= 10 && diffMonths <= 14) {
          frequency = "11"; // 1 year
        } else if (diffMonths >= 5 && diffMonths <= 7) {
          frequency = "5";  // 6 months
        }
        
        if (frequency) {
          setSubscriptionFreq(frequency);
          setFormData(prev => ({
            ...prev,
            subscriptionFreq: frequency
          }));
        }
      }
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
      let startDate = parseDate(newSubscriptionData.subsdate);
      
      if (!startDate || isNaN(startDate.getTime())) {
        // If no valid start date, use today
        startDate = new Date();
        
        // Also update the start date in newSubscriptionData
        const today = new Date();
        const startMonth = String(today.getMonth() + 1).padStart(2, "0");
        const startDay = String(today.getDate()).padStart(2, "0");
        const startYear = String(today.getFullYear());
        const formattedStartDate = `${startMonth}/${startDay}/${startYear}`;
        
        setTimeout(() => {
          setNewSubscriptionData((prev) => ({
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
      setNewSubscriptionData((prev) => ({
        ...prev,
        enddate: formattedDate,
        endDateMonth,
        endDateDay,
        endDateYear,
        subsyear: monthsToAdd === 12 ? 1 : monthsToAdd === 24 ? 2 : 0.5,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
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
        address: combinedAddress, // Use the combined address from state
        ...areaData,  // This includes acode, area, and zipcode
      };

      // Determine what role-specific data to submit
      let roleData = {};
      let roleType = "";

      if (hasRole("WMM")) {
        roleType = "WMM";

        if (subscriptionMode === "edit" && selectedSubscription) {
          // If editing an existing subscription
          roleData = {
            id: selectedSubscription._id || selectedSubscription.id, // Prefer _id for MongoDB ObjectId
            subsdate: roleSpecificData.subsdate,
            enddate: roleSpecificData.enddate,
            renewdate: roleSpecificData.renewdate,
            subsyear: parseFloat(roleSpecificData.subsyear) || 0,
            copies: parseInt(roleSpecificData.copies) || 1,
            paymtamt: parseFloat(roleSpecificData.paymtamt) || 0,
            paymtmasses: parseInt(roleSpecificData.paymtmasses) || 0,
            calendar: roleSpecificData.calendar || false,
            subsclass: roleSpecificData.subsclass || "",
            donorid: parseInt(roleSpecificData.donorid) || 0,
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
            subsyear: parseFloat(newSubscriptionData.subsyear) || 1,
            copies: parseInt(newSubscriptionData.copies) || 1,
            paymtamt: parseFloat(newSubscriptionData.paymtamt) || 0,
            paymtmasses: parseInt(newSubscriptionData.paymtmasses) || 0,
            calendar: newSubscriptionData.calendar || false,
            subsclass: newSubscriptionData.subsclass || "",
            donorid: parseInt(newSubscriptionData.donorid) || 0,
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
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/clients/update/${rowData.id}`,
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
                <InputField
                  label="Title:"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  uppercase={true}
                  className="text-base"
                />
                <InputField
                  label="First Name:"
                  id="fname"
                  name="fname"
                  value={formData.fname}
                  onChange={handleChange}
                  uppercase={true}
                  className="text-base"
                />
                <InputField
                  label="Middle Name:"
                  id="mname"
                  name="mname"
                  value={formData.mname}
                  onChange={handleChange}
                  uppercase={true}
                  className="text-base"
                />
                <InputField
                  label="Last Name:"
                  id="lname"
                  name="lname"
                  value={formData.lname}
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
                  <label className="block text-black text-base mb-1">Birth Date:</label>
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
                        {months.map(month => (
                          <option key={month.value} value={month.value}>{month.name}</option>
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
                  value={formData.company}
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
                  label="Address 1:"
                  id="street1"
                  name="street1"
                  value={addressData.street1}
                  onChange={(e) => handleAddressChange('street1', e.target.value)}
                  uppercase={true}
                  className="text-base"
                />
                <InputField
                  label="Address 2:"
                  id="street2"
                  name="street2"
                  value={addressData.street2}
                  onChange={(e) => handleAddressChange('street2', e.target.value)}
                  uppercase={true}
                  className="text-base"
                />
                <AreaForm 
                  onAreaChange={handleAreaChange}
                  defaultValues={{
                    acode: formData.acode || "",
                    area: formData.area || "",
                    zipcode: formData.zipcode || ""
                  }}
                />
                <div className="mt-4">
                  <InputField
                    label="Address Preview:"
                    id="combinedAddress"
                    name="combinedAddress"
                    value={combinedAddress}
                    type="textarea"
                    onChange={(e) => setCombinedAddress(e.target.value.toUpperCase())}
                    className="w-full h-[160px] p-2 border rounded-md text-base"
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
                  value={formData.contactnos}
                  onChange={handleChange}
                  className="text-base"
                />
                <InputField
                  label="Cell Number:"
                  id="cellno"
                  name="cellno"
                  value={formData.cellno}
                  onChange={handleChange}
                  className="text-base"
                />
                <InputField
                  label="Office Number:"
                  id="ofcno"
                  name="ofcno"
                  value={formData.ofcno}
                  onChange={handleChange}
                  className="text-base"
                />
                <InputField
                  label="Email:"
                  id="email"
                  name="email"
                  value={formData.email}
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
                  <label className="block text-black text-base mb-1">Type:</label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
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
                  <label className="block text-black text-base mb-1">Group:</label>
                  <select
                    id="group"
                    name="group"
                    value={formData.group}
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
                <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                  Subscription Information
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
                      Edit Existing
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
                      Add New
                    </button>
                  </div>
                  
                  {subscriptionMode === "edit" && availableSubscriptions.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Subscription:
                      </label>
                      <select
                        value={selectedSubscription ? (selectedSubscription.id || selectedSubscription._id) : ""}
                        onChange={handleSelectedSubscriptionChange}
                        className="w-full p-2 border rounded-md text-base"
                      >
                        {availableSubscriptions.map((sub) => (
                          <option 
                            key={sub.id || sub._id} 
                            value={sub.id || sub._id}
                          >
                            {sub.subsdate ? formatDateToMonthYear(parseDate(sub.subsdate)) : 'Unknown'} to {sub.enddate ? formatDateToMonthYear(parseDate(sub.enddate)) : 'Unknown'} - {sub.subsclass || 'No Class'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                
                {/* Subscription Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                  <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subscription Frequency:
                      </label>
                      <select
                        id="subscriptionFreq"
                        name="subscriptionFreq"
                        value={subscriptionFreq}
                        onChange={handleSubscriptionFreqChange}
                        className="w-full p-2 border rounded-md text-base"
                      >
                        <option value="">Select Frequency</option>
                        <option value="5">6 Months</option>
                        <option value="11">1 Year</option>
                        <option value="22">2 Years</option>
                      </select>
                    </div>
                    
                    <div className="mb-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subscription Start:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="relative">
                          <select
                            id="subStartMonth"
                            name="subStartMonth"
                            value={
                              subscriptionMode === "edit"
                                ? formData.subStartMonth || ""
                                : newSubscriptionData.subsDateMonth || ""
                            }
                            onChange={
                              subscriptionMode === "edit"
                                ? handleChange
                                : (e) => setNewSubscriptionData({...newSubscriptionData, subsDateMonth: e.target.value})
                            }
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
                          value={
                            subscriptionMode === "edit"
                              ? formData.subStartDay || ""
                              : newSubscriptionData.subsDateDay || ""
                          }
                          onChange={
                            subscriptionMode === "edit"
                              ? handleChange
                              : (e) => setNewSubscriptionData({...newSubscriptionData, subsDateDay: e.target.value})
                          }
                          placeholder="DD"
                          className="w-full p-2 text-base border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          maxLength="2"
                        />
                        <input
                          type="text"
                          id="subStartYear"
                          name="subStartYear"
                          value={
                            subscriptionMode === "edit"
                              ? formData.subStartYear || ""
                              : newSubscriptionData.subsDateYear || ""
                          }
                          onChange={
                            subscriptionMode === "edit"
                              ? handleChange
                              : (e) => setNewSubscriptionData({...newSubscriptionData, subsDateYear: e.target.value})
                          }
                          placeholder="YYYY"
                          className="w-full p-2 text-base border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          maxLength="4"
                        />
                      </div>
                    </div>
                    
                    <div className="mb-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subscription End:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="relative">
                          <select
                            id="subEndMonth"
                            name="subEndMonth"
                            value={
                              subscriptionMode === "edit"
                                ? formData.subEndMonth || ""
                                : newSubscriptionData.endDateMonth || ""
                            }
                            onChange={
                              subscriptionMode === "edit"
                                ? handleChange
                                : (e) => setNewSubscriptionData({...newSubscriptionData, endDateMonth: e.target.value})
                            }
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
                          value={
                            subscriptionMode === "edit"
                              ? formData.subEndDay || ""
                              : newSubscriptionData.endDateDay || ""
                          }
                          onChange={
                            subscriptionMode === "edit"
                              ? handleChange
                              : (e) => setNewSubscriptionData({...newSubscriptionData, endDateDay: e.target.value})
                          }
                          placeholder="DD"
                          className="w-full p-2 text-base border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          maxLength="2"
                        />
                        <input
                          type="text"
                          id="subEndYear"
                          name="subEndYear"
                          value={
                            subscriptionMode === "edit"
                              ? formData.subEndYear || ""
                              : newSubscriptionData.endDateYear || ""
                          }
                          onChange={
                            subscriptionMode === "edit"
                              ? handleChange
                              : (e) => setNewSubscriptionData({...newSubscriptionData, endDateYear: e.target.value})
                          }
                          placeholder="YYYY"
                          className="w-full p-2 text-base border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          maxLength="4"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subscription Class:
                      </label>
                      <select
                        id="subsclass"
                        name="subsclass"
                        value={
                          subscriptionMode === "edit"
                            ? roleSpecificData.subsclass || ""
                            : newSubscriptionData.subsclass || ""
                        }
                        onChange={
                          subscriptionMode === "edit"
                            ? handleRoleSpecificChange
                            : handleNewSubscriptionChange
                        }
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
                    
                    <div className="flex flex-row items-center justify-center gap-2">
                      <label className="block text-sm font-medium leading-6 text-gray-600">
                        Copies:
                      </label>
                      <input
                        id="copies"
                        name="copies"
                        value={
                          subscriptionMode === "edit"
                            ? roleSpecificData.copies || 1
                            : newSubscriptionData.copies || 1
                        }
                        onChange={
                          subscriptionMode === "edit"
                            ? handleRoleSpecificChange
                            : handleNewSubscriptionChange
                        }
                        type="number"
                        min="1"
                        className="block w-[80px] rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-2 ring-gray-300 placeholder:text-gray-300 focus:ring-3 p-3 text-base"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Payment Details
                        </label>
                        <div className="space-y-3 border rounded-md p-3">
                          <InputField
                            label="Reference No:"
                            id="paymtref"
                            name="paymtref"
                            value={
                              subscriptionMode === "edit"
                                ? roleSpecificData.paymtref || ""
                                : newSubscriptionData.paymtref || ""
                            }
                            onChange={
                              subscriptionMode === "edit"
                                ? handleRoleSpecificChange
                                : handleNewSubscriptionChange
                            }
                            className="text-base"
                          />
                          
                          <div className="grid grid-cols-2 gap-3">
                            <InputField
                              label="Amount:"
                              id="paymtamt"
                              name="paymtamt"
                              type="number"
                              value={
                                subscriptionMode === "edit"
                                  ? roleSpecificData.paymtamt || ""
                                  : newSubscriptionData.paymtamt || ""
                              }
                              onChange={
                                subscriptionMode === "edit"
                                  ? handleRoleSpecificChange
                                  : handleNewSubscriptionChange
                              }
                              className="text-base"
                            />
                            
                            <InputField
                              label="Masses:"
                              id="paymtmasses"
                              name="paymtmasses"
                              type="number"
                              value={
                                subscriptionMode === "edit"
                                  ? roleSpecificData.paymtmasses || ""
                                  : newSubscriptionData.paymtmasses || ""
                              }
                              onChange={
                                subscriptionMode === "edit"
                                  ? handleRoleSpecificChange
                                  : handleNewSubscriptionChange
                              }
                              className="text-base"
                            />
                          </div>
                        </div>
                      </div>
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
                            value={selectedHrgRecord ? (selectedHrgRecord.id || selectedHrgRecord._id || "") : ""}
                            onChange={(e) => {
                              const record = hrgRecords.find(
                                (r) => String(r.id || r._id) === e.target.value
                              );
                              if (record) {
                                setSelectedHrgRecord(record);
                                setRoleSpecificData({
                                  ...record
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
                                {record.recvdate ? formatDateToMonthYear(parseDate(record.recvdate)) : 'Unknown'} 
                                {record.paymtamt ? ` - Php ${record.paymtamt}` : ''}
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
                            value={selectedFomRecord ? (selectedFomRecord.id || selectedFomRecord._id || "") : ""}
                            onChange={(e) => {
                              const record = fomRecords.find(
                                (r) => String(r.id || r._id) === e.target.value
                              );
                              if (record) {
                                setSelectedFomRecord(record);
                                setRoleSpecificData({
                                  ...record
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
                                {record.recvdate ? formatDateToMonthYear(parseDate(record.recvdate)) : 'Unknown'} 
                                {record.paymtamt ? ` - Php ${record.paymtamt}` : ''}
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
                            value={selectedCalRecord ? (selectedCalRecord.id || selectedCalRecord._id || "") : ""}
                            onChange={(e) => {
                              const record = calRecords.find(
                                (r) => String(r.id || r._id) === e.target.value
                              );
                              if (record) {
                                setSelectedCalRecord(record);
                                setRoleSpecificData({
                                  ...record
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
                                {record.recvdate ? formatDateToMonthYear(parseDate(record.recvdate)) : 'Unknown'} 
                                {record.caltype ? ` - ${record.caltype}` : ''}
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
                            : (e) => setNewRoleData({...newRoleData, recvdate: e.target.value})
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
                            : (e) => setNewRoleData({...newRoleData, renewdate: e.target.value})
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
                            : (e) => setNewRoleData({...newRoleData, campaigndate: e.target.value})
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
                            : (e) => setNewRoleData({...newRoleData, paymtref: e.target.value})
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
                            : (e) => setNewRoleData({...newRoleData, paymtamt: e.target.value})
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
                                : (e) => setNewRoleData({...newRoleData, unsubscribe: e.target.checked})
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
                              : (e) => setNewRoleData({...newRoleData, remarks: e.target.value})
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
                            : (e) => setNewRoleData({...newRoleData, recvdate: e.target.value})
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
                            : (e) => setNewRoleData({...newRoleData, paymtref: e.target.value})
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
                            : (e) => setNewRoleData({...newRoleData, paymtamt: e.target.value})
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
                            : (e) => setNewRoleData({...newRoleData, paymtform: e.target.value})
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
                                : (e) => setNewRoleData({...newRoleData, unsubscribe: e.target.checked})
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
                              : (e) => setNewRoleData({...newRoleData, remarks: e.target.value})
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
                            : (e) => setNewRoleData({...newRoleData, recvdate: e.target.value})
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
                            : (e) => setNewRoleData({...newRoleData, caltype: e.target.value})
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
                            : (e) => setNewRoleData({...newRoleData, calqty: e.target.value})
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
                            : (e) => setNewRoleData({...newRoleData, calamt: e.target.value})
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
                            : (e) => setNewRoleData({...newRoleData, paymtref: e.target.value})
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
                            : (e) => setNewRoleData({...newRoleData, paymtamt: e.target.value})
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
                            : (e) => setNewRoleData({...newRoleData, paymtform: e.target.value})
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
                            : (e) => setNewRoleData({...newRoleData, paymtdate: e.target.value})
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
                              : (e) => setNewRoleData({...newRoleData, remarks: e.target.value})
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
      )}
    </>
  );
};

export default Edit;
