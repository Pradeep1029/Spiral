import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setAuthToken } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('authToken');
        if (storedToken) {
          setToken(storedToken);
          setAuthToken(storedToken);
          await fetchUser();
        } else {
          await createAnonymousUser();
        }
      } catch (e) {
        await createAnonymousUser();
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const createAnonymousUser = async () => {
    const res = await api.post('/auth/anonymous');
    const newToken = res.data.data.token;
    setToken(newToken);
    setAuthToken(newToken);
    await AsyncStorage.setItem('authToken', newToken);
    setUser(res.data.data.user);
    setOnboardingCompleted(res.data.data.user?.onboarding?.completed ?? false);
  };

  const fetchUser = async () => {
    const res = await api.get('/auth/me');
    const currentUser = res.data.data?.user || res.data.data;
    setUser(currentUser);
    setOnboardingCompleted(currentUser?.onboarding?.completed ?? false);
  };

  const completeOnboarding = async (payload) => {
    const res = await api.post('/onboarding/complete', payload);
    const updatedUser = res.data.data.user || res.data.data;
    setUser(updatedUser);
    setOnboardingCompleted(true);
  };

  const value = {
    token,
    user,
    loading,
    onboardingCompleted,
    completeOnboarding,
    refreshUser: fetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
