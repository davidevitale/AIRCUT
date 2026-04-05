import BarberAccountScreen from '../BarberAccountScreen';
import ClientAccountScreen from '../ClientAccountScreen';
import { useAuth } from '../../../context/AuthContext';

const index = () => {
  const { authStatus,
    user,
    role,
    userData, } = useAuth();
  console.log("role", role)
  if (role === 'barber') {
    return <BarberAccountScreen userData={userData} />;
  }
  return <ClientAccountScreen />;
}

export default index