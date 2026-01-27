import axios, { InternalAxiosRequestConfig, AxiosError } from 'axios';
import { logger } from '@/utils/logger';

const api = axios.create({
  baseURL: 'https://aijianli.cn/api',
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

export const authApi = {
  // WeChat Login: Get QR Code (Direct Java SSO)
  getWxQrcode: async (sceneStr: string) => {
    // Prefix sceneStr as expected by Java backend
    const prefixedSceneStr = sceneStr.startsWith('cvstore_') ? sceneStr : `cvstore_${sceneStr}`;
    const { data } = await api.post('/cvstore/login/qrcode_url', { scene_str: prefixedSceneStr });
    return data;
  },

  // WeChat Login: Poll for token exchange (Direct Java SSO)
  exchangeWxToken: async (sceneStr: string) => {
    // Prefix sceneStr as expected by Java backend
    const prefixedSceneStr = sceneStr.startsWith('cvstore_') ? sceneStr : `cvstore_${sceneStr}`;
    const { data } = await api.post('/cvstore/login/state', { scene_str: prefixedSceneStr });
    return data;
  },

  // Get user info
  getUserInfo: async (email: string) => {
    const { data } = await api.get(`/huajian/integral/user/${email}`);
    return data.data;
  },
};

export default api;
