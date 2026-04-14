import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize } from '../../constants/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  name,
  focused,
}: {
  name: IoniconsName;
  focused: boolean;
}) {
  return (
    <Ionicons
      name={focused ? name : (`${name}-outline` as IoniconsName)}
      size={24}
      color={focused ? Colors.primary : Colors.textSecondary}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: FontSize.xs,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Özet',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Harcamalar',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="list" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="monthly"
        options={{
          title: 'Aylık',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="bar-chart" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ayarlar',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="settings" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
