import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import '../i18n';

const SplashScreen = () => {
  const textOpacity = useRef(new Animated.Value(0)).current;
  const { authStatus } = useAuth();


  // Animation (unchanged)
  useEffect(() => {
    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // Routing based on auth state
  useEffect(() => {
    if (authStatus === 'authenticated') {
      router.replace('/(protected)');
    }

    if (authStatus === 'unauthenticated') {
      router.replace('/auth');
    }
  }, [authStatus]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: textOpacity }}>
        <Text style={styles.logoText}>aircut</Text>
      </Animated.View>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  logoText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#00BCD4',
    fontWeight: 'bold',
  },
});
