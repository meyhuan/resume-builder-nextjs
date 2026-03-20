import axios, { InternalAxiosRequestConfig, AxiosError } from 'axios';
import { logger } from '@/utils/logger';

const api = axios.create({
  baseURL: 'https://airesumepass.com/api',
  timeout: 10000,
});

// Request interceptor for adding token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = token;
  }
  logger.debug('API', `Request: ${config.method?.toUpperCase()} ${config.url}`, config.data);
  return config;
});

// Response interceptor for logging errors
api.interceptors.response.use(
  (response) => {
    logger.debug('API', `Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    return response;
  },
  (error: AxiosError) => {
    logger.error('API', `Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

export default api;
