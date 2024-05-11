import { useEffect, useState } from "react";
import { Button } from "./UI/ShadCN/button";
import Modal from "./modal";
import Delete from "./delete";
import Mailing from "./mailing";
import InputField from "./input";
import axios from "axios";

const Edit = ({ rowData, onDelete, onClose }) => {
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

  // eslint-disable-next-line no-unused-vars
  const [showModal, setShowModal] = useState(false);

  const formatDate = (date) => {
    const options = { month: "long", year: "numeric" };
    return new Intl.DateTimeFormat("en-US", options).format(date);
  };

  useEffect(() => {
    console.log("rowdata:", rowData);
    setFormData(rowData);
    setShowModal(true);
  }, [rowData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "subscriptionFreq") {
      const today = new Date();
      const monthsToAdd = parseInt(value);

      const subscriptionStart = new Date(today);
      console.log("Subscription start:", subscriptionStart);

      const subscriptionEnd = new Date(subscriptionStart);
      subscriptionEnd.setMonth(subscriptionEnd.getMonth() + monthsToAdd);
      console.log("Subscription end:", subscriptionEnd);

      setFormData((prevData) => ({
        ...prevData,
        subscriptionFreq: value,
        subscriptionStart: formatDate(subscriptionStart),
        subscriptionEnd: formatDate(subscriptionEnd),
      }));
    } else {
      setFormData((prevFormData) => ({
        ...prevFormData,
        [name]: value || "",
      }));
    }
  };

  useEffect(() => {
    console.log("formData:", formData);
  }, [formData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData) return;

    try {
      await axios.put(`http://localhost:3001/clients/${rowData.id}`, formData);
      onClose();
      setShowModal(false);
    } catch (e) {
      console.error("Error updating client:", e);
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(rowData.id);
      onClose();
    } catch (e) {
      console.error("Error deleting client:", e);
    }
  };

  return (
    <>
      <Modal onClose={() => setShowModal(false)}>
        <h2 className="text-xl font-bold mb-4">Edit Client Information</h2>
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
                label="Zip Code:"
                id="zipcode"
                name="zipcode"
                value={formData.zipcode}
                onChange={handleChange}
              />

              <InputField
                label="Area:"
                id="area"
                name="area"
                value={formData.area}
                onChange={handleChange}
              />

              <InputField
                label="Area Code:"
                id="acode"
                name="acode"
                value={formData.acode}
                onChange={handleChange}
              />

              <label className="block text-sm font-medium leading-6 text-gray-600">
                Address
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="block rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-2 ring-gray-300 placeholder:text-gray-300 focus:ring-3 p-3 resize-none" // Add resize-none class here                  rows={6}
                rows={4}
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
                <option value="">Select Frequency</option>
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
                label="Copies:"
                id="copies"
                name="copies"
                value={formData.copies}
                onChange={handleChange}
              />
            </div>
          </div>
        </form>
        <div className="mt-4 flex justify-between">
          <div className="flex gap-1">
            <Button
              onClick={handleSubmit}
              className="ml-2 bg-green-500 hover:bg-green-800"
            >
              Save
            </Button>
            <Button onClick={onClose}>Cancel</Button>
          </div>
          <div className="flex gap-1">
            <Mailing address={formData.address} />

            <Delete
              client={formData}
              onDelete={handleDelete}
              onClose={onClose}
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Edit;
