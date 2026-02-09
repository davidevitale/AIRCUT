import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

const ConnectionStatus = () => {
  const [showOfflineBar, setShowOfflineBar] = useState(false);
  const slideAnim = new Animated.Value(-100);

  useEffect(() => {
    let offlineTimeout;
    
    const showOffline = () => {
      if (!showOfflineBar) {
        setShowOfflineBar(true);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    };

    const hideOffline = () => {
      if (showOfflineBar) {
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowOfflineBar(false);
        });
      }
    };

    const originalError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      
      if (message.includes('Could not reach Cloud Firestore backend') || 
          message.includes('Backend didn\'t respond within')) {
        showOffline();
        
        clearTimeout(offlineTimeout);
        offlineTimeout = setTimeout(() => {
          hideOffline();
        }, 5000);
      }
      
      originalError(...args);
    };

    return () => {
      console.error = originalError;
      clearTimeout(offlineTimeout);
    };
  }, [showOfflineBar]);

  if (!showOfflineBar) {
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.offlineContainer, 
        { transform: [{ translateY: slideAnim }] }
      ]}
    >
      <View style={styles.offlineBar}>
        <Text style={styles.offlineText}>
          📶 Connessione lenta o assente
        </Text>
        <Text style={styles.offlineSubtext}>
          L'app funziona in modalità offline
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  offlineContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  offlineBar: {
    backgroundColor: '#FF6B35',
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  offlineText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  offlineSubtext: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.9,
  },
});

export default ConnectionStatus;