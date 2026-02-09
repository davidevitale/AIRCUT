import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function _layout() {
  const { authStatus,
    user,
    role,
    userData, } = useAuth();
  console.log("_layout", role)

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
          title: 'Home',
          tabBarIcon: ({ color }) => <MaterialIcons size={28} name="house" color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="LikeScreen"
        options={{
          title: 'Preferiti',
          tabBarIcon: ({ color }) => <MaterialIcons size={28} name="favorite" color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="ShopScreen"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color }) => <MaterialIcons size={28} name="shopping-cart" color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="account/index"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="person" size={28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
