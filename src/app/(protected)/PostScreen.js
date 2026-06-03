import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useTranslation } from "react-i18next";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { auth, db } from "../../../config/firebase";
import { getCurrentUserData } from "../../services/userService";
import { SafeAreaView } from "react-native-safe-area-context";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { serverTimestamp } from "firebase/firestore";
import { useToast } from "@kritikhedau/react-native-toastify";
import { Image } from "expo-image";

const IMAGE_VARIANTS = {
  thumbnail: {
    size: 400,
    quality: 0.7,
    fileName: "thumbnail.webp",
    mimeType: "image/webp",
  },
};

const PREVIEW_VARIANT = {
  size: 1080,
  quality: 0.8,
  mimeType: "image/webp",
};

const buildLocalizedSelectedTags = (selectedIds = [], availableTags = []) => {
  if (!Array.isArray(selectedIds) || !Array.isArray(availableTags)) {
    return [];
  }

  return selectedIds
    .map((tagId) => {
      const tag = availableTags.find((item) => item.id === tagId);

      if (!tag) {
        return null;
      }

      return {
        id: tag.id,
        en: tag.label?.en ?? tag.id,
        it: tag.label?.it ?? tag.label?.en ?? tag.id,
      };
    })
    .filter(Boolean);
};

const getVisibleTagsByWorkGender = (allTags = [], workGender) => {
  if (!Array.isArray(allTags) || !workGender) {
    return [];
  }

  return allTags.filter((tag) => {
    if (!tag.active) {
      return false;
    }

    if (workGender === "male") {
      return tag.visibility === "male" || tag.visibility === "male_unisex";
    }

    if (workGender === "female") {
      return tag.visibility === "female";
    }

    if (workGender === "unisex") {
      return (
        tag.visibility === "male" ||
        tag.visibility === "male_unisex" ||
        tag.visibility === "female"
      );
    }

    return false;
  });
};



