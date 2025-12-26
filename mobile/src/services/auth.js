import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const DEVICE_ID_KEY = 'unspiral_device_id_v1';
const AUTH_TOKEN_KEY = 'unspiral_auth_token_v1';
const USER_ID_KEY = 'unspiral_user_id_v1';

function generateDeviceId() {
  return `dev_${Date.now()}_${Math.random().toString(16).slice(2)}_${Math.random().toString(16).slice(2)}`;
}

export async function getOrCreateDeviceId() {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const created = generateDeviceId();
  await AsyncStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

export async function getStoredAuth() {
  const [token, userId] = await Promise.all([
    AsyncStorage.getItem(AUTH_TOKEN_KEY),
    AsyncStorage.getItem(USER_ID_KEY),
  ]);
  return { token: token || null, userId: userId || null };
}

export async function setStoredAuth({ token, userId }) {
  if (token) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  }
  if (userId) {
    await AsyncStorage.setItem(USER_ID_KEY, userId);
  }
}

export async function bootstrapAuth() {
  const stored = await getStoredAuth();
  if (stored.token) {
    api.defaults.headers.common.Authorization = `Bearer ${stored.token}`;
    return stored;
  }

  const deviceId = await getOrCreateDeviceId();
  const res = await api.post('/auth/device', { device_id: deviceId });
  const token = res.data?.data?.token;
  const userId = res.data?.data?.user?.id;

  await setStoredAuth({ token, userId });
  return { token: token || null, userId: userId || null };
}
