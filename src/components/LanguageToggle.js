import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";

const ENGLISH = "en-UK";
const ITALIAN = "it-IT";

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === ENGLISH;

  const rotation = useSharedValue(isEnglish ? 0 : 180);

  useEffect(() => {
    rotation.value = withSpring(isEnglish ? 0 : 180, {
      stiffness: 800,
      damping: 30,
    });
  }, [isEnglish, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const toggleLanguage = async () => {
    const nextLanguage = isEnglish ? ITALIAN : ENGLISH;
    await AsyncStorage.setItem("language", nextLanguage);
    await i18n.changeLanguage(nextLanguage);
  };

  return (
    <Pressable
      onPress={toggleLanguage}
      style={({ pressed }) => [
        styles.button,
        {
          opacity: pressed ? 0.8 : 1,
          backgroundColor: isEnglish ? "#e5e5e5" : "#262626",
        },
      ]}
      accessibilityLabel="Toggle language"
    >
      <Animated.View style={[styles.labelWrapper, animatedStyle]}>
        <Text style={[styles.label, { color: isEnglish ? "#000" : "#fff" }]}>
          {isEnglish ? "EN" : "IT"}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  labelWrapper: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
});
