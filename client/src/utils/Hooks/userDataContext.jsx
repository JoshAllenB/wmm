import React, { createContext, useContext, useState, useEffect } from "react";

const UserDataContext = createContext();

export const UserDataProvider = ({ children }) => {
  const [userData, setUserData] = useState({
    filtering: "",
    page: 1,
    pageSize: 20,
    selectedGroup: "",
  });

  // Log the userData whenever it changes
  useEffect(() => {
    console.log("UserData updated:", userData);
  }, [userData]);

  return (
    <UserDataContext.Provider value={{ userData, setUserData }}>
      {children}
    </UserDataContext.Provider>
  );
};

export const useUserData = () => {
  return useContext(UserDataContext);
};
