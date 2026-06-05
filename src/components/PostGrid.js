import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Dimensions,
} from 'react-native';
import { Image } from "expo-image";
import useLikesStore, { resolvePostId } from "../services/likesStore";

const { width } = Dimensions.get('window');
// const itemSize = (width - 6) / 3; // 3 colonne con spazi di 2px
const itemSize = width * 0.2883; // 3 colonne con spazi di 2px

// Singolo item della griglia: legge like e conteggio dallo store condiviso
// così il cuore/conteggio restano sincronizzati col feed in tempo reale (M4 §4.2).
const GridItem = ({ item, onPostPress }) => {
  const postId = resolvePostId(item);
  const isLiked = useLikesStore((s) => !!s.liked[postId]);
  const storeCount = useLikesStore((s) => s.counts[postId]);
  const likeCount =
    typeof storeCount === "number"
      ? storeCount
      : item.likesCount || item.likes || 0;

  return (
    <TouchableOpacity
      style={styles.postItem}
      onPress={() => onPostPress && onPostPress(item)}
    >
      <Image
        source={{ uri: item.zoomReadyUrl || item.thumbnailUrl || item.imageUrl }}
        style={styles.postImage}
        resizeMode="cover"
        cachePolicy="memory-disk"
      />
      <View style={styles.likeBadge}>
        <Text style={styles.heartIcon}>{isLiked ? "❤️" : "🤍"}</Text>
        <Text style={styles.likeCount}>{likeCount}</Text>
      </View>
      {item.isVideo ? (
        <View style={styles.videoBadge}>
          <Text style={styles.videoBadgeIcon}>▶️</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

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

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: width * 0.0186 }}>
        {posts.map((item) => (
          <GridItem key={item.id} item={item} onPostPress={onPostPress} />
        ))}
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
  likeBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  heartIcon: {
    fontSize: 13,
    marginRight: 4,
  },
  likeCount: {
    color: '#fff',
    fontSize: 13,
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
