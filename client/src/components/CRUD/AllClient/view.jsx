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
  const [hrgData, setHrgData] = useState({});
  const [fomData, setFomData] = useState({});
  const [calData, setCalData] = useState({});
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

      // Set data regardless of role if it exists in rowData
      setWmmData(rowData.wmmData || []);
      setHrgData(rowData.hrgData || {});
      setFomData(rowData.fomData || {});
      setCalData(rowData.calData || {});
    }
  }, [rowData]);

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

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US"); // Adjust locale as needed
  };

  // Function to determine subscription status based on enddate
  const getSubscriptionStatus = (enddate) => {
    if (!enddate) return "unknown";

    const today = new Date();
    const endDate = new Date(enddate);

    // Check if date is valid
    if (isNaN(endDate.getTime())) return "unknown";

    // Calculate days until expiration
    const daysUntilExpiration = Math.ceil(
      (endDate - today) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiration < 0) {
      return "expired";
    } else if (daysUntilExpiration <= 30) {
      return "expiring-soon";
    } else {
      return "active";
    }
  };

  // Function to get status color class
  const getStatusColorClass = (status) => {
    switch (status) {
      case "expired":
        return "text-red-600 font-bold";
      case "expiring-soon":
        return "text-amber-600 font-bold";
      case "active":
        return "text-green-600";
      default:
        return "";
    }
  };

  // Function to get status indicator
  const getStatusIndicator = (status) => {
    switch (status) {
      case "expired":
        return "🔴 ";
      case "expiring-soon":
        return "🟡 ";
      case "active":
        return "🟢 ";
      default:
        return "";
    }
  };

  const renderWmmData = () => {
    // Check if wmmData exists, is an object, and has records
    if (!wmmData || !wmmData.records || wmmData.records.length === 0)
      return null;

    return (
      <div className="flex flex-col mb-2 p-2">
        <h1 className="text-black text-xl mb-2 font-bold">
          Subscription & Payment History
        </h1>
        <div className="flex flex-col space-y-2 overflow-auto h-[250px] w-full">
          {wmmData.records.map((subscription, index) => {
            const status = getSubscriptionStatus(subscription.enddate);
            const statusClass = getStatusColorClass(status);
            const statusIndicator = getStatusIndicator(status);

            return (
              <div key={index} className="border-b border-gray-300 pb-2 mb-2">
                <div className="flex space-x-1">
                  <span className={statusClass}>
                    {statusIndicator}
                    <span className="font-bold">
                      {subscription.subsclass}
                    </span>: {formatDate(subscription.subsdate)} -{" "}
                    {formatDate(subscription.enddate)} Cps:{" "}
                    {subscription.copies}
                  </span>
                </div>

                {/* Payment details */}
                {subscription.paymtref && (
                  <div className="mt-1 pl-4 text-sm">
                    <div className="grid grid-cols-2 gap-x-4">
                      <div>
                        <span className="text-black font-semibold">
                          Payment Ref:
                        </span>{" "}
                        <span className="text-black">
                          {subscription.paymtref}
                        </span>
                      </div>
                      <div>
                        <span className="text-black font-semibold">
                          Amount:
                        </span>{" "}
                        <span className="text-black">
                          {subscription.paymtamt}
                        </span>
                      </div>
                      {subscription.paymtmasses && (
                        <div>
                          <span className="text-black font-semibold">
                            Masses:
                          </span>{" "}
                          <span className="text-black">
                            {subscription.paymtmasses}
                          </span>
                        </div>
                      )}
                      {subscription.donorid && (
                        <div>
                          <span className="text-black font-semibold">
                            Donor ID:
                          </span>{" "}
                          <span className="text-black">
                            {subscription.donorid}
                          </span>
                        </div>
                      )}
                      {subscription.adddate && (
                        <div>
                          <span className="text-black font-semibold">
                            Added:
                          </span>{" "}
                          <span className="text-black">
                            {formatDate(subscription.adddate)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderHrgData = () => {
    if (!hrgData || !hrgData.records || hrgData.records.length === 0)
      return null;
    return (
      <div className="flex flex-col mb-2 p-2">
        <h1 className="text-black text-xl mb-2 font-bold">HRG Data</h1>
        <div className="flex flex-col space-y-2 overflow-auto h-[150px] w-[300px]">
          {hrgData.records.map((record, index) => (
            <div key={index} className="flex flex-col border-b border-gray-500">
              {record.recvdate && (
                <div>
                  <span className="text-black font-bold">Receive Date:</span>{" "}
                  <span className="text-black">{record.recvdate}</span>
                </div>
              )}
              {record.campaigndate && (
                <div>
                  <span className="text-black font-bold">Campaign Date:</span>{" "}
                  <span className="text-black">{record.campaigndate}</span>
                </div>
              )}
              {record.paymtref && (
                <div>
                  <span className="text-black font-bold">Payment Ref:</span>{" "}
                  <span className="text-black">{record.paymtref}</span>
                </div>
              )}
              {record.paymtamt && (
                <div>
                  <span className="text-black font-bold">Payment Amount:</span>{" "}
                  <span className="text-black">{record.paymtamt}</span>
                </div>
              )}
              <div>
                <span className="text-black font-bold">Unsubscribe:</span>{" "}
                <span className="text-black">
                  {record.unsubscribe ? "Yes" : "No"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderFomData = () => {
    if (!fomData || !fomData.records || fomData.records.length === 0)
      return null;
    return (
      <div className="flex flex-col mb-2 p-2">
        <h1 className="text-black text-xl mb-2 font-bold">FOM Data</h1>
        <div className="flex flex-col space-y-2 overflow-auto h-[150px] w-[300px]">
          {fomData.records.map((record, index) => (
            <div key={index} className="flex flex-col border-b border-gray-500">
              {record.recvdate && (
                <div>
                  <span className="text-black font-bold">Receive Date:</span>{" "}
                  <span className="text-black">{record.recvdate}</span>
                </div>
              )}
              {record.paymtref && (
                <div>
                  <span className="text-black font-bold">Payment Ref:</span>{" "}
                  <span className="text-black">{record.paymtref}</span>
                </div>
              )}
              {record.paymtamt && (
                <div>
                  <span className="text-black font-bold">Payment Amount:</span>{" "}
                  <span className="text-black">{record.paymtamt}</span>
                </div>
              )}
              {record.paymtform && (
                <div>
                  <span className="text-black font-bold">Payment Form:</span>{" "}
                  <span className="text-black">{record.paymtform}</span>
                </div>
              )}
              <div>
                <span className="text-black font-bold">Unsubscribe:</span>{" "}
                <span className="text-black">
                  {record.unsubscribe ? "Yes" : "No"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCalData = () => {
    if (!calData || !calData.records || calData.records.length === 0)
      return null;
    return (
      <div className="flex flex-col mb-2 p-2">
        <h1 className="text-black text-xl mb-2 font-bold">CAL Data</h1>
        <div className="flex flex-col space-y-2 overflow-auto h-[150px] w-[300px]">
          {calData.records.map((record, index) => (
            <div key={index} className="flex flex-col border-b border-gray-500">
              {record.recvdate && (
                <div>
                  <span className="text-black font-bold">Receive Date:</span>{" "}
                  <span className="text-black">{record.recvdate}</span>
                </div>
              )}
              {record.caltype && (
                <div>
                  <span className="text-black font-bold">Cal Type:</span>{" "}
                  <span className="text-black">{record.caltype}</span>
                </div>
              )}
              {record.calqty && (
                <div>
                  <span className="text-black font-bold">Cal Quantity:</span>{" "}
                  <span className="text-black">{record.calqty}</span>
                </div>
              )}
              {record.calamt && (
                <div>
                  <span className="text-black font-bold">Cal Amount:</span>{" "}
                  <span className="text-black">{record.calamt}</span>
                </div>
              )}
              {record.paymtref && (
                <div>
                  <span className="text-black font-bold">Payment Ref:</span>{" "}
                  <span className="text-black">{record.paymtref}</span>
                </div>
              )}
              {record.paymtamt && (
                <div>
                  <span className="text-black font-bold">Payment Amount:</span>{" "}
                  <span className="text-black">{record.paymtamt}</span>
                </div>
              )}
              {record.paymtform && (
                <div>
                  <span className="text-black font-bold">Payment Form:</span>{" "}
                  <span className="text-black">{record.paymtform}</span>
                </div>
              )}
              {record.paymtdate && (
                <div>
                  <span className="text-black font-bold">Payment Date:</span>{" "}
                  <span className="text-black">{record.paymtdate}</span>
                </div>
              )}
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
              <div className="flex flex-col justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-black">
                  Client Information ID: {formData.id}
                </h2>
                <h2 className="flex flex-col text-xl font-bold text-black">
                  Added Date: {formatDate(formData.adddate)}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 w-full">
                {/* Personal Information Card */}
                <div className="p-4 border rounded-lg shadow-sm">
                  <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                    Personal Information
                  </h2>
                  {renderSection("Personal Info", [
                    { label: "Last Name", name: "lname" },
                    { label: "First Name", name: "fname" },
                    { label: "Middle Name", name: "mname" },
                    { label: "Suffix", name: "sname" },
                    { label: "Title", name: "title" },
                    { label: "Birth Date", name: "bdate" },
                    { label: "Company", name: "company" },
                  ])}
                </div>

                {/* Address Information Card */}
                <div className="p-4 border rounded-lg shadow-sm">
                  <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                    Address Information
                  </h2>
                  {renderSection("Address Info", [
                    { label: "Address", name: "address" },
                  ])}
                </div>

                {/* Contact Information Card */}
                <div className="p-4 border rounded-lg shadow-sm">
                  <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                    Contact Information
                  </h2>
                  {renderSection("Contact Info", [
                    { label: "Contact Numbers", name: "contactnos" },
                    { label: "Cell Number", name: "cellno" },
                    { label: "Office Number", name: "ofcno" },
                    { label: "Email", name: "email" },
                  ])}
                </div>

                {/* Group Information Card */}
                <div className="p-4 border rounded-lg shadow-sm">
                  <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                    Group Information
                  </h2>
                  {renderSection("Group Info", [
                    { label: "Type", name: "type" },
                    { label: "Group", name: "group" },
                    { label: "Remarks", name: "remarks" },
                  ])}
                </div>

                {/* Replace separate payment history and subscription history cards with combined one */}
                {wmmData && wmmData.records && wmmData.records.length > 0 ? (
                  <div className="p-4 border rounded-lg shadow-sm col-span-1 sm:col-span-2">
                    <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                      Subscription & Payment History
                    </h2>
                    {renderWmmData()}
                  </div>
                ) : (
                  <div className="p-4 border rounded-lg shadow-sm">
                    <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                      Subscription & Payment History
                    </h2>
                    <p>No subscription or payment history available.</p>
                  </div>
                )}

                {/* HRG Data Card */}
                {hrgData && hrgData.records && hrgData.records.length > 0 && (
                  <div className="p-4 border rounded-lg shadow-sm">
                    <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                      HRG Data
                    </h2>
                    {renderHrgData()}
                  </div>
                )}

                {/* FOM Data Card */}
                {fomData && fomData.records && fomData.records.length > 0 && (
                  <div className="p-4 border rounded-lg shadow-sm">
                    <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                      FOM Data
                    </h2>
                    {renderFomData()}
                  </div>
                )}

                {/* CAL Data Card */}
                {calData && calData.records && calData.records.length > 0 && (
                  <div className="p-4 border rounded-lg shadow-sm">
                    <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                      CAL Data
                    </h2>
                    {renderCalData()}
                  </div>
                )}
              </div>
              <div className="flex justify-between mt-8 pt-4 border-t">
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
