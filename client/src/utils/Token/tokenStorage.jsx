// Format a Date into MM/DD/YY HH:MM:SS in Asia/Manila, matching backend tokenLogger
const formatManila = (date) => {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Manila",
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(date);

    const get = (t) => parts.find((p) => p.type === t)?.value || "";
    const yy = get("year");
    const mm = get("month");
    const dd = get("day");
    const HH = get("hour");
    const MM = get("minute");
    const SS = get("second");
    return `${mm}/${dd}/${yy} ${HH}:${MM}:${SS}`;
  } catch {
    return String(date);
  }
};

// Normalize various date inputs (exp seconds, ms, ISO string, Date) into a Date
const toDate = (value) => {
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    const ms = value < 1e12 ? value * 1000 : value; // treat < 10^12 as seconds
    return new Date(ms);
  }
  if (typeof value === "string") {
    // Try numeric first
    const asNum = Number(value);
    if (!Number.isNaN(asNum) && value.trim() !== "") {
      const ms = asNum < 1e12 ? asNum * 1000 : asNum;
      return new Date(ms);
    }
    // Fallback to Date parse (handles ISO)
    const d = new Date(value);
    return d;
  }
  return new Date(value);
};

export const setTokens = (accessToken, refreshToken, tokenExpiresAt = null) => {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
  sessionStorage.setItem("accessToken", accessToken);
  sessionStorage.setItem("refreshToken", refreshToken);

  if (tokenExpiresAt) {
    const dateObj = toDate(tokenExpiresAt);
    const isValid = !Number.isNaN(dateObj?.getTime?.());
    const formatted = isValid ? formatManila(dateObj) : String(tokenExpiresAt);
    localStorage.setItem("tokenExpiresAt", formatted);
    sessionStorage.setItem("tokenExpiresAt", formatted);
  }
};

export const getAccessToken = () => {
  return (
    localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken")
  );
};

export const getRefreshToken = () => {
  return (
    localStorage.getItem("refreshToken") ||
    sessionStorage.getItem("refreshToken")
  );
};

export const removeTokens = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("tokenExpiresAt");
  sessionStorage.removeItem("accessToken");
  sessionStorage.removeItem("refreshToken");
  sessionStorage.removeItem("tokenExpiresAt");
};

export const syncTokens = () => {
  const localAccessToken = localStorage.getItem("accessToken");
  const sessionAccessToken = sessionStorage.getItem("accessToken");
  const localRefreshToken = localStorage.getItem("refreshToken");
  const sessionRefreshToken = sessionStorage.getItem("refreshToken");
  const localExpiresAt = localStorage.getItem("tokenExpiresAt");
  const sessionExpiresAt = sessionStorage.getItem("tokenExpiresAt");

  if (localAccessToken && !sessionAccessToken) {
    sessionStorage.setItem("accessToken", localAccessToken);
  } else if (!localAccessToken && sessionAccessToken) {
    localStorage.setItem("accessToken", sessionAccessToken);
  }

  if (localRefreshToken && !sessionRefreshToken) {
    sessionStorage.setItem("refreshToken", localRefreshToken);
  } else if (!localRefreshToken && sessionRefreshToken) {
    localStorage.setItem("refreshToken", sessionRefreshToken);
  }

  if (localExpiresAt && !sessionExpiresAt) {
    sessionStorage.setItem("tokenExpiresAt", localExpiresAt);
  } else if (!localExpiresAt && sessionExpiresAt) {
    localStorage.setItem("tokenExpiresAt", sessionExpiresAt);
  }
};
