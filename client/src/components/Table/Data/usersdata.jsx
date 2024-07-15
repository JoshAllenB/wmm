import axios from "axios";

export const fetchUsers = async (setUsersData) => {
  try {
    const response = await axios.get("http://localhost:3001/users", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    });

    const users = response.data.map((user) => ({
      ...user,
      status: user.status.status || user.status,
    }));

    setUsersData(users);
    return users;
  } catch (err) {
    console.error("Error fetching user data:", err);
  }
};
