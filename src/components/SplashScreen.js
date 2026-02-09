import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Dimensions, StyleSheet } from 'react-native';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ onFinish }) => {
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('SplashScreen: Starting animation');
    
    // Timeout di sicurezza per evitare blocchi
    const safetyTimeout = setTimeout(() => {
      console.warn('SplashScreen: Safety timeout - forcing finish');
      onFinish();
    }, 5000); // 5 secondi massimo

    const sequence = Animated.sequence([
      // Appare il testo
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]);

    sequence.start(() => {
      console.log('SplashScreen: Animation completed, finishing in 1 second');
      // Aspetta un po' prima di chiamare onFinish
      setTimeout(() => {
        clearTimeout(safetyTimeout);
        console.log('SplashScreen: Calling onFinish');
        onFinish();
      }, 1000);
    });

    return () => clearTimeout(safetyTimeout);
  }, []);

  return (
    <View style={styles.container}>
      {/* Solo la scritta AirCut */}
      <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
        <Text style={styles.logoText}>aircut</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  textContainer: {
    alignItems: 'center',
  },
  logoText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#00BCD4',
  },
});

export default SplashScreen;
