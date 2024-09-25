import { useCallback } from "react";
import { createContext, useState, useContext } from "react";

const UserContext = createContext();

export const UserProvider = ({ children, initialUserData }) => {
  const [userData, setUserData] = useState(initialUserData);

  const hasPermission = useCallback(
    (permission) => {
      if (!userData || !userData.permissions) return false;
      return userData.permissions.some((perm) => perm.name === permission);
    },
    [userData],
  );

  const hasRole = useCallback(
    (role) => {
      if (!userData || !userData.role || !userData.role.name) return false;
      return userData.role.name === role;
    },
    [userData],
  );

  return (
    <UserContext.Provider
      value={{ userData, setUserData, hasPermission, hasRole }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
