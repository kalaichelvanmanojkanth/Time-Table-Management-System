import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

export function isBackendUnavailableError(error) {
  const code = error?.code || '';
  const msg = String(error?.message || '');
  return (
    !error?.response && (
      code === 'ERR_NETWORK' ||
      code === 'ECONNABORTED' ||
      /Network Error|ECONNREFUSED|ENOTFOUND|timeout/i.test(msg)
    )
  );
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Accept': 'application/json; charset=utf-8',
  },
  timeout: 15000,
  responseType: 'json',
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user?.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and encoding verification
api.interceptors.response.use(
  (response) => {
    // Log API response data before it reaches the frontend components
    if (process.env.NODE_ENV !== 'production') {
      const dataPreview = JSON.stringify(response.data)?.slice(0, 200);
      console.log(`[API] Response from ${response.config?.url} (${response.status}):`, dataPreview);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
