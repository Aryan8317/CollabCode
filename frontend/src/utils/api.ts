import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5001/api',
});

// Add a request interceptor to include the JWT token in all requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('collabcode_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
