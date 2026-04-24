import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const getNormalizedErrorMessage = (error) => {
  const responseData = error?.response?.data;

  if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
    const formattedErrors = responseData.errors
      .map((item) => item?.msg || item?.message || item)
      .filter(Boolean);

    if (formattedErrors.length > 0) {
      return formattedErrors.join(', ');
    }
  }

  if (Array.isArray(responseData?.message) && responseData.message.length > 0) {
    const formattedMessages = responseData.message
      .map((item) => item?.msg || item?.message || item)
      .filter(Boolean);

    if (formattedMessages.length > 0) {
      return formattedMessages.join(', ');
    }
  }

  if (typeof responseData?.message === 'string' && responseData.message.trim()) {
    return responseData.message;
  }

  if (typeof responseData?.error === 'string' && responseData.error.trim()) {
    return responseData.error;
  }

  if (!error?.response) {
    return 'Unable to reach server. Please check your connection and try again.';
  }

  return error?.message || 'Request failed. Please try again.';
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user?.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    error.message = getNormalizedErrorMessage(error);

    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
