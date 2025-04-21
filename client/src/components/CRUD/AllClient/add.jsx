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
        setSubclasses(subclassesData);
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
  const closeModal = () => setShowModal(false);

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
    debounce(async (checkData) => {
      // Only check if we have enough data to make a meaningful search
      if (
        !checkData.lname &&
        !checkData.fname &&
        !checkData.bdate &&
        !checkData.address &&
        !checkData.cellno &&
        !checkData.email
      ) {
        setPotentialDuplicates([]);
        setShowDuplicates(false);
        return;
      }

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
      } finally {
        setIsCheckingDuplicates(false);
      }
    }, 800), // Wait 800ms after typing stops before checking
    []
  );

  const handleChange = async (e) => {
    const { name, value } = e.target;

    // Convert the input value to uppercase
    const upperCaseValue = value.toUpperCase();

    if (name === "subscriptionFreq") {
      const today = new Date();
      const monthsToAdd = parseInt(value);
      const startDate = today;

      const subscriptionStart = new Date(
        startDate.getFullYear(),
        startDate.getMonth()
      );
      const subscriptionEnd = calculateEndMonth(subscriptionStart, monthsToAdd);

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
        [name]: upperCaseValue,
      };

      // Check for duplicates if this is a field we want to check
      const fieldsToCheck = [
        "lname",
        "fname",
        "mname",
        "bdate",
        "email",
        "cellno",
        "contactnos",
      ];
      if (fieldsToCheck.includes(name) || name === "address") {
        // Only check if we have at least one identifying field with enough content
        if (
          (newData.lname && newData.lname.length > 1) ||
          (newData.fname && newData.fname.length > 1) ||
          (newData.bdate && newData.bdate.length > 0) ||
          (newData.cellno && newData.cellno.length > 5) ||
          (newData.email && newData.email.includes("@"))
        ) {
          const checkData = {
            lname: newData.lname,
            fname: newData.fname,
            mname: newData.mname,
            bdate: newData.bdate,
            email: newData.email,
            cellno: newData.cellno,
            contactnos: newData.contactnos,
            address: combinedAddress,
          };
          checkForDuplicates(checkData);
        }
      }

      return newData;
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

    // Check for duplicates when address changes
    if (combinedAddress && combinedAddress.length > 5) {
      const checkData = {
        lname: formData.lname,
        fname: formData.fname,
        mname: formData.mname,
        bdate: formData.bdate,
        email: formData.email,
        cellno: formData.cellno,
        contactnos: formData.contactnos,
        address: combinedAddress,
      };
      checkForDuplicates(checkData);
    }
  }, [addressData, combinedAddress, checkForDuplicates, formData]);

  const handleCitySelect = (cityname) => {
    setSelectedCity(cityname);
    handleAddressChange("city", cityname);
  };

  const handleAreaChange = (field, value) => {
    setAreaData((prevData) => ({
      ...prevData,
      [field]: value,
    }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();

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

    console.log("Submission Data:", submissionData);

    try {
      const response = await axios.post(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/clients/add`,
        submissionData
      );
      if (response.data.success) {
        fetchClients();
        closeModal();
        // Reset form data
        resetForm();
        setRoleSpecificData({});
      }
    } catch (error) {
      console.error("Error submitting form:", error);
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
    if (!showDuplicates || potentialDuplicates.length === 0) return null;

    return (
      <div className="border-l border-gray-200 w-72 h-full overflow-hidden bg-white shadow-md flex flex-col">
        <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 py-3 px-4 border-b border-gray-200 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-gray-800 font-medium">
                {potentialDuplicates.length} Possible{" "}
                {potentialDuplicates.length === 1 ? "Match" : "Matches"}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Similar records found in database
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
          className="overflow-y-auto p-2 flex-grow custom-scrollbar"
          style={{ maxHeight: "calc(80vh - 70px)" }}
        >
          <div className="space-y-2">
            {potentialDuplicates.map((client) => (
              <div
                key={client.id}
                className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden hover:border-blue-300 hover:shadow transition-all duration-200"
              >
                <div className="px-3 py-2 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <div className="font-medium text-gray-800">
                    {client.lname}, {client.fname}{" "}
                    {client.mname && client.mname.charAt(0)}.
                  </div>
                </div>

                <div className="px-3 py-2 text-xs">
                  {/* Show debugging info for available fields */}
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
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => handleViewDuplicate(client.id)}
                      className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
                      />
                      <InputField
                        label="First Name:"
                        id="fname"
                        name="fname"
                        value={formData.fname}
                        onChange={handleChange}
                      />
                      <InputField
                        label="Middle Name:"
                        id="mname"
                        name="mname"
                        value={formData.mname}
                        onChange={handleChange}
                      />
                      <InputField
                        label="Last Name:"
                        id="lname"
                        name="lname"
                        value={formData.lname}
                        onChange={handleChange}
                      />
                      <InputField
                        label="Suffix:"
                        id="sname"
                        name="sname"
                        value={formData.sname}
                        onChange={handleChange}
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
                        value={addressData.street1.toUpperCase()}
                        onChange={(e) =>
                          handleAddressChange(
                            "street1",
                            e.target.value.toUpperCase()
                          )
                        }
                      />
                      <InputField
                        label="Address (subdivision/compound name):"
                        id="street2"
                        name="street2"
                        value={addressData.street2.toUpperCase()}
                        onChange={(e) =>
                          handleAddressChange(
                            "street2",
                            e.target.value.toUpperCase()
                          )
                        }
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
                          onChange={(e) => setCombinedAddress(e.target.value)}
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
