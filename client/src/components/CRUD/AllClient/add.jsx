/* eslint-disable no-unused-vars */
import { useUser } from "../../../utils/Hooks/userProvider";
import { roleConfigs } from "../../../utils/roleConfigs";
import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";
import AddressForm from "../../../utils/addressLogic";
import AreaForm from "../../../utils/areaform";
import InputField from "../input";
import psgcJson from "../../../utils/psgc.json";
import { fetchSubclasses, fetchTypes } from "../../Table/Data/utilData";

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

    setFormData({
      ...formData,
      [name]: upperCaseValue,
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
    console.log(`Role toggled to: ${role}`);
    setSelectedRole(role);
    setRoleSpecificData({});
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
          <form
            onSubmit={handleSubmit}
            className="max-h-[80vh] overflow-y-auto"
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
                    <h2 className="text-black font-bold">Address Preview:</h2>
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
        </Modal>
      )}
    </div>
  );
};

export default Add;
