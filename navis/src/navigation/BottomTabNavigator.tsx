/**
 * Bottom Tab Navigator
 * Reference design style: warm cream tab bar with white active indicator
 * Tabs: Home | Simulation | Scenarios | Sensors | Dead Reckoning | Fusion
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/HomeScreen';
import { SimulationScreen } from '../screens/SimulationScreen';
import { SensorMonitorScreen } from '../screens/SensorMonitorScreen';
import { DeadReckoningScreen } from '../screens/DeadReckoningScreen';
import { SensorFusionScreen } from '../screens/SensorFusionScreen';
import { ScenariosScreen } from '../screens/ScenariosScreen';
import { colors } from '../theme/colors';
import { fontWeights, fontSizes } from '../theme/typography';
import { spacing, radius, shadows } from '../theme/spacing';
import type { BottomTabParamList } from './types';

const Tab = createBottomTabNavigator<BottomTabParamList>();

function TabIcon({
  focused,
  icon,
}: {
  focused: boolean;
  icon: keyof typeof Feather.glyphMap;
}) {
  return (
    <View style={[tabStyles.iconWrapper, focused && tabStyles.iconWrapperActive]}>
      <Feather
        name={icon}
        size={20}
        color={focused ? colors.black : colors.textTertiary}
      />
    </View>
  );
}

const tabStyles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 30,
    borderRadius: radius.md,
  },
  iconWrapperActive: {
    backgroundColor: colors.brandCream,
    borderWidth: 1,
    borderColor: colors.brandCreamDark,
    shadowColor: 'rgba(180, 150, 80, 0.25)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
});

export function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
          borderTopWidth: 1,
          paddingTop: spacing[2],
          paddingBottom: spacing[2],
          height: 64,
          shadowColor: 'rgba(100, 80, 30, 0.1)',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 1,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarActiveTintColor: colors.black,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: fontSizes.xs,
          fontWeight: fontWeights.semibold,
          marginTop: 2,
          letterSpacing: 0.3,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="home" />,
        }}
      />
      <Tab.Screen
        name="SimulationTab"
        component={SimulationScreen}
        options={{
          tabBarLabel: 'Simulation',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="play-circle" />,
        }}
      />
      <Tab.Screen
        name="ScenariosTab"
        component={ScenariosScreen}
        options={{
          tabBarLabel: 'Scenarios',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="layers" />,
        }}
      />
      <Tab.Screen
        name="SensorsTab"
        component={SensorMonitorScreen}
        options={{
          tabBarLabel: 'Sensors',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="radio" />,
        }}
      />
      <Tab.Screen
        name="AnalysisTab"
        component={DeadReckoningScreen}
        options={{
          tabBarLabel: 'Dead Reckoning',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="navigation" />,
        }}
      />
      <Tab.Screen
        name="FusionTab"
        component={SensorFusionScreen}
        options={{
          tabBarLabel: 'Fusion',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="link" />,
        }}
      />
    </Tab.Navigator>
  );
}
