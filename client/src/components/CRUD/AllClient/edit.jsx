import { useUser } from "../../../utils/Hooks/userProvider";
import { roleConfigs } from "../../../utils/roleConfigs";
import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";
import AddressForm from "../../../utils/addressLogic";
import AreaForm from "../../../utils/areaform";
import InputField from "../input";
import Delete from "./delete";
import Mailing from "../../mailing";

// Utility function to format date to "yyyy-MM-dd"
const formatDateToInput = (date) => {
  const d = new Date(date);
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
};

const formatDateToMonthYear = (date) => {
  const d = new Date(date);
  const month = d.toLocaleString("en-US", { month: "long" });
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
  });
  const [addressData, setAddressData] = useState({
    street1: "",
    street2: "",
    region: "",
    province: "",
    city: "",
    barangay: "",
  });
  const [selectedCity, setSelectedCity] = useState("");
  const [roleSpecificData, setRoleSpecificData] = useState({});
  const [areaData, setAreaData] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [renewalType, setRenewalType] = useState("current");
  const [lastSubscriptionEnd, setLastSubscriptionEnd] = useState(null);
  const [subscriptionFreq, setSubscriptionFreq] = useState("");
  const [combinedAddress, setCombinedAddress] = useState("");

  useEffect(() => {
    if (rowData) {
      setFormData(rowData);
      setShowModal(true);

      const addressParts = rowData.address ? rowData.address.split(", ") : [];
      setAddressData({
        region: addressParts[4] || "",
        province: addressParts[3] || "",
        city: addressParts[2] || "",
        barangay: addressParts[1] || "",
      });
      setSelectedCity(addressParts[2] || "");

      if (hasRole("WMM")) {
        setRoleSpecificData({
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
        });

        const fetchLastSubscription = async () => {
          try {
            console.log("Fetching last subscription for client:", rowData.id);
            const response = await axios.get(
              `http://localhost:3001/clients/${rowData.id}/latest-subscription`
            );
            console.log("Last subscription data:", response.data);

            if (response.data) {
              setLastSubscriptionEnd(new Date(response.data.subscriptionEnd));
            }
          } catch (error) {
            console.error("Error fetching last subscription:", error);
          }
        };
        fetchLastSubscription();
      } else if (hasRole("HRG")) {
        setRoleSpecificData({
          recvdate: rowData.recvdate || "",
          renewdate: rowData.renewdate || "",
          campaigndate: rowData.campaigndate || "",
          paymtref: rowData.paymtref || 0,
          paymtamt: rowData.paymtamt || 0,
          unsubscribe: rowData.unsubscribe || 0,
        });
      } else if (hasRole("FOM")) {
        setRoleSpecificData({
          recvdate: rowData.recvdate || "",
          paymtamt: rowData.paymtamt || 0,
          unsubscribe: rowData.unsubscribe || false,
        });
      }
    }
  }, [rowData, hasRole]);

  const closeModal = () => {
    setShowModal(false);
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(`Handle change - ${name}: ${value}`);

    if (name === "renewalType") {
      console.log("Renewal type changed:", value);
      setRenewalType(value);
      setSubscriptionFreq("");
      setRoleSpecificData((prev) => ({
        ...prev,
        subsdate:
          value === "retro" ? formatDateToMonthYear(lastSubscriptionEnd) : "", // Set subsdate based on enddate

        enddate: "",
        renewdate:
          value === "retro"
            ? formatDateToInput(new Date()) + " (Retroactive)"
            : "", // Set renewdate to today with a retroactive tag
      }));
      return;
    }

    if (name === "subscriptionFreq") {
      console.log("Setting subscription frequency:", value);
      setSubscriptionFreq(value);
      const monthsToAdd = parseInt(value);
      let startDate;

      if (renewalType === "retro" && lastSubscriptionEnd) {
        console.log("Using retroactive start date:", lastSubscriptionEnd);
        startDate = new Date(lastSubscriptionEnd);
      } else {
        console.log("Using current date as start");
        startDate = new Date();
      }

      const subscriptionStart = new Date(
        startDate.getFullYear(),
        startDate.getMonth()
      );
      const subscriptionEnd = calculateEndMonth(subscriptionStart, monthsToAdd);

      console.log("Calculated dates:", {
        start: subscriptionStart,
        end: subscriptionEnd,
      });

      setRoleSpecificData((prev) => ({
        ...prev,
        subsdate:
          renewalType === "retro"
            ? formatDateToMonthYear(lastSubscriptionEnd)
            : formatDateToMonthYear(subscriptionStart), // Format to month and year
        enddate: formatDateToMonthYear(subscriptionEnd), // Format to month and year
      }));
      return;
    }

    if (name in formData) {
      setFormData((prev) => ({ ...prev, [name]: value }));
    } else {
      setRoleSpecificData((prev) => ({ ...prev, [name]: value }));
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const updateCombinedAddress = (addressData) => {
    const addressComponents = [
      addressData.street1,
      addressData.street2,
      addressData.barangay,
      addressData.city,
      addressData.province,
      addressData.region,
    ];
    const address = addressComponents.filter(Boolean).join(", ");
    setCombinedAddress(address);
  };

  useEffect(() => {
    updateCombinedAddress(addressData);
  }, [addressData]);

  const handleAddressChange = (type, value) => {
    setAddressData((prev) => ({ ...prev, [type]: value }));
  };

  const handleCitySelect = (cityname) => {
    setSelectedCity(cityname);
  };

  const handleAreaChange = (field, value) => {
    setAreaData((prev) => ({ ...prev, [field]: value }));
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
      addressData.city,
      addressData.province,
      addressData.region,
    ];

    const updatedClientData = {
      ...formData,
      address: combinedAddress,
      ...roleSpecificData,
    };

    try {
      const response = await axios.put(
        `http://localhost:3001/clients/${rowData.id}`,
        updatedClientData
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
        Edit Client Information
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
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
              type="date"
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
              label="Address 1 (house/building number street name):"
              id="street1"
              name="street1"
              value={addressData.street1}
              onChange={(e) => handleAddressChange("street1", e.target.value)}
            />

            <InputField
              label="Address 2 (subdivision/compound/building name):"
              id="stree2"
              name="street2"
              value={addressData.street2}
              onChange={(e) => handleAddressChange("street2", e.target.value)}
            />
            <AddressForm
              onAddressChange={handleAddressChange}
              addressData={addressData}
              selectedCity={selectedCity}
            />
            <AreaForm
              onAreaChange={handleAreaChange}
              onCitySelect={handleCitySelect}
            />

            <div className="mt-4 w-[500px]">
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
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Renewal Type:
                </label>
                <select
                  name="renewalType"
                  value={renewalType}
                  onChange={handleChange}
                  className="block w-full rounded-md border-0 mb-2 py-1.5 text-gray-900 shadow-sm ring-2 ring-gray-300 place placeholded:text-gray-300 focus:ring-3 p-3"
                >
                  <option value="current">Current Date</option>
                  <option value="retro">
                    Retroactive (From last subscription)
                  </option>
                </select>
              </div>
              <label htmlFor="subcriptionFreq">Subscription Frequency:</label>
              <select
                id="subscriptionFreq"
                name="subscriptionFreq"
                value={formData.subscriptionFreq}
                onChange={handleChange}
                className="block w-full rounded-md border-0 mb-2 py-1.5 text-gray-900 shadow-sm ring-2 ring-gray-300 placeholder:text-gray-300 focus:ring-3 p-3"
              >
                <option value="">Select Subscription Frequency</option>
                <option value="6">6 Months</option>
                <option value="11">1 Year</option>
                <option value="21">2 Years</option>
              </select>
              <InputField
                label="Subscription Start:"
                id="subsdate"
                name="subsdate"
                value={roleSpecificData.subsdate}
                onChange={handleRoleSpecificChange}
              />
              <InputField
                label="Subscription End:"
                id="enddate"
                name="enddate"
                value={roleSpecificData.enddate}
                onChange={handleRoleSpecificChange}
              />
              <InputField
                label="Renew Date:"
                id="renewdate"
                name="renewdate"
                value={roleSpecificData.renewdate}
                onChange={handleRoleSpecificChange}
              />
              <Button
                type="button"
                onClick={handleRenewDateToday}
                className="text-white bg-blue-500 hover:bg-blue-700 rounded-xl mt-2"
              >
                Set renew date to today
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
              <InputField
                label="Payment Amount:"
                id="paymtamt"
                name="paymtamt"
                value={roleSpecificData.paymtamt}
                onChange={handleRoleSpecificChange}
                type="number"
              />
              <InputField
                label="Payment Masses:"
                id="paymtmasses"
                name="paymtmasses"
                value={roleSpecificData.paymtmasses}
                onChange={handleRoleSpecificChange}
                type="number"
              />
              <InputField
                label="Subscription Class:"
                id="subsclass"
                name="subsclass"
                value={roleSpecificData.subsclass}
                onChange={handleRoleSpecificChange}
              />
              <InputField
                label="Donor ID:"
                id="donorid"
                name="donorid"
                value={roleSpecificData.donorid}
                onChange={handleRoleSpecificChange}
                type="number"
              />
            </div>
          )}
        </div>
        <div className="flex justify-between mt-4">
          <div className="flex gap-1">
            <Button
              type="submit"
              className="text-sm text-white bg-green-600 hover:bg-green-800"
            >
              Save
            </Button>
            <Button
              onClick={closeModal}
              className="text-white bg-red-500 hover:bg-red-800"
            >
              Cancel
            </Button>
          </div>
          <div className="flex gap-1">
            <Mailing
              id={formData.id}
              address={formData.address}
              areaCode={formData.acode}
              zipcode={formData.zipcode}
              lname={formData.lname}
              fname={formData.fname}
              mname={formData.mname}
              contactnos={formData.contactnos}
              cellno={formData.cellno}
              officeno={formData.ofcno}
            />
            <Delete
              client={rowData}
              onClose={onClose}
              onDeleteSuccess={onDeleteSuccess}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default Edit;
