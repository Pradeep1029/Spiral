import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NewHomeScreen from '../screens/NewHomeScreen';
import SpiralFlowScreen from '../screens/SpiralFlowScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={NewHomeScreen} />
      <Stack.Screen
        name="SpiralFlow"
        component={SpiralFlowScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
