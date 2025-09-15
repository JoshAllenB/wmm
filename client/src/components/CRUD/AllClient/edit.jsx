import { useUser } from "../../../utils/Hooks/userProvider";
import { roleConfigs } from "../../../utils/roleConfigs";
import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";
import ConfirmationSummaryDialog from "../../UI/confirmationSummaryDialog";
import AreaForm from "../../../utils/areaform";
import InputField from "../input";
import {
  fetchSubclasses,
  fetchTypes,
  fetchAreas,
} from "../../Table/Data/utilData";
import { webSocketService } from "../../../services/WebSocketService";
import { useToast } from "../../UI/ShadCN/hooks/use-toast";
import {
  WMMModule,
  PromoModule,
  ComplimentaryModule,
  HRGModule,
  FOMModule,
  CALModule,
  CommonSubscriptionFields,
  PersonalInfoModule,
  AddressModule,
  ContactInfoModule,
  GroupInfoModule,
  SubscriptionTypeSelector,
  RoleToggleModule,
  getSubscriptionSpecificData as getSubscriptionData,
  getServiceFromSubscriptionType as getServiceType,
  hasSubscriptionData as checkSubscriptionData,
} from "./modules";

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

const Edit = ({
  rowData,
  onDeleteSuccess,
  onClose,
  onEditSuccess,
  mode = "edit",
}) => {
  const { user, hasRole } = useUser();
  const { toast } = useToast();

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

  // Update initial state to ensure all values are defined - start with empty values
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
    housestreet: "",
    subdivision: "",
    barangay: "",
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
    spack: false,
    subscriptionType: "WMM",
    referralid: "",
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
    rts: false, // Add RTS field
    rtsCount: 0, // Add RTS count field
    rtsMaxReached: false, // Add RTS max reached field
  });

  const [addressData, setAddressData] = useState({
    housestreet: "",
    subdivision: "",
    barangay: "",
    city: "",
    zipcode: "",
  });

  const [combinedAddress, setCombinedAddress] = useState("");
  const [isEditingCombinedAddress, setIsEditingCombinedAddress] =
    useState(false);
  const [selectedCity, setSelectedCity] = useState("");
  const [roleSpecificData, setRoleSpecificData] = useState({
    recvdate: "",
    recvdateMonth: "",
    recvdateDay: "",
    recvdateYear: "",
    campaigndate: "",
    campaigndateMonth: "",
    campaigndateDay: "",
    campaigndateYear: "",
    paymtref: "",
    paymtamt: 0,
    paymtform: "",
    unsubscribe: false,
    remarks: "",
    subsdate: "",
    enddate: "",
    subsyear: 0,
    copies: "1",
    paymtmasses: 0,
    calendar: false,
    subsclass: "",
    donorid: "",
    caltype: "",
    calqty: "",
    calunit: "",
    calamt: "",
    paymtdate: "",
    paymtdateMonth: "",
    paymtdateDay: "",
    paymtdateYear: "",
  });
  const [areaData, setAreaData] = useState({
    acode: "",
    zipcode: "",
    area: "",
    city: "",
  });
  const [showModal, setShowModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [renewalType, setRenewalType] = useState("current");
  const [lastSubscriptionEnd, setLastSubscriptionEnd] = useState(null);
  const [groups, setGroups] = useState([]);
  const [subclasses, setSubclasses] = useState([]);
  const [types, setTypes] = useState([]);
  const [selectedRole, setSelectedRole] = useState("HRG"); // Default to HRG
  // Track if user manually picked a subscription type to avoid overwriting
  const [hasUserSelectedSubscriptionType, setHasUserSelectedSubscriptionType] =
    useState(false);

  // Dedicated handler to change subscription type safely
  const handleSubscriptionTypeChange = (newType) => {
    setHasUserSelectedSubscriptionType(true);
    setFormData((prev) => ({ ...prev, subscriptionType: newType }));
  };

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

  // Function to check if the most recent subscription end date is within ±3 months of today
  const isRecentSubscription = () => {
    if (!availableSubscriptions || availableSubscriptions.length === 0) {
      return false;
    }

    // Find the subscription with the latest valid end date
    const latestByEndDate = availableSubscriptions
      .map((s) => ({ sub: s, end: parseDate(s.enddate) }))
      .filter((x) => x.end instanceof Date && !isNaN(x.end.getTime()))
      .sort((a, b) => a.end - b.end)
      .pop();

    if (!latestByEndDate) return false;

    const endDate = latestByEndDate.end;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const threeMonthsAhead = new Date(today);
    threeMonthsAhead.setMonth(threeMonthsAhead.getMonth() + 3);

    return endDate >= threeMonthsAgo && endDate <= threeMonthsAhead;
  };

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
    paymtform: "",
    unsubscribe: false,
    remarks: "",
    caltype: "",
    calqty: 0,
    calunit: 0,
    calamt: 0,
    paymtdate: "",
    paymtdateMonth: "",
    paymtdateDay: "",
    paymtdateYear: "",
    // WMM/Promo/Complimentary fields
    subsdate: "",
    subsdateMonth: "",
    subsdateDay: "",
    subsdateYear: "",
    enddate: "",
    enddateMonth: "",
    enddateDay: "",
    enddateYear: "",
    subsyear: 0,
    copies: 1,
    paymtmasses: "",
    calendar: false,
    subsclass: "",
    donorid: "",
    referralid: "",
  });

  // Add separate state variables for role-specific data
  const [hrgData, setHrgData] = useState({
    recvdate: "",
    recvdateMonth: "",
    recvdateDay: "",
    recvdateYear: "",
    campaigndate: "",
    campaigndateMonth: "",
    campaigndateDay: "",
    campaigndateYear: "",
    paymtref: "",
    paymtamt: 0,
    paymtform: "",
    unsubscribe: false,
    remarks: "",
  });

  const [fomData, setFomData] = useState({
    recvdate: "",
    recvdateMonth: "",
    recvdateDay: "",
    recvdateYear: "",
    paymtref: "",
    paymtamt: 0,
    paymtform: "",
    paymtdate: "",
    paymtdateMonth: "",
    paymtdateDay: "",
    paymtdateYear: "",
    unsubscribe: false,
    remarks: "",
  });

  const [calData, setCalData] = useState({
    recvdate: "",
    recvdateMonth: "",
    recvdateDay: "",
    recvdateYear: "",
    caltype: "",
    calqty: 0,
    calunit: 0,
    calamt: 0,
    paymtref: "",
    paymtamt: 0,
    paymtform: "",
    paymtdate: "",
    paymtdateMonth: "",
    paymtdateDay: "",
    paymtdateYear: "",
    remarks: "",
  });

  const [areas, setAreas] = useState(null);
  const [isLoadingAreas, setIsLoadingAreas] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add state to control what type of update to perform
  const [updateType, setUpdateType] = useState("all"); // "all", "clientOnly", "subscriptionOnly", "roleOnly"

  // Handle update type change
  const handleUpdateTypeChange = (newUpdateType) => {
    setUpdateType(newUpdateType);
  };

  // Helper function to check if subscription data exists
  const hasSubscriptionData = (data, type) => {
    if (!data) return false;

    switch (type) {
      case "WMM":
        if (!data.wmmData) return false;
        {
          const records = Array.isArray(data.wmmData)
            ? data.wmmData
            : Array.isArray(data.wmmData.records)
            ? data.wmmData.records
            : [];
          return records.length > 0;
        }
      case "Promo":
        if (!data.promoData) return false;
        {
          const records = Array.isArray(data.promoData)
            ? data.promoData
            : Array.isArray(data.promoData.records)
            ? data.promoData.records
            : [];
          return records.length > 0;
        }
      case "Complimentary":
        if (!data.complimentaryData) return false;
        {
          const records = Array.isArray(data.complimentaryData)
            ? data.complimentaryData
            : Array.isArray(data.complimentaryData.records)
            ? data.complimentaryData.records
            : [];
          return records.length > 0;
        }
      default:
        return false;
    }
  };

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

  // Update the main useEffect that initializes form data
  useEffect(() => {
    // Only populate data if we're in edit mode and have rowData
    if (rowData && mode === "edit") {
      // Parse birth date into components if it exists
      let bdateMonth = "";
      let bdateDay = "";
      let bdateYear = "";

      if (rowData.bdate) {
        // Use the robust parseDateToComponents function to handle multiple date formats
        const bdateParts = parseDateToComponents(rowData.bdate);
        bdateMonth = bdateParts.month;
        bdateDay = bdateParts.day;
        bdateYear = bdateParts.year;
      }

      // Parse address into components if it exists
      let housestreet = rowData.housestreet || "";
      let subdivision = rowData.subdivision || "";
      let barangay = rowData.barangay || "";
      let city = rowData.area || "";
      let zipcode = rowData.zipcode || "";

      // If we have a combined address but no individual components, parse it
      if (
        rowData.address &&
        (!rowData.housestreet || !rowData.subdivision || !rowData.barangay)
      ) {
        const addressLines = rowData.address
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line);

        if (addressLines.length >= 1) {
          housestreet = addressLines[0];
        }
        if (addressLines.length >= 2) {
          subdivision = addressLines[1];
        }
        if (addressLines.length >= 3) {
          barangay = addressLines[2];
        }
        if (addressLines.length >= 4) {
          // The last line typically contains zipcode and city
          const lastLine = addressLines[3];
          const zipMatch = lastLine.match(/^(\d+)/);
          if (zipMatch) {
            zipcode = zipMatch[1];
            city = lastLine.replace(zipMatch[1], "").trim();
          } else {
            city = lastLine;
          }
        }
      }

      // Determine subscription type from existing data
      let subscriptionType = "None"; // Default to None when no data exists
      if (rowData.subscriptionType) {
        // Verify that the subscription type from rowData actually has data
        const hasWmmData = hasSubscriptionData(rowData, "WMM");
        const hasPromoData = hasSubscriptionData(rowData, "Promo");
        const hasComplimentaryData = hasSubscriptionData(
          rowData,
          "Complimentary"
        );

        // Only use rowData.subscriptionType if it has actual data
        if (
          (rowData.subscriptionType === "WMM" && hasWmmData) ||
          (rowData.subscriptionType === "Promo" && hasPromoData) ||
          (rowData.subscriptionType === "Complimentary" && hasComplimentaryData)
        ) {
          subscriptionType = rowData.subscriptionType;
        } else {
          // Fallback to determining from available data
          if (hasPromoData) {
            subscriptionType = "Promo";
          } else if (hasComplimentaryData) {
            subscriptionType = "Complimentary";
          } else if (hasWmmData) {
            subscriptionType = "WMM";
          }
        }
      } else {
        // Determine from available data
        if (hasSubscriptionData(rowData, "Promo")) {
          subscriptionType = "Promo";
        } else if (hasSubscriptionData(rowData, "Complimentary")) {
          subscriptionType = "Complimentary";
        } else if (hasSubscriptionData(rowData, "WMM")) {
          subscriptionType = "WMM";
        }
      }

      // Initialize client information fields with values from rowData
      setFormData((prev) => {
        // Only update if this is the initial load (when formData is empty or has default values)
        const isInitialLoad = !prev.lname && !prev.fname && !prev.company;

        if (isInitialLoad) {
          const newData = {
            ...prev,
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
            housestreet: housestreet || "",
            subdivision: subdivision || "",
            barangay: barangay || "",
            zipcode: zipcode || "",
            area: city || "",
            acode: rowData.acode || "",
            contactnos: rowData.contactnos || "",
            cellno: rowData.cellno || "",
            ofcno: rowData.ofcno || "",
            email: rowData.email || "",
            type: rowData.type || "",
            group: rowData.group || "",
            remarks: rowData.remarks || "",
            spack: rowData.spack ?? false,
            rts: rowData.rts || false, // Add RTS field
            rtsCount: rowData.rtsCount || 0, // Add RTS count field
            rtsMaxReached: rowData.rtsMaxReached || false, // Add RTS max reached field
            // Respect manual user selection; only set detected type if user hasn't chosen
            subscriptionType: hasUserSelectedSubscriptionType
              ? prev.subscriptionType
              : subscriptionType,
          };
          return newData;
        } else {
          // If form already has data, only update subscription type if it hasn't been set
          if (!prev.subscriptionType || prev.subscriptionType === "None") {
            return {
              ...prev,
              subscriptionType: hasUserSelectedSubscriptionType
                ? prev.subscriptionType
                : subscriptionType,
            };
          }
          return prev; // Don't update anything if form already has data
        }
      });

      // Update addressData state with parsed address components
      setAddressData({
        housestreet: housestreet || "",
        subdivision: subdivision || "",
        barangay: barangay || "",
        city: city || "",
        zipcode: zipcode || "",
      });

      // Update areaData state with parsed area information
      setAreaData({
        acode: rowData.acode || "",
        zipcode: zipcode || "",
        area: city || "",
        city: city || "",
      });

      // Update combined address
      setCombinedAddress(rowData.address || "");

      // Load role-specific records
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

      // Only populate subscription data if subscriptionMode is "edit"
      if (subscriptionMode === "edit") {
        // Initialize subscription fields with values from rowData
        setFormData((prev) => ({
          ...prev,
          subscriptionFreq: rowData.subscriptionFreq || "",
          subscriptionStart: rowData.subscriptionStart || "",
          subscriptionEnd: rowData.subscriptionEnd || "",
          subsclass: rowData.subsclass || "",
        }));

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
    } else if (mode === "add") {
      // In add mode, ensure all fields are empty (don't populate from rowData)
      setSubscriptionMode("add");
      setSelectedSubscription({
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

      setAvailableSubscriptions([]);

      // Reset role-specific records
      setHrgRecords([]);
      setFomRecords([]);
      setCalRecords([]);
      setWmmRecords([]);
      setPromoRecords([]);
      setComplimentaryRecords([]);

      setSelectedHrgRecord(null);
      setSelectedFomRecord(null);
      setSelectedCalRecord(null);
      setSelectedWmmRecord(null);
      setSelectedPromoRecord(null);
      setSelectedComplimentaryRecord(null);

      setRoleRecordMode("edit");
      setSelectedRole("HRG");

      // Reset subscription fields to empty/default values
      setFormData((prev) => ({
        ...prev,
        subscriptionType: "WMM",
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
        referralid: "",
      }));

      // Reset role-specific data to empty/default values
      setRoleSpecificData({
        recvdate: "",
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
        subsdate: "",
        enddate: "",
        subsyear: 0,
        copies: "1",
        paymtmasses: 0,
        calendar: false,
        subsclass: "",
        donorid: "",
      });
    }
  }, [rowData, mode, subscriptionMode]);

  // Also update the WMM subscription data useEffect
  useEffect(() => {
    if (mode === "edit" && rowData && subscriptionMode === "edit") {
      // Get subscription type from formData (which is now properly set)
      const subscriptionType = formData.subscriptionType || "WMM";

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
      }
    } else if (mode === "add") {
      // Brand-new client add: clear everything
      setAvailableSubscriptions([]);
      setSelectedSubscription({
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
    } else if (subscriptionMode === "add") {
      // Switching to add mode while editing an existing client: keep availableSubscriptions
      // so the CTA label (Renew/Add New) remains stable based on recency
      setSelectedSubscription({
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
    }
  }, [rowData, mode, subscriptionMode, formData.subscriptionType]); // Add subscriptionType to dependency array

  // Add another useEffect to handle mode changes specifically
  useEffect(() => {
    if (mode === "add") {
      // Ensure all fields are cleared when mode changes to add
      setFormData((prev) => ({
        ...prev,
        // Reset subscription type to default
        subscriptionType: "WMM",
        // Clear any remaining fields that might not be reset above
        referralid: "",
      }));

      // Reset subscription mode to add
      setSubscriptionMode("add");
    }
  }, [mode]);

  // Add useEffect to handle subscription type changes
  useEffect(() => {
    if (mode === "edit" && rowData && subscriptionMode === "edit") {
      // Get the appropriate subscription data based on current subscription type
      let subscriptionData;
      if (formData.subscriptionType === "Promo") {
        subscriptionData = rowData.promoData?.records || [];
      } else if (formData.subscriptionType === "Complimentary") {
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
        setSelectedSubscription(latestSubscription);
      } else {
        // Clear selected subscription if no data for this type
        setSelectedSubscription({
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
      }
    }
  }, [formData.subscriptionType, mode, rowData, subscriptionMode]);

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
    if (subscriptionMode === "add" && rowData && mode === "edit") {
      // Clear subscription-related fields in formData
      setFormData((prev) => {
        // Store the current subsclass value before clearing
        const currentSubsclass =
          prev.subsclass || roleSpecificData.subsclass || "";

        return {
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
          subsclass: currentSubsclass, // Preserve the subsclass value
          referralid: prev.subscriptionType === "Promo" ? "" : undefined,
        };
      });

      // Clear subscription data in roleSpecificData but preserve subsclass
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
        subsclass: prev.subsclass, // Preserve the subsclass value
        donorid: "",
        paymtref: "",
        remarks: "",
        referralid: prev.subscriptionType === "Promo" ? "" : "",
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
  }, [subscriptionMode, rowData, mode]);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await axios.get(
          `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/groups`
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
    setShowConfirmation(false);
    if (typeof onClose === "function") {
      onClose();
    }
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

  // Update handleChange to ensure values are never undefined
  const handleChange = async (e) => {
    const { name, value } = e.target;
    const safeValue = value ?? ""; // Ensure value is never undefined

    // Handle bdate parts
    if (name === "bdateMonth" || name === "bdateDay" || name === "bdateYear") {
      setFormData((prevData) => {
        const newData = {
          ...prevData,
          [name]: cleanDateInput(safeValue),
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
          [name]: cleanDateInput(safeValue),
        };

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
          [name]: cleanDateInput(safeValue),
        };

        if (newData.subEndMonth && newData.subEndDay && newData.subEndYear) {
          newData.subscriptionEnd = `${newData.subEndMonth}/${newData.subEndDay}/${newData.subEndYear}`;
        } else {
          newData.subscriptionEnd = "";
        }

        return newData;
      });
      return;
    }

    // For all other fields
    setFormData((prevData) => {
      const newData = {
        ...prevData,
        [name]: safeValue,
      };
      return newData;
    });
  };

  // Update handleRoleSpecificChange to ensure values are never undefined
  const handleRoleSpecificChange = (e) => {
    const { name, value, type, checked } = e.target;
    const safeValue = type === "checkbox" ? checked : value ?? "";

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
        fieldValue = cleanDateInput(safeValue).toUpperCase();
      } else if (["paymtmasses", "paymtamt"].includes(name)) {
        // Always convert to number for payment fields
        fieldValue = Number(safeValue) || 0;
      } else if (
        ["subsyear", "calqty", "calunit", "calamt", "zipcode"].includes(name)
      ) {
        // Handle other numeric fields - convert to number if possible, otherwise keep as string
        fieldValue = isNaN(safeValue) ? safeValue : Number(safeValue);
      } else {
        // Only call toUpperCase on string values
        fieldValue =
          typeof safeValue === "string" ? safeValue.toUpperCase() : safeValue;
      }

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

      if (
        name === "paymtdateMonth" ||
        name === "paymtdateDay" ||
        name === "paymtdateYear"
      ) {
        if (
          newData.paymtdateMonth &&
          newData.paymtdateDay &&
          newData.paymtdateYear
        ) {
          // Format as YYYY-MM-DD for database consistency
          newData.paymtdate = `${newData.paymtdateYear}-${newData.paymtdateMonth}-${newData.paymtdateDay}`;
        }
      }

      // When CAL qty/unit changes, only store unit cost under calamt (UI total is display-only)
      if (selectedRole === "CAL" && (name === "calqty" || name === "calunit")) {
        const calqty =
          parseFloat(name === "calqty" ? value : newData.calqty) || 0;
        const calunit =
          parseFloat(name === "calunit" ? value : newData.calunit) || 0;
        // Ensure unit cost is saved under calamt
        newData.calamt = (parseFloat(newData.calunit) || 0).toString();
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

  // Helper function to handle newRoleData changes with trailing space cleaning
  const handleNewRoleDataChange = (field, value) => {
    setNewRoleData((prev) => ({
      ...prev,
      [field]: cleanDateInput(value),
    }));
  };

  // In Add mode, keep calamt synced to unit price; do not auto-set paymtamt
  useEffect(() => {
    if (selectedRole === "CAL" && roleRecordMode === "add") {
      const quantity = parseFloat(newRoleData.calqty) || 0;
      const unitPrice = parseFloat(newRoleData.calunit) || 0;
      setNewRoleData((prev) => ({
        ...prev,
        // store unit cost under calamt only
        calamt: unitPrice.toString(),
      }));
    }
  }, [newRoleData.calqty, newRoleData.calunit, selectedRole, roleRecordMode]);

  // Add separate handler functions for HRG, FOM, and CAL data
  const handleHrgChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    setHrgData((prev) => {
      const updated = {
        ...prev,
        [name]: newValue,
      };

      // Handle date component changes
      if (
        name === "recvdateMonth" ||
        name === "recvdateDay" ||
        name === "recvdateYear"
      ) {
        if (
          updated.recvdateMonth &&
          updated.recvdateDay &&
          updated.recvdateYear
        ) {
          updated.recvdate = `${updated.recvdateYear}-${updated.recvdateMonth}-${updated.recvdateDay}`;
        }
      }

      if (
        name === "campaigndateMonth" ||
        name === "campaigndateDay" ||
        name === "campaigndateYear"
      ) {
        if (
          updated.campaigndateMonth &&
          updated.campaigndateDay &&
          updated.campaigndateYear
        ) {
          updated.campaigndate = `${updated.campaigndateYear}-${updated.campaigndateMonth}-${updated.campaigndateDay}`;
        }
      }

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

      // Handle date component changes
      if (
        name === "recvdateMonth" ||
        name === "recvdateDay" ||
        name === "recvdateYear"
      ) {
        if (
          updated.recvdateMonth &&
          updated.recvdateDay &&
          updated.recvdateYear
        ) {
          updated.recvdate = `${updated.recvdateMonth}-${updated.recvdateDay}-${updated.recvdateYear}`;
        }
      }

      if (
        name === "paymtdateMonth" ||
        name === "paymtdateDay" ||
        name === "paymtdateYear"
      ) {
        if (
          updated.paymtdateMonth &&
          updated.paymtdateDay &&
          updated.paymtdateYear
        ) {
          updated.paymtdate = `${updated.paymtdateYear}-${updated.paymtdateMonth}-${updated.paymtdateDay}`;
        }
      }

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

      // Handle date component changes
      if (
        name === "recvdateMonth" ||
        name === "recvdateDay" ||
        name === "recvdateYear"
      ) {
        if (
          updated.recvdateMonth &&
          updated.recvdateDay &&
          updated.recvdateYear
        ) {
          updated.recvdate = `${updated.recvdateYear}-${updated.recvdateMonth}-${updated.recvdateDay}`;
        }
      }

      if (
        name === "paymtdateMonth" ||
        name === "paymtdateDay" ||
        name === "paymtdateYear"
      ) {
        if (
          updated.paymtdateMonth &&
          updated.paymtdateDay &&
          updated.paymtdateYear
        ) {
          updated.paymtdate = `${updated.paymtdateYear}-${updated.paymtdateMonth}-${updated.paymtdateDay}`;
        }
      }

      // When CAL qty/unit changes, only store unit cost under calamt (UI total is display-only)
      if (name === "calqty" || name === "calunit") {
        const calqty =
          parseFloat(name === "calqty" ? value : updated.calqty) || 0;
        const calunit =
          parseFloat(name === "calunit" ? value : updated.calunit) || 0;
        // Persist unit price in calamt for backend
        updated.calamt = calunit.toString();
      }

      return updated;
    });
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
      setCombinedAddress(formattedAddress || "");

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
        setCombinedAddress(formattedAddress || "");
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

        setCombinedAddress(formattedAddress || "");
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
    setCombinedAddress(formattedAddress || "");
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
          const paymtdateParts = parseDateToComponents(firstRecord.paymtdate);
          const roleData = {
            ...firstRecord,
            recvdateMonth: recvdateParts.month,
            recvdateDay: recvdateParts.day,
            recvdateYear: recvdateParts.year,
            campaigndateMonth: campaigndateParts.month,
            campaigndateDay: campaigndateParts.day,
            campaigndateYear: campaigndateParts.year,
            paymtdateMonth: paymtdateParts.month,
            paymtdateDay: paymtdateParts.day,
            paymtdateYear: paymtdateParts.year,
          };
          setHrgData(roleData);
        } else {
          const recvdateParts = parseDateToComponents(
            selectedHrgRecord.recvdate
          );
          const campaigndateParts = parseDateToComponents(
            selectedHrgRecord.campaigndate
          );
          const paymtdateParts = parseDateToComponents(
            selectedHrgRecord.paymtdate
          );
          setHrgData({
            ...selectedHrgRecord,
            recvdateMonth: recvdateParts.month,
            recvdateDay: recvdateParts.day,
            recvdateYear: recvdateParts.year,
            campaigndateMonth: campaigndateParts.month,
            campaigndateDay: campaigndateParts.day,
            campaigndateYear: campaigndateParts.year,
            paymtdateMonth: paymtdateParts.month,
            paymtdateDay: paymtdateParts.day,
            paymtdateYear: paymtdateParts.year,
          });
        }
      } else {
        // No records available, set up empty form
        const today = new Date();
        const todayParts = parseDateToComponents(formatDateToMMDDYY(today));
        setHrgData({
          recvdate: formatDateToMMDDYY(today),
          recvdateMonth: todayParts.month,
          recvdateDay: todayParts.day,
          recvdateYear: todayParts.year,
          campaigndate: "",
          campaigndateMonth: "",
          campaigndateDay: "",
          campaigndateYear: "",
          paymtdate: "",
          paymtdateMonth: "",
          paymtdateDay: "",
          paymtdateYear: "",
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
          const paymtdateParts = parseDateToComponents(firstRecord.paymtdate);
          const roleData = {
            ...firstRecord,
            // map backend unit (calamt) into UI unit field
            calunit: firstRecord.calunit ?? firstRecord.calamt ?? 0,
            recvdateMonth: recvdateParts.month,
            recvdateDay: recvdateParts.day,
            recvdateYear: recvdateParts.year,
            paymtdateMonth: paymtdateParts.month,
            paymtdateDay: paymtdateParts.day,
            paymtdateYear: paymtdateParts.year,
          };
          setFomData(roleData);
        } else {
          const recvdateParts = parseDateToComponents(
            selectedFomRecord.recvdate
          );
          const paymtdateParts = parseDateToComponents(
            selectedFomRecord.paymtdate
          );
          setFomData({
            ...selectedFomRecord,
            recvdateMonth: recvdateParts.month,
            recvdateDay: recvdateParts.day,
            recvdateYear: recvdateParts.year,
            paymtdateMonth: paymtdateParts.month,
            paymtdateDay: paymtdateParts.day,
            paymtdateYear: paymtdateParts.year,
          });
        }
      } else {
        // No records available, set up empty form
        const today = new Date();
        const todayParts = parseDateToComponents(formatDateToMMDDYY(today));
        setFomData({
          recvdate: formatDateToMMDDYY(today),
          recvdateMonth: todayParts.month,
          recvdateDay: todayParts.day,
          recvdateYear: todayParts.year,
          paymtdate: "",
          paymtdateMonth: "",
          paymtdateDay: "",
          paymtdateYear: "",
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
          const paymtdateParts = parseDateToComponents(firstRecord.paymtdate);
          const roleData = {
            ...firstRecord,
            recvdateMonth: recvdateParts.month,
            recvdateDay: recvdateParts.day,
            recvdateYear: recvdateParts.year,
            paymtdateMonth: paymtdateParts.month,
            paymtdateDay: paymtdateParts.day,
            paymtdateYear: paymtdateParts.year,
          };
          setCalData(roleData);
        } else {
          const recvdateParts = parseDateToComponents(
            selectedCalRecord.recvdate
          );
          const paymtdateParts = parseDateToComponents(
            selectedCalRecord.paymtdate
          );
          setCalData({
            ...selectedCalRecord,
            calunit: selectedCalRecord.calunit ?? selectedCalRecord.calamt ?? 0,
            recvdateMonth: recvdateParts.month,
            recvdateDay: recvdateParts.day,
            recvdateYear: recvdateParts.year,
            paymtdateMonth: paymtdateParts.month,
            paymtdateDay: paymtdateParts.day,
            paymtdateYear: paymtdateParts.year,
          });
        }
      } else {
        // No records available, set up empty form
        const today = new Date();
        const todayParts = parseDateToComponents(formatDateToMMDDYY(today));
        setCalData({
          recvdate: formatDateToMMDDYY(today),
          recvdateMonth: todayParts.month,
          recvdateDay: todayParts.day,
          recvdateYear: todayParts.year,
          caltype: "",
          calqty: 0,
          calamt: 0,
          calunit: 0,
          paymtref: "",
          paymtamt: 0,
          paymtform: "",
          paymtdate: "",
          paymtdateMonth: "",
          paymtdateDay: "",
          paymtdateYear: "",
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
      setHrgData({
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
      setFomData({
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
      setCalData({
        ...firstRecord,
        calunit: firstRecord.calunit ?? firstRecord.calamt ?? 0,
        recvdateMonth: recvdateParts.month,
        recvdateDay: recvdateParts.day,
        recvdateYear: recvdateParts.year,
      });
    }
  }, [calRecords, selectedRole, selectedCalRecord]);

  // Update the useEffect that loads WMM data
  useEffect(() => {
    if (
      selectedRole === "WMM" &&
      wmmRecords.length > 0 &&
      subscriptionMode === "edit"
    ) {
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
  }, [wmmRecords, selectedRole, selectedWmmRecord, subscriptionMode]);

  // Additional useEffect to handle role change to WMM
  useEffect(() => {
    if (
      selectedRole === "WMM" &&
      wmmRecords.length > 0 &&
      subscriptionMode === "edit"
    ) {
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
  }, [selectedRole, wmmRecords, roleRecordMode, subscriptionMode]);

  useEffect(() => {
    if (
      selectedRole === "Promo" &&
      promoRecords.length > 0 &&
      !selectedPromoRecord &&
      subscriptionMode === "edit"
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
  }, [promoRecords, selectedRole, selectedPromoRecord, subscriptionMode]);

  useEffect(() => {
    if (
      selectedRole === "Complimentary" &&
      complimentaryRecords.length > 0 &&
      !selectedComplimentaryRecord &&
      subscriptionMode === "edit"
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
  }, [
    complimentaryRecords,
    selectedRole,
    selectedComplimentaryRecord,
    subscriptionMode,
  ]);

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
            : "",
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
        referralid: formData.subscriptionType === "Promo" ? "" : "",
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
        referralid: formData.subscriptionType === "Promo" ? "" : "",
      }));

      // Only set today's date if we're in edit mode (editing an existing client)
      // In add mode (new client), keep fields empty
      if (rowData) {
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
          setFormData((prev) => ({
            ...prev,
            subscriptionFreq: frequency,
          }));
        }
      }
    }
  };

  // Add removeEmptyFields helper function before handleSubmit
  const removeEmptyFields = (obj) => {
    const result = {};

    // Essential client fields that should always be included, even if empty
    const essentialFields = [
      "fname",
      "lname",
      "mname",
      "sname",
      "title",
      "company",
      "address",
      "housestreet",
      "subdivision",
      "barangay",
      "zipcode",
      "area",
      "acode",
      "contactnos",
      "cellno",
      "ofcno",
      "email",
      "type",
      "group",
      "remarks",
      "bdate",
      "spack",
      "rts",
      "rtsCount",
      "rtsMaxReached",
    ];

    for (const key in obj) {
      // Always include essential fields, even if empty
      if (essentialFields.includes(key)) {
        // For boolean fields, preserve the actual value (including false)
        if (key === "spack" || key === "rts" || key === "rtsMaxReached") {
          result[key] =
            obj[key] === true || obj[key] === false ? obj[key] : false;
        } else {
          result[key] = obj[key] || "";
        }
      } else if (obj[key] !== undefined && obj[key] !== "") {
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

  // Determine which client fields were cleared by the user so we can send nulls to backend
  const getClearedClientFields = (previousData, currentData) => {
    if (!previousData) return {};
    const fieldsToCheck = [
      "mname",
      "sname",
      "title",
      "company",
      "address",
      "housestreet",
      "subdivision",
      "barangay",
      "zipcode",
      "area",
      "acode",
      "contactnos",
      "cellno",
      "ofcno",
      "email",
      "type",
      "group",
      "remarks",
      "bdate",
      "spack",
      "rts",
      "rtsCount",
      "rtsMaxReached",
    ];

    const cleared = {};
    fieldsToCheck.forEach((field) => {
      const previousValue = previousData?.[field];
      const currentValue = currentData?.[field];

      // Special handling for boolean fields
      if (field === "spack" || field === "rts" || field === "rtsMaxReached") {
        const previousHadValue =
          previousValue === true || previousValue === false;
        const isCleared = currentValue === false && previousValue === true;

        if (previousHadValue && isCleared) {
          cleared[field] = false; // Explicitly set to false on backend
        }
      } else if (field === "rtsCount") {
        // Special handling for rtsCount (numeric field)
        const previousHadValue =
          previousValue !== undefined &&
          previousValue !== null &&
          previousValue !== 0;
        const isCleared = currentValue === 0 && previousValue > 0;

        if (previousHadValue && isCleared) {
          cleared[field] = 0; // Explicitly set to 0 on backend
        }
      } else {
        // Original logic for string fields
        const previousHadValue =
          previousValue !== undefined &&
          previousValue !== null &&
          String(previousValue).trim() !== "";

        const isCleared =
          currentValue === null ||
          currentValue === undefined ||
          (typeof currentValue === "string" && currentValue.trim() === "") ||
          (field === "zipcode" && (currentValue === 0 || currentValue === "0"));

        if (previousHadValue && isCleared) {
          cleared[field] = null; // Explicitly clear on backend
        }
      }
    });

    return cleared;
  };

  // Add subscription type styles
  const getSubscriptionTypeStyles = () => {
    switch (formData.subscriptionType) {
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

  // Use modular date formatting functions
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

  // ===== CAL helpers: unit price, quantity, computed total (display only) =====
  const getCalUnitPrice = (source) => {
    if (!source) return 0;
    const unit = source.calunit ?? source.calamt; // backend stores unit in calamt
    const num = parseFloat(unit);
    return isNaN(num) ? 0 : num;
  };

  const getCalQuantity = (source) => {
    if (!source) return 0;
    const qty = source.calqty;
    const num = parseFloat(qty);
    return isNaN(num) ? 0 : num;
  };

  const getCalTotal = (source) => {
    const total = getCalQuantity(source) * getCalUnitPrice(source);
    return Number.isFinite(total) ? total.toFixed(2) : "0.00";
  };

  // Update the handleSubmit function to handle both edit and add modes
  // Data validation function to catch common issues before submission
  const validateSubmissionData = (data) => {
    const errors = [];

    // Check for required fields
    if (!data.clientData) {
      errors.push("Client data is missing");
    } else {
      if (!data.clientData.fname || data.clientData.fname.trim() === "") {
        errors.push("First name is required");
      }
      if (!data.clientData.lname || data.clientData.lname.trim() === "") {
        errors.push("Last name is required");
      }
    }

    // Check for valid dates
    if (data.clientData?.bdate) {
      try {
        const date = new Date(data.clientData.bdate);
        if (isNaN(date.getTime())) {
          errors.push("Invalid birth date format");
        }
      } catch (e) {
        errors.push("Invalid birth date format");
      }
    }

    // Check role submissions data
    if (data.roleSubmissions && Array.isArray(data.roleSubmissions)) {
      data.roleSubmissions.forEach((submission, index) => {
        if (!submission.roleType) {
          errors.push(`Role submission ${index + 1} is missing role type`);
        }
        if (!submission.roleData) {
          errors.push(`Role submission ${index + 1} is missing role data`);
        }
      });
    }

    if (errors.length > 0) {
      console.error("Data validation errors:", errors);
      throw new Error(`Data validation failed: ${errors.join(", ")}`);
    }

    return true;
  };

  // Enhanced submission handler with comprehensive error handling
  const handleSubmissionWithErrorHandling = async (
    submissionData,
    endpoint,
    method
  ) => {
    // Validate data before submission
    try {
      validateSubmissionData(submissionData);
    } catch (validationError) {
      console.error("Data validation failed:", validationError);
      toast({
        title: "Data Validation Error",
        description: validationError.message,
        variant: "destructive",
      });
      throw validationError;
    }

    try {
      const response = await axios[method](endpoint, submissionData);
      return response;
    } catch (error) {
      console.error("Submission error details:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data,
        },
      });
      throw error;
    }
  };

  // Handle confirmed submission from confirmation dialog
  const handleConfirmedSubmit = async () => {
    // Prevent multiple submissions
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    // Format birth date if all parts are present
    const formatBdate = () => {
      try {
        if (formData.bdateMonth && formData.bdateDay && formData.bdateYear) {
          // Clean trailing spaces before formatting
          const month = cleanDateInput(formData.bdateMonth);
          const day = cleanDateInput(formData.bdateDay);
          const year = cleanDateInput(formData.bdateYear);

          // Validate date components
          if (!month || !day || !year) {
            console.warn("Invalid date components:", { month, day, year });
            return formData.bdate || "";
          }

          const formattedDate = `${month}/${day}/${year}`;
          return formattedDate;
        }
        return formData.bdate || "";
      } catch (error) {
        console.error("Error formatting birth date:", error);
        return formData.bdate || "";
      }
    };

    // Prepare base client data
    const baseClientData = {
      ...formData,
      bdate: formatBdate(),
      address: combinedAddress,
      ...areaData,
    };

    // Clean the client data by removing empty fields, then add explicit nulls for cleared fields
    const clientData = removeEmptyFields(baseClientData);
    const clearedFields = getClearedClientFields(rowData, baseClientData);
    const clientDataWithClears = { ...clientData, ...clearedFields };

    // Determine the API endpoint based on mode
    const endpoint =
      mode === "edit"
        ? `http://${import.meta.env.VITE_IP_ADDRESS}:3001/clients/update/${
            rowData.id
          }`
        : `http://${import.meta.env.VITE_IP_ADDRESS}:3001/clients/add`;

    const method = mode === "edit" ? "put" : "post";

    // Determine role type based on subscription type
    let roleType = "";
    let roleData = {};

    // Prepare role submissions
    const roleSubmissions = [];

    // If only updating client data, skip all role submissions
    if (updateType === "clientOnly") {
      const submissionData = {
        clientData: {
          ...clientDataWithClears,
          service: "", // No service change for client-only updates
          subscriptionType: "", // No subscription type change for client-only updates
        },
        roleSubmissions: [], // Empty role submissions for client-only updates
        adddate: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
      };

      try {
        const response = await handleSubmissionWithErrorHandling(
          submissionData,
          `http://${import.meta.env.VITE_IP_ADDRESS}:3001/clients/update/${
            rowData.id
          }`,
          "put"
        );

        if (response.data && response.data.success) {
          toast({
            title: "Client Information Updated Successfully",
            description: (
              <div>
                <p>
                  Client ID:{" "}
                  <span className="font-mono bg-gray-100 px-1 rounded">
                    {rowData.id}
                  </span>
                </p>
                <p>
                  Name: {clientData.fname} {clientData.lname}
                  {clientData.company}
                </p>
                <p className="text-sm text-green-600 mt-1">
                  ✓ Client information updated (no role data changed)
                </p>
              </div>
            ),
            duration: 5000,
          });

          if (onEditSuccess) {
            onEditSuccess({
              id: rowData.id,
              ...clientDataWithClears,
              services: [],
              subscriptionType: "",
            });
          }
          onClose();
          return;
        }
      } catch (error) {
        console.error("Error updating client information:", error);
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Failed to update client information. Please check your connection and try again.";

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
          duration: 5000,
        });
        return;
      }
    }

    // Use modular subscription data check
    const hasSubscriptionData = () => {
      return checkSubscriptionData(formData, roleSpecificData);
    };

    // Only create WMM submission if user has WMM role AND is currently in WMM mode AND update type allows it
    if (
      (updateType === "all" || updateType === "subscriptionOnly") &&
      hasRole("WMM") &&
      selectedRole === "WMM" &&
      hasSubscriptionData()
    ) {
      // Use modular subscription-specific data function
      const getSubscriptionSpecificData = () => {
        return getSubscriptionData(formData.subscriptionType, formData, {
          ...roleSpecificData,
          subsclass: formData.subsclass || roleSpecificData.subsclass || "",
        });
      };

      const subscriptionData = getSubscriptionSpecificData();

      // Map subscription types to their model types
      const modelType = {
        WMM: "WMM",
        Promo: "PROMO",
        Complimentary: "COMP",
      }[formData.subscriptionType];

      // Include recordId if we're editing an existing subscription
      const submission = {
        roleType: modelType,
        roleData: subscriptionData,
      };

      // If we're in edit mode and have a selected subscription, include the recordId
      if (subscriptionMode === "edit" && selectedSubscription) {
        submission.recordId =
          selectedSubscription.id || selectedSubscription._id;
      }

      roleSubmissions.push(submission);
    }

    // Use the appropriate data source based on mode
    const dataSource =
      roleRecordMode === "edit" ? roleSpecificData : newRoleData;

    // Check if we have valid date components for HRG
    const hasHrgDate =
      dataSource.recvdateMonth &&
      dataSource.recvdateDay &&
      dataSource.recvdateYear;

    // Check for other HRG data
    const hasHrgPayment =
      dataSource.paymtref || dataSource.paymtamt || dataSource.paymtform;
    const hasHrgRemarks = dataSource.remarks;
    const hasHrgCampaign =
      dataSource.campaigndateMonth &&
      dataSource.campaigndateDay &&
      dataSource.campaigndateYear;

    // Only create HRG submission if user has HRG role AND is currently in HRG mode AND update type allows it
    if (
      (updateType === "all" || updateType === "roleOnly") &&
      hasRole("HRG") &&
      selectedRole === "HRG" &&
      (hasHrgDate || hasHrgPayment || hasHrgRemarks || hasHrgCampaign)
    ) {
      const formatDate = (month, day, year) => {
        if (month && day && year) {
          // Clean trailing spaces and format as YYYY-MM-DD for database consistency
          const cleanMonth = cleanDateInput(month);
          const cleanDay = cleanDateInput(day);
          const cleanYear = cleanDateInput(year);
          return `${cleanYear}-${cleanMonth}-${cleanDay}`;
        }
        return "";
      };

      const hrgData = {
        recvdate: formatDate(
          dataSource.recvdateMonth,
          dataSource.recvdateMonth,
          dataSource.recvdateYear
        ),
        campaigndate: formatDate(
          dataSource.campaigndateMonth,
          dataSource.campaigndateDay,
          dataSource.campaigndateYear
        ),
        paymtref: dataSource.paymtref || "",
        paymtamt: dataSource.paymtamt || 0,
        paymtform: dataSource.paymtform || "",
        unsubscribe: dataSource.unsubscribe || false,
        remarks: dataSource.remarks || "",
      };

      // Include recordId if we're editing an existing HRG record
      const hrgSubmission = {
        roleType: "HRG",
        roleData: hrgData,
      };

      // If we're in edit mode and have a selected HRG record, include the recordId
      if (roleRecordMode === "edit" && selectedHrgRecord) {
        hrgSubmission.recordId = selectedHrgRecord.id || selectedHrgRecord._id;
      }

      roleSubmissions.push(hrgSubmission);
    }

    // Check if we have valid date components for FOM
    const hasFomDate =
      dataSource.recvdateMonth &&
      dataSource.recvdateDay &&
      dataSource.recvdateYear;

    // Check for other FOM data
    const hasFomPayment = dataSource.paymtref || dataSource.paymtamt;
    const hasFomPaymentDate =
      dataSource.paymtdateMonth &&
      dataSource.paymtdateDay &&
      dataSource.paymtdateYear;
    const hasFomRemarks = dataSource.remarks;
    const hasFomForm = dataSource.paymtform;

    // Only create FOM submission if user has FOM role AND is currently in FOM mode AND update type allows it
    if (
      (updateType === "all" || updateType === "roleOnly") &&
      hasRole("FOM") &&
      selectedRole === "FOM" &&
      (hasFomDate ||
        hasFomPayment ||
        hasFomPaymentDate ||
        hasFomRemarks ||
        hasFomForm)
    ) {
      const formatDate = (month, day, year) => {
        if (month && day && year) {
          // Clean trailing spaces and format as YYYY-MM-DD for database consistency
          const cleanMonth = cleanDateInput(month);
          const cleanDay = cleanDateInput(day);
          const cleanYear = cleanDateInput(year);
          return `${cleanYear}-${cleanMonth}-${cleanDay}`;
        }
        return "";
      };

      const fomData = {
        recvdate: formatDate(
          dataSource.recvdateMonth,
          dataSource.recvdateDay,
          dataSource.recvdateYear
        ),
        paymtref: dataSource.paymtref || "",
        paymtamt: dataSource.paymtamt || 0,
        paymtform: dataSource.paymtform || "",
        paymtdate: formatDate(
          dataSource.paymtdateMonth,
          dataSource.paymtdateDay,
          dataSource.paymtdateYear
        ),
        unsubscribe: dataSource.unsubscribe || false,
        remarks: dataSource.remarks || "",
      };

      // Include recordId if we're editing an existing FOM record
      const fomSubmission = {
        roleType: "FOM",
        roleData: fomData,
      };

      // If we're in edit mode and have a selected FOM record, include the recordId
      if (roleRecordMode === "edit" && selectedFomRecord) {
        fomSubmission.recordId = selectedFomRecord.id || selectedFomRecord._id;
      }

      roleSubmissions.push(fomSubmission);
    }

    // Check if we have valid date components for CAL
    const hasCalDate =
      dataSource.recvdateMonth &&
      dataSource.recvdateDay &&
      dataSource.recvdateYear;

    // Check for other CAL data
    const hasCalPayment = dataSource.paymtref || dataSource.paymtamt;
    const hasCalPaymentDate =
      dataSource.paymtdateMonth &&
      dataSource.paymtdateDay &&
      dataSource.paymtdateYear;
    const hasCalRemarks = dataSource.remarks;
    const hasCalType = dataSource.caltype;
    const hasCalQty = dataSource.calqty;
    const hasCalUnit = dataSource.calunit;
    const hasCalAmt = dataSource.calamt;

    // Only create CAL submission if user has CAL role AND is currently in CAL mode AND update type allows it
    if (
      (updateType === "all" || updateType === "roleOnly") &&
      hasRole("CAL") &&
      selectedRole === "CAL" &&
      (hasCalDate ||
        hasCalPayment ||
        hasCalPaymentDate ||
        hasCalRemarks ||
        hasCalType ||
        hasCalQty ||
        hasCalUnit ||
        hasCalAmt)
    ) {
      const formatDate = (month, day, year) => {
        if (month && day && year) {
          // Clean trailing spaces and format as YYYY-MM-DD for database consistency
          const cleanMonth = cleanDateInput(month);
          const cleanDay = cleanDateInput(day);
          const cleanYear = cleanDateInput(year);
          return `${cleanYear}-${cleanMonth}-${cleanDay}`;
        }
        return "";
      };

      const calData = {
        recvdate: formatDate(
          dataSource.recvdateMonth,
          dataSource.recvdateDay,
          dataSource.recvdateYear
        ),
        caltype: dataSource.caltype || "",
        calqty: dataSource.calqty || 0,
        calunit: dataSource.calunit || 0,
        // Persist unit cost under calamt
        calamt: dataSource.calunit || 0,
        paymtref: dataSource.paymtref || "",
        // Only include paymtamt if user provided it (no auto-compute)
        ...(dataSource.paymtamt ? { paymtamt: dataSource.paymtamt } : {}),
        paymtform: dataSource.paymtform || "",
        paymtdate: formatDate(
          dataSource.paymtdateMonth,
          dataSource.paymtdateDay,
          dataSource.paymtdateYear
        ),
        remarks: dataSource.remarks || "",
      };

      // Remove empty fields to avoid persisting unset payment fields
      const cleanCalData = removeEmptyFields(calData);

      // Include recordId if we're editing an existing CAL record
      const calSubmission = {
        roleType: "CAL",
        roleData: cleanCalData,
      };

      // If we're in edit mode and have a selected CAL record, include the recordId
      if (roleRecordMode === "edit" && selectedCalRecord) {
        calSubmission.recordId = selectedCalRecord.id || selectedCalRecord._id;
      }

      roleSubmissions.push(calSubmission);
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
        ...clientDataWithClears,
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
      const response = await handleSubmissionWithErrorHandling(
        submissionData,
        endpoint,
        method
      );

      if (response.data && response.data.success) {
        // Show success toast with appropriate message
        toast({
          title:
            mode === "edit"
              ? "Client Updated Successfully"
              : "Client Added Successfully",
          description: (
            <div>
              {mode === "edit" && (
                <p>
                  Client ID:{" "}
                  <span className="font-mono bg-gray-100 px-1 rounded">
                    {rowData.id}
                  </span>
                </p>
              )}
              <p>
                Name: {clientData.fname} {clientData.lname}
                {clientData.company}
              </p>
              <p className="text-sm text-green-600 mt-1">
                ✓ All role data saved successfully
              </p>
            </div>
          ),
          duration: 5000,
        });

        // Backend already emits the WebSocket event, so we don't need to emit it again
        if (onEditSuccess) {
          onEditSuccess({
            id: mode === "edit" ? rowData.id : response.data.id,
            ...clientDataWithClears,
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
      } else {
        // Handle case where API returns success: false
        toast({
          title: mode === "edit" ? "Update Failed" : "Add Failed",
          description:
            response.data?.message ||
            (mode === "edit"
              ? "Failed to update client. Please try again."
              : "Failed to add client. Please try again."),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(
        `Error ${mode === "edit" ? "updating" : "adding"} client:`,
        error
      );

      // Show detailed error toast
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        `Failed to ${
          mode === "edit" ? "update" : "add"
        } client. Please check your connection and try again.`;

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    // Skip if this came from DonorAdd
    if (e.nativeEvent?.donorAddEvent) {
      return;
    }

    e.preventDefault();

    // Show confirmation dialog for edit mode
    if (mode === "edit") {
      setShowConfirmation(true);
      return;
    }

    // For add mode, proceed with submission
    // Prevent multiple submissions
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    // Format birth date if all parts are present
    const formatBdate = () => {
      if (formData.bdateMonth && formData.bdateDay && formData.bdateYear) {
        // Clean trailing spaces before formatting
        const month = cleanDateInput(formData.bdateMonth);
        const day = cleanDateInput(formData.bdateDay);
        const year = cleanDateInput(formData.bdateYear);
        return `${month}/${day}/${year}`;
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

    // Clean the client data by removing empty fields, then add explicit nulls for cleared fields
    const clientData = removeEmptyFields(baseClientData);
    const clearedFields = getClearedClientFields(rowData, baseClientData);
    const clientDataWithClears = { ...clientData, ...clearedFields };

    // Determine the API endpoint based on mode
    const endpoint =
      mode === "edit"
        ? `http://${import.meta.env.VITE_IP_ADDRESS}:3001/clients/update/${
            rowData.id
          }`
        : `http://${import.meta.env.VITE_IP_ADDRESS}:3001/clients/add`;

    const method = mode === "edit" ? "put" : "post";

    // Determine role type based on subscription type
    let roleType = "";
    let roleData = {};

    // Prepare role submissions
    const roleSubmissions = [];

    // Use modular subscription data check with enhanced logging
    const hasSubscriptionData = () => {
      const result = checkSubscriptionData(formData, roleSpecificData);
      return result;
    };

    // Only create WMM submission if user has WMM role AND is currently in WMM mode AND update type allows it
    if (
      (updateType === "all" || updateType === "subscriptionOnly") &&
      hasRole("WMM") &&
      selectedRole === "WMM" &&
      hasSubscriptionData()
    ) {
      // Use modular subscription-specific data function
      const getSubscriptionSpecificData = () => {
        return getSubscriptionData(formData.subscriptionType, formData, {
          ...roleSpecificData,
          subsclass: formData.subsclass || roleSpecificData.subsclass || "",
        });
      };

      const subscriptionData = getSubscriptionSpecificData();

      // Map subscription types to their model types
      const modelType = {
        WMM: "WMM",
        Promo: "PROMO",
        Complimentary: "COMP",
      }[formData.subscriptionType];

      // Include recordId if we're editing an existing subscription
      const submission = {
        roleType: modelType,
        roleData: subscriptionData,
      };

      // If we're in edit mode and have a selected subscription, include the recordId
      if (subscriptionMode === "edit" && selectedSubscription) {
        submission.recordId =
          selectedSubscription.id || selectedSubscription._id;
      }

      roleSubmissions.push(submission);
    }

    // Use the appropriate data source based on mode
    const dataSource =
      roleRecordMode === "edit" ? roleSpecificData : newRoleData;

    // Check if we have valid date components for HRG
    const hasHrgDate =
      dataSource.recvdateMonth &&
      dataSource.recvdateDay &&
      dataSource.recvdateYear;

    // Check for other HRG data
    const hasHrgPayment =
      dataSource.paymtref || dataSource.paymtamt || dataSource.paymtform;
    const hasHrgRemarks = dataSource.remarks;
    const hasHrgCampaign =
      dataSource.campaigndateMonth &&
      dataSource.campaigndateDay &&
      dataSource.campaigndateYear;

    // Only create HRG submission if user has HRG role AND is currently in HRG mode AND update type allows it
    if (
      (updateType === "all" || updateType === "roleOnly") &&
      hasRole("HRG") &&
      selectedRole === "HRG" &&
      (hasHrgDate || hasHrgPayment || hasHrgRemarks || hasHrgCampaign)
    ) {
      const formatDate = (month, day, year) => {
        if (month && day && year) {
          // Clean trailing spaces and format as YYYY-MM-DD for database consistency
          const cleanMonth = cleanDateInput(month);
          const cleanDay = cleanDateInput(day);
          const cleanYear = cleanDateInput(year);
          return `${cleanYear}-${cleanMonth}-${cleanDay}`;
        }
        return "";
      };

      const hrgData = {
        recvdate: formatDate(
          dataSource.recvdateMonth,
          dataSource.recvdateDay,
          dataSource.recvdateYear
        ),
        campaigndate: formatDate(
          dataSource.campaigndateMonth,
          dataSource.campaigndateDay,
          dataSource.campaigndateYear
        ),
        paymtref: dataSource.paymtref || "",
        paymtamt: dataSource.paymtamt || 0,
        paymtform: dataSource.paymtform || "",
        unsubscribe: dataSource.unsubscribe || false,
        remarks: dataSource.remarks || "",
      };

      // Include recordId if we're editing an existing HRG record
      const hrgSubmission = {
        roleType: "HRG",
        roleData: hrgData,
      };

      // If we're in edit mode and have a selected HRG record, include the recordId
      if (roleRecordMode === "edit" && selectedHrgRecord) {
        hrgSubmission.recordId = selectedHrgRecord.id || selectedHrgRecord._id;
      }

      roleSubmissions.push(hrgSubmission);
    }

    // Check if we have valid date components for FOM
    const hasFomDate =
      dataSource.recvdateMonth &&
      dataSource.recvdateDay &&
      dataSource.recvdateYear;

    // Check for other FOM data
    const hasFomPayment = dataSource.paymtref || dataSource.paymtamt;
    const hasFomPaymentDate =
      dataSource.paymtdateMonth &&
      dataSource.paymtdateDay &&
      dataSource.paymtdateYear;
    const hasFomRemarks = dataSource.remarks;
    const hasFomForm = dataSource.paymtform;

    // Only create FOM submission if user has FOM role AND is currently in FOM mode AND update type allows it
    if (
      (updateType === "all" || updateType === "roleOnly") &&
      hasRole("FOM") &&
      selectedRole === "FOM" &&
      (hasFomDate ||
        hasFomPayment ||
        hasFomPaymentDate ||
        hasFomRemarks ||
        hasFomForm)
    ) {
      const formatDate = (month, day, year) => {
        if (month && day && year) {
          // Clean trailing spaces and format as YYYY-MM-DD for database consistency
          const cleanMonth = cleanDateInput(month);
          const cleanDay = cleanDateInput(day);
          const cleanYear = cleanDateInput(year);
          return `${cleanYear}-${cleanMonth}-${cleanDay}`;
        }
        return "";
      };

      const fomData = {
        recvdate: formatDate(
          dataSource.recvdateMonth,
          dataSource.recvdateDay,
          dataSource.recvdateYear
        ),
        paymtref: dataSource.paymtref || "",
        paymtamt: dataSource.paymtamt || 0,
        paymtform: dataSource.paymtform || "",
        paymtdate: formatDate(
          dataSource.paymtdateMonth,
          dataSource.paymtdateDay,
          dataSource.paymtdateYear
        ),
        unsubscribe: dataSource.unsubscribe || false,
        remarks: dataSource.remarks || "",
      };

      // Include recordId if we're editing an existing FOM record
      const fomSubmission = {
        roleType: "FOM",
        roleData: fomData,
      };

      // If we're in edit mode and have a selected FOM record, include the recordId
      if (roleRecordMode === "edit" && selectedFomRecord) {
        fomSubmission.recordId = selectedFomRecord.id || selectedFomRecord._id;
      }

      roleSubmissions.push(fomSubmission);
    }

    // Check if we have valid date components for CAL
    const hasCalDate =
      dataSource.recvdateMonth &&
      dataSource.recvdateDay &&
      dataSource.recvdateYear;

    // Check for other CAL data
    const hasCalPayment = dataSource.paymtref || dataSource.paymtamt;
    const hasCalPaymentDate =
      dataSource.paymtdateMonth &&
      dataSource.paymtdateDay &&
      dataSource.paymtdateYear;
    const hasCalRemarks = dataSource.remarks;
    const hasCalType = dataSource.caltype;
    const hasCalQty = dataSource.calqty;
    const hasCalUnit = dataSource.calunit;
    const hasCalAmt = dataSource.calamt;

    // Only create CAL submission if user has CAL role AND is currently in CAL mode AND update type allows it
    if (
      (updateType === "all" || updateType === "roleOnly") &&
      hasRole("CAL") &&
      selectedRole === "CAL" &&
      (hasCalDate ||
        hasCalPayment ||
        hasCalPaymentDate ||
        hasCalRemarks ||
        hasCalType ||
        hasCalQty ||
        hasCalUnit ||
        hasCalAmt)
    ) {
      const formatDate = (month, day, year) => {
        if (month && day && year) {
          // Clean trailing spaces and format as YYYY-MM-DD for database consistency
          const cleanMonth = cleanDateInput(month);
          const cleanDay = cleanDateInput(day);
          const cleanYear = cleanDateInput(year);
          return `${cleanYear}-${cleanMonth}-${cleanDay}`;
        }
        return "";
      };

      const calData = {
        recvdate: formatDate(
          dataSource.recvdateMonth,
          dataSource.recvdateDay,
          dataSource.recvdateYear
        ),
        caltype: dataSource.caltype || "",
        calqty: dataSource.calqty || 0,
        calunit: dataSource.calunit || 0,
        calamt: dataSource.calamt || 0,
        paymtref: dataSource.paymtref || "",
        paymtamt: dataSource.paymtamt || 0,
        paymtform: dataSource.paymtform || "",
        paymtdate: formatDate(
          dataSource.paymtdateMonth,
          dataSource.paymtdateDay,
          dataSource.paymtdateYear
        ),
        remarks: dataSource.remarks || "",
      };

      // Include recordId if we're editing an existing CAL record
      const calSubmission = {
        roleType: "CAL",
        roleData: calData,
      };

      // If we're in edit mode and have a selected CAL record, include the recordId
      if (roleRecordMode === "edit" && selectedCalRecord) {
        calSubmission.recordId = selectedCalRecord.id || selectedCalRecord._id;
      }

      roleSubmissions.push(calSubmission);
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
        ...clientDataWithClears,
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
      const response = await handleSubmissionWithErrorHandling(
        submissionData,
        endpoint,
        method
      );

      if (response.data && response.data.success) {
        // Show success toast with appropriate message
        toast({
          title:
            mode === "edit"
              ? "Client Updated Successfully"
              : "Client Added Successfully",
          description: (
            <div>
              {mode === "edit" && (
                <p>
                  Client ID:{" "}
                  <span className="font-mono bg-gray-100 px-1 rounded">
                    {rowData.id}
                  </span>
                </p>
              )}
              <p>
                Name: {clientData.fname} {clientData.lname}
                {clientData.company}
              </p>
              <p className="text-sm text-green-600 mt-1">
                ✓ All role data saved successfully
              </p>
            </div>
          ),
          duration: 5000,
        });

        // Backend already emits the WebSocket event, so we don't need to emit it again
        if (onEditSuccess) {
          onEditSuccess({
            id: mode === "edit" ? rowData.id : response.data.id,
            ...clientDataWithClears,
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
      } else {
        // Handle case where API returns success: false
        toast({
          title: mode === "edit" ? "Update Failed" : "Add Failed",
          description:
            response.data?.message ||
            (mode === "edit"
              ? "Failed to update client. Please try again."
              : "Failed to add client. Please try again."),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(
        `Error ${mode === "edit" ? "updating" : "adding"} client:`,
        error
      );

      // Enhanced error logging
      console.error("Full error details:", {
        message: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config,
      });

      // Show detailed error toast
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        `Failed to ${
          mode === "edit" ? "update" : "add"
        } client. Please check your connection and try again.`;

      toast({
        title: `Error ${mode === "edit" ? "Updating" : "Adding"} Client`,
        description: (
          <div>
            <p className="font-semibold">{errorMessage}</p>
            {error.response?.status && (
              <p className="text-sm text-gray-600 mt-1">
                Status: {error.response.status}
              </p>
            )}
            {process.env.NODE_ENV === "development" && (
              <div className="text-xs text-gray-500 mt-1">
                {error.response?.data?.details && (
                  <p>Details: {error.response.data.details}</p>
                )}
                <p>Check console for full error details</p>
              </div>
            )}
          </div>
        ),
        variant: "destructive",
        duration: 10000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle new donor added
  const handleDeleteRoleRecord = async (record, roleType) => {
    if (!record || (!record.id && !record._id)) {
      toast({
        title: "Error",
        description: "Invalid record data for deletion.",
        variant: "destructive",
      });
      return;
    }

    // Use the id field (integer) for deletion, fallback to _id if needed
    const recordId = record.id || record._id;

    // Determine the API endpoint based on role type
    let endpoint;
    switch (roleType) {
      case "HRG":
        endpoint = `http://${
          import.meta.env.VITE_IP_ADDRESS
        }:3001/hrg/delete/${recordId}`;
        break;
      case "FOM":
        endpoint = `http://${
          import.meta.env.VITE_IP_ADDRESS
        }:3001/fom/delete/${recordId}`;
        break;
      case "CAL":
        endpoint = `http://${
          import.meta.env.VITE_IP_ADDRESS
        }:3001/cal/delete/${recordId}`;
        break;
      default:
        toast({
          title: "Error",
          description: "Unknown role type.",
          variant: "destructive",
        });
        return;
    }

    try {
      const response = await axios.delete(endpoint);

      if (response.status === 200) {
        // Remove the deleted record from the appropriate records array
        switch (roleType) {
          case "HRG":
            setHrgRecords((prev) =>
              prev.filter((r) => {
                const rId = r.id || r._id;
                return String(rId) !== String(recordId);
              })
            );
            if (
              selectedHrgRecord &&
              (selectedHrgRecord.id === recordId ||
                selectedHrgRecord._id === recordId)
            ) {
              setSelectedHrgRecord(null);
              // Reset role-specific data
              const today = new Date();
              const todayParts = parseDateToComponents(
                formatDateToMMDDYY(today)
              );
              setHrgData({
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
            break;
          case "FOM":
            setFomRecords((prev) =>
              prev.filter((r) => {
                const rId = r.id || r._id;
                return String(rId) !== String(recordId);
              })
            );
            if (
              selectedFomRecord &&
              (selectedFomRecord.id === recordId ||
                selectedFomRecord._id === recordId)
            ) {
              setSelectedFomRecord(null);
              // Reset role-specific data
              const today = new Date();
              const todayParts = parseDateToComponents(
                formatDateToMMDDYY(today)
              );
              setFomData({
                recvdate: formatDateToMMDDYY(today),
                recvdateMonth: todayParts.month,
                recvdateDay: todayParts.day,
                recvdateYear: todayParts.year,
                paymtref: "",
                paymtamt: 0,
                paymtform: "",
                unsubscribe: false,
                remarks: "",
              });
            }
            break;
          case "CAL":
            setCalRecords((prev) =>
              prev.filter((r) => {
                const rId = r.id || r._id;
                return String(rId) !== String(recordId);
              })
            );
            if (
              selectedCalRecord &&
              (selectedCalRecord.id === recordId ||
                selectedCalRecord._id === recordId)
            ) {
              setSelectedCalRecord(null);
              // Reset role-specific data
              const today = new Date();
              const todayParts = parseDateToComponents(
                formatDateToMMDDYY(today)
              );
              setCalData({
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
                remarks: "",
              });
            }
            break;
        }

        toast({
          title: "Record Deleted",
          description: `${roleType} record deleted successfully.`,
          duration: 3000,
        });

        // If no more records available, switch to add mode
        const recordsArray =
          roleType === "HRG"
            ? hrgRecords
            : roleType === "FOM"
            ? fomRecords
            : calRecords;
        if (recordsArray.length <= 1) {
          setRoleRecordMode("add");
        }
      } else {
        toast({
          title: "Delete Failed",
          description: "Failed to delete record.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting record:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message ||
          "An error occurred while deleting the record.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSubscription = async (subscription) => {
    if (!subscription || (!subscription.id && !subscription._id)) {
      toast({
        title: "Error",
        description: "Invalid subscription data for deletion.",
        variant: "destructive",
      });
      return;
    }

    // Use the id field (integer) for deletion, fallback to _id if needed
    const subscriptionId = subscription.id || subscription._id;
    const subscriptionType = formData.subscriptionType;

    // Determine the API endpoint based on subscription type
    let endpoint;
    switch (subscriptionType) {
      case "WMM":
        endpoint = `http://${
          import.meta.env.VITE_IP_ADDRESS
        }:3001/wmm/delete/${subscriptionId}`;
        break;
      case "Promo":
        endpoint = `http://${
          import.meta.env.VITE_IP_ADDRESS
        }:3001/promo/delete/${subscriptionId}`;
        break;
      case "Complimentary":
        endpoint = `http://${
          import.meta.env.VITE_IP_ADDRESS
        }:3001/complimentary/delete/${subscriptionId}`;
        break;
      default:
        toast({
          title: "Error",
          description: "Unknown subscription type.",
          variant: "destructive",
        });
        return;
    }

    try {
      const response = await axios.delete(endpoint);

      if (response.data && response.data.success) {
        // Remove the deleted subscription from the available subscriptions
        setAvailableSubscriptions((prev) =>
          prev.filter((sub) => {
            const subId = sub.id || sub._id;
            return String(subId) !== String(subscriptionId);
          })
        );

        // Clear the selected subscription if it was the deleted one
        if (
          selectedSubscription &&
          (selectedSubscription.id === subscriptionId ||
            selectedSubscription._id === subscriptionId)
        ) {
          setSelectedSubscription({
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

          // Clear form data
          setFormData((prev) => ({
            ...prev,
            subscriptionStart: "",
            subscriptionEnd: "",
            subStartMonth: "",
            subStartDay: "",
            subStartYear: "",
            subEndMonth: "",
            subEndDay: "",
            subEndYear: "",
            subsclass: "",
            referralid: formData.subscriptionType === "Promo" ? "" : "",
          }));

          // Clear role-specific data
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
            referralid: formData.subscriptionType === "Promo" ? "" : "",
          }));
        }

        toast({
          title: "Subscription Deleted",
          description: `${subscriptionType} subscription deleted successfully.`,
          duration: 3000,
        });

        // If no more subscriptions available, switch to add mode
        if (availableSubscriptions.length <= 1) {
          setSubscriptionMode("add");
        }
      } else {
        toast({
          title: "Delete Failed",
          description:
            response.data?.message || "Failed to delete subscription.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting subscription:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message ||
          "An error occurred while deleting the subscription.",
        variant: "destructive",
      });
    }
  };

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
      setCombinedAddress(donorData.address || "");
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
          {/* Form Title */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-black">
              {mode === "edit"
                ? `Edit Client - ID: ${rowData?.id}`
                : "Add New Client"}
            </h2>
          </div>
          {/* Add form content here (fields, sections, etc.) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-4">
            {/* Personal Information */}
            <PersonalInfoModule
              formData={formData}
              handleChange={handleChange}
              months={months}
              types={types}
              groups={groups}
            />

            {/* Address Information */}
            <AddressModule
              addressData={addressData}
              handleAddressChange={handleAddressChange}
              handleAreaChange={handleAreaChange}
              areas={areas}
              formData={formData}
              areaData={areaData}
              combinedAddress={combinedAddress}
              handleCombinedAddressChange={handleCombinedAddressChange}
              handleCombinedAddressFocus={handleCombinedAddressFocus}
              handleCombinedAddressBlur={handleCombinedAddressBlur}
              isEditingCombinedAddress={isEditingCombinedAddress}
            />

            {/* Contact Information */}
            <ContactInfoModule
              formData={formData}
              handleChange={handleChange}
            />

            {/* Group Information */}
            <GroupInfoModule
              formData={formData}
              handleChange={handleChange}
              types={types}
              groups={groups}
            />

            {/* WMM Subscription Information - Only show if user has WMM role */}
            {hasRole("WMM") && (
              <div className="p-4 border rounded-lg shadow-sm col-span-2">
                {/* Subscription Type Selector */}
                <SubscriptionTypeSelector
                  subscriptionType={formData.subscriptionType}
                  setSubscriptionType={handleSubscriptionTypeChange}
                  mode={mode}
                  hasSubscriptionData={hasSubscriptionData}
                  rowData={rowData}
                />

                {formData.subscriptionType === "None" ? (
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
                          {isRecentSubscription() ? "Renew" : "Add New"}
                        </button>
                      </div>

                      {subscriptionMode === "edit" &&
                        availableSubscriptions.length > 0 && (
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Select Subscription:
                            </label>
                            <div className="flex gap-2">
                              <select
                                value={
                                  selectedSubscription
                                    ? selectedSubscription.id ||
                                      selectedSubscription._id
                                    : ""
                                }
                                onChange={(e) => {
                                  const selectedSub =
                                    availableSubscriptions.find((sub) => {
                                      const subId = sub.id || sub._id;
                                      const targetValue = e.target.value;
                                      return (
                                        String(subId) === String(targetValue)
                                      );
                                    });
                                  if (selectedSub) {
                                    selectSubscription(selectedSub);
                                  } else {
                                    console.error(
                                      "No subscription found for value:",
                                      e.target.value
                                    );
                                  }
                                }}
                                className="flex-1 p-2 border rounded-md text-base"
                              >
                                <option value="">Select a subscription</option>
                                {availableSubscriptions.map((sub) => (
                                  <option
                                    key={sub.id || sub._id}
                                    value={sub.id || sub._id}
                                  >
                                    {sub.subsdate
                                      ? formatDateToMonthYear(
                                          parseDate(sub.subsdate)
                                        )
                                      : "Unknown"}{" "}
                                    to{" "}
                                    {sub.enddate
                                      ? formatDateToMonthYear(
                                          parseDate(sub.enddate)
                                        )
                                      : "Unknown"}{" "}
                                    - {sub.subsclass || "No Class"}
                                    {sub.paymtamt && ` (₱${sub.paymtamt})`}
                                  </option>
                                ))}
                              </select>
                              {selectedSubscription && (
                                <Button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteSubscription(
                                      selectedSubscription
                                    )
                                  }
                                  className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                    </div>

                    {/* Common subscription fields */}
                    <CommonSubscriptionFields
                      formData={formData}
                      roleSpecificData={roleSpecificData}
                      handleChange={handleChange}
                      handleRoleSpecificChange={handleRoleSpecificChange}
                      months={months}
                    />

                    {/* Subscription Type Specific Fields */}
                    {formData.subscriptionType === "WMM" && (
                      <WMMModule
                        formData={formData}
                        roleSpecificData={roleSpecificData}
                        handleChange={handleChange}
                        handleRoleSpecificChange={handleRoleSpecificChange}
                        handleNewDonorAdded={handleNewDonorAdded}
                        subclasses={subclasses}
                        months={months}
                        subscriptionType={formData.subscriptionType}
                      />
                    )}

                    {formData.subscriptionType === "Promo" && (
                      <PromoModule
                        formData={formData}
                        handleChange={handleChange}
                      />
                    )}

                    {formData.subscriptionType === "Complimentary" && (
                      <ComplimentaryModule />
                    )}
                  </>
                )}
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
                  <RoleToggleModule
                    hasRole={hasRole}
                    selectedRole={selectedRole}
                    handleRoleToggle={handleRoleToggle}
                  />
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
                          <div className="flex gap-2">
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
                                  (r) =>
                                    String(r.id || r._id) === e.target.value
                                );
                                if (record) {
                                  setSelectedHrgRecord(record);
                                  const recvdateParts = parseDateToComponents(
                                    record.recvdate
                                  );
                                  const campaigndateParts =
                                    parseDateToComponents(record.campaigndate);

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
                              className="flex-1 p-2 border rounded-md text-base"
                            >
                              <option value="">Select HRG record</option>
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
                                    ? ` - ₱${record.paymtamt}`
                                    : ""}
                                  {record.paymtref
                                    ? ` (${record.paymtref})`
                                    : ""}
                                </option>
                              ))}
                            </select>
                            {selectedHrgRecord && (
                              <Button
                                type="button"
                                onClick={() =>
                                  handleDeleteRoleRecord(
                                    selectedHrgRecord,
                                    "HRG"
                                  )
                                }
                                className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {selectedRole === "FOM" && fomRecords.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select FOM Record:
                          </label>
                          <div className="flex gap-2">
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
                                  (r) =>
                                    String(r.id || r._id) === e.target.value
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
                              className="flex-1 p-2 border rounded-md text-base"
                            >
                              <option value="">Select FOM record</option>
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
                                    ? ` - ₱${record.paymtamt}`
                                    : ""}
                                  {record.paymtref
                                    ? ` (${record.paymtref})`
                                    : ""}
                                </option>
                              ))}
                            </select>
                            {selectedFomRecord && (
                              <Button
                                type="button"
                                onClick={() =>
                                  handleDeleteRoleRecord(
                                    selectedFomRecord,
                                    "FOM"
                                  )
                                }
                                className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {selectedRole === "CAL" && calRecords.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select CAL Record:
                          </label>
                          <div className="flex gap-2">
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
                                  (r) =>
                                    String(r.id || r._id) === e.target.value
                                );
                                if (record) {
                                  setSelectedCalRecord(record);
                                  const recvdateParts = parseDateToComponents(
                                    record.recvdate
                                  );
                                  setRoleSpecificData({
                                    ...record,
                                    calunit:
                                      record.calunit ?? record.calamt ?? 0,
                                    recvdateMonth: recvdateParts.month,
                                    recvdateDay: recvdateParts.day,
                                    recvdateYear: recvdateParts.year,
                                  });
                                }
                              }}
                              className="flex-1 p-2 border rounded-md text-base"
                            >
                              <option value="">Select CAL record</option>
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
                                  {record.calqty ? ` (${record.calqty})` : ""}
                                  {` - ₱${getCalTotal(record)}`}
                                </option>
                              ))}
                            </select>
                            {selectedCalRecord && (
                              <Button
                                type="button"
                                onClick={() =>
                                  handleDeleteRoleRecord(
                                    selectedCalRecord,
                                    "CAL"
                                  )
                                }
                                className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </Button>
                            )}
                          </div>
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
                            <option value="">Select WMM record</option>
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
                                  ? ` - ₱${record.paymtamt}`
                                  : ""}
                                {record.subsclass
                                  ? ` (${record.subsclass})`
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
                            <option value="">Select Promo record</option>
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
                                  ? ` - ₱${record.paymtamt}`
                                  : ""}
                                {record.referralid
                                  ? ` (${record.referralid})`
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
                              <option value="">
                                Select Complimentary record
                              </option>
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
                                    ? ` - ₱${record.paymtamt}`
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
                                      handleNewRoleDataChange(
                                        "recvdateMonth",
                                        e.target.value
                                      )
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
                                    handleNewRoleDataChange(
                                      "recvdateDay",
                                      e.target.value
                                    )
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
                                    handleNewRoleDataChange(
                                      "recvdateYear",
                                      e.target.value
                                    )
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
                                      handleNewRoleDataChange(
                                        "campaigndateMonth",
                                        e.target.value
                                      )
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
                                    handleNewRoleDataChange(
                                      "campaigndateDay",
                                      e.target.value
                                    )
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
                                    handleNewRoleDataChange(
                                      "campaigndateYear",
                                      e.target.value
                                    )
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
                        uppercase={true}
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
                        uppercase={true}
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
                        uppercase={true}
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
                                      handleNewRoleDataChange(
                                        "recvdateMonth",
                                        e.target.value
                                      )
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
                                    handleNewRoleDataChange(
                                      "recvdateDay",
                                      e.target.value
                                    )
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
                                    handleNewRoleDataChange(
                                      "recvdateYear",
                                      e.target.value
                                    )
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
                        uppercase={true}
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
                        uppercase={true}
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
                        uppercase={true}
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
                        uppercase={true}
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
                        uppercase={true}
                        className="text-base"
                      />

                      <InputField
                        label="Calendar Unit Price:"
                        id="calunit"
                        name="calunit"
                        value={
                          roleRecordMode === "edit"
                            ? roleSpecificData.calunit || ""
                            : newRoleData.calunit || ""
                        }
                        onChange={
                          roleRecordMode === "edit"
                            ? handleRoleSpecificChange
                            : (e) =>
                                setNewRoleData({
                                  ...newRoleData,
                                  calunit: e.target.value,
                                })
                        }
                        uppercase={true}
                        className="text-base"
                      />

                      <InputField
                        label="Calendar Total Amount:"
                        id="calamt"
                        name="calamt"
                        value={
                          roleRecordMode === "edit"
                            ? getCalTotal(roleSpecificData)
                            : getCalTotal(newRoleData)
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
                        uppercase={true}
                        className="text-base"
                        readOnly={true}
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
                        uppercase={true}
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
                        uppercase={true}
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

                      <div className="mb-2">
                        <label className="block text-black text-base mb-1">
                          Payment Date:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="relative">
                            <select
                              id="paymtdateMonth"
                              name="paymtdateMonth"
                              value={
                                roleRecordMode === "edit"
                                  ? roleSpecificData.paymtdateMonth || ""
                                  : newRoleData.paymtdateMonth || ""
                              }
                              onChange={
                                roleRecordMode === "edit"
                                  ? handleRoleSpecificChange
                                  : (e) =>
                                      setNewRoleData({
                                        ...newRoleData,
                                        paymtdateMonth: e.target.value,
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
                            id="paymtdateDay"
                            name="paymtdateDay"
                            value={
                              roleRecordMode === "edit"
                                ? roleSpecificData.paymtdateDay || ""
                                : newRoleData.paymtdateDay || ""
                            }
                            onChange={
                              roleRecordMode === "edit"
                                ? handleRoleSpecificChange
                                : (e) =>
                                    setNewRoleData({
                                      ...newRoleData,
                                      paymtdateDay: e.target.value,
                                    })
                            }
                            placeholder="DD"
                            className="w-full p-2 text-base border rounded-md border-gray-300"
                            maxLength="2"
                          />
                          <input
                            type="text"
                            id="paymtdateYear"
                            name="paymtdateYear"
                            value={
                              roleRecordMode === "edit"
                                ? roleSpecificData.paymtdateYear || ""
                                : newRoleData.paymtdateYear || ""
                            }
                            onChange={
                              roleRecordMode === "edit"
                                ? handleRoleSpecificChange
                                : (e) =>
                                    setNewRoleData({
                                      ...newRoleData,
                                      paymtdateYear: e.target.value,
                                    })
                            }
                            placeholder="YYYY"
                            className="w-full p-2 text-base border rounded-md border-gray-300"
                            maxLength="4"
                          />
                        </div>
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
              ) : mode === "edit" ? (
                "Save Changes"
              ) : (
                "Add Client"
              )}
            </Button>
          </div>
        </form>
      ) : (
        // When rendered as a standalone component, use a modal
        <Modal
          isOpen={showModal}
          onClose={closeModal}
          title={mode === "edit" ? "Edit Client" : "Add Client"}
        >
          <form onSubmit={handleSubmit}>
            {/* Debug: Add a hidden input to test form submission */}
            <input type="hidden" name="debug" value="form-submitted" />
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
                ) : mode === "edit" ? (
                  "Save Changes"
                ) : (
                  "Add Client"
                )}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirmation Dialog - Rendered outside Modal as overlay */}
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
          subscriptionType={formData.subscriptionType}
          selectedRole={selectedRole}
          hrgData={hrgData}
          fomData={fomData}
          calData={calData}
          isEditMode={mode === "edit"}
          onUpdateTypeChange={handleUpdateTypeChange}
          updateType={updateType}
        />
      )}
    </>
  );
};

export default Edit;
