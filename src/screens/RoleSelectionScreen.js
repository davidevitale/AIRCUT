import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

export default function RoleSelectionScreen({ onRoleSelected }) {
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
      onRoleSelected(role);
    }, 200);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Brand */}
        <View style={styles.brandContainer}>
          <Text style={styles.brandText}>aircut</Text>
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
                <Text style={styles.cardTitle}>Cliente</Text>
                <Text style={styles.cardDescription}>
                  Scopri i migliori Hair Artist
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
                <Text style={styles.cardTitle}>Hair Artist</Text>
                <Text style={styles.cardDescription}>Trova nuovi clienti</Text>
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
