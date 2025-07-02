/* eslint-disable no-unused-vars */
import { useUser } from "../../../utils/Hooks/userProvider";
import { roleConfigs } from "../../../utils/roleConfigs";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import axios from "axios";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";
import AreaForm from "../../../utils/areaform";
import InputField from "../input";
import { fetchSubclasses, fetchTypes } from "../../Table/Data/utilData";
import { debounce } from "lodash";
import View from "./view";

// Utility function to normalize address for more consistent duplicate checking
const normalizeAddress = (address) => {
  if (!address || typeof address !== "string") return "";

  return (
    address
      .toUpperCase()
      // Standardize common street abbreviations
      .replace(/\bST\b|\bSTREET\b/gi, "STREET")
      .replace(/\bAVE\b|\bAVENUE\b/gi, "AVENUE")
      .replace(/\bRD\b|\bROAD\b/gi, "ROAD")
      .replace(/\bBLVD\b|\bBOULEVARD\b/gi, "BOULEVARD")
      .replace(/\bLN\b|\bLANE\b/gi, "LANE")
      .replace(/\bDR\b|\bDRIVE\b/gi, "DRIVE")
      // Remove apartment/unit numbers
      .replace(
        /\bAPT\b.*\d+|\bUNIT\b.*\d+|\bNO\b\.?\s*\d+|\bSUITE\b.*\d+/gi,
        ""
      )
      // Remove common punctuation and standardize spacing
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
  );
};

// Utility function to format date to "yyyy-MM-dd"
const formatDateToInput = (date) => {
  const d = new Date(date);
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
};

