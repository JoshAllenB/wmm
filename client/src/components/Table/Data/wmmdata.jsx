import axios from "axios";

export const wmmData = [];

export const fetchWmm = async (setWmmData, page = 1) => {
  try {
    let allWmm = [];

    const response = await axios.get(`http://localhost:3001/wmm?page=${page}`);
    allWmm = [...allWmm, ...response.data];
    page++;

    console.log("wmm data:", allWmm);
    return allWmm;
  } catch (e) {
    console.error("Error fetching WMM data:", e);
    throw e;
  }
};
