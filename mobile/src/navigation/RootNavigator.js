import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import SplashScreen from '../screens/SplashScreen';
import OnboardingPatternsScreen from '../screens/OnboardingPatternsScreen';
import OnboardingTimingScreen from '../screens/OnboardingTimingScreen';
import OnboardingTopicsScreen from '../screens/OnboardingTopicsScreen';
import HomeScreen from '../screens/HomeScreen';
import SpiralRescueScreen from '../screens/SpiralRescueScreen';
import SelfCompassionScreen from '../screens/SelfCompassionScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProgressScreen from '../screens/ProgressScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SafetyScreen from '../screens/SafetyScreen';
import QuickCheckInScreen from '../screens/QuickCheckInScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#050814',
          borderTopColor: 'rgba(255,255,255,0.08)',
        },
        tabBarActiveTintColor: '#F9E66A',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
        tabBarIcon: ({ color, size }) => {
          let iconName = 'ellipse';
          if (route.name === 'Home') iconName = 'moon';
          else if (route.name === 'History') iconName = 'time';
          else if (route.name === 'Progress') iconName = 'stats-chart';
          else if (route.name === 'Settings') iconName = 'settings';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
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
      <Stack.Screen name="SpiralRescue" component={SpiralRescueScreen} />
      <Stack.Screen name="QuickCheckIn" component={QuickCheckInScreen} />
      <Stack.Screen
        name="SelfCompassion"
        component={SelfCompassionScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="Safety"
        component={SafetyScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
