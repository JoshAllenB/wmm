/* eslint-disable react/prop-types */
import { useState } from "react";
import axios from "axios";
import { Button } from "./ui/button";
import Modal from "./modal";
import InputField from "./input";

const Add = ({ fetchClients }) => {
  const [formData, setFormData] = useState({
    idl: "",
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
    adddate: "",
    adduser: "",
  });

  const [showModal, setShowModal] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post("http://localhost:3001/clients/add", formData);
      fetchClients();
      setShowModal(false);
      setFormData({
        idl: "",
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
        adddate: "",
        adduser: "",
      });
    } catch (error) {
      console.error("Error adding clients!", error);
    }
  };

  return (
    <div>
      <Button onClick={() => setShowModal(true)}>Add Client</Button>

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <h2 className="text-xl font-bold mb-4">Add Client</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col mb-2">
                <InputField
                  label="Last Name:"
                  id="lname"
                  name="lname"
                  value={formData.lname}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col mb-2">
                <InputField
                  label="First Name:"
                  id="fname"
                  name="fname"
                  value={formData.fname}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col mb-2">
                <InputField
                  label="Middle Name:"
                  id="mname"
                  name="mname"
                  value={formData.mname}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col mb-2">
                <InputField
                  label="Suffix:"
                  id="sname"
                  name="sname"
                  value={formData.sname}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col mb-2">
                <InputField
                  label="Title:"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col mb-2">
                <InputField
                  label="Birth Date:"
                  id="bdate"
                  name="bdate"
                  value={formData.bdate}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col mb-2">
                <InputField
                  label="Company:"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col mb-2">
                <InputField
                  label="Address:"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col mb-2">
                <InputField
                  label="Zip Code:"
                  id="zipcode"
                  name="zipcode"
                  value={formData.zipcode}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col mb-2">
                <InputField
                  label="Area:"
                  id="area"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col mb-2">
                <InputField
                  label="Area Code:"
                  id="acode"
                  name="acode"
                  value={formData.acode}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col mb-2">
                <InputField
                  label="Contact Numbers:"
                  id="contactnos"
                  name="contactnos"
                  value={formData.contactnos}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col mb-2">
                <InputField
                  label="Cell Number:"
                  id="cellno"
                  name="cellno"
                  value={formData.cellno}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col mb-2">
                <InputField
                  label="Office Number:"
                  id="ofcno"
                  name="ofcno"
                  value={formData.ofcno}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col mb-2">
                <InputField
                  label="Email:"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col mb-2">
                <InputField
                  label="Type:"
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col mb-2">
                <InputField
                  label="Group:"
                  id="group"
                  name="group"
                  value={formData.group}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col mb-2">
                <InputField
                  label="Remarks:"
                  id="remarks"
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col mb-2">
                <label htmlFor="date">Add Date:</label>
                <InputField
                  label="Add Date:"
                  id="adddate"
                  name="adddate"
                  value={formData.adddate}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col mb-2">
                <label htmlFor="adduser">Add User:</label>
                <InputField
                  label="Add User:"
                  id="adduser"
                  name="adduser"
                  value={formData.adduser}
                  onChange={handleChange}
                />
              </div>
            </div>
          </form>
          <div className="flex gap-1">
            <Button
              className="p-1 text-sm"
              type="submit"
              onClick={handleSubmit}
            >
              Submit
            </Button>
            <Button onClick={() => setShowModal(false)}>Cancel</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Add;
