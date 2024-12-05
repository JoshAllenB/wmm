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
import { io } from "socket.io-client";
import psgcJson from "../../../utils/psgc.json";

const socket = io("http://localhost:3001");

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
        unsubscribe: false,
      });
    }
  }, [hasRole]);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await axios.get("http://localhost:3001/clients/groups", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        });
        setGroups(response.data);
      } catch (error) {
        console.error("Error fetching groups:", error);
      }
    };
    fetchGroups();
  }, []);

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  const formatDateToMonthYear = (date) => {
    const d = new Date(date);
    const month = d.toLocaleString("en-US", { month: "long" }); // Full month name (e.g., "January")
    const year = d.getFullYear();
    return `${month} ${year}`;
  };

  const calculateEndMonth = (startDate, monthsToAdd) => {
    const start = new Date(startDate);
    let monthsCounted = 0;

    let currentMonth = start.getMonth();
    let currentYear = start.getFullYear();

    while (monthsCounted < monthsToAdd) {
      if (currentMonth === 3) {
        currentMonth = 5;
        monthsCounted++;
      } else {
        currentMonth++;
        if (currentMonth > 11) {
          currentMonth = 0;
          currentYear++;
        }
        monthsCounted++;
      }

      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear += 1;
      }
    }

    if (currentMonth === 0) {
      currentMonth = 11;
      currentYear--;
    } else {
      currentMonth--;
    }

    const endDate = new Date(currentYear, currentMonth + 1, 0);
    return endDate;
  };

  const handleChange = async (e) => {
    const { name, value } = e.target;

    if (name === "subscriptionFreq") {
      const today = new Date();
      const monthsToAdd = parseInt(value);
      let startDate;

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
    console.log("City before replacement:", addressData.city);
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
    console.log("Selected city:", cityname);
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
      ...baseClientData
    } = formData;

    const clientData = {
      ...baseClientData,
      address: combinedAddress,
    };

    // Format the date to "DD MMM YYYY"
    const formatDate = (date) => {
      return new Date(date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    const submissionData = {
      clientData,
      roleType: null,
      roleData: null,
      adddate: formatDate(new Date()),
    };

    if (hasRole("WMM")) {
      submissionData.roleType = "WMM";
      submissionData.roleData = {
        ...roleSpecificData,
        subscriptionFreq,
        subscriptionStart,
        subscriptionEnd,
      };
    } else if (hasRole("HRG")) {
      submissionData.roleType = "HRG";
      submissionData.roleData = roleSpecificData;
    } else if (hasRole("FOM")) {
      submissionData.roleType = "FOM";
      submissionData.roleData = roleSpecificData;
    }

    try {
      const response = await axios.post(
        "http://localhost:3001/clients/add",
        submissionData
      );
      if (response.data.success) {
        fetchClients();
        closeModal();
        // Reset form data if needed
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
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
          {Object.keys(roleConfigs).map(
            (role) =>
              hasRole(role) && (
                <div key={role} className="flex flex-col mb-2 p-2">
                  <h1 className="text-black mb-2 font-bold">
                    Add {role} Client
                  </h1>
                </div>
              )
          )}
          <form onSubmit={handleSubmit}>
            {(hasRole("WMM") || hasRole("Admin")) && (
              <div className="grid grid-cols-2 gap-4 ">
                <div className="flex flex-col mb-2 p-2">
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

                <div className="flex flex-col mb-2 p-2">
                  <h1 className="text-black mb-2 font-bold">Address Info</h1>

                  <InputField
                    label="Address (house/building number street name):"
                    id="street1"
                    name="street1"
                    value={addressData.street1}
                    onChange={(e) =>
                      handleAddressChange("street1", e.target.value)
                    }
                  />

                  <InputField
                    label="Address (subdivision/compound name):"
                    id="stree2"
                    name="street2"
                    value={addressData.street2}
                    onChange={(e) =>
                      handleAddressChange("street2", e.target.value)
                    }
                  />

                  <AddressForm
                    onAddressChange={handleAddressChange}
                    addressData={addressData}
                    selectedCity={selectedCity}
                    psgcJSON={psgcJson}
                  />

                  <AreaForm
                    onAreaChange={handleAreaChange}
                    onCitySelect={handleCitySelect}
                  />

                  <div className="mt-4">
                    <h2 className="text-black font-bold">Address Preview:</h2>
                    <p>{combinedAddress || "No address entered"}</p>
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
                <div className="flex flex-col mb-2 p-2">
                  <h1 className="text-black mb-2 font-bold">Group Info</h1>
                  <InputField
                    label="Type:"
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                  />
                  <label className="block text-sm font-medium leading-6 text-gray-600">
                    Group:
                  </label>
                  <select
                    id="group"
                    name="group"
                    value={formData.group}
                    onChange={handleChange}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-2 ring-gray-300 placeholder:text-gray-300 focus:ring-3 p-3"
                  >
                    <option value="">Select a group</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.name}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                  <InputField
                    label="Remarks:"
                    id="remarks"
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleChange}
                  />
                </div>

                {hasRole("WMM") && (
                  <div className="flex flex-col mb-2">
                    <h1 className="text-black mb-2 font-bold">Subscription</h1>

                    <label htmlFor="subcriptionFreq">
                      Subscription Frequency:
                    </label>
                    <select
                      id="subscriptionFreq"
                      name="subscriptionFreq"
                      value={formData.subscriptionFreq}
                      onChange={handleChange}
                      className="block w-full rounded-md border-0 mb-2 py-1.5 text-gray-900 shadow-sm ring-2 ring-gray-300 placeholder:text-gray-300 focus:ring-3 p-3"
                    >
                      <option value="">Select Subscription Frequency</option>
                      <option value="6">6 Months</option>
                      <option value="12">1 Year</option>
                      <option value="24">2 Years</option>
                    </select>

                    <InputField
                      label="Subscription Start:"
                      id="subscriptionStart"
                      name="subscriptionStart"
                      value={formData.subscriptionStart}
                      onChange={handleChange}
                    />

                    <InputField
                      label="Subscription End:"
                      id="subscriptionEnd"
                      name="subscriptionEnd"
                      value={formData.subscriptionEnd}
                      onChange={handleChange}
                    />

                    <label className="block text-sm font-medium leading-6 text-gray-600">
                      Subscription Year:
                    </label>
                    <input
                      id="subsyear"
                      name="subsyear"
                      value={roleSpecificData.subsyear}
                      onChange={handleRoleSpecificChange}
                      type="number"
                      min="0"
                      className="block w-[80px] rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-2 ring-gray-300 placeholder:text-gray-300 focus:ring-3 p-3"
                    />

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
                )}
              </div>
            )}
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
