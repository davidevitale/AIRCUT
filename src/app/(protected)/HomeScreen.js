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
import BarberPost from '../../components/BarberPost';
import { getAllPostsWithLikeStatus } from '../../services/postService';
import { getCurrentUserData } from '../../services/userService';
import { setBarberProfileContext } from '../../services/barberProfileStore';
import { Image } from 'expo-image';

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
  onPress,
}) => (
  <View style={styles.searchHeader}>
    <BlurView intensity={24} tint="light" style={styles.searchBlur}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.searchInputContainer, { flexDirection: 'row', justifyContent: 'space-between' }]}
        onPress={onPress}
      >
        <Text style={styles.searchPlaceholder}>{placeholder}</Text>
        <Pressable
          onPress={onPress}
          style={{ width: 20, height: 20 }}
        >
          <Image
            source={require('../../../assets/filter.png')}
            style={{ width: '100%', height: '100%' }}
            tintColor='#8e8e8e'
          />
        </Pressable>
      </TouchableOpacity>
    </BlurView>
  </View>
);

const HomeScreen = ({ onViewProfile, onHashtagPress }) => {
  const { t } = useTranslation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasConnectionError, setHasConnectionError] = useState(false);

  // console.log(JSON.stringify(posts, null, 2))
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setHasConnectionError(false);

      const userData = await getCurrentUserData();
      const userId = userData?.user?.uid;
      const userSelectedTags = userData?.userData?.typesCut || [];
      const postsWithLikeStatus = await getAllPostsWithLikeStatus(
        userId,
        userSelectedTags,
      );

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleViewProfile = useCallback(
    (barberName) => {
      if (!barberName) return;

      if (onViewProfile) {
        onViewProfile(barberName);
        return;
      }

      setBarberProfileContext({
        returnTo: {
          pathname: "/(protected)/HomeScreen",
        },
      });

      router.push({
        pathname: "/(protected)/BarberProfileScreen",
        params: { barberName },
      });
    },
    [onViewProfile],
  );

  const listHeader = (
    <SearchBar
      placeholder={t('HomeScreen.searchPlaceholder')}
      onPress={() =>
        router.push({
          pathname: '/(protected)/SearchScreen',
          params: { openFilter: '1' },
        })
      }
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
      <FlatList
        automaticallyAdjustKeyboardInsets
        style={styles.mainContent}
        data={posts}
        renderItem={renderListItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={renderEmptyContent}
        contentContainerStyle={[
          styles.listContent,
          posts.length === 0 && styles.listEmptyContent,
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  searchBlur: {
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
