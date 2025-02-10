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

  useEffect(() => {
    if (rowData) {
      console.log("Row data available:", rowData);
      setFormData(rowData);
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
      console.log("User role detected:", userRole);

      if (userRole && roleConfigs[userRole]) {
        const initialRoleData = Object.keys(
          roleConfigs[userRole].groupFields
        ).reduce((acc, field) => {
          acc[field] = rowData[field] || ""; // Prefill with existing data
          return acc;
        }, {});
        console.log("Initial role-specific data:", initialRoleData);
        setRoleSpecificData(initialRoleData);
      }

      if (hasRole("WMM")) {
        const wmmData = {
          subsdate: rowData.subsdate || "",
          enddate: rowData.enddate || "",
          renewdate: rowData.renewdate || "",
          subsyear: rowData.subsyear || 0,
          copies: rowData.copies || 1,
          paymtamt: rowData.paymtamt || 0,
          paymtmasses: rowData.paymtmasses || 0,
          calendar: rowData.calendar || false,
          subsclass: rowData.subsclass || "",
          donorid: rowData.donorid || 0,
        };
        console.log("WMM role-specific data:", wmmData);
        setRoleSpecificData(wmmData);
      } else if (hasRole("HRG")) {
        const hrgData = {
          recvdate: rowData.recvdate || "",
          renewdate: rowData.renewdate || "",
          campaigndate: rowData.campaigndate || "",
          paymtref: rowData.paymtref || 0,
          paymtamt: rowData.paymtamt || 0,
          unsubscribe: rowData.unsubscribe || false,
        };
        console.log("HRG role-specific data:", hrgData);
        setRoleSpecificData(hrgData);
      } else if (hasRole("FOM")) {
        const fomData = {
          recvdate: rowData.recvdate || "",
          paymtamt: rowData.paymtamt || 0,
          paymtform: rowData.paymtform || "",
          paymtref: rowData.paymtref || 0,
          unsubscribe: rowData.unsubscribe || false,
        };
        console.log("FOM role-specific data:", fomData);
        setRoleSpecificData(fomData);
      } else if (hasRole("CAL")) {
        const calData = {
          recvdate: rowData.recvdate || "",
          caltype: rowData.caltype || "",
          calqty: rowData.calqty || "",
          calamt: rowData.calamt || "",
          paymtref: rowData.paymtref || 0,
          paymtamt: rowData.paymtamt || 0,
          paymtform: rowData.paymtform || "",
          paymtdate: rowData.paymtdate || "",
        };
        console.log("CAL role-specific data:", calData);
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

  const closeModal = () => {
    setShowModal(false);
    onClose();
  };

  const formatDateToMonthYear = (date) => {
    const d = new Date(date);
    const month = d.toLocaleString("en-US", { month: "long" });
    const year = d.getFullYear();
    return `${month} ${year}`;
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
  };

  const handleAreaChange = (name, value) => {
    setAreaData((prev) => ({ ...prev, [name]: value }));
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
    console.log(`Role toggled to: ${role}`);
    setSelectedRole(role);

    // Reset role-specific data
    let roleData = {};

    // Fetch role-specific data from rowData based on the selected role
    if (role === "HRG" && rowData.hrgData) {
      roleData = {
        recvdate: hrgData.recvdate || "",
        renewdate: hrgData.renewdate || "",
        campaigndate: hrgData.campaigndate || "",
        paymtref: hrgData.paymtref || 0,
        paymtamt: hrgData.paymtamt || 0,
        unsubscribe: hrgData.unsubscribe || false,
      };
    } else if (role === "FOM" && rowData.fomData) {
      const fomData = rowData.fomData[0] || {}; // Assuming fomData is an array
      roleData = {
        recvdate: fomData.recvdate || "",
        paymtamt: fomData.paymtamt || 0,
        paymtform: fomData.paymtform || "",
        paymtref: fomData.paymtref || 0,
        unsubscribe: fomData.unsubscribe || false,
      };
    } else if (role === "CAL" && rowData.calData) {
      roleData = {
        recvdate: calData.recvdate || "",
        caltype: calData.caltype || "",
        calqty: calData.calqty || "",
        calamt: calData.calamt || "",
        paymtref: calData.paymtref || 0,
        paymtamt: calData.paymtamt || 0,
        paymtform: calData.paymtform || "",
        paymtdate: calData.paymtdate || "",
      };
    }

    console.log(`Role-specific data for ${role}:`, roleData);
    setRoleSpecificData(roleData);
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

    const updatedClientData = {
      ...baseClientData,
      address: combinedAddress,
      ...areaData, // Include area data in clientData
    };

    const submissionData = {
      clientData: updatedClientData,
      roleType: selectedRole,
      roleData: roleSpecificData,
    };

    if (
      hasRole("WMM") &&
      !hasRole("HRG") &&
      !hasRole("FOM") &&
      !hasRole("CAL")
    ) {
      submissionData.roleType = "WMM";
      submissionData.roleData = {
        ...roleSpecificData,
        subscriptionFreq,
        subscriptionStart,
        subscriptionEnd,
        subsclass,
      };
    } else {
      switch (selectedRole) {
        case "HRG":
          submissionData.roleData = {
            recvdate: roleSpecificData.recvdate,
            renewdate: roleSpecificData.renewdate,
            campaigndate: roleSpecificData.campaigndate,
            paymtref: roleSpecificData.paymtref,
            paymtamt: roleSpecificData.paymtamt,
            unsubscribe: roleSpecificData.unsubscribe,
          };
          break;
        case "FOM":
          submissionData.roleData = {
            recvdate: roleSpecificData.recvdate,
            paymtamt: roleSpecificData.paymtamt,
            paymtform: roleSpecificData.paymtform,
            paymtref: roleSpecificData.paymtref,
            unsubscribe: roleSpecificData.unsubscribe,
          };
          break;
        case "CAL":
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
          break;
      }
    }

    try {
      const response = await axios.put(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/clients/update/${
          rowData.id
        }`,
        submissionData
      );
      if (response.data.success) {
        onEditSuccess(updatedClientData);
        closeModal();
      }
    } catch (error) {
      console.error("Error updating client:", error);
    }
  };

  return (
    <Modal isOpen={showModal} onClose={closeModal}>
      <h2 className="text-xl font-bold text-black mb-4">
        Edit Client Information ID: {rowData.id}
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <h1 className="text-black mb-2 font-bold">Personal Info</h1>
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

          <div className="flex flex-col p-2">
            <h1 className="text-black mb-2 font-bold">Address Info</h1>
            <InputField
              label="Address 1 (house/building number street name):"
              id="street1"
              name="street1"
              value={addressData.street1}
              onChange={(e) => handleAddressChange("street1", e.target.value)}
            />
            <InputField
              label="Address 2 (subdivision/compound/building name):"
              id="street2"
              name="street2"
              value={addressData.street2}
              onChange={(e) => handleAddressChange("street2", e.target.value)}
            />
            <div className="flex flex-col gap-2">
              <AreaForm
                onAreaChange={handleAreaChange}
                initialAreaData={{
                  acode: rowData.acode || "",
                  zipcode: rowData.zipcode || "",
                }}
              />
            </div>
            <div className="mt-4">
              <h2 className="text-black font-bold">Address Preview:</h2>
              <textarea
                id="combinedAddress"
                name="combinedAddress"
                value={combinedAddress}
                onChange={(e) =>
                  setCombinedAddress(e.target.value.toUpperCase())
                }
                className="w-full h-[160px] p-2 border rounded-md"
              />
            </div>
          </div>

          <div className="flex flex-col mb-2 p-2">
            <h1 className="text-black mb-2 font-bold">Contact Info</h1>
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

          {hasRole("HRG") && hasRole("FOM") && hasRole("CAL") && (
            <div className="flex flex-col mb-4">
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
                      <h1 className="text-black mb-2 font-bold">CAL Add</h1>
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
          )}

          {hasRole("WMM") && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-2">
                <h1 className="text-black mb-2 font-bold">Group Info</h1>
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
                <textarea
                  className="w-full h-[160px] p-2 border rounded-md"
                  label="Remarks:"
                  id="remarks"
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                />
              </div>

              <h1 className="text-black mb-2 font-bold">Subscription</h1>
              <select
                id="subsclass"
                name="subsclass"
                value={roleSpecificData.subsclass}
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
              <InputField
                label="Subscription Start (MM/DD/YY):"
                id="subscriptionStart"
                name="subscriptionStart"
                value={roleSpecificData.subsdate}
                onChange={handleChange}
                placeholder="MM/DD/YY"
                className="w-full p-2 border rounded-md"
              />
              <select
                id="subscriptionFreq"
                name="subscriptionFreq"
                value={roleSpecificData.subscriptionFreq}
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
                value={roleSpecificData.enddate}
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
        <div className="flex gap-1 mt-4">
          <Button
            type="button"
            onClick={closeModal}
            className="text-white bg-red-500 hover:bg-red-800 rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="text-white text-sm bg-green-600 hover:bg-green-800 rounded-xl"
          >
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default Edit;
