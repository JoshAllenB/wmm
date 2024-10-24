import axios from "axios";

export const clientData = []; // Initialize as empty array

export const fetchClients = async (
  setClientData,
  page = 1,
  pageSize = 20,
  filter = ""
) => {
  try {
    const response = await axios.get(
      `http://localhost:3001/clients?page=${page}&pageSize=${pageSize}&filter=${encodeURIComponent(
        filter
      )}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      }
    );

    const { totalPages, combinedData } = response.data;

    const processedData = combinedData.map((client) => ({
      ...client,
      servicesString: client.services.join(", "),
    }));

    setClientData(processedData);
    return { page, totalPages };
  } catch (e) {
    console.error("Error fetching client data:", e);
    throw e;
  }
};
