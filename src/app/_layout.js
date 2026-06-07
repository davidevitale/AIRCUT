import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "../context/AuthContext";
import { ToastProvider } from "../context/ToastContext";


const _layout = () => {
  return (
    // GestureHandlerRootView richiesto da react-native-gesture-handler v2+
    // (usato in BarberPost per il double-tap like e nello stack per lo swipe-back).
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ToastProvider>
        <AuthProvider>
          {/* M5 Extra B — abilita swipe-back orizzontale su tutte le schermate
              dello stack root. Le tab della bottom navbar restano stabili: lo
              swipe-back agisce solo quando si naviga sopra (es. da feed ad
              account barbiere). gestureEnabled è il default su iOS, qui lo
              esplicitiamo + animation slide_from_right per coerenza Android. */}
          <Stack
            screenOptions={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: "horizontal",
              animation: "slide_from_right",
              fullScreenGestureEnabled: true,
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="auth" />
            <Stack.Screen name="(protected)" />
          </Stack>
        </AuthProvider>
      </ToastProvider>
    </GestureHandlerRootView>
  );
};

export default _layout
