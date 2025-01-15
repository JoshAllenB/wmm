import axios from "axios";
import { BACKEND_URL } from "../../../config";

export const hrgData = [];

export const fetchHrg = async (setHrgData, page = 1) => {
  try {
    let allHrg = [];

    const response = await axios.get(
      `http://${BACKEND_URL}:3001/hrg?page=${page}`
    );
    allHrg = [...allHrg, ...response.data];
    page++;

    return allHrg; // Return the fetched data
  } catch (e) {
    console.error("Error fetching hrg data:", e);
    throw e; // Throw the error so it can be caught in useDataFetching
  }
};
