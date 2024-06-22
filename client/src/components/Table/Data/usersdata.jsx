import axios from "axios";

export const fetchUsers = async () => {
  try {
    const response = await axios.get("http://localhost:3001/users");
    return response.data.map((user) => ({
      ...user,
      status: user.status.status || user.status, // Flatten the nested status field
    }));
  } catch (e) {
    console.error("Error fetching user data:", e);
    throw e;
  }
};
