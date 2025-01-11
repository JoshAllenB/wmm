import axios from "axios";

export const clientData = []; // Initialize as empty array

export const fetchClients = async (
  page = 1,
  pageSize = 20,
  filter = "",
  group = ""
) => {
  try {
    const response = await axios.get(
      `http://localhost:3001/clients?page=${page}&pageSize=${pageSize}&filter=${encodeURIComponent(
        filter
      )}&group=${encodeURIComponent(group)}`,
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
      noData,
    } = response.data;

    if (noData) {
      return {
        data: [],
        totalPages: 0,
        totalCopies: 0,
        pageSpecificCopies: 0,
        totalCalQty: 0,
        totalCalAmt: 0,
        pageSpecificCalQty: 0,
        pageSpecificCalAmt: 0,
        noData: true,
      };
    }

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
      noData: false,
    };
  } catch (e) {
    console.error("Error fetching client data:", e);
    throw e;
  }
};

export const fetchGroups = async () => {
  try {
    const response = await axios.get("http://localhost:3001/clients/groups", {
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
    const response = await axios.get("http://localhost:3001/clients/subclass", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    });
    console.log("Received subclass data:", response.data); // Add this line
    return response.data;
  } catch (error) {
    console.error("Error fetching subclasses:", error);
    throw error;
  }
};
