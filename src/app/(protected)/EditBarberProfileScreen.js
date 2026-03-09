import { router } from 'expo-router';
import EditBarberProfileScreen from '../../screens/EditBarberProfileScreen';

export default function EditBarberProfileRoute() {
  return <EditBarberProfileScreen onGoBack={() => router.back()} />;
}
