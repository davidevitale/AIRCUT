import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, ScrollView, TouchableOpacity,
  Image, FlatList, ActivityIndicator, Alert, Keyboard
} from 'react-native';
import { smartSearch } from '../services/searchService';
import PostGrid from '../../components/PostGrid';
import UserListItem from '../../components/UserListItem';

const SearchScreen = ({ onViewProfile, initialHashtag }) => {
  const [searchText, setSearchText] = useState(initialHashtag || '');
  const [searchResults, setSearchResults] = useState({ type: 'empty', results: [] });
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([
    '#sfumato', '#barba', '#taglio', 'Barber Napoli', 'Salone Milano'
  ]);

  const searchTimeoutRef = useRef(null);

  // Se viene passato un hashtag iniziale, effettua la ricerca
  useEffect(() => {
    if (initialHashtag && initialHashtag.trim().length > 0) {
      setSearchText(initialHashtag);
      // Non avviare immediatamente la ricerca, lascia che il debounce la gestisca
    }
  }, [initialHashtag]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchText.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch();
      }, 300); // Attesa di 300ms per ottimizzare le query
    } else {
      setSearchResults({ type: 'empty', results: [] });
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchText]);

  const performSearch = async () => {
    try {
      setLoading(true);
      console.log('SearchScreen: Performing search for:', searchText);

      const results = await smartSearch(searchText.trim());
      setSearchResults(results);

      // Aggiungi alle ricerche recenti se non è vuoto
      if (results.results.length > 0) {
        addToRecentSearches(searchText.trim());
      }

      console.log('SearchScreen: Search completed:', results.type, results.results.length);
    } catch (error) {
      console.error('SearchScreen: Error performing search:', error);
      Alert.alert('Errore', 'Errore durante la ricerca');
      setSearchResults({ type: 'error', results: [] });
    } finally {
      setLoading(false);
    }
  };

  const addToRecentSearches = (search) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(item => item !== search);
      return [search, ...filtered].slice(0, 8); // Mantieni solo le ultime 8
    });
  };

  const handleRecentSearchPress = (search) => {
    setSearchText(search);
    Keyboard.dismiss();
  };

  const handlePostPress = (post) => {
    console.log('SearchScreen: Post pressed:', post.id);
    // Naviga al post singolo o al profilo del barbiere
    if (onViewProfile && post.barberId) {
      onViewProfile(post.salonName || post.barberName);
    }
  };

  const handleUserPress = (user) => {
    console.log('SearchScreen: User pressed:', user.salonName);
    if (onViewProfile) {
      onViewProfile(user.salonName);
    }
  };

  const handleFollowPress = (user, isFollowing) => {
    console.log('SearchScreen: Follow pressed:', user.salonName, isFollowing);
    // Implementa la logica di follow qui
    Alert.alert(
      'Follow',
      `${isFollowing ? 'Hai iniziato a seguire' : 'Hai smesso di seguire'} ${user.salonName}`
    );
  };

  const clearSearch = () => {
    setSearchText('');
    setSearchResults({ type: 'empty', results: [] });
    Keyboard.dismiss();
  };

  const renderHashtagButton = (hashtag) => (
    <TouchableOpacity
      key={hashtag}
      style={styles.hashtagButton}
      onPress={() => handleRecentSearchPress(hashtag)}
    >
      <Text style={styles.hashtagText}>{hashtag}</Text>
    </TouchableOpacity>
  );

  const renderSearchHeader = () => (
    <View style={styles.searchHeader}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca hashtag (#sfumato) o saloni..."
            placeholderTextColor="#8e8e8e"
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={performSearch}
          />
          {searchText.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <ScrollView style={styles.emptyContainer} showsVerticalScrollIndicator={false}>
      {renderSearchHeader()}

      <View style={styles.emptyContent}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyTitle}>Inizia a cercare</Text>
        <Text style={styles.emptyDescription}>
          Cerca hashtag come #sfumato o nomi di saloni come "Barber Napoli"
        </Text>

        {/* Ricerche recenti */}
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
                  <Text style={styles.recentSearchIcon}>
                    {search.startsWith('#') ? '🏷️' : '👤'}
                  </Text>
                  <Text style={styles.recentSearchText}>{search}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Hashtag popolari */}
        <View style={styles.popularHashtagsSection}>
          <Text style={styles.sectionTitle}>Hashtag popolari</Text>
          <View style={styles.hashtagsContainer}>
            {['#sfumato', '#barba', '#taglio', '#uomo', '#donna', '#colore'].map(renderHashtagButton)}
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderResults = () => {
    if (loading) {
      return (
        <View style={styles.container}>
          {renderSearchHeader()}
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00BCD4" />
            <Text style={styles.loadingText}>Ricerca in corso...</Text>
          </View>
        </View>
      );
    }

    if (searchResults.type === 'hashtag') {
      return (
        <View style={styles.container}>
          {renderSearchHeader()}

          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>
              Risultati per {searchResults.hashtag}
            </Text>
            <Text style={styles.resultsCount}>
              {searchResults.results.length} post
            </Text>
          </View>

          <PostGrid
            posts={searchResults.results}
            onPostPress={handlePostPress}
          />
        </View>
      );
    }

    if (searchResults.type === 'barbers') {
      return (
        <View style={styles.container}>
          {renderSearchHeader()}

          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>
              Risultati per "{searchResults.searchText}"
            </Text>
            <Text style={styles.resultsCount}>
              {searchResults.results.length} saloni
            </Text>
          </View>

          <FlatList
            data={searchResults.results}
            renderItem={({ item }) => (
              <UserListItem
                user={item}
                onUserPress={handleUserPress}
                onFollowPress={handleFollowPress}
              />
            )}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.userListContent}
          />
        </View>
      );
    }

    return renderEmptyState();
  };

  return <View style={styles.mainContainer}>{renderResults()}</View>;
};

