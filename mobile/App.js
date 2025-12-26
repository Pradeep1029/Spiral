import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { bootstrapAuth } from './src/services/auth';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#0A1128',
    card: '#0A1128',
    text: '#F8F9FA',
    border: 'rgba(248,249,250,0.08)',
  },
};

export default function App() {
  useEffect(() => {
    bootstrapAuth().catch(() => {
      // If auth fails, app still works in limited mode (no secure progress sync)
    });
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
