import axios from "axios";

export const hrgData = [];

export const fetchHrg = async (setHrgData, page = 1) => {
  try {
    let allHrg = [];

    const response = await axios.get(`http://localhost:3001/hrg?page=${page}`);
    allHrg = [...allHrg, ...response.data];
    page++;

    setHrgData(allHrg);
  } catch (e) {
    console.error("Error fetching hrg data:", e);
  }
};
