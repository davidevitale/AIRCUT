import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";


const _layout = () => {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  )
}

export default _layout