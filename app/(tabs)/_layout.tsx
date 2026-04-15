import { createMaterialTopTabNavigator, MaterialTopTabNavigationOptions } from '@react-navigation/material-top-tabs';
import { withLayoutContext } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize } from '../../constants/theme';
import { View, StyleSheet } from 'react-native';

const { Navigator } = createMaterialTopTabNavigator();

// Register the Material Top Tab Navigator with Expo Router
export const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator
>(Navigator);

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  name,
  focused,
  color
}: {
  name: IoniconsName;
  focused: boolean;
  color: string;
}) {
  return (
    <Ionicons
      name={focused ? name : (`${name}-outline` as IoniconsName)}
      size={22}
      color={color}
    />
  );
}

export default function TabsLayout() {
  return (
    <MaterialTopTabs
      tabBarPosition="bottom"
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarIndicatorStyle: { top: 0, height: 3, backgroundColor: Colors.primary, borderRadius: 3 },
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 65,
          elevation: 0,
          shadowOpacity: 0,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          textTransform: 'none',
          marginBottom: 0,
          marginTop: -2,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          paddingVertical: 5,
        },
        tabBarShowIcon: true,
        swipeEnabled: true,
      }}
    >
      <MaterialTopTabs.Screen
        name="index"
        options={{
          title: 'Özet',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" focused={focused} color={color} />
          ),
        }}
      />
      <MaterialTopTabs.Screen
        name="expenses"
        options={{
          title: 'Harcamalar',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="list" focused={focused} color={color} />
          ),
        }}
      />
      <MaterialTopTabs.Screen
        name="monthly"
        options={{
          title: 'Aylık',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="bar-chart" focused={focused} color={color} />
          ),
        }}
      />
      <MaterialTopTabs.Screen
        name="settings"
        options={{
          title: 'Ayarlar',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="settings" focused={focused} color={color} />
          ),
        }}
      />
    </MaterialTopTabs>
  );
}
