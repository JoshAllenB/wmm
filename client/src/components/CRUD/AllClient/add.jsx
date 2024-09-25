/**
 * Renders a component for adding a client and handles form submission.
 *
 * @param {Object} props - The component props.
 * @param {Function} props.fetchClients - A function to fetch clients.
 * @return {JSX.Element} The rendered component.
 */

/* eslint-disable react/prop-types */
import { useState } from "react";
import axios from "axios";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";
import AddressForm from "../../../utils/addressLogic";

import InputField from "../input";

import { io } from "socket.io-client";
const socket = io("http://localhost:3001");

const Add = ({ fetchClients }) => {
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
    subscriptionFreq: "",
    subscriptionStart: "",
    subscriptionEnd: "",
    copies: "",
  });

  const [addressData, setAddressData] = useState({
    region: "",
    province: "",
    city: "",
    barangay: "",
  });

  const [showModal, setShowModal] = useState(false);

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

      if (today.getMonth() === 3 || today.getMonth() === 4) {
        subscriptionStart.setMonth(
          subscriptionStart.getMonth() + monthsToAdd + 1,
        );
      } else {
        subscriptionStart.setMonth(subscriptionStart.getMonth() + monthsToAdd);
      }

      const subscriptionEnd = new Date(subscriptionStart);

      setFormData({
        ...formData,
        subscriptionFreq: value,
        subscriptionStart: formatDate(subscriptionStart),
        subscriptionEnd: formatDate(subscriptionEnd),
      });
      return;
    }

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleAddressChange = (name, value) => {
    setAddressData({
      ...addressData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const addressComponents = [
      formData.area,
      formData.acode,
      formData.zipcode,
      formData.address,
      formData.street,
      addressData.region,
      addressData.province,
      addressData.city,
      addressData.barangay,
    ];

    const address = addressComponents.filter(Boolean).join(", ");

    const submissionData = {
      ...formData,
      address,
    };

    try {
      await axios.post("http://localhost:3001/clients/add", submissionData);
      fetchClients();
      socket.emit("client-added", submissionData);
      closeModal();
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
        subscriptionFreq: "",
        subscriptionStart: "",
        subscriptionEnd: "",
        copies: "",
      });
      setAddressData({
        region: "",
        province: "",
        city: "",
        barangay: "",
      });
    } catch (error) {
      console.error("Error adding clients!", error);
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
          isOpen={setShowModal}
          onClose={closeModal}
          className=" bg-gray-400 rounded-md bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border border-gray-100"
        >
          <h2 className="text-xl font-bold mb-4 text-gray-900">Add Client</h2>
          <form onSubmit={handleSubmit}>
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

                <InputField
                  label="Street:"
                  id="street"
                  name="street"
                  value={formData.street}
                  onChange={handleChange}
                />

                <InputField
                  label="Area"
                  id="area"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                />

                <InputField
                  label="Area Code"
                  id="acode"
                  name="acode"
                  value={formData.acode}
                  onChange={handleChange}
                />

                <InputField
                  label="Zip Code:"
                  id="zipcode"
                  name="zipcode"
                  value={formData.zipcode}
                  onChange={handleChange}
                />

                <AddressForm
                  onAddressChange={handleAddressChange}
                  addressData={addressData}
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
              <div className="flex flex-col mb-2">
                <h1 className="text-black mb-2 font-bold">Subscription</h1>
                <label htmlFor="subcriptionFreq">Subscription Frequency:</label>
                <select
                  id="subscriptionFreq"
                  name="subscriptionFreq"
                  value={formData.subscriptionFreq}
                  onChange={handleChange}
                  className="block w-full rounded-md border-0 mb-2 py-1.5 text-gray-900 shadow-sm ring-2 ring-gray-300 placeholder:text-gray-300 focus:ring-3 p-3"
                >
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

                <label className="block text-sm font-medium leading-6 text-gray-600">
                  Copies:
                </label>
                <input
                  id="copies"
                  name="copies"
                  value={formData.copies}
                  onChange={handleChange}
                  type="number"
                  className="block w-[80px] rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-2 ring-gray-300 placeholder:text-gray-300 focus:ring-3 p-3"
                />
              </div>
            </div>
          </form>
          <div className="flex gap-1">
            <Button
              className="bg-red-500 hover:bg-red-800 rounded-xl"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button
              className="text-sm bg-green-600 hover:bg-green-800 rounded-xl"
              type="submit"
              onClick={handleSubmit}
            >
              Submit
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Add;
