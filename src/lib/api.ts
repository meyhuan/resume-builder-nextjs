import axios, { InternalAxiosRequestConfig, AxiosError } from 'axios';
import { logger } from '@/utils/logger';
import { getPublicJavaApiBaseUrl } from '@/lib/java-api-base';

const api = axios.create({
  baseURL: getPublicJavaApiBaseUrl(),
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
  // WeChat Login: Get QR Code through the Java web login scene flow.
  getWxQrcode: async (sceneStr: string) => {
    const prefixedSceneStr = sceneStr.startsWith('web_login_') ? sceneStr : `web_login_${sceneStr}`;
    const { data } = await api.post('/web/login/qrcode_url', { scene_str: prefixedSceneStr });
    return data;
  },

  // WeChat Login: Poll for scan confirmation.
  exchangeWxToken: async (sceneStr: string) => {
    const prefixedSceneStr = sceneStr.startsWith('web_login_') ? sceneStr : `web_login_${sceneStr}`;
    const { data } = await api.post('/web/login/state', { scene_str: prefixedSceneStr });
    return data;
  },

  // Get user info
  getUserInfo: async (email: string) => {
    const { data } = await api.get(`/huajian/integral/user/${email}`);
    return data.data;
  },
};

export default api;
