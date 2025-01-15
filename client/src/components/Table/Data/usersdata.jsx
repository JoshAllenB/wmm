import axios from "axios";
import { BACKEND_URL } from "../../../config";

export const fetchUsers = async () => {
  try {
    const response = await axios.get(`http://${BACKEND_URL}:3001/users`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    });
    const { users, currentUser } = response.data;

    const formattedUsers = users.map((user) => ({
      ...user,
      status: user.status || "Inactive",
      role:
        user.roles && user.roles.length > 0
          ? user.roles.map((r) => r.role?.name || "Unknown Role").join(", ")
          : "No Role",
      permissions:
        user.roles && user.roles.length > 0
          ? user.roles.flatMap((r) => [
              ...(r.role?.defaultPermissions?.map((p) => p.name) || []),
              ...(r.customPermissions?.map((p) => p.name) || []),
            ])
          : [],
    }));

    const formattedCurrentUser = currentUser
      ? {
          ...currentUser,
          role:
            currentUser.roles && currentUser.roles.length > 0
              ? currentUser.roles
                  .map((r) => r.role?.name || "Unknown Role")
                  .join(", ")
              : "No Role",
          permissions:
            currentUser.roles && currentUser.roles.length > 0
              ? currentUser.roles.flatMap((r) => [
                  ...(r.role?.defaultPermissions?.map((p) => p.name) || []),
                  ...(r.customPermissions?.map((p) => p.name) || []),
                ])
              : [],
        }
      : null;

    return [formattedUsers, formattedCurrentUser];
  } catch (err) {
    console.error("Error fetching user data:", err);
    return [[], null];
  }
};
