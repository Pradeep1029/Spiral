import axios from 'axios';
import { Platform } from 'react-native';

// API base URLs
const PROD_BASE_URL = 'https://api.unspiral.app/api/v1';
// For Expo Go on a real device, change localhost to your machine's LAN IP
const LOCAL_WEB_BASE_URL = 'http://localhost:3011/api/v1';
const LOCAL_LAN_BASE_URL = 'http://10.34.181.8:3011/api/v1';

const ENV_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const ALLOW_DEV_REMOTE_API = process.env.EXPO_PUBLIC_ALLOW_DEV_REMOTE_API === '1';

function getBaseUrl() {
  if (__DEV__) {
    if (ALLOW_DEV_REMOTE_API && ENV_BASE_URL) return ENV_BASE_URL;
    return Platform.OS === 'web' ? LOCAL_WEB_BASE_URL : LOCAL_LAN_BASE_URL;
  }

  if (ENV_BASE_URL) return ENV_BASE_URL;
  return PROD_BASE_URL;
}

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
});

export default api;
