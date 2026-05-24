import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { ToastProvider } from "@kritikhedau/react-native-toastify";


const _layout = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="(protected)" />
          {/* Modal route paused for now. SearchScreen uses a local React Native Modal. */}
          {/* <Stack.Screen
            name="Modal"
            options={{
              presentation: "formSheet",
              headerShown: false,
              sheetGrabberVisible: true,
            }}
          /> */}
        </Stack>
      </AuthProvider>
    </ToastProvider>
  )
}

export default _layout
