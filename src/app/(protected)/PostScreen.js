import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Image,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../../../config/firebase";
import { getCurrentUserData } from "../../services/authService";
import {
  pickAndProcessImageFromGallery,
  publishPost,
  validateSelectedTagsAgainstPreferences,
} from "../../services/postService";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PostScreen() {
  const { t, i18n } = useTranslation();
  const [allowedTags, setAllowedTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [caption, setCaption] = useState("");
  const [processedImage, setProcessedImage] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingImage, setProcessingImage] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const selectedTagsSet = useMemo(() => new Set(selectedTags), [selectedTags]);

  const registrationPreferences = useMemo(() => {
    const rawPreferences = userData?.typesCut || userData?.tipiTaglio || [];
    return Array.isArray(rawPreferences)
      ? rawPreferences.filter((tagId) => typeof tagId === "string" && tagId.trim().length > 0)
      : [];
  }, [userData]);

  const getLocalizedText = (value, fallback = "") => {
    if (!value) return fallback;
    if (typeof value === "string") return value;
    return i18n.language === "en-UK"
      ? value.en ?? value.it ?? fallback
      : value.it ?? value.en ?? fallback;
  };

  const fetchContextData = async () => {
    try {
      setLoading(true);
      const [userContext, tagsSnapshot] = await Promise.all([
        getCurrentUserData(),
        getDocs(collection(db, "tags")),
      ]);

      const tags = tagsSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      const specializations =
        userContext?.userData?.typesCut || userContext?.userData?.tipiTaglio || [];

      const visibleBarberTags = tags.filter(
        (tag) => tag.active && tag.visibility === "barber"
      );

      const filteredAllowedTags =
        specializations.length > 0
          ? visibleBarberTags.filter((tag) => specializations.includes(tag.id))
          : visibleBarberTags;

      setUserData(userContext?.userData || null);
      setAllowedTags(filteredAllowedTags);
    } catch (error) {
      console.error("Error loading add post context:", error);
      Alert.alert(t("PostScreen.errorTitle"), t("PostScreen.loadContextError"));
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      setProcessingImage(true);
      const processed = await pickAndProcessImageFromGallery();

      if (!processed) {
        return;
      }

      setProcessedImage(processed);
    } catch (error) {
      console.error("Error processing selected image:", error);
      Alert.alert(t("PostScreen.errorTitle"), t("PostScreen.processImageError"));
    } finally {
      setProcessingImage(false);
    }
  };

  const toggleTag = (tagId) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const validateSelectedTags = () =>
    validateSelectedTagsAgainstPreferences({
      selectedTags,
      registrationPreferences,
    });

  const handlePublishPost = async () => {
    if (!auth.currentUser?.uid) {
      Alert.alert(t("PostScreen.errorTitle"), t("PostScreen.mustBeLoggedIn"));
      return;
    }

    if (!processedImage?.uri) {
      Alert.alert(t("PostScreen.validationTitle"), t("PostScreen.selectImageValidation"));
      return;
    }

    if (!validateSelectedTags()) {
      Alert.alert(
        t("PostScreen.validationTitle"),
        t("PostScreen.selectValidTagValidation")
      );
      return;
    }

    try {
      setPublishing(true);

      await publishPost({
        barberId: auth.currentUser.uid,
        image: processedImage,
        caption: caption.trim(),
        selectedTags,
        registrationPreferences,
      });

      setProcessedImage(null);
      setSelectedTags([]);
      setCaption("");
      Alert.alert(t("PostScreen.successTitle"), t("PostScreen.postPreparedSuccess"));
    } catch (error) {
      console.error("Error publishing post:", error);
      Alert.alert(t("PostScreen.errorTitle"), t("PostScreen.preparePostError"));
    } finally {
      setPublishing(false);
    }
  };

  useEffect(() => {
    fetchContextData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="small" color="#00BCD4" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t("Navigation.add")}</Text>

        <TouchableOpacity
          onPress={handlePickImage}
          style={styles.imagePicker}
          disabled={processingImage || publishing}
        >
          {processingImage ? (
            <ActivityIndicator size="small" color="#00BCD4" />
          ) : processedImage?.uri ? (
            <Image source={{ uri: processedImage.uri }} style={styles.previewImage} />
          ) : (
            <Text style={styles.imagePickerText}>{t("PostScreen.selectImageFromGallery")}</Text>
          )}
        </TouchableOpacity>

        <TextInput
          placeholder={t("PostScreen.captionPlaceholder")}
          placeholderTextColor="#94a3b8"
          style={styles.captionInput}
          value={caption}
          onChangeText={setCaption}
          multiline
        />

        <Text style={styles.sectionTitle}>{t("PostScreen.selectTagsTitle")}</Text>
        <Text style={styles.sectionSubtitle}>
          {t("PostScreen.selectTagsSubtitle")}
        </Text>
        <View style={styles.tagsContainer}>
          {allowedTags.map((tag) => {
            const isSelected = selectedTagsSet.has(tag.id);
            return (
              <TouchableOpacity
                key={tag.id}
                style={[styles.tagCard, isSelected && styles.tagCardActive]}
                onPress={() => toggleTag(tag.id)}
                disabled={publishing}
              >
                <Text style={[styles.tagTitle, isSelected && styles.tagTitleActive]}>
                  {getLocalizedText(tag.label, tag.id)}
                </Text>
                <Text style={styles.tagDescription}>
                  {getLocalizedText(tag.description, "")}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.publishButton, publishing && styles.publishButtonDisabled]}
          onPress={handlePublishPost}
          disabled={publishing || processingImage}
        >
          {publishing ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.publishButtonText}>{t("PostScreen.publishButton")}</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.legalText}>
          {t("PostScreen.legalText")}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#00BCD4",
    marginBottom: 16,
  },
  imagePicker: {
    height: 240,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(0, 188, 212, 0.4)",
    backgroundColor: "rgba(0, 188, 212, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  imagePickerText: {
    color: "#0891b2",
    fontSize: 15,
    fontWeight: "600",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  captionInput: {
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 188, 212, 0.25)",
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#0f172a",
    textAlignVertical: "top",
  },
  sectionTitle: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  sectionSubtitle: {
    marginTop: 4,
    marginBottom: 10,
    fontSize: 12,
    color: "#64748b",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  tagCard: {
    width: "48%",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  tagCardActive: {
    borderColor: "#00BCD4",
    backgroundColor: "rgba(0, 188, 212, 0.12)",
  },
  tagTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  tagTitleActive: {
    color: "#0891b2",
  },
  tagDescription: {
    fontSize: 11,
    color: "#64748b",
    lineHeight: 15,
  },
  publishButton: {
    marginTop: 12,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#00BCD4",
    justifyContent: "center",
    alignItems: "center",
  },
  publishButtonDisabled: {
    opacity: 0.6,
  },
  publishButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  legalText: {
    marginTop: 10,
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
  },
});
