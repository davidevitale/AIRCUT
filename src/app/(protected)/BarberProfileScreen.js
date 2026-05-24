import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import PostGrid from "../../components/PostGrid";
import { getBarberProfileData, getBarberPrices, getCurrentUserData, getAllBarberPosts } from "../../services/authService";
import { setPostListingContext } from "../../services/postListingStore";
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from "expo-image";

export default function BarberProfileScreen() {
  const { t } = useTranslation();
  const { barberName } = useLocalSearchParams();
  const resolvedBarberName = typeof barberName === "string" ? barberName : "";

  const [barberData, setBarberData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portfolioPosts, setPortfolioPosts] = useState([]);
  const [portfolioImages, setPortfolioImages] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        await getCurrentUserData();
        const profile = await getBarberProfileData(resolvedBarberName);
        if (!profile) {
          router.back();
          return;
        }

        setBarberData(profile);
        await getBarberPrices(profile.id);

        const allPosts = await getAllBarberPosts();
        const barberPosts = allPosts.filter((post) => post.barberId === profile.id);
        setPortfolioPosts(barberPosts);

        const postImages = barberPosts
          .map((post) => post.thumbnailUrl || post.imageUrl || post.postImage || post.image)
          .filter(Boolean);

        const resolvedImages = postImages.length > 0
          ? postImages
          : (Array.isArray(profile.portfolioImages) ? profile.portfolioImages : []);

        setPortfolioImages(resolvedImages);
      } catch (error) {
        console.error("BarberProfileScreen load error:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [resolvedBarberName]);

  const openPostListing = (selectedPost) => {
    if (!portfolioPosts.length) return;
    setPostListingContext({
      posts: portfolioPosts,
      selectedPostId: selectedPost?.id || null,
    });
    router.push("/(protected)/PostListingScreen");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00BCD4" />
          <Text style={styles.loadingText}>
            {t("BarberProfileScreen.loadingProfile", "Loading profile...")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!barberData) return null;

  const profileInitial = barberData?.salonName?.charAt(0)?.toUpperCase() || "S";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatar}>
              {portfolioImages?.[0] ? (
                <Image source={{ uri: portfolioImages[0] }} style={styles.profileImage} />
              ) : (
                <Text style={styles.profileInitial}>{profileInitial}</Text>
              )}
            </View>
            <View style={styles.profileInfoText}>
              <Text style={styles.bioName}>{barberData?.salonName}</Text>
              <Text style={styles.bioCategory}>{barberData?.nickName}</Text>
              {/* <Text style={styles.bioCategory}>
                {t("BarberProfileScreen.categoryLabel", "Beauty salon / Hair Artist")}
              </Text> */}
            </View>
          </View>
        </View>
        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>
            {t("BarberProfileScreen.informationTitle", "Information")}
          </Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t("BarberAccountScreen.nameLabel")}</Text>
            <Text style={styles.infoValue}>{barberData?.salonName || "-"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t("BarberAccountScreen.addressLabel")}</Text>
            <Text style={styles.infoValue}>{barberData?.address || "-"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t("BarberAccountScreen.phoneLabel")}</Text>
            <Text style={styles.infoValue}>{barberData?.telephone || "-"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t("BarberAccountScreen.workGenderLabel")}</Text>
            <Text style={styles.infoValue}>{barberData?.workGender || "-"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t("BarberAccountScreen.contactEmailLabel")}</Text>
            <Text style={styles.infoValue}>{barberData?.emailContact || "-"}</Text>
          </View>

          {barberData?.website ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t("BarberAccountScreen.websiteLabel")}</Text>
              <Text style={styles.infoValue}>{barberData.website}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.portfolioContainer}>
          <PostGrid posts={portfolioPosts} onPostPress={openPostListing} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f9fc" },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: "#666", fontSize: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "rgba(255,255,255,0.78)" },
  backButton: { padding: 8 },
  backIcon: { fontSize: 24, color: "#000" },
  profileSection: { paddingHorizontal: 16, paddingVertical: 20 },
  profileHeader: { flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: "rgba(255,255,255,0.78)", borderRadius: 28 },
  profileAvatar: { width: 76, height: 76, borderRadius: 38, justifyContent: "center", alignItems: "center", marginRight: 16, overflow: "hidden" },
  profileImage: { width: "100%", height: "100%", borderRadius: 38 },
  profileInitial: { fontSize: 28, fontWeight: "700", color: "#0f172a" },
  profileInfoText: { flex: 1 },
  bioName: { fontSize: 18, fontWeight: "700", color: "#0f172a", marginBottom: 6 },
  bioCategory: { fontSize: 14, color: "#334155", marginBottom: 6 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a", marginBottom: 12 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f6",
  },
  infoLabel: { fontSize: 14, color: "#64748b", flex: 1, marginRight: 8 },
  infoValue: { fontSize: 14, color: "#0f172a", flex: 1, textAlign: "right" },
  portfolioContainer: { paddingHorizontal: 16, paddingVertical: 16 },
});
