import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import BarberPost from '../../components/BarberPost';
import PostGrid from '../../components/PostGrid';
import UserListItem from '../../components/UserListItem';
import { getAllPostsWithLikeStatus, getCurrentUserData, smartSearch } from '../../services/authService';

const SEARCH_DEBOUNCE_MS = 300;

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
  clearIcon,
  searchText,
  onChangeText,
  onClear,
  onFocus,
  autoFocus = false,
}) => (
  <View style={styles.searchHeader}>
    <BlurView intensity={24} tint="light" style={styles.searchBlur}>
      <View style={styles.searchInputContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor="#8e8e8e"
          value={searchText}
          onChangeText={onChangeText}
          onFocus={onFocus}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          autoFocus={autoFocus}
        />
        {searchText.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={onClear}>
            <Text style={styles.clearIcon}>{clearIcon}</Text>
          </TouchableOpacity>
        )}
      </View>
    </BlurView>
  </View>
);

const HomeScreen = ({ onViewProfile, onHashtagPress }) => {
  const { t } = useTranslation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [hasConnectionError, setHasConnectionError] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setHasConnectionError(false);

      const userData = await getCurrentUserData();
      const userId = userData?.user?.uid;
      const postsWithLikeStatus = await getAllPostsWithLikeStatus(userId);

      setCurrentUser(userData);
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

  const clearSearch = useCallback(() => {
    setSearchText('');
    setSearchResults(null);
    setIsSearchActive(false);
  }, []);

  const performSearch = useCallback(async (query) => {
    setSearchLoading(true);

    try {
      const currentUserId = currentUser?.user?.uid || null;
      const results = await smartSearch(query, currentUserId);
      setSearchResults(results);
    } catch (error) {
      console.error('HomeScreen: Errore durante la ricerca:', error);
      setSearchResults({ posts: [], users: [] });
    } finally {
      setSearchLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    const query = searchText.trim();

    if (!query) {
      setSearchResults(null);
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [performSearch, searchText]);

  const openUserProfile = useCallback((user) => {
    if (onViewProfile && user.nomeSalone) {
      onViewProfile(user.nomeSalone);
    }
  }, [onViewProfile]);

  const renderSearchResults = () => {
    if (searchLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00BCD4" />
          <Text style={styles.loadingText}>{t('HomeScreen.searchInProgress')}</Text>
        </View>
      );
    }

    if (!searchResults) {
      return (
        <View style={styles.searchEmptyContainer}>
          <View style={styles.emptyContent}>
            <Text style={styles.emptyTitle}>{t('HomeScreen.discoverBeautyWorld')}</Text>
            <Text style={styles.emptyDescription}>
              {t('HomeScreen.searchHintDescription')}
            </Text>
          </View>
        </View>
      );
    }

    const { posts: searchPosts = [], users = [] } = searchResults;
    const isHashtagSearch = searchText.startsWith('#');
    const hasResults = searchPosts.length > 0 || users.length > 0;

    if (!hasResults) {
      return (
        <View style={styles.searchEmptyContainer}>
          <View style={styles.emptyContent}>
            <Text style={styles.emptyTitle}>{t('HomeScreen.noResults')}</Text>
            <Text style={styles.emptyDescription}>
              {isHashtagSearch
                ? t('HomeScreen.noPostsForTag', { tag: searchText })
                : t('HomeScreen.tryDifferentKeywords')}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <ScrollView style={styles.searchResultsContainer} showsVerticalScrollIndicator={false}>
        {searchPosts.length > 0 && (
          <View style={styles.section}>
            <PostGrid
              posts={searchPosts}
              onPostPress={(post) => console.log('Post selezionato:', post)}
            />
          </View>
        )}

        {users.length > 0 && (
          <View style={styles.section}>
            <FlatList
              data={users}
              renderItem={({ item }) => (
                <UserListItem
                  user={item}
                  onUserPress={() => openUserProfile(item)}
                />
              )}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              style={styles.userListContent}
            />
          </View>
        )}
      </ScrollView>
    );
  };

  const renderFeed = () => (
    <ScrollView
      automaticallyAdjustKeyboardInsets={true}
      style={styles.mainContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <SearchBar
        placeholder={t('HomeScreen.searchPlaceholder')}
        clearIcon={t('HomeScreen.clearSearchIcon')}
        searchText={searchText}
        onChangeText={setSearchText}
        onClear={clearSearch}
        onFocus={() => setIsSearchActive(true)}
      />

      <View style={styles.feedContainer}>
        {posts.map((post) => {
          return (
            <BlurView
              key={post.id}
              intensity={26}
              tint="light"
              style={styles.glassCard}
            >
              <BarberPost
                barber={post}
                onViewProfile={onViewProfile}
                onHashtagPress={onHashtagPress}
              />
            </BlurView>
          )

        }
        )}
      </View>
    </ScrollView>
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

  if (isSearchActive && searchText.trim()) {
    return (
      <ScreenShell>
        <View style={styles.mainContent}>
          <SearchBar
            placeholder={t('HomeScreen.searchPlaceholder')}
            clearIcon={t('HomeScreen.clearSearchIcon')}
            searchText={searchText}
            onChangeText={setSearchText}
            onClear={clearSearch}
            autoFocus
          />
          {renderSearchResults()}
        </View>
      </ScreenShell>
    );
  }

  if (posts.length === 0) {
    return (
      <ScreenShell>
        <ScrollView
          style={styles.mainContent}
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
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
        </ScrollView>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      {renderFeed()}
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
  searchIcon: {
    fontSize: 16,
    color: '#8e8e8e',
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#262626',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearIcon: {
    fontSize: 16,
    color: '#8e8e8e',
  },
  searchResultsContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchEmptyContainer: {
    flex: 1,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  userListContent: {
    paddingBottom: 20,
  },
  feedContainer: {
    paddingTop: 8,
    paddingBottom: 24,
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
