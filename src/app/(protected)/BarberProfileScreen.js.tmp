import React, { useState, useEffect, useRef } from "react";
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
import {
  getBarberProfileData,
  getBarberProfileByUid,
  getBarberPrices,
} from "../../services/barberService";
import { getBarberPostsByUid } from "../../services/postService";
import { getCurrentUserData } from "../../services/userService";
import { setPostListingContext } from "../../services/postListingStore";
import {
  getBarberProfileContext,
  setBarberProfileScrollOffset,
  getBarberProfileScrollOffset,
} from "../../services/barberProfileStore";
import useLikesStore from "../../services/likesStore";
import { canBookNow, openBookNow } from "../../services/bookingActions";
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from "expo-image";

export default function BarberProfileScreen() {
  const { t } = useTranslation();
  // Entry point sia da feed/ricerca (barberName = salonName, legacy) sia per uid.
  const { barberName, uid } = useLocalSearchParams();
  const resolvedBarberName = typeof barberName === "string" ? barberName : "";
  const resolvedUid = typeof uid === "string" ? uid : "";

  const [barberData, setBarberData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portfolioPosts, setPortfolioPosts] = useState([]);

  const hydrateFromPosts = useLikesStore((s) => s.hydrateFromPosts);

  // Ripristino scroll (Task 3): identità stabile del profilo + ref alla ScrollView.
  const scrollViewRef = useRef(null);
  const currentScrollYRef = useRef(0);
  const hasRestoredScrollRef = useRef(false);
  const scrollIdentity = { uid: resolvedUid, barberName: resolvedBarberName };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const currentUser = await getCurrentUserData();
        const currentUserId = currentUser?.user?.uid || null;

        // Risoluzione profilo: per uid se disponibile, altrimenti per nome (legacy).
        const profile = resolvedUid
          ? await getBarberProfileByUid(resolvedUid)
          : await getBarberProfileData(resolvedBarberName);

        if (!profile) {
          router.back();
          return;
        }

        setBarberData(profile);
        await getBarberPrices(profile.id);

        // Stessi post (e stesso Document ID + stato like) del feed (M4 §4.2 / §6).
        const barberPosts = await getBarberPostsByUid(profile.id, currentUserId);
        setPortfolioPosts(barberPosts);

        // Idrata lo store condiviso così la griglia mostra subito i like correnti.
        hydrateFromPosts(barberPosts);
      } catch (error) {
        console.error("BarberProfileScreen load error:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [resolvedBarberName, resolvedUid, hydrateFromPosts]);

  // Salva l'offset corrente prima di aprire la foto, così al ritorno
  // (router.back, schermata ancora montata) la posizione è già corretta;
  // in caso di rimontaggio viene comunque ripristinata da restoreScroll().
  const handleScroll = (event) => {
    const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
    currentScrollYRef.current = offsetY;
    setBarberProfileScrollOffset(scrollIdentity, offsetY);
  };

  // Ripristina lo scroll salvato una sola volta, dopo che il contenuto
  // (incluso il portfolio) ha un'altezza stabile.
  const restoreScroll = () => {
    if (hasRestoredScrollRef.current) return;
    const savedOffset = getBarberProfileScrollOffset(scrollIdentity);
    if (savedOffset > 0 && scrollViewRef.current) {
      hasRestoredScrollRef.current = true;
      // Senza animazione per un ripristino preciso (±10px, M1 Task 3).
      scrollViewRef.current.scrollTo({ y: savedOffset, animated: false });
    }
  };

  const openPostListing = (selectedPost) => {
    if (!portfolioPosts.length) return;
    // Persisti l'ultimo offset noto prima di navigare alla foto.
    setBarberProfileScrollOffset(scrollIdentity, currentScrollYRef.current);
    setPostListingContext({
      posts: portfolioPosts,
      selectedPostId: selectedPost?.id || null,
      returnTo: {
        pathname: "/(protected)/BarberProfileScreen",
        params: { barberName: resolvedBarberName },
      },
    });
    router.push("/(protected)/PostListingScreen");
  };

  const handleBack = () => {
    if (router.canGoBack?.()) {
      router.back();
      return;
    }

    const { returnTo } = getBarberProfileContext();
    if (returnTo?.pathname) {
      router.replace({
        pathname: returnTo.pathname,
        params: returnTo.params || {},
      });
      return;
    }

    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
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

  const profileInitial =
    (barberData?.nickName || barberData?.salonName)?.charAt(0)?.toUpperCase() || "S";
  const profileImageUrl = barberData?.profileImageThumbnail || barberData?.profileImage || null;
  // Display "{nickName} - {salonName}" (M4 §2.1).
  const displayName = [barberData?.nickName, barberData?.salonName]
    .filter(Boolean)
    .join(" - ") || barberData?.salonName || "";
  const bookingEnabled = canBookNow(barberData);

  const handleBookNow = async () => {
    await openBookNow(barberData);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onContentSizeChange={restoreScroll}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            {/* Avatar pubblico in sola lettura (M4 D1 / §4.1), expo-image cache */}
            <View style={styles.profileAvatar}>
              {profileImageUrl ? (
                <Image
                  source={{ uri: profileImageUrl }}
                  style={styles.profileImage}
                  cachePolicy="memory-disk"
                />
              ) : (
                <Text style={styles.profileInitial}>{profileInitial}</Text>
              )}
            </View>
            <View style={styles.profileInfoText}>
              <Text style={styles.bioName} numberOfLines={2}>{displayName}</Text>
            </View>
          </View>

          {/* BOOK NOW sempre presente sul profilo (M4 D3 / §4.1) */}
          <TouchableOpacity
            style={[styles.bookNowButton, !bookingEnabled && styles.bookNowButtonDisabled]}
            onPress={handleBookNow}
            disabled={!bookingEnabled}
          >
            <Text
              style={[styles.bookNowText, !bookingEnabled && styles.bookNowTextDisabled]}
            >
              {t("post.bookNow")}
            </Text>
          </TouchableOpacity>
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
  bookNowButton: {
    marginTop: 16,
    backgroundColor: "rgba(0, 188, 212, 0.35)",
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(0, 188, 212, 0.7)",
  },
  bookNowButtonDisabled: {
    backgroundColor: "rgba(200, 200, 200, 0.25)",
    borderColor: "rgba(200, 200, 200, 0.4)",
  },
  bookNowText: {
    color: "#00BCD4",
    fontSize: 15,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  bookNowTextDisabled: { color: "#aaa" },
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
