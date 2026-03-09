import { router } from 'expo-router';
import EditClientProfileScreen from '../../screens/EditClientProfileScreen';

export default function EditClientProfileRoute() {
  return <EditClientProfileScreen onGoBack={() => router.back()} />;
}
