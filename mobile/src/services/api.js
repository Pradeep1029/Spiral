import axios from 'axios';
import { Platform } from 'react-native';

// API base URLs
const PROD_BASE_URL = 'https://spiral.railway.internal/api/v1';
// For Expo Go on a real device, change localhost to your machine's LAN IP
const LOCAL_WEB_BASE_URL = 'http://localhost:3000/api/v1';
const LOCAL_LAN_BASE_URL = 'http://10.34.181.8:3000/api/v1';

const DEV_BASE_URL = Platform.OS === 'web' ? LOCAL_WEB_BASE_URL : LOCAL_LAN_BASE_URL;

const api = axios.create({
  // During local development, always point to the dev backend
  baseURL: DEV_BASE_URL,
  timeout: 15000,
});

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

export default api;
