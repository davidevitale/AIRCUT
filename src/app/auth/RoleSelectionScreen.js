import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../../config/firebase";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";

const { width, height } = Dimensions.get("window");

export default function RoleSelectionScreen({ }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const scaleAnim = new Animated.Value(1);
  const { t, i18n } = useTranslation();


  const handlePress = (role) => {
    setSelectedRole(role);

    // Animazione di feedback
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Ritardo per mostrare la selezione
    setTimeout(() => {
      router.navigate(`/auth/LoginScreen?role=${role}`);
      // onRoleSelected(role);
    }, 200);
  };
  const changeLanguage = async (lang) => {
    await AsyncStorage.setItem("language", lang);
    i18n.changeLanguage(lang);
  };



  const TAG_LABELS = {
    bob: { en: "Bob", it: "Caschetto" },
    balayage: { en: "Balayage", it: "Balayage" },
    barba: { en: "Beard", it: "Barba" },
    blonde: { en: "Blonde", it: "Biondo" },
    frangia: { en: "Fringe", it: "Frangia" },
    riccio: { en: "Curly", it: "Riccio" },
    liscio: { en: "Straight", it: "Liscio" },
    mosso: { en: "Wavy", it: "Mosso" },
    sposa: { en: "Bride", it: "Sposa" },
    taglio_lungo: { en: "Long Cut", it: "Taglio Lungo" },
    vivid_colors: { en: "Vivid Colors", it: "Colori Vividi" },

    // male_unisex
    afro: { en: "Afro", it: "Afro" },
    burst_fade: { en: "Burst Fade", it: "Burst Fade" },
    edgar_cut: { en: "Edgar Cut", it: "Taglio Edgar" },
    high_fade: { en: "High Fade", it: "Sfumatura Alta" },
    low_fade: { en: "Low Fade", it: "Sfumatura Bassa" },
    mid_fade: { en: "Mid Fade", it: "Sfumatura Media" },
    middle_part: { en: "Middle Part", it: "Riga Centrale" },
    side_part: { en: "Side Part", it: "Riga Laterale" },
    slick_back: { en: "Slick Back", it: "Pettinato Indietro" },
    taper_fade: { en: "Taper Fade", it: "Taper Fade" },
    treccine: { en: "Braids", it: "Treccine" },
  };


  const migrateTagLabelsToMultilang = async () => {
    try {
      const tagsRef = collection(db, "tags");
      const snapshot = await getDocs(tagsRef);

      for (const docSnap of snapshot.docs) {
        const tagId = docSnap.id;
        const translations = TAG_LABELS[tagId];

        if (!translations) {
          console.warn(`⚠️ No translations found for tag: ${tagId}`);
          continue;
        }

        await updateDoc(doc(db, "tags", tagId), {
          label: {
            en: translations.en,
            it: translations.it,
          },
        });

        console.log(`✅ Updated tag: ${tagId}`);
      }

      console.log("🎉 All tags migrated successfully!");
    } catch (error) {
      console.error("❌ Migration failed:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Brand */}
        <View style={styles.brandContainer}>
          <Pressable onPress={() => {
            // migrateTagLabelsToMultilang()
            changeLanguage(i18n.language === "en-UK" ? "it-IT" : "en-UK")
          }}>

            <Text style={styles.brandText}>aircut</Text>
          </Pressable>
          <Text style={styles.subtitle}></Text>
        </View>

        {/* Role Cards */}
        <View style={styles.cardsContainer}>
          {/* Cliente Card */}
          <Animated.View
            style={[styles.card, { transform: [{ scale: scaleAnim }] }]}
          >
            <TouchableOpacity
              style={[
                styles.cardButton,
                selectedRole === "client" && styles.cardButtonSelected,
              ]}
              onPress={() => handlePress("client")}
              activeOpacity={0.8}
            >
              <View style={styles.cardContent}>
                <Text style={styles.cardEmoji}>💇</Text>
                <Text style={styles.cardTitle}>{t("RoleSelection.client")}</Text>
                <Text style={styles.cardDescription}>
                  {t("RoleSelection.discoverBestHairArtists")}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Parrucchiere Card */}
          <Animated.View
            style={[styles.card, { transform: [{ scale: scaleAnim }] }]}
          >
            <TouchableOpacity
              style={[
                styles.cardButton,
                selectedRole === "barber" && styles.cardButtonSelected,
              ]}
              onPress={() => handlePress("barber")}
              activeOpacity={0.8}
            >
              <View style={styles.cardContent}>
                <Text style={styles.cardEmoji}>✂️</Text>
                <Text style={styles.cardTitle}>{t('RoleSelection.hairArtist')}</Text>
                <Text style={styles.cardDescription}>{t('RoleSelection.findNewCustomers')}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: "space-between",
  },
  brandContainer: {
    alignItems: "center",
    marginTop: height * 0.1,
  },
  brandText: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#00BCD4",
    letterSpacing: 2,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#334155",
    textAlign: "center",
    fontWeight: "500",
  },
  cardsContainer: {
    flex: 1,
    justifyContent: "flex-start",
    paddingVertical: 20,
    marginTop: 30,
  },
  card: {
    marginVertical: 15,
  },
  cardButton: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
  cardButtonSelected: {
    borderColor: "rgba(0, 188, 212, 0.5)",
    backgroundColor: "rgba(0, 188, 212, 0.15)",
  },
  cardContent: {
    alignItems: "center",
  },
  cardEmoji: {
    fontSize: 40,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 10,
  },
  cardDescription: {
    fontSize: 14,
    color: "#334155",
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "500",
  },
  footer: {
    alignItems: "center",
    paddingBottom: 30,
  },
  footerText: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    fontWeight: "400",
  },
});
