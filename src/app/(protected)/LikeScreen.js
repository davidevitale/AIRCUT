import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Alert,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router, useFocusEffect } from 'expo-router';
import { getCurrentUserData } from '../../services/authService';
import { collection, query, where, getDocs, doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { setPostListingContext } from '../../services/postListingStore';
import Entypo from '@expo/vector-icons/Entypo';
import { Image } from 'expo-image';

const logoLike = require('../../../assets/icons8-cuore-48.png');
const { width } = Dimensions.get('window');
const itemSize = width * 0.2883;

const LikeScreen = () => {
  const { t } = useTranslation();
  const [likedPosts, setLikedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [appState, setAppState] = useState(AppState.currentState);

  useFocusEffect(
    useCallback(() => {
      loadLikedPosts();
    }, []),
  );

  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
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

        const postsQuery = query(
          collection(db, 'posts'),
          where('likes', 'array-contains', userData.user.uid),
        );

        const querySnapshot = await getDocs(postsQuery);
        const likedPostsData = [];

        querySnapshot.forEach((postDoc) => {
          const postData = postDoc.data();
          likedPostsData.push({
            id: postDoc.id,
            postId: postDoc.id,
            imageUrl: postData.imageUrl,
            thumbnailUrl: postData.thumbnailUrl,
            postImage: postData.imageUrl,
            barberName: postData.barberName || t('LikeScreen.defaultBarberName'),
            salonName: postData.barberName || t('LikeScreen.defaultBarberName'),
            barberId: postData.barberId,
            likesCount: Array.isArray(postData.likes) ? postData.likes.length : 0,
            likes: Array.isArray(postData.likes) ? postData.likes.length : 0,
            likedAt: new Date().toISOString(),
            ...postData,
          });
        });

        setLikedPosts(likedPostsData);
      } else {
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
                const postRef = doc(db, 'posts', postId);
                await updateDoc(postRef, {
                  likes: arrayRemove(currentUser.user.uid),
                });

                setLikedPosts((prev) => prev.filter((post) => post.postId !== postId));
              }
            } catch (error) {
              console.error('LikeScreen: Errore rimozione like:', error);
              Alert.alert(t('LikeScreen.errorTitle'), t('LikeScreen.removeError'));
            }
          },
        },
      ],
    );
  };

  const openLikedListing = (selectedPost) => {
    if (!Array.isArray(likedPosts) || likedPosts.length === 0) return;

    setPostListingContext({
      posts: likedPosts,
      selectedPostId: selectedPost?.id || selectedPost?.postId || null,
    });

    router.push('/(protected)/PostListingScreen');
  };

  const renderLikedPost = ({ item, index }) => (
    <TouchableOpacity style={[styles.postContainer, {
      marginRight: (index + 1) % 3 === 0 ? 0 : width * 0.0186,
      marginBottom: 8,
    }]} onPress={() => openLikedListing(item)}>
      <Image
        source={{ uri: item.thumbnailUrl || item.imageUrl || item.mediaUrl || item.postImage }}
        style={styles.postImage}
        resizeMode="cover"
      />
      <TouchableOpacity style={styles.unlikeButton} onPress={() => handleRemoveLike(item.postId)}>
        {/* <Text style={styles.unlikeText}></Text> */}
        <Entypo name="cross" size={16} color="white" />
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
          <Text style={styles.emptyDescription}>{t('LikeScreen.emptyDescription')}</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('LikeScreen.yourFavoritesTitle')}</Text>
        <Text style={styles.headerCount}>{t('LikeScreen.photosCount', { count: likedPosts.length })}</Text>
      </View>

      <FlatList
        data={likedPosts}
        renderItem={renderLikedPost}
        keyExtractor={(item) => item.postId}
        numColumns={3}
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
    paddingHorizontal: width * 0.0465,
    paddingTop: 12,
    paddingBottom: 24,
  },
  postContainer: {
    width: itemSize,
    height: itemSize,

    backgroundColor: '#f2f2f2',
    overflow: 'hidden',
    borderRadius: 20
  },
  postImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  unlikeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255, 82, 82, 0.78)',
    borderRadius: 11,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unlikeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
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
