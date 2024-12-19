import axios from "axios";

export const fetchUsers = async () => {
  try {
    const response = await axios.get("http://localhost:3001/users", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    });
    const { users, currentUser } = response.data;

    console.log("Raw users data:", users);
    console.log("Raw current user data:", currentUser);

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

    console.log("Formatted users:", formattedUsers);
    console.log("Formatted current user:", formattedCurrentUser);
    return [formattedUsers, formattedCurrentUser];
  } catch (err) {
    console.error("Error fetching user data:", err);
    return [[], null];
  }
};
