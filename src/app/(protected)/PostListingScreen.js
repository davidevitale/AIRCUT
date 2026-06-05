import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View, FlatList, TouchableOpacity } from "react-native";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import AntDesign from "@expo/vector-icons/AntDesign";
import { SafeAreaView } from "react-native-safe-area-context";
import BarberPost from "../../components/BarberPost";
import { getPostListingContext } from "../../services/postListingStore";
import { getAllPostsWithLikeStatus } from "../../services/postService";
import { getCurrentUserData } from "../../services/userService";
import { setBarberProfileContext } from "../../services/barberProfileStore";

const PostListingScreen = () => {
  const { posts, selectedPostId, returnTo } = getPostListingContext();
  const [postsWithLikeStatus, setPostsWithLikeStatus] = useState(
    Array.isArray(posts) ? posts : [],
  );

  // Navigazione al profilo barbiere dal nickname del post (anche da "Mi piace").
  const handleViewProfile = (barberName, barberUid) => {
    if (!barberName && !barberUid) return;

    setBarberProfileContext({
      returnTo: {
        pathname: "/(protected)/PostListingScreen",
      },
    });

    router.push({
      pathname: "/(protected)/BarberProfileScreen",
      params: barberUid ? { uid: barberUid } : { barberName },
    });
  };

  const handleBack = () => {
    // Pop the navigation stack so the previous screen (e.g. the barber
    // profile) stays mounted and keeps its scroll position / state.
    // Using router.replace here would tear down and re-create that screen,
    // which is what caused the jump back to Home.
    if (router.canGoBack?.()) {
      router.back();
      return;
    }

    // Fallback only when there is nothing to pop (e.g. deep-link entry).
    if (returnTo?.pathname) {
      router.replace({
        pathname: returnTo.pathname,
        params: returnTo.params || {},
      });
      return;
    }

    router.back();
  };

  useEffect(() => {
    let isMounted = true;

    const hydrateLikeStatus = async () => {
      try {
        const currentUser = await getCurrentUserData();
        const currentUserId = currentUser?.user?.uid || null;

        if (!currentUserId || !Array.isArray(posts) || posts.length === 0) {
          if (isMounted) {
            setPostsWithLikeStatus(Array.isArray(posts) ? posts : []);
          }
          return;
        }

        const allWithStatus = await getAllPostsWithLikeStatus(currentUserId);
        const byPostId = new Map(
          allWithStatus.map((post) => [post.postId || post.id, post]),
        );

        const merged = posts.map((post) => {
          const key = post.postId || post.id;
          const latest = byPostId.get(key);
          if (!latest) return post;

          return {
            ...post,
            isLiked: latest.isLiked,
            likesCount: latest.likesCount ?? post.likesCount ?? post.likes ?? 0,
            likes: latest.likesCount ?? post.likes ?? 0,
            likedBy: latest.likedBy ?? post.likedBy,
          };
        });

        if (isMounted) {
          setPostsWithLikeStatus(merged);
        }
      } catch (error) {
        console.error("PostListingScreen: Error hydrating like status:", error);
        if (isMounted) {
          setPostsWithLikeStatus(Array.isArray(posts) ? posts : []);
        }
      }
    };

    hydrateLikeStatus();

    return () => {
      isMounted = false;
    };
  }, [posts]);

  const orderedPosts = useMemo(() => {
    if (!Array.isArray(postsWithLikeStatus) || postsWithLikeStatus.length === 0) return [];
    if (!selectedPostId) return postsWithLikeStatus;

    const selectedIndex = postsWithLikeStatus.findIndex(
      (post) => (post.id === selectedPostId || post.postId === selectedPostId),
    );
    if (selectedIndex < 0) return postsWithLikeStatus;

    return [
      ...postsWithLikeStatus.slice(selectedIndex),
      ...postsWithLikeStatus.slice(0, selectedIndex),
    ];
  }, [postsWithLikeStatus, selectedPostId]);

  return (
    <SafeAreaView style={styles.screen}>
      <BlurView intensity={28} tint="light" style={styles.backgroundBlur} pointerEvents="none" />
      <View style={styles.searchHeader}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <AntDesign name="arrow-left" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <FlatList
        style={styles.mainContent}
        data={orderedPosts}
        keyExtractor={(item, index) => item?.id || String(index)}
        renderItem={({ item }) => (
          <BlurView intensity={26} tint="light" style={styles.glassCard}>
            <BarberPost barber={item} zoomable onViewProfile={handleViewProfile} />
          </BlurView>
        )}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#b8b7b74a",
  },
  backgroundBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  mainContent: {
    flex: 1,
    backgroundColor: "transparent",
  },
  listContent: {
    paddingBottom: 24,
  },
  glassCard: {
    marginHorizontal: 12,
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
});

export default PostListingScreen;
