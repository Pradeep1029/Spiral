import axios from 'axios';

// API base URLs
const PROD_BASE_URL = 'https://spiral.railway.internal/api/v1';
// For Expo Go on a real device, change localhost to your machine's LAN IP
const DEV_BASE_URL = 'http://192.168.1.87:3000/api/v1';

const api = axios.create({
  baseURL: __DEV__ ? DEV_BASE_URL : PROD_BASE_URL,
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
