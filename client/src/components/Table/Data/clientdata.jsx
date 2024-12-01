import axios from "axios";

export const clientData = []; // Initialize as empty array

export const fetchClients = async (page = 1, pageSize = 20, filter = "") => {
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

    const {
      totalPages,
      combinedData,
      totalCopies,
      pageSpecificCopies,
      totalCalQty,
      totalCalAmt,
      pageSpecificCalQty,
      pageSpecificCalAmt,
    } = response.data;

    if (!combinedData || !Array.isArray(combinedData)) {
      console.error("Invalid data format received:", response.data);
      throw new Error("Invalid data format received from server");
    }

    const processedData = combinedData.map((client) => ({
      ...client,
      servicesString: client.services ? client.services.join(", ") : "",
    }));

    return {
      data: processedData,
      totalPages,
      totalCopies,
      pageSpecificCopies,
      totalCalQty,
      totalCalAmt,
      pageSpecificCalQty,
      pageSpecificCalAmt,
    };
  } catch (e) {
    console.error("Error fetching client data:", e);
    throw e;
  }
};
