import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Pressable,
  Animated,
  Share,
  Alert,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";
import { useTranslation } from "react-i18next";
import { getCurrentUserData } from "../services/userService";
import { Image } from "expo-image";
import useLikesStore, { resolvePostId } from "../services/likesStore";
import { canBookNow, openBookNow } from "../services/bookingActions";
import { resolveBarberAvatar } from "../services/barberService";

// Componente Cuore SVG Instagram-style
const HeartIcon = ({ size = 24, filled = false, color = "#262626" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      fill={filled ? color : "none"}
      stroke={filled ? "none" : color}
      strokeWidth={filled ? 0 : 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Componente per hashtag cliccabili da selectedTags
const ClickableTags = ({ selectedTags, language, onHashtagPress }) => {
  if (!Array.isArray(selectedTags) || selectedTags.length === 0) return null;

  const languageKey = language?.startsWith("it") ? "it" : "en";

  return (
    <Text style={styles.caption}>
      {selectedTags.map((tag, index) => {
        const label = tag?.[languageKey] || tag?.en || tag?.it || tag?.id;
        if (!label) return null;
        const hashtag = `#${label}`;
        const needsSpace = index < selectedTags.length - 1;

        return (
          <Text
            key={`hashtag-${tag?.id || index}`}
            onPress={() => onHashtagPress && onHashtagPress(hashtag)}
            style={styles.hashtagText}
          >
            {hashtag}
            {needsSpace ? " " : ""}
          </Text>
        );
      })}
    </Text>
  );
};

// Componente Post del Parrucchiere
const BarberPost = ({ barber, onViewProfile, onHashtagPress, zoomable = false }) => {
  // console.log(JSON.stringify(barber, null, 2))
  const { t, i18n } = useTranslation();

  // Stato like da store condiviso (single source of truth feed ↔ profilo, M4 §4.2).
  const postId = resolvePostId(barber);
  const isLiked = useLikesStore((s) => !!s.liked[postId]);
  const storeCount = useLikesStore((s) => s.counts[postId]);
  const toggleLikeInStore = useLikesStore((s) => s.toggleLike);
  const hydrateFromPosts = useLikesStore((s) => s.hydrateFromPosts);
  const likesCount =
    typeof storeCount === "number"
      ? storeCount
      : barber.likesCount || barber.likes || 0;

  const [currentUser, setCurrentUser] = useState(null);
  const [imageError, setImageError] = useState(false);
  // Quando il prefetch L2 è completato, si passa a mostrare zoom-ready.webp
  // (qualità superiore per il pinch-to-zoom). Default: thumbnail.webp (L1).
  const [zoomReadyLoaded, setZoomReadyLoaded] = useState(false);

  // Display name barbiere: "{nickName} - {salonName}" (M4 §2.1 / §4.4).
  const displayName = [barber.nickName, barber.salonName]
    .filter(Boolean)
    .join(" - ") || barber.salonName || barber.barberName || "";
  const bookingEnabled = canBookNow(barber);

  const fallbackColors = [
    "#A8D8EA",
    "#AA96DA",
    "#F38181",
    "#4ECDC4",
    "#FFE66D",
    "#95E1D3",
    "#00BCD4",
    "#FF6B6B",
  ];
  const fallbackColor =
    fallbackColors[
    Math.abs(
      (barber?.id || "0")
        .split("")
        .reduce((acc, ch) => acc + ch.charCodeAt(0), 0),
    ) % fallbackColors.length
    ];

  // Animazioni
  const likeAnimation = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const heartVibration = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const heartX = useRef(new Animated.Value(0)).current;
  const heartY = useRef(new Animated.Value(0)).current;

  // Gestione doppio tap con posizione
  const lastTap = useRef(0);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  // Prefetch L2 (Task 7): quando il post resta visibile per >= 1.2s, scarica in
  // background zoom-ready.webp. Al termine si passa a mostrare la variante L2,
  // pronta per il pinch-to-zoom senza scatti. I post legacy (senza zoomReadyUrl)
  // restano su thumbnail.webp.
  const zoomReadyUri =
    typeof barber?.zoomReadyUrl === "string" && barber.zoomReadyUrl.length > 0
      ? barber.zoomReadyUrl
      : null;

  useEffect(() => {
    if (!zoomReadyUri) return undefined;

    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        // expo-image espone Image.prefetch per il warming della cache.
        if (typeof Image.prefetch === "function") {
          await Image.prefetch(zoomReadyUri);
        }
        if (isMounted) setZoomReadyLoaded(true);
      } catch (error) {
        console.warn("BarberPost: prefetch zoom-ready fallito:", error?.message || error);
      }
    }, 1200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [zoomReadyUri]);

  // Idrata lo store condiviso con i dati iniziali del post (senza sovrascrivere
  // uno stato già toggle-ato localmente per lo stesso postId).
  useEffect(() => {
    hydrateFromPosts([barber]);
  }, [barber, hydrateFromPosts]);

  const loadCurrentUser = async () => {
    try {
      const userData = await getCurrentUserData();
      setCurrentUser(userData);
    } catch (error) {
      console.error("Error loading current user:", error);
    }
  };

  const handleProfilePress = () => {
    if (!onViewProfile) return;

    // Preferisci l'uid del barbiere (identità canonica M4 §2.2); fallback al nome.
    const barberName =
      barber.salonName || barber.name || barber.barberName;
    onViewProfile(barberName, barber.barberId);
  };

  const handleImagePress = (event) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;

    if (lastTap.current && now - lastTap.current < DOUBLE_PRESS_DELAY) {
      // Doppio tap rilevato - posizione fissa per lo scroll naturale
      handleDoubleTap();
      lastTap.current = 0;
    } else {
      // Primo tap
      lastTap.current = now;
    }
  };

  const handleDoubleTap = async () => {
    try {
      const currentUserData = await getCurrentUserData();
      if (!currentUserData) {
        Alert.alert(t("BarberPost.errorTitle"), t("BarberPost.mustBeLoggedIn"));
        return;
      }

      // Solo aggiungi like se non è già piaciuto (doppio tap per aggiungere like)
      if (!isLiked) {
        console.log(
          "BarberPost: Doppio tap - aggiungendo like al post:",
          postId,
        );

        // Toggle tramite store condiviso (persiste con togglePostLike + sync feed/profilo)
        await toggleLikeInStore(postId, currentUserData.user.uid);
        console.log("BarberPost: Like aggiunto tramite doppio tap");
      }
    } catch (error) {
      console.error("Errore nel gestire il doppio tap like:", error);
    }

    // Posizione fissa in basso a destra (zona di scroll naturale del pollice)
    const fixedX = 280; // Posizione fissa a destra
    const fixedY = 200; // Posizione fissa in basso

    // Reset delle animazioni con posizione fissa
    likeAnimation.setValue(0);
    heartOpacity.setValue(1);
    heartX.setValue(fixedX);
    heartY.setValue(fixedY);
    heartVibration.setValue(0);

    // Animazione complessa del cuore
    Animated.parallel([
      // Animazione principale (scala e fade)
      Animated.sequence([
        // Apparizione rapida
        Animated.timing(likeAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        // Mantieni visibile
        Animated.delay(300),
        // Scomparsa
        Animated.timing(likeAnimation, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),

      // Vibrazione del cuore
      Animated.sequence([
        Animated.timing(heartVibration, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(heartVibration, {
          toValue: -1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(heartVibration, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(heartVibration, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),

      // Movimento verso il bottone like (in basso a sinistra)
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(heartX, {
          toValue: 30, // Posizione del bottone like
          duration: 500,
          useNativeDriver: true,
        }),
      ]),

      Animated.sequence([
        Animated.delay(400),
        Animated.timing(heartY, {
          toValue: 350, // Verso il basso (bottone like)
          duration: 500,
          useNativeDriver: true,
        }),
      ]),

      // Fade out graduale durante il movimento
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(heartOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const handleLikePress = async () => {
    try {
      const currentUserData = await getCurrentUserData();
      if (!currentUserData) {
        Alert.alert(t("BarberPost.errorTitle"), t("BarberPost.mustBeLoggedIn"));
        return;
      }

      const willLike = !isLiked;

      console.log("BarberPost toggleLike:", {
        postId,
        currentIsLiked: isLiked,
        userId: currentUserData.user.uid,
      });

      try {
        // Toggle tramite store condiviso: update ottimistico + persistenza
        // (togglePostLike) + rollback automatico in caso di errore.
        await toggleLikeInStore(postId, currentUserData.user.uid);

        if (willLike) {
          // Animazione del cuore piccolo quando si mette like
          Animated.sequence([
            Animated.timing(heartScale, {
              toValue: 1.3,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(heartScale, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();

          console.log("BarberPost: Like aggiunto al post:", postId);
        } else {
          console.log("BarberPost: Like rimosso dal post:", postId);
        }
      } catch (serverError) {
        console.error(
          "BarberPost: Errore server (rollback gestito dallo store):",
          serverError,
        );

        // Gestisci diversi tipi di errore
        if (
          serverError.message.includes("Connessione lenta") ||
          serverError.message.includes("Could not reach Cloud Firestore") ||
          serverError.message.includes("Backend didn't respond")
        ) {
          // Non mostrare alert per errori di connessione, solo log
          console.warn(
            "BarberPost: Connessione lenta, like verrà sincronizzato quando la connessione migliorerà",
          );
        } else if (
          serverError.message.includes("unavailable") ||
          serverError.message.includes("network")
        ) {
          Alert.alert(
            t("BarberPost.slowConnectionTitle"),
            t("BarberPost.likeSyncLater"),
          );
        } else {
          Alert.alert(t("BarberPost.errorTitle"), t("BarberPost.likeUpdateError"));
        }
      }
    } catch (error) {
      console.error("BarberPost: Errore toggle like:", error);
      Alert.alert(t("BarberPost.errorTitle"), t("BarberPost.likeGenericError"));
    }
  };

  const handleShare = async () => {
    try {
      // Deep link al profilo del barbiere autore (M4 §4.4 / D5).
      await Share.share({
        message: t("share.message"),
        url: `aircut://profile/${barber.barberId}`,
      });
    } catch (error) {
      console.log("Errore condivisione:", error.message);
    }
  };

  const handleBookNow = async () => {
    await openBookNow(barber);
  };

  // Avatar helpers — sorgente UNICA condivisa con feed/like (Task 1).
  // resolveBarberAvatar preferisce thumbnail.webp e applica il fallback graduale.
  const avatarUri = resolveBarberAvatar(barber);
  // Base = thumbnail.webp (L1). Dopo il prefetch (>=1.2s) si usa zoom-ready.webp
  // (L2) per una resa migliore in zoom. Fallback a L1 se L2 non disponibile.
  const postImageUri =
    zoomReadyLoaded && zoomReadyUri ? zoomReadyUri : barber.thumbnailUrl;
  const placeholderInitial = (
    barber?.salonName ||
    barber?.salonName ||
    barber?.barberName ||
    "S"
  )
    .toString()
    .charAt(0)
    .toUpperCase();

  return (
    <View style={styles.postCard}>
      {/* Header del post */}
      <View style={styles.postHeader}>
        <TouchableOpacity
          style={styles.barberInfo}
          onPress={handleProfilePress}
          disabled={!onViewProfile}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.barberAvatar} />
          ) : (
            <View style={styles.barberAvatarPlaceholder}>
              <Text style={styles.barberAvatarPlaceholderText}>
                {placeholderInitial}
              </Text>
            </View>
          )}
          <View style={styles.barberDetails}>
            <Text style={styles.salonName} numberOfLines={1}>
              {displayName}
            </Text>
          </View>
        </TouchableOpacity>

        {/* BOOK NOW a destra del nome, su ogni post (M4 D3 / §4.4) */}
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

      {/* Immagine del lavoro.
          - Feed (zoomable=false): doppio tap per mettere like (comportamento Instagram).
          - Vista dettaglio (zoomable=true): pinch-to-zoom per ispezionare il taglio
            (Task 3), tramite ScrollView nativo (maximumZoomScale), iOS + Android,
            senza nuove dipendenze. */}
      <View style={styles.imageContainer}>
        {imageError || !postImageUri ? (
          <View
            style={[styles.fallbackImage, { backgroundColor: fallbackColor }]}
          >
            <Text style={styles.fallbackEmoji}>✨</Text>
          </View>
        ) : zoomable ? (
          <ScrollView
            style={styles.zoomScroll}
            contentContainerStyle={styles.zoomContent}
            maximumZoomScale={3.5}
            minimumZoomScale={1}
            bouncesZoom
            pinchGestureEnabled
            centerContent
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            <Image
              source={{ uri: postImageUri }}
              style={styles.workImage}
              onError={() => setImageError(true)}
            />
          </ScrollView>
        ) : (
          <View
            style={styles.imagePress}
            onStartShouldSetResponder={() => true}
            onResponderGrant={handleImagePress}
          >
            <Image
              source={{ uri: postImageUri }}
              style={styles.workImage}
              onError={() => setImageError(true)}
            />
          </View>
        )}

        {/* Cuore animato per doppio tap - Instagram Style */}
        <Animated.View
          style={[
            styles.likeHeartOverlay,
            {
              opacity: Animated.multiply(likeAnimation, heartOpacity),
              transform: [
                {
                  translateX: heartX,
                },
                {
                  translateY: heartY,
                },
                {
                  scale: likeAnimation.interpolate({
                    inputRange: [0, 0.3, 1],
                    outputRange: [0, 1.2, 1],
                  }),
                },
                {
                  rotate: heartVibration.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: ["-15deg", "0deg", "15deg"],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.instagramHeart}>
            {/* Cuore SVG 2D con gradiente diretto */}
            <Svg
              width={80}
              height={80}
              viewBox="0 0 24 24"
              style={styles.heartSvg}
            >
              <Defs>
                <SvgLinearGradient
                  id="heartGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <Stop offset="0%" stopColor="#007BFF" />
                  <Stop offset="50%" stopColor="#00D4AA" />
                  <Stop offset="100%" stopColor="#40E0D0" />
                </SvgLinearGradient>
              </Defs>
              <Path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill="url(#heartGradient)"
                stroke="none"
              />
            </Svg>
          </View>
        </Animated.View>
      </View>

      {/* Azioni e follow button */}
      <View style={styles.actionsContainer}>
        <View style={styles.leftActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLikePress}>
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <HeartIcon
                size={24}
                filled={isLiked}
                color={isLiked ? "#ff3040" : "#262626"}
              />
            </Animated.View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleShare}
            accessibilityLabel={t("share.label")}
          >
            <Text style={styles.shareIcon}>↗</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Likes only - descrizione rimossa */}
      <View style={styles.captionContainer}>
        <Text style={styles.likesCount}>
          {t("BarberPost.likesCount", { count: likesCount })}
        </Text>
        {Array.isArray(barber.selectedTags) && barber.selectedTags.length > 0 ? (
          <View style={styles.captionRow}>
            <Text style={styles.usernameInCaption}>
              {displayName}
            </Text>
            <ClickableTags
              selectedTags={barber.selectedTags}
              language={i18n.language}
              onHashtagPress={onHashtagPress}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Post Card Styles
  postCard: {
    backgroundColor: "transparent",
    marginBottom: 0,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  barberInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  bookNowButton: {
    backgroundColor: "rgba(0, 188, 212, 0.35)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(0, 188, 212, 0.7)",
  },
  bookNowButtonDisabled: {
    backgroundColor: "rgba(200, 200, 200, 0.2)",
    borderColor: "rgba(200, 200, 200, 0.4)",
  },
  bookNowText: {
    color: "#00BCD4",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  bookNowTextDisabled: {
    color: "#aaa",
  },
  barberAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 12,
  },
  barberAvatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 12,
    backgroundColor: "#00BCD4",
    justifyContent: "center",
    alignItems: "center",
  },
  barberAvatarPlaceholderText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  barberDetails: {
    flex: 1,
  },
  salonName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
  },
  barberName: {
    fontSize: 12,
    color: "#666",
    marginTop: 1,
  },
  moreDotsIcon: {
    fontSize: 20,
    color: "#666",
    marginLeft: -20,
    transform: [{ rotate: "0 deg" }],
  },

  // Image Container
  imageContainer: {
    width: "100%",
    aspectRatio: 1,
    position: "relative",
  },
  workImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  fallbackImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  fallbackEmoji: {
    fontSize: 48,
    color: "#fff",
  },
  imagePress: {
    width: "100%",
    height: "100%",
  },
  zoomScroll: {
    width: "100%",
    height: "100%",
  },
  zoomContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Overlay del cuore per doppio tap - Instagram Style
  likeHeartOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: 80,
    marginTop: -40,
    marginLeft: -40,
    zIndex: 1000,
  },
  instagramHeart: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  heartSvg: {
    // Ombra leggera per profondità
    shadowColor: "rgba(0, 0, 0, 0.2)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },

  // Actions Container
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leftActions: {
    flexDirection: "row",
  },
  actionBtn: {
    marginRight: 16,
  },
  shareIcon: {
    fontSize: 22,
  },
  followButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  followingButton: {
    backgroundColor: "#f0f0f0",
  },
  followText: {
    fontSize: 14,
    color: "#000",
    marginRight: 4,
  },
  followingText: {
    color: "#666",
  },
  plusIcon: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },

  // Caption Container
  captionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "column"
  },
  likesCount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  captionRow: {
    flexDirection: "column",
    // flexWrap: "wrap",
    // alignItems: "flex-start",
  },
  caption: {
    flexDirection: "row",
    flexWrap: "wrap",
    flex: 1,
  },
  captionSpacer: {
    fontSize: 14,
    color: "#000",
  },
  captionText: {
    fontSize: 14,
    color: "#000",
    // lineHeight: 18,
  },
  hashtagText: {
    fontSize: 14,
    color: "#00BCD4",
    fontWeight: "500",
    // lineHeight: 18,
  },
  usernameInCaption: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
  },
  profileHint: {
    fontSize: 12,
    color: "#00BCD4",
    marginLeft: 8,
  },
});

export default BarberPost;

