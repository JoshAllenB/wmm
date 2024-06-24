export const setToken = (token) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("token", token);
    sessionStorage.setItem("token", token);
  }
};

export const getToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
  }
  return null;
};

export const removeToken = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
  }
};

export const syncToken = () => {
  const localToken = localStorage.getItem("token");
  const sessionToken = sessionStorage.getItem("token");

  if (localToken && !sessionToken) {
    sessionStorage.setItem("token", localToken);
  } else if (!localToken && sessionToken) {
    localStorage.setItem("token", sessionToken);
  }
};
