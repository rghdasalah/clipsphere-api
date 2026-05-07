import axios from "axios";
import Cookies from "js-cookie";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api/v1",
  // Hard cap so a hung backend never freezes the browser tab.
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// IMPORTANT: This interceptor only enriches error messages.
// It NEVER clears cookies, NEVER redirects, NEVER changes auth state.
// AuthContext is the single owner of auth state.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const body = error.response?.data;

    if (body?.message) {
      error.message = body.message;
    } else if (error.code === "ECONNABORTED") {
      error.message = "The server took too long to respond. Please try again.";
    } else if (!error.response) {
      error.message =
        "Cannot reach the server. Is the API running on port 5000?";
    } else if (status === 401) {
      error.message = body?.message || "You are not authorized to do that.";
    } else if (status === 403) {
      error.message = "You don't have permission to do that.";
    } else if (status === 409) {
      error.message =
        body?.message || "This action has already been performed.";
    } else if (status === 400) {
      error.message =
        body?.message || "Invalid request. Please check your input.";
    } else if (status && status >= 500) {
      error.message = "Something went wrong on our end. Please try again.";
    }

    return Promise.reject(error);
  }
);

export default api;