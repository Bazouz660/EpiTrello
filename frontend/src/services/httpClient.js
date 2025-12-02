import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

export const httpClient = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 5000,
});

export const setAuthToken = (token) => {
  if (token) {
    httpClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete httpClient.defaults.headers.common.Authorization;
};

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      console.error(`API error [${status}]`, data);
    }

    return Promise.reject(error);
  },
);
