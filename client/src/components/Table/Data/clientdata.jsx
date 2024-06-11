import axios from "axios";

export const clientData = []; // Initialize as empty array

export const fetchClients = async (setClientData, page = 1) => {
  try {
    let allClients = [];

    const response = await axios.get(
      `http://localhost:3001/clients?page=${page}`
    );
    allClients = [...allClients, ...response.data];
    page++;

    setClientData(allClients);
  } catch (e) {
    console.error("Error fetching client data:", e);
  }
};
