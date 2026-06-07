import React, { useRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTabBarScroll } from '../context/TabBarScrollContext';

/**
 * FloatingTabBar — sostituisce il tabBar di default di expo-router.
 *
 * Iter di iterazione (v3, brief "perfezionamento"):
 *  1) L'INTERO container (glass + icone + pill) si rimpicciolisce come un
 *     unico oggetto coeso: un solo `transform: scale` applicato al wrapper,
 *     niente più interpolazioni separate di height/padding/iconSize.
 *  2) Scala minima alzata a MIN_SCALE = 0.86 (era ~0.75 effettivo).
 *  3) Bidirezionale fluido: lo scale target è guidato da withSpring (stessa
 *     curva in entrambe le direzioni), riportato indietro non appena lo scroll
 *     si inverte di pochi pixel (THRESHOLD).
 *  4) Pill background sulla tab attiva (stile screenshot Instagram).
 *  5) Bounce su press-in invariato (scale 0.82 → spring back).
 */

const BAR_HEIGHT = 64;
const ICON_SIZE = 26;
const PILL_VERTICAL_PADDING = 8;
const PILL_HORIZONTAL_PADDING = 18;
const HORIZONTAL_MARGIN = 16;

// Scala min/max dell'intero container glass.
const MAX_SCALE = 1.0;
const MIN_SCALE = 0.86;

// Soglia per considerare un cambio di direzione dello scroll significativo.
// Sotto i 2px non riallarghiamo (evita jitter su micro-movimenti).
const DIRECTION_THRESHOLD = 2;

/**
 * Bottone singolo. Il pill background avvolge l'icona ed è visibile solo
 * sulla tab attiva. Sul press-in tutto il bottone (pill + icona) fa il
 * micro-bounce in maniera coesa.
 */
const TabBarButton = ({
  route,
  descriptor,
  isFocused,
  onPress,
  onLongPress,
}) => {
  const pressScale = useSharedValue(1);

  const animatedPressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const handlePressIn = () => {
    pressScale.value = withTiming(0.82, { duration: 90 });
  };
  const handlePressOut = () => {
    pressScale.value = withSpring(1, { damping: 12, stiffness: 220, mass: 0.6 });
  };

  const { options } = descriptor;
  const label = options.tabBarAccessibilityLabel ?? options.title ?? route.name;
  // Bianco su pill per l'icona attiva, grigio chiaro per le inattive
  // (coerente con lo screenshot Instagram + stile precedente Aircut).
  const color = isFocused ? '#FFFFFF' : '#8e8e93';

  const iconNode =
    typeof options.tabBarIcon === 'function'
      ? options.tabBarIcon({
          focused: isFocused,
          color,
          size: ICON_SIZE,
        })
      : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      android_ripple={null}
      hitSlop={8}
      style={styles.tabButton}
    >
      <Reanimated.View style={[styles.pillWrapper, animatedPressStyle]}>
        {/* Pill background — visibile solo se isFocused. Stesso rounded del
            container, leggermente più scuro per staccare dal vetro. */}
        {isFocused ? (
          <View style={styles.activePillBackground} pointerEvents="none" />
        ) : null}
        <View style={styles.iconBox}>{iconNode}</View>
      </Reanimated.View>
    </Pressable>
  );
};

