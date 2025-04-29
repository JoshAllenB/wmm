import axios from "axios";

export const clientData = []; // Initialize as empty array

export const fetchClients = async (
  page = 1,
  pageSize = 20,
  filter = "",
  group = "",
  advancedFilterData = {}
) => {
  try {
    const response = await axios.get(
      `http://${
        import.meta.env.VITE_IP_ADDRESS
      }:3001/clients?page=${page}&pageSize=${pageSize}&filter=${encodeURIComponent(
        filter
      )}&group=${encodeURIComponent(group)}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        params: {
          ...advancedFilterData, // Include advanced filter data
          birthdate: advancedFilterData.birthdate,
          address: advancedFilterData.address,
        },
      }
    );

    const {
      totalPages,
      combinedData,
      data,
      totalCopies,
      pageSpecificCopies,
      totalCalQty,
      totalCalAmt,
      pageSpecificCalQty,
      pageSpecificCalAmt,
      totalHrgAmt,
      totalFomAmt,
      totalCalPaymtAmt,
      pageSpecificHrgAmt,
      pageSpecificFomAmt,
      pageSpecificCalPaymtAmt,
      noData,
    } = response.data;

    // Use either combinedData or data, whichever is available
    const clientsData = combinedData || data;

    // Log the payment totals from the API response
    console.log("Payment totals in API response:", {
      totalHrgAmt,
      totalFomAmt,
      totalCalPaymtAmt,
      pageSpecificHrgAmt,
      pageSpecificFomAmt,
      pageSpecificCalPaymtAmt
    });

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
        totalHrgAmt: 0,
        totalFomAmt: 0,
        totalCalPaymtAmt: 0,
        pageSpecificHrgAmt: 0,
        pageSpecificFomAmt: 0, 
        pageSpecificCalPaymtAmt: 0,
        noData: true,
      };
    }

    if (!clientsData || !Array.isArray(clientsData)) {
      console.error("Invalid data format received:", response.data);
      throw new Error("Invalid data format received from server");
    }

    const processedData = clientsData.map((client) => ({
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
      totalHrgAmt,
      totalFomAmt,
      totalCalPaymtAmt,
      pageSpecificHrgAmt,
      pageSpecificFomAmt,
      pageSpecificCalPaymtAmt,
      noData: false,
    };
  } catch (e) {
    console.error("Error fetching client data:", e);
    throw e;
  }
};
