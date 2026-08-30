import axios from 'axios';

// Vite environment variable configuration
const rawApiUrl = import.meta.env.VITE_API_URL;

// In local dev mode, default to http://127.0.0.1:8000 if not specified
export const API_BASE_URL = (rawApiUrl !== undefined && rawApiUrl !== null && rawApiUrl !== '')
  ? rawApiUrl.replace(/\/+$/, '')
  : (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '');

const client = axios.create({
  baseURL: API_BASE_URL ? `${API_BASE_URL}/api` : '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('pt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor with structured, user-friendly error classification
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // 1. Connection / Network Error (Backend Unavailable)
    if (!error.response) {
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
      const connectionError = new Error(
        isTimeout
          ? 'Backend Connection Timeout: The triage server took too long to respond. Please verify network connectivity.'
          : 'Triage Server Offline: Unable to establish connection with the backend API. Please verify the FastAPI service is running.'
      );
      connectionError.isConnectionError = true;
      connectionError.isBackendUnavailable = true;
      connectionError.originalError = error;
      console.error('[PatientTriage API Offline]:', connectionError.message);
      return Promise.reject(connectionError);
    }

    // 2. HTTP Error Statuses from Backend
    const status = error.response.status;
    const detail = error.response.data?.detail;

    let friendlyMessage = detail;
    if (!friendlyMessage) {
      if (status === 401) {
        friendlyMessage = 'Authentication Required: Please sign in with your Clinician ID.';
      } else if (status === 403) {
        friendlyMessage = 'Access Denied: You do not have permission to execute this clinical action.';
      } else if (status === 404) {
        friendlyMessage = 'Record Not Found: The requested patient, bed, or department was not found.';
      } else if (status === 422) {
        friendlyMessage = 'Validation Error: Check vital signs and demographic inputs for invalid values.';
      } else if (status >= 500) {
        friendlyMessage = 'ML Scoring / Server Error: An error occurred during risk prediction or hospital state evaluation.';
      } else {
        friendlyMessage = `API Error (${status}): ${error.message || 'Unexpected server response.'}`;
      }
    }

    const apiError = new Error(typeof friendlyMessage === 'string' ? friendlyMessage : JSON.stringify(friendlyMessage));
    apiError.status = status;
    apiError.isMlProcessingError = status >= 500;
    apiError.isConnectionError = false;
    apiError.response = error.response;
    console.error(`[PatientTriage API Error ${status}]:`, apiError.message);
    return Promise.reject(apiError);
  }
);

export default client;
