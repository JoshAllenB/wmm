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
  const [wmmData, setWmmData] = useState({ records: [] });
  const [hrgData, setHrgData] = useState({ records: [] });
  const [fomData, setFomData] = useState({ records: [] });
  const [calData, setCalData] = useState({ records: [] });
  const [promoData, setPromoData] = useState({ records: [] }); // Add promoData state
  const [compData, setCompData] = useState({ records: [] }); // Add compData state
  const [spackData, setSpackData] = useState({ records: [] }); // Add spackData state
  const [rtsData, setRtsData] = useState({ records: [] }); // Add rtsData state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [expandedSubs, setExpandedSubs] = useState({}); // Track expanded remark items by key
  const [spackEnabled, setSpackEnabled] = useState(false); // Track SPack flag when only boolean is provided

  useEffect(() => {
    if (rowData) {
      // Determine the correct subscription type based on available data
      let subscriptionType = "None"; // Default to None when no data exists

      // Check which subscription data exists and has records
      if (
        rowData.promoData &&
        ((rowData.promoData.records && rowData.promoData.records.length > 0) ||
          (Array.isArray(rowData.promoData) && rowData.promoData.length > 0) ||
          (typeof rowData.promoData === "object" &&
            Object.keys(rowData.promoData).length > 0))
      ) {
        subscriptionType = "Promo";
      } else if (
        rowData.compData &&
        ((rowData.compData.records && rowData.compData.records.length > 0) ||
          (Array.isArray(rowData.compData) && rowData.compData.length > 0) ||
          (typeof rowData.compData === "object" &&
            Object.keys(rowData.compData).length > 0))
      ) {
        subscriptionType = "Complimentary";
      } else if (
        rowData.wmmData &&
        ((rowData.wmmData.records && rowData.wmmData.records.length > 0) ||
          (Array.isArray(rowData.wmmData) && rowData.wmmData.length > 0) ||
          (typeof rowData.wmmData === "object" &&
            Object.keys(rowData.wmmData).length > 0))
      ) {
        subscriptionType = "WMM";
      }

      // Set formData with the correct subscription type
      setFormData({
        ...rowData,
        subscriptionType: subscriptionType,
      });
      setShowModal(true);

      // Get services array
      const clientServices = rowData.services || [];

      // Handle WMM data if present
      if (rowData.wmmData) {
        if (rowData.wmmData.records && Array.isArray(rowData.wmmData.records)) {
          setWmmData(rowData.wmmData);
        } else if (Array.isArray(rowData.wmmData)) {
          setWmmData({ records: rowData.wmmData });
        } else if (typeof rowData.wmmData === "object") {
          setWmmData({
            records: [rowData.wmmData].filter(
              (item) => Object.keys(item).length > 0
            ),
          });
        } else {
          setWmmData({ records: [] });
        }
      } else {
        setWmmData({ records: [] });
      }

      // Handle Promo data if present
      if (rowData.promoData) {
        if (
          rowData.promoData.records &&
          Array.isArray(rowData.promoData.records)
        ) {
          setPromoData(rowData.promoData);
        } else if (Array.isArray(rowData.promoData)) {
          setPromoData({ records: rowData.promoData });
        } else if (typeof rowData.promoData === "object") {
          setPromoData({
            records: [rowData.promoData].filter(
              (item) => Object.keys(item).length > 0
            ),
          });
        } else {
          setPromoData({ records: [] });
        }
      } else {
        setPromoData({ records: [] });
      }

      // Handle Complimentary data if present
      if (rowData.compData) {
        if (
          rowData.compData.records &&
          Array.isArray(rowData.compData.records)
        ) {
          setCompData(rowData.compData);
        } else if (Array.isArray(rowData.compData)) {
          setCompData({ records: rowData.compData });
        } else if (typeof rowData.compData === "object") {
          setCompData({
            records: [rowData.compData].filter(
              (item) => Object.keys(item).length > 0
            ),
          });
        } else {
          setCompData({ records: [] });
        }
      } else {
        setCompData({ records: [] });
      }

      // Handle HRG data properly
      if (rowData.hrgData && clientServices.includes("HRG")) {
        if (Array.isArray(rowData.hrgData)) {
          setHrgData({ records: rowData.hrgData });
        } else if (rowData.hrgData.records) {
          setHrgData(rowData.hrgData);
        } else {
          setHrgData({
            records: [rowData.hrgData].filter(
              (item) => Object.keys(item).length > 0
            ),
          });
        }
      } else {
        setHrgData({ records: [] });
      }

      // Handle FOM data properly
      if (rowData.fomData && clientServices.includes("FOM")) {
        if (Array.isArray(rowData.fomData)) {
          setFomData({ records: rowData.fomData });
        } else if (rowData.fomData.records) {
          setFomData(rowData.fomData);
        } else {
          setFomData({
            records: [rowData.fomData].filter(
              (item) => Object.keys(item).length > 0
            ),
          });
        }
      } else {
        setFomData({ records: [] });
      }

      // Handle CAL data properly
      if (rowData.calData && clientServices.includes("CAL")) {
        if (Array.isArray(rowData.calData)) {
          setCalData({ records: rowData.calData });
        } else if (rowData.calData.records) {
          setCalData(rowData.calData);
        } else {
          setCalData({
            records: [rowData.calData].filter(
              (item) => Object.keys(item).length > 0
            ),
          });
        }
      } else {
        setCalData({ records: [] });
      }

      // Handle SPack data properly (support spackData, spackHistory, or boolean spack)
      const inputSpack =
        rowData.spackData ?? rowData.spackHistory ?? rowData.spack;
      if (inputSpack) {
        if (Array.isArray(inputSpack)) {
          setSpackData({ records: inputSpack });
          setSpackEnabled(true);
        } else if (inputSpack.records && Array.isArray(inputSpack.records)) {
          setSpackData(inputSpack);
          setSpackEnabled(true);
        } else if (typeof inputSpack === "object") {
          setSpackData({
            records: [inputSpack].filter(
              (item) => Object.keys(item).length > 0
            ),
          });
          setSpackEnabled(true);
        } else if (typeof inputSpack === "boolean") {
          setSpackEnabled(!!inputSpack);
          setSpackData({ records: [] });
        } else {
          setSpackData({ records: [] });
          setSpackEnabled(false);
        }
      } else {
        setSpackData({ records: [] });
        setSpackEnabled(false);
      }

      // Handle RTS data properly (support rtsData, rtsHistory, rts)
      const inputRts = rowData.rtsData ?? rowData.rtsHistory ?? rowData.rts;
      if (inputRts) {
        if (Array.isArray(inputRts)) {
          setRtsData({ records: inputRts });
        } else if (inputRts.records && Array.isArray(inputRts.records)) {
          setRtsData(inputRts);
        } else if (typeof inputRts === "object") {
          setRtsData({
            records: [inputRts].filter((item) => Object.keys(item).length > 0),
          });
        } else {
          setRtsData({ records: [] });
        }
      } else {
        setRtsData({ records: [] });
      }
    }
  }, [rowData]);

  const closeModal = () => {
    setShowModal(false);
    onClose();
  };

  const handleEditClick = () => {
    // Determine the correct subscription type based on available data
    let subscriptionType = "None"; // Default to None when no data exists

    // Check which subscription data exists and has records
    if (promoData && promoData.records && promoData.records.length > 0) {
      subscriptionType = "Promo";
    } else if (compData && compData.records && compData.records.length > 0) {
      subscriptionType = "Complimentary";
    } else if (wmmData && wmmData.records && wmmData.records.length > 0) {
      subscriptionType = "WMM";
    }

    // Ensure subscription data is properly structured before passing to edit
    const editData = {
      ...formData,
      subscriptionType: subscriptionType, // Set the correct subscription type
      wmmData: wmmData,
      promoData: promoData,
      complimentaryData: compData,
      hrgData: hrgData,
      fomData: fomData,
      calData: calData,
      spackData: spackData,
      rtsData: rtsData,
    };
    setFormData(editData);
    setIsEditing(true);
  };

  const handleEditClose = () => {
    setIsEditing(false);
  };

  const handleEditSuccess = (updatedData) => {
    // Determine the correct subscription type based on available data
    let subscriptionType = "None"; // Default to None when no data exists

    // Check which subscription data exists and has records
    if (
      updatedData.promoData &&
      ((updatedData.promoData.records &&
        updatedData.promoData.records.length > 0) ||
        (Array.isArray(updatedData.promoData) &&
          updatedData.promoData.length > 0) ||
        (typeof updatedData.promoData === "object" &&
          Object.keys(updatedData.promoData).length > 0))
    ) {
      subscriptionType = "Promo";
    } else if (
      updatedData.compData &&
      ((updatedData.compData.records &&
        updatedData.compData.records.length > 0) ||
        (Array.isArray(updatedData.compData) &&
          updatedData.compData.length > 0) ||
        (typeof updatedData.compData === "object" &&
          Object.keys(updatedData.compData).length > 0))
    ) {
      subscriptionType = "Complimentary";
    } else if (
      updatedData.wmmData &&
      ((updatedData.wmmData.records &&
        updatedData.wmmData.records.length > 0) ||
        (Array.isArray(updatedData.wmmData) &&
          updatedData.wmmData.length > 0) ||
        (typeof updatedData.wmmData === "object" &&
          Object.keys(updatedData.wmmData).length > 0))
    ) {
      subscriptionType = "WMM";
    }

    // Update formData with the base client data and correct subscription type
    setFormData({
      ...updatedData,
      subscriptionType: subscriptionType,
    });

    // Determine which services this client actually has
    const clientServices = updatedData.services || [];

    // Handle subscription data properly
    if (updatedData.wmmData && clientServices.includes("WMM")) {
      // Ensure wmmData is properly formatted
      if (Array.isArray(updatedData.wmmData)) {
        setWmmData(updatedData.wmmData);
      } else if (
        updatedData.wmmData.records &&
        Array.isArray(updatedData.wmmData.records)
      ) {
        setWmmData(updatedData.wmmData.records);
      } else {
        // Handle case where wmmData is a single object
        setWmmData(
          [updatedData.wmmData].filter((item) => Object.keys(item).length > 0)
        );
      }
    } else {
      setWmmData([]);
    }

    // Update HRG data if present and client has HRG service
    if (updatedData.hrgData && clientServices.includes("HRG")) {
      // Handle different possible formats consistently
      if (Array.isArray(updatedData.hrgData)) {
        setHrgData({ records: updatedData.hrgData });
      } else if (
        updatedData.hrgData.records &&
        Array.isArray(updatedData.hrgData.records)
      ) {
        setHrgData(updatedData.hrgData);
      } else {
        // Handle case where hrgData is a single object
        setHrgData({
          records: [updatedData.hrgData].filter(
            (item) => Object.keys(item).length > 0
          ),
        });
      }
    } else {
      setHrgData({ records: [] });
    }

    // Update FOM data if present and client has FOM service OR if there's valid FOM data
    if (
      (updatedData.fomData && clientServices.includes("FOM")) ||
      (updatedData.fomData &&
        updatedData.fomData.records &&
        updatedData.fomData.records.length > 0)
    ) {
      // Handle different possible formats consistently
      if (Array.isArray(updatedData.fomData)) {
        setFomData({ records: updatedData.fomData });
      } else if (
        updatedData.fomData.records &&
        Array.isArray(updatedData.fomData.records)
      ) {
        setFomData(updatedData.fomData);
      } else {
        // Handle case where fomData is a single object
        setFomData({
          records: [updatedData.fomData].filter(
            (item) => Object.keys(item).length > 0
          ),
        });
      }
    } else {
      setFomData({ records: [] });
    }

    // Update CAL data if present and client has CAL service
    if (updatedData.calData && clientServices.includes("CAL")) {
      // Handle different possible formats consistently
      if (Array.isArray(updatedData.calData)) {
        setCalData({ records: updatedData.calData });
      } else if (
        updatedData.calData.records &&
        Array.isArray(updatedData.calData.records)
      ) {
        setCalData(updatedData.calData);
      } else {
        // Handle case where calData is a single object
        setCalData({
          records: [updatedData.calData].filter(
            (item) => Object.keys(item).length > 0
          ),
        });
      }
    } else {
      setCalData({ records: [] });
    }

    // Update SPack data if present (do not rely on services gating) - supports spackHistory and boolean spack
    if (
      updatedData.spackData ||
      updatedData.spackHistory ||
      typeof updatedData.spack === "boolean"
    ) {
      const inputSpack =
        updatedData.spackData ?? updatedData.spackHistory ?? updatedData.spack;
      if (Array.isArray(inputSpack)) {
        setSpackData({ records: inputSpack });
        setSpackEnabled(true);
      } else if (
        inputSpack &&
        inputSpack.records &&
        Array.isArray(inputSpack.records)
      ) {
        setSpackData(inputSpack);
        setSpackEnabled(true);
      } else if (typeof inputSpack === "boolean") {
        setSpackEnabled(!!inputSpack);
        setSpackData({ records: [] });
      } else if (inputSpack && typeof inputSpack === "object") {
        setSpackData({
          records: [inputSpack].filter((item) => Object.keys(item).length > 0),
        });
        setSpackEnabled(true);
      } else {
        setSpackData({ records: [] });
        setSpackEnabled(false);
      }
    } else {
      setSpackData({ records: [] });
      setSpackEnabled(false);
    }

    // Update RTS data if present (do not rely on services gating) - supports rtsHistory
    if (updatedData.rtsData || updatedData.rtsHistory || updatedData.rts) {
      const inputRts =
        updatedData.rtsData ?? updatedData.rtsHistory ?? updatedData.rts;
      if (Array.isArray(inputRts)) {
        setRtsData({ records: inputRts });
      } else if (inputRts.records && Array.isArray(inputRts.records)) {
        setRtsData(inputRts);
      } else {
        setRtsData({
          records: [inputRts].filter((item) => Object.keys(item).length > 0),
        });
      }
    } else {
      setRtsData({ records: [] });
    }

    setIsEditing(false);

    // Pass the updated data to any parent component that needs it
    if (onEditSuccess) {
      onEditSuccess(updatedData);
    }
    // Also close the View modal after a successful edit
    closeModal();
  };

  const renderField = (label, value) => {
    // Special handling for address field to preserve line breaks
    if (label === "Address") {
      return (
        <div className="mb-2">
          <span className="text-black text-lg font-bold">{label}:</span>{" "}
          <span className="text-black text-lg whitespace-pre-line">
            {value}
          </span>
        </div>
      );
    }

    // Default rendering for other fields
    return (
      <div className="mb-2">
        <span className="text-black text-lg font-bold">{label}:</span>{" "}
        <span className="text-black text-lg">{value}</span>
      </div>
    );
  };

  const renderSection = (title, fields) => (
    <div className="flex flex-col mb-2 p-2">
      <h1 className="text-black text-xl mb-2 font-bold">{title}</h1>
      {fields.map((field, index) => (
        <div key={index}>{renderField(field.label, formData[field.name])}</div>
      ))}
    </div>
  );

  const formatDate = (date) => {
    if (!date) return "N/A";

    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        // If we can't parse it as a date, just return the original value
        return String(date);
      }
      return dateObj.toLocaleDateString("en-US"); // Adjust locale as needed
    } catch (error) {
      console.warn("Error formatting date:", error);
      return String(date); // Return the original input as a string
    }
  };

  // Format date+time in Philippines timezone (Asia/Manila)
  const formatDateTime = (date) => {
    if (!date) return "N/A";
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return String(date);
      return dateObj.toLocaleString("en-US", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch (err) {
      console.warn("Error formatting datetime:", err);
      return String(date);
    }
  };

  // Determine whether to show edited metadata: require an edit user and an edit date
  // and ensure the edit date is meaningfully different from the add date (not the same moment)
  const shouldShowEdit = (adddate, editdate, edituser) => {
    if (!edituser || !editdate) return false;

    try {
      const edit = new Date(editdate);
      if (isNaN(edit.getTime())) return true; // If editdate isn't parseable, show it if edituser exists

      if (!adddate) return true; // No adddate to compare -> show

      const added = new Date(adddate);
      if (isNaN(added.getTime())) {
        // If adddate is probably a YYYY-MM-DD string, parse as that day start
        const parts = String(adddate).split(" ")[0];
        const d = new Date(parts);
        if (!isNaN(d.getTime())) {
          // if edit is later than the start of add date, show
          return edit.getTime() > d.getTime();
        }
        return true;
      }

      // Consider it an edit only if timestamps differ by more than 1 second
      return Math.abs(edit.getTime() - added.getTime()) > 1000;
    } catch (err) {
      return true;
    }
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

  // Role color helpers to align with Add/Edit UI
  const getRoleHeaderClasses = (role) => {
    switch (role) {
      case "HRG":
        return "bg-[#C0ABFF] text-black";
      case "FOM":
        return "bg-[#8AFF8A] text-black";
      case "CAL":
        return "bg-[#93C5FD] text-black";
      default:
        return "bg-blue-600 text-white";
    }
  };

  const getRoleFullName = (role) => {
    switch (role) {
      case "HRG":
        return "Holy Redeemer Guild";
      case "FOM":
        return "Friends of the Mission";
      case "CAL":
        return "Calendar";
      default:
        return role;
    }
  };

  // Function to get subscription type styles
  const getSubscriptionTypeStyles = (type) => {
    switch (type) {
      case "Promo":
        return {
          headerClass: "bg-emerald-500 text-white",
        };
      case "Complimentary":
        return {
          headerClass: "bg-purple-500 text-white",
        };
      case "None":
        return {
          headerClass: "bg-gray-500 text-white",
        };
      default: // WMM
        return {
          headerClass: "bg-blue-500 text-white",
        };
    }
  };

  const renderSubscriptionData = (data, type) => {
    const subscriptionData = data?.records || [];

    // Check if subscription data exists and has items
    if (!subscriptionData || subscriptionData.length === 0) {
      return (
        <div className="p-4">
          <p className="text-center">
            No {type.toLowerCase()} subscription data available
          </p>
        </div>
      );
    }

    // Sort subscription data by subsdate in descending order (latest to oldest)
    const sortedData = [...subscriptionData].sort((a, b) => {
      if (!a.subsdate) return 1;
      if (!b.subsdate) return -1;

      const dateA = new Date(a.subsdate);
      const dateB = new Date(b.subsdate);

      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;

      return dateB - dateA;
    });

    return (
      <div className="flex flex-col space-y-2 overflow-auto h-[250px] w-full">
        {sortedData.map((subscription, index) => {
          if (
            !subscription ||
            typeof subscription !== "object" ||
            Object.keys(subscription).length === 0
          ) {
            return null;
          }

          const status = getSubscriptionStatus(subscription.enddate);
          const statusClass = getStatusColorClass(status);
          const statusIndicator = getStatusIndicator(status);
          const addUserValue =
            subscription.adduser ||
            subscription.addUser ||
            subscription.add_user;

          return (
            <div key={index} className="border-b border-gray-200 pb-2 mb-2">
              <div className="flex flex-col">
                <div className="flex space-x-1">
                  <span className={statusClass}>
                    {statusIndicator}
                    <span className="font-bold">
                      {subscription.subsclass || ""}
                    </span>
                    : {formatDate(subscription.subsdate || new Date())} -{" "}
                    {formatDate(subscription.enddate || new Date())} Cps:{" "}
                    {subscription.copies || "1"}
                  </span>
                </div>

                {/* Calendar Status */}
                {index === 0 && (
                  <div className="text-xs ml-4 mt-1">
                    {subscription.calendar ? (
                      <span className="text-white bg-orange-400 px-2 py-0.5 rounded-full font-medium">
                        Calendar ✓
                      </span>
                    ) : (
                      <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        No Calendar
                      </span>
                    )}
                  </div>
                )}

                {/* Payment details - Only show for WMM type */}
                {formData.subscriptionType === "WMM" &&
                  subscription.paymtref && (
                    <div className="mt-1 pl-4 text-sm">
                      <div className="grid grid-cols-2 gap-x-4">
                        <div>
                          <span className="font-semibold">Payment Ref:</span>{" "}
                          <span>{subscription.paymtref}</span>
                        </div>
                        <div>
                          <span className="font-semibold">Amount:</span>{" "}
                          <span>{subscription.paymtamt || "0"}</span>
                        </div>
                        {subscription.paymtmasses && (
                          <div>
                            <span className="font-semibold">Masses:</span>{" "}
                            <span>{subscription.paymtmasses}</span>
                          </div>
                        )}
                        {subscription.donorid && (
                          <div>
                            <span className="font-semibold">Donor ID:</span>{" "}
                            <span>{subscription.donorid}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                {/* Referral ID - Only show for Promo type */}
                {formData.subscriptionType === "Promo" &&
                  subscription.referralid && (
                    <div className="mt-1 pl-4 text-sm">
                      <span className="font-semibold">Referral ID:</span>{" "}
                      <span>{subscription.referralid}</span>
                    </div>
                  )}

                {/* Remarks - Collapsible to save space */}
                {subscription.remarks && (
                  <div className="mt-1 pl-4 text-sm space-y-1">
                    {(() => {
                      const itemKey = `${type}-${index}`;
                      const isExpanded = !!expandedSubs[itemKey];
                      const remarksText = String(subscription.remarks || "");
                      const shouldTruncate = remarksText.length > 120;
                      const displayText =
                        !shouldTruncate || isExpanded
                          ? remarksText
                          : `${remarksText.slice(0, 120)}...`;
                      return (
                        <div>
                          <div className="text-gray-700">
                            <span className="font-semibold">Remark:</span>{" "}
                            <span>{displayText}</span>
                            {shouldTruncate && (
                              <button
                                type="button"
                                className="ml-2 text-blue-600 hover:underline"
                                onClick={() =>
                                  setExpandedSubs((prev) => ({
                                    ...prev,
                                    [itemKey]: !isExpanded,
                                  }))
                                }
                              >
                                {isExpanded ? "Less" : "More"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
                <div className="flex">
                  {subscription.adddate && (
                    <div className="mt-1 pl-4 text-sm">
                      <span className="font-semibold">Added:</span>{" "}
                      <span>{formatDate(subscription.adddate)}</span>
                      {addUserValue && (
                        <span>
                          {" "}
                          by{" "}
                          <span className="font-semibold">{addUserValue}</span>
                        </span>
                      )}
                    </div>
                  )}
                  {shouldShowEdit(
                    subscription.adddate,
                    subscription.editdate,
                    subscription.edituser
                  ) && (
                    <div className="mt-1 pl-4 text-sm">
                      <span className="font-semibold">Edited:</span>{" "}
                      <span>{formatDateTime(subscription.editdate)}</span>
                      {subscription.edituser && (
                        <span>
                          {" "}
                          by{" "}
                          <span className="font-semibold">
                            {subscription.edituser}
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderHrgData = () => {
    if (!hrgData || !hrgData.records || hrgData.records.length === 0)
      return null;

    const sortedHrgData = [...hrgData.records].sort((a, b) => {
      // Handle missing recvdate values
      if (!a.recvdate) return 1;
      if (!b.recvdate) return -1;

      const dateA = new Date(a.recvdate || 0);
      const dateB = new Date(b.recvdate || 0);
      return dateB - dateA;
    });

    // Support filtered records like in the table view
    const filteredRecords =
      hrgData.filteredRecords || hrgData.matchedRecords || null;
    const isShowingFilteredRecords =
      filteredRecords &&
      Array.isArray(filteredRecords) &&
      filteredRecords.length > 0;
    const recordsToDisplay = isShowingFilteredRecords
      ? [...filteredRecords].sort((a, b) => {
          const dateA = new Date(a.recvdate || 0);
          const dateB = new Date(b.recvdate || 0);
          return dateB - dateA;
        })
      : sortedHrgData;

    // Latest status header (Active/Unsubscribed) similar to clientColumn
    const latestRecord = recordsToDisplay[0];
    const latestStatus = formData.subscriptionStatusOverride
      ? formData.subscriptionStatusOverride === "active"
        ? "Active"
        : "Unsubscribed"
      : latestRecord && latestRecord.unsubscribe
      ? "Unsubscribed"
      : "Active";
    const statusColor =
      latestStatus === "Active" ? "text-green-600" : "text-red-600";
    const statusIcon = latestStatus === "Active" ? "🟢" : "🔴";

    return (
      <div className="flex flex-col mb-2 p-2">
        <div className="flex flex-col space-y-2 overflow-auto h-[150px] w-full">
          {isShowingFilteredRecords && (
            <div className="mb-2 p-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 font-medium">
              🔍 Showing filtered records ({recordsToDisplay.length} of{" "}
              {(hrgData.records || []).length})
            </div>
          )}
          <div className="flex items-center gap-2 mb-2">
            <span className={statusColor}>{statusIcon}</span>
            <span className={statusColor}>{latestStatus}</span>
          </div>
          {recordsToDisplay.map((record, index) => {
            // Skip rendering if record is empty or not an object
            if (!record || typeof record !== "object") {
              return null;
            }

            return (
              <div
                key={index}
                className="mb-1 text-base border-b border-gray-300 pb-2"
              >
                <div className="font-medium">
                  Campaign Date:{" "}
                  {record.campaigndate
                    ? formatDate(record.campaigndate)
                    : "N/A"}{" "}
                </div>
                <div className="font-medium">
                  Receive Date:{" "}
                  {record.recvdate ? formatDate(record.recvdate) : "N/A"}{" "}
                </div>
                <div className="font-medium">
                  {record.paymtamt ? `Php ${record.paymtamt}` : "No amount"}
                  {record.paymtform ? ` - Form: ${record.paymtform}` : ""}
                  {record.paymtref ? ` - Ref: #${record.paymtref}` : ""}
                </div>
                {record.remarks && (
                  <div className="mt-1 text-sm text-gray-600">
                    <span className="font-semibold">Remarks:</span>{" "}
                    {record.remarks}
                  </div>
                )}
                <div className="flex">
                  {record.adddate && (
                    <div className="mt-1 text-sm">
                      <span className="font-semibold">Added:</span>{" "}
                      <span>{formatDate(record.adddate)}</span>
                      {record.adduser && (
                        <span>
                          {" "}
                          by{" "}
                          <span className="font-semibold">
                            {record.adduser}
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                  {shouldShowEdit(
                    record.adddate,
                    record.editdate,
                    record.edituser
                  ) && (
                    <div className="mt-1 pl-4 text-sm">
                      <span className="font-semibold">Edited:</span>{" "}
                      <span>{formatDateTime(record.editdate)}</span>
                      {record.edituser && (
                        <span>
                          {" "}
                          by{" "}
                          <span className="font-semibold">
                            {record.edituser}
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderFomData = () => {
    if (!fomData || !fomData.records || fomData.records.length === 0)
      return null;

    const sortedFomData = [...fomData.records].sort((a, b) => {
      // Handle missing recvdate values
      if (!a.recvdate) return 1;
      if (!b.recvdate) return -1;

      const dateA = new Date(a.recvdate || 0);
      const dateB = new Date(b.recvdate || 0);
      return dateB - dateA;
    });

    // Support filtered records like in the table view
    const filteredRecords =
      fomData.filteredRecords || fomData.matchedRecords || null;
    const isShowingFilteredRecords =
      filteredRecords &&
      Array.isArray(filteredRecords) &&
      filteredRecords.length > 0;
    const recordsToDisplay = isShowingFilteredRecords
      ? [...filteredRecords].sort((a, b) => {
          const dateA = new Date(a.recvdate || 0);
          const dateB = new Date(b.recvdate || 0);
          return dateB - dateA;
        })
      : sortedFomData;

    // Latest status header (Active/Unsubscribed) similar to clientColumn
    const latestRecord = recordsToDisplay[0];
    const latestStatus = formData.subscriptionStatusOverride
      ? formData.subscriptionStatusOverride === "active"
        ? "Active"
        : "Unsubscribed"
      : latestRecord && latestRecord.unsubscribe
      ? "Unsubscribed"
      : "Active";
    const statusColor =
      latestStatus === "Active" ? "text-green-600" : "text-red-600";
    const statusIcon = latestStatus === "Active" ? "🟢" : "🔴";

    return (
      <div className="flex flex-col mb-2 p-2">
        <div className="flex flex-col space-y-2 overflow-auto h-[150px] w-full">
          {isShowingFilteredRecords && (
            <div className="mb-2 p-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 font-medium">
              🔍 Showing filtered records ({recordsToDisplay.length} of{" "}
              {(fomData.records || []).length})
            </div>
          )}
          <div className="flex items-center gap-2 mb-2">
            <span className={statusColor}>{statusIcon}</span>
            <span className={statusColor}>{latestStatus}</span>
          </div>
          {recordsToDisplay.map((record, index) => {
            // Skip rendering if record is empty or not an object
            if (!record || typeof record !== "object") {
              return null;
            }

            return (
              <div
                key={index}
                className="mb-1 text-base border-b border-gray-300 pb-2"
              >
                <div className="font-medium">
                  Receive Date:{" "}
                  {record.recvdate ? formatDate(record.recvdate) : "N/A"}{" "}
                </div>
                <div className="font-medium">
                  {record.paymtamt ? `Php ${record.paymtamt}` : "No amount"}
                  {record.paymtform ? ` - Form: ${record.paymtform}` : ""}
                  {record.paymtref ? ` - Ref: #${record.paymtref}` : ""}
                </div>
                {record.remarks && (
                  <div className="mt-1 text-sm text-gray-600">
                    <span className="font-semibold">Remarks:</span>{" "}
                    {record.remarks}
                  </div>
                )}
                <div className="flex">
                  {record.adddate && (
                    <div className="mt-1 text-sm">
                      <span className="font-semibold">Added:</span>{" "}
                      <span>{formatDate(record.adddate)}</span>
                      {record.adduser && (
                        <span>
                          {" "}
                          by{" "}
                          <span className="font-semibold">
                            {record.adduser}
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                  {shouldShowEdit(
                    record.adddate,
                    record.editdate,
                    record.edituser
                  ) && (
                    <div className="mt-1 pl-4 text-sm">
                      <span className="font-semibold">Edited:</span>{" "}
                      <span>{formatDateTime(record.editdate)}</span>
                      {record.edituser && (
                        <span>
                          {" "}
                          by{" "}
                          <span className="font-semibold">
                            {record.edituser}
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCalData = () => {
    if (!calData || !calData.records || calData.records.length === 0)
      return null;

    const sortedCalData = [...calData.records].sort((a, b) => {
      // Handle missing recvdate values
      if (!a.recvdate) return 1;
      if (!b.recvdate) return -1;

      const dateA = new Date(a.recvdate || 0);
      const dateB = new Date(b.recvdate || 0);
      return dateB - dateA;
    });

    return (
      <div className="flex flex-col mb-2 p-2">
        <div className="flex flex-col space-y-2 overflow-auto h-[150px] w-full">
          {sortedCalData.map((record, index) => {
            // Skip rendering if record is empty or not an object
            if (!record || typeof record !== "object") {
              return null;
            }

            // Safely calculate total using calamt (unit cost) and calqty
            const calQty = parseFloat(record.calqty || 0);
            const unitCost = parseFloat(record.calamt || 0);
            const totalAmount =
              isNaN(calQty) || isNaN(unitCost) ? 0 : calQty * unitCost;

            return (
              <div
                key={index}
                className="mb-1 text-base border-b border-gray-300 pb-2"
              >
                <div className="font-medium">
                  {record.recvdate ? formatDate(record.recvdate) : "N/A"} |{" "}
                  {record.caltype || "N/A"}
                </div>
                <div className="font-medium">
                  Qty: {record.calqty || "0"} - Unit:{" "}
                  {isNaN(unitCost) ? "0" : unitCost} = Php{" "}
                  {totalAmount.toFixed(2)}
                  {record.paymtref ? ` - Ref: #${record.paymtref}` : ""}
                </div>
                {record.remarks && (
                  <div className="mt-1 text-sm text-gray-600">
                    <span className="font-semibold">Remarks:</span>{" "}
                    {record.remarks}
                  </div>
                )}
                <div className="flex">
                  {record.adddate && (
                    <div className="mt-1 text-sm">
                      <span className="font-semibold">Added:</span>{" "}
                      <span>{formatDate(record.adddate)}</span>
                      {record.adduser && (
                        <span>
                          {" "}
                          by{" "}
                          <span className="font-semibold">
                            {record.adduser}
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                  {(record.editdate || record.edituser) && (
                    <div className="mt-1 pl-4 text-sm">
                      <span className="font-semibold">Edited:</span>{" "}
                      <span>{formatDate(record.editdate)}</span>
                      {record.edituser && (
                        <span>
                          {" "}
                          by{" "}
                          <span className="font-semibold">
                            {record.edituser}
                          </span>
                        </span>
                      )}
                    </div>
                  )}
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
        <Modal isOpen={showModal} onClose={closeModal}>
          {isEditing ? (
            <Edit
              rowData={formData}
              onClose={handleEditClose}
              onEditSuccess={handleEditSuccess}
            />
          ) : (
            <>
              <div className="flex justify-between items-center">
                <div className="flex flex-col justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold text-black">
                    Client Information ID: {formData.id}
                  </h2>
                  <div className="flex gap-4 text-base mt-2">
                    {formData.adddate && (
                      <div>
                        <span className="font-semibold">Added:</span>{" "}
                        <span>{formatDate(formData.adddate)}</span>
                        {formData.adduser && (
                          <span>
                            {" "}
                            by{" "}
                            <span className="font-semibold">
                              {formData.adduser}
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                    {shouldShowEdit(
                      formData.adddate,
                      formData.editdate,
                      formData.edituser
                    ) && (
                      <div>
                        <span className="font-semibold">Edited:</span>{" "}
                        <span>{formatDateTime(formData.editdate)}</span>
                        {formData.edituser && (
                          <span>
                            {" "}
                            by{" "}
                            <span className="font-semibold">
                              {formData.edituser}
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mb-2 flex items-center gap-2">
                  {typeof formData.rtsCount !== "undefined" && (
                    <span
                      className={`px-3 py-1 rounded-full text-base font-medium ${
                        formData.rtsCount > 0
                          ? formData.rtsMaxReached
                            ? "bg-red-100 text-red-800"
                            : "bg-orange-100 text-orange-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      RTS: {formData.rtsCount}
                    </span>
                  )}
                  {(spackEnabled || formData.spack === true) && (
                    <span className="px-3 py-1 rounded-full text-base font-medium bg-amber-100 text-amber-800">
                      SPack
                    </span>
                  )}
                </div>
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

                {/* Subscription & Payment History Cards */}
                {/* WMM Data */}
                {wmmData.records?.length > 0 && (
                  <div className="p-4 border rounded-lg shadow-sm col-span-1 sm:col-span-2">
                    <div
                      className={`flex justify-between items-center mb-4 p-2 rounded-lg ${
                        getSubscriptionTypeStyles("WMM").headerClass
                      }`}
                    >
                      <h2 className="text-lg font-bold">
                        Subscription & Payment History
                      </h2>
                    </div>
                    {renderSubscriptionData(wmmData, "WMM")}
                  </div>
                )}

                {/* Promo Data */}
                {promoData.records?.length > 0 && (
                  <div className="p-4 border rounded-lg shadow-sm col-span-1 sm:col-span-2">
                    <div
                      className={`flex justify-between items-center mb-4 p-2 rounded-lg ${
                        getSubscriptionTypeStyles("Promo").headerClass
                      }`}
                    >
                      <h2 className="text-lg font-bold">
                        Promo Subscription History
                      </h2>
                    </div>
                    {renderSubscriptionData(promoData, "Promo")}
                  </div>
                )}

                {/* Complimentary Data */}
                {compData.records?.length > 0 && (
                  <div className="p-4 border rounded-lg shadow-sm col-span-1 sm:col-span-2">
                    <div
                      className={`flex justify-between items-center mb-4 p-2 rounded-lg ${
                        getSubscriptionTypeStyles("Complimentary").headerClass
                      }`}
                    >
                      <h2 className="text-lg font-bold">
                        Complimentary Subscription History
                      </h2>
                    </div>
                    {renderSubscriptionData(compData, "Complimentary")}
                  </div>
                )}

                {/* Always render HRG, FOM, and CAL data at the bottom */}
                {(hrgData.records?.length > 0 ||
                  fomData.records?.length > 0 ||
                  calData.records?.length > 0) && (
                  <div className="border border-gray-300 rounded-lg shadow-sm p-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 col-span-3">
                    {/* HRG Data Card */}
                    {hrgData.records?.length > 0 && (
                      <div>
                        <h2
                          className={`${getRoleHeaderClasses(
                            "HRG"
                          )} p-2 font-bold text-center text-lg rounded mb-4`}
                        >
                          {getRoleFullName("HRG")}
                        </h2>
                        {renderHrgData()}
                      </div>
                    )}

                    {/* FOM Data Card */}
                    {fomData.records?.length > 0 && (
                      <div>
                        <h2
                          className={`${getRoleHeaderClasses(
                            "FOM"
                          )} p-2 font-bold text-center text-lg rounded mb-4`}
                        >
                          {getRoleFullName("FOM")}
                        </h2>
                        {renderFomData()}
                      </div>
                    )}

                    {/* CAL Data Card */}
                    {calData.records?.length > 0 && (
                      <div>
                        <h2
                          className={`${getRoleHeaderClasses(
                            "CAL"
                          )} p-2 font-bold text-center text-lg rounded mb-4`}
                        >
                          {getRoleFullName("CAL")}
                        </h2>
                        {renderCalData()}
                      </div>
                    )}
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
