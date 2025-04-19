import axios from "axios";

// Create axios instance with baseURL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 10000, // 10 second timeout
});

console.log(
  "API URL:",
  import.meta.env.VITE_API_URL || "http://localhost:4000"
);

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

// Notice: We're not modifying the response data anymore
// This allows components to access the full response format

export default api;
