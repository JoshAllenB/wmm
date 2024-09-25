import axios from "axios";

export const fetchUsers = async () => {
  try {
    const response = await axios.get("http://localhost:3001/users", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    });
    const { users, currentUser } = response.data;

    const formattedUsers = users.map((user) => ({
      ...user,
      status: user.status || "Inactive",
      role: user.role, // Keep role without permissions
    }));

    const formattedCurrentUser = {
      ...currentUser,
      role: currentUser.role, // Keep role without permissions
    };

    return [formattedUsers, formattedCurrentUser]; // Return both values as an array
  } catch (err) {
    console.error("Error fetching user data:", err);
    return { users: [], currentUser: null };
  }
};
