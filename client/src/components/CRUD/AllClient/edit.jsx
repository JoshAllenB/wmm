import { useEffect, useMemo, useState } from "react";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";
import Delete from "./delete";
import Mailing from "../../mailing";
import InputField from "../input";
import axios from "axios";
import io from "socket.io-client";

const socket = io("http://localhost:3001");

const Edit = ({ rowData, onDeleteSuccess, onClose }) => {
  const initialFormData = useMemo(
    () => ({
      id: "",
      lname: "",
      fname: "",
      mname: "",
      sname: "",
      title: "",
      bdate: "",
      company: "",
      street: "",
      city: "",
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
      subscriptionFreq: "",
      subscriptionStart: "",
      subscriptionEnd: "",
      copies: "",
    }),
    []
  );

  const [formData, setFormData] = useState(initialFormData);
  const [showModal, setShowModal] = useState(false);

  const closeModal = () => setShowModal(false);

  const formatDate = (date) => {
    const options = { month: "long", year: "numeric" };
    return new Intl.DateTimeFormat("en-US", options).format(date);
  };
  useEffect(() => {
    setFormData({
      ...initialFormData,
      ...rowData,
    });

    socket.emit("data-update", {
      type: "update",
      data: {
        ...initialFormData,
        ...rowData,
      },
    });

    setShowModal(true);
  }, [rowData, initialFormData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "subscriptionFreq") {
      const today = new Date();
      const monthsToAdd = parseInt(value);

      const subscriptionStart = new Date(today);

      const subscriptionEnd = new Date(subscriptionStart);
      subscriptionEnd.setMonth(subscriptionEnd.getMonth() + monthsToAdd);

      setFormData((prevData) => ({
        ...prevData,
        subscriptionFreq: value,
        subscriptionStart: formatDate(subscriptionStart),
        subscriptionEnd: formatDate(subscriptionEnd),
      }));
      return;
    }
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value || "",
    }));
  };

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

  return (
    <>
      {showModal && (
        <Modal isOpen={setShowModal} onClose={closeModal}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="flex flex-col text-xl font-bold text-black">
              Edit Client Information
            </h2>
          </div>
          <h1 className="text-black font-bold">Client ID: {formData.id}</h1>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
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
                  label="Barangay:"
                  id="barangay"
                  name="barangay"
                  value={formData.barangay}
                  onChange={handleChange}
                />
                <InputField
                  label="City:"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                />
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

                {formData.address && (
                  <div className="flex flex-col mb-2 p-2">
                    <h1 className="text-black ">Old Address Format</h1>
                    <textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className="block w-full rounded-md border-0 mb-2 py-1.5 text-gray-900 shadow-sm ring-2 ring-gray-300 placeholder:text-gray-300 focus:ring-3 p-3"
                    />
                  </div>
                )}
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

                <label className="block text-sm font-medium leading-6 text-gray-600">
                  Copies:
                </label>
                <input
                  id="copies"
                  name="copies"
                  value={formData.copies || ""}
                  onChange={handleChange}
                  type="number"
                  className="block w-[80px] rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-2 ring-gray-300 placeholder:text-gray-300 focus:ring-3 p-3"
                />
              </div>
            </div>
          </form>
          <div className="mt-4 flex justify-between">
            <div className="flex gap-1">
              <Button
                onClick={handleSubmit}
                className="text-sm bg-green-600 hover:bg-green-800 "
              >
                Save
              </Button>
              <Button onClick={onClose} className="bg-red-500 hover:bg-red-800">
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
        </Modal>
      )}
    </>
  );
};

export default Edit;
