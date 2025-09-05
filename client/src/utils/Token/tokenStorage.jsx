export const setTokens = (accessToken, refreshToken, tokenExpiresAt = null) => {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
  sessionStorage.setItem("accessToken", accessToken);
  sessionStorage.setItem("refreshToken", refreshToken);

  if (tokenExpiresAt) {
    localStorage.setItem("tokenExpiresAt", tokenExpiresAt);
    sessionStorage.setItem("tokenExpiresAt", tokenExpiresAt);
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
};
