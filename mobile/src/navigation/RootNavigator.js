import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NewHomeScreen from '../screens/NewHomeScreen';
import ResetSessionScreen from '../screens/ResetSessionScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={NewHomeScreen} />
      <Stack.Screen
        name="ResetSession"
        component={ResetSessionScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