const Add = ({ fetchClients }) => {
  const { user, hasRole } = useUser(); // Ensure this hook is correctly implemented

  // Array of month names for the dropdown
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
    copies: "1", // Set default value to "1"
    roleType: null,
    subStartMonth: "",
    subStartDay: "",
    subStartYear: "",
    subEndMonth: "",
    subEndDay: "",
    subEndYear: "",
    subscriptionFreq: "",
    subscriptionStart: "",
    subscriptionEnd: "",
    subsclass: ""
  });

  const [addressData, setAddressData] = useState({
    street1: "",
    street2: "",
    barangayMunicipality: "",
    city: "", // Add city to addressData
  });

  const [combinedAddress, setCombinedAddress] = useState("");

  const [selectedCity, setSelectedCity] = useState("");
  const [roleSpecificData, setRoleSpecificData] = useState({});
  const [areaData, setAreaData] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [renewalType, setRenewalType] = useState("current");
  const [lastSubscriptionEnd, setLastSubscriptionEnd] = useState(null);
  const [groups, setGroups] = useState([]);
  const [subclasses, setSubclasses] = useState([]);
  const [types, setTypes] = useState([]);
  const [selectedRole, setSelectedRole] = useState("HRG"); // Default to HRG
  const [potentialDuplicates, setPotentialDuplicates] = useState([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [selectedDuplicate, setSelectedDuplicate] = useState(null);
  const [viewingDuplicate, setViewingDuplicate] = useState(false);

  // Add these new state variables after other state declarations
  const [hrgData, setHrgData] = useState({
    recvdate: "",
    renewdate: "",
    campaigndate: "",
    paymtref: "",
    paymtamt: "",
    unsubscribe: false,
    remarks: ""
  });

  const [fomData, setFomData] = useState({
    recvdate: "",
    paymtamt: "",
    paymtform: "",
    paymtref: "",
    unsubscribe: false,
    remarks: ""
  });

  const [calData, setCalData] = useState({
    recvdate: "",
    caltype: "",
    calqty: "",
    calamt: "",
    paymtref: "",
    paymtamt: "",
    paymtform: "",
    paymtdate: "",
    remarks: ""
  });

  useEffect(() => {
    const userRole = Object.keys(roleConfigs).find((role) => hasRole(role));
    if (userRole && roleConfigs[userRole]) {
      const initialRoleData = Object.keys(
        roleConfigs[userRole].groupFields
      ).reduce((acc, field) => {
        acc[field] = "";
        return acc;
      }, {});
      setRoleSpecificData(initialRoleData);
    }
  }, [hasRole]);

  useEffect(() => {
    if (hasRole("WMM")) {
      setRoleSpecificData({
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
      });
    } else if (hasRole("HRG")) {
      setRoleSpecificData({
        recvdate: "",
        renewdate: "",
        campaigndate: "",
        paymtref: "",
        paymtamt: "",
        unsubscribe: false,
        remarks: "",
      });
    } else if (hasRole("FOM")) {
      setRoleSpecificData({
        recvdate: "",
        paymtamt: "",
        paymtform: "",
        paymtref: "",
        unsubscribe: false,
        remarks: "",
      });
    } else if (hasRole("CAL")) {
      setRoleSpecificData({
        recvdate: "",
        caltype: "",
        calqty: "",
        calamt: "",
        paymtref: "",
        paymtamt: "",
        paymtform: "",
        paymtdate: "",
        remarks: "",
      });
    }
  }, [hasRole]);

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
  }, [hasRole]);
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

  const openModal = () => setShowModal(true);

  // Reset form function to clean up all form data
  const resetForm = () => {
    // Reset main form data
    setFormData({
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
      roleType: null,
      subStartMonth: "",
      subStartDay: "",
      subStartYear: "",
      subEndMonth: "",
      subEndDay: "",
      subEndYear: "",
      subscriptionFreq: "",
      subscriptionStart: "",
      subscriptionEnd: "",
      subsclass: ""
    });

    // Reset address data
    setAddressData({
      street1: "",
      street2: "",
      barangayMunicipality: "",
      city: "", // Add city to addressData
    });

    // Reset combined address
    setCombinedAddress("");

    // Reset selected city
    setSelectedCity("");

    // Reset area data
    setAreaData({});

    // Reset role-specific data states
    setHrgData({
      recvdate: "",
      renewdate: "",
      campaigndate: "",
      paymtref: "",
      paymtamt: "",
      unsubscribe: false,
      remarks: ""
    });

    setFomData({
      recvdate: "",
      paymtamt: "",
      paymtform: "",
      paymtref: "",
      unsubscribe: false,
      remarks: ""
    });

    setCalData({
      recvdate: "",
      caltype: "",
      calqty: "",
      calamt: "",
      paymtref: "",
      paymtamt: "",
      paymtform: "",
      paymtdate: "",
      remarks: ""
    });

    // Reset potential duplicates
    setPotentialDuplicates([]);
    setShowDuplicates(false);
    setSelectedDuplicate(null);
    setViewingDuplicate(false);
    setIsCheckingDuplicates(false);

    // Reset renewal type
    setRenewalType("current");

    // Reset role-specific data
    setRoleSpecificData({});
  };

  // Close modal and reset form
  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const formatDateToMonthYear = (date) => {
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const year = d.getFullYear().toString().slice(-2);
    return `${month}/${day}/${year}`;
  };

  const calculateEndMonth = (startDate, monthsToAdd) => {
    const start = new Date(startDate);
    // Create a new end date by adding months
    const endDate = new Date(start);
    endDate.setMonth(endDate.getMonth() + monthsToAdd);

    // Keep the same day of the month to count full months correctly
    // For example, April 15 + 1 month = May 15

    return endDate;
  };

  // Create a debounced function to check for duplicates
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const checkForDuplicates = useCallback(
    debounce(async (checkData, fieldChanged = null) => {
      // Clear duplicates if all fields are empty or insufficient
      if (
        !checkData.fname &&
        !checkData.lname &&
        !checkData.bdate &&
        !checkData.company &&
        (!checkData.address || checkData.address.length < 3) &&
        (!checkData.cellno || checkData.cellno.length < 5) &&
        !checkData.email.includes("@") &&
        (!checkData.contactnos || checkData.contactnos.length < 5) &&
        !checkData.acode
      ) {
        setPotentialDuplicates([]);
        setShowDuplicates(false);
        setIsCheckingDuplicates(false);
        return;
      }

      try {
        // Prepare the data for sending to the server, prioritizing lname, address, fname
        const duplicateCheckData = {
          ...checkData,
          // Send both original and standardized address for better matching
          address: checkData.address,
          standardizedAddress: normalizeAddress(checkData.address),
          // Break down address components for better matching
          addressComponents: {
            street1: addressData.street1 || "",
            street2: addressData.street2 || "",
            barangay: addressData.barangay || "",
            city: addressData.city || "",
            province: addressData.province || "",
          },
          // Priority flags to indicate to the server the desired search priority
          priorities: {
            lnameHighest: true, // Highest priority
            addressSecond: true, // Second priority
            fnameThird: true, // Third priority
            contactEqualWeight: true, // Similar weights for contact/birth info
          },
        };

        const response = await axios.post(
          `http://${
            import.meta.env.VITE_IP_ADDRESS
          }:3001/clients/check-duplicates`,
          duplicateCheckData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }
        );

        if (response.data.matches && response.data.matches.length > 0) {
          setPotentialDuplicates(response.data.matches);
          setShowDuplicates(true);
        } else {
          setPotentialDuplicates([]);
          setShowDuplicates(false);
        }
      } catch (error) {
        console.error("Error checking for duplicates:", error);
        setPotentialDuplicates([]);
        setShowDuplicates(false);
      } finally {
        setIsCheckingDuplicates(false);
      }
    }, 300), // 300ms debounce for responsive checking
    [] // Empty dependency array to prevent recreation of the debounced function
  );

  // Add an immediate clearing function for better UX
  const immediatelyClearDuplicates = () => {
    if (potentialDuplicates.length > 0) {
      setPotentialDuplicates([]);
      setShowDuplicates(false);
    }
  };

  const handleChange = async (e) => {
    const { name, value } = e.target;

    // For fields that affect duplicate search, immediately clear duplicates for better UX
    const duplicateRelatedFields = [
      "fname",
      "lname",
      "bdate",
      "bdateMonth",
      "bdateDay",
      "bdateYear",
      "email",
      "cellno",
      "contactnos",
      "company",
    ];
    if (duplicateRelatedFields.includes(name)) {
      immediatelyClearDuplicates();
      setIsCheckingDuplicates(true); // Show loading state immediately
    }

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

      setTimeout(() => {
        // Check for duplicates after updating the date
        const checkData = {
          fname: formData.fname,
          lname: formData.lname,
          bdate: formData.bdate || "",
          company: formData.company,
          email: formData.email,
          cellno: formData.cellno,
          contactnos: formData.contactnos,
          address: combinedAddress,
          acode: areaData.acode || "",
        };

        if (
          (checkData.fname && checkData.fname.length > 1) ||
          (checkData.lname && checkData.lname.length > 1) ||
          (checkData.bdate && checkData.bdate.length > 0) ||
          (checkData.company && checkData.company.length > 2) ||
          (checkData.cellno && checkData.cellno.length > 5) ||
          (checkData.email && checkData.email.includes("@")) ||
          (combinedAddress && combinedAddress.length > 3) ||
          (areaData.acode && areaData.acode.length > 3)
        ) {
          checkForDuplicates(checkData, name);
        } else {
          setIsCheckingDuplicates(false);
        }
      }, 0);

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
      // Use current date as the start date
      const today = new Date();

      // Set start date to today (keeping day of month)
      const subscriptionStart = new Date(today);

      // Calculate end date by adding months
      const subscriptionEnd = calculateEndMonth(subscriptionStart, monthsToAdd);

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
        subscriptionStart: formatDateToMonthYear(subscriptionStart),
        subscriptionEnd: formatDateToMonthYear(subscriptionEnd),
        subStartMonth: startMonth,
        subStartDay: startDay,
        subStartYear: startYear,
        subEndMonth: endMonth,
        subEndDay: endDay,
        subEndYear: endYear,
      });

      setRoleSpecificData((prev) => ({
        ...prev,
        subsdate: formatDateToMonthYear(subscriptionStart),
        enddate: formatDateToMonthYear(subscriptionEnd),
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
        subStartMonth: "",
        subStartDay: "",
        subStartYear: "",
        subEndMonth: "",
        subEndDay: "",
        subEndYear: "",
      }));
      return;
    }

    setFormData((prevData) => {
      const newData = {
        ...prevData,
        [name]: value,
      };

      // Trigger duplicate check after state update
      if (duplicateRelatedFields.includes(name) || name === "address") {
        setTimeout(() => {
          // Only check if we have at least one identifying field with enough content
          if (
            (newData.fname && newData.fname.length > 1) ||
            (newData.lname && newData.lname.length > 1) ||
            (newData.bdate && newData.bdate.length > 0) ||
            (newData.company && newData.company.length > 2) ||
            (newData.cellno && newData.cellno.length > 5) ||
            (newData.email && newData.email.includes("@")) ||
            (combinedAddress && combinedAddress.length > 3) ||
            (areaData.acode && areaData.acode.length > 3)
          ) {
            const checkData = {
              fname: newData.fname,
              lname: newData.lname,
              bdate: newData.bdate,
              company: newData.company,
              email: newData.email,
              cellno: newData.cellno,
              contactnos: newData.contactnos,
              address: combinedAddress,
              acode: areaData.acode || "",
            };
            checkForDuplicates(checkData, name);
          } else {
            setIsCheckingDuplicates(false);
          }
        }, 0);
      }

      return newData;
    });
  };

  const formatAddressLines = (addressData, area, areaData) => {
    const lines = [];

    // Line 1: House/Building Number & Street Name, subdivision
    const streetParts = [addressData.street1, addressData.street2].filter(Boolean);
    if (streetParts.length > 0) {
      lines.push(streetParts.join(", "));
    }

    // Line 2: Barangay
    if (addressData.barangayMunicipality) {
      lines.push(addressData.barangayMunicipality);
    }

    // Line 3: Postal code and area (city)
    const postalParts = [areaData.zipcode, area].filter(Boolean);
    if (postalParts.length > 0) {
      lines.push(postalParts.join(" "));
    }

    return lines.filter(Boolean).join("\n");
  };

  const handleAddressChange = (type, value) => {
    if (potentialDuplicates.length > 0) {
      immediatelyClearDuplicates();
    }
    setIsCheckingDuplicates(true);

    setAddressData((prev) => {
      const newAddressData = {
        ...prev,
        [type]: value,
      };
      
      const formattedAddress = formatAddressLines(newAddressData, formData.area, areaData);
      setCombinedAddress(formattedAddress);
      
      // Also update the formData.address field
      setFormData(prev => ({
        ...prev,
        address: formattedAddress
      }));

      setTimeout(() => {
        const checkData = {
          fname: formData.fname,
          lname: formData.lname,
          bdate: formData.bdate,
          company: formData.company,
          email: formData.email,
          cellno: formData.cellno,
          contactnos: formData.contactnos,
          address: formattedAddress,
          acode: areaData.acode || "",
        };
        checkForDuplicates(checkData, "address");
      }, 100);

      return newAddressData;
    });
  };

  const handleAreaFormChange = (field, value) => {
    handleAreaChange(field, value);
    
    if (field === "city") {
      // Update formData.area with the city name
      setFormData(prev => ({
        ...prev,
        area: value
      }));
      
      setAddressData(prev => {
        const newAddressData = {
          ...prev,
          city: value
        };
        
        const formattedAddress = formatAddressLines(newAddressData, value, areaData);
        setCombinedAddress(formattedAddress);
        setFormData(prev => ({
          ...prev,
          area: value,
          address: formattedAddress
        }));
        
        return newAddressData;
      });
    }
  };

  // Update useEffect for combining address
  useEffect(() => {
    const formattedAddress = formatAddressLines(addressData, formData.area, areaData);
    if (combinedAddress !== formattedAddress) {
      setCombinedAddress(formattedAddress);
      // Also update the formData.address field
      setFormData(prev => ({
        ...prev,
        address: formattedAddress
      }));
    }
  }, [addressData, formData.area, areaData]);

  const handleCitySelect = (cityname) => {
    setSelectedCity(cityname);
    // Update formData.area with the city name
    setFormData(prev => ({
      ...prev,
      area: cityname
    }));
    handleAddressChange("city", cityname);
  };

  const handleAreaChange = (field, value) => {
    // If changing acode field, immediately clear duplicates and show loading state
    if (field === "acode" && potentialDuplicates.length > 0) {
      immediatelyClearDuplicates();
    }

    // Set loading state for acode changes
    if (field === "acode" && value) {
      setIsCheckingDuplicates(true);
    }

    setAreaData((prevData) => {
      const newAreaData = {
        ...prevData,
        [field]: value,
      };

      // If acode changes, we should check for duplicates
      if (field === "acode" && value) {
        // Small delay to allow state updates
        setTimeout(() => {
          const checkData = {
            fname: formData.fname,
            lname: formData.lname,
            bdate: formData.bdate,
            company: formData.company,
            email: formData.email,
            cellno: formData.cellno,
            contactnos: formData.contactnos,
            address: combinedAddress,
            acode: value,
          };
          checkForDuplicates(checkData, "acode");
        }, 100);
      }

      return newAreaData;
    });
  };

  const handleRoleSpecificChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    setRoleSpecificData(prev => {
      const updated = {
        ...prev,
        [name]: type === "checkbox" ? checked : value.toUpperCase()
      };

      // Also update the role-specific state
      if (selectedRole === "HRG") {
        setHrgData(updated);
      } else if (selectedRole === "FOM") {
        setFomData(updated);
      } else if (selectedRole === "CAL") {
        setCalData(updated);
      }

      return updated;
    });
  };

  const handleRenewDateToday = () => {
    const today = new Date();
    setRoleSpecificData((prev) => ({
      ...prev,
      renewdate: formatDateToInput(today),
    }));
  };

  const FOMFields = (data) => {
    return (
      data.recvdate ||
      data.paymtamt ||
      data.paymtform ||
      data.paymtref ||
      data.unsubscribe ||
      data.remarks
    );
  };

  const CALFields = (data) => {
    return (
      data.recvdate ||
      data.caltype ||
      data.calqty ||
      data.calamt ||
      data.paymtref ||
      data.paymtamt ||
      data.paymtform ||
      data.paymtdate ||
      data.remarks
    );
  };

  const HRGFields = (data) => {
    return (
      data.recvdate ||
      data.renewdate ||
      data.campaigndate ||
      data.paymtref ||
      data.paymtamt ||
      data.unsubscribe ||
      data.remarks
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowConfirmation(true);
  };

  const handleConfirmedSubmit = async () => {
    // Ensure birth date is properly formatted before submission
    const formatBdate = () => {
      if (formData.bdateMonth && formData.bdateDay && formData.bdateYear) {
        return `${formData.bdateMonth}/${formData.bdateDay}/${formData.bdateYear}`;
      }
      return formData.bdate || "";
    };

    // Format the date to "DD MMM YYYY"
    const formatDate = (date) => {
      return new Date(date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    const clientData = {
      ...formData,
      bdate: formatBdate(),
      ...areaData,
    };

    // Prepare role data submissions
    const roleSubmissions = [];

    // Check and prepare WMM data if user has WMM role
    if (hasRole("WMM")) {
      roleSubmissions.push({
        roleType: "WMM",
        roleData: {
          ...roleSpecificData,
          subscriptionFreq: formData.subscriptionFreq,
          subscriptionStart: formData.subscriptionStart,
          subscriptionEnd: formData.subscriptionEnd,
          subsclass: formData.subsclass,
          calendar: roleSpecificData.calendar || false
        }
      });
    }

    // Check and prepare HRG data if it exists
    if (Object.values(hrgData).some(value => value !== "" && value !== false)) {
      roleSubmissions.push({
        roleType: "HRG",
        roleData: hrgData
      });
    }

    // Check and prepare FOM data if it exists
    if (Object.values(fomData).some(value => value !== "" && value !== false)) {
      roleSubmissions.push({
        roleType: "FOM",
        roleData: fomData
      });
    }

    // Check and prepare CAL data if it exists
    if (Object.values(calData).some(value => value !== "" && value !== false)) {
      roleSubmissions.push({
        roleType: "CAL",
        roleData: calData
      });
    }

    const submissionData = {
      clientData,
      roleSubmissions,
      adddate: formatDate(new Date()),
    };

    console.log("submissionData: ", submissionData);

    try {
      const response = await axios.post(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/clients/add`,
        submissionData
      );
      if (response.data.success) {
        fetchClients();
        closeModal();
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setShowConfirmation(false);
    }
  };

  const handleRoleToggle = (role) => {
    // Save current role data before switching
    if (selectedRole === "HRG") {
      setHrgData(roleSpecificData);
    } else if (selectedRole === "FOM") {
      setFomData(roleSpecificData);
    } else if (selectedRole === "CAL") {
      setCalData(roleSpecificData);
    }

    // Set the new role
    setSelectedRole(role);

    // Load the saved data for the new role
    if (role === "HRG") {
      setRoleSpecificData(hrgData);
    } else if (role === "FOM") {
      setRoleSpecificData(fomData);
    } else if (role === "CAL") {
      setRoleSpecificData(calData);
    }
  };

  // Function to handle viewing a duplicate client
  const handleViewDuplicate = async (clientId) => {
    try {
      // Fetch full client details
      const response = await axios.get(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/clients/${clientId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (response.data) {
        // Format the role-specific data properly for the View component
        const clientData = response.data;

        // Critical: Determine which services this client should have based on user roles
        // This is necessary to control visibility of different role sections
        if (!clientData.services) {
          clientData.services = [];
        }

        // For WMM users, always add WMM to services to ensure it's displayed
        if (hasRole("WMM") || hasRole("Admin")) {
          if (!clientData.services.includes("WMM")) {
            clientData.services.push("WMM");
          }
        }

        // Only add other service types if user has those roles
        if (hasRole("HRG") || hasRole("Admin")) {
          if (!clientData.services.includes("HRG")) {
            clientData.services.push("HRG");
          }
        }

        if (hasRole("FOM") || hasRole("Admin")) {
          if (!clientData.services.includes("FOM")) {
            clientData.services.push("FOM");
          }
        }

        if (hasRole("CAL") || hasRole("Admin")) {
          if (!clientData.services.includes("CAL")) {
            clientData.services.push("CAL");
          }
        }

        // Handle WMM data - keep as array if it already is one
        if (clientData.wmmData) {
          if (Array.isArray(clientData.wmmData)) {
            // If it's already an array, wrap it in records structure for Edit component
            clientData.wmmData = { records: clientData.wmmData };
          } else if (
            clientData.wmmData.records &&
            Array.isArray(clientData.wmmData.records)
          ) {
            // If it already has a records property that's an array, keep this structure
            // This is the format needed by Edit component
          } else {
            // If it's a single object, convert to records array structure
            clientData.wmmData = {
              records: [clientData.wmmData].filter(
                (item) => Object.keys(item).length > 0
              )
            };
          }
        } else {
          clientData.wmmData = { records: [] };
        }

        // Process other role data in the format expected by View component

        // Format HRG data if present
        if (clientData.hrgData) {
          if (Array.isArray(clientData.hrgData)) {
            clientData.hrgData = { records: clientData.hrgData };
          } else if (!clientData.hrgData.records) {
            clientData.hrgData = {
              records: [clientData.hrgData].filter(
                (item) => Object.keys(item).length > 0
              ),
            };
          }
        } else {
          clientData.hrgData = { records: [] };
        }

        // Format FOM data if present
        if (clientData.fomData) {
          if (Array.isArray(clientData.fomData)) {
            clientData.fomData = { records: clientData.fomData };
          } else if (!clientData.fomData.records) {
            clientData.fomData = {
              records: [clientData.fomData].filter(
                (item) => Object.keys(item).length > 0
              ),
            };
          }
        } else {
          clientData.fomData = { records: [] };
        }

        // Format CAL data if present
        if (clientData.calData) {
          if (Array.isArray(clientData.calData)) {
            clientData.calData = { records: clientData.calData };
          } else if (!clientData.calData.records) {
            clientData.calData = {
              records: [clientData.calData].filter(
                (item) => Object.keys(item).length > 0
              ),
            };
          }
        } else {
          clientData.calData = { records: [] };
        }

        setSelectedDuplicate(clientData);
        setViewingDuplicate(true);
      }
    } catch (error) {
      console.error("Error fetching client details:", error);
    }
  };

  // Handle duplicate edit success
  const handleDuplicateEditSuccess = (updatedData) => {
    // Create a properly formatted copy of the updated data
    const formattedData = { ...updatedData };

    // Ensure the role-specific data is properly structured for future use
    // Format WMM data if present
    if (formattedData.wmmData) {
      if (Array.isArray(formattedData.wmmData)) {
        // If it's an array, we need to wrap it in the records structure
        formattedData.wmmData = { records: formattedData.wmmData };
      } else if (!formattedData.wmmData.records) {
        // If it doesn't have records property, create one
        formattedData.wmmData = {
          records: [formattedData.wmmData].filter(
            (item) => Object.keys(item).length > 0
          ),
        };
      }
      // If it already has records property that's an array, we leave it as is
    } else {
      formattedData.wmmData = { records: [] };
    }

    // Format HRG data if present
    if (formattedData.hrgData) {
      if (Array.isArray(formattedData.hrgData)) {
        formattedData.hrgData = { records: formattedData.hrgData };
      } else if (!formattedData.hrgData.records) {
        formattedData.hrgData = {
          records: [formattedData.hrgData].filter(
            (item) => Object.keys(item).length > 0
          ),
        };
      }
    }

    // Format FOM data if present
    if (formattedData.fomData) {
      if (Array.isArray(formattedData.fomData)) {
        formattedData.fomData = { records: formattedData.fomData };
      } else if (!formattedData.fomData.records) {
        formattedData.fomData = {
          records: [formattedData.fomData].filter(
            (item) => Object.keys(item).length > 0
          ),
        };
      }
    }

    // Format CAL data if present
    if (formattedData.calData) {
      if (Array.isArray(formattedData.calData)) {
        formattedData.calData = { records: formattedData.calData };
      } else if (!formattedData.calData.records) {
        formattedData.calData = {
          records: [formattedData.calData].filter(
            (item) => Object.keys(item).length > 0
          ),
        };
      }
    }

    setSelectedDuplicate(formattedData);
    fetchClients(); // Refresh client list
  };

  // Handle closing the duplicate view
  const handleCloseDuplicateView = () => {
    setViewingDuplicate(false);
    setSelectedDuplicate(null);
  };

  // Memoize the DuplicatePanel component to prevent unnecessary re-renders
  const MemoizedDuplicatePanel = useMemo(() => {
    // Side panel for displaying potential duplicates
    const DuplicatePanel = () => {
      return (
        <div className="border-l-0 lg:border-l border-gray-200 w-full lg:w-[500px] h-full max-h-[90vh] overflow-hidden bg-white shadow-md flex flex-col mt-0 lg:mt-0">
          <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 py-3 px-4 border-b border-gray-200 z-10">
            <div className="flex items-center justify-between">
              <div>
                {isCheckingDuplicates ? (
                  <h3 className="text-gray-800 text-base font-medium flex items-center">
                    <span className="animate-pulse mr-2">Checking...</span>
                    <svg
                      className="animate-spin h-4 w-4 text-blue-500"
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
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </h3>
                ) : (
                  <h3 className="text-gray-800 text-base font-medium">
                    {potentialDuplicates.length > 0 
                      ? `${potentialDuplicates.length} Possible ${potentialDuplicates.length === 1 ? "Match" : "Matches"}`
                      : "Potential Matches"}
                  </h3>
                )}
                <p className="text-sm text-gray-500 mt-0.5">
                  {isCheckingDuplicates
                    ? "Searching for possible duplicates..."
                    : potentialDuplicates.length > 0
                    ? "Similar records found in database" 
                    : "No matches found yet"}
                </p>
              </div>
              {potentialDuplicates.length > 0 && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-800">
                  {potentialDuplicates.length}
                </span>
              )}
            </div>
          </div>

          <div
            className="overflow-y-auto p-3 flex-grow custom-scrollbar"
            style={{ maxHeight: "calc(90vh - 70px)", overflowY: "auto" }}
          >
            {isCheckingDuplicates && potentialDuplicates.length === 0 ? (
              <div className="flex justify-center items-center h-32 text-gray-400">
                <p>Searching for matching records...</p>
              </div>
            ) : potentialDuplicates.length === 0 ? (
              <div className="flex justify-center items-center h-32 text-gray-400">
                <p>Enter client details to find matches</p>
              </div>
            ) : (
              <div className="space-y-3">
                {potentialDuplicates.map((client) => (
                  <div
                    key={client.id}
                    className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden hover:border-blue-300 hover:shadow transition-all duration-200"
                  >
                    <div className="px-3 py-2 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                      <div className="flex flex-col">
                        <div className="font-medium text-gray-800 w-full">
                          {client.lname || client.fname || client.mname
                            ? `${client.lname || ""}, ${client.fname || ""} ${
                                client.mname ? client.mname.charAt(0) + "." : ""
                              }`
                            : client.company
                            ? client.company
                            : "No Name"}
                        </div>

                        {/* Match strength indicator */}
                        {client.totalScore !== undefined && (
                          <div className="mt-0.5">
                            <div
                              className={`text-xs font-medium px-1.5 py-0.5 rounded-sm inline-block ${
                                client.totalScore > 40
                                  ? "bg-red-100 text-red-800 border border-red-200"
                                  : client.totalScore > 30
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : client.totalScore > 20
                                  ? "bg-orange-50 text-orange-600 border border-orange-100"
                                  : "bg-blue-50 text-blue-600 border border-blue-100"
                              }`}
                            >
                              {client.totalScore > 40
                                ? "Very strong match"
                                : client.totalScore > 30
                                ? "Strong match"
                                : client.totalScore > 20
                                ? "Likely match"
                                : "Possible match"}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="px-3 py-2 text-xs">
                      {/* Match indicators */}
                      {(client.fnameMatch > 0 ||
                        client.lnameMatch > 0 ||
                        client.addressExactMatch > 0 ||
                        client.addressTokenMatch > 0 ||
                        client.addressComponentMatch > 0 ||
                        client.cellnoMatch > 0 ||
                        client.contactnosMatch > 0 ||
                        client.emailMatch > 0 ||
                        client.bdateMatch > 0 ||
                        client.companyMatch > 0 ||
                        client.acodeMatch > 0) && (
                        <div className="flex flex-wrap gap-1.5 mb-2.5">
                          {client.lnameMatch > 0 && (
                            <span className="bg-red-50 text-red-600 text-xs font-medium rounded-sm px-1.5 py-0.5 border border-red-100 flex items-center">
                              Last name
                            </span>
                          )}
                          {(client.addressExactMatch > 0 ||
                            client.addressTokenMatch > 0 ||
                            client.addressComponentMatch > 0) && (
                            <span className="bg-amber-50 text-amber-600 text-xs font-medium rounded-sm px-1.5 py-0.5 border border-amber-100 flex items-center">
                              Address
                            </span>
                          )}
                          {client.fnameMatch > 0 && (
                            <span className="bg-orange-50 text-orange-600 text-xs font-medium rounded-sm px-1.5 py-0.5 border border-orange-100 flex items-center">
                              First Name
                            </span>
                          )}
                          {(client.cellnoMatch > 0 ||
                            client.contactnosMatch > 0) && (
                            <span className="bg-green-50 text-green-600 text-xs font-medium rounded-sm px-1.5 py-0.5 border border-green-100">
                              Phone
                            </span>
                          )}
                          {client.emailMatch > 0 && (
                            <span className="bg-blue-50 text-blue-600 text-xs font-medium rounded-sm px-1.5 py-0.5 border border-blue-100">
                              Email
                            </span>
                          )}
                          {client.bdateMatch > 0 && (
                            <span className="bg-purple-50 text-purple-600 text-xs font-medium rounded-sm px-1.5 py-0.5 border border-purple-100">
                              Birthdate
                            </span>
                          )}
                          {client.companyMatch > 0 && (
                            <span className="bg-indigo-50 text-indigo-600 text-xs font-medium rounded-sm px-1.5 py-0.5 border border-indigo-100">
                              Company
                            </span>
                          )}
                          {client.acodeMatch > 0 && (
                            <span className="bg-gray-50 text-purple-600 text-xs font-medium rounded-sm px-1.5 py-0.5 border border-purple-100">
                              Area Code
                            </span>
                          )}
                        </div>
                      )}

                      {/* Service tags - Display what services this client has */}
                      {client.services && client.services.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {client.services.map((service) => {
                            let bgColor, textColor, borderColor;
                            switch (service) {
                              case "WMM":
                                bgColor = "bg-indigo-50";
                                textColor = "text-indigo-600";
                                borderColor = "border-indigo-100";
                                break;
                              case "HRG":
                                bgColor = "bg-teal-50";
                                textColor = "text-teal-600";
                                borderColor = "border-teal-100";
                                break;
                              case "FOM":
                                bgColor = "bg-rose-50";
                                textColor = "text-rose-600";
                                borderColor = "border-rose-100";
                                break;
                              case "CAL":
                                bgColor = "bg-cyan-50";
                                textColor = "text-cyan-600";
                                borderColor = "border-cyan-100";
                                break;
                              default:
                                bgColor = "bg-gray-50";
                                textColor = "text-gray-600";
                                borderColor = "border-gray-100";
                            }

                            return (
                              <span
                                key={service}
                                className={`${bgColor} ${textColor} text-xs font-medium rounded-sm px-1.5 py-0.5 border ${borderColor} flex items-center`}
                              >
                                <svg
                                  className="w-2.5 h-2.5 mr-0.5"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  ></path>
                                </svg>
                                {service}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Show no fields info */}
                      {!(
                        client.bdate ||
                        client.cellno ||
                        client.contactnos ||
                        client.email
                      ) && (
                        <div className="text-sm text-gray-400 italic mb-1.5">
                          Only address available
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-1.5">
                        {client.bdate && (
                          <div className="flex items-center text-gray-600 text-sm">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3.5 w-3.5 mr-1.5 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span>Born: {client.bdate}</span>
                          </div>
                        )}

                        {(client.cellno || client.contactnos) && (
                          <div className="flex items-center text-gray-600 text-sm">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3.5 w-3.5 mr-1.5 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                              />
                            </svg>
                            <span>{client.cellno || client.contactnos}</span>
                          </div>
                        )}

                        {client.email && (
                          <div className="flex items-center text-gray-600 text-sm">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3.5 w-3.5 mr-1.5 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                              />
                            </svg>
                            <span className="truncate">{client.email}</span>
                          </div>
                        )}

                        {client.company && (
                          <div className="flex items-center text-gray-600 text-sm">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3.5 w-3.5 mr-1.5 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                              />
                            </svg>
                            <span className="truncate">{client.company}</span>
                          </div>
                        )}

                        {client.address && (
                          <div className="flex items-center text-gray-600 text-sm">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3.5 w-3.5 mr-1.5 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            <span className="truncate">
                              {client.address &&
                                client.address.replace(/\r\n/g, ", ")}
                            </span>
                          </div>
                        )}

                        {client.acode && (
                          <div className="flex items-center text-gray-600 text-sm">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3.5 w-3.5 mr-1.5 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span className="truncate">
                              Area Code: {client.acode}{" "}
                              {client.area && `(${client.area})`}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => handleViewDuplicate(client.id)}
                          className="px-2.5 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors shadow-sm"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Style for scrollbar */}
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

    return DuplicatePanel;
  }, [isCheckingDuplicates, potentialDuplicates.length, handleViewDuplicate]);

  // Confirmation Dialog Component
  const ConfirmationDialog = () => {
    if (!showConfirmation) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
          <h3 className="text-xl font-semibold mb-4">Confirm Submission</h3>
          <p className="mb-6">
            Are you sure you want to add this client? This action cannot be
            undone.
          </p>
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              onClick={() => setShowConfirmation(false)}
              className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md text-base"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmedSubmit}
              className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-md text-base"
            >
              Confirm
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      <Button
        onClick={openModal}
        className="bg-green-600 mb-4 hover:bg-green-700 text-white"
      >
        Add Client
      </Button>

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={closeModal}
          className="bg-gray-400 rounded-md bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border border-gray-100 max-w-[95vw] w-auto overflow-hidden"
        >
          {/* Confirmation Dialog */}
          <ConfirmationDialog />

          {/* Show the View component when viewing a duplicate */}
          {viewingDuplicate && selectedDuplicate && (
            <View
              rowData={selectedDuplicate}
              onClose={handleCloseDuplicateView}
              onEditSuccess={handleDuplicateEditSuccess}
            />
          )}

          {/* Only show the form if not viewing a duplicate */}
          {!viewingDuplicate && (
            <>
              {/* Remove the mobile toggle for duplicates/form since we always show both */}
              {/* No need for showDuplicatesOnMobile anymore */}

              <div className="flex flex-col lg:flex-row max-h-[100vh] overflow-auto">
                <form
                  onSubmit={handleSubmit}
                  className="flex-1 p-4 overflow-y-auto lg:max-w-[calc(100%-380px)]"
                >
                  <div className="mb-2 border-b pb-2">
                    <h1 className="text-black text-3xl font-bold">
                      Add Client
                    </h1>
                    <p className="text-gray-500 text-base">
                      Fill in the details to add a new client
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-4">
                    {/* Personal Information Card */}
                    <div>
                      <div className="">
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
                          autoComplete="off"
                        />
                        <InputField
                          label="Middle Name:"
                          id="mname"
                          name="mname"
                          value={formData.mname}
                          onChange={handleChange}
                          uppercase={true}
                          className="text-base"
                          autoComplete="off"
                        />
                        <InputField
                          label="Last Name:"
                          id="lname"
                          name="lname"
                          value={formData.lname}
                          onChange={handleChange}
                          uppercase={true}
                          className="text-base"
                          autoComplete="off"
                        />
                        <InputField
                          label="Suffix:"
                          id="sname"
                          name="sname"
                          value={formData.sname}
                          onChange={handleChange}
                          uppercase={true}
                          className="text-base"
                          autoComplete="off"
                        />
                        <div className="mb-2">
                          <label className="block text-black text-xl mb-1">
                            Birth Date:
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="relative">
                              <select
                                id="bdateMonth"
                                name="bdateMonth"
                                value={formData.bdateMonth}
                                onChange={handleChange}
                                className="w-full p-2 text-lg border-2 rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all duration-300"
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
                              className="w-full p-2 text-lg border-2 rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all duration-300"
                              autoComplete="off"
                              maxLength="2"
                            />
                            <input
                              type="text"
                              id="bdateYear"
                              name="bdateYear"
                              value={formData.bdateYear}
                              onChange={handleChange}
                              placeholder="YYYY"
                              className="w-full p-2 text-lg border-2 rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all duration-300"
                              autoComplete="off"
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
                        <div className="flex gap-2">
                          <div className="relative w-full">
                            <select
                              id="type"
                              name="type"
                              value={formData.type}
                              onChange={handleChange}
                              className="
                                w-full 
                                p-2 
                                pl-3 
                                pr-8 
                                border-2 
                                rounded-md 
                                text-xl 
                                bg-white 
                                appearance-none 
                                cursor-pointer 
                                border-gray-300 
                                focus:border-blue-500 
                                focus:ring-2 
                                focus:ring-blue-200 
                                focus:outline-none 
                                relative 
                                z-10
                              "
                            >
                              <option value="">Select a type</option>
                              {types.map((type) => (
                                <option key={type.id} value={type.id}>
                                  {type.id} - {type.name}
                                </option>
                              ))}
                            </select>
                            <div
                              className="
                              pointer-events-none 
                              absolute 
                              inset-y-0 
                              right-0 
                              flex 
                              items-center 
                              px-2 
                              text-gray-700
                            "
                            >
                              <svg
                                className="fill-current h-4 w-4"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                              </svg>
                            </div>
                          </div>

                          <div className="relative w-full">
                            <select
                              id="group"
                              name="group"
                              value={formData.group}
                              onChange={handleChange}
                              className="
                                  w-full 
                                  p-2 
                                  pl-3 
                                  pr-8 
                                  border-2 
                                  rounded-md 
                                  text-xl 
                                  bg-white 
                                  appearance-none 
                                  cursor-pointer 
                                  border-gray-300 
                                  focus:border-blue-500 
                                  focus:ring-2 
                                  focus:ring-blue-200 
                                  focus:outline-none 
                                  relative 
                                  z-10
                                "
                            >
                              <option value="">Select a group</option>
                              {groups.map((group) => (
                                <option key={group.id} value={group.id}>
                                  {group.id} - {group.name}
                                </option>
                              ))}
                            </select>
                            <div
                              className="
                                pointer-events-none 
                                absolute 
                                inset-y-0 
                                right-0 
                                flex 
                                items-center 
                                px-2 
                                text-gray-700
                              "
                            >
                              <svg
                                className="fill-current h-4 w-4"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Address Information Card */}
                    <div>
                      <div className="space-y-3">
                        <InputField
                          label="House/Building Number & Street Name:"
                          id="street1"
                          name="street1"
                          value={addressData.street1}
                          onChange={(e) =>
                            handleAddressChange("street1", e.target.value)
                          }
                          uppercase={true}
                          className="text-base"
                          autoComplete="off"
                        />
                        <InputField
                          label="Subdivision/Compound Name:"
                          id="street2"
                          name="street2"
                          value={addressData.street2}
                          onChange={(e) =>
                            handleAddressChange("street2", e.target.value)
                          }
                          uppercase={true}
                          className="text-base"
                          autoComplete="off"
                        />
                        <InputField
                          label="Barangay:"
                          id="barangayMunicipality"
                          name="barangayMunicipality"
                          value={addressData.barangayMunicipality}
                          onChange={(e) =>
                            handleAddressChange("barangayMunicipality", e.target.value)
                          }
                          uppercase={true}
                          className="text-base"
                          autoComplete="off"
                        />
                        <AreaForm onAreaChange={handleAreaFormChange} />
                        <div className="mt-4">
                          <InputField
                            label="Address Preview:"
                            id="combinedAddress"
                            name="combinedAddress"
                            value={combinedAddress}
                            type="textarea"
                            onChange={(e) => {
                              const value = e.target.value.toUpperCase();
                              clearTimeout(window.addressPreviewTimeout);
                              window.addressPreviewTimeout = setTimeout(() => {
                                setCombinedAddress(value);
                              }, 100);
                            }}
                            className="w-full h-[160px] p-2 border rounded-md text-base whitespace-pre-line"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Contact Information Card */}
                    <div>
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
                      <div className="mb-2">
                        <InputField
                          className="w-full h-[160px] p-2 border rounded-md text-base"
                          label="Remarks:"
                          id="remarks"
                          name="remarks"
                          value={formData.remarks}
                          onChange={handleChange}
                          type="textarea"
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
                          <div className="flex mb-4 mt-2">
                            <div className="flex w-full bg-gray-100 rounded-lg overflow-hidden">
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
                            </div>
                          </div>
                          <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-4 mb-2 p-2 w-full">
                              {selectedRole === "HRG" && (
                                <div className="w-full">
                                  <h1 className="text-black mb-2 font-bold text-lg">
                                    HRG Add
                                  </h1>
                                  <InputField
                                    label="Received Date:"
                                    id="recvdate"
                                    name="recvdate"
                                    value={roleSpecificData.recvdate}
                                    onChange={handleRoleSpecificChange}
                                    className="text-base w-full"
                                  />
                                  <InputField
                                    label="Campaign Date:"
                                    id="campaigndate"
                                    name="campaigndate"
                                    value={roleSpecificData.campaigndate}
                                    onChange={handleRoleSpecificChange}
                                    className="text-base w-full"
                                  />
                                  <InputField
                                    label="Payment Reference:"
                                    id="paymtref"
                                    name="paymtref"
                                    value={roleSpecificData.paymtref}
                                    onChange={handleRoleSpecificChange}
                                    className="text-base w-full"
                                  />
                                  <InputField
                                    label="Payment Amount:"
                                    id="paymtamt"
                                    name="paymtamt"
                                    value={roleSpecificData.paymtamt}
                                    onChange={handleRoleSpecificChange}
                                    className="text-base w-full"
                                  />
                                  <div className="mb-2">
                                    <label
                                      htmlFor="unsubscribe"
                                      className="text-black font-bold mr-2 text-base"
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
                                      className="text-base"
                                    />
                                  </div>
                                  <div className="mb-2 w-full">
                                    <label
                                      htmlFor="remarks"
                                      className="block text-black font-bold mb-1 text-base"
                                    >
                                      Remarks:
                                    </label>
                                    <textarea
                                      id="remarks"
                                      name="remarks"
                                      value={roleSpecificData.remarks || ""}
                                      onChange={handleRoleSpecificChange}
                                      className="w-full p-2 border rounded-md text-base"
                                      rows="3"
                                    />
                                  </div>
                                </div>
                              )}
                              {selectedRole === "FOM" && (
                                <div className="w-full">
                                  <h1 className="text-black mb-2 font-bold text-lg">
                                    FOM Add
                                  </h1>
                                  <InputField
                                    label="Received Date:"
                                    id="recvdate"
                                    name="recvdate"
                                    value={roleSpecificData.recvdate}
                                    onChange={handleRoleSpecificChange}
                                    className="text-base w-full"
                                  />
                                  <InputField
                                    label="Payment Reference:"
                                    id="paymtref"
                                    name="paymtref"
                                    value={roleSpecificData.paymtref}
                                    onChange={handleRoleSpecificChange}
                                    className="text-base w-full"
                                  />
                                  <InputField
                                    label="Payment Amount:"
                                    id="paymtamt"
                                    name="paymtamt"
                                    value={roleSpecificData.paymtamt}
                                    onChange={handleRoleSpecificChange}
                                    className="text-base w-full"
                                  />
                                  <InputField
                                    label="Payment Form:"
                                    id="paymtform"
                                    name="paymtform"
                                    value={roleSpecificData.paymtform}
                                    onChange={handleRoleSpecificChange}
                                    className="text-base w-full"
                                  />
                                  <div className="mb-2">
                                    <label
                                      htmlFor="unsubscribe"
                                      className="text-black font-bold mr-2 text-base"
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
                                      className="text-base"
                                    />
                                  </div>
                                  <div className="mb-2 w-full">
                                    <label
                                      htmlFor="remarks"
                                      className="block text-black font-bold mb-1 text-base"
                                    >
                                      Remarks:
                                    </label>
                                    <textarea
                                      id="remarks"
                                      name="remarks"
                                      value={roleSpecificData.remarks || ""}
                                      onChange={handleRoleSpecificChange}
                                      className="w-full p-2 border rounded-md text-base"
                                      rows="3"
                                    />
                                  </div>
                                </div>
                              )}
                              {selectedRole === "CAL" && (
                                <div className="w-full">
                                  <h1 className="text-black mb-2 font-bold text-lg">
                                    CAL Add
                                  </h1>
                                  <div className="grid grid-cols-2 gap-4 w-full">
                                    <div className="w-full">
                                      <InputField
                                        label="Received Date:"
                                        id="recvdate"
                                        name="recvdate"
                                        value={roleSpecificData.recvdate}
                                        onChange={handleRoleSpecificChange}
                                        className="text-base w-full"
                                      />
                                      <InputField
                                        label="Calendar Type:"
                                        id="caltype"
                                        name="caltype"
                                        value={roleSpecificData.caltype}
                                        onChange={handleRoleSpecificChange}
                                        className="text-base w-full"
                                      />
                                      <InputField
                                        label="Calendar Quantity:"
                                        id="calqty"
                                        name="calqty"
                                        value={roleSpecificData.calqty}
                                        onChange={handleRoleSpecificChange}
                                        className="text-base w-full"
                                      />
                                      <InputField
                                        label="Calendar Amount:"
                                        id="calamt"
                                        name="calamt"
                                        value={roleSpecificData.calamt}
                                        onChange={handleRoleSpecificChange}
                                        className="text-base w-full"
                                      />
                                    </div>
                                    <div className="w-full">
                                      <InputField
                                        label="Payment Reference:"
                                        id="paymtref"
                                        name="paymtref"
                                        value={roleSpecificData.paymtref}
                                        onChange={handleRoleSpecificChange}
                                        className="text-base w-full"
                                      />
                                      <InputField
                                        label="Payment Amount:"
                                        id="paymtamt"
                                        name="paymtamt"
                                        value={roleSpecificData.paymtamt}
                                        onChange={handleRoleSpecificChange}
                                        className="text-base w-full"
                                      />
                                      <InputField
                                        label="Payment Form:"
                                        id="paymtform"
                                        name="paymtform"
                                        value={roleSpecificData.paymtform}
                                        onChange={handleRoleSpecificChange}
                                        className="text-base w-full"
                                      />
                                      <InputField
                                        label="Payment Date:"
                                        id="paymtdate"
                                        name="paymtdate"
                                        value={roleSpecificData.paymtdate}
                                        onChange={handleRoleSpecificChange}
                                        className="text-base w-full"
                                      />
                                    </div>
                                  </div>
                                  <div className="mb-2 mt-2 w-full">
                                    <label
                                      htmlFor="remarks"
                                      className="block text-black font-bold mb-1 text-base"
                                    >
                                      Remarks:
                                    </label>
                                    <textarea
                                      id="remarks"
                                      name="remarks"
                                      value={roleSpecificData.remarks || ""}
                                      onChange={handleRoleSpecificChange}
                                      className="w-full p-2 border rounded-md text-base"
                                      rows="3"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {hasRole("WMM") && (
                      <div className="p-4 border rounded-lg shadow-sm">
                        <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                          Subscription
                        </h2>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Subscription Frequency:
                          </label>
                          <select
                            id="subscriptionFreq"
                            name="subscriptionFreq"
                            value={formData.subscriptionFreq}
                            onChange={handleChange}
                            className="w-full p-2 border rounded-md text-base"
                          >
                            <option value="">
                              Select Subscription Frequency
                            </option>
                            <option value="6">6 Months</option>
                            <option value="11">1 Year</option>
                            <option value="22">2 Years</option>
                            <option value="others">Others</option>
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
                        <div className="flex space-x-4">
                          <div className="flex flex-row items-center justify-center gap-2">
                            <label className="block text-sm font-medium leading-6 text-gray-600">
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
                            <label htmlFor="calendar" className="text-sm font-medium text-gray-600">
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
                        <div className="mt-4">
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
                        <div className="mt-4">
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
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 pt-4 border-t flex flex-wrap justify-end gap-3">
                    <Button
                      type="button"
                      onClick={() => resetForm()}
                      className="px-4 py-2 bg-red-200 hover:bg-red-300 rounded-md text-base"
                    >
                      Clear All Fields
                    </Button>
                    <Button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md text-base"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-md text-base"
                    >
                      Submit
                    </Button>
                  </div>
                </form>

                {/* Always show the duplicate panel */}
                <div className="flex-shrink-0 hidden lg:block">
                  <MemoizedDuplicatePanel />
                </div>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
};

export default Add;
