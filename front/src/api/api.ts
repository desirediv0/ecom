import axios from "axios";
import { toast } from "sonner";

// Create axios instance with baseURL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 10000, // 10 second timeout
});

// Add a request interceptor to include authentication token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem("adminToken");

    // If token exists, add it to the authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle specific error scenarios
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { status, data } = error.response;

      if (status === 401) {
        // Unauthorized - clear token and redirect to login
        localStorage.removeItem("adminToken");

        // Only show toast if not already on login page
        if (window.location.pathname !== "/login") {
          toast.error("Session expired. Please log in again.");

          // Redirect to login
          window.location.href = "/login";
        }
      } else if (status === 403) {
        // Forbidden - show permission denied message
        toast.error(
          data.message || "You don't have permission to perform this action"
        );
      } else if (status === 500) {
        // Server error
        toast.error("Server error. Please try again later.");
      }
    } else if (error.request) {
      // The request was made but no response was received
      toast.error("No response from server. Please check your connection.");
    } else {
      // Something happened in setting up the request that triggered an Error
      toast.error("An unexpected error occurred.");
    }

    return Promise.reject(error);
  }
);

// Notice: We're not modifying the response data anymore
// This allows components to access the full response format

export default api;
