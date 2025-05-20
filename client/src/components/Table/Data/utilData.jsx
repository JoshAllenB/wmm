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
      console.error("Response error:", error.response.status, error.response.data);
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
    
    // Try fetch API first for more detailed error handling
    try {
      const fetchResponse = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
            
      if (fetchResponse.ok) {
        const data = await fetchResponse.json();
        return data;
      } else {
        console.error(`Fetch failed with status: ${fetchResponse.status}`);
        const errorText = await fetchResponse.text();
        console.error(`Error response body: ${errorText}`);
        // Continue to axios as fallback
      }
    } catch (fetchError) {
      console.error("Fetch API error:", fetchError);
      // Continue to axios as fallback
    }
    
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    
    if (response.data?.length > 0) {
    } else {
      console.warn("No legacy labels found in the response");
    }
    
    return response.data;
  } catch (error) {
    console.error("Error fetching legacy labels:", error);
    
    // Check for specific error types
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Response error: ${error.response.status}`);
      console.error(`Response data: ${JSON.stringify(error.response.data)}`);
      
      // If we got a 401, the token might be invalid
      if (error.response.status === 401) {
        console.error("Authentication error - token might be invalid or expired");
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error("No response received from server");
      console.error("Request details:", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error(`Request setup error: ${error.message}`);
    }
    
    // Let's try a direct fetch to see if there's any difference
    try {
      const directResponse = await fetch(`http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/labels`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      
      if (directResponse.ok) {
        const data = await directResponse.json();
        return data;
      } else {
        console.error(`Direct fetch failed with status: ${directResponse.status} ${directResponse.statusText}`);
        const errorText = await directResponse.text();
        console.error(`Error response body: ${errorText}`);
      }
    } catch (fetchError) {
      console.error("Direct fetch also failed:", fetchError);
    }
    
    // Return empty array to prevent further errors
    return [];
  }
};
