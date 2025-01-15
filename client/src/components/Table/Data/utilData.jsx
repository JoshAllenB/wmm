import axios from "axios";
import { BACKEND_URL } from "../../../config";

export const fetchGroups = async () => {
  try {
    const response = await axios.get(`${BACKEND_URL}/util/groups`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching groups:", error);
    throw error;
  }
};

export const fetchSubclasses = async () => {
  try {
    const response = await axios.get(`${BACKEND_URL}/util/subclass`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching subclasses:", error);
    throw error;
  }
};
