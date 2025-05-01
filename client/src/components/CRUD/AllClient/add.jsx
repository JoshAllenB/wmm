/* eslint-disable no-unused-vars */
import { useUser } from "../../../utils/Hooks/userProvider";
import { roleConfigs } from "../../../utils/roleConfigs";
import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";
import AddressForm from "../../../utils/addressLogic";
import AreaForm from "../../../utils/areaform";
import InputField from "../input";
import psgcJson from "../../../utils/psgc.json";
import { fetchSubclasses, fetchTypes } from "../../Table/Data/utilData";
import { debounce } from "lodash";
import View from "./view";

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
    copies: "1", // Set default value to "1"
    roleType: null,
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
        paymtamt: 0,
        paymtmasses: 0,
        calendar: false,
        subsclass: "",
        donorid: 0,
      });
    } else if (hasRole("HRG")) {
      setRoleSpecificData({
        recvdate: "",
        renewdate: "",
        campaigndate: "",
        paymtref: 0,
        paymtamt: 0,
        unsubscribe: 0,
      });
    } else if (hasRole("FOM")) {
      setRoleSpecificData({
        recvdate: "",
        paymtamt: 0,
        paymtform: "",
        paymtref: 0,
        unsubscribe: false,
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
    });

    // Reset address data
    setAddressData({
      street1: "",
      street2: "",
      province: "",
      city: "",
      municipality: "",
      subMunicipality: "",
      barangay: "",
    });

    // Reset combined address
    setCombinedAddress("");

    // Reset selected city
    setSelectedCity("");

    // Reset area data
    setAreaData({});

    // Reset role specific data based on user role
    if (hasRole("WMM")) {
      setRoleSpecificData({
        subsdate: "",
        enddate: "",
        renewdate: "",
        subsyear: 0,
        copies: 1,
        paymtamt: 0,
        paymtmasses: 0,
        calendar: false,
        subsclass: "",
        donorid: 0,
      });
    } else if (hasRole("HRG")) {
      setRoleSpecificData({
        recvdate: "",
        renewdate: "",
        campaigndate: "",
        paymtref: 0,
        paymtamt: 0,
        unsubscribe: 0,
      });
    } else if (hasRole("FOM")) {
      setRoleSpecificData({
        recvdate: "",
        paymtamt: 0,
        paymtform: "",
        paymtref: 0,
        unsubscribe: false,
      });
    } else {
      setRoleSpecificData({});
    }

    // Reset potential duplicates
    setPotentialDuplicates([]);
    setShowDuplicates(false);
    setSelectedDuplicate(null);
    setViewingDuplicate(false);
    setIsCheckingDuplicates(false);

    // Reset renewal type
    setRenewalType("current");
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
    const endDate = new Date(start.setMonth(start.getMonth() + monthsToAdd));

    // Adjust the end date to the last day of the calculated month
    endDate.setDate(0);
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
        return;
      }

      // Instead of optimizing the query to focus on specific fields,
      // we'll send all available data to get comprehensive matching results
      try {
        setIsCheckingDuplicates(true);
        const response = await axios.post(
          `http://${
            import.meta.env.VITE_IP_ADDRESS
          }:3001/clients/check-duplicates`,
          checkData,
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
    []
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
      "email",
      "cellno",
      "contactnos",
      "company",
    ];
    if (duplicateRelatedFields.includes(name)) {
      immediatelyClearDuplicates();
      setIsCheckingDuplicates(true); // Show loading state immediately
    }

    if (name === "subscriptionFreq") {
      const today = new Date();
      const monthsToAdd = parseInt(value);
      const startDate = today;

      const subscriptionStart = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        1
      );
      const rawEndDate = calculateEndMonth(subscriptionStart, monthsToAdd);
      const subscriptionEnd = new Date(rawEndDate.getFullYear(), rawEndDate.getMonth(), 1);
      // Update `formData` and `roleSpecificData` states for dates
      setFormData({
        ...formData,
        subscriptionFreq: value,
        subscriptionStart: formatDateToMonthYear(subscriptionStart),
        subscriptionEnd: formatDateToMonthYear(subscriptionEnd),
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
      }));
      return;
    }

    setFormData((prevData) => {
      const newData = {
        ...prevData,
        [name]: value,
      };

      // Check for duplicates if this is a field we want to check
      const fieldsToCheck = [
        "fname",
        "lname",
        "bdate",
        "email",
        "cellno",
        "contactnos",
        "company",
      ];
      if (fieldsToCheck.includes(name) || name === "address") {
        // Only check if we have at least one identifying field with enough content
        if (
          (newData.fname && newData.fname.length > 1) ||
          (newData.lname && newData.lname.length > 1) ||
          (newData.bdate && newData.bdate.length > 0) ||
          (newData.company && newData.company.length > 2) ||
          (newData.cellno && newData.cellno.length > 5) ||
          (newData.email && newData.email.includes("@")) ||
          (combinedAddress && combinedAddress.length > 3) ||
          (areaData.acode && areaData.acode.length > 0)
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
        }
      }

      return newData;
    });
  };

  const handleAddressChange = (type, value) => {
    // If changing any address field, immediately clear duplicates and show loading state
    if (potentialDuplicates.length > 0) {
      immediatelyClearDuplicates();
    }
    setIsCheckingDuplicates(true);

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

    // Check for duplicates when address changes
    if (
      addressData.street1 ||
      addressData.street2 ||
      addressData.city ||
      addressData.barangay
    ) {
      const checkData = {
        fname: formData.fname,
        lname: formData.lname,
        bdate: formData.bdate,
        company: formData.company,
        email: formData.email,
        cellno: formData.cellno,
        contactnos: formData.contactnos,
        address: combinedAddress,
        acode: areaData.acode || "",
      };
      checkForDuplicates(checkData, "address");
    }
  }, [addressData, formData, areaData.acode, checkForDuplicates]);

  const handleCitySelect = (cityname) => {
    setSelectedCity(cityname);
    handleAddressChange("city", cityname);
  };

  const handleAreaChange = (field, value) => {
    setAreaData((prevData) => {
      const newAreaData = {
        ...prevData,
        [field]: value,
      };

      // If acode changes, we should check for duplicates
      if (field === "acode" && value) {
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
      }

      return newAreaData;
    });
  };

  const handleRoleSpecificChange = (e) => {
    const { name, value, type, checked } = e.target;
    setRoleSpecificData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value.toUpperCase(),
    }));
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
      data.paymtdate
    );
  };

  const HRGFields = (data) => {
    return (
      data.recvdate ||
      data.renewdate ||
      data.campaigndate ||
      data.paymtref ||
      data.paymtamt ||
      data.unsubscribe
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowConfirmation(true);
  };

  const handleConfirmedSubmit = async () => {
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

    const clientData = {
      ...baseClientData,
      address: combinedAddress,
      ...areaData, // Include area data in clientData
    };

    // Format the date to "DD MMM YYYY"
    const formatDate = (date) => {
      return new Date(date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    let submissionRole = "";
    let roleData = {};

    // First check if the user has WMM role - prioritize this
    if (hasRole("WMM")) {
      submissionRole = "WMM";
      roleData = {
        ...roleSpecificData,
        subscriptionFreq,
        subscriptionStart,
        subscriptionEnd,
        subsclass,
      };
    }
    // If not WMM, check for other roles
    else if (hasRole("HRG") && hasRole("FOM") && hasRole("CAL")) {
      // Use the selected role or determine based on filled fields
      if (selectedRole === "FOM" || FOMFields(roleSpecificData)) {
        submissionRole = "FOM";
        roleData = {
          recvdate: roleSpecificData.recvdate,
          paymtamt: roleSpecificData.paymtamt,
          paymtform: roleSpecificData.paymtform,
          paymtref: roleSpecificData.paymtref,
          unsubscribe: roleSpecificData.unsubscribe,
          remarks: roleSpecificData.remarks,
        };
      } else if (selectedRole === "CAL" || CALFields(roleSpecificData)) {
        submissionRole = "CAL";
        roleData = {
          recvdate: roleSpecificData.recvdate,
          caltype: roleSpecificData.caltype,
          calqty: roleSpecificData.calqty,
          calamt: roleSpecificData.calamt,
          paymtref: roleSpecificData.paymtref,
          paymtamt: roleSpecificData.paymtamt,
          paymtform: roleSpecificData.paymtform,
          paymtdate: roleSpecificData.paymtdate,
        };
      } else {
        submissionRole = "HRG";
        roleData = {
          recvdate: roleSpecificData.recvdate,
          renewdate: roleSpecificData.renewdate,
          campaigndate: roleSpecificData.campaigndate,
          paymtref: roleSpecificData.paymtref,
          paymtamt: roleSpecificData.paymtamt,
          unsubscribe: roleSpecificData.unsubscribe,
        };
      }
    } else if (hasRole("HRG")) {
      submissionRole = "HRG";
      roleData = {
        recvdate: roleSpecificData.recvdate,
        renewdate: roleSpecificData.renewdate,
        campaigndate: roleSpecificData.campaigndate,
        paymtref: roleSpecificData.paymtref,
        paymtamt: roleSpecificData.paymtamt,
        unsubscribe: roleSpecificData.unsubscribe,
      };
    } else if (hasRole("FOM")) {
      submissionRole = "FOM";
      roleData = {
        recvdate: roleSpecificData.recvdate,
        paymtamt: roleSpecificData.paymtamt,
        paymtform: roleSpecificData.paymtform,
        paymtref: roleSpecificData.paymtref,
        unsubscribe: roleSpecificData.unsubscribe,
        remarks: roleSpecificData.remarks,
      };
    } else if (hasRole("CAL")) {
      submissionRole = "CAL";
      roleData = {
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

    if (!submissionRole) {
      console.error("No valid role determined for submission");
      return;
    }

    const submissionData = {
      clientData,
      roleType: submissionRole,
      roleData,
      adddate: formatDate(new Date()),
    };


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
    setSelectedRole(role);
    setRoleSpecificData({});
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
        setSelectedDuplicate(response.data);
        setViewingDuplicate(true);
      }
    } catch (error) {
      console.error("Error fetching client details:", error);
    }
  };

  // Handle duplicate edit success
  const handleDuplicateEditSuccess = (updatedData) => {
    setSelectedDuplicate(updatedData);
    fetchClients(); // Refresh client list
  };

  // Handle closing the duplicate view
  const handleCloseDuplicateView = () => {
    setViewingDuplicate(false);
    setSelectedDuplicate(null);
  };

  // Side panel for displaying potential duplicates
  const DuplicatePanel = () => {
    if (!showDuplicates && !isCheckingDuplicates) return null;

    return (
      <div className="border-l border-gray-200 w-80 h-full overflow-hidden bg-white shadow-md flex flex-col">
        <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 py-3 px-4 border-b border-gray-200 z-10">
          <div className="flex items-center justify-between">
            <div>
              {isCheckingDuplicates ? (
                <h3 className="text-gray-800 font-medium flex items-center">
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
                <h3 className="text-gray-800 font-medium">
                  {potentialDuplicates.length} Possible{" "}
                  {potentialDuplicates.length === 1 ? "Match" : "Matches"}
                </h3>
              )}
              <p className="text-xs text-gray-500 mt-0.5">
                {isCheckingDuplicates
                  ? "Searching for possible duplicates..."
                  : "Similar records found in database"}
              </p>
            </div>
            {potentialDuplicates.length > 0 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-800">
                {potentialDuplicates.length}
              </span>
            )}
          </div>
        </div>

        <div
          className="overflow-y-auto p-3 flex-grow custom-scrollbar"
          style={{ maxHeight: "calc(80vh - 70px)" }}
        >
          {isCheckingDuplicates && potentialDuplicates.length === 0 ? (
            <div className="flex justify-center items-center h-32 text-gray-400">
              <p>Searching for matching records...</p>
            </div>
          ) : potentialDuplicates.length === 0 ? (
            <div className="flex justify-center items-center h-32 text-gray-400">
              <p>No matching records found</p>
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
                        {client.lname || client.fname || client.mname ? 
                          `${client.lname || ""}, ${client.fname || ""} ${client.mname ? client.mname.charAt(0) + "." : ""}`
                          : client.company ? client.company : "No Name"
                        }
                      </div>

                      {/* Match strength indicator */}
                      {client.totalScore !== undefined && (
                        <div className="mt-0.5">
                          <div
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-sm inline-block ${
                              client.totalScore > 15
                                ? "bg-red-50 text-red-600 border border-red-100"
                                : client.totalScore > 10
                                ? "bg-amber-50 text-amber-600 border border-amber-100"
                                : "bg-blue-50 text-blue-600 border border-blue-100"
                            }`}
                          >
                            {client.totalScore > 15
                              ? "Strong match"
                              : client.totalScore > 10
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
                      client.addressMatch > 0 ||
                      client.cellnoMatch > 0 ||
                      client.contactnosMatch > 0 ||
                      client.emailMatch > 0 ||
                      client.bdateMatch > 0 ||
                      client.companyMatch > 0 ||
                      client.acodeMatch > 0) && (
                      <div className="flex flex-wrap gap-1.5 mb-2.5">
                        {client.fnameMatch > 0 && (
                          <span className="bg-green-50 text-green-600 text-[10px] font-medium rounded-sm px-1.5 py-0.5 border border-green-100">
                            First Name
                          </span>
                        )}
                        {client.lnameMatch > 0 && (
                          <span className="bg-red-50 text-red-600 text-[10px] font-medium rounded-sm px-1.5 py-0.5 border border-red-100">
                            Last name
                          </span>
                        )}
                        {client.addressMatch > 0 && (
                          <span className="bg-amber-50 text-amber-600 text-[10px] font-medium rounded-sm px-1.5 py-0.5 border border-amber-100">
                            Address
                          </span>
                        )}
                        {(client.cellnoMatch > 0 ||
                          client.contactnosMatch > 0) && (
                          <span className="bg-green-50 text-green-600 text-[10px] font-medium rounded-sm px-1.5 py-0.5 border border-green-100">
                            Phone
                          </span>
                        )}
                        {client.emailMatch > 0 && (
                          <span className="bg-blue-50 text-blue-600 text-[10px] font-medium rounded-sm px-1.5 py-0.5 border border-blue-100">
                            Email
                          </span>
                        )}
                        {client.bdateMatch > 0 && (
                          <span className="bg-purple-50 text-purple-600 text-[10px] font-medium rounded-sm px-1.5 py-0.5 border border-purple-100">
                            Birthdate
                          </span>
                        )}
                        {client.companyMatch > 0 && (
                          <span className="bg-indigo-50 text-indigo-600 text-[10px] font-medium rounded-sm px-1.5 py-0.5 border border-indigo-100">
                            Company
                          </span>
                        )}
                        {client.acodeMatch > 0 && (
                          <span className="bg-gray-50 text-gray-600 text-[10px] font-medium rounded-sm px-1.5 py-0.5 border border-gray-100">
                            Area
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
                              className={`${bgColor} ${textColor} text-[10px] font-medium rounded-sm px-1.5 py-0.5 border ${borderColor} flex items-center`}
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
                      <div className="text-xs text-gray-400 italic mb-1.5">
                        Only address available
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-1.5">
                      {client.bdate && (
                        <div className="flex items-center text-gray-600">
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
                        <div className="flex items-center text-gray-600">
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
                        <div className="flex items-center text-gray-600">
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
                        <div className="flex items-center text-gray-600">
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
                        <div className="flex items-center text-gray-600">
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
                        <div className="flex items-center text-gray-600">
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
                        className="px-2.5 py-1 bg-blue-500 text-white rounded-md text-xs hover:bg-blue-600 transition-colors shadow-sm"
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

        {/* Fix the style jsx warning by using a regular style tag */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f1f1;
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

  // Function to trigger duplicate check using all available form data
  const checkAllFieldsForDuplicates = () => {
    // Only proceed if we have at least some data to search with
    const hasData =
      formData.fname ||
      formData.lname ||
      formData.bdate ||
      formData.company ||
      combinedAddress ||
      formData.cellno ||
      formData.email ||
      formData.contactnos ||
      areaData.acode;

    if (hasData) {
      const checkData = {
        fname: formData.fname || "",
        lname: formData.lname || "",
        bdate: formData.bdate || "",
        company: formData.company || "",
        email: formData.email || "",
        cellno: formData.cellno || "",
        contactnos: formData.contactnos || "",
        address: combinedAddress || "",
        acode: areaData.acode || "",
      };

      // Set checking state first for better UX
      setIsCheckingDuplicates(true);
      checkForDuplicates(checkData);
    }
  };

  // Call this function whenever important form data changes
  useEffect(() => {
    checkAllFieldsForDuplicates();
  }, [
    formData.fname,
    formData.lname,
    formData.bdate,
    formData.company,
    formData.cellno,
    formData.email,
    formData.contactnos,
    combinedAddress,
    areaData.acode,
    checkForDuplicates,
  ]);

  // Confirmation Dialog Component
  const ConfirmationDialog = () => {
    if (!showConfirmation) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
          <h3 className="text-xl font-semibold mb-4">Confirm Submission</h3>
          <p className="mb-6">Are you sure you want to add this client? This action cannot be undone.</p>
          <div className="flex justify-end space-x-3">
            <Button 
              type="button" 
              onClick={() => setShowConfirmation(false)}
              className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleConfirmedSubmit}
              className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-md"
            >
              Confirm
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
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
          className="bg-gray-400 rounded-md bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border border-gray-100"
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
            <div className="flex">
              <form
                onSubmit={handleSubmit}
                className="max-h-[80vh] overflow-y-auto flex-1"
              >
                <div className="mb-6 border-b pb-4">
                  <h1 className="text-black text-3xl font-bold">Add Client</h1>
                  <p className="text-gray-500 text-sm">
                    Fill in the details to add a new client
                  </p>
                </div>

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
                        label="Address (house/building number street name):"
                        id="street1"
                        name="street1"
                        value={addressData.street1}
                        onChange={(e) =>
                          handleAddressChange(
                            "street1",
                            e.target.value
                          )
                        }
                        uppercase={true}
                      />
                      <InputField
                        label="Address (subdivision/compound name):"
                        id="street2"
                        name="street2"
                        value={addressData.street2}
                        onChange={(e) =>
                          handleAddressChange(
                            "street2",
                            e.target.value
                          )
                        }
                        uppercase={true}
                      />
                      <AddressForm
                        onAddressChange={handleAddressChange}
                        addressData={addressData}
                        selectedCity={selectedCity}
                        psgcJSON={psgcJson}
                      />
                      <AreaForm onAreaChange={handleAreaChange} />
                      <div className="mt-4">
                        <h2 className="text-black font-bold">
                          Address Preview:
                        </h2>
                        <textarea
                          label="Combined Address:"
                          id="combinedAddress"
                          name="combinedAddress"
                          value={combinedAddress}
                          onChange={(e) => setCombinedAddress(e.target.value.toUpperCase())}
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
                                <h1 className="text-black mb-2 font-bold">
                                  HRG Add
                                </h1>
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
                                <h1 className="text-black mb-2 font-bold">
                                  FOM Add
                                </h1>
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
                                <InputField
                                  label="Remarks:"
                                  id="remarks"
                                  name="remarks"
                                  value={formData.remarks}
                                  onChange={handleChange}
                                />
                              </div>
                            )}
                            {selectedRole === "CAL" && (
                              <div>
                                <h1 className="text-black mb-2 font-bold">
                                  CAL Add
                                </h1>
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
                        <p className="text-gray-500 text-sm">
                          Provide any additional information or notes about the
                          client here.
                        </p>
                        <textarea
                          className="w-full h-[160px] p-2 border rounded-md"
                          label="Remarks:"
                          id="remarks"
                          name="remarks"
                          value={formData.remarks}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  )}

                  {hasRole("WMM") && (
                    <div className="p-4 border rounded-lg shadow-sm">
                      <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                        Subscription
                      </h2>
                      <InputField
                        label="Subscription Start (MM/DD/YY):"
                        id="subscriptionStart"
                        name="subscriptionStart"
                        value={formData.subscriptionStart}
                        onChange={handleChange}
                        placeholder="MM/DD/YY"
                        className="w-full p-2 border rounded-md"
                      />
                      <select
                        id="subscriptionFreq"
                        name="subscriptionFreq"
                        value={formData.subscriptionFreq}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="">Select Subscription Frequency</option>
                        <option value="5">6 Months</option>
                        <option value="12">1 Year</option>
                        <option value="23">2 Years</option>
                        <option value="others">Others</option>
                      </select>

                      <InputField
                        label="Subscription End (MM/DD/YY):"
                        id="subscriptionEnd"
                        name="subscriptionEnd"
                        value={formData.subscriptionEnd}
                        onChange={handleChange}
                        placeholder="MM/DD/YY"
                        className="w-full p-2 border rounded-md"
                      />

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
                            className="block w-[80px] rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-2 ring-gray-300 placeholder:text-gray-300 focus:ring-3 p-3"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                      <select
                          id="subsclass"
                          name="subsclass"
                          value={formData.subsclass}
                          onChange={handleChange}
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
                      <div className="mt-4">
                        <InputField
                          label="Payment Reference:"
                          id="paymtref"
                          name="paymtref"
                          value={roleSpecificData.paymtref}
                          onChange={handleRoleSpecificChange}
                          className="w-full p-2 border rounded-md"
                        />

                        <InputField
                          label="Payment Amount:"
                          id="paymtamt"
                          name="paymtamt"
                          value={roleSpecificData.paymtamt}
                          onChange={handleRoleSpecificChange}
                          className="w-full p-2 border rounded-md"
                        />
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
                    className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-md"
                  >
                    Submit
                  </Button>
                </div>
              </form>

              {/* Duplicate panel on the right side */}
              <DuplicatePanel />
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

export default Add;
