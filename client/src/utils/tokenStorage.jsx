export const setToken = (token) => {
  localStorage.setItem("token", token);
  sessionStorage.setItem("token", token);
};

export const getToken = () => {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
};

export const removeToken = () => {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
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
