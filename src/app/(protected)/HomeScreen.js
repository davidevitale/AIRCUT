import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  FlatList,
  Pressable,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Reanimated, { useAnimatedScrollHandler } from 'react-native-reanimated';
import { useTabBarScroll } from '../../context/TabBarScrollContext';
import BarberPost from '../../components/BarberPost';

// FlatList animata per scroll on UI thread (FloatingTabBar shrink).
const AnimatedFlatList = Reanimated.createAnimatedComponent(FlatList);

import FilterModal from '../../components/FilterModal';
import { getAllPostsWithLikeStatus } from '../../services/postService';
import { getCurrentUserData } from '../../services/userService';
import { setBarberProfileContext } from '../../services/barberProfileStore';
import { setActiveFilterTags, clearActiveFilterTags } from '../../services/filterStore';
import { COLOR_TAG_ID } from '../../services/tagOptions';
import { Image } from 'expo-image';
import { filterPostsByBlocked, getBlockedUids } from '../../services/blockService';

// Normalizza una stringa tag per il confronto (rimuove #, spazi, lowercase).
const normalizeTagText = (value) => (
  String(value || '')
    .replace(/^#/, '')
    .replace(/\s+/g, '')
    .toLowerCase()
);

// Estrae le chiavi tag confrontabili da un post.
const getPostTagKeys = (post) => {
  const tags = Array.isArray(post?.selectedTags) ? post.selectedTags : [];
  return tags.flatMap((tag) => {
    if (typeof tag === 'string') return [normalizeTagText(tag)];
    return [tag?.id, tag?.en, tag?.it, tag?.label?.en, tag?.label?.it]
      .filter(Boolean)
      .map(normalizeTagText);
  });
};

const isFirebaseConnectionError = (error) => (
  error.message?.includes('client is offline') ||
  error.message?.includes('Failed to get document') ||
  error.code === 'unavailable'
);

const ScreenShell = ({ children }) => (
  <View style={styles.screen}>
    <BlurView intensity={28} tint="light" style={styles.backgroundBlur} pointerEvents="none" />
    {children}
  </View>
);

const SearchBar = ({
  placeholder,
  onSearchPress,
  onFilterPress,
  activeFilterCount = 0,
}) => {
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <View style={styles.searchHeader}>
      <BlurView intensity={24} tint="light" style={styles.searchBlur}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.searchInputContainer}
          onPress={onSearchPress}
        >
          <Text style={styles.searchPlaceholder}>{placeholder}</Text>
        </TouchableOpacity>
      </BlurView>
      <Pressable
        onPress={onFilterPress}
        style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityState={{ selected: hasActiveFilters }}
      >
        <Image
          source={require('../../../assets/filter.png')}
          style={styles.filterIcon}
          tintColor={hasActiveFilters ? '#00BCD4' : '#8e8e8e'}
        />
        {hasActiveFilters ? (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>
              {activeFilterCount > 9 ? '9+' : activeFilterCount}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
};

const HomeScreen = ({ onViewProfile, onHashtagPress }) => {
  const { t } = useTranslation();
  // SharedValue scrollY condivisa con FloatingTabBar via context (UI thread, 60fps).
  const { scrollY } = useTabBarScroll();
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      scrollY.value = Math.max(0, event.contentOffset.y);
    },
  });

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasConnectionError, setHasConnectionError] = useState(false);
  // M5 §5.1.c — blocklist locale per filtraggio immediato del feed.
  const [blockedUids, setBlockedUids] = useState(() => new Set());
  // Filtri in-screen (Task 4): selezione locale + visibilità del Modal.
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [filterVisible, setFilterVisible] = useState(false);
  // Il badge riflette i filtri "applicabili" (esclude il tag contenitore "colore").
  const activeFilterCount = selectedFilters.filter((id) => id !== COLOR_TAG_ID).length;

  // console.log(JSON.stringify(posts, null, 2))
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setHasConnectionError(false);

      const userData = await getCurrentUserData();
      const userId = userData?.user?.uid;
      const userSelectedTags = userData?.userData?.preferenceCut || userData?.userData?.typesCut || [];
      const [postsWithLikeStatus, blockedSet] = await Promise.all([
        getAllPostsWithLikeStatus(userId, userSelectedTags),
        getBlockedUids({ force: true }),
      ]);

      setBlockedUids(blockedSet);
      setPosts(postsWithLikeStatus);
    } catch (error) {
      console.error('HomeScreen: Error loading data:', error);
      setPosts([]);

      if (isFirebaseConnectionError(error)) {
        setHasConnectionError(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Applica i filtri selezionati al feed Home (Task 4): mostra solo i post che
  // contengono almeno uno dei tag selezionati. Il tag contenitore "colore" non
  // filtra di per sé (filtrano i colori scelti sotto di esso).
  const visiblePosts = React.useMemo(() => {
    // M5 §5.1.c — filtra prima i post degli utenti bloccati (immediato, no refetch).
    const postsAfterBlock = filterPostsByBlocked(posts, blockedUids);

    const activeKeys = selectedFilters
      .filter((id) => id !== COLOR_TAG_ID)
      .map(normalizeTagText);
    if (activeKeys.length === 0) return postsAfterBlock;

    return postsAfterBlock.filter((post) => {
      const postKeys = getPostTagKeys(post);
      return activeKeys.some((key) => postKeys.includes(key));
    });
  }, [posts, selectedFilters, blockedUids]);

  // Callback dal menu tre puntini: aggiunge l'uid alla blocklist locale per
  // far sparire immediatamente i contenuti dell'autore (senza refetch).
  const handleBlocked = useCallback((blockedUid) => {
    if (!blockedUid) return;
    setBlockedUids((prev) => {
      const next = new Set(prev);
      next.add(blockedUid);
      return next;
    });
  }, []);

  // Applica i filtri dal Modal e li condivide con lo store (per la SearchScreen).
  const handleApplyFilters = useCallback((tags) => {
    const next = Array.isArray(tags) ? tags : [];
    setSelectedFilters(next);
    const applicable = next.filter((id) => id !== COLOR_TAG_ID);
    if (applicable.length > 0) {
      setActiveFilterTags(applicable);
    } else {
      clearActiveFilterTags();
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleViewProfile = useCallback(
    (barberName, barberUid) => {
      if (!barberName && !barberUid) return;

      if (onViewProfile) {
        onViewProfile(barberName, barberUid);
        return;
      }

      setBarberProfileContext({
        returnTo: {
          pathname: "/(protected)/HomeScreen",
        },
      });

      // Naviga per uid quando disponibile (identità canonica), altrimenti per nome.
      router.push({
        pathname: "/(protected)/BarberProfileScreen",
        params: barberUid ? { uid: barberUid } : { barberName },
      });
    },
    [onViewProfile],
  );

  const listHeader = (
    <SearchBar
      placeholder={t('HomeScreen.searchPlaceholder')}
      activeFilterCount={activeFilterCount}
      onSearchPress={() =>
        router.push('/(protected)/SearchScreen')
      }
      onFilterPress={() => setFilterVisible(true)}
    />
  );

  const renderListItem = ({ item }) => {
    // console.log(JSON.stringify(item, null, 2))
    return (
      <BlurView
        intensity={26}
        tint="light"
        style={styles.glassCard}
      >
        <BarberPost
          barber={item}
          onViewProfile={handleViewProfile}
          onHashtagPress={onHashtagPress}
          onBlocked={handleBlocked}
        />
      </BlurView>
    );
  };

  const renderEmptyContent = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>
          {hasConnectionError ? t('HomeScreen.slowConnection') : t('HomeScreen.noPostsAvailable')}
        </Text>
        <Text style={styles.emptyDescription}>
          {hasConnectionError
            ? t('HomeScreen.checkConnectionAndPullToRefresh')
            : t('HomeScreen.noPhotosYet')}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <ScreenShell>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00BCD4" />
          <Text style={styles.loadingText}>{t('HomeScreen.loadingFeed')}</Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <AnimatedFlatList
        automaticallyAdjustKeyboardInsets
        style={styles.mainContent}
        data={visiblePosts}
        renderItem={renderListItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={renderEmptyContent}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: 120 }, // spazio per la FloatingTabBar (max height + safe area)
          visiblePosts.length === 0 && styles.listEmptyContent,
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      />

      {/* Filtri in-screen (Task 4): Modal sopra la Home, nessuna navigazione. */}
      <FilterModal
        visible={filterVisible}
        initialSelected={selectedFilters}
        onApply={handleApplyFilters}
        onClose={() => setFilterVisible(false)}
      />
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#b8b7b74a',
    paddingTop: 80,
  },
  backgroundBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  mainContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  listContent: {
    paddingBottom: 24,
  },
  listEmptyContent: {
    flexGrow: 1,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  searchBlur: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchPlaceholder: {
    fontSize: 16,
    color: '#8e8e8e',
  },
  filterButton: {
    width: 44,
    height: 44,
    marginLeft: 10,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  filterButtonActive: {
    borderColor: 'rgba(0, 188, 212, 0.7)',
    backgroundColor: 'rgba(0, 188, 212, 0.12)',
  },
  filterIcon: {
    width: 20,
    height: 20,
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: '#00BCD4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  glassCard: {
    marginHorizontal: 12,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
});

export default HomeScreen;
