import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  FlatList
} from 'react-native';
import { BlurView } from 'expo-blur';
import BarberPost from '../components/BarberPost';
import PostGrid from '../components/PostGrid';
import UserListItem from '../components/UserListItem';
import { getAllPostsWithLikeStatus, getCurrentUserData, smartSearch } from '../services/authService';

/* CODICE COMMENTATO - DA RIUTILIZZARE NEL SEARCH COMPONENT
  // Debounced search
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchText.trim()) {
        performSearch(searchText.trim());
      } else {
        setSearchResults(null);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchText]);

  const performSearch = async (query) => {
    setLoading(true);
    try {
      console.log('SearchScreen: Starting search for:', query);
      const results = await smartSearch(query);
      console.log('SearchScreen: Search results:', results);
      setSearchResults(results);
    } catch (error) {
      console.error('SearchScreen: Errore durante la ricerca:', error);
      setSearchResults({ posts: [], users: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSearchText('');
    setSearchResults(null);
  };

  const handleRecentSearchPress = (search) => {
    setSearchText(search);
  };

  const handleHashtagPress = (hashtag) => {
    setSearchText(hashtag);
    if (onHashtagPress) {
      onHashtagPress(hashtag);
    }
  };
*/

const HomeScreen = ({ onViewProfile, onHashtagPress }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [hasConnectionError, setHasConnectionError] = useState(false);
  // State per la ricerca
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setHasConnectionError(false); // Reset error state
      console.log('HomeScreen: Starting to load data...');

      // Carica l'utente corrente
      const userData = await getCurrentUserData();
      setCurrentUser(userData);

      // Usa la nuova funzione che gestisce automaticamente lo stato like
      const postsWithLikeStatus = await getAllPostsWithLikeStatus(userData?.user?.uid);
      console.log('HomeScreen: Loaded posts with like status:', postsWithLikeStatus.length);

      // Debug: mostra i primi post
      if (postsWithLikeStatus.length > 0) {
        console.log('HomeScreen: First post:', {
          id: postsWithLikeStatus[0].id,
          postId: postsWithLikeStatus[0].postId,
          isLiked: postsWithLikeStatus[0].isLiked,
          likesCount: postsWithLikeStatus[0].likesCount
        });
      }

      setPosts(postsWithLikeStatus);
      console.log('HomeScreen: Posts loaded successfully');
    } catch (error) {
      console.error('HomeScreen: Error loading data:', error);

      // Controlla se è un errore di connessione Firebase
      if (error.message?.includes('client is offline') ||
        error.message?.includes('Failed to get document') ||
        error.code === 'unavailable') {

        console.log('HomeScreen: Firebase offline, showing connection error state');
        setHasConnectionError(true);
        setPosts([]);
      } else {
        setPosts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleClear = () => {
    setSearchText('');
    setSearchResults(null);
    setIsSearchActive(false);
  };

  // Funzione per gestire quando la ricerca diventa attiva
  const handleSearchFocus = () => {
    setIsSearchActive(true);
  };

  // Funzione di ricerca che esclude l'utente corrente dai risultati
  const performSearch = async (query) => {
    setSearchLoading(true);
    try {
      console.log('HomeScreen: Starting search for:', query);
      // Passa l'ID dell'utente corrente per escluderlo dai risultati
      const currentUserId = currentUser?.user?.uid || null;
      const results = await smartSearch(query, currentUserId);
      console.log('HomeScreen: Search results:', results);
      setSearchResults(results);
    } catch (error) {
      console.error('HomeScreen: Errore durante la ricerca:', error);
      setSearchResults({ posts: [], users: [] });
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchText.trim()) {
        performSearch(searchText.trim());
      } else {
        setSearchResults(null);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchText, currentUser]);

  // Renderizza i risultati della ricerca
  const renderSearchResults = () => {
    if (searchLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00BCD4" />
          <Text style={styles.loadingText}>Ricerca in corso...</Text>
        </View>
      );
    }

    if (!searchResults) {
      return (
        <View style={styles.searchEmptyContainer}>
          <View style={styles.emptyContent}>
            <Text style={styles.emptyTitle}>Scopri il mondo del beauty</Text>
            <Text style={styles.emptyDescription}>
              Cerca hashtag per trovare ispirazione o trova barbieri e saloni nella tua zona
            </Text>
          </View>
        </View>
      );
    }

    const { posts = [], users = [] } = searchResults;
    const isHashtagSearch = searchText.startsWith('#');
    const totalResults = posts.length + users.length;

    if (totalResults === 0) {
      return (
        <View style={styles.searchEmptyContainer}>
          <View style={styles.emptyContent}>
            <Text style={styles.emptyTitle}>Nessun risultato</Text>
            <Text style={styles.emptyDescription}>
              {isHashtagSearch
                ? `Nessun post trovato per ${searchText}`
                : 'Prova con parole chiave diverse'}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <ScrollView style={styles.searchResultsContainer} showsVerticalScrollIndicator={false}>
        {/* Post (per hashtag) */}
        {posts.length > 0 && (
          <View style={styles.section}>
            <PostGrid
              posts={posts}
              onPostPress={(post) => {
                console.log('Post selezionato:', post);
              }}
            />
          </View>
        )}

        {/* Utenti (per ricerca saloni) */}
        {users.length > 0 && (
          <View style={styles.section}>
            <FlatList
              data={users}
              renderItem={({ item }) => (
                <UserListItem
                  user={item}
                  onUserPress={() => {
                    console.log('HomeScreen: User clicked:', item.salonName);
                    if (onViewProfile && item.salonName) {
                      onViewProfile(item.salonName);
                    }
                  }}
                  onPress={() => { }}
                  onViewProfile={() => onViewProfile && onViewProfile(item.salonName)}
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

  if (loading) {
    return (
      <View style={styles.screen}>
        <BlurView intensity={28} tint="light" style={styles.backgroundBlur} pointerEvents="none" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00BCD4" />
          <Text style={styles.loadingText}>Caricamento feed...</Text>
        </View>
      </View>
    );
  }

  // Se la ricerca è attiva e c'è testo di ricerca, mostra i risultati
  if (isSearchActive && searchText.trim()) {
    return (
      <View style={styles.screen}>
        <BlurView intensity={28} tint="light" style={styles.backgroundBlur} pointerEvents="none" />
        <View style={styles.mainContent}>
          {/* Search Bar */}
          <View style={styles.searchHeader}>
            <BlurView intensity={24} tint="light" style={styles.searchBlur}>
              <View style={styles.searchInputContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cerca hashtag o saloni..."
                  placeholderTextColor="#8e8e8e"
                  value={searchText}
                  onChangeText={setSearchText}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  autoFocus={true}
                />
                {searchText.length > 0 && (
                  <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                    <Text style={styles.clearIcon}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </BlurView>
          </View>

          {/* Risultati della ricerca */}
          {renderSearchResults()}
        </View>
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={styles.screen}>
        <BlurView intensity={28} tint="light" style={styles.backgroundBlur} pointerEvents="none" />
        <ScrollView
          style={styles.mainContent}
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {hasConnectionError ? '🌐 Connessione lenta' : 'Nessun post disponibile'}
            </Text>
            <Text style={styles.emptyDescription}>
              {hasConnectionError
                ? 'Verifica la tua connessione internet e tira per aggiornare'
                : 'I parrucchieri non hanno ancora caricato foto. Torna più tardi per vedere i loro lavori!'
              }
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <BlurView intensity={28} tint="light" style={styles.backgroundBlur} pointerEvents="none" />
      <ScrollView
        style={styles.mainContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchHeader}>
          <BlurView intensity={24} tint="light" style={styles.searchBlur}>
            <View style={styles.searchInputContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Cerca hashtag o saloni..."
                placeholderTextColor="#8e8e8e"
                value={searchText}
                onChangeText={setSearchText}
                onFocus={handleSearchFocus}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {searchText.length > 0 && (
                <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                  <Text style={styles.clearIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </BlurView>
        </View>

        <View style={styles.feedContainer}>
          {posts.map((barber) => (
            <BlurView
              key={barber.id}
              intensity={26}
              tint="light"
              style={styles.glassCard}
            >
              <BarberPost
                barber={barber}
                onViewProfile={onViewProfile}
                onHashtagPress={onHashtagPress}
              />
            </BlurView>
          ))}
        </View>
      </ScrollView>
    </View>
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
  // Search Bar Styles
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
  // Search Results Styles
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

