import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
} from 'react-native';

/**
 * Toast — banner minimale coerente con il tema azzurro/celeste dell'app.
 *
 * Sostituisce il vecchio rettangolo verde/rosso/blu pieno con uno stile
 * "Apple-like": pillola arrotondata con sfondo bianco velato, bordo cyan
 * sottile, ombra morbida, icona dentro un cerchio.
 *
 * Mantiene la stessa API del Toast precedente:
 *   - props: { message, type, duration, visible, onHide }
 *   - type ∈ 'success' | 'error' | 'warning' | 'info'
 *   - auto-hide dopo `duration` ms; tap per chiudere manualmente.
 */
const Toast = ({
  message,
  type = 'info',
  duration = 4000,
  onHide,
  visible,
}) => {
  // Anima il toast dall'alto: -40px (fuori) → 0 (in posizione).
  const slideAnim = useRef(new Animated.Value(-40)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 16,
        stiffness: 180,
        mass: 0.7,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      hideToast();
    }, duration);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, duration]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -40,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onHide) onHide();
    });
  };

  if (!visible) return null;

  const typeStyle = styles[type] || styles.info;
  const iconCircleStyle = typeIconCircle[type] || typeIconCircle.info;
  const iconTextStyle = typeIconText[type] || typeIconText.info;

  // Glifo coerente: ✓ per success, ! per error/warning, i per info.
  const glyph =
    type === 'success' ? '✓' : type === 'info' ? 'i' : '!';

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <Pressable
        onPress={hideToast}
        style={[styles.toast, typeStyle]}
        accessibilityRole="alert"
      >
        <View style={[styles.iconCircle, iconCircleStyle]}>
          <Text style={[styles.iconText, iconTextStyle]}>{glyph}</Text>
        </View>
        <Text style={styles.toastText} numberOfLines={3}>
          {message}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Wrapper trasparente per posizionare il toast e gestire l'animazione.
  wrapper: {
    position: 'absolute',
    top: 58,
    left: 24,
    right: 24,
    zIndex: 9999,
    elevation: 24,
  },
  toast: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    // gap funziona su RN 0.71+; fallback con marginLeft sul testo
    // garantisce coerenza su versioni più vecchie.
    gap: 12,
    backgroundColor: 'rgba(236, 253, 255, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(31, 190, 210, 0.35)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    ...Platform.select({ android: { paddingVertical: 14 } }),
  },
  // Varianti per tipo: cambiano solo il colore del fondo e del bordo,
  // mantenendo il linguaggio visivo coerente in tutta l'app.
  success: {
    backgroundColor: 'rgba(236, 253, 255, 0.96)',
    borderColor: 'rgba(31, 190, 210, 0.35)',
  },
  error: {
    backgroundColor: 'rgba(255, 245, 245, 0.98)',
    borderColor: 'rgba(255, 99, 132, 0.35)',
  },
  warning: {
    backgroundColor: 'rgba(255, 251, 235, 0.98)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  info: {
    backgroundColor: 'rgba(245, 251, 255, 0.98)',
    borderColor: 'rgba(31, 190, 210, 0.25)',
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#BEEFF6',
    // Compat: se gap non funziona, garantiamo lo spazio.
    marginRight: Platform.select({ ios: 0, android: 12, default: 0 }),
  },
  iconText: {
    color: '#12AFC4',
    fontSize: 17,
    fontWeight: '800',
  },
  toastText: {
    flex: 1,
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
});

// Mini-mappe per il colore di icona/cerchio in base al tipo (cyan di default,
// rosa-rosso per error, ambra per warning).
const typeIconCircle = {
  success: { backgroundColor: '#BEEFF6' },
  info: { backgroundColor: '#D6EEFB' },
  warning: { backgroundColor: '#FEF3C7' },
  error: { backgroundColor: '#FFE2E8' },
};

const typeIconText = {
  success: { color: '#12AFC4' },
  info: { color: '#0EA5E9' },
  warning: { color: '#B45309' },
  error: { color: '#E11D48' },
};

export default Toast;
