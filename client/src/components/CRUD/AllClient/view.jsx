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
      // Check if wmmData is an array or has records property
      if (rowData.wmmData) {
        if (Array.isArray(rowData.wmmData)) {
          setWmmData(rowData.wmmData);
        } else if (rowData.wmmData.records) {
          setWmmData(rowData.wmmData.records);
        } else {
          setWmmData([]);
        }
      } else {
        setWmmData([]);
      }
      
      // Handle HRG data properly
      if (rowData.hrgData) {
        if (Array.isArray(rowData.hrgData)) {
          setHrgData({ records: rowData.hrgData });
        } else if (rowData.hrgData.records) {
          setHrgData(rowData.hrgData);
        } else {
          setHrgData({ records: [rowData.hrgData].filter(item => Object.keys(item).length > 0) });
        }
      } else {
        setHrgData({ records: [] });
      }
      
      // Handle FOM data properly
      if (rowData.fomData) {
        if (Array.isArray(rowData.fomData)) {
          setFomData({ records: rowData.fomData });
        } else if (rowData.fomData.records) {
          setFomData(rowData.fomData);
        } else {
          setFomData({ records: [rowData.fomData].filter(item => Object.keys(item).length > 0) });
        }
      } else {
        setFomData({ records: [] });
      }
      
      // Handle CAL data properly
      if (rowData.calData) {
        if (Array.isArray(rowData.calData)) {
          setCalData({ records: rowData.calData });
        } else if (rowData.calData.records) {
          setCalData(rowData.calData);
        } else {
          setCalData({ records: [rowData.calData].filter(item => Object.keys(item).length > 0) });
        }
      } else {
        setCalData({ records: [] });
      }
    }
  }, [rowData]);

  const closeModal = () => {
    setShowModal(false);
    onClose();
  };

  const handleEditClick = () => {
    // Ensure subscription data is properly structured before passing to edit
    const editData = {
      ...formData,
      wmmData: {
        records: Array.isArray(wmmData) ? wmmData : wmmData.records || []
      }
    };
    setFormData(editData);
    setIsEditing(true);
  };

  const handleEditClose = () => {
    setIsEditing(false);
  };

  const handleEditSuccess = (updatedData) => {
    // Update formData with the base client data
    setFormData(updatedData);
    
    // Handle subscription data properly
    if (updatedData.wmmData) {
      // Ensure wmmData is properly formatted
      if (Array.isArray(updatedData.wmmData)) {
        setWmmData(updatedData.wmmData);
      } else if (updatedData.wmmData.records && Array.isArray(updatedData.wmmData.records)) {
        setWmmData(updatedData.wmmData.records);
      } else {
        // Handle case where wmmData is a single object
        setWmmData([updatedData.wmmData].filter(item => Object.keys(item).length > 0));
      }
    }
    
    // Update HRG data if present
    if (updatedData.hrgData) {
      // Handle different possible formats consistently
      if (Array.isArray(updatedData.hrgData)) {
        setHrgData({ records: updatedData.hrgData });
      } else if (updatedData.hrgData.records && Array.isArray(updatedData.hrgData.records)) {
        setHrgData(updatedData.hrgData);
      } else {
        // Handle case where hrgData is a single object
        setHrgData({ 
          records: [updatedData.hrgData].filter(item => Object.keys(item).length > 0) 
        });
      }
    }
    
    // Update FOM data if present
    if (updatedData.fomData) {
      // Handle different possible formats consistently
      if (Array.isArray(updatedData.fomData)) {
        setFomData({ records: updatedData.fomData });
      } else if (updatedData.fomData.records && Array.isArray(updatedData.fomData.records)) {
        setFomData(updatedData.fomData);
      } else {
        // Handle case where fomData is a single object
        setFomData({ 
          records: [updatedData.fomData].filter(item => Object.keys(item).length > 0) 
        });
      }
    }
    
    // Update CAL data if present
    if (updatedData.calData) {
      // Handle different possible formats consistently
      if (Array.isArray(updatedData.calData)) {
        setCalData({ records: updatedData.calData });
      } else if (updatedData.calData.records && Array.isArray(updatedData.calData.records)) {
        setCalData(updatedData.calData);
      } else {
        // Handle case where calData is a single object
        setCalData({ 
          records: [updatedData.calData].filter(item => Object.keys(item).length > 0) 
        });
      }
    }
    
    // Update address data if address was changed
    if (updatedData.address) {
      const addressParts = updatedData.address.split(", ");
      setAddressData({
        region: addressParts[4] || "",
        province: addressParts[3] || "",
        city: addressParts[2] || "",
        barangay: addressParts[1] || "",
      });
    }
    
    setIsEditing(false);
    
    // Pass the updated data to any parent component that needs it
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
    // Check if wmmData exists and has items
    if (!wmmData || wmmData.length === 0) return null;

    // Sort wmmData by subsdate in descending order (latest to oldest)
    const sortedWmmData = [...wmmData].sort((a, b) => {
      const dateA = new Date(a.subsdate);
      const dateB = new Date(b.subsdate);
      return dateB - dateA;
    });

    return (
      <div className="flex flex-col mb-2 p-2">
        <h1 className="text-black text-xl mb-2 font-bold">
          Subscription & Payment History
        </h1>
        <div className="flex flex-col space-y-2 overflow-auto h-[250px] w-full">
          {sortedWmmData.map((subscription, index) => {
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

    const sortedHrgData = [...hrgData.records].sort((a, b) => {
      const dateA = new Date(a.recvdate || 0);
      const dateB = new Date(b.recvdate || 0);
      return dateB - dateA;
    });
    
    return (
      <div className="flex flex-col mb-2 p-2">
        <div className="flex flex-col space-y-2 overflow-auto h-[150px] w-full">
          {sortedHrgData.map((record, index) => (
            <div key={index} className="mb-1 text-base border-b border-gray-300 pb-2">
              <div className={record.unsubscribe ? "text-red-600" : "text-green-600"}>
                {record.unsubscribe ? "Unsubscribed" : "Active"}
              </div>
              <span className="font-medium">{record.recvdate ? formatDate(record.recvdate) : 'N/A'} | </span>
              <span className="font-medium">
                {record.paymtamt ? `Php ${record.paymtamt}` : 'No amount'} 
                {record.paymtref ? ` - Ref: #${record.paymtref}` : ''}
              </span>
              {record.remarks && (
                <div className="mt-1 text-sm text-gray-600">
                  <span className="font-semibold">Remarks:</span> {record.remarks}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderFomData = () => {
    if (!fomData || !fomData.records || fomData.records.length === 0)
      return null;

    const sortedFomData = [...fomData.records].sort((a, b) => {
      const dateA = new Date(a.recvdate || 0);
      const dateB = new Date(b.recvdate || 0);
      return dateB - dateA;
    });
    
    return (
      <div className="flex flex-col mb-2 p-2">
        <div className="flex flex-col space-y-2 overflow-auto h-[150px] w-full">
          {sortedFomData.map((record, index) => (
            <div key={index} className="mb-1 text-base border-b border-gray-300 pb-2">
              <div className={record.unsubscribe ? "text-red-600" : "text-green-600"}>
                {record.unsubscribe ? "Unsubscribed" : "Active"}
              </div>
              <span className="font-medium">{record.recvdate ? formatDate(record.recvdate) : 'N/A'} | </span>
              <span className="font-medium">
                {record.paymtamt ? `Php ${record.paymtamt}` : 'No amount'}
                {record.paymtform ? ` - Form: ${record.paymtform}` : ''}
                {record.paymtref ? ` - Ref: #${record.paymtref}` : ''}
              </span>
              {record.remarks && (
                <div className="mt-1 text-sm text-gray-600">
                  <span className="font-semibold">Remarks:</span> {record.remarks}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCalData = () => {
    if (!calData || !calData.records || calData.records.length === 0)
      return null;

    const sortedCalData = [...calData.records].sort((a, b) => {
      const dateA = new Date(a.recvdate || 0);
      const dateB = new Date(b.recvdate || 0);
      return dateB - dateA;
    });
    
    return (
      <div className="flex flex-col mb-2 p-2">
        <div className="flex flex-col space-y-2 overflow-auto h-[150px] w-full">
          {sortedCalData.map((record, index) => (
            <div key={index} className="mb-1 text-base border-b border-gray-300 pb-2">
              <div className="font-medium">{record.recvdate ? formatDate(record.recvdate) : 'N/A'} | {record.caltype || 'N/A'} </div>
              <span className="font-medium">
                Qty: {record.calqty || '0'} - Cost: {record.calamt || '0'} 
                {record.paymtref ? ` - Ref: #${record.paymtref}` : ''}
              </span>
              {record.remarks && (
                <div className="mt-1 text-sm text-gray-600">
                  <span className="font-semibold">Remarks:</span> {record.remarks}
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

                {/* Subscription & Payment History Card - Only show for WMM users */}
                {(hasRole("WMM") || hasRole("Admin")) && (
                  wmmData && wmmData.length > 0 ? (
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
                  )
                )}

                {/* HRG Data Card - Always show HRG data if available */}
                {hrgData && hrgData.records && hrgData.records.length > 0 && (
                  <div className="p-4 border rounded-lg shadow-sm">
                    <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                      HRG Data
                    </h2>
                    {renderHrgData()}
                  </div>
                )}

                {/* FOM Data Card - Always show FOM data if available */}
                {fomData && fomData.records && fomData.records.length > 0 && (
                  <div className="p-4 border rounded-lg shadow-sm">
                    <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                      FOM Data
                    </h2>
                    {renderFomData()}
                  </div>
                )}

                {/* CAL Data Card - Always show CAL data if available */}
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
