/**
 * Bottom Tab Navigator
 * Tabs: Home | Sensors | Dead Reckoning | Fusion
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/HomeScreen';
import { SensorMonitorScreen } from '../screens/SensorMonitorScreen';
import { DeadReckoningScreen } from '../screens/DeadReckoningScreen';
import { SensorFusionScreen } from '../screens/SensorFusionScreen';
import { colors } from '../theme/colors';
import { fontWeights, fontSizes } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import type { BottomTabParamList } from './types';

const Tab = createBottomTabNavigator<BottomTabParamList>();

function TabIcon({ focused, icon, label }: { focused: boolean; icon: string; label: string }) {
  return (
    <View style={[tabStyles.iconWrapper, focused && tabStyles.iconWrapperActive]}>
      <Text style={[tabStyles.icon, focused && tabStyles.iconActive]}>{icon}</Text>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 32,
    borderRadius: radius.lg,
  },
  iconWrapperActive: {
    backgroundColor: colors.primarySurface,
  },
  icon: { fontSize: 20 },
  iconActive: {},
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
        },
        tabBarActiveTintColor: colors.primary,
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
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="🏠" label="Home" />,
        }}
      />
      <Tab.Screen
        name="SensorsTab"
        component={SensorMonitorScreen}
        options={{
          tabBarLabel: 'Sensors',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="📡" label="Sensors" />,
        }}
      />
      <Tab.Screen
        name="AnalysisTab"
        component={DeadReckoningScreen}
        options={{
          tabBarLabel: 'Dead Reckoning',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="🧭" label="DR" />,
        }}
      />
      <Tab.Screen
        name="FusionTab"
        component={SensorFusionScreen}
        options={{
          tabBarLabel: 'Fusion',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="🔗" label="Fusion" />,
        }}
      />
    </Tab.Navigator>
  );
}