export default function FloatingTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { scrollY } = useTabBarScroll();
  // Task 2: ref dichiarata in cima — i hook devono sempre essere chiamati nello
  // stesso ordine, prima di qualunque early-return condizionale (Rules of Hooks).
  const lastVisibleIndexRef = useRef(state.index);

  // ===== Bidirectional scale (req 3) =====
  // `scale` è una SharedValue separata, animata via withSpring sia in shrink
  // che in expand. Una useAnimatedReaction osserva lo scrollY e cambia il
  // target appena la direzione dello scroll si inverte (o quando ci si trova
  // in cima alla pagina). In questo modo:
  //   - scroll down → scale tende a MIN_SCALE (spring stessa curva)
  //   - scroll up   → scale tende a MAX_SCALE (spring stessa curva)
  //   - micro-jitter sotto THRESHOLD viene ignorato.
  const scale = useSharedValue(MAX_SCALE);
  const prevScrollY = useSharedValue(0);
  const targetScale = useSharedValue(MAX_SCALE);

  // Curva spring condivisa tra le due direzioni (req 3).
  const SPRING = { damping: 18, stiffness: 160, mass: 0.7 };

  useAnimatedReaction(
    () => scrollY.value,
    (curr, prev) => {
      'worklet';
      if (curr == null) return;
      const last = prevScrollY.value;
      const delta = curr - last;

      // Sempre full-size in cima alla pagina.
      if (curr <= 0) {
        if (targetScale.value !== MAX_SCALE) {
          targetScale.value = MAX_SCALE;
          scale.value = withSpring(MAX_SCALE, SPRING);
        }
        prevScrollY.value = curr;
        return;
      }

      if (Math.abs(delta) < DIRECTION_THRESHOLD) return;

      if (delta > 0) {
        // Scroll DOWN → shrink.
        if (targetScale.value !== MIN_SCALE) {
          targetScale.value = MIN_SCALE;
          scale.value = withSpring(MIN_SCALE, SPRING);
        }
      } else {
        // Scroll UP → expand.
        if (targetScale.value !== MAX_SCALE) {
          targetScale.value = MAX_SCALE;
          scale.value = withSpring(MAX_SCALE, SPRING);
        }
      }
      prevScrollY.value = curr;
    },
    [scrollY]
  );

  // ===== Container animated style (req 1) =====
  // IMPORTANTE: il transform: scale va applicato al ROOT CONTAINER (la View
  // esterna position:absolute con shadow/zIndex), NON al BlurView.
  // Il BlurView nativo (UIVisualEffectView su iOS / blur layer su Android)
  // ignora il transform diretto per il proprio layer di blur: lo applica
  // solo ai children, risultando in uno shrink visivamente "rotto" (il
  // riquadro di vetro resta delle dimensioni piene mentre il contenuto
  // dentro si rimpicciolisce). Spostando il transform al root container
  // tutto il sotto-albero (blur + pill + icone + shadow) scala come blocco
  // unico e coeso — soluzione corretta richiesta dal brief.
  const containerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scale.value,
      [MIN_SCALE, MAX_SCALE],
      [0.96, 1],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ scale: scale.value }],
      opacity,
    };
  });

  // ===== Filtraggio route (invariato) =====
  const visibleRoutes = state.routes.filter((route) => {
    const opts = descriptors[route.key]?.options;
    if (!opts) return false;
    if (typeof opts.tabBarIcon !== 'function') return false;
    if (opts.tabBarButton) {
      const itemStyle = opts.tabBarItemStyle;
      const flattened = Array.isArray(itemStyle)
        ? Object.assign({}, ...itemStyle.filter(Boolean))
        : (itemStyle || {});
      if (flattened.display === 'none') return false;
    }
    return true;
  });

  // Nascondi solo se la route corrente lo richiede esplicitamente.
  const currentRoute = state.routes[state.index];
  const currentOpts = descriptors[currentRoute.key]?.options;
  const currentHasIcon = typeof currentOpts?.tabBarIcon === 'function';
  if (currentHasIcon) {
    const currentTabBarStyle = currentOpts?.tabBarStyle;
    const flatCurrent = Array.isArray(currentTabBarStyle)
      ? Object.assign({}, ...currentTabBarStyle.filter(Boolean))
      : (currentTabBarStyle || {});
    if (flatCurrent.display === 'none') {
      return null;
    }
  }
  if (visibleRoutes.length === 0) {
    return null;
  }

  // ===== Effective focused index (Task 2) =====
  // Quando si entra in una route "figlia" della tab (es. dettaglio foto da
  // LikeScreen, EditClientProfileScreen dall'account, PostListingScreen, ecc.)
  // la route attiva di expo-router NON è una delle visibleRoutes (`href: null`,
  // niente tabBarIcon). Di default `state.index` punta a quella route nascosta
  // e nessun bottone risulta `isFocused`, quindi la pill della tab scompare.
  //
  // Fix: memorizziamo (in `lastVisibleIndexRef`, dichiarata in cima) l'ultimo
  // `state.index` che corrispondeva a una route con icona, e lo usiamo come
  // fallback quando la route corrente non ne ha. Così la pill resta visibile
  // sulla tab da cui l'utente è sceso nel sotto-flusso.
  if (currentHasIcon) {
    lastVisibleIndexRef.current = state.index;
  }
  const effectiveFocusedIndex = currentHasIcon
    ? state.index
    : lastVisibleIndexRef.current;

  return (
    // ROOT CONTAINER: Reanimated.View. Qui applichiamo il transform: scale
    // così l'intero blocco (BlurView + shadow + pill + icone) si rimpicciolisce
    // come singolo oggetto coeso. La transformOrigin di default è il centro
    // della view, l'effetto visivo è simmetrico e leggibile.
    <Reanimated.View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          bottom: Math.max(insets.bottom, 12),
          left: HORIZONTAL_MARGIN,
          right: HORIZONTAL_MARGIN,
        },
        containerAnimatedStyle,
      ]}
    >
      <BlurView
        intensity={Platform.OS === 'ios' ? 60 : 95}
        tint="light"
        style={styles.blurWrapper}
      >
        <View style={styles.glassOverlay} pointerEvents="none" />

        <View style={styles.row}>
          {visibleRoutes.map((route) => {
            const descriptor = descriptors[route.key];
            const realIndex = state.routes.findIndex((r) => r.key === route.key);
            const isFocused = effectiveFocusedIndex === realIndex;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <TabBarButton
                key={route.key}
                route={route}
                descriptor={descriptor}
                isFocused={isFocused}
                onPress={onPress}
                onLongPress={onLongPress}
              />
            );
          })}
        </View>
      </BlurView>
    </Reanimated.View>
  );
}

const PILL_HEIGHT = ICON_SIZE + PILL_VERTICAL_PADDING * 2;
const PILL_WIDTH = ICON_SIZE + PILL_HORIZONTAL_PADDING * 2;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1000,
    elevation: 24,
  },
  blurWrapper: {
    height: BAR_HEIGHT,
    overflow: 'hidden',
    borderRadius: BAR_HEIGHT / 2, // pill totale del container
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.55)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 12,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.88)',
    justifyContent: 'center',
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: '100%',
    paddingHorizontal: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  pillWrapper: {
    // Pill ha dimensioni fisse: l'intera barra si ridimensiona via transform
    // del container, non variando width/height qui (req 1 — coesione).
    minWidth: PILL_WIDTH,
    height: PILL_HEIGHT,
    paddingHorizontal: PILL_HORIZONTAL_PADDING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePillBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: PILL_HEIGHT / 2,
    // Pill scura semi-trasparente, come nello screenshot Instagram.
    // Si stacca dal vetro chiaro senza essere aggressiva.
    backgroundColor: 'rgba(60, 60, 67, 0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  iconBox: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Compat: alcune schermate potrebbero importare TabIconImage; lo manteniamo.
export const TabIconImage = ({ source, color }) => (
  <Image
    source={source}
    style={{ width: '100%', height: '100%', tintColor: color }}
    contentFit="contain"
  />
);
