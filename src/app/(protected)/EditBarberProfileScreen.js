import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { TextInput } from "react-native-paper";
import { Formik } from "formik";
import * as Yup from "yup";
import * as WebBrowser from "expo-web-browser";
import * as ImageManipulator from "expo-image-manipulator";
import { getDownloadURL, getStorage, ref, uploadBytesResumable } from "firebase/storage";
import { Image } from "expo-image";

import { auth } from "../../../config/firebase";
import { LEGAL_URLS } from "../../../config/legal";
import { getCurrentUserData } from "../../services/userService";
import { updateBarberPortfolio } from "../../services/barberService";
import { checkBarberNicknameUniqueness } from "../../services/authService";
import { pickImages } from "../../services/mediaService";

// M4 §4.3 — Edit Profile barbiere brandizzato (no form nativi), Formik + Yup,
// campi reali nickName / salonName / website / telephone, avatar privato
// (solo proprietario, riusa il flusso immagini esistente), link legali via WebBrowser.
export default function EditBarberProfileScreen() {
  const { t } = useTranslation();
  const currentUser = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialValues, setInitialValues] = useState({
    nickName: "",
    salonName: "",
    website: "",
    telephone: "",
  });
  const [profileImage, setProfileImage] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCurrentUserData();
        const ud = data?.userData || {};
        setInitialValues({
          nickName: ud.nickName || "",
          salonName: ud.salonName || "",
          website: ud.website || "",
          telephone: ud.telephone || "",
        });
        setProfileImage(ud.profileImageThumbnail || ud.profileImage || null);
      } catch (error) {
        console.error("EditBarberProfileScreen load error:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const validationSchema = Yup.object().shape({
    nickName: Yup.string()
      .trim()
      .min(2, t("editProfile.nicknameValidation"))
      .required(t("editProfile.required")),
    salonName: Yup.string()
      .trim()
      .min(2, t("editProfile.salonNameValidation"))
      .required(t("editProfile.required")),
    website: Yup.string().trim().url(t("editProfile.websiteValidation")).nullable(),
    telephone: Yup.string().trim().nullable(),
  });

  // Riusa lo stesso flusso avatar di BarberAccountScreen (resize/compress invariati, D4).
  const createThumbnail = async (uri) => {
    const processed = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 400 } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.WEBP },
    );
    return processed.uri;
  };

  const uploadAvatar = async (uri, userId) => {
    const thumbnailUri = await createThumbnail(uri);
    const response = await fetch(thumbnailUri);
    const blob = await response.blob();
    const storage = getStorage();
    const storageRef = ref(storage, `profile/${userId}/thumbnail.webp`);
    const uploadTask = uploadBytesResumable(storageRef, blob, {
      cacheControl: "public, max-age=31536000",
      contentType: "image/webp",
    });
    return await new Promise((resolve, reject) => {
      uploadTask.on("state_changed", null, reject, async () => {
        resolve(await getDownloadURL(uploadTask.snapshot.ref));
      });
    });
  };

  const handlePickAvatar = async () => {
    try {
      if (!currentUser) return;
      const images = await pickImages(false);
      if (!images || images.length === 0) return;
      setUploadingAvatar(true);
      const picked = images[0];
      setProfileImage(picked.uri); // anteprima locale immediata

      const url = await uploadAvatar(picked.uri, currentUser.uid);
      // Scrive solo sul PROPRIO documento (coerente con isOwner, D1).
      await updateBarberPortfolio(currentUser.uid, {
        profileImage: url,
        profileImageThumbnail: url,
      });
      setProfileImage(url);
      Alert.alert(t("editProfile.successTitle"), t("editProfile.avatarUpdated"));
    } catch (error) {
      console.error("handlePickAvatar error:", error);
      Alert.alert(t("editProfile.errorTitle"), t("editProfile.avatarError"));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async (values) => {
    if (!currentUser) return;
    setSaving(true);
    try {
      const nextNick = values.nickName.trim();
      // Unicità nickname se cambiato (M4 §2.1).
      if (nextNick.toLowerCase() !== (initialValues.nickName || "").toLowerCase()) {
        const isUnique = await checkBarberNicknameUniqueness(nextNick);
        if (!isUnique) {
          setSaving(false);
          Alert.alert(t("editProfile.errorTitle"), t("editProfile.nicknameTaken"));
          return;
        }
      }

      await updateBarberPortfolio(currentUser.uid, {
        nickName: nextNick,
        salonName: values.salonName.trim(),
        website: values.website ? values.website.trim() : "",
        telephone: values.telephone ? values.telephone.trim() : "",
        updatedAt: new Date().toISOString(),
      });

      Alert.alert(t("editProfile.successTitle"), t("editProfile.saved"), [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("EditBarberProfileScreen save error:", error);
      Alert.alert(t("editProfile.errorTitle"), t("editProfile.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const openLegal = (url) => WebBrowser.openBrowserAsync(url);

  const paperProps = {
    mode: "outlined",
    outlineColor: "rgba(0, 188, 212, 0.2)",
    activeOutlineColor: "#00BCD4",
    textColor: "#0f172a",
    style: styles.input,
    outlineStyle: { borderRadius: 14 },
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00BCD4" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>{"<"}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t("editProfile.title")}</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Avatar (privato, solo proprietario) */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={handlePickAvatar}
            disabled={uploadingAvatar}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatar} cachePolicy="memory-disk" />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {(initialValues.nickName || initialValues.salonName || "S").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Text style={styles.avatarBadgeText}>{uploadingAvatar ? "··" : "+"}</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>{t("editProfile.changeAvatar")}</Text>
        </View>

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          enableReinitialize
          onSubmit={handleSave}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
            <View style={styles.formCard}>
              <FieldBlock error={touched.nickName && errors.nickName}>
                <TextInput
                  {...paperProps}
                  label={t("editProfile.nickname")}
                  value={values.nickName}
                  onChangeText={handleChange("nickName")}
                  onBlur={handleBlur("nickName")}
                  autoCapitalize="none"
                />
              </FieldBlock>

              <FieldBlock error={touched.salonName && errors.salonName}>
                <TextInput
                  {...paperProps}
                  label={t("editProfile.salonName")}
                  value={values.salonName}
                  onChangeText={handleChange("salonName")}
                  onBlur={handleBlur("salonName")}
                />
              </FieldBlock>

              <FieldBlock error={touched.website && errors.website}>
                <TextInput
                  {...paperProps}
                  label={t("editProfile.website")}
                  value={values.website}
                  onChangeText={handleChange("website")}
                  onBlur={handleBlur("website")}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </FieldBlock>

              <FieldBlock error={touched.telephone && errors.telephone}>
                <TextInput
                  {...paperProps}
                  label={t("editProfile.phone")}
                  value={values.telephone}
                  onChangeText={handleChange("telephone")}
                  onBlur={handleBlur("telephone")}
                  keyboardType="phone-pad"
                />
              </FieldBlock>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSubmit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#00BCD4" />
                ) : (
                  <Text style={styles.saveButtonText}>{t("editProfile.save")}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </Formik>

        {/* Link legali (M4 §4.3) */}
        <View style={styles.legalCard}>
          <TouchableOpacity
            style={styles.legalLink}
            onPress={() => openLegal(LEGAL_URLS.privacyPolicy)}
          >
            <Text style={styles.legalLinkText}>{t("editProfile.privacyPolicy")}</Text>
          </TouchableOpacity>
          <View style={styles.legalDivider} />
          <TouchableOpacity
            style={styles.legalLink}
            onPress={() => openLegal(LEGAL_URLS.termsOfService)}
          >
            <Text style={styles.legalLinkText}>{t("editProfile.terms")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const FieldBlock = ({ error, children }) => (
  <View style={styles.fieldBlock}>
    {children}
    <Text style={[styles.errorText, { display: error ? "flex" : "none" }]}>
      {typeof error === "string" ? error : " "}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { paddingHorizontal: 20, paddingVertical: 24 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(0, 188, 212, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: { fontSize: 20, color: "#00BCD4", fontWeight: "bold" },
  title: { fontSize: 22, fontWeight: "bold", color: "#00BCD4", flex: 1, textAlign: "center" },
  avatarSection: { alignItems: "center", marginBottom: 24 },
  avatarWrapper: { position: "relative" },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#F0F0F0" },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(0, 188, 212, 0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholderText: { fontSize: 36, fontWeight: "bold", color: "#fff" },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 188, 212, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarBadgeText: { color: "#fff", fontSize: 18, fontWeight: "bold", lineHeight: 20 },
  avatarHint: { marginTop: 10, fontSize: 13, color: "#64748b" },
  formCard: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 188, 212, 0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  fieldBlock: { marginBottom: 6 },
  input: { backgroundColor: "#ffffff", fontSize: 14 },
  errorText: { color: "red", fontSize: 12, marginBottom: 6, marginTop: 2 },
  saveButton: {
    backgroundColor: "rgba(0, 188, 212, 0.35)",
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: "rgba(0, 188, 212, 0.7)",
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: "#00BCD4", fontSize: 17, fontWeight: "bold" },
  legalCard: {
    marginTop: 24,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 188, 212, 0.12)",
    overflow: "hidden",
  },
  legalLink: { paddingVertical: 16, paddingHorizontal: 18 },
  legalLinkText: { fontSize: 15, color: "#00BCD4", fontWeight: "600" },
  legalDivider: { height: 1, backgroundColor: "#eef2f6" },
});
