import axios from "axios";

export const fetchAccounting = async (
  page = 1,
  pageSize = 20,
  filter = "",
  group = "",
  advancedFilterData = {}
) => {
  try {
    // Build query parameters
    const params = new URLSearchParams({
      ...(filter && { search: filter }),
      page: page.toString(),
      limit: pageSize.toString(),
      sort:
        advancedFilterData.sortId === "Date"
          ? "recvdate"
          : advancedFilterData.sortId?.toLowerCase() || "recvdate",
      order: advancedFilterData.sortDesc ? "desc" : "asc",
      ...(advancedFilterData.startYear && {
        startYear: advancedFilterData.startYear.toString(),
      }),
      ...(advancedFilterData.endYear && {
        endYear: advancedFilterData.endYear.toString(),
      }),
    });

    const response = await axios.get(
      `http://${
        import.meta.env.VITE_IP_ADDRESS
      }:3001/accounting/payments?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      }
    );

    const json = response.data;

    if (!json.data || !Array.isArray(json.data)) {
      console.error("Invalid data format received:", json);
      return {
        data: [],
        totalPages: 0,
        totalRecords: 0,
      };
    }

    // Calculate total pages based on total records and page size
    const totalRecords = json.totalRecords;
    if (!totalRecords && totalRecords !== 0) {
      console.error("Server did not provide totalRecords:", json);
    }

    // Always calculate total pages from total records
    const calculatedTotalPages = Math.ceil(totalRecords / pageSize);

    // Log any discrepancy between server and calculated total pages
    if (json.totalPages && json.totalPages !== calculatedTotalPages) {
      console.warn("Total pages mismatch:", {
        serverTotalPages: json.totalPages,
        calculatedTotalPages,
        totalRecords,
        pageSize,
      });
    }

    // Always use calculated total pages
    const totalPages = calculatedTotalPages || 1;

    // Validate that current page doesn't exceed total pages
    const validPage = Math.min(page, totalPages);
    if (validPage !== page) {
      console.warn(
        `Requested page ${page} exceeds total pages ${totalPages}, adjusting to ${validPage}`
      );
    }

    return {
      data: json.data,
      totalPages,
      totalRecords,
      currentPage: validPage,
    };
  } catch (err) {
    console.error("Error fetching accounting data:", err);
    throw err;
  }
};

export const fetchAllAccounting = async (
  filter = "",
  advancedFilterData = {}
) => {
  try {
    // Build query parameter - no pagination for all records
    const params = new URLSearchParams({
      ...(filter && { search: filter }),
      sort:
        advancedFilterData.sortId === "Date"
          ? "recvdate"
          : advancedFilterData.sortId?.toLowerCase() || "recvdate",
      order: advancedFilterData.sortDesc ? "desc" : "asc",
      ...(advancedFilterData.startYear && {
        startYear: advancedFilterData.startYear.toString(),
      }),
      ...(advancedFilterData.endYear && {
        endYear: advancedFilterData.endYear.toString(),
      }),
    });

    console.log("filter", params.filter, params.advancedFilterData);
    const response = await axios.get(
      `http://${
        import.meta.env.VITE_IP_ADDRESS
      }:3001/accounting/payments/all?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      }
    );

    const json = response.data;

    if (!json.data || !Array.isArray(json.data)) {
      console.error("Invalid data format received:", json);
      return [];
    }

    return json.data;
  } catch (err) {
    console.error("Error fetching all accounting data:", err);
    throw err;
  }
};
