import axios from "axios";

export const clientData = []; // Initialize as empty array

export const fetchClients = async (
  setClientData,
  page = 1,
  pageSize = 20,
  filter = "",
) => {
  try {
    const response = await axios.get(
      `http://localhost:3001/clients?page=${page}&pageSize=${pageSize}&filter=${encodeURIComponent(filter)}`,
    );
    const { totalPages, combinedData } = response.data;

    setClientData(combinedData);
    return { page, totalPages };
  } catch (e) {
    console.error("Error fetching client data:", e);
    throw e;
  }
};
