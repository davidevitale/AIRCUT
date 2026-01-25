import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

// Hook per monitorare lo stato della connessione Firebase
export const useFirebaseConnection = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [lastConnectionCheck, setLastConnectionCheck] = useState(Date.now());

  const checkConnection = async () => {
    try {
      // Prova una semplice operazione per testare la connessione
      const testRef = doc(db, '_test', 'connection');
      await getDoc(testRef);

      if (!isConnected) {
        console.log('Firebase: Connection restored');
        setIsConnected(true);
      }
    } catch (error) {
      if (error.code === 'unavailable' ||
        error.message?.includes('Could not reach Cloud Firestore backend')) {

        if (isConnected) {
          console.log('Firebase: Connection lost');
          setIsConnected(false);
        }
      }
    } finally {
      setLastConnectionCheck(Date.now());
    }
  };

  useEffect(() => {
    // Controlla la connessione ogni 10 secondi
    const interval = setInterval(checkConnection, 10000);

    // Controlla immediatamente
    checkConnection();

    return () => clearInterval(interval);
  }, [isConnected]);

  return { isConnected, checkConnection, lastConnectionCheck };
};
