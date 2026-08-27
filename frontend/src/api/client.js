import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for consistent error messaging
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorMsg = error.response?.data?.detail || error.message || 'An unexpected API error occurred';
    console.error('API Error:', errorMsg, error);
    return Promise.reject(new Error(errorMsg));
  }
);

export default api;
