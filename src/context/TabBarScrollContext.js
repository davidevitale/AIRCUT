import React, { createContext, useContext, useMemo } from 'react';
import { useSharedValue } from 'react-native-reanimated';

/**
 * TabBarScrollContext — espone una `scrollY` SharedValue condivisa tra le
 * schermate (che la aggiornano via useAnimatedScrollHandler) e la FloatingTabBar
 * (che la legge in un useAnimatedStyle per rimpicciolirsi sullo scroll down).
 *
 * Tutto vive su UI thread → 60fps senza re-render React.
 *
 * Uso:
 *  - <TabBarScrollProvider> wrappa il layout protetto (già fatto in (protected)/_layout.js).
 *  - Le schermate fanno `const { scrollY } = useTabBarScroll();` e lo collegano
 *    al loro FlatList/ScrollView via useAnimatedScrollHandler.
 *  - FloatingTabBar legge la stessa scrollY per animare scale/translate.
 */
const TabBarScrollContext = createContext(null);

export const TabBarScrollProvider = ({ children }) => {
  const scrollY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);

  const value = useMemo(() => ({ scrollY, lastScrollY }), [scrollY, lastScrollY]);
  return (
    <TabBarScrollContext.Provider value={value}>
      {children}
    </TabBarScrollContext.Provider>
  );
};

export const useTabBarScroll = () => {
  const ctx = useContext(TabBarScrollContext);
  if (!ctx) {
    // Fallback no-op se usato fuori dal provider (es. test, schermate isolate).
    // Restituiamo oggetti dummy così i chiamanti non crashano.
    return {
      scrollY: { value: 0 },
      lastScrollY: { value: 0 },
    };
  }
  return ctx;
};

export default TabBarScrollContext;
