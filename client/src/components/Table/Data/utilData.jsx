import axios from "axios";

export const fetchGroups = async () => {
  try {
    const response = await axios.get(
      `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/groups`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching groups:", error);
    throw error;
  }
};

export const fetchSubclasses = async () => {
  try {
    const response = await axios.get(
      `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/subclass`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching subclasses:", error);
    throw error;
  }
};

export const fetchAreas = async () => {
  try {
    const response = await axios.get(
      `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/areas`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching areas:", error);
    throw error;
  }
};

export const fetchTypes = async () => {
  try {
    const response = await axios.get(
      `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/types`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching types:", error);
    throw error;
  }
};
