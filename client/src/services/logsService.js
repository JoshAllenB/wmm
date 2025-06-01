import axios from 'axios';

const API_URL = `http://${import.meta.env.VITE_IP_ADDRESS}:3001/client-logs`;

const logsService = {
  getAllLogs: async (params = {}) => {
    try {
      const response = await axios.get(API_URL, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        params,
      });
      console.log("Logs:", response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching logs:', error);
      throw error;
    }
  },

  getClientLogs: async (clientId) => {
    try {
      const response = await axios.get(`${API_URL}/${clientId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching client logs:', error);
      throw error;
    }
  },
};

export default logsService; 