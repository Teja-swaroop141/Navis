/**
 * Root Stack Navigator
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabNavigator } from './BottomTabNavigator';
import { ModeSelectionScreen } from '../screens/ModeSelectionScreen';
import { NavigationScreen } from '../screens/NavigationScreen';
import { PerformanceScreen } from '../screens/PerformanceScreen';
import { SimulationScreen } from '../screens/SimulationScreen';
import { ScenariosScreen } from '../screens/ScenariosScreen';
import { SensorFailureScenarioScreen } from '../screens/SensorFailureScenarioScreen';
import { colors } from '../theme/colors';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Home" component={BottomTabNavigator} />
      <Stack.Screen name="ModeSelection" component={ModeSelectionScreen} />
      <Stack.Screen
        name="Navigation"
        component={NavigationScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="Performance" component={PerformanceScreen} />
      <Stack.Screen name="Simulation" component={SimulationScreen} />
      <Stack.Screen name="Scenarios" component={ScenariosScreen} />
      <Stack.Screen name="SensorFailureScenario" component={SensorFailureScenarioScreen} />
    </Stack.Navigator>
  );
}
