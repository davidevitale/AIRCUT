import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChange } from '../services/authService';

// 1. Create context
const AuthContext = createContext(null);

// 2. Provider
export const AuthProvider = ({ children }) => {
  const [authStatus, setAuthStatus] = useState('loading');
  // 'loading' | 'authenticated' | 'unauthenticated'

  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    console.log('[Auth] Subscribing to auth state');

    // Safety timeout (same idea as your old App.js)
    const timeout = setTimeout(() => {
      console.warn('[Auth] Auth timeout → unauthenticated');
      setAuthStatus('unauthenticated');
    }, 10000);

    const unsubscribe = onAuthStateChange((authData) => {
      clearTimeout(timeout);

      console.log('[Auth] Auth state changed:', authData);

      if (authData) {
        setUser(authData.user);
        setRole(authData.role);
        setUserData(authData.userData);
        setAuthStatus('authenticated');
      } else {
        setUser(null);
        setRole(null);
        setUserData(null);
        setAuthStatus('unauthenticated');
      }
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const value = {
    authStatus,
    user,
    role,
    userData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. Hook (nice DX)
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};
