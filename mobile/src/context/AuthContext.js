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
        }
      } catch (e) {
        console.error('Init error:', e);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await api.get('/auth/me');
      const currentUser = res.data.data?.user || res.data.data;
      setUser(currentUser);
      setOnboardingCompleted(currentUser?.onboarding?.completed ?? false);
    } catch (error) {
      console.error('Fetch user error:', error);
      // If token is invalid, clear it
      await logout();
    }
  };

  const login = async (newToken, userData) => {
    setToken(newToken);
    setAuthToken(newToken);
    setUser(userData);
    setOnboardingCompleted(userData?.onboarding?.completed ?? false);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('authToken');
    setToken(null);
    setAuthToken(null);
    setUser(null);
    setOnboardingCompleted(false);
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
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
