import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import SplashScreen from '../screens/SplashScreen';
import OnboardingPatternsScreen from '../screens/OnboardingPatternsScreen';
import OnboardingTimingScreen from '../screens/OnboardingTimingScreen';
import OnboardingTopicsScreen from '../screens/OnboardingTopicsScreen';
import NewHomeScreen from '../screens/NewHomeScreen';
import ChatScreen from '../screens/ChatScreen';
import InsightsScreen from '../screens/InsightsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SafetyScreen from '../screens/SafetyScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f0c29',
          borderTopColor: 'rgba(255,255,255,0.1)',
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarIcon: ({ color, size }) => {
          let iconName = 'ellipse';
          if (route.name === 'Home') iconName = 'moon';
          else if (route.name === 'Insights') iconName = 'stats-chart';
          else if (route.name === 'Settings') iconName = 'settings';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={NewHomeScreen} options={{ title: 'Unspiral' }} />
      <Tab.Screen name="Insights" component={InsightsScreen} options={{ title: 'Brain Map' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { loading, onboardingCompleted } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!onboardingCompleted ? (
        <>
          <Stack.Screen name="OnboardingPatterns" component={OnboardingPatternsScreen} />
          <Stack.Screen name="OnboardingTiming" component={OnboardingTimingScreen} />
          <Stack.Screen name="OnboardingTopics" component={OnboardingTopicsScreen} />
          <Stack.Screen name="MainTabs" component={MainTabs} />
        </>
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
        </>
      )}
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen
        name="Safety"
        component={SafetyScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