export default function PostScreen() {
  const { t, i18n } = useTranslation();
  const { show } = useToast();
  const [allowedTags, setAllowedTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [workCategory, setWorkCategory] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingImage, setProcessingImage] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const isUnisexUser = userData?.workGender === "unisex";
  const selectedTagsSet = useMemo(() => new Set(selectedTags), [selectedTags]);
  const visibleTags = useMemo(() => {
    if (!isUnisexUser) {
      return allowedTags;
    }

    if (!workCategory) {
      return [];
    }

    return getVisibleTagsByWorkGender(allowedTags, workCategory);
  }, [allowedTags, isUnisexUser, workCategory]);

  const getLocalizedText = (value, fallback = "") => {
    if (!value) return fallback;
    if (typeof value === "string") return value;
    return i18n.language === "en-UK"
      ? value.en ?? value.it ?? fallback
      : value.it ?? value.en ?? fallback;
  };

  const createSquareImageVariant = async (imageAsset, variant) => {
    if (!imageAsset?.uri) {
      throw new Error("Invalid image asset. Missing uri.");
    }

    const sourceWidth = imageAsset.width ?? variant.size;
    const sourceHeight = imageAsset.height ?? variant.size;
    const squareSize = Math.min(sourceWidth, sourceHeight);
    const originX = Math.max(0, Math.floor((sourceWidth - squareSize) / 2));
    const originY = Math.max(0, Math.floor((sourceHeight - squareSize) / 2));

    const processed = await ImageManipulator.manipulateAsync(
      imageAsset.uri,
      [
        {
          crop: {
            originX,
            originY,
            width: squareSize,
            height: squareSize,
          },
        },
        {
          resize: {
            width: variant.size,
            height: variant.size,
          },
        },
      ],
      {
        compress: variant.quality,
        format: ImageManipulator.SaveFormat.WEBP,
      }
    );

    return {
      uri: processed.uri,
      width: processed.width,
      height: processed.height,
      mimeType: variant.mimeType,
    };
  };

  const createPreviewImage = async (imageAsset) => {
    const preview = await createSquareImageVariant(imageAsset, PREVIEW_VARIANT);

    return {
      ...preview,
      originalAsset: imageAsset,
    };
  };

  const createPostImageVariants = async (imageAsset) => {
    const thumbnail = await createSquareImageVariant(imageAsset, IMAGE_VARIANTS.thumbnail);

    return { thumbnail };
  };

  const validateSelectedTags = () => {
    return Array.isArray(selectedTags) && selectedTags.length > 0;
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

      const workGender = userContext?.userData?.workGender || "";
      const visibleBarberTags = getVisibleTagsByWorkGender(tags, workGender);

      setUserData(userContext?.userData || null);
      setAllowedTags(visibleBarberTags);
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

      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert("Permission required", "Permission to access the media library is required.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (result.canceled) {
        return;
      }

      const pickedImage = result.assets[0];
      const preview = await createPreviewImage(pickedImage);

      setSelectedImage(pickedImage);
      setPreviewImage(preview);
    } catch (error) {
      console.error("Error preparing selected image:", error);
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

  const handleWorkCategoryChange = (category) => {
    setWorkCategory(category);
    setSelectedTags([]);
  };

  const handlePublishPost = async () => {
    if (!auth.currentUser?.uid) {
      Alert.alert(t("PostScreen.errorTitle"), t("PostScreen.mustBeLoggedIn"));
      return;
    }

    if (!selectedImage?.uri) {
      Alert.alert(t("PostScreen.validationTitle"), t("PostScreen.selectImageValidation"));
      return;
    }

    if (isUnisexUser && !workCategory) {
      Alert.alert(
        t("PostScreen.validationTitle"),
        t("PostScreen.selectWorkCategoryValidation")
      );
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

      const postRef = doc(collection(db, "posts"));
      const postId = postRef.id;
      const localizedSelectedTags = buildLocalizedSelectedTags(
        selectedTags,
        visibleTags
      );
      const { thumbnail } = await createPostImageVariants(selectedImage);

      const [thumbnailUrl, currentUser] = await Promise.all([
        uploadToStorage(
          thumbnail.uri,
          `posts/${postId}/${IMAGE_VARIANTS.thumbnail.fileName}`,
          IMAGE_VARIANTS.thumbnail.mimeType
        ),
        getCurrentUserData(),
      ]);

      const barberProfile = currentUser?.userData || {};
      const createdAt = serverTimestamp();
      const postDoc = {
        postId,
        barberId: auth.currentUser.uid,
        photoGender: isUnisexUser ? workCategory : userData.workGender,
        selectedTags: localizedSelectedTags,
        imageUrl: thumbnailUrl,
        thumbnailUrl,
        likeCount: 0,
        likes: [],
        createdAt,
        barberName:
          barberProfile.salonName ||
          "",
        barberProfileImage: barberProfile.profileImageThumbnail || barberProfile.profileImage || null,
      };

      // return console.log(JSON.stringify(postDoc, null, 2))
      await setDoc(postRef, postDoc);

      setSelectedImage(null);
      setPreviewImage(null);
      setSelectedTags([]);
      setWorkCategory("");

      show(t("PostScreen.postPreparedSuccess"))
      // Alert.alert(t("PostScreen.successTitle"), t("PostScreen.postPreparedSuccess"));
    } catch (error) {
      console.error("Error publishing post:", error);
      Alert.alert(t("PostScreen.errorTitle"), t("PostScreen.preparePostError"));
    } finally {
      setPublishing(false);
    }
  };


  const uploadToStorage = async (uri, storagePath, contentType) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const storage = getStorage();
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, blob, {
        cacheControl: 'public, max-age=31536000',
        contentType,
      });

      return await new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Upload: ${progress}%`);
          },
          (error) => {
            console.error('Upload failed:', error);
            Alert.alert('Oops', 'Upload failed, check connection.');
            reject(error);
          },
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('Done! URL:', url);
            resolve(url);
          }
        );
      });
    } catch (error) {
      console.error(error);
      throw error;
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
        <Text onPress={() => {

        }} style={styles.title}>{t("Navigation.add")}</Text>

        <TouchableOpacity
          onPress={handlePickImage}
          style={styles.imagePicker}
          disabled={processingImage || publishing}
        >
          {processingImage ? (
            <ActivityIndicator size="small" color="#00BCD4" />
          ) : previewImage?.uri ? (
            <Image source={{ uri: previewImage.uri }} style={styles.previewImage} />
          ) : (
            <Text style={styles.imagePickerText}>{t("PostScreen.selectImageFromGallery")}</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>{t("PostScreen.selectTagsTitle")}</Text>
        {isUnisexUser && (
          <>
            <Text style={styles.sectionSubtitle}>
              {t("PostScreen.selectWorkCategorySubtitle")}
            </Text>
            <View style={styles.workCategoryContainer}>
              <TouchableOpacity
                style={[
                  styles.workCategoryButton,
                  workCategory === "male" && styles.workCategoryButtonActive,
                ]}
                onPress={() => handleWorkCategoryChange("male")}
                disabled={publishing}
              >
                <Text
                  style={[
                    styles.workCategoryButtonText,
                    workCategory === "male" && styles.workCategoryButtonTextActive,
                  ]}
                >
                  {t("BarberRegistrationScreen.workGenderMale")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.workCategoryButton,
                  workCategory === "female" && styles.workCategoryButtonActive,
                ]}
                onPress={() => handleWorkCategoryChange("female")}
                disabled={publishing}
              >
                <Text
                  style={[
                    styles.workCategoryButtonText,
                    workCategory === "female" && styles.workCategoryButtonTextActive,
                  ]}
                >
                  {t("BarberRegistrationScreen.workGenderFemale")}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        <Text style={styles.sectionSubtitle}>
          {isUnisexUser && !workCategory
            ? t("PostScreen.selectWorkCategoryValidation")
            : t("PostScreen.selectTagsSubtitle")}
        </Text>
        <View style={styles.tagsContainer}>
          {visibleTags.map((tag) => {
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
  workCategoryContainer: {
    marginTop: 8,
    marginBottom: 8,
    flexDirection: "row",
    gap: 10,
  },
  workCategoryButton: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  workCategoryButtonActive: {
    borderColor: "#00BCD4",
    backgroundColor: "rgba(0, 188, 212, 0.12)",
  },
  workCategoryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
  workCategoryButtonTextActive: {
    color: "#0891b2",
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
