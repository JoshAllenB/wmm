import axios from "axios";

export const fetchGroups = async () => {
  try {
    const response = await axios.get(
      `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/groups`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching groups:", error);
    throw error;
  }
};

export const fetchSubclasses = async () => {
  try {
    const response = await axios.get(
      `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/subclass`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching subclasses:", error);
    throw error;
  }
};

export const fetchAreas = async () => {
  try {
    const response = await axios.get(
      `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/areas`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching areas:", error);
    throw error;
  }
};

export const fetchTypes = async () => {
  try {
    const response = await axios.get(
      `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/types`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching types:", error);
    throw error;
  }
};

export const fetchUsers = async () => {
  try {
    const response = await axios.get(
      `http://${import.meta.env.VITE_IP_ADDRESS}:3001/users`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching users:", error);
    // Try an alternative endpoint if the first one fails
    try {
      const altResponse = await axios.get(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/user`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      return altResponse.data;
    } catch (altError) {
      console.error("Alternative endpoint also failed:", altError);
      return { users: [] }; // Return empty array to prevent errors
    }
  }
};

export const fetchPrintTemplates = async () => {
  try {
    const response = await axios.get(
      `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/templates`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching print templates:", error);

    // Check for specific error types
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(
        "Response error:",
        error.response.status,
        error.response.data
      );
    } else if (error.request) {
      // The request was made but no response was received
      console.error("No response received:", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("Request setup error:", error.message);
    }

    // Return empty array to prevent further errors
    return [];
  }
};

export const fetchLegacyLabels = async () => {
  try {
    const url = `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/labels`;
    const token = localStorage.getItem("accessToken");

    console.group("Fetching Legacy Labels");
    console.log("Requesting from:", url);

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.data?.length > 0) {
      // Convert each label to a template format
      const convertedTemplates = response.data.map((label) => ({
        id: label.id,
        name: label.description || label.id,
        description: label.description,
        layout: {
          left: label.left || 1,
          width: label.width || 43,
          height: label.height || 22,
          columns: label.columns || 2,
          fontSize: 12,
          leftPosition: label.left || 1,
          topPosition: 10,
          columnWidth: (label.width || 43) * 6,
          labelHeight: (label.height || 22) * 12,
          horizontalSpacing: 20,
        },
        selectedFields: label.format?.includes("cellno") ? ["cellno"] : [],
        type: label.type || "LEGACY",
        printer: label.printer || "Dot Matrix Printer",
        init: label.init || "",
        format: label.format || "",
        reset: label.reset || "",
      }));
      // Group by type for analysis
      const typeGroups = convertedTemplates.reduce((acc, template) => {
        const type = template.type || "Unspecified";
        if (!acc[type]) acc[type] = [];
        acc[type].push({
          id: template.id,
          name: template.name,
          type: template.type,
        });
        return acc;
      }, {});

      console.groupEnd();

      return convertedTemplates;
    } else {
      console.warn("No labels found in response");
      console.groupEnd();
      return [];
    }
  } catch (error) {
    console.group("Legacy Labels Error");
    console.error("Error fetching legacy labels:", error);

    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response headers:", error.response.headers);
      console.error("Response data:", error.response.data);
    }

    if (error.config) {
    }

    console.groupEnd();
    return [];
  }
};

// Print Queue API helpers
export const createPrintQueue = async ({
  name,
  visibility = "user",
  actionType = "label",
  templateRefId,
  ttlDays = 30,
  department,
}) => {
  const response = await axios.post(
    `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/print-queues`,
    { name, visibility, actionType, templateRefId, ttlDays, department },
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
};

export const listPrintQueues = async () => {
  const response = await axios.get(
    `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/print-queues`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    }
  );
  return response.data;
};

export const getPrintQueue = async (queueId) => {
  const response = await axios.get(
    `http://${
      import.meta.env.VITE_IP_ADDRESS
    }:3001/util/print-queues/${queueId}`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    }
  );
  return response.data;
};

export const enqueueSelectionToQueue = async (queueId, clientIds) => {
  const response = await axios.post(
    `http://${
      import.meta.env.VITE_IP_ADDRESS
    }:3001/util/print-queues/${queueId}/enqueue/selection`,
    { clientIds },
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
};

export const enqueueFilterToQueue = async (queueId, filterPayload) => {
  const response = await axios.post(
    `http://${
      import.meta.env.VITE_IP_ADDRESS
    }:3001/util/print-queues/${queueId}/enqueue/filter`,
    filterPayload,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
};

export const clearPrintQueue = async (queueId) => {
  const response = await axios.post(
    `http://${
      import.meta.env.VITE_IP_ADDRESS
    }:3001/util/print-queues/${queueId}/clear`,
    {},
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
};

export const checkPrintHistory = async (clientIds) => {
  const response = await axios.post(
    `http://${
      import.meta.env.VITE_IP_ADDRESS
    }:3001/util/print-queues/check-history`,
    { clientIds },
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
};

export const markQueuePrinted = async (
  queueId,
  { clientIds, jobId, printerName, templateRefId, actionType }
) => {
  const response = await axios.post(
    `http://${
      import.meta.env.VITE_IP_ADDRESS
    }:3001/util/print-queues/${queueId}/printed`,
    { clientIds, jobId, printerName, templateRefId, actionType },
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
};
