import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Dimensions,
  TouchableOpacity 
} from 'react-native';

const { width } = Dimensions.get('window');

const Toast = ({ 
  message, 
  type = 'error', // 'success', 'warning', 'error', 'info'
  duration = 4000, 
  onHide,
  visible 
}) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Mostra il toast
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Nascondi automaticamente dopo la durata specificata
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onHide) {
        onHide();
      }
    });
  };

  const getToastStyle = () => {
    switch (type) {
      case 'success':
        return { backgroundColor: '#4CAF50' };
      case 'warning':
        return { backgroundColor: '#FF9800' };
      case 'error':
        return { backgroundColor: '#F44336' };
      case 'info':
        return { backgroundColor: '#2196F3' };
      default:
        return { backgroundColor: '#323232' };
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'info':
        return 'ℹ️';
      default:
        return '';
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.toastContainer, getToastStyle()]}
        onPress={hideToast}
        activeOpacity={0.8}
      >
        <Text style={styles.icon}>{getIcon()}</Text>
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10000,
    paddingHorizontal: 16,
    paddingTop: 50, // Account per status bar
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  icon: {
    fontSize: 18,
    marginRight: 12,
  },
  message: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default Toast;
