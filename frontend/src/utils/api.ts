import axios from 'axios';

const API = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').trim(),
  withCredentials: true,
});

// Add a request interceptor to attach the JWT token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Global interceptor for 401 Unauthorized errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default API;
