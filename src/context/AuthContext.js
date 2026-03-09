import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUserData, onAuthStateChange } from '../services/authService';

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
    let isMounted = true;

    const resolveUserDataWithRetry = async (maxAttempts = 6, delayMs = 400) => {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const current = await getCurrentUserData();
          if (current?.user && current?.role) {
            return current;
          }
        } catch (error) {
          console.warn(`[Auth] Retry ${attempt}/${maxAttempts} failed:`, error?.message);
        }

        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      return null;
    };

    // Safety timeout (same idea as your old App.js)
    const timeout = setTimeout(() => {
      console.warn('[Auth] Auth timeout → unauthenticated');
      setAuthStatus('unauthenticated');
    }, 10000);

    const unsubscribe = onAuthStateChange(async (authData) => {
      clearTimeout(timeout);

      console.log('[Auth] Auth state changed:', authData);
      if (!isMounted) return;

      if (authData?.user && authData?.role) {
        setUser(authData.user);
        setRole(authData.role);
        setUserData(authData.userData);
        setAuthStatus('authenticated');
      } else if (authData?.user && !authData?.role) {
        // Newly registered users can hit this state briefly before profile doc is readable.
        setAuthStatus('loading');
        const resolved = await resolveUserDataWithRetry();

        if (!isMounted) return;

        if (resolved?.user && resolved?.role) {
          setUser(resolved.user);
          setRole(resolved.role);
          setUserData(resolved.userData);
          setAuthStatus('authenticated');
        } else {
          setUser(null);
          setRole(null);
          setUserData(null);
          setAuthStatus('unauthenticated');
        }
      } else {
        setUser(null);
        setRole(null);
        setUserData(null);
        setAuthStatus('unauthenticated');
      }
    });

    return () => {
      isMounted = false;
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
