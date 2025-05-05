import { useCallback } from "react";
import { createContext, useState, useContext } from "react";

const UserContext = createContext();

export const UserProvider = ({ children, initialUserData }) => {
  const [userData, setUserData] = useState(initialUserData);

  const hasPermission = useCallback(
    (permission) => {
      if (!userData || !userData.roles) return false;
      return userData.roles.some(
        (roleObj) =>
          roleObj.permissions && roleObj.permissions.includes(permission)
      );
    },
    [userData]
  );

  const hasRole = useCallback(
    (roleName) => {
      // Handle case where userData or userData.roles is not available
      if (!userData || !userData.roles || !Array.isArray(userData.roles)) {
        return false;
      }
      
      // Split the roleName if it's a comma-separated string
      const roleNames =
        typeof roleName === "string"
          ? roleName.split(",").map((r) => r.trim())
          : [roleName];
          
      // Check each role
      const result = userData.roles.some((roleObj) => {
        return roleNames.includes(roleObj.role);
      });
      
      return result;
    },
    [userData]
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