const styles = StyleSheet.create({
};

const renderSearchResult = ({ item }) => (
  <TouchableOpacity
    style={styles.searchResultItem}
    onPress={() => handleSelectBarber(item)}
  >
    <Image
      source={{ uri: item.portfolioImages?.[0] || 'https://via.placeholder.com/50' }}
      style={styles.resultAvatar}
    />
    <View style={styles.resultInfo}>
      <Text style={styles.resultName}>{item.salonName}</Text>
      <Text style={styles.resultLocation}>📍 {item.via}</Text>
      {item.nomiDipendenti && (
        <Text style={styles.resultBarbers}>👨‍💼 {item.nomiDipendenti}</Text>
      )}
      <View style={styles.specialtiesContainer}>
        {item.tipiTaglio?.slice(0, 2).map((taglio, index) => (
          <View style={styles.specialtyTag} key={index}>
            <Text style={styles.specialtyText}>{taglio}</Text>
          </View>
        ))}
      </View>
    </View>
    <Text style={styles.arrowIcon}>→</Text>
  </TouchableOpacity>
);

const renderRecentSearch = ({ item }) => (
  <TouchableOpacity
    style={styles.recentItem}
    onPress={() => handleSelectBarber(item)}
  >
    <Text style={styles.clockIcon}>🕐</Text>
    <View style={styles.recentInfo}>
      <Text style={styles.recentName}>{item.salonName}</Text>
      <Text style={styles.recentLocation}>{item.via}</Text>
    </View>
  </TouchableOpacity>
);

return (
  <View style={styles.container}>
    {/* Barra di ricerca */}
    <View style={styles.searchContainer}>
      <Text style={styles.searchIcon}>🔍</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Cerca saloni..."
        value={searchText}
        onChangeText={setSearchText}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {searchText.length > 0 && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => setSearchText('')}
        >
          <Text style={styles.clearIcon}>✕</Text>
        </TouchableOpacity>
      )}
    </View>

    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Loading */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#00BCD4" />
          <Text style={styles.loadingText}>Ricerca in corso...</Text>
        </View>
      )}

      {/* Risultati di ricerca */}
      {searchText.length >= 2 && !loading && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Risultati ({searchResults.length})
          </Text>
          {searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.noResultsText}>Nessun salone trovato</Text>
          )}
        </View>
      )}

      {/* Ricerche recenti */}
      {searchText.length === 0 && recentSearches.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ricerche recenti</Text>
          <FlatList
            data={recentSearches}
            renderItem={renderRecentSearch}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Suggerimenti iniziali */}
      {searchText.length === 0 && recentSearches.length === 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Suggerimenti</Text>
          <Text style={styles.hintText}>
            • Cerca per nome del salone{'\n'}
            • Usa almeno 2 caratteri{'\n'}
            • I risultati appaiono in tempo reale
          </Text>
        </View>
      )}
    </ScrollView>
  </View>
);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 25,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#666',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  resultLocation: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  resultBarbers: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  specialtyTag: {
    backgroundColor: '#00BCD4',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
  },
  specialtyText: {
    color: '#fff',
    fontSize: 10,
  },
  arrowIcon: {
    fontSize: 16,
    color: '#ccc',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  clockIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  recentInfo: {
    flex: 1,
  },
  recentName: {
    fontSize: 16,
    color: '#000',
  },
  recentLocation: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  noResultsText: {
    textAlign: 'center',
    color: '#666',
    paddingVertical: 20,
    fontSize: 16,
  },
  hintText: {
    color: '#666',
    lineHeight: 20,
    fontSize: 14,
  },
});

export default SearchScreen;

