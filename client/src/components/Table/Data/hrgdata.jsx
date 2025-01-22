import axios from "axios";

export const hrgData = [];

export const fetchHrg = async (setHrgData, page = 1) => {
  try {
    let allHrg = [];

    const response = await axios.get(
      `http://${import.meta.env.VITE_IP_ADDRESS}:3001/hrg?page=${page}`
    );
    allHrg = [...allHrg, ...response.data];
    page++;

    return allHrg; // Return the fetched data
  } catch (e) {
    console.error("Error fetching hrg data:", e);
    throw e; // Throw the error so it can be caught in useDataFetching
  }
};
