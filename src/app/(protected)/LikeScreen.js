import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Alert,
  AppState
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next';
import { getCurrentUserData } from '../../services/authService';
import { collection, query, where, getDocs, doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '../../../config/firebase'

const logoLike = require('../../../assets/icons8-cuore-48.png');
const { width } = Dimensions.get('window');
const itemSize = width - 48; // 1 colonna fullwidth

const LikeScreen = () => {
  const { t } = useTranslation();
  const [likedPosts, setLikedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    loadLikedPosts();
  }, []);

  // Ricarica i dati quando l'app torna in foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('LikeScreen: App tornata in foreground, ricaricando like...');
        loadLikedPosts();
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appState]);

  const loadLikedPosts = async () => {
    try {
      setLoading(true);
      const userData = await getCurrentUserData();
      if (userData) {
        setCurrentUser(userData);
        console.log('LikeScreen: Loading liked posts for user:', userData.user.uid);

        // Carica tutti i post che contengono l'userId nell'array likes
        const postsQuery = query(
          collection(db, 'posts'),
          where('likes', 'array-contains', userData.user.uid)
        );

        const querySnapshot = await getDocs(postsQuery);
        const likedPostsData = [];

        querySnapshot.forEach((doc) => {
          const postData = doc.data();
          likedPostsData.push({
            postId: doc.id,
            imageUrl: postData.imageUrl,
            barberName: postData.barberName || t('LikeScreen.defaultBarberName'),
            barberId: postData.barberId,
            likedAt: new Date().toISOString(), // Per ora usiamo data corrente
            ...postData
          });
        });

        console.log('LikeScreen: Loaded liked posts:', likedPostsData.length);
        setLikedPosts(likedPostsData);
      } else {
        console.log('LikeScreen: No user logged in');
        setLikedPosts([]);
      }
    } catch (error) {
      console.error('LikeScreen: Errore nel caricamento dei like:', error);
      setLikedPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLike = async (postId) => {
    Alert.alert(
      t('LikeScreen.removeFavoriteTitle'),
      t('LikeScreen.removeFavoriteMessage'),
      [
        { text: t('LikeScreen.cancel'), style: 'cancel' },
        {
          text: t('LikeScreen.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              if (currentUser) {
                console.log('LikeScreen: Removing like for post:', postId);

                // Rimuovi l'userId dall'array likes del post
                const postRef = doc(db, 'posts', postId);
                await updateDoc(postRef, {
                  likes: arrayRemove(currentUser.user.uid)
                });

                // Aggiorna la lista locale
                setLikedPosts(prev => prev.filter(post => post.postId !== postId));
                console.log('LikeScreen: Like rimosso con successo');
              }
            } catch (error) {
              console.error('LikeScreen: Errore rimozione like:', error);
              Alert.alert(t('LikeScreen.errorTitle'), t('LikeScreen.removeError'));
            }
          }
        }
      ]
    );
  };

  const renderLikedPost = ({ item }) => (
    <TouchableOpacity
      style={styles.postContainer}
      onLongPress={() => handleRemoveLike(item.postId)}
    >
      <Image
        source={{ uri: item.imageUrl || item.mediaUrl }}
        style={styles.postImage}
        resizeMode="cover"
      />
      <View style={styles.postInfo}>
        <Text style={styles.barberName} numberOfLines={1}>
          {item.barberName || t('LikeScreen.defaultBarberName')}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.unlikeButton}
        onPress={() => handleRemoveLike(item.postId)}
      >
        <Text style={styles.unlikeText}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('LikeScreen.loadingFavorites')}</Text>
      </View>
    );
  }

  if (likedPosts.length === 0) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.emptyState}>
          <Image source={logoLike} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>{t('LikeScreen.yourLikesTitle')}</Text>
          <Text style={styles.emptyDescription}>
            {t('LikeScreen.emptyDescription')}
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('LikeScreen.yourFavoritesTitle')}</Text>
        <Text style={styles.headerCount}>
          {t('LikeScreen.photosCount', { count: likedPosts.length })}
        </Text>
      </View>

      <FlatList
        data={likedPosts}
        renderItem={renderLikedPost}
        keyExtractor={(item) => item.postId}
        numColumns={1}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
    shadowColor: '#00BCD4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  headerCount: {
    fontSize: 14,
    color: '#666',
  },
  gridContainer: {
    padding: 16,
  },
  postContainer: {
    width: itemSize,
    marginRight: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: 350,
    backgroundColor: '#f0f0f0',
  },
  postInfo: {
    padding: 8,
    paddingBottom: 4,
  },
  barberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00BCD4',
    marginBottom: 2,
  },
  unlikeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 82, 82, 0.3)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#FF5252',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  unlikeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF5252',
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyIcon: {
    width: 40,
    height: 40,
    marginBottom: 20,
    resizeMode: 'contain',
    tintColor: '#00BCD4',
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
});

export default LikeScreen;
