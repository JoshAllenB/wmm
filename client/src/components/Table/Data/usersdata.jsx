import axios from "axios";

export const fetchUsers = async () => {
  try {
    const response = await axios.get("http://localhost:3001/users");
    const formattedData = response.data.map((user) => ({
      ...user,
      status: user.status.status || user.status, // Flatten the nested status field
    }));
    console.log("Formatted user data:", formattedData); // Add this log
    return formattedData;
  } catch (e) {
    console.error("Error fetching user data:", e);
    throw e;
  }
};
