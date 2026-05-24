import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  StyleSheet,
} from 'react-native';
import { smartSearch } from '../services/searchService';
import PostGrid from '../components/PostGrid';
import UserListItem from '../components/UserListItem';

const SearchScreen = ({ onHashtagPress, onUserPress, onViewProfile }) => {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

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

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.emptyContent}>
          {/*<Text style={styles.emptyIcon}>🔍</Text>*/}
          <Text style={styles.emptyTitle}>Scopri il mondo del beauty</Text>
          {/*<Text style={styles.emptyDescription}>
            Cerca hashtag per trovare ispirazione o trova barbieri e saloni nella tua zona
          </Text>*/}
        </View>

        {recentSearches.length > 0 && (
          <View style={styles.recentSearchesSection}>
            <Text style={styles.sectionTitle}>Ricerche recenti</Text>
            <View style={styles.recentSearchesContainer}>
              {recentSearches.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.recentSearchItem}
                  onPress={() => handleRecentSearchPress(search)}
                >
                  <Text style={styles.recentSearchIcon}>🕐</Text>
                  <Text style={styles.recentSearchText}>{search}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.popularHashtagsSection}>
          <Text style={styles.sectionTitle}>Hashtag popolari</Text>
          <View style={styles.hashtagsContainer}>
            {['#taglio', '#barba', '#styling', '#colore', '#ricci', '#fade'].map((hashtag) => (
              <TouchableOpacity
                key={hashtag}
                style={styles.hashtagButton}
                onPress={() => handleHashtagPress(hashtag)}
              >
                <Text style={styles.hashtagText}>{hashtag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#00BCD4" />
      <Text style={styles.loadingText}>Ricerca in corso...</Text>
    </View>
  );

  const renderResults = () => {
    if (!searchResults) {
      return renderEmptyState();
    }

    const { posts = [], users = [] } = searchResults;
    const isHashtagSearch = searchText.startsWith('#');
    const totalResults = posts.length + users.length;

    if (totalResults === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyContent}>
            <Text style={styles.emptyIcon}></Text>
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
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Badge conteggio risultati */}
        <View style={styles.resultsBadgeContainer}>
          <View style={styles.resultsBadge}>
            <Text style={styles.resultsBadgeText}>
              {totalResults} risultat{totalResults === 1 ? 'o' : 'i'}
            </Text>
          </View>
        </View>

        {/* Post (per hashtag) */}
        {posts.length > 0 && (
          <View style={styles.section}>
            <PostGrid
              posts={posts}
              onPostPress={(post) => {
                // Gestisci navigazione al post
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
                    console.log('SearchScreen: User clicked:', item.salonName);
                    // Naviga al profilo del parrucchiere
                    if (onViewProfile && item.salonName) {
                      onViewProfile(item.salonName);
                    }
                  }}
                  onPress={() => onUserPress && onUserPress(item)}
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

  return (
    <View style={styles.mainContainer}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Cerca hashtag o saloni..."
              placeholderTextColor="#8e8e8e"
              value={searchText}
              onChangeText={setSearchText}
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
        </View>
      </View>

      {/* Content */}
      {loading ? renderLoadingState() : renderResults()}
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  container: {
    flex: 1,
  },

  // Search Header
  searchHeader: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 25,
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

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8e8e8e',
  },

  // Empty State
  emptyContainer: {
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
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#262626',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#8e8e8e',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },

  // Results Badge
  resultsBadgeContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'flex-start',
  },
  resultsBadge: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  resultsBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },

  // Sections
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 12,
    marginTop: 8,
  },

  // Recent Searches
  recentSearchesSection: {
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  recentSearchesContainer: {
    gap: 8,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  recentSearchIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  recentSearchText: {
    fontSize: 16,
    color: '#262626',
    flex: 1,
  },

  // Popular Hashtags
  popularHashtagsSection: {
    width: '100%',
    paddingHorizontal: 16,
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hashtagButton: {
    backgroundColor: '#00BCD4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  hashtagText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },

  // User List
  userListContent: {
    paddingBottom: 20,
  },
});

export default SearchScreen;

