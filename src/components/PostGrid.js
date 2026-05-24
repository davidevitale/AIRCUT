import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  Text,
  Dimensions,
} from 'react-native';
import { Image } from "expo-image";

const { width } = Dimensions.get('window');
// const itemSize = (width - 6) / 3; // 3 colonne con spazi di 2px
const itemSize = width * 0.2883; // 3 colonne con spazi di 2px

const PostGrid = ({ posts, onPostPress }) => {
  const { t } = useTranslation();

  if (!posts || posts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>{t('PostGrid.emptyTitle')}</Text>
        <Text style={styles.emptyDescription}>
          {t('PostGrid.emptyDescription')}
        </Text>
      </View>
    );
  }

  // Funzione per renderizzare post e ads ogni 5 post
  const renderItemsWithAds = () => {
    const items = [];
    posts.forEach((item, index) => {
      items.push(
        <TouchableOpacity
          key={item.id}
          style={[
            styles.postItem,
            // { marginRight: (index + 1) % 3 === 0 ? 0 : 2, borderWidth: 1 },
          ]}
          onPress={() => onPostPress && onPostPress(item)}
        >
          <Image
            source={{ uri: item.thumbnailUrl || item.postImage || item.imageUrl || item.image || item.mainImage }}
            style={styles.postImage}
            resizeMode="cover"
          />
          {/* Overlay con informazioni */}
          <View style={styles.overlay}>
            <View style={styles.overlayContent}>
              <View style={styles.likeInfo}>
                <Text style={styles.heartIcon}>❤️</Text>
                <Text style={styles.likeCount}>{item.likesCount || item.likes || 0}</Text>
              </View>
            </View>
          </View>
          {/* Badge per video se presente */}
          {item.isVideo ? (
            <View style={styles.videoBadge}>
              <Text style={styles.videoBadgeIcon}>▶️</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      );

      // ...nessuna pubblicità...
    });
    return items;
  };

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: width * 0.0186 }}>
        {renderItemsWithAds()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  postItem: {
    width: itemSize,
    height: itemSize,
    backgroundColor: '#f2f2f2',
    borderRadius: 20

  },
  postImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0, // lasciato com’era nel tuo snippet
    height: 28,
  },
  overlayContent: {
    alignItems: 'center',
  },
  likeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heartIcon: {
    fontSize: 20,
    marginRight: 4,
  },
  likeCount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  videoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 4,
  },
  videoBadgeIcon: {
    fontSize: 12,
    color: '#fff',
  },
  rowSeparator: {
    height: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
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
  },
});

export default PostGrid;
