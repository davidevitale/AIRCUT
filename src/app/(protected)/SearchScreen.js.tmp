import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  FlatList,
  Pressable,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import PostGrid from '../../components/PostGrid';
import UserListItem from '../../components/UserListItem';
import { getAllBarberPosts } from '../../services/postService';
import { smartSearch } from '../../services/searchService';
import { getCurrentUserData } from '../../services/userService';
import { setPostListingContext } from '../../services/postListingStore';
import { setBarberProfileContext } from '../../services/barberProfileStore';
import { setActiveFilterTags, clearActiveFilterTags } from '../../services/filterStore';
import { getTopPostsByLikes } from '../../services/photoPreview';
import AntDesign from '@expo/vector-icons/AntDesign';
import { SafeAreaView } from 'react-native-safe-area-context';
import Entypo from '@expo/vector-icons/Entypo';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Image } from "expo-image";

const SEARCH_DEBOUNCE_MS = 300;

const ScreenShell = ({ children }) => (
  <SafeAreaView style={styles.screen}>
    <BlurView intensity={28} tint="light" style={styles.backgroundBlur} pointerEvents="none" />
    {children}
  </SafeAreaView>
);

const SearchScreen = ({ onViewProfile }) => {
  const { t, i18n } = useTranslation();
  const { openFilter } = useLocalSearchParams();
  const inputRef = useRef(null);
  const hasHandledOpenFilterRef = useRef(false);
  const { width, height } = Dimensions.get('window')
  const searchRequestIdRef = useRef(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [draftSelectedTags, setDraftSelectedTags] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);

  const getLocalizedText = useCallback((value, fallback = '') => {
    if (!value) return fallback;
    if (typeof value === 'string') return value;

    const language = i18n.language?.toLowerCase() || '';
    return language.startsWith('en')
      ? value.en ?? value.it ?? fallback
      : value.it ?? value.en ?? fallback;
  }, [i18n.language]);

  const normalizeTagText = useCallback((value) => (
    String(value || '')
      .replace(/^#/, '')
      .replace(/\s+/g, '')
      .toLowerCase()
  ), []);

  const getPostTagKeys = useCallback((post) => {
    const tags = Array.isArray(post?.selectedTags) ? post.selectedTags : [];

    return tags.flatMap((tag) => {
      if (typeof tag === 'string') {
        return [normalizeTagText(tag)];
      }

      return [
        tag?.id,
        tag?.en,
        tag?.it,
        tag?.label?.en,
        tag?.label?.it,
      ].filter(Boolean).map(normalizeTagText);
    });
  }, [normalizeTagText]);

  useEffect(() => {
    getCurrentUserData()
      .then(setCurrentUser)
      .catch((error) => {
        console.error('SearchScreen: Error loading user data:', error);
        setCurrentUser(null);
      });
  }, []);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        setTagsLoading(true);
        const tagsSnapshot = await getDocs(collection(db, 'tags'));
        const tags = tagsSnapshot.docs
          .map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
          .filter((tag) => tag.active !== false)
          .sort((a, b) => (
            getLocalizedText(a.label, a.id).localeCompare(getLocalizedText(b.label, b.id))
          ));

        setAvailableTags(tags);
      } catch (error) {
        console.error('SearchScreen: Error loading tags:', error);
        setAvailableTags([]);
      } finally {
        setTagsLoading(false);
      }
    };

    fetchTags();
  }, [getLocalizedText]);

  useEffect(() => {
    if (openFilter === '1') {
      return undefined;
    }

    const focusTimeout = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    return () => clearTimeout(focusTimeout);
  }, [openFilter]);

  useEffect(() => {
    if (openFilter === '1' && !hasHandledOpenFilterRef.current) {
      hasHandledOpenFilterRef.current = true;
      setDraftSelectedTags(selectedTags);
      setFilterModalVisible(true);
    }
  }, [openFilter, selectedTags]);

  const clearSearch = useCallback(() => {
    searchRequestIdRef.current += 1;
    setSearchText('');
    setSearchResults(null);
    setSearchLoading(false);
    inputRef.current?.focus();
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedTags([]);
    setDraftSelectedTags([]);
    setFilteredPosts([]);
    clearActiveFilterTags();
  }, []);

  const toggleTag = useCallback((tagId) => {
    setDraftSelectedTags((prev) => (
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    ));
  }, []);

  const applyTagFilters = useCallback(async () => {
    setFilterModalVisible(false);
    setSearchText('');
    setSearchResults(null);

    if (draftSelectedTags.length === 0) {
      setSelectedTags([]);
      setFilteredPosts([]);
      clearActiveFilterTags();
      return;
    }

    try {
      setFilterLoading(true);
      const selectedTagKeys = availableTags
        .filter((tag) => draftSelectedTags.includes(tag.id))
        .flatMap((tag) => [
          tag.id,
          tag.label?.en,
          tag.label?.it,
        ])
        .filter(Boolean)
        .map(normalizeTagText);
      const posts = await getAllBarberPosts();
      const matchingPosts = posts.filter((post) => {
        const postTagKeys = getPostTagKeys(post);
        return selectedTagKeys.some((tagKey) => postTagKeys.includes(tagKey));
      });

      setSelectedTags(draftSelectedTags);
      setFilteredPosts(matchingPosts);
      // Condividi i filtri attivi con la Home per il badge (Task 4).
      setActiveFilterTags(draftSelectedTags);
    } catch (error) {
      console.error('SearchScreen: Error filtering posts by tags:', error);
      setFilteredPosts([]);
    } finally {
      setFilterLoading(false);
    }
  }, [availableTags, draftSelectedTags, getPostTagKeys, normalizeTagText]);

  const performSearch = useCallback(async (query) => {
    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    setSearchLoading(true);

    try {
      const currentUserId = currentUser?.user?.uid || null;
      const results = await smartSearch(query, currentUserId);
      if (searchRequestIdRef.current === requestId) {
        console.log(JSON.stringify(results, null, 2))
        setSearchResults(results);
      }
    } catch (error) {
      console.error('SearchScreen: Errore durante la ricerca:', error);
      if (searchRequestIdRef.current === requestId) {
        setSearchResults({ posts: [], users: [] });
      }
    } finally {
      if (searchRequestIdRef.current === requestId) {
        setSearchLoading(false);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    const query = searchText.trim();

    if (!query) {
      searchRequestIdRef.current += 1;
      setSearchResults(null);
      setSearchLoading(false);
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [performSearch, searchText]);

  const openUserProfile = useCallback((user) => {
    const barberName = user?.salonName || user?.salonName || user?.barberName;
    if (!barberName) return;

    if (onViewProfile) {
      onViewProfile(barberName);
      return;
    }

    setBarberProfileContext({
      returnTo: {
        pathname: '/(protected)/SearchScreen',
      },
    });

    router.push({
      pathname: '/(protected)/BarberProfileScreen',
      params: { barberName },
    });
  }, [onViewProfile]);

  const openPostListing = useCallback((posts, selectedPost) => {
    if (!Array.isArray(posts) || posts.length === 0) return;

    setPostListingContext({
      posts,
      selectedPostId: selectedPost?.id || null,
      returnTo: {
        pathname: '/(protected)/SearchScreen',
      },
    });

    router.push('/(protected)/PostListingScreen');
  }, []);

  const renderSearchContent = () => {
    const query = searchText.trim();

    if (searchLoading || filterLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00BCD4" />
          <Text style={styles.loadingText}>
            {filterLoading ? 'Loading selected tags...' : t('HomeScreen.searchInProgress')}
          </Text>
        </View>
      );
    }

    if (selectedTags.length > 0 && !query) {
      const selectedLabels = availableTags
        .filter((tag) => selectedTags.includes(tag.id))
        .map((tag) => getLocalizedText(tag.label, tag.id));

      if (filteredPosts.length === 0) {
        return (
          <View style={styles.searchEmptyContainer}>
            <View style={styles.emptyContent}>
              <Text style={styles.emptyTitle}>{t('HomeScreen.noResults')}</Text>
              <Text style={styles.emptyDescription}>
                No posts found for {selectedLabels.join(', ')}
              </Text>
            </View>
          </View>
        );
      }

      return (
        <View style={styles.searchResultsContainer}>
          <View style={styles.selectedFilterHeader}>
            <Text style={styles.selectedFilterText} numberOfLines={1}>
              {selectedLabels.join(', ')}
            </Text>
            <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.section, { paddingHorizontal: width * 0.0465 }]}>
            <PostGrid
              posts={filteredPosts}
              onPostPress={(post) => openPostListing(filteredPosts, post)}
            />
          </View>
        </View>
      );
    }

    if (!query) {
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

    if (!searchResults) {
      return null;
    }

    const { posts: searchPosts = [], users = [] } = searchResults;
    const isHashtagSearch = searchText.startsWith('#');
    const hasResults = searchPosts.length > 0 || users.length > 0;
    // Preview 3 foto (Task 2): le 3 con più like; fallback alle più recenti.
    const getPreviewPostsForUser = (user) => (
      getTopPostsByLikes(
        searchPosts.filter((post) => post?.barberId === user?.id),
        3,
      )
    );

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
      <View style={styles.searchResultsContainer}>


        {users.length > 0 && (
          <View style={[styles.section, { paddingHorizontal: width * 0.0465 }]}>
            <View style={styles.userListContent}>
              {users.map((item) => {
                const previewPosts = getPreviewPostsForUser(item);

                return (
                  <View key={item.id} style={styles.userResultBlock}>
                    <UserListItem
                      user={item}
                      onUserPress={() => openUserProfile(item)}
                    />

                    {previewPosts.length > 0 && (
                      <View style={styles.userPreviewGrid}>
                        <PostGrid
                          posts={previewPosts}
                          onPostPress={(post) => openPostListing(previewPosts, post)}
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {users.length === 0 && searchPosts.length > 0 && (
          <View style={[styles.section, { paddingHorizontal: width * 0.0465 }]}>
            <PostGrid
              posts={getTopPostsByLikes(searchPosts, 3)}
              onPostPress={(post) => openPostListing(searchPosts, post)}
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <ScreenShell>
      <View style={styles.searchHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <AntDesign name="arrow-left" size={24} color="black" />
        </TouchableOpacity>

        <BlurView intensity={24} tint="light" style={styles.searchBlur}>
          <View style={styles.searchInputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder={t('HomeScreen.searchPlaceholder')}
              placeholderTextColor="#8e8e8e"
              value={searchText}
              onChangeText={setSearchText}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              autoFocus
            />
            {searchText.length > 0 ? (
              <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
                <Entypo name="cross" size={20} color="black" />
              </TouchableOpacity>
            ) : (
              <Pressable
                onPress={() => {
                  // Modal route is paused for now; use the local React Native Modal below.
                  setDraftSelectedTags(selectedTags);
                  setFilterModalVisible(true);
                }}
                style={{ width: 20, height: 20 }}
              >
                <Image
                  source={require('../../../assets/filter.png')}
                  style={{ width: '100%', height: '100%' }}
                  tintColor='#262626'
                />
              </Pressable>
            )}
          </View>
        </BlurView>
      </View>

      <FlatList
        automaticallyAdjustKeyboardInsets
        style={styles.mainContent}
        data={[{ type: 'search-content' }]}
        renderItem={renderSearchContent}
        keyExtractor={(item) => item.type}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setFilterModalVisible(false)}>
          <Pressable style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select tags</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={styles.modalCloseButton}>
                <Entypo name="cross" size={22} color="#111" />
              </TouchableOpacity>
            </View>

            {tagsLoading ? (
              <View style={styles.tagsLoadingContainer}>
                <ActivityIndicator size="small" color="#00BCD4" />
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={styles.tagChipsContainer}
                showsVerticalScrollIndicator={false}
              >
                {availableTags.map((tag) => {
                  const isSelected = draftSelectedTags.includes(tag.id);
                  return (
                    <TouchableOpacity
                      key={tag.id}
                      style={[styles.tagChip, isSelected && styles.tagChipSelected]}
                      onPress={() => toggleTag(tag.id)}
                    >
                      <Text style={[styles.tagChipText, isSelected && styles.tagChipTextSelected]}>
                        {getLocalizedText(tag.label, tag.id)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryActionButton} onPress={clearFilters}>
                <Text style={styles.secondaryActionText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryActionButton} onPress={applyTagFilters}>
                <Text style={styles.primaryActionText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#b8b7b74a',
  },
  backgroundBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backText: {
    fontSize: 34,
    color: '#262626',
    lineHeight: 36,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
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
    paddingTop: 80,
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
  section: {
    paddingVertical: 16,
  },
  userListContent: {
    paddingBottom: 20,
  },
  userResultBlock: {
    marginBottom: 18,
  },
  userPreviewGrid: {
    marginTop: 4,
  },
  selectedFilterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  selectedFilterText: {
    flex: 1,
    color: '#262626',
    fontSize: 15,
    fontWeight: '600',
    marginRight: 12,
  },
  clearFiltersButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#eef8fa',
  },
  clearFiltersText: {
    color: '#008fa1',
    fontSize: 13,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  modalSheet: {
    maxHeight: '78%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#d6d6d6',
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#111',
    fontSize: 22,
    fontWeight: '800',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f2f2f2',
  },
  tagsLoadingContainer: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 8,
  },
  tagChip: {
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  tagChipSelected: {
    borderColor: '#00BCD4',
    backgroundColor: '#e9fbfd',
  },
  tagChipText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  tagChipTextSelected: {
    color: '#008fa1',
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
  },
  secondaryActionButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f2f2f2',
    marginRight: 10,
  },
  secondaryActionText: {
    color: '#333',
    fontSize: 15,
    fontWeight: '700',
  },
  primaryActionButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00BCD4',
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});

export default SearchScreen;
