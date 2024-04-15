import { useState } from "react";
import { Button } from "./ui/button";
import Modal from "./modal";
import Delete from "./delete";
import Mailing from "./mailing";
import InputField from "./input";

const Edit = ({ client, onSave, onDelete, onClose }) => {
  const initialClient = {
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
  };

  const [editedClient, setEditedClient] = useState({
    ...initialClient,
    ...client,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedClient((prevClient) => ({
      ...prevClient,
      [name]: value || "",
    }));
  };

  const handleSave = () => {
    onSave(editedClient);
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-bold mb-4">Edit Client Information</h2>
      <form onSubmit={handleSave}>
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Last Name:"
            name="lname"
            value={editedClient.lname || ""}
            onChange={handleChange}
          />
          <InputField
            label="First Name:"
            name="fname"
            value={editedClient.fname || ""}
            onChange={handleChange}
          />
          <InputField
            label="Middle Name:"
            name="mname"
            value={editedClient.mname || ""}
            onChange={handleChange}
          />
          <InputField
            label="Suffix:"
            name="sname"
            value={editedClient.sname || ""}
            onChange={handleChange}
          />
          <InputField
            label="Title:"
            name="title"
            value={editedClient.title || ""}
            onChange={handleChange}
          />
          <InputField
            label="Birth Date:"
            name="bdate"
            type="date"
            value={editedClient.bdate || ""}
            onChange={handleChange}
          />
          <InputField
            label="Company:"
            name="company"
            value={editedClient.company || ""}
            onChange={handleChange}
          />
          <InputField
            label="Address:"
            name="address"
            value={editedClient.address || ""}
            onChange={handleChange}
          />
          <InputField
            label="Zipcode:"
            name="zipcode"
            value={editedClient.zipcode || ""}
            onChange={handleChange}
          />
          <InputField
            label="Area:"
            name="area"
            value={editedClient.area || ""}
            onChange={handleChange}
          />
          <InputField
            label="Area Code:"
            name="acode"
            value={editedClient.acode || ""}
            onChange={handleChange}
          />
          <InputField
            label="Contact Numbers:"
            name="contactnos"
            value={editedClient.contactnos || ""}
            onChange={handleChange}
          />
          <InputField
            label="Cell Number:"
            name="cellno"
            value={editedClient.cellno || ""}
            onChange={handleChange}
          />
          <InputField
            label="Office Number:"
            name="ofcno"
            value={editedClient.ofcno || ""}
            onChange={handleChange}
          />
          <InputField
            label="Email:"
            name="email"
            value={editedClient.email || ""}
            onChange={handleChange}
          />
          <InputField
            label="Type:"
            name="type"
            value={editedClient.type || ""}
            onChange={handleChange}
          />
          <InputField
            label="Group:"
            name="group"
            value={editedClient.group || ""}
            onChange={handleChange}
          />
          <InputField
            label="Remarks:"
            name="remarks"
            value={editedClient.remarks || ""}
            onChange={handleChange}
          />
          <InputField
            label="Add Date:"
            name="adddate"
            type="date"
            value={editedClient.adddate || ""}
            onChange={handleChange}
          />
          <InputField
            label="Add User:"
            name="adduser"
            value={editedClient.adduser || ""}
            onChange={handleChange}
          />
        </div>
      </form>
      <div className="mt-4 flex justify-between">
        <div className="flex gap-1">
          <Button
            onClick={handleSave}
            className="ml-2 bg-green-500 hover:bg-green-800"
          >
            Save
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </div>
        <div className="flex gap-1">
          <Mailing address={editedClient.address} />

          <Delete client={client} onDelete={onDelete} onClose={onClose} />
        </div>
      </div>
    </Modal>
  );
};
export default Edit;
