import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function _layout() {
  const { authStatus, role } = useAuth();
  console.log("_layout", role)
  const { t } = useTranslation()
  const isClient = role === 'client';

  // 1️⃣ Still checking auth → block everything
  if (authStatus === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  // 2️⃣ Not logged in → kick to auth
  if (authStatus === 'unauthenticated') {
    return <Redirect href="/auth" />;
  }

  // 3️⃣ Logged in → allow access
  return (
    <Tabs screenOptions={{ headerShown: false }} initialRouteName='HomeScreen'>
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="ClientAccountScreen" options={{ href: null }} />
      <Tabs.Screen name="BarberAccountScreen" options={{ href: null }} />
      <Tabs.Screen
        name="HomeScreen"
        options={{
          title: t('Navigation.home'),
          tabBarIcon: ({ color }) => <MaterialIcons size={28} name="house" color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="LikeScreen"
        options={{
          title: t('Navigation.likes'),
          tabBarIcon: ({ color }) => <MaterialIcons size={28} name="favorite" color={color} />,
          headerShown: false,
        }}
      />
      {!isClient && (
        <Tabs.Screen
          name="AddScreen"
          options={{
            title: t('Navigation.add'),
            tabBarIcon: ({ color }) => <MaterialIcons size={28} name="add-circle" color={color} />,
            headerShown: false,
          }}
        />
      )}
      <Tabs.Screen
        name="ShopScreen"
        options={{
          title: t('Navigation.shop'),
          tabBarIcon: ({ color }) => <MaterialIcons size={28} name="shopping-cart" color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="account/index"
        options={{
          title: t('Navigation.account'),
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="person" size={28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
