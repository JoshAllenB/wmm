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
import DonorAdd from "../donorAdd";

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
    recvdateMonth: "",
    recvdateDay: "",
    recvdateYear: "",
    campaigndate: rowData?.campaigndate || "",
    campaigndateMonth: "",
    campaigndateDay: "",
    campaigndateYear: "",
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
  const [wmmRecords, setWmmRecords] = useState([]);
  const [promoRecords, setPromoRecords] = useState([]);
  const [complimentaryRecords, setComplimentaryRecords] = useState([]);
  const [selectedHrgRecord, setSelectedHrgRecord] = useState(null);
  const [selectedFomRecord, setSelectedFomRecord] = useState(null);
  const [selectedCalRecord, setSelectedCalRecord] = useState(null);
  const [selectedWmmRecord, setSelectedWmmRecord] = useState(null);
  const [selectedPromoRecord, setSelectedPromoRecord] = useState(null);
  const [selectedComplimentaryRecord, setSelectedComplimentaryRecord] =
    useState(null);
  const [roleRecordMode, setRoleRecordMode] = useState("edit"); // "edit" or "add"
  const [newRoleData, setNewRoleData] = useState({
    // HRG default fields
    recvdate: formatDateToMMDDYY(new Date()),
    recvdateMonth: "",
    recvdateDay: "",
    recvdateYear: "",
    campaigndate: "",
    campaigndateMonth: "",
    campaigndateDay: "",
    campaigndateYear: "",
    paymtref: "",
    paymtamt: 0,
    unsubscribe: false,
    remarks: "",
    // FOM fields
    paymtform: "",
    // CAL fields
    caltype: "",
    calqty: 0,
    calamt: 0,
    paymtdate: "",
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

      if (rowData.hrgData) {
        if (rowData.hrgData.records && Array.isArray(rowData.hrgData.records)) {
          setHrgRecords(rowData.hrgData.records);
        } else if (Array.isArray(rowData.hrgData)) {
          setHrgRecords(rowData.hrgData);
        } else if (typeof rowData.hrgData === "object") {
          const filteredRecords = [rowData.hrgData].filter(
            (item) => Object.keys(item).length > 0
          );
          setHrgRecords(filteredRecords);
        }
      }
      if (rowData.fomData) {
        if (rowData.fomData.records && Array.isArray(rowData.fomData.records)) {
          setFomRecords(rowData.fomData.records);
        } else if (Array.isArray(rowData.fomData)) {
          setFomRecords(rowData.fomData);
        } else if (typeof rowData.fomData === "object") {
          const filteredRecords = [rowData.fomData].filter(
            (item) => Object.keys(item).length > 0
          );
          setFomRecords(filteredRecords);
        }
      }
      if (rowData.calData) {
        if (rowData.calData.records && Array.isArray(rowData.calData.records)) {
          setCalRecords(rowData.calData.records);
        } else if (Array.isArray(rowData.calData)) {
          setCalRecords(rowData.calData);
        } else if (typeof rowData.calData === "object") {
          const filteredRecords = [rowData.calData].filter(
            (item) => Object.keys(item).length > 0
          );
          setCalRecords(filteredRecords);
        }
      }

      // Load WMM data records
      if (rowData.wmmData) {
        if (rowData.wmmData.records && Array.isArray(rowData.wmmData.records)) {
          setWmmRecords(rowData.wmmData.records);
          // Auto-select WMM role if WMM data is available and user has WMM role
          if (hasRole("WMM") && selectedRole === "HRG") {
            setSelectedRole("WMM");
          }
        } else if (Array.isArray(rowData.wmmData)) {
          setWmmRecords(rowData.wmmData);
          // Auto-select WMM role if WMM data is available and user has WMM role
          if (hasRole("WMM") && selectedRole === "HRG") {
            setSelectedRole("WMM");
          }
        } else if (typeof rowData.wmmData === "object") {
          const filteredRecords = [rowData.wmmData].filter(
            (item) => Object.keys(item).length > 0
          );
          setWmmRecords(filteredRecords);
          // Auto-select WMM role if WMM data is available and user has WMM role
          if (hasRole("WMM") && selectedRole === "HRG") {
            setSelectedRole("WMM");
          }
        }
      }

      // Load Promo data records
      if (rowData.promoData) {
        if (
          rowData.promoData.records &&
          Array.isArray(rowData.promoData.records)
        ) {
          setPromoRecords(rowData.promoData.records);
        } else if (Array.isArray(rowData.promoData)) {
          setPromoRecords(rowData.promoData);
        } else if (typeof rowData.promoData === "object") {
          const filteredRecords = [rowData.promoData].filter(
            (item) => Object.keys(item).length > 0
          );
          setPromoRecords(filteredRecords);
        }
      }

      // Load Complimentary data records
      if (rowData.complimentaryData) {
        if (
          rowData.complimentaryData.records &&
          Array.isArray(rowData.complimentaryData.records)
        ) {
          setComplimentaryRecords(rowData.complimentaryData.records);
        } else if (Array.isArray(rowData.complimentaryData)) {
          setComplimentaryRecords(rowData.complimentaryData);
        } else if (typeof rowData.complimentaryData === "object") {
          const filteredRecords = [rowData.complimentaryData].filter(
            (item) => Object.keys(item).length > 0
          );
          setComplimentaryRecords(filteredRecords);
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

  // Helper function to calculate and update end date based on start date and duration
  const calculateAndUpdateEndDate = (
    startDate,
    duration,
    updateRoleSpecific = true
  ) => {
    if (!startDate || !duration) return null;

    const monthsToAdd = parseInt(duration);

    // Check if the duration is a valid number (not NaN)
    if (isNaN(monthsToAdd)) {
      // If duration is "others" or invalid, clear the end date fields
      if (updateRoleSpecific) {
        setTimeout(() => {
          setRoleSpecificData((prev) => ({
            ...prev,
            enddate: "",
          }));
        }, 0);
      }

      return {
        subEndMonth: "",
        subEndDay: "",
        subEndYear: "",
        subscriptionEnd: "",
      };
    }

    const endDate = calculateEndMonth(startDate, monthsToAdd);

    // Format end date parts
    const endMonth = String(endDate.getMonth() + 1).padStart(2, "0");
    const endDay = String(endDate.getDate()).padStart(2, "0");
    const endYear = String(endDate.getFullYear());

    const endDateString = `${endMonth}/${endDay}/${endYear}`;

    if (updateRoleSpecific) {
      setTimeout(() => {
        setRoleSpecificData((prev) => ({
          ...prev,
          enddate: formatDateToMonthYear(endDate),
        }));
      }, 0);
    }

    return {
      subEndMonth: endMonth,
      subEndDay: endDay,
      subEndYear: endYear,
      subscriptionEnd: endDateString,
    };
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
      setFormData((prevData) => {
        const newData = { ...prevData, subscriptionFreq: value };

        // Check if we have a valid start date already set by the user
        let subscriptionStart;

        if (
          newData.subStartMonth &&
          newData.subStartDay &&
          newData.subStartYear
        ) {
          // Use the existing start date that user has set
          subscriptionStart = new Date(
            parseInt(newData.subStartYear),
            parseInt(newData.subStartMonth) - 1,
            parseInt(newData.subStartDay)
          );
        } else {
          // No start date set, use today's date as default
          subscriptionStart = new Date();

          // Update the start date fields with today's date
          const startMonth = String(subscriptionStart.getMonth() + 1).padStart(
            2,
            "0"
          );
          const startDay = String(subscriptionStart.getDate()).padStart(2, "0");
          const startYear = String(subscriptionStart.getFullYear());

          newData.subStartMonth = startMonth;
          newData.subStartDay = startDay;
          newData.subStartYear = startYear;
          newData.subscriptionStart = `${startMonth}/${startDay}/${startYear}`;
        }

        // Calculate end date based on the start date and duration
        const endDateData = calculateAndUpdateEndDate(subscriptionStart, value);
        if (endDateData) {
          Object.assign(newData, endDateData);
        }

        // Update roleSpecificData with the start date
        setTimeout(() => {
          setRoleSpecificData((prev) => ({
            ...prev,
            subsdate: formatDateToMonthYear(subscriptionStart),
            copies: prev.copies || 1,
          }));
        }, 0);

        return newData;
      });

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

      const newData = {
        ...prev,
        [name]: fieldValue,
      };

      // Handle date component changes
      if (
        name === "recvdateMonth" ||
        name === "recvdateDay" ||
        name === "recvdateYear"
      ) {
        if (
          newData.recvdateMonth &&
          newData.recvdateDay &&
          newData.recvdateYear
        ) {
          // Format as YYYY-MM-DD for database consistency
          newData.recvdate = `${newData.recvdateYear}-${newData.recvdateMonth}-${newData.recvdateDay}`;
        }
      }

      if (
        name === "campaigndateMonth" ||
        name === "campaigndateDay" ||
        name === "campaigndateYear"
      ) {
        if (
          newData.campaigndateMonth &&
          newData.campaigndateDay &&
          newData.campaigndateYear
        ) {
          // Format as YYYY-MM-DD for database consistency
          newData.campaigndate = `${newData.campaigndateYear}-${newData.campaigndateMonth}-${newData.campaigndateDay}`;
        }
      }

      return newData;
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

  // Update the parseDateToComponents function to be more robust
  const parseDateToComponents = (dateString) => {
    if (!dateString) {
      return { month: "", day: "", year: "" };
    }

    // Handle YYYY-MM-DD format (from database)
    if (dateString.includes("-")) {
      const parts = dateString.split("-");
      if (parts.length === 3) {
        return {
          month: parts[1].padStart(2, "0"),
          day: parts[2].padStart(2, "0"),
          year: parts[0],
        };
      }
    }

    // Handle MM/DD/YYYY format
    if (dateString.includes("/")) {
      const parts = dateString.split("/");
      if (parts.length === 3) {
        return {
          month: parts[0].padStart(2, "0"),
          day: parts[1].padStart(2, "0"),
          year: parts[2],
        };
      }
    }

    // Fallback for other formats
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return {
          month: String(date.getMonth() + 1).padStart(2, "0"),
          day: String(date.getDate()).padStart(2, "0"),
          year: String(date.getFullYear()),
        };
      }
    } catch (e) {
      console.error("Error parsing date:", e);
    }

    return { month: "", day: "", year: "" };
  };

  const handleRoleToggle = (role) => {
    setSelectedRole(role);
    setRoleRecordMode("edit"); // Reset to edit mode when changing roles

    // Reset role-specific data based on selected role and available records
    if (role === "HRG") {
      if (hrgRecords.length > 0) {
        // If there are records but no selected record, select the first one
        if (!selectedHrgRecord) {
          const firstRecord = hrgRecords[0];
          setSelectedHrgRecord(firstRecord);
          const recvdateParts = parseDateToComponents(firstRecord.recvdate);
          const campaigndateParts = parseDateToComponents(
            firstRecord.campaigndate
          );
          const roleData = {
            ...firstRecord,
            recvdateMonth: recvdateParts.month,
            recvdateDay: recvdateParts.day,
            recvdateYear: recvdateParts.year,
            campaigndateMonth: campaigndateParts.month,
            campaigndateDay: campaigndateParts.day,
            campaigndateYear: campaigndateParts.year,
          };
          setRoleSpecificData(roleData);
        } else {
          const recvdateParts = parseDateToComponents(
            selectedHrgRecord.recvdate
          );
          const campaigndateParts = parseDateToComponents(
            selectedHrgRecord.campaigndate
          );
          setRoleSpecificData({
            ...selectedHrgRecord,
            recvdateMonth: recvdateParts.month,
            recvdateDay: recvdateParts.day,
            recvdateYear: recvdateParts.year,
            campaigndateMonth: campaigndateParts.month,
            campaigndateDay: campaigndateParts.day,
            campaigndateYear: campaigndateParts.year,
          });
        }
      } else {
        // No records available, set up empty form
        const today = new Date();
        const todayParts = parseDateToComponents(formatDateToMMDDYY(today));
        setRoleSpecificData({
          recvdate: formatDateToMMDDYY(today),
          recvdateMonth: todayParts.month,
          recvdateDay: todayParts.day,
          recvdateYear: todayParts.year,
          campaigndate: "",
          campaigndateMonth: "",
          campaigndateDay: "",
          campaigndateYear: "",
          paymtref: "",
          paymtamt: 0,
          unsubscribe: false,
          remarks: "",
        });
      }
    } else if (role === "FOM") {
      if (fomRecords.length > 0) {
        // If there are records but no selected record, select the first one
        if (!selectedFomRecord) {
          const firstRecord = fomRecords[0];
          setSelectedFomRecord(firstRecord);
          const recvdateParts = parseDateToComponents(firstRecord.recvdate);
          const roleData = {
            ...firstRecord,
            recvdateMonth: recvdateParts.month,
            recvdateDay: recvdateParts.day,
            recvdateYear: recvdateParts.year,
          };
          setRoleSpecificData(roleData);
        } else {
          const recvdateParts = parseDateToComponents(
            selectedFomRecord.recvdate
          );
          setRoleSpecificData({
            ...selectedFomRecord,
            recvdateMonth: recvdateParts.month,
            recvdateDay: recvdateParts.day,
            recvdateYear: recvdateParts.year,
          });
        }
      } else {
        // No records available, set up empty form
        const today = new Date();
        const todayParts = parseDateToComponents(formatDateToMMDDYY(today));
        setRoleSpecificData({
          recvdate: formatDateToMMDDYY(today),
          recvdateMonth: todayParts.month,
          recvdateDay: todayParts.day,
          recvdateYear: todayParts.year,
          paymtamt: 0,
          paymtform: "",
          paymtref: "",
          unsubscribe: false,
          remarks: "",
        });
      }
    } else if (role === "CAL") {
      if (calRecords.length > 0) {
        // If there are records but no selected record, select the first one
        if (!selectedCalRecord) {
          const firstRecord = calRecords[0];
          setSelectedCalRecord(firstRecord);
          const recvdateParts = parseDateToComponents(firstRecord.recvdate);
          const roleData = {
            ...firstRecord,
            recvdateMonth: recvdateParts.month,
            recvdateDay: recvdateParts.day,
            recvdateYear: recvdateParts.year,
          };
          setRoleSpecificData(roleData);
        } else {
          const recvdateParts = parseDateToComponents(
            selectedCalRecord.recvdate
          );
          setRoleSpecificData({
            ...selectedCalRecord,
            recvdateMonth: recvdateParts.month,
            recvdateDay: recvdateParts.day,
            recvdateYear: recvdateParts.year,
          });
        }
      } else {
        // No records available, set up empty form
        const today = new Date();
        const todayParts = parseDateToComponents(formatDateToMMDDYY(today));
        setRoleSpecificData({
          recvdate: formatDateToMMDDYY(today),
          recvdateMonth: todayParts.month,
          recvdateDay: todayParts.day,
          recvdateYear: todayParts.year,
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
    } else if (role === "WMM") {
      if (wmmRecords.length > 0) {
        // If there are records but no selected record, select the first one
        if (!selectedWmmRecord) {
          const firstRecord = wmmRecords[0];
          setSelectedWmmRecord(firstRecord);
          const subsdateParts = parseDateToComponents(firstRecord.subsdate);
          const enddateParts = parseDateToComponents(firstRecord.enddate);
          const roleData = {
            ...firstRecord,
            subsdateMonth: subsdateParts.month,
            subsdateDay: subsdateParts.day,
            subsdateYear: subsdateParts.year,
            enddateMonth: enddateParts.month,
            enddateDay: enddateParts.day,
            enddateYear: enddateParts.year,
          };
          setRoleSpecificData(roleData);
        } else {
          const subsdateParts = parseDateToComponents(
            selectedWmmRecord.subsdate
          );
          const enddateParts = parseDateToComponents(selectedWmmRecord.enddate);
          setRoleSpecificData({
            ...selectedWmmRecord,
            subsdateMonth: subsdateParts.month,
            subsdateDay: subsdateParts.day,
            subsdateYear: subsdateParts.year,
            enddateMonth: enddateParts.month,
            enddateDay: enddateParts.day,
            enddateYear: enddateParts.year,
          });
        }
      } else {
        // No records available, set up empty form
        const today = new Date();
        const todayParts = parseDateToComponents(formatDateToMMDDYY(today));
        setRoleSpecificData({
          subsdate: formatDateToMMDDYY(today),
          subsdateMonth: todayParts.month,
          subsdateDay: todayParts.day,
          subsdateYear: todayParts.year,
          enddate: "",
          enddateMonth: "",
          enddateDay: "",
          enddateYear: "",
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
    } else if (role === "Promo") {
      if (promoRecords.length > 0) {
        // If there are records but no selected record, select the first one
        if (!selectedPromoRecord) {
          const firstRecord = promoRecords[0];
          setSelectedPromoRecord(firstRecord);
          const subsdateParts = parseDateToComponents(firstRecord.subsdate);
          const enddateParts = parseDateToComponents(firstRecord.enddate);
          const roleData = {
            ...firstRecord,
            subsdateMonth: subsdateParts.month,
            subsdateDay: subsdateParts.day,
            subsdateYear: subsdateParts.year,
            enddateMonth: enddateParts.month,
            enddateDay: enddateParts.day,
            enddateYear: enddateParts.year,
          };
          setRoleSpecificData(roleData);
        } else {
          const subsdateParts = parseDateToComponents(
            selectedPromoRecord.subsdate
          );
          const enddateParts = parseDateToComponents(
            selectedPromoRecord.enddate
          );
          setRoleSpecificData({
            ...selectedPromoRecord,
            subsdateMonth: subsdateParts.month,
            subsdateDay: subsdateParts.day,
            subsdateYear: subsdateParts.year,
            enddateMonth: enddateParts.month,
            enddateDay: enddateParts.day,
            enddateYear: enddateParts.year,
          });
        }
      } else {
        // No records available, set up empty form
        const today = new Date();
        const todayParts = parseDateToComponents(formatDateToMMDDYY(today));
        setRoleSpecificData({
          subsdate: formatDateToMMDDYY(today),
          subsdateMonth: todayParts.month,
          subsdateDay: todayParts.day,
          subsdateYear: todayParts.year,
          enddate: "",
          enddateMonth: "",
          enddateDay: "",
          enddateYear: "",
          subsyear: 0,
          copies: 1,
          paymtamt: "",
          paymtmasses: "",
          calendar: false,
          subsclass: "",
          donorid: "",
          paymtref: "",
          remarks: "",
          referralid: "",
        });
      }
    } else if (role === "Complimentary") {
      if (complimentaryRecords.length > 0) {
        // If there are records but no selected record, select the first one
        if (!selectedComplimentaryRecord) {
          const firstRecord = complimentaryRecords[0];
          setSelectedComplimentaryRecord(firstRecord);
          const subsdateParts = parseDateToComponents(firstRecord.subsdate);
          const enddateParts = parseDateToComponents(firstRecord.enddate);
          const roleData = {
            ...firstRecord,
            subsdateMonth: subsdateParts.month,
            subsdateDay: subsdateParts.day,
            subsdateYear: subsdateParts.year,
            enddateMonth: enddateParts.month,
            enddateDay: enddateParts.day,
            enddateYear: enddateParts.year,
          };
          setRoleSpecificData(roleData);
        } else {
          const subsdateParts = parseDateToComponents(
            selectedComplimentaryRecord.subsdate
          );
          const enddateParts = parseDateToComponents(
            selectedComplimentaryRecord.enddate
          );
          setRoleSpecificData({
            ...selectedComplimentaryRecord,
            subsdateMonth: subsdateParts.month,
            subsdateDay: subsdateParts.day,
            subsdateYear: subsdateParts.year,
            enddateMonth: enddateParts.month,
            enddateDay: enddateParts.day,
            enddateYear: enddateParts.year,
          });
        }
      } else {
        // No records available, set up empty form
        const today = new Date();
        const todayParts = parseDateToComponents(formatDateToMMDDYY(today));
        setRoleSpecificData({
          subsdate: formatDateToMMDDYY(today),
          subsdateMonth: todayParts.month,
          subsdateDay: todayParts.day,
          subsdateYear: todayParts.year,
          enddate: "",
          enddateMonth: "",
          enddateDay: "",
          enddateYear: "",
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
    }
  };

  // Auto-select first record when records are loaded
  useEffect(() => {
    if (selectedRole === "HRG" && hrgRecords.length > 0 && !selectedHrgRecord) {
      const firstRecord = hrgRecords[0];
      setSelectedHrgRecord(firstRecord);
      const recvdateParts = parseDateToComponents(firstRecord.recvdate);
      const campaigndateParts = parseDateToComponents(firstRecord.campaigndate);
      setRoleSpecificData({
        ...firstRecord,
        recvdateMonth: recvdateParts.month,
        recvdateDay: recvdateParts.day,
        recvdateYear: recvdateParts.year,
        campaigndateMonth: campaigndateParts.month,
        campaigndateDay: campaigndateParts.day,
        campaigndateYear: campaigndateParts.year,
      });
    }
  }, [hrgRecords, selectedRole, selectedHrgRecord]);

  useEffect(() => {
    if (selectedRole === "FOM" && fomRecords.length > 0 && !selectedFomRecord) {
      const firstRecord = fomRecords[0];
      setSelectedFomRecord(firstRecord);
      const recvdateParts = parseDateToComponents(firstRecord.recvdate);
      setRoleSpecificData({
        ...firstRecord,
        recvdateMonth: recvdateParts.month,
        recvdateDay: recvdateParts.day,
        recvdateYear: recvdateParts.year,
      });
    }
  }, [fomRecords, selectedRole, selectedFomRecord]);

  useEffect(() => {
    if (selectedRole === "CAL" && calRecords.length > 0 && !selectedCalRecord) {
      const firstRecord = calRecords[0];
      setSelectedCalRecord(firstRecord);
      const recvdateParts = parseDateToComponents(firstRecord.recvdate);
      setRoleSpecificData({
        ...firstRecord,
        recvdateMonth: recvdateParts.month,
        recvdateDay: recvdateParts.day,
        recvdateYear: recvdateParts.year,
      });
    }
  }, [calRecords, selectedRole, selectedCalRecord]);

  // Update the useEffect that loads WMM data
  useEffect(() => {
    if (selectedRole === "WMM" && wmmRecords.length > 0) {
      // Select the first record by default if none selected
      if (!selectedWmmRecord) {
        const firstRecord = wmmRecords[0];
        setSelectedWmmRecord(firstRecord);

        const subsdateParts = parseDateToComponents(firstRecord.subsdate);
        const enddateParts = parseDateToComponents(firstRecord.enddate);

        setRoleSpecificData((prev) => ({
          ...prev,
          ...firstRecord,
          subsdateMonth: subsdateParts.month,
          subsdateDay: subsdateParts.day,
          subsdateYear: subsdateParts.year,
          enddateMonth: enddateParts.month,
          enddateDay: enddateParts.day,
          enddateYear: enddateParts.year,
        }));

        // Also update formData for consistency
        setFormData((prev) => ({
          ...prev,
          subscriptionStart: firstRecord.subsdate
            ? `${subsdateParts.month}/${subsdateParts.day}/${subsdateParts.year}`
            : "",
          subscriptionEnd: firstRecord.enddate
            ? `${enddateParts.month}/${enddateParts.day}/${enddateParts.year}`
            : "",
          subStartMonth: subsdateParts.month,
          subStartDay: subsdateParts.day,
          subStartYear: subsdateParts.year,
          subEndMonth: enddateParts.month,
          subEndDay: enddateParts.day,
          subEndYear: enddateParts.year,
          subsclass: firstRecord.subsclass || "",
        }));

        // Set the selected subscription to the first (most recent) record
        setSelectedSubscription(firstRecord);
      }
    }
  }, [wmmRecords, selectedRole, selectedWmmRecord]);

  // Additional useEffect to handle role change to WMM
  useEffect(() => {
    if (selectedRole === "WMM" && wmmRecords.length > 0) {
      // Ensure we're in edit mode
      if (roleRecordMode !== "edit") {
        setRoleRecordMode("edit");
      }

      const firstRecord = wmmRecords[0];
      setSelectedWmmRecord(firstRecord);
      const subsdateParts = parseDateToComponents(firstRecord.subsdate);
      const enddateParts = parseDateToComponents(firstRecord.enddate);

      const roleData = {
        ...firstRecord,
        subsdateMonth: subsdateParts.month,
        subsdateDay: subsdateParts.day,
        subsdateYear: subsdateParts.year,
        enddateMonth: enddateParts.month,
        enddateDay: enddateParts.day,
        enddateYear: enddateParts.year,
      };

      setRoleSpecificData(roleData);
    }
  }, [selectedRole, wmmRecords, roleRecordMode]);

  useEffect(() => {
    if (
      selectedRole === "Promo" &&
      promoRecords.length > 0 &&
      !selectedPromoRecord
    ) {
      const firstRecord = promoRecords[0];
      setSelectedPromoRecord(firstRecord);
      const subsdateParts = parseDateToComponents(firstRecord.subsdate);
      const enddateParts = parseDateToComponents(firstRecord.enddate);
      setRoleSpecificData({
        ...firstRecord,
        subsdateMonth: subsdateParts.month,
        subsdateDay: subsdateParts.day,
        subsdateYear: subsdateParts.year,
        enddateMonth: enddateParts.month,
        enddateDay: enddateParts.day,
        enddateYear: enddateParts.year,
      });
    }
  }, [promoRecords, selectedRole, selectedPromoRecord]);

  useEffect(() => {
    if (
      selectedRole === "Complimentary" &&
      complimentaryRecords.length > 0 &&
      !selectedComplimentaryRecord
    ) {
      const firstRecord = complimentaryRecords[0];
      setSelectedComplimentaryRecord(firstRecord);
      const subsdateParts = parseDateToComponents(firstRecord.subsdate);
      const enddateParts = parseDateToComponents(firstRecord.enddate);
      setRoleSpecificData({
        ...firstRecord,
        subsdateMonth: subsdateParts.month,
        subsdateDay: subsdateParts.day,
        subsdateYear: subsdateParts.year,
        enddateMonth: enddateParts.month,
        enddateDay: enddateParts.day,
        enddateYear: enddateParts.year,
      });
    }
  }, [complimentaryRecords, selectedRole, selectedComplimentaryRecord]);

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

  const selectSubscription = (subscription) => {
    if (!subscription) {
      return;
    }

    // Set the selected subscription first
    setSelectedSubscription(subscription);

    // Parse dates using the improved function
    const subsdateParts = parseDateToComponents(subscription.subsdate);
    const enddateParts = parseDateToComponents(subscription.enddate);

    // Update roleSpecificData with all subscription fields
    setRoleSpecificData((prev) => ({
      ...prev,
      ...subscription,
      subsdateMonth: subsdateParts.month,
      subsdateDay: subsdateParts.day,
      subsdateYear: subsdateParts.year,
      enddateMonth: enddateParts.month,
      enddateDay: enddateParts.day,
      enddateYear: enddateParts.year,
    }));

    // Update formData for consistency
    setFormData((prev) => ({
      ...prev,
      subscriptionStart: subscription.subsdate
        ? `${subsdateParts.month}/${subsdateParts.day}/${subsdateParts.year}`
        : "",
      subscriptionEnd: subscription.enddate
        ? `${enddateParts.month}/${enddateParts.day}/${enddateParts.year}`
        : "",
      subStartMonth: subsdateParts.month,
      subStartDay: subsdateParts.day,
      subStartYear: subsdateParts.year,
      subEndMonth: enddateParts.month,
      subEndDay: enddateParts.day,
      subEndYear: enddateParts.year,
      subsclass: subscription.subsclass || "",
      referralid:
        formData.subscriptionType === "Promo"
          ? subscription.referralid || ""
          : "",
    }));

    // Calculate and set subscription frequency if dates are valid
    if (subscription.subsdate && subscription.enddate) {
      const startDate = parseDate(subscription.subsdate);
      const endDate = parseDate(subscription.enddate);

      if (startDate && endDate) {
        const diffMonths =
          (endDate.getFullYear() - startDate.getFullYear()) * 12 +
          (endDate.getMonth() - startDate.getMonth());

        let frequency = "";
        if (diffMonths >= 22 && diffMonths <= 26) frequency = "22";
        else if (diffMonths >= 10 && diffMonths <= 14) frequency = "11";
        else if (diffMonths >= 5 && diffMonths <= 7) frequency = "5";

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

    // Handle "others" case by clearing end date fields
    if (freq === "others") {
      // Clear end date fields when "others" is selected
      setRoleSpecificData((prev) => ({
        ...prev,
        enddate: "",
        endDateMonth: "",
        endDateDay: "",
        endDateYear: "",
        subsyear: 0,
      }));

      setFormData((prev) => ({
        ...prev,
        subscriptionFreq: freq,
        subscriptionEnd: "",
        subEndMonth: "",
        subEndDay: "",
        subEndYear: "",
      }));

      return;
    }

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
    // Skip if this came from DonorAdd
    if (e.nativeEvent?.donorAddEvent) {
      return;
    }

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
          subsyear:
            formData.subscriptionFreq && formData.subscriptionFreq !== "others"
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

    // Add HRG role submission if user has HRG role and has HRG data
    if (hasRole("HRG") && roleSpecificData.recvdate) {
      const formatDate = (month, day, year) => {
        if (month && day && year) {
          // Format as YYYY-MM-DD for database consistency
          return `${year}-${month}-${day}`;
        }
        return "";
      };

      const hrgData = {
        recvdate: formatDate(
          roleSpecificData.recvdateMonth,
          roleSpecificData.recvdateDay,
          roleSpecificData.recvdateYear
        ),
        campaigndate: formatDate(
          roleSpecificData.campaigndateMonth,
          roleSpecificData.campaigndateDay,
          roleSpecificData.campaigndateYear
        ),
        paymtref: roleSpecificData.paymtref || "",
        paymtamt: roleSpecificData.paymtamt || 0,
        unsubscribe: roleSpecificData.unsubscribe || false,
        remarks: roleSpecificData.remarks || "",
      };

      roleSubmissions.push({
        roleType: "HRG",
        roleData: hrgData,
      });
    }

    // Add FOM role submission if user has FOM role and has FOM data
    if (hasRole("FOM") && roleSpecificData.recvdate) {
      const formatDate = (month, day, year) => {
        if (month && day && year) {
          // Format as YYYY-MM-DD for database consistency
          return `${year}-${month}-${day}`;
        }
        return "";
      };

      const fomData = {
        recvdate: formatDate(
          roleSpecificData.recvdateMonth,
          roleSpecificData.recvdateDay,
          roleSpecificData.recvdateYear
        ),
        paymtref: roleSpecificData.paymtref || "",
        paymtamt: roleSpecificData.paymtamt || 0,
        paymtform: roleSpecificData.paymtform || "",
        unsubscribe: roleSpecificData.unsubscribe || false,
        remarks: roleSpecificData.remarks || "",
      };

      roleSubmissions.push({
        roleType: "FOM",
        roleData: fomData,
      });
    }

    // Add CAL role submission if user has CAL role and has CAL data
    if (hasRole("CAL") && roleSpecificData.recvdate) {
      const formatDate = (month, day, year) => {
        if (month && day && year) {
          // Format as YYYY-MM-DD for database consistency
          return `${year}-${month}-${day}`;
        }
        return "";
      };

      const calData = {
        recvdate: formatDate(
          roleSpecificData.recvdateMonth,
          roleSpecificData.recvdateDay,
          roleSpecificData.recvdateYear
        ),
        caltype: roleSpecificData.caltype || "",
        calqty: roleSpecificData.calqty || 0,
        calamt: roleSpecificData.calamt || 0,
        paymtref: roleSpecificData.paymtref || "",
        paymtamt: roleSpecificData.paymtamt || 0,
        paymtform: roleSpecificData.paymtform || "",
        paymtdate: roleSpecificData.paymtdate || "",
        remarks: roleSpecificData.remarks || "",
      };

      roleSubmissions.push({
        roleType: "CAL",
        roleData: calData,
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
      if (subscriptionTypes.includes("HRG")) return "HRG";
      if (subscriptionTypes.includes("FOM")) return "FOM";
      if (subscriptionTypes.includes("CAL")) return "CAL";

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
                          onChange={(e) => {
                            const selectedSub = availableSubscriptions.find(
                              (sub) => {
                                const subId = sub.id || sub._id;
                                const targetValue = e.target.value;
                                return String(subId) === String(targetValue);
                              }
                            );
                            if (selectedSub) {
                              selectSubscription(selectedSub);
                            } else {
                              console.error(
                                "No subscription found for value:",
                                e.target.value
                              );
                            }
                          }}
                          className="w-full p-2 border rounded-md text-base"
                        >
                          <option value="">Select a subscription</option>
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
                              <DonorAdd
                                key={`donor-add-${formData.subscriptionType}`}
                                onDonorSelect={(donorId) => {
                                  handleRoleSpecificChange({
                                    target: {
                                      name: "donorid",
                                      value: donorId || "",
                                    },
                                  });
                                }}
                                onNewDonorAdded={handleNewDonorAdded}
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
                {(hasRole("HRG") ||
                  hasRole("FOM") ||
                  hasRole("CAL") ||
                  hasRole("WMM")) && (
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
                      {hasRole("WMM") && (
                        <button
                          type="button"
                          className={`flex-1 py-2.5 text-sm font-medium text-center ${
                            selectedRole === "WMM"
                              ? "bg-blue-600 text-white shadow-md"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          } transition-colors`}
                          onClick={() => handleRoleToggle("WMM")}
                        >
                          WMM
                        </button>
                      )}
                      {hasRole("WMM") && (
                        <button
                          type="button"
                          className={`flex-1 py-2.5 text-sm font-medium text-center ${
                            selectedRole === "Promo"
                              ? "bg-blue-600 text-white shadow-md"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          } transition-colors`}
                          onClick={() => handleRoleToggle("Promo")}
                        >
                          Promo
                        </button>
                      )}
                      {hasRole("WMM") && (
                        <button
                          type="button"
                          className={`flex-1 py-2.5 text-sm font-medium text-center ${
                            selectedRole === "Complimentary"
                              ? "bg-blue-600 text-white shadow-md"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          } transition-colors`}
                          onClick={() => handleRoleToggle("Complimentary")}
                        >
                          Complimentary
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
                                const recvdateParts = parseDateToComponents(
                                  record.recvdate
                                );
                                const campaigndateParts = parseDateToComponents(
                                  record.campaigndate
                                );

                                setRoleSpecificData({
                                  ...record,
                                  recvdateMonth: recvdateParts.month,
                                  recvdateDay: recvdateParts.day,
                                  recvdateYear: recvdateParts.year,
                                  campaigndateMonth: campaigndateParts.month,
                                  campaigndateDay: campaigndateParts.day,
                                  campaigndateYear: campaigndateParts.year,
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
                                const recvdateParts = parseDateToComponents(
                                  record.recvdate
                                );
                                setRoleSpecificData({
                                  ...record,
                                  recvdateMonth: recvdateParts.month,
                                  recvdateDay: recvdateParts.day,
                                  recvdateYear: recvdateParts.year,
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
                                const recvdateParts = parseDateToComponents(
                                  record.recvdate
                                );
                                setRoleSpecificData({
                                  ...record,
                                  recvdateMonth: recvdateParts.month,
                                  recvdateDay: recvdateParts.day,
                                  recvdateYear: recvdateParts.year,
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

                      {selectedRole === "WMM" && wmmRecords.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select WMM Record:
                          </label>
                          <select
                            value={
                              selectedWmmRecord
                                ? selectedWmmRecord.id ||
                                  selectedWmmRecord._id ||
                                  ""
                                : ""
                            }
                            onChange={(e) => {
                              const record = wmmRecords.find(
                                (r) => String(r.id || r._id) === e.target.value
                              );
                              if (record) {
                                setSelectedWmmRecord(record);
                                const subsdateParts = parseDateToComponents(
                                  record.subsdate
                                );
                                const enddateParts = parseDateToComponents(
                                  record.enddate
                                );
                                setRoleSpecificData({
                                  ...record,
                                  subsdateMonth: subsdateParts.month,
                                  subsdateDay: subsdateParts.day,
                                  subsdateYear: subsdateParts.year,
                                  enddateMonth: enddateParts.month,
                                  enddateDay: enddateParts.day,
                                  enddateYear: enddateParts.year,
                                });
                              }
                            }}
                            className="w-full p-2 border rounded-md text-base"
                          >
                            {wmmRecords.map((record) => (
                              <option
                                key={record.id || record._id}
                                value={record.id || record._id}
                              >
                                {record.subsdate
                                  ? formatDateToMonthYear(
                                      parseDate(record.subsdate)
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

                      {selectedRole === "Promo" && promoRecords.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select Promo Record:
                          </label>
                          <select
                            value={
                              selectedPromoRecord
                                ? selectedPromoRecord.id ||
                                  selectedPromoRecord._id ||
                                  ""
                                : ""
                            }
                            onChange={(e) => {
                              const record = promoRecords.find(
                                (r) => String(r.id || r._id) === e.target.value
                              );
                              if (record) {
                                setSelectedPromoRecord(record);
                                const subsdateParts = parseDateToComponents(
                                  record.subsdate
                                );
                                const enddateParts = parseDateToComponents(
                                  record.enddate
                                );
                                setRoleSpecificData({
                                  ...record,
                                  subsdateMonth: subsdateParts.month,
                                  subsdateDay: subsdateParts.day,
                                  subsdateYear: subsdateParts.year,
                                  enddateMonth: enddateParts.month,
                                  enddateDay: enddateParts.day,
                                  enddateYear: enddateParts.year,
                                });
                              }
                            }}
                            className="w-full p-2 border rounded-md text-base"
                          >
                            {promoRecords.map((record) => (
                              <option
                                key={record.id || record._id}
                                value={record.id || record._id}
                              >
                                {record.subsdate
                                  ? formatDateToMonthYear(
                                      parseDate(record.subsdate)
                                    )
                                  : "Unknown"}
                                {record.paymtamt
                                  ? ` - Php ${record.paymtamt}`
                                  : ""}
                                {record.referralid
                                  ? ` - Ref: ${record.referralid}`
                                  : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {selectedRole === "Complimentary" &&
                        complimentaryRecords.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Select Complimentary Record:
                            </label>
                            <select
                              value={
                                selectedComplimentaryRecord
                                  ? selectedComplimentaryRecord.id ||
                                    selectedComplimentaryRecord._id ||
                                    ""
                                  : ""
                              }
                              onChange={(e) => {
                                const record = complimentaryRecords.find(
                                  (r) =>
                                    String(r.id || r._id) === e.target.value
                                );
                                if (record) {
                                  setSelectedComplimentaryRecord(record);
                                  const subsdateParts = parseDateToComponents(
                                    record.subsdate
                                  );
                                  const enddateParts = parseDateToComponents(
                                    record.enddate
                                  );
                                  setRoleSpecificData({
                                    ...record,
                                    subsdateMonth: subsdateParts.month,
                                    subsdateDay: subsdateParts.day,
                                    subsdateYear: subsdateParts.year,
                                    enddateMonth: enddateParts.month,
                                    enddateDay: enddateParts.day,
                                    enddateYear: enddateParts.year,
                                  });
                                }
                              }}
                              className="w-full p-2 border rounded-md text-base"
                            >
                              {complimentaryRecords.map((record) => (
                                <option
                                  key={record.id || record._id}
                                  value={record.id || record._id}
                                >
                                  {record.subsdate
                                    ? formatDateToMonthYear(
                                        parseDate(record.subsdate)
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
                    </div>
                  )}
                </div>

                {/* Role-specific form fields */}
                {selectedRole === "HRG" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="mb-2">
                        <label className="block text-black text-base mb-1">
                          Received Date:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="relative">
                            <select
                              id="recvdateMonth"
                              name="recvdateMonth"
                              value={
                                roleRecordMode === "edit"
                                  ? roleSpecificData.recvdateMonth || ""
                                  : newRoleData.recvdateMonth || ""
                              }
                              onChange={
                                roleRecordMode === "edit"
                                  ? handleRoleSpecificChange
                                  : (e) =>
                                      setNewRoleData({
                                        ...newRoleData,
                                        recvdateMonth: e.target.value,
                                      })
                              }
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
                            id="recvdateDay"
                            name="recvdateDay"
                            value={
                              roleRecordMode === "edit"
                                ? roleSpecificData.recvdateDay || ""
                                : newRoleData.recvdateDay || ""
                            }
                            onChange={
                              roleRecordMode === "edit"
                                ? handleRoleSpecificChange
                                : (e) =>
                                    setNewRoleData({
                                      ...newRoleData,
                                      recvdateDay: e.target.value,
                                    })
                            }
                            placeholder="DD"
                            className="w-full p-2 text-base border rounded-md border-gray-300"
                            maxLength="2"
                          />
                          <input
                            type="text"
                            id="recvdateYear"
                            name="recvdateYear"
                            value={
                              roleRecordMode === "edit"
                                ? roleSpecificData.recvdateYear || ""
                                : newRoleData.recvdateYear || ""
                            }
                            onChange={
                              roleRecordMode === "edit"
                                ? handleRoleSpecificChange
                                : (e) =>
                                    setNewRoleData({
                                      ...newRoleData,
                                      recvdateYear: e.target.value,
                                    })
                            }
                            placeholder="YYYY"
                            className="w-full p-2 text-base border rounded-md border-gray-300"
                            maxLength="4"
                          />
                        </div>
                      </div>

                      <div className="mb-2">
                        <label className="block text-black text-base mb-1">
                          Campaign Date:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="relative">
                            <select
                              id="campaigndateMonth"
                              name="campaigndateMonth"
                              value={
                                roleRecordMode === "edit"
                                  ? roleSpecificData.campaigndateMonth || ""
                                  : newRoleData.campaigndateMonth || ""
                              }
                              onChange={
                                roleRecordMode === "edit"
                                  ? handleRoleSpecificChange
                                  : (e) =>
                                      setNewRoleData({
                                        ...newRoleData,
                                        campaigndateMonth: e.target.value,
                                      })
                              }
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
                            id="campaigndateDay"
                            name="campaigndateDay"
                            value={
                              roleRecordMode === "edit"
                                ? roleSpecificData.campaigndateDay || ""
                                : newRoleData.campaigndateDay || ""
                            }
                            onChange={
                              roleRecordMode === "edit"
                                ? handleRoleSpecificChange
                                : (e) =>
                                    setNewRoleData({
                                      ...newRoleData,
                                      campaigndateDay: e.target.value,
                                    })
                            }
                            placeholder="DD"
                            className="w-full p-2 text-base border rounded-md border-gray-300"
                            maxLength="2"
                          />
                          <input
                            type="text"
                            id="campaigndateYear"
                            name="campaigndateYear"
                            value={
                              roleRecordMode === "edit"
                                ? roleSpecificData.campaigndateYear || ""
                                : newRoleData.campaigndateYear || ""
                            }
                            onChange={
                              roleRecordMode === "edit"
                                ? handleRoleSpecificChange
                                : (e) =>
                                    setNewRoleData({
                                      ...newRoleData,
                                      campaigndateYear: e.target.value,
                                    })
                            }
                            placeholder="YYYY"
                            className="w-full p-2 text-base border rounded-md border-gray-300"
                            maxLength="4"
                          />
                        </div>
                      </div>
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
                      <div className="mb-2">
                        <label className="block text-black text-base mb-1">
                          Received Date:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="relative">
                            <select
                              id="recvdateMonth"
                              name="recvdateMonth"
                              value={
                                roleRecordMode === "edit"
                                  ? roleSpecificData.recvdateMonth || ""
                                  : newRoleData.recvdateMonth || ""
                              }
                              onChange={
                                roleRecordMode === "edit"
                                  ? handleRoleSpecificChange
                                  : (e) =>
                                      setNewRoleData({
                                        ...newRoleData,
                                        recvdateMonth: e.target.value,
                                      })
                              }
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
                            id="recvdateDay"
                            name="recvdateDay"
                            value={
                              roleRecordMode === "edit"
                                ? roleSpecificData.recvdateDay || ""
                                : newRoleData.recvdateDay || ""
                            }
                            onChange={
                              roleRecordMode === "edit"
                                ? handleRoleSpecificChange
                                : (e) =>
                                    setNewRoleData({
                                      ...newRoleData,
                                      recvdateDay: e.target.value,
                                    })
                            }
                            placeholder="DD"
                            className="w-full p-2 text-base border rounded-md border-gray-300"
                            maxLength="2"
                          />
                          <input
                            type="text"
                            id="recvdateYear"
                            name="recvdateYear"
                            value={
                              roleRecordMode === "edit"
                                ? roleSpecificData.recvdateYear || ""
                                : newRoleData.recvdateYear || ""
                            }
                            onChange={
                              roleRecordMode === "edit"
                                ? handleRoleSpecificChange
                                : (e) =>
                                    setNewRoleData({
                                      ...newRoleData,
                                      recvdateYear: e.target.value,
                                    })
                            }
                            placeholder="YYYY"
                            className="w-full p-2 text-base border rounded-md border-gray-300"
                            maxLength="4"
                          />
                        </div>
                      </div>

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
                      <div className="mb-2">
                        <label className="block text-black text-base mb-1">
                          Received Date:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="relative">
                            <select
                              id="recvdateMonth"
                              name="recvdateMonth"
                              value={
                                roleRecordMode === "edit"
                                  ? roleSpecificData.recvdateMonth || ""
                                  : newRoleData.recvdateMonth || ""
                              }
                              onChange={
                                roleRecordMode === "edit"
                                  ? handleRoleSpecificChange
                                  : (e) =>
                                      setNewRoleData({
                                        ...newRoleData,
                                        recvdateMonth: e.target.value,
                                      })
                              }
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
                            id="recvdateDay"
                            name="recvdateDay"
                            value={
                              roleRecordMode === "edit"
                                ? roleSpecificData.recvdateDay || ""
                                : newRoleData.recvdateDay || ""
                            }
                            onChange={
                              roleRecordMode === "edit"
                                ? handleRoleSpecificChange
                                : (e) =>
                                    setNewRoleData({
                                      ...newRoleData,
                                      recvdateDay: e.target.value,
                                    })
                            }
                            placeholder="DD"
                            className="w-full p-2 text-base border rounded-md border-gray-300"
                            maxLength="2"
                          />
                          <input
                            type="text"
                            id="recvdateYear"
                            name="recvdateYear"
                            value={
                              roleRecordMode === "edit"
                                ? roleSpecificData.recvdateYear || ""
                                : newRoleData.recvdateYear || ""
                            }
                            onChange={
                              roleRecordMode === "edit"
                                ? handleRoleSpecificChange
                                : (e) =>
                                    setNewRoleData({
                                      ...newRoleData,
                                      recvdateYear: e.target.value,
                                    })
                            }
                            placeholder="YYYY"
                            className="w-full p-2 text-base border rounded-md border-gray-300"
                            maxLength="4"
                          />
                        </div>
                      </div>

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

                {selectedRole === "WMM" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="mb-2">
                        <label className="block text-black text-base mb-1">
                          Subscription Start Date:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="relative">
                            <select
                              id="subsdateMonth"
                              name="subsdateMonth"
                              value={
                                roleRecordMode === "edit"
                                  ? roleSpecificData.subsdateMonth || ""
                                  : newRoleData.subsdateMonth || ""
                              }
                              onChange={
                                roleRecordMode === "edit"
                                  ? handleRoleSpecificChange
                                  : (e) =>
                                      setNewRoleData({
                                        ...newRoleData,
                                        subsdateMonth: e.target.value,
                                      })
                              }
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
                            id="subsdateDay"
                            name="subsdateDay"
                            value={
                              roleRecordMode === "edit"
                                ? roleSpecificData.subsdateDay || ""
                                : newRoleData.subsdateDay || ""
                            }
                            onChange={
                              roleRecordMode === "edit"
                                ? handleRoleSpecificChange
                                : (e) =>
                                    setNewRoleData({
                                      ...newRoleData,
                                      subsdateDay: e.target.value,
                                    })
                            }
                            placeholder="DD"
                            className="w-full p-2 text-base border rounded-md border-gray-300"
                            maxLength="2"
                          />
                          <input
                            type="text"
                            id="subsdateYear"
                            name="subsdateYear"
                            value={
                              roleRecordMode === "edit"
                                ? roleSpecificData.subsdateYear || ""
                                : newRoleData.subsdateYear || ""
                            }
                            onChange={
                              roleRecordMode === "edit"
                                ? handleRoleSpecificChange
                                : (e) =>
                                    setNewRoleData({
                                      ...newRoleData,
                                      subsdateYear: e.target.value,
                                    })
                            }
                            placeholder="YYYY"
                            className="w-full p-2 text-base border rounded-md border-gray-300"
                            maxLength="4"
                          />
                        </div>
                      </div>

                      <div className="mb-2">
                        <label className="block text-black text-base mb-1">
                          Subscription End Date:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="relative">
                            <select
                              id="enddateMonth"
                              name="enddateMonth"
                              value={
                                roleRecordMode === "edit"
                                  ? roleSpecificData.enddateMonth || ""
                                  : newRoleData.enddateMonth || ""
                              }
                              onChange={
                                roleRecordMode === "edit"
                                  ? handleRoleSpecificChange
                                  : (e) =>
                                      setNewRoleData({
                                        ...newRoleData,
                                        enddateMonth: e.target.value,
                                      })
                              }
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
                            id="enddateDay"
                            name="enddateDay"
                            value={
                              roleRecordMode === "edit"
                                ? roleSpecificData.enddateDay || ""
                                : newRoleData.enddateDay || ""
                            }
                            onChange={
                              roleRecordMode === "edit"
                                ? handleRoleSpecificChange
                                : (e) =>
                                    setNewRoleData({
                                      ...newRoleData,
                                      enddateDay: e.target.value,
                                    })
                            }
                            placeholder="DD"
                            className="w-full p-2 text-base border rounded-md border-gray-300"
                            maxLength="2"
                          />
                          <input
                            type="text"
                            id="enddateYear"
                            name="enddateYear"
                            value={
                              roleRecordMode === "edit"
                                ? roleSpecificData.enddateYear || ""
                                : newRoleData.enddateYear || ""
                            }
                            onChange={
                              roleRecordMode === "edit"
                                ? handleRoleSpecificChange
                                : (e) =>
                                    setNewRoleData({
                                      ...newRoleData,
                                      enddateYear: e.target.value,
                                    })
                            }
                            placeholder="YYYY"
                            className="w-full p-2 text-base border rounded-md border-gray-300"
                            maxLength="4"
                          />
                        </div>
                      </div>

                      <InputField
                        label="Subscription Year:"
                        id="subsyear"
                        name="subsyear"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.subsyear || ""
                            : newRoleData.subsyear || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  subsyear: e.target.value,
                                })
                        }
                        className="text-base"
                      />

                      <InputField
                        label="Copies:"
                        id="copies"
                        name="copies"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.copies || ""
                            : newRoleData.copies || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  copies: e.target.value,
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
                        label="Payment Masses:"
                        id="paymtmasses"
                        name="paymtmasses"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.paymtmasses || ""
                            : newRoleData.paymtmasses || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  paymtmasses: e.target.value,
                                })
                        }
                        className="text-base"
                      />

                      <div className="mb-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            id="calendar"
                            name="calendar"
                            checked={
                              roleRecordMode === "edit"
                                ? roleSpecificData.calendar || false
                                : newRoleData.calendar || false
                            }
                            onChange={
                              roleRecordMode === "edit"
                                ? handleRoleSpecificChange
                                : (e) =>
                                    setNewRoleData({
                                      ...newRoleData,
                                      calendar: e.target.checked,
                                    })
                            }
                            className="mr-2"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Calendar
                          </span>
                        </label>
                      </div>

                      <InputField
                        label="Subscription Class:"
                        id="subsclass"
                        name="subsclass"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.subsclass || ""
                            : newRoleData.subsclass || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  subsclass: e.target.value,
                                })
                        }
                        className="text-base"
                      />

                      <InputField
                        label="Donor ID:"
                        id="donorid"
                        name="donorid"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.donorid || ""
                            : newRoleData.donorid || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  donorid: e.target.value,
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

                {selectedRole === "Promo" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="mb-2">
                        <label className="block text-black text-base mb-1">
                          Subscription Start Date:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="relative">
                            <select
                              id="subsdateMonth"
                              name="subsdateMonth"
                              value={
                                roleRecordMode === "edit"
                                  ? roleSpecificData.subsdateMonth || ""
                                  : newRoleData.subsdateMonth || ""
                              }
                              onChange={
                                roleRecordMode === "edit"
                                  ? handleRoleSpecificChange
                                  : (e) =>
                                      setNewRoleData({
                                        ...newRoleData,
                                        subsdateMonth: e.target.value,
                                      })
                              }
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
                            id="subsdateDay"
                            name="subsdateDay"
                            value={
                              roleRecordMode === "edit"
                                ? roleSpecificData.subsdateDay || ""
                                : newRoleData.subsdateDay || ""
                            }
                            onChange={
                              roleRecordMode === "edit"
                                ? handleRoleSpecificChange
                                : (e) =>
                                    setNewRoleData({
                                      ...newRoleData,
                                      subsdateDay: e.target.value,
                                    })
                            }
                            placeholder="DD"
                            className="w-full p-2 text-base border rounded-md border-gray-300"
                            maxLength="2"
                          />
                          <input
                            type="text"
                            id="subsdateYear"
                            name="subsdateYear"
                            value={
                              roleRecordMode === "edit"
                                ? roleSpecificData.subsdateYear || ""
                                : newRoleData.subsdateYear || ""
                            }
                            onChange={
                              roleRecordMode === "edit"
                                ? handleRoleSpecificChange
                                : (e) =>
                                    setNewRoleData({
                                      ...newRoleData,
                                      subsdateYear: e.target.value,
                                    })
                            }
                            placeholder="YYYY"
                            className="w-full p-2 text-base border rounded-md border-gray-300"
                            maxLength="4"
                          />
                        </div>
                      </div>

                      <div className="mb-2">
                        <label className="block text-black text-base mb-1">
                          Subscription End Date:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="relative">
                            <select
                              id="enddateMonth"
                              name="enddateMonth"
                              value={
                                roleRecordMode === "edit"
                                  ? roleSpecificData.enddateMonth || ""
                                  : newRoleData.enddateMonth || ""
                              }
                              onChange={
                                roleRecordMode === "edit"
                                  ? handleRoleSpecificChange
                                  : (e) =>
                                      setNewRoleData({
                                        ...newRoleData,
                                        enddateMonth: e.target.value,
                                      })
                              }
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
                            id="enddateDay"
                            name="enddateDay"
                            value={
                              roleRecordMode === "edit"
                                ? roleSpecificData.enddateDay || ""
                                : newRoleData.enddateDay || ""
                            }
                            onChange={
                              roleRecordMode === "edit"
                                ? handleRoleSpecificChange
                                : (e) =>
                                    setNewRoleData({
                                      ...newRoleData,
                                      enddateDay: e.target.value,
                                    })
                            }
                            placeholder="DD"
                            className="w-full p-2 text-base border rounded-md border-gray-300"
                            maxLength="2"
                          />
                          <input
                            type="text"
                            id="enddateYear"
                            name="enddateYear"
                            value={
                              roleRecordMode === "edit"
                                ? roleSpecificData.enddateYear || ""
                                : newRoleData.enddateYear || ""
                            }
                            onChange={
                              roleRecordMode === "edit"
                                ? handleRoleSpecificChange
                                : (e) =>
                                    setNewRoleData({
                                      ...newRoleData,
                                      enddateYear: e.target.value,
                                    })
                            }
                            placeholder="YYYY"
                            className="w-full p-2 text-base border rounded-md border-gray-300"
                            maxLength="4"
                          />
                        </div>
                      </div>

                      <InputField
                        label="Subscription Year:"
                        id="subsyear"
                        name="subsyear"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.subsyear || ""
                            : newRoleData.subsyear || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  subsyear: e.target.value,
                                })
                        }
                        className="text-base"
                      />

                      <InputField
                        label="Copies:"
                        id="copies"
                        name="copies"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.copies || ""
                            : newRoleData.copies || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  copies: e.target.value,
                                })
                        }
                        className="text-base"
                      />

                      <InputField
                        label="Referral ID:"
                        id="referralid"
                        name="referralid"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.referralid || ""
                            : newRoleData.referralid || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  referralid: e.target.value,
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
                        label="Payment Masses:"
                        id="paymtmasses"
                        name="paymtmasses"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.paymtmasses || ""
                            : newRoleData.paymtmasses || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  paymtmasses: e.target.value,
                                })
                        }
                        className="text-base"
                      />

                      <div className="mb-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            id="calendar"
                            name="calendar"
                            checked={
                              roleRecordMode === "edit"
                                ? roleSpecificData.calendar || false
                                : newRoleData.calendar || false
                            }
                            onChange={
                              roleRecordMode === "edit"
                                ? handleRoleSpecificChange
                                : (e) =>
                                    setNewRoleData({
                                      ...newRoleData,
                                      calendar: e.target.checked,
                                    })
                            }
                            className="mr-2"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Calendar
                          </span>
                        </label>
                      </div>

                      <InputField
                        label="Subscription Class:"
                        id="subsclass"
                        name="subsclass"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.subsclass || ""
                            : newRoleData.subsclass || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  subsclass: e.target.value,
                                })
                        }
                        className="text-base"
                      />

                      <InputField
                        label="Donor ID:"
                        id="donorid"
                        name="donorid"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.donorid || ""
                            : newRoleData.donorid || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  donorid: e.target.value,
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

                {selectedRole === "Complimentary" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="mb-2">
                        <label className="block text-black text-base mb-1">
                          Subscription Start Date:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="relative">
                            <select
                              id="subsdateMonth"
                              name="subsdateMonth"
                              value={
                                roleRecordMode === "edit"
                                  ? roleSpecificData.subsdateMonth || ""
                                  : newRoleData.subsdateMonth || ""
                              }
                              onChange={
                                roleRecordMode === "edit"
                                  ? handleRoleSpecificChange
                                  : (e) =>
                                      setNewRoleData({
                                        ...newRoleData,
                                        subsdateMonth: e.target.value,
                                      })
                              }
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
                            id="subsdateDay"
                            name="subsdateDay"
                            value={
                              roleRecordMode === "edit"
                                ? roleSpecificData.subsdateDay || ""
                                : newRoleData.subsdateDay || ""
                            }
                            onChange={
                              roleRecordMode === "edit"
                                ? handleRoleSpecificChange
                                : (e) =>
                                    setNewRoleData({
                                      ...newRoleData,
                                      subsdateDay: e.target.value,
                                    })
                            }
                            placeholder="DD"
                            className="w-full p-2 text-base border rounded-md border-gray-300"
                            maxLength="2"
                          />
                          <input
                            type="text"
                            id="subsdateYear"
                            name="subsdateYear"
                            value={
                              roleRecordMode === "edit"
                                ? roleSpecificData.subsdateYear || ""
                                : newRoleData.subsdateYear || ""
                            }
                            onChange={
                              roleRecordMode === "edit"
                                ? handleRoleSpecificChange
                                : (e) =>
                                    setNewRoleData({
                                      ...newRoleData,
                                      subsdateYear: e.target.value,
                                    })
                            }
                            placeholder="YYYY"
                            className="w-full p-2 text-base border rounded-md border-gray-300"
                            maxLength="4"
                          />
                        </div>
                      </div>

                      <div className="mb-2">
                        <label className="block text-black text-base mb-1">
                          Subscription End Date:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="relative">
                            <select
                              id="enddateMonth"
                              name="enddateMonth"
                              value={
                                roleRecordMode === "edit"
                                  ? roleSpecificData.enddateMonth || ""
                                  : newRoleData.enddateMonth || ""
                              }
                              onChange={
                                roleRecordMode === "edit"
                                  ? handleRoleSpecificChange
                                  : (e) =>
                                      setNewRoleData({
                                        ...newRoleData,
                                        enddateMonth: e.target.value,
                                      })
                              }
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
                            id="enddateDay"
                            name="enddateDay"
                            value={
                              roleRecordMode === "edit"
                                ? roleSpecificData.enddateDay || ""
                                : newRoleData.enddateDay || ""
                            }
                            onChange={
                              roleRecordMode === "edit"
                                ? handleRoleSpecificChange
                                : (e) =>
                                    setNewRoleData({
                                      ...newRoleData,
                                      enddateDay: e.target.value,
                                    })
                            }
                            placeholder="DD"
                            className="w-full p-2 text-base border rounded-md border-gray-300"
                            maxLength="2"
                          />
                          <input
                            type="text"
                            id="enddateYear"
                            name="enddateYear"
                            value={
                              roleRecordMode === "edit"
                                ? roleSpecificData.enddateYear || ""
                                : newRoleData.enddateYear || ""
                            }
                            onChange={
                              roleRecordMode === "edit"
                                ? handleRoleSpecificChange
                                : (e) =>
                                    setNewRoleData({
                                      ...newRoleData,
                                      enddateYear: e.target.value,
                                    })
                            }
                            placeholder="YYYY"
                            className="w-full p-2 text-base border rounded-md border-gray-300"
                            maxLength="4"
                          />
                        </div>
                      </div>

                      <InputField
                        label="Subscription Year:"
                        id="subsyear"
                        name="subsyear"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.subsyear || ""
                            : newRoleData.subsyear || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  subsyear: e.target.value,
                                })
                        }
                        className="text-base"
                      />

                      <InputField
                        label="Copies:"
                        id="copies"
                        name="copies"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.copies || ""
                            : newRoleData.copies || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  copies: e.target.value,
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
                        label="Payment Masses:"
                        id="paymtmasses"
                        name="paymtmasses"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.paymtmasses || ""
                            : newRoleData.paymtmasses || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  paymtmasses: e.target.value,
                                })
                        }
                        className="text-base"
                      />

                      <div className="mb-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            id="calendar"
                            name="calendar"
                            checked={
                              roleRecordMode === "edit"
                                ? roleSpecificData.calendar || false
                                : newRoleData.calendar || false
                            }
                            onChange={
                              roleRecordMode === "edit"
                                ? handleRoleSpecificChange
                                : (e) =>
                                    setNewRoleData({
                                      ...newRoleData,
                                      calendar: e.target.checked,
                                    })
                            }
                            className="mr-2"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Calendar
                          </span>
                        </label>
                      </div>

                      <InputField
                        label="Subscription Class:"
                        id="subsclass"
                        name="subsclass"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.subsclass || ""
                            : newRoleData.subsclass || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  subsclass: e.target.value,
                                })
                        }
                        className="text-base"
                      />

                      <InputField
                        label="Donor ID:"
                        id="donorid"
                        name="donorid"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.donorid || ""
                            : newRoleData.donorid || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  donorid: e.target.value,
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
