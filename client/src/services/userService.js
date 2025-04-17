import axios from "axios";

const API_URL = `http://${import.meta.env.VITE_IP_ADDRESS}:3001`;

// Create axios instance with default configs
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 seconds timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling errors globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 Unauthorized and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh token (need to implement refresh token endpoint)
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) throw new Error("No refresh token available");

        const response = await axios.post(`${API_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const { accessToken } = response.data;
        localStorage.setItem("accessToken", accessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // If refresh fails, redirect to login
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// User-related API calls
const userService = {
  // Get all users with optional pagination
  getUsers: async (page = 1, limit = 10, searchTerm = "", filters = {}) => {
    try {
      const params = { page, limit, search: searchTerm, ...filters };
      const response = await apiClient.get("/users", { params });
      console.log("Users API response:", response);
      // The server returns an object with a users property that contains the array
      return response.data.users || [];
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  },

  // Get a single user by ID
  getUserById: async (userId) => {
    try {
      const response = await apiClient.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching user ${userId}:`, error);
      throw error;
    }
  },

  // Create a new user
  createUser: async (userData) => {
    try {
      const response = await apiClient.post("/users/add", userData);
      return response.data;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  },

  // Update an existing user
  updateUser: async (userId, userData) => {
    try {
      const response = await apiClient.put(`/users/update/${userId}`, userData);
      return response.data;
    } catch (error) {
      console.error(`Error updating user ${userId}:`, error);
      throw error;
    }
  },

  // Delete a user
  deleteUser: async (userId) => {
    try {
      const response = await apiClient.delete(`/users/delete/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting user ${userId}:`, error);
      throw error;
    }
  },

  // Get user statistics
  getUserStats: async () => {
    try {
      const response = await apiClient.get("/users/stats");
      return response.data;
    } catch (error) {
      console.error("Error fetching user statistics:", error);
      throw error;
    }
  },

  // Change user password
  changePassword: async (userId, oldPassword, newPassword) => {
    try {
      const response = await apiClient.put(`/users/password/${userId}`, {
        oldpassword: oldPassword,
        newpassword: newPassword,
      });
      return response.data;
    } catch (error) {
      console.error("Error changing password:", error);
      throw error;
    }
  },

  // Update user status
  updateUserStatus: async (userId, status) => {
    try {
      const response = await apiClient.put(`/users/status/${userId}`, {
        status,
      });
      return response.data;
    } catch (error) {
      console.error(`Error updating user status for ${userId}:`, error);
      throw error;
    }
  },

  // Role-related API calls
  getRoles: async () => {
    try {
      const response = await apiClient.get("/roles/roles");
      return response.data;
    } catch (error) {
      console.error("Error fetching roles:", error);
      throw error;
    }
  },

  getRoleById: async (roleId) => {
    try {
      const response = await apiClient.get(`/roles/roles/${roleId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching role ${roleId}:`, error);
      throw error;
    }
  },

  createRole: async (roleData) => {
    try {
      const response = await apiClient.post("/roles/roles/add", roleData);
      return response.data;
    } catch (error) {
      console.error("Error creating role:", error);
      throw error;
    }
  },

  updateRole: async (roleId, roleData) => {
    try {
      const response = await apiClient.put(`/roles/roles/${roleId}`, roleData);
      return response.data;
    } catch (error) {
      console.error(`Error updating role ${roleId}:`, error);
      throw error;
    }
  },

  deleteRole: async (roleId) => {
    try {
      const response = await apiClient.delete(`/roles/roles/${roleId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting role ${roleId}:`, error);
      throw error;
    }
  },

  // Permission-related API calls
  getPermissions: async () => {
    try {
      const response = await apiClient.get("/roles/permissions");
      return response.data;
    } catch (error) {
      console.error("Error fetching permissions:", error);
      throw error;
    }
  },

  getPermissionById: async (permissionId) => {
    try {
      const response = await apiClient.get(
        `/roles/permissions/${permissionId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching permission ${permissionId}:`, error);
      throw error;
    }
  },

  createPermission: async (permissionData) => {
    try {
      const response = await apiClient.post(
        "/roles/permissions/add",
        permissionData
      );
      return response.data;
    } catch (error) {
      console.error("Error creating permission:", error);
      throw error;
    }
  },

  updatePermission: async (permissionId, permissionData) => {
    try {
      const response = await apiClient.put(
        `/roles/permissions/${permissionId}`,
        permissionData
      );
      return response.data;
    } catch (error) {
      console.error(`Error updating permission ${permissionId}:`, error);
      throw error;
    }
  },

  deletePermission: async (permissionId) => {
    try {
      const response = await apiClient.delete(
        `/roles/permissions/${permissionId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error deleting permission ${permissionId}:`, error);
      throw error;
    }
  },
};

export default userService;
