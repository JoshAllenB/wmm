/* eslint-disable no-unused-vars */
import { useUser } from "../../../utils/Hooks/userProvider";
import { roleConfigs } from "../../../utils/roleConfigs";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
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
import { debounce } from "lodash";
import View from "./view";
import { webSocketService } from "../../../services/WebSocketService";
import useDuplicateChecker from "../duplicateChecker/duplicateLogic.jsx";
import ConfirmationSummaryDialog from "../../UI/confirmationSummaryDialog";
import {
  WMMModule,
  PromoModule,
  ComplimentaryModule,
  HRGModule,
  FOMModule,
  CALModule,
  CommonSubscriptionFields,
  getSubscriptionSpecificData as getSubscriptionData,
  getServiceFromSubscriptionType as getServiceType,
  hasSubscriptionData as checkSubscriptionData,
} from "./modules";
import SubscriptionTypeSelector from "./modules/SubscriptionTypeSelector";

// Utility function to format date to "yyyy-MM-dd"
const formatDateToInput = (date) => {
  const d = new Date(date);
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
};

// Utility function to clean trailing spaces from date input values
const cleanDateInput = (value) => {
  if (typeof value === "string") {
    return value.trim();
  }
  return value;
};

const Add = ({
  fetchClients,
  subscriptionType: initialSubscriptionType = "None",
}) => {
  const { user, hasRole } = useUser(); // Ensure this hook is correctly implemented

  // Local state for subscription type
  const [subscriptionType, setSubscriptionType] = useState(
    initialSubscriptionType
  );

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
    subsclass: "",
    subscriptionType: subscriptionType,
    referralid: "", // Add referralid field for Promo subscriptions
  });

  const [addressData, setAddressData] = useState({
    housestreet: "",
    subdivision: "",
    barangay: "",
    city: "", // Add city to addressData
    zipcode: "", // Add zipcode to addressData
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

  // Initialize duplicate checker hook
  const {
    potentialDuplicates,
    isCheckingDuplicates,
    showDuplicates,
    selectedDuplicate,
    viewingDuplicate,
    setPotentialDuplicates,
    setIsCheckingDuplicates,
    setShowDuplicates,
    setSelectedDuplicate,
    setViewingDuplicate,
    checkForDuplicates,
    immediatelyClearDuplicates,
    handleViewDuplicate,
    handleCloseDuplicateView,
    DuplicatePanel,
    normalizeAddress,
  } = useDuplicateChecker();

  // Add these new state variables after other state declarations
  const [hrgData, setHrgData] = useState({
    recvdate: "",
    renewdate: "",
    campaigndate: "",
    paymtref: "",
    paymtamt: "",
    paymtform: "",
    unsubscribe: false,
    remarks: "",
  });

  const [fomData, setFomData] = useState({
    recvdate: "",
    paymtamt: "",
    paymtform: "",
    paymtref: "",
    unsubscribe: false,
    remarks: "",
  });

  const [calData, setCalData] = useState({
    recvdate: "",
    caltype: "",
    calqty: "",
    calunit: "",
    calamt: "",
    paymtref: "",
    paymtamt: "",
    paymtform: "",
    paymtdate: "",
    remarks: "",
  });

  const [areas, setAreas] = useState(null);
  const [isLoadingAreas, setIsLoadingAreas] = useState(false);
  const [isEditingCombinedAddress, setIsEditingCombinedAddress] =
    useState(false);

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
        remarks: "",
      });
    }
  }, [hasRole]);

  // Initialize role-specific data for non-WMM roles
  useEffect(() => {
    if (hasRole("HRG")) {
      setHrgData({
        recvdate: "",
        renewdate: "",
        campaigndate: "",
        paymtref: "",
        paymtamt: "",
        paymtform: "",
        unsubscribe: false,
        remarks: "",
      });
    }
    if (hasRole("FOM")) {
      setFomData({
        recvdate: "",
        paymtamt: "",
        paymtform: "",
        paymtref: "",
        unsubscribe: false,
        remarks: "",
      });
    }
    if (hasRole("CAL")) {
      setCalData({
        recvdate: "",
        caltype: "",
        calqty: "",
        calunit: "",
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

  useEffect(() => {
    if (!isEditingCombinedAddress) {
      const formattedAddress = formatAddressLines(
        addressData,
        formData.area,
        areaData
      );
      setCombinedAddress(formattedAddress);
    }
  }, [
    addressData.housestreet,
    addressData.subdivision,
    addressData.barangay,
    areaData.zipcode,
    formData.area,
    isEditingCombinedAddress,
  ]);

  // Add subscription type indicator styles
  const getSubscriptionTypeStyles = () => {
    switch (subscriptionType) {
      case "Promo":
        return "bg-emerald-600 text-white border-emerald-700";
      case "Complimentary":
        return "bg-purple-600 text-white border-purple-700";
      case "None":
        return "bg-gray-600 text-white border-gray-700";
      default: // WMM
        return "bg-blue-600 text-white border-blue-700";
    }
  };

  // Update openModal to include subscription type in form data
  const openModal = () => {
    setFormData((prevData) => ({
      ...prevData,
      subscriptionType: subscriptionType,
    }));
    setShowModal(true);
  };

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
      subsclass: "",
      subscriptionType: subscriptionType,
      donorid: null,
    });

    // Reset address data
    setAddressData({
      housestreet: "",
      subdivision: "",
      barangay: "",
      city: "",
      zipcode: "", // Add zipcode reset
    });

    // Reset combined address
    setCombinedAddress("");

    // Reset selected city
    setSelectedCity("");

    // Reset area data
    setAreaData({
      acode: "",
      zipcode: "",
      area: "",
      city: "",
      province: "",
      region: "",
    });

    // Reset role-specific data states
    setHrgData({
      recvdate: "",
      renewdate: "",
      campaigndate: "",
      paymtref: "",
      paymtamt: "",
      paymtform: "",
      unsubscribe: false,
      remarks: "",
    });

    setFomData({
      recvdate: "",
      paymtamt: "",
      paymtform: "",
      paymtref: "",
      unsubscribe: false,
      remarks: "",
    });

    setCalData({
      recvdate: "",
      caltype: "",
      calqty: "",
      calunit: "",
      calamt: "",
      paymtref: "",
      paymtamt: "",
      paymtform: "",
      paymtdate: "",
      remarks: "",
    });

    // Reset duplicate checker state
    immediatelyClearDuplicates();
    setSelectedDuplicate(null);
    setViewingDuplicate(false);

    // Reset renewal type
    setRenewalType("current");

    // Reset role-specific data
    setRoleSpecificData({});
  };

  // Close modal and reset form
  const closeModal = () => {
    setShowModal(false);
    resetForm();
    setShowConfirmation(false);
  };

  // Moved to duplicateLogic.js

  // Moved to duplicateLogic.js

  // Utility function to normalize year (2-digit to 4-digit)
  const normalizeYear = (year) => {
    if (year.length === 2) {
      const currentYear = new Date().getFullYear();
      const currentCentury = Math.floor(currentYear / 100) * 100;
      const yearNum = parseInt(year, 10);
      // If the 2-digit year is <= current year's last 2 digits, use current century
      // Otherwise use previous century
      const fullYear =
        yearNum <= currentYear % 100
          ? currentCentury + yearNum
          : currentCentury - 100 + yearNum;
      return fullYear.toString();
    }
    return year;
  };

  const handleChange = async (e) => {
    const { name, value } = e.target;

    // For fields that affect duplicate search, immediately clear duplicates for better UX
    const duplicateRelatedFields = [
      "fname",
      "lname",
      "company",
      "bdate",
      "bdateMonth",
      "bdateDay",
      "bdateYear",
      "email",
      "cellno",
      "contactnos",
      "company",
      "housestreet",
      "subdivision",
      "barangay",
    ];
    if (duplicateRelatedFields.includes(name)) {
      immediatelyClearDuplicates();
    }

    // Handle bdate parts
    if (name === "bdateMonth" || name === "bdateDay" || name === "bdateYear") {
      setFormData((prevData) => {
        const newData = {
          ...prevData,
          [name]: cleanDateInput(value),
        };

        // Combine the date parts into bdate if all are present
        if (newData.bdateMonth && newData.bdateDay && newData.bdateYear) {
          const fullYear = normalizeYear(newData.bdateYear);
          // Format as YYYY-MM-DD for consistent database storage and duplicate checking
          const month = newData.bdateMonth.padStart(2, "0");
          const day = newData.bdateDay.padStart(2, "0");
          newData.bdate = `${fullYear}-${month}-${day}`;
        } else {
          newData.bdate = "";
        }

        // Trigger duplicate check after updating birthdate
        if (duplicateRelatedFields.includes(name)) {
          const checkData = {
            fname: newData.fname,
            lname: newData.lname,
            bdate: newData.bdate || "",
            bdateMonth: newData.bdateMonth,
            bdateDay: newData.bdateDay,
            bdateYear: newData.bdateYear,
            company: newData.company,
            email: newData.email,
            cellno: newData.cellno,
            contactnos: newData.contactnos,
            address: combinedAddress,
            addressComponents: {
              housestreet: addressData.housestreet || "",
              subdivision: addressData.subdivision || "",
              barangay: addressData.barangay || "",
            },
            acode: areaData.acode || "",
          };
          checkForDuplicates(checkData, name);
        }

        return newData;
      });

      return;
    }

    if (name === "renewalType") {
      setRenewalType(value);
      return;
    }

    setFormData((prevData) => {
      const newData = {
        ...prevData,
        [name]: value,
      };

      // Trigger duplicate check after state update
      if (duplicateRelatedFields.includes(name)) {
        setTimeout(() => {
          // Only check if we have at least one identifying field with enough content
          const hasEnoughData =
            (newData.fname && newData.fname.length > 1) ||
            (newData.lname && newData.lname.length > 1) ||
            (newData.company && newData.company.length > 1) ||
            (newData.bdate && newData.bdate.length > 0) ||
            (newData.bdateMonth && newData.bdateDay) || // Trigger if day and month are present
            (newData.cellno && newData.cellno.length > 5) ||
            (newData.contactnos && newData.contactnos.length > 5) ||
            (addressData.housestreet && addressData.housestreet.length > 2) ||
            (addressData.subdivision && addressData.subdivision.length > 2) ||
            (addressData.barangay && addressData.barangay.length > 2);

          if (hasEnoughData) {
            const checkData = {
              fname: newData.fname,
              lname: newData.lname,
              bdate: newData.bdate || "",
              bdateMonth: newData.bdateMonth,
              bdateDay: newData.bdateDay,
              bdateYear: newData.bdateYear,
              company: newData.company,
              email: newData.email,
              cellno: newData.cellno,
              contactnos: newData.contactnos,
              address: combinedAddress,
              addressComponents: {
                housestreet: addressData.housestreet || "",
                subdivision: addressData.subdivision || "",
                barangay: addressData.barangay || "",
              },
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

    // Line 1: House/Building Number and Street name
    if (addressData.housestreet) {
      lines.push(addressData.housestreet.trim());
    }

    // Line 2: Subdivision
    if (addressData.subdivision) {
      lines.push(addressData.subdivision.trim());
    }

    // Line 3: Barangay
    if (addressData.barangay) {
      lines.push(addressData.barangay.trim());
    }

    // Line 4: Zipcode and City/Municipality
    const line4Parts = [];
    if (areaData.zipcode) {
      line4Parts.push(areaData.zipcode.trim());
    }
    if (area) {
      // Remove 'CITY OF' or 'MUNICIPALITY OF' if present
      const cleanedArea = area
        .replace(/^(CITY OF|MUNICIPALITY OF)\s+/i, "")
        .trim();
      line4Parts.push(cleanedArea);
    }
    if (line4Parts.length > 0) {
      lines.push(line4Parts.join(" "));
    }

    // Line 5: Province (if exists)
    if (areaData.province) {
      lines.push(areaData.province.trim());
    }

    return lines.join("\n");
  };

  // Modify handleAddressChange to properly handle duplicate checking
  const handleAddressChange = (type, value) => {
    if (potentialDuplicates.length > 0) {
      immediatelyClearDuplicates();
    }
    setIsCheckingDuplicates(true);

    // Remove any existing comma if this is a street or barangay field
    // But preserve spaces and only trim the comma at the end
    let cleanedValue = value;
    if (["housestreet", "subdivision", "barangay"].includes(type)) {
      cleanedValue = value.replace(/,\s*$/, "");
    }

    setAddressData((prev) => {
      const newAddressData = {
        ...prev,
        [type]: cleanedValue,
      };

      // Format address with commas
      const formattedAddress = formatAddressLines(
        newAddressData,
        formData.area,
        areaData
      );
      setCombinedAddress(formattedAddress);

      // Update formData with new address
      setFormData((prev) => ({
        ...prev,
        address: formattedAddress,
        housestreet: newAddressData.housestreet,
        subdivision: newAddressData.subdivision,
        barangay: newAddressData.barangay,
      }));

      // Check for duplicates with updated address
      const currentFormData = {
        fname: formData.fname,
        lname: formData.lname,
        bdate: formData.bdate,
        company: formData.company,
        email: formData.email,
        cellno: formData.cellno,
        contactnos: formData.contactnos,
        address: formattedAddress,
        addressComponents: {
          housestreet: newAddressData.housestreet || "",
          subdivision: newAddressData.subdivision || "",
          barangay: newAddressData.barangay || "",
        },
        acode: areaData.acode || "",
      };
      checkForDuplicates(currentFormData, "address");
      return newAddressData;
    });
  };

  // Modify handleAreaFormChange to properly handle duplicate checking
  const handleAreaFormChange = (field, value) => {
    if (!areas && !isLoadingAreas) {
      loadAreas();
    }

    handleAreaChange(field, value);

    if (field === "city") {
      // Update form data with new city
      setFormData((prev) => ({
        ...prev,
        area: value,
      }));

      // Update address data and check for duplicates
      setAddressData((prev) => {
        const newAddressData = {
          ...prev,
          city: value,
        };

        const formattedAddress = formatAddressLines(
          newAddressData,
          value,
          areaData
        );
        setCombinedAddress(formattedAddress);

        // Update form data with new address
        setFormData((prev) => ({
          ...prev,
          area: value,
          address: formattedAddress,
        }));

        // Check for duplicates with updated address
        const currentFormData = {
          fname: formData.fname,
          lname: formData.lname,
          bdate: formData.bdate,
          bdateMonth: formData.bdateMonth,
          bdateDay: formData.bdateDay,
          bdateYear: formData.bdateYear,
          company: formData.company,
          email: formData.email,
          cellno: formData.cellno,
          contactnos: formData.contactnos,
          address: formattedAddress,
          addressComponents: {
            housestreet: newAddressData.housestreet || "",
            subdivision: newAddressData.subdivision || "",
            barangay: newAddressData.barangay || "",
          },
          acode: areaData.acode || "",
        };
        checkForDuplicates(currentFormData, "city");

        return newAddressData;
      });
    }
  };

  // Modify handleAreaChange to properly handle duplicate checking
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

      // If acode changes, check for duplicates
      if (field === "acode" && value) {
        const currentFormData = {
          fname: formData.fname,
          lname: formData.lname,
          bdate: formData.bdate,
          bdateMonth: formData.bdateMonth,
          bdateDay: formData.bdateDay,
          bdateYear: formData.bdateYear,
          company: formData.company,
          email: formData.email,
          cellno: formData.cellno,
          contactnos: formData.contactnos,
          address: combinedAddress,
          addressComponents: {
            housestreet: addressData.housestreet || "",
            subdivision: addressData.subdivision || "",
            barangay: addressData.barangay || "",
          },
          acode: value,
        };
        checkForDuplicates(currentFormData, "acode");
      }

      // If zipcode changes, update addressData
      if (field === "zipcode") {
        setAddressData((prev) => ({
          ...prev,
          zipcode: value,
        }));

        setFormData((prev) => ({
          ...prev,
          zipcode: value ? parseInt(value) : "", // Convert to number for schema
        }));
      }

      return newAreaData;
    });
  };

  const handleRoleSpecificChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    setRoleSpecificData((prev) => {
      // Clean trailing spaces from date input fields
      let fieldValue;
      if (name === "donorid") {
        fieldValue = value;
      } else if (type === "checkbox") {
        fieldValue = checked;
      } else if (
        name.includes("Month") ||
        name.includes("Day") ||
        name.includes("Year")
      ) {
        // Clean trailing spaces for date components
        fieldValue = cleanDateInput(value).toUpperCase();
      } else {
        fieldValue = value.toUpperCase();
      }

      const updated = {
        ...prev,
        [name]: fieldValue,
      };

      // When CAL qty/unit changes, keep calamt synced to unit price only (no auto paymtamt)
      if (selectedRole === "CAL" && (name === "calqty" || name === "calunit")) {
        const calqty =
          parseFloat(name === "calqty" ? value : updated.calqty) || 0;
        const calunit =
          parseFloat(name === "calunit" ? value : updated.calunit) || 0;
        // store unit cost under calamt; do not auto-set paymtamt
        updated.calamt = calunit.toString();
      }

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
      data.calunit ||
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
      data.paymtform ||
      data.unsubscribe ||
      data.remarks
    );
  };

  const handleSubmit = (e) => {
    // Skip if this came from DonorAdd
    if (e.nativeEvent?.donorAddEvent) {
      return;
    }

    e.preventDefault();
    setShowConfirmation(true);
  };

  // Add this helper function before handleConfirmedSubmit
  const removeEmptyFields = (obj) => {
    const cleanObj = {};
    Object.entries(obj).forEach(([key, value]) => {
      // Remove undefined, null, empty string, or string with only whitespace
      if (
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim() === "")
      ) {
        return;
      }
      // Always include booleans
      if (typeof value === "boolean") {
        cleanObj[key] = value;
        return;
      }
      // For numbers, include if not 0, or if key is 'copies' (allow 0 for copies)
      if (typeof value === "number") {
        if (value !== 0 || key === "copies") {
          cleanObj[key] = value;
        }
        return;
      }
      // For arrays, include if not empty
      if (Array.isArray(value)) {
        if (value.length > 0) {
          cleanObj[key] = value;
        }
        return;
      }
      // For objects, include if not empty
      if (typeof value === "object") {
        if (Object.keys(value).length > 0) {
          cleanObj[key] = value;
        }
        return;
      }
      // For all other types (non-empty strings, etc.)
      cleanObj[key] = value;
    });
    return cleanObj;
  };

  // Use modular subscription logic
  const getSubscriptionSpecificData = () => {
    return getSubscriptionData(subscriptionType, formData, roleSpecificData);
  };

  const getServiceFromSubscriptionType = () => {
    return getServiceType(subscriptionType);
  };

  const handleConfirmedSubmit = async () => {
    // Format birth date if all parts are present
    const formatBdate = () => {
      if (formData.bdateMonth && formData.bdateDay && formData.bdateYear) {
        const fullYear = normalizeYear(cleanDateInput(formData.bdateYear));
        // Format as YYYY-MM-DD for consistent database storage and duplicate checking
        const month = cleanDateInput(formData.bdateMonth).padStart(2, "0");
        const day = cleanDateInput(formData.bdateDay).padStart(2, "0");
        return `${fullYear}-${month}-${day}`;
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

    // Prepare base client data with non-empty fields
    const baseClientData = {
      ...formData,
      bdate: formatBdate(),
      address: combinedAddress, // Use the formatted address with line breaks
      ...areaData,
    };

    // Clean the client data by removing empty fields
    const clientData = removeEmptyFields(baseClientData);

    // Prepare role submissions
    const roleSubmissions = [];

    // Use modular subscription data check
    const hasSubscriptionData = () => {
      return checkSubscriptionData(formData, roleSpecificData);
    };

    // Only add subscription data if user has WMM role AND has provided subscription data
    if (hasRole("WMM") && hasSubscriptionData()) {
      const subscriptionData = getSubscriptionSpecificData();

      // Map subscription types to their model types
      const modelType = {
        WMM: "WMM",
        Promo: "PROMO",
        Complimentary: "COMP",
      }[subscriptionType];

      roleSubmissions.push({
        roleType: modelType,
        roleData: subscriptionData,
      });
    }

    // Add other role submissions if they have data
    if (hasRole("HRG")) {
      const cleanHrgData = removeEmptyFields(hrgData);
      if (Object.keys(cleanHrgData).length > 0) {
        roleSubmissions.push({
          roleType: "HRG",
          roleData: cleanHrgData,
        });
      }
    }

    if (hasRole("FOM")) {
      const cleanFomData = removeEmptyFields(fomData);
      if (Object.keys(cleanFomData).length > 0) {
        roleSubmissions.push({
          roleType: "FOM",
          roleData: cleanFomData,
        });
      }
    }

    if (hasRole("CAL")) {
      // Before submitting, ensure calamt = unit cost; do not auto-set paymtamt
      const calunitNum = parseFloat(calData.calunit) || 0;
      const cleanCalData = removeEmptyFields({
        ...calData,
        calamt: calunitNum ? calunitNum.toString() : calData.calamt,
      });
      if (Object.keys(cleanCalData).length > 0) {
        roleSubmissions.push({
          roleType: "CAL",
          roleData: cleanCalData,
        });
      }
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
        subscriptionType: roleSubmissions.length > 0 ? subscriptionType : "",
      },
      roleSubmissions,
      adddate: formatDate(new Date()),
    };

    try {
      const response = await axios.post(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/clients/add`,
        submissionData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      if (response.data.success) {
        // Backend already emits the WebSocket event, so we don't need to emit it again
        // Just refresh the client list
        fetchClients();
        // Don't close modal here - let the confirmation dialog handle it
        // The confirmation dialog will close itself and show success toast
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      // Don't show toast here - let the confirmation dialog handle it
      throw error; // Re-throw the error so the dialog can handle it
    }
  };

  const handleRoleToggle = (role) => {
    // Set the new role
    setSelectedRole(role);
  };

  // Moved to duplicateChecker/duplicateLogic.js

  // Handle duplicate edit success
  const handleDuplicateEditSuccess = (updatedData) => {
    // Create a properly formatted copy of the updated data
    const formattedData = { ...updatedData };

    // Determine the correct subscription type based on available data
    let subscriptionType = "None"; // Default to None when no data exists

    // Check which subscription data exists and has records
    if (
      formattedData.promoData &&
      ((formattedData.promoData.records &&
        formattedData.promoData.records.length > 0) ||
        (Array.isArray(formattedData.promoData) &&
          formattedData.promoData.length > 0) ||
        (typeof formattedData.promoData === "object" &&
          Object.keys(formattedData.promoData).length > 0))
    ) {
      subscriptionType = "Promo";
    } else if (
      formattedData.compData &&
      ((formattedData.compData.records &&
        formattedData.compData.records.length > 0) ||
        (Array.isArray(formattedData.compData) &&
          formattedData.compData.length > 0) ||
        (typeof formattedData.compData === "object" &&
          Object.keys(formattedData.compData).length > 0))
    ) {
      subscriptionType = "Complimentary";
    } else if (
      formattedData.wmmData &&
      ((formattedData.wmmData.records &&
        formattedData.wmmData.records.length > 0) ||
        (Array.isArray(formattedData.wmmData) &&
          formattedData.wmmData.length > 0) ||
        (typeof formattedData.wmmData === "object" &&
          Object.keys(formattedData.wmmData).length > 0))
    ) {
      subscriptionType = "WMM";
    }

    // Ensure the subscription type is preserved
    formattedData.subscriptionType = subscriptionType;

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

  // Handle new donor added
  const handleNewDonorAdded = (donorData) => {
    // Set the form data with the new donor's details
    setFormData((prev) => ({
      ...prev,
      donorid: donorData.id,
      title: donorData.title || "",
      fname: donorData.fname || "",
      mname: donorData.mname || "",
      lname: donorData.lname || "",
      sname: donorData.sname || "",
      company: donorData.company || "",
      email: donorData.email || "",
      contactnos: donorData.contactnos || "",
      cellno: donorData.cellno || "",
      ofcno: donorData.ofcno || "",
      type: donorData.type || "",
      group: donorData.group || "",
      remarks: donorData.remarks || "",
    }));

    // Refresh the client list
    fetchClients();

    // Set address data
    if (donorData.address) {
      const addressLines = donorData.address.split("\n");
      setAddressData({
        housestreet: addressLines[0]?.replace(/,$/, "") || "",
        subdivision: addressLines[1]?.replace(/,$/, "") || "",
        barangay: addressLines[2]?.replace(/,$/, "") || "",
        city: donorData.area || "",
        zipcode: donorData.zipcode || "",
      });
      setCombinedAddress(donorData.address);
    }

    // Set area data
    setAreaData({
      acode: donorData.acode || "",
      zipcode: donorData.zipcode || "",
      city: donorData.area || "",
    });
  };

  // Moved to duplicateChecker/duplicateLogic.js

  // Add a function to load areas data
  const loadAreas = useCallback(async () => {
    if (isLoadingAreas || areas) return; // Don't fetch if already loading or we have data

    setIsLoadingAreas(true);
    try {
      const areasData = await fetchAreas();
      setAreas(areasData);
    } catch (error) {
      console.error("Error loading areas:", error);
    } finally {
      setIsLoadingAreas(false);
    }
  }, [areas, isLoadingAreas]);

  const memoizedOnAreaChange = useCallback(
    (field, value) => {
      setAreaData((prev) => ({ ...prev, [field]: value }));
      if (field === "city") {
        setFormData((prev) => ({ ...prev, area: value }));
        setAddressData((prev) => ({ ...prev, city: value }));
      }
      if (field === "zipcode") {
        setFormData((prev) => ({ ...prev, zipcode: value }));
      }
      if (field === "acode") {
        setFormData((prev) => ({ ...prev, acode: value }));
      }
    },
    [setAreaData, setFormData, setAddressData]
  );

  // After all state declarations, before return:
  const initialAreaData = {
    acode: formData.acode || areaData.acode || "",
    zipcode: formData.zipcode || areaData.zipcode || "",
    city: formData.area || areaData.city || addressData.city || "",
  };

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

  // Add handleCombinedAddressChange
  const handleCombinedAddressChange = (e) => {
    setIsEditingCombinedAddress(true);
    const value = e.target.value;
    setCombinedAddress(value);

    // Parse the combined address back into individual fields
    const lines = value
      .split("\n")
      .map((line) => line.trim().replace(/,\s*$/, ""))
      .filter((line) => line);

    // Update individual address fields
    setAddressData((prev) => {
      const lastLine = lines[lines.length - 1] || "";
      const zipMatch = lastLine.match(/^\d+/);
      const zipcode = zipMatch ? zipMatch[0] : "";

      return {
        housestreet: lines[0] || "",
        subdivision: lines[1] || "",
        barangay: lines[2] || "",
        city: prev.city, // Preserve city from area data
        zipcode: zipcode,
      };
    });

    // Update formData
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
        zipcode: zipcode ? parseInt(zipcode) : "",
        area: city,
      };
    });

    // Extract zipcode and city from the last line if it exists
    if (lines.length > 0) {
      const lastLine = lines[lines.length - 1];
      const zipMatch = lastLine.match(/^\d+/);
      const zipcode = zipMatch ? zipMatch[0] : "";
      const city = lastLine.replace(zipcode, "").trim();

      setAreaData((prev) => ({
        ...prev,
        zipcode,
        city,
      }));
    }

    // Trigger duplicate check
    const checkData = {
      fname: formData.fname,
      lname: formData.lname,
      bdate: formData.bdate || "",
      bdateMonth: formData.bdateMonth,
      bdateDay: formData.bdateDay,
      bdateYear: formData.bdateYear,
      company: formData.company,
      email: formData.email,
      cellno: formData.cellno,
      contactnos: formData.contactnos,
      address: combinedAddress,
      addressComponents: {
        housestreet: addressData.housestreet || "",
        subdivision: addressData.subdivision || "",
        barangay: addressData.barangay || "",
      },
      acode: areaData.acode || "",
    };

    const hasEnoughData =
      (checkData.lname && checkData.lname.length >= 2) ||
      (checkData.fname && checkData.fname.length >= 2) ||
      (lines[0] && lines[0].length >= 2) || // housestreet
      (lines[1] && lines[1].length >= 2) || // subdivision
      (lines[2] && lines[2].length >= 2) || // barangay
      (checkData.cellno && checkData.cellno.length >= 5) ||
      (checkData.contactnos && checkData.contactnos.length >= 5) ||
      (checkData.bdate && checkData.bdate.length > 0) ||
      (checkData.bdateMonth && checkData.bdateDay) || // Trigger if day and month are present
      (checkData.bdateMonth && checkData.bdateDay && checkData.bdateYear);

    if (hasEnoughData) {
      checkForDuplicates(checkData, "address");
    } else {
      setIsCheckingDuplicates(false);
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
      formData.area,
      areaData
    );
    setCombinedAddress(formattedAddress);
  };

  // Add missing handler functions for HRG, FOM, and CAL modules
  const handleHrgChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    setHrgData((prev) => {
      const updated = {
        ...prev,
        [name]: newValue,
      };
      return updated;
    });
  };

  const handleFomChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    setFomData((prev) => {
      const updated = {
        ...prev,
        [name]: newValue,
      };
      return updated;
    });
  };

  const handleCalChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    setCalData((prev) => {
      const updated = {
        ...prev,
        [name]: newValue,
      };

      // Calculate CAL total amount when quantity or unit price changes
      if (name === "calqty" || name === "calunit") {
        const calqty =
          parseFloat(name === "calqty" ? value : updated.calqty) || 0;
        const calunit =
          parseFloat(name === "calunit" ? value : updated.calunit) || 0;
        const calamt = calqty * calunit;
        updated.calamt = calamt.toString();
      }

      return updated;
    });
  };

  return (
    <div className="relative">
      <Button
        onClick={openModal}
        className={`${getSubscriptionTypeStyles()} hover:opacity-90 transition-opacity duration-200`}
      >
        <span>
          Add Client{" "}
          {subscriptionType === "HRG" ||
          subscriptionType === "FOM" ||
          subscriptionType === "CAL" ||
          subscriptionType === "WMM" ||
          subscriptionType === "None"
            ? ""
            : ` ${subscriptionType}`}
        </span>
      </Button>

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={closeModal}
          className="bg-gray-400 rounded-md bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border border-gray-100 max-w-[95vw] w-auto overflow-hidden"
        >
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
              <div className="flex flex-col lg:flex-row max-h-[100vh] overflow-auto">
                <form
                  id="main-client-form"
                  onSubmit={handleSubmit}
                  className="flex-1 p-4 overflow-y-auto lg:max-w-[calc(100%-380px)]"
                >
                  <div className="mb-2 border-b pb-2">
                    <h1
                      className={`${getSubscriptionTypeStyles()} p-2 text-center text-black text-3xl font-bold`}
                    >
                      Add Client{" "}
                      {subscriptionType === "HRG" ||
                      subscriptionType === "FOM" ||
                      subscriptionType === "CAL" ||
                      subscriptionType === "WMM" ||
                      subscriptionType === "None"
                        ? ""
                        : ` ${subscriptionType}`}
                    </h1>
                    <p className="text-gray-500 text-base">
                      Fill in the details to add a new client
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-4">
                    {/* Personal Information Card */}
                    <div>
                      <div className="">
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
                          required={true}
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
                          required={true}
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
                              onChange={(e) => {
                                const value = e.target.value;
                                if (/^\d{0,4}$/.test(value)) {
                                  handleChange(e);
                                }
                              }}
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
                            onAreaChange={memoizedOnAreaChange}
                            initialAreaData={initialAreaData}
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
                                    value={hrgData.recvdate}
                                    onChange={handleHrgChange}
                                    className="text-base w-full"
                                    required={true}
                                  />
                                  <InputField
                                    label="Campaign Date:"
                                    id="campaigndate"
                                    name="campaigndate"
                                    value={hrgData.campaigndate}
                                    onChange={handleHrgChange}
                                    className="text-base w-full"
                                    required={true}
                                  />
                                  <InputField
                                    label="Payment Reference:"
                                    id="paymtref"
                                    name="paymtref"
                                    value={hrgData.paymtref}
                                    onChange={handleHrgChange}
                                    className="text-base w-full"
                                    required={true}
                                  />
                                  <InputField
                                    label="Payment Amount:"
                                    id="paymtamt"
                                    name="paymtamt"
                                    value={hrgData.paymtamt}
                                    onChange={handleHrgChange}
                                    className="text-base w-full"
                                    required={true}
                                  />
                                  <InputField
                                    label="Payment Form:"
                                    id="paymtform"
                                    name="paymtform"
                                    value={hrgData.paymtform}
                                    onChange={handleHrgChange}
                                    className="text-base w-full"
                                    required={true}
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
                                      checked={hrgData.unsubscribe}
                                      onChange={(e) =>
                                        setHrgData((prev) => ({
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
                                      value={hrgData.remarks || ""}
                                      onChange={handleHrgChange}
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
                                    value={fomData.recvdate}
                                    onChange={handleFomChange}
                                    className="text-base w-full"
                                    required={true}
                                  />
                                  <InputField
                                    label="Payment Reference:"
                                    id="paymtref"
                                    name="paymtref"
                                    value={fomData.paymtref}
                                    onChange={handleFomChange}
                                    className="text-base w-full"
                                    required={true}
                                  />
                                  <InputField
                                    label="Payment Amount:"
                                    id="paymtamt"
                                    name="paymtamt"
                                    value={fomData.paymtamt}
                                    onChange={handleFomChange}
                                    className="text-base w-full"
                                    required={true}
                                  />
                                  <InputField
                                    label="Payment Form:"
                                    id="paymtform"
                                    name="paymtform"
                                    value={fomData.paymtform}
                                    onChange={handleFomChange}
                                    className="text-base w-full"
                                    required={true}
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
                                      checked={fomData.unsubscribe}
                                      onChange={(e) =>
                                        setFomData((prev) => ({
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
                                      value={fomData.remarks || ""}
                                      onChange={handleFomChange}
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
                                        value={calData.recvdate}
                                        onChange={handleCalChange}
                                        className="text-base w-full"
                                        required={true}
                                      />
                                      <InputField
                                        label="Calendar Type:"
                                        id="caltype"
                                        name="caltype"
                                        value={calData.caltype}
                                        onChange={handleCalChange}
                                        className="text-base w-full"
                                        required={true}
                                      />
                                      <InputField
                                        label="Calendar Quantity:"
                                        id="calqty"
                                        name="calqty"
                                        value={calData.calqty}
                                        onChange={handleCalChange}
                                        className="text-base w-full"
                                        required={true}
                                      />
                                      <InputField
                                        label="Calendar Unit Price:"
                                        id="calunit"
                                        name="calunit"
                                        value={calData.calunit}
                                        onChange={handleCalChange}
                                        className="text-base w-full"
                                        required={true}
                                      />
                                      <InputField
                                        label="Calendar Total Amount:"
                                        id="calamt"
                                        name="calamt"
                                        value={calData.calamt}
                                        onChange={handleCalChange}
                                        className="text-base w-full"
                                        required={true}
                                        readOnly={true}
                                      />
                                    </div>
                                    <div className="w-full">
                                      <InputField
                                        label="Payment Reference:"
                                        id="paymtref"
                                        name="paymtref"
                                        value={calData.paymtref}
                                        onChange={handleCalChange}
                                        className="text-base w-full"
                                        required={true}
                                      />
                                      <InputField
                                        label="Payment Amount:"
                                        id="paymtamt"
                                        name="paymtamt"
                                        value={calData.paymtamt}
                                        onChange={handleCalChange}
                                        className="text-base w-full"
                                        required={true}
                                      />
                                      <InputField
                                        label="Payment Form:"
                                        id="paymtform"
                                        name="paymtform"
                                        value={calData.paymtform}
                                        onChange={handleCalChange}
                                        className="text-base w-full"
                                        required={true}
                                      />
                                      <InputField
                                        label="Payment Date:"
                                        id="paymtdate"
                                        name="paymtdate"
                                        value={calData.paymtdate}
                                        onChange={handleCalChange}
                                        className="text-base w-full"
                                        required={true}
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
                                      value={calData.remarks || ""}
                                      onChange={handleCalChange}
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
                        {/* Subscription Type Selector */}
                        <SubscriptionTypeSelector
                          subscriptionType={subscriptionType}
                          setSubscriptionType={(newType) => {
                            const newSubscriptionType =
                              newType.subscriptionType;
                            setSubscriptionType(newSubscriptionType);
                            setFormData((prev) => ({
                              ...prev,
                              subscriptionType: newSubscriptionType,
                            }));
                          }}
                          mode="add"
                          hasSubscriptionData={() => false}
                          rowData={null}
                        />

                        {subscriptionType === "None" ? (
                          <div className="text-center p-4 border-2 border-dashed border-gray-300 rounded-lg">
                            <p className="text-gray-500 text-lg mb-2">
                              No subscription type selected
                            </p>
                            <p className="text-gray-400 text-sm">
                              Please select a subscription type above to add
                              subscription data
                            </p>
                          </div>
                        ) : (
                          <>
                            <h2
                              className={`${getSubscriptionTypeStyles()} p-2 font-bold text-center text-black`}
                            >
                              {subscriptionType} Subscription
                            </h2>

                            {/* Common subscription fields */}
                            <CommonSubscriptionFields
                              formData={formData}
                              roleSpecificData={roleSpecificData}
                              handleChange={handleChange}
                              handleRoleSpecificChange={
                                handleRoleSpecificChange
                              }
                              months={months}
                            />

                            {/* Subscription Type Specific Fields */}
                            {subscriptionType === "WMM" && (
                              <WMMModule
                                formData={formData}
                                roleSpecificData={roleSpecificData}
                                handleChange={handleChange}
                                handleRoleSpecificChange={
                                  handleRoleSpecificChange
                                }
                                handleNewDonorAdded={handleNewDonorAdded}
                                subclasses={subclasses}
                                months={months}
                                subscriptionType={subscriptionType}
                              />
                            )}

                            {subscriptionType === "Promo" && (
                              <PromoModule
                                formData={formData}
                                handleChange={handleChange}
                              />
                            )}

                            {subscriptionType === "Complimentary" && (
                              <ComplimentaryModule />
                            )}
                          </>
                        )}
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

                {/* Duplicate panel */}
                <div className="flex-shrink-0 hidden lg:block">
                  <DuplicatePanel
                    potentialDuplicates={potentialDuplicates}
                    isCheckingDuplicates={isCheckingDuplicates}
                    handleViewDuplicate={handleViewDuplicate}
                  />
                </div>
              </div>
            </>
          )}

          {/* Confirmation Dialog */}
          {showConfirmation && (
            <ConfirmationSummaryDialog
              showConfirmation={showConfirmation}
              setShowConfirmation={setShowConfirmation}
              handleConfirmedSubmit={handleConfirmedSubmit}
              closeModal={closeModal}
              formData={formData}
              addressData={addressData}
              areaData={areaData}
              combinedAddress={combinedAddress}
              roleSpecificData={roleSpecificData}
              subscriptionType={subscriptionType}
              selectedRole={selectedRole}
              hrgData={hrgData}
              fomData={fomData}
              calData={calData}
            />
          )}
        </Modal>
      )}
    </div>
  );
};

export default Add;
