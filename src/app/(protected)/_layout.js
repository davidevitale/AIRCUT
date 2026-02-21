import { Tabs, Redirect } from "expo-router";
import { View, ActivityIndicator, Image } from "react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";

const logoHome = require("../../../assets/icons8-casa-256.png");
const logoLike = require("../../../assets/icons8-cuore-48.png");
const logoShop = require("../../../assets/icons8-borsa-della-spesa-96.png");
const logoAccount = require("../../../assets/icons8-user-96.png");
const logoAdd = require("../../../assets/icons8-add-96.png");

function TabIcon({ source, color }) {
  return (
    <Image
      source={source}
      style={{
        width: 25,
        height: 25,
        resizeMode: "contain",
        tintColor: color,
      }}
    />
  );
}

export default function ProtectedLayout() {
  const { authStatus, role } = useAuth();
  const { t } = useTranslation();
  const isClient = role === "client";

  if (authStatus === "loading") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  if (authStatus === "unauthenticated") {
    return <Redirect href="/auth" />;
  }

  return (
    <Tabs
      initialRouteName="HomeScreen"
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
          title: t("Navigation.home"),
        }}
      />
      <Tabs.Screen
        name="ClientAccountScreen"
        options={{
          href: null,
          title: t("Navigation.account"),
        }}
      />
      <Tabs.Screen
        name="BarberAccountScreen"
        options={{
          href: null,
          title: t("Navigation.account"),
        }}
      />

      <Tabs.Screen
        name="HomeScreen"
        options={{
          title: t("Navigation.home"),
          tabBarIcon: ({ color }) => <TabIcon source={logoHome} color={color} />,
        }}
      />
      <Tabs.Screen
        name="LikeScreen"
        options={{
          title: t("Navigation.likes"),
          tabBarIcon: ({ color }) => <TabIcon source={logoLike} color={color} />,
        }}
      />
      {!isClient && (
        <Tabs.Screen
          name="PostScreen"
          options={{
            title: t("Navigation.add"),
            tabBarIcon: ({ color }) => <TabIcon source={logoAdd} color={color} />,
          }}
        />
      )}
      <Tabs.Screen
        name="ShopScreen"
        options={{
          title: t("Navigation.shop"),
          tabBarIcon: ({ color }) => <TabIcon source={logoShop} color={color} />,
        }}
      />
      <Tabs.Screen
        name="account/index"
        options={{
          title: t("Navigation.account"),
          tabBarIcon: ({ color }) => <TabIcon source={logoAccount} color={color} />,
        }}
      />
    </Tabs>
  );
}
