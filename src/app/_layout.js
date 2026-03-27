import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { ToastProvider } from "@kritikhedau/react-native-toastify";


const _layout = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </ToastProvider>
  )
}

export default _layout