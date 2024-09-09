import { useEffect, useMemo, useState } from "react";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";
import Delete from "./delete";
import Mailing from "../../mailing";

const View = ({ rowData, onDeleteSuccess, onClose }) => {
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
    [],
  );

  const [formData, setFormData] = useState(initialFormData);
  const [showModal, setShowModal] = useState(false);

  const closeModal = () => {
    setShowModal(false);
    onClose(); // Call the onClose prop to inform the parent component
  };

  useEffect(() => {
    setFormData({
      ...initialFormData,
      ...rowData,
    });
    setShowModal(true);
  }, [rowData, initialFormData]);

  const renderField = (label, value) => (
    <div className="mb-2">
      <span className="text-black font-bold">{label}:</span>{" "}
      <span className="text-black">{value}</span>
    </div>
  );

  const renderSection = (title, fields) => (
    <div className="flex flex-col mb-2 p-2">
      <h1 className="text-black mb-2 font-bold">{title}</h1>
      {fields.map((field, index) => (
        <div key={index}>{renderField(field.label, formData[field.name])}</div>
      ))}
    </div>
  );

  const renderSubscription = () => {
    const subscriptionData = formData.wmmData || [];

    return (
      <div className="flex flex-col mb-2 p-2 ">
        <h1 className="text-black mb-2 font-bold">Subscription History</h1>
        <div className="flex flex-col space-y-2 overflow-auto h-[150px] w-[300px]">
          {subscriptionData.map((subscription, index) => {
            let { subsdate, enddate, copies } = subscription;

            if (subsdate) {
              subsdate = `Start Date: ${new Date(subsdate).toLocaleDateString("en-US")}`;
            } else {
              subsdate = "N/A";
            }

            if (enddate) {
              enddate = `End Date: ${new Date(enddate).toLocaleDateString("en-US")}`;
            } else {
              enddate = "N/A";
            }

            return (
              <div key={index}>
                <div>
                  <span className="text-black font-bold">Start Date:</span>{" "}
                  <span className="text-black">{subsdate}</span>
                </div>
                <div>
                  <span className="text-black font-bold">End Date:</span>{" "}
                  <span className="text-black">{enddate}</span>
                </div>
                <div>
                  <span className="text-black font-bold">Copies:</span>{" "}
                  <span className="text-black">{`Copies: ${copies || "N/A"}`}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {showModal && (
        <Modal isOpen={setShowModal} onClose={closeModal}>
          <div className="flex justify-between items-center mb-4 ">
            <h2 className="flex flex-col text-xl font-bold text-black">
              Client Information
            </h2>
          </div>
          <h1 className="text-black font-bold">Client ID: {formData.id}</h1>
          <div className="grid grid-cols-2 gap-4 w-[600px]">
            {renderSection("Personal Info", [
              { label: "Last Name", name: "lname" },
              { label: "First Name", name: "fname" },
              { label: "Middle Name", name: "mname" },
              { label: "Suffix", name: "sname" },
              { label: "Title", name: "title" },
              { label: "Birth Date", name: "bdate" },
              { label: "Company", name: "company" },
            ])}

            {renderSection("Address Info", [
              { label: "Street", name: "street" },
              { label: "Barangay", name: "barangay" },
              { label: "City", name: "city" },
              { label: "Zip Code", name: "zipcode" },
              { label: "Area", name: "area" },
              { label: "Area Code", name: "acode" },
              { label: "Address", name: "address" },
            ])}

            {renderSection("Contact Info", [
              { label: "Contact Numbers", name: "contactnos" },
              { label: "Cell Number", name: "cellno" },
              { label: "Office Number", name: "ofcno" },
              { label: "Email", name: "email" },
            ])}

            {renderSection("Group Info", [
              { label: "Type", name: "type" },
              { label: "Group", name: "group" },
              { label: "Remarks", name: "remarks" },
            ])}

            {renderSubscription()}
          </div>
          <div className="mt-4 flex justify-between">
            <div className="flex gap-1">
              <Button onClick={onClose} className="bg-red-500 hover:bg-red-800">
                Close
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

export default View;
