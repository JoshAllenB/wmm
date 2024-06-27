import axios from "axios";

export const fetchUsers = async () => {
  try {
    const response = await axios.get("http://localhost:3001/users", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    return response.data.map((user) => ({
      ...user,
      status: user.status.status || user.status, // Flatten the nested status field
    }));
  } catch (err) {
    console.error("Error fetching user data:", err);
    throw err;
  }
};
