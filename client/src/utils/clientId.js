// Shared utilities for Client ID formatting and subscription type code mapping

export const formatClientId = (id, minDigits = 6) => {
  if (id === null || id === undefined) return "";
  const idStr = String(id);
  if (/^\d+$/.test(idStr) && idStr.length < minDigits) {
    return idStr.padStart(minDigits, "0");
  }
  return idStr;
};

export const getSubscriptionTypeCode = (subscriptionType) => {
  const t = (subscriptionType || "").toLowerCase();
  if (t === "promo") return "P";
  if (t === "complimentary") return "C";
  return "S";
};

export const formatClientIdWithType = (id, subscriptionType) => {
  const code = getSubscriptionTypeCode(subscriptionType);
  const padded = formatClientId(id);
  return padded ? `${padded} - ${code}` : `${padded}`;
};
