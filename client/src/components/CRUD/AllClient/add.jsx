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
  console.log("User object in Add component:", user);

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
    region: "",
    province: "",
    city: "",
    barangay: "",
  });

  const [selectedCity, setSelectedCity] = useState("");
  const [roleSpecificData, setRoleSpecificData] = useState({});
  const [areaData, setAreaData] = useState({});
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    console.log("User roles initialized");
    const userRole = Object.keys(roleConfigs).find((role) => hasRole(role));
    if (userRole && roleConfigs[userRole]) {
      const initialRoleData = Object.keys(
        roleConfigs[userRole].groupFields
      ).reduce((acc, field) => {
        acc[field] = "";
        return acc;
      }, {});
      setRoleSpecificData(initialRoleData);
      console.log("Role-specific data initialized:", initialRoleData);
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

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  const formatDate = (date) => {
    const options = { month: "long", year: "numeric" };
    return new Intl.DateTimeFormat("en-US", options).format(date);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "subscriptionFreq") {
      const today = new Date();
      const monthsToAdd = parseInt(value);

      const subscriptionStart = new Date(today);
      let subscriptionEnd = new Date(today);

      const addMonths = (date, months) => {
        let monthsAdded = 0;
        while (monthsAdded < months) {
          date.setMonth(date.getMonth() + 1);
          if (date.getMonth() !== 3 && date.getMonth() !== 4) {
            monthsAdded++;
          } else if (monthsAdded > 0) {
            monthsAdded++;
          }
        }
        return date;
      };

      subscriptionEnd = addMonths(subscriptionEnd, monthsToAdd);

      if (subscriptionEnd.getMonth() === 3) {
        subscriptionEnd.setMonth(4, 31);
      } else if (subscriptionEnd.getMonth() === 4) {
        subscriptionEnd.setMonth(5, 1);
      }

      setFormData({
        ...formData,
        subscriptionFreq: value,
        subscriptionStart: formatDateToInput(subscriptionStart),
        subscriptionEnd: formatDateToInput(subscriptionEnd),
      });
      setRoleSpecificData((prev) => ({
        ...prev,
        subsdate: formatDateToInput(subscriptionStart),
        enddate: formatDateToInput(subscriptionEnd),
      }));
      return;
    } else if (
      hasRole("WMM") &&
      ["copies", "subscriptionStart", "subscriptionEnd", "subsyear"].includes(
        name
      )
    ) {
      setRoleSpecificData((prev) => ({ ...prev, [name]: value }));
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleAddressChange = (type, value) => {
    setAddressData((prev) => ({ ...prev, [type]: value }));
  };

  const handleCitySelect = (cityname) => {
    setSelectedCity(cityname);
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
      formData.area,
      addressData.barangay,
      addressData.city,
      addressData.province,
      addressData.region,
    ];
    const address = addressComponents.filter(Boolean).join(", ");

    const {
      subscriptionFreq,
      subscriptionStart,
      subscriptionEnd,
      ...baseClientData
    } = formData;

    const clientData = {
      ...baseClientData,
      address,
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
        socket.emit("client-added", submissionData);
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
                    label="Last Name:"
                    id="lname"
                    name="lname"
                    value={formData.lname}
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
                    label="Suffix:"
                    id="sname"
                    name="sname"
                    value={formData.sname}
                    onChange={handleChange}
                  />
                  <InputField
                    label="Title:"
                    id="title"
                    name="title"
                    value={formData.title}
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

                  <AddressForm
                    onAddressChange={handleAddressChange}
                    addressData={addressData}
                    selectedCity={selectedCity}
                  />

                  <AreaForm
                    onAreaChange={handleAreaChange}
                    onCitySelect={handleCitySelect}
                  />

                  <InputField
                    label="Address:"
                    id="street"
                    name="street"
                    value={formData.street}
                    onChange={handleChange}
                  />
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
                  <InputField
                    label="Group:"
                    id="group"
                    name="group"
                    value={formData.group}
                    onChange={handleChange}
                  />
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
                      <option value="3">3 Months</option>
                      <option value="6">6 Months</option>
                      <option value="12">12 Months</option>
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

                    <InputField
                      label="Renew Date:"
                      id="renewdate"
                      name="renewdate"
                      value={roleSpecificData.renewdate}
                      onChange={handleRoleSpecificChange}
                      type="date"
                    />
                    <Button
                      type="button"
                      onClick={handleRenewDateToday}
                      className="text-white bg-blue-500 hover:bg-blue-700 rounded-xl mt-2"
                    >
                      Set Renew Date to Today
                    </Button>

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
