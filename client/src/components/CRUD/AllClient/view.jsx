import { useEffect, useState } from "react";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";
import Delete from "./delete";
import Mailing from "../../mailing";
import { useUser } from "../../../utils/Hooks/userProvider";
import { roleConfigs } from "../../../utils/roleConfigs";
import Edit from "./edit"; // Import the existing Edit component

const View = ({ rowData, onDeleteSuccess, onClose, onEditSuccess }) => {
  const { user, hasRole, hasPermission } = useUser();
  const [formData, setFormData] = useState({});
  const [addressData, setAddressData] = useState({});
  const [wmmData, setWmmData] = useState([]);
  const [hrgData, setHrgData] = useState([]);
  const [fomData, setFomData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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



      if (hasRole("WMM")) {
        setWmmData(rowData.wmmData || []);
      }
      if (hasRole("HRG")) {
        setHrgData(rowData.hrgData || []);
      }
      if (hasRole("FOM")) {
        setFomData(rowData.fomData || []);
      }
    }
  }, [rowData, hasRole]);

  const closeModal = () => {
    setShowModal(false);
    onClose();
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleEditClose = () => {
    setIsEditing(false);
  };

  const handleEditSuccess = (updatedData) => {
    setFormData(updatedData);
    setIsEditing(false);
    if (onEditSuccess) {
      onEditSuccess(updatedData);
    }
  };

  const renderField = (label, value) => (
    <div className="mb-2">
      <span className="text-black text-lg font-bold">{label}:</span>{" "}
      <span className="text-black text-lg">{value}</span>
    </div>
  );

  const renderSection = (title, fields) => (
    <div className="flex flex-col mb-2 p-2">
      <h1 className="text-black text-xl mb-2 font-bold">{title}</h1>
      {fields.map((field, index) => (
        <div key={index}>{renderField(field.label, formData[field.name])}</div>
      ))}
    </div>
  );

  const renderHrgData = () => {
    if (hrgData.length === 0) return null;
    return (
      <div className="flex flex-col mb-2 p-2">
        <h1 className="text-black text-xl mb-2 font-bold">HRG Data</h1>
        <div className="flex flex-col space-y-2 overflow-auto h-[150px] w-[300px]">
          {hrgData.map((hrg, index) => (
            <div key={index}>
              <div>
                <span className="text-black font-bold">Receive Date:</span>{" "}
                <span className="text-black">{hrg.recvdate}</span>
              </div>
              <div>
                <span className="text-black font-bold">Renew Date:</span>{" "}
                <span className="text-black">{hrg.renewdate}</span>
              </div>
              <div>
                <span className="text-black font-bold">Campaign Date:</span>{" "}
                <span className="text-black">{hrg.campaigndate}</span>
              </div>
              <div>
                <span className="text-black font-bold">Payment Ref:</span>{" "}
                <span className="text-black">{hrg.paymtref}</span>
              </div>
              <div>
                <span className="text-black font-bold">Payment Amount:</span>{" "}
                <span className="text-black">{hrg.paymtamt}</span>
              </div>
              <div>
                <span className="text-black font-bold">Unsubscribe:</span>{" "}
                <span className="text-black">
                  {hrg.unsubscribe ? "Yes" : "No"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderFomData = () => {
    if (fomData.length === 0) return null;
    return (
      <div className="flex flex-col mb-2 p-2">
        <h1 className="text-black text-xl mb-2 font-bold">FOM Data</h1>
        <div className="flex flex-col space-y-2 overflow-auto h-[250px] w-[300px]">
          {fomData.map((fom, index) => (
            <div key={index}>
              <div>
                <span className="text-black font-bold">Receive Date:</span>{" "}
                <span className="text-black">{fom.recvdate}</span>
              </div>
              <div>
                <span className="text-black font-bold">Payment Ref:</span>{" "}
                <span className="text-black">{fom.paymtref}</span>
              </div>
              <div>
                <span className="text-black font-bold">Payment Amount:</span>{" "}
                <span className="text-black">{fom.paymtamt}</span>
              </div>
              <div>
                <span className="text-black font-bold">Payment Form:</span>{" "}
                <span className="text-black">{fom.paymtform}</span>
              </div>
              <div>
                <span className="text-black font-bold">Remarks:</span>{" "}
                <span className="text-black">{fom.remarks}</span>
              </div>
              <div>
                <span className="text-black font-bold">Unsubscribe:</span>{" "}
                <span className="text-black">
                  {fom.unsubscribe ? "Yes" : "No"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {showModal && (
        <Modal isOpen={showModal} onClose={closeModal}>
          {isEditing ? (
            <Edit
              rowData={formData}
              onClose={handleEditClose}
              onEditSuccess={handleEditSuccess}
            />
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="flex flex-col text-2xl font-bold text-black">
                  Client Information ID: {formData.id}
                </h2>
              </div>
              <div className="grid grid-cols-3 gap-4 w-[1200px]">
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

                {renderHrgData()}
                {renderFomData()}
              </div>
              <div className="flex justify-between">
                <div className="flex gap-1">
                  <Button
                    onClick={closeModal}
                    className="bg-red-500 hover:bg-red-800 text-white"
                  >
                    Close
                  </Button>
                  {hasPermission("edit") && (
                    <Button
                      onClick={handleEditClick}
                      className="bg-blue-500 hover:bg-blue-700 text-white"
                    >
                      Edit
                    </Button>
                  )}
                </div>
                <div className="flex gap-1">
                  {hasPermission("print_data") && (
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
                  )}
                  {hasPermission("delete") && (
                    <Delete
                      client={rowData}
                      onClose={closeModal}
                      onDeleteSuccess={onDeleteSuccess}
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
};

export default View;
