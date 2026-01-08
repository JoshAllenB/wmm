// Utility function to clean trailing spaces from date input values
const cleanDateInput = (value) => {
  if (typeof value === "string") {
    return value.trim();
  }
  return value;
};

// Format date for WMM
const formatDateForWMM = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Format date for Promo
const formatDateForPromo = (date) => {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
};

// Get subscription-specific data based on subscription type
export const getSubscriptionSpecificData = (
  subscriptionType,
  formData,
  roleSpecificData
) => {
  const baseData = {
    subsyear:
      formData.subscriptionFreq && formData.subscriptionFreq !== "others"
        ? parseInt(formData.subscriptionFreq)
        : 0,
    copies: parseInt(roleSpecificData.copies) || 1,
    remarks: roleSpecificData.remarks || "",
    calendar: roleSpecificData.calendar || false,
    subsclass: roleSpecificData.subsclass || "",
    // Note: adddate is set by backend when creating a new record. Do not send on edits.
  };

  // Format dates based on subscription type
  if (subscriptionType === "Promo") {
    return {
      ...baseData,
      subsdate:
        formData.subStartYear && formData.subStartMonth && formData.subStartDay
          ? formatDateForPromo(
              new Date(
                cleanDateInput(formData.subStartYear),
                cleanDateInput(formData.subStartMonth) - 1,
                cleanDateInput(formData.subStartDay)
              )
            )
          : "",
      enddate:
        formData.subEndYear && formData.subEndMonth && formData.subEndDay
          ? formatDateForPromo(
              new Date(
                cleanDateInput(formData.subEndYear),
                cleanDateInput(formData.subEndMonth) - 1,
                cleanDateInput(formData.subEndDay)
              )
            )
          : "",
      referralid: formData.referralid || 0,
    };
  } else if (subscriptionType === "Complimentary") {
    return {
      ...baseData,
      subsdate:
        formData.subStartYear && formData.subStartMonth && formData.subStartDay
          ? formatDateForWMM(
              new Date(
                cleanDateInput(formData.subStartYear),
                cleanDateInput(formData.subStartMonth) - 1,
                cleanDateInput(formData.subStartDay)
              )
            )
          : "",
      enddate:
        formData.subEndYear && formData.subEndMonth && formData.subEndDay
          ? formatDateForWMM(
              new Date(
                cleanDateInput(formData.subEndYear),
                cleanDateInput(formData.subEndMonth) - 1,
                cleanDateInput(formData.subEndDay)
              )
            )
          : "",
    };
  } else {
    // WMM
    return {
      ...baseData,
      subsdate:
        formData.subStartYear && formData.subStartMonth && formData.subStartDay
          ? formatDateForWMM(
              new Date(
                cleanDateInput(formData.subStartYear),
                cleanDateInput(formData.subStartMonth) - 1,
                cleanDateInput(formData.subStartDay)
              )
            )
          : "",
      enddate:
        formData.subEndYear && formData.subEndMonth && formData.subEndDay
          ? formatDateForWMM(
              new Date(
                cleanDateInput(formData.subEndYear),
                cleanDateInput(formData.subEndMonth) - 1,
                cleanDateInput(formData.subEndDay)
              )
            )
          : "",
      paymtref: roleSpecificData.paymtref || "",
      paymtamt: roleSpecificData.paymtamt || "",
      paymtmasses: roleSpecificData.paymtmasses || "",
      donorid:
        typeof roleSpecificData.donorid === "object" &&
        roleSpecificData.donorid !== null
          ? roleSpecificData.donorid._id || roleSpecificData.donorid.id
          : roleSpecificData.donorid || "",
    };
  }
};

// Get service from subscription type
export const getServiceFromSubscriptionType = (subscriptionType) => {
  switch (subscriptionType) {
    case "Promo":
      return "PROMO";
    case "Complimentary":
      return "COMP";
    default:
      return "WMM";
  }
};

// Check if subscription data has meaningful content
export const hasSubscriptionData = (formData, roleSpecificData) => {
  const hasStartDate =
    (formData.subStartYear && formData.subStartMonth && formData.subStartDay) ||
    (formData.subscriptionStart && formData.subscriptionStart.trim() !== "");
  const hasEndDate =
    (formData.subEndYear && formData.subEndMonth && formData.subEndDay) ||
    (formData.subscriptionEnd && formData.subscriptionEnd.trim() !== "");
  const hasFrequency =
    formData.subscriptionFreq && formData.subscriptionFreq !== "";
  const hasCopies = roleSpecificData.copies && roleSpecificData.copies > 1;
  const hasPaymentInfo =
    (roleSpecificData.paymtref !== undefined &&
      String(roleSpecificData.paymtref).trim() !== "") ||
    (roleSpecificData.paymtamt !== undefined &&
      roleSpecificData.paymtamt !== null &&
      String(roleSpecificData.paymtamt).trim() !== "") ||
    (roleSpecificData.paymtmasses !== undefined &&
      roleSpecificData.paymtmasses !== null &&
      String(roleSpecificData.paymtmasses).trim() !== "");

  const hasDonorId =
    roleSpecificData.donorid && String(roleSpecificData.donorid).trim() !== "";
  const hasReferralId =
    formData.referralid && formData.referralid.trim() !== "";
  const hasSubsclass =
    roleSpecificData.subsclass && roleSpecificData.subsclass.trim() !== "";

  return (
    hasStartDate ||
    hasEndDate ||
    hasFrequency ||
    hasCopies ||
    hasPaymentInfo ||
    hasDonorId ||
    hasReferralId ||
    hasSubsclass
  );
};
