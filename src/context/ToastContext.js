import React, { createContext, useContext, useState } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info', duration = 4000) => {
    const id = Date.now();
    const newToast = {
      id,
      message,
      type,
      duration,
      visible: true,
    };

    setToasts(prev => [...prev, newToast]);
  };

  const hideToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const showError = (message, duration = 4000) => {
    showToast(message, 'error', duration);
  };

  const showSuccess = (message, duration = 3000) => {
    showToast(message, 'success', duration);
  };

  const showWarning = (message, duration = 4000) => {
    showToast(message, 'warning', duration);
  };

  const showInfo = (message, duration = 3000) => {
    showToast(message, 'info', duration);
  };

  // Mostra solo l'ultimo toast per evitare sovrapposizioni
  const activeToast = toasts[toasts.length - 1];

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showError,
        showSuccess,
        showWarning,
        showInfo,
        // Alias `show(...)` per compatibilità con i call site che usavano
        // l'API di `@kritikhedau/react-native-toastify` (LoginScreen,
        // RegisterBarberScreen, PostScreen). Accetta sia stringhe semplici
        // sia oggetti `{ message, type, duration }` (forma usata da
        // LoginScreen come "customToast"). Quando viene passato un oggetto
        // senza `message`, fallback su `String(payload)`.
        show: (payload, type = 'info', duration) => {
          if (payload && typeof payload === 'object') {
            const msg = payload.message ?? payload.text ?? String(payload);
            showToast(msg, payload.type ?? type, payload.duration ?? duration ?? 4000);
          } else {
            showToast(String(payload ?? ''), type, duration ?? 4000);
          }
        },
      }}
    >
      {children}
      {activeToast && (
        <Toast
          key={activeToast.id}
          message={activeToast.message}
          type={activeToast.type}
          duration={activeToast.duration}
          visible={activeToast.visible}
          onHide={() => hideToast(activeToast.id)}
        />
      )}
    </ToastContext.Provider>
  );
};
