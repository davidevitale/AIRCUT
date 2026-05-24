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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";
import { useTranslation } from "react-i18next";
import {
  togglePostLike,
  getCurrentUserData,
} from "../services/authService";
import { Image } from "expo-image";

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
const BarberPost = ({ barber, onViewProfile, onHashtagPress }) => {
  // console.log(JSON.stringify(barber, null, 2))
  const { t, i18n } = useTranslation();
  const [isLiked, setIsLiked] = useState(barber.isLiked || false);
  const [likesCount, setLikesCount] = useState(barber.likes || 0);
  const [currentUser, setCurrentUser] = useState(null);
  const [imageError, setImageError] = useState(false);

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

  // Sincronizza lo stato locale con le props quando cambiano
  useEffect(() => {
    setIsLiked(barber.isLiked || false);
    setLikesCount(barber.likesCount || barber.likes || 0);
  }, [barber.isLiked, barber.likesCount, barber.likes]);

  const loadCurrentUser = async () => {
    try {
      const userData = await getCurrentUserData();
      setCurrentUser(userData);
    } catch (error) {
      console.error("Error loading current user:", error);
    }
  };

  const handleProfilePress = () => {
    console.log("BarberPost: handleProfilePress called");
    console.log("BarberPost: barber object:", barber);
    console.log("BarberPost: onViewProfile function:", typeof onViewProfile);

    if (onViewProfile) {
      // Usa il nome del salone come identificatore unico
      const barberName =
        barber.salonName ||
        barber.salonName ||
        barber.name ||
        barber.barberName;
      console.log(
        "BarberPost: calling onViewProfile with barberName:",
        barberName,
      );
      if (barberName) {
        onViewProfile(barberName);
      } else {
        console.log("BarberPost: No valid barber name found");
      }
    } else {
      console.log("BarberPost: onViewProfile not available");
    }
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
        // Usa il postId del barber che viene passato dal parent
        const postId =
          barber.postId ||
          `${barber.barberId}_img_${barber.id.split("_").pop()}`;

        console.log(
          "BarberPost: Doppio tap - aggiungendo like al post:",
          postId,
        );

        // Usa la nuova funzione togglePostLike
        const result = await togglePostLike(postId, currentUserData.user.uid);

        if (result.isLiked) {
          setIsLiked(true);
          setLikesCount(result.likesCount);
          console.log("BarberPost: Like aggiunto tramite doppio tap");
        }
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

      // Usa il postId del barber che viene passato dal parent
      const postId =
        barber.postId || `${barber.barberId}_img_${barber.id.split("_").pop()}`;

      console.log("BarberPost toggleLike:", {
        postId,
        currentIsLiked: isLiked,
        userId: currentUserData.user.uid,
        barberData: {
          id: barber.id,
          barberId: barber.barberId,
          postId: barber.postId,
        },
      });

      // Aggiorna immediatamente l'UI per feedback istantaneo
      const newIsLiked = !isLiked;
      const newLikesCount = newIsLiked
        ? likesCount + 1
        : Math.max(0, likesCount - 1);

      setIsLiked(newIsLiked);
      setLikesCount(newLikesCount);

      try {
        // Chiama la nuova funzione togglePostLike
        const result = await togglePostLike(postId, currentUserData.user.uid);

        // Sincronizza con il risultato del server
        setIsLiked(result.isLiked);
        setLikesCount(result.likesCount);

        if (result.isLiked) {
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
        // Se il server fallisce, ripristina lo stato precedente
        console.error(
          "BarberPost: Errore server, ripristinando stato precedente:",
          serverError,
        );
        setIsLiked(!newIsLiked);
        setLikesCount(likesCount);

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
      await Share.share({
        message: t("BarberPost.shareMessage", {
          name: barber.salonName || barber.salonName || barber.barberName,
        }),
        url: postImageUri,
      });
    } catch (error) {
      console.log("Errore condivisione:", error.message);
    }
  };

  // Avatar helpers
  const avatarValue = barber?.avatar || barber?.barberProfileImage;
  const avatarUri =
    typeof avatarValue === "string" && avatarValue.length > 0
      ? avatarValue
      : null;
  const postImageUri =
    barber.postImage || barber.imageUrl || barber.thumbnailUrl || barber.image || barber.mainImage;
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
            <Text style={styles.salonName}>
              {barber.salonName || barber.salonName || barber.barberName}
            </Text>
            <Text style={styles.barberName}>{barber.barberName}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text style={styles.moreDotsIcon}>⋯</Text>
        </TouchableOpacity>
      </View>

      {/* Immagine del lavoro con doppio tap // Double tap work image */}
      <View style={styles.imageContainer}>
        <View
          style={styles.imagePress}
          onStartShouldSetResponder={() => true}
          onResponderGrant={handleImagePress}
        >
          {imageError || !postImageUri ? (
            <View
              style={[styles.fallbackImage, { backgroundColor: fallbackColor }]}
            >
              <Text style={styles.fallbackEmoji}>✨</Text>
            </View>
          ) : (
            <Image
              source={{ uri: postImageUri }}
              style={styles.workImage}
              onError={() => setImageError(true)}
            />
          )}
        </View>

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
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
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
              {barber.salonName || barber.salonName || barber.barberName}
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

