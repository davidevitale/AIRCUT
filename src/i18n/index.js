import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import translationEn from "./locales/en-UK/translation.json";
import translationIt from "./locales/it-IT/translation.json";

const resources = {
  "en-UK": { translation: translationEn },
  "it-IT": { translation: translationIt },
};

const initI18n = async () => {
  let savedLanguage = await AsyncStorage.getItem("language");

  if (!savedLanguage) {
    savedLanguage = Localization.locale;
  }

  i18n.use(initReactI18next).init({
    compatibilityJSON: "v3",
    resources,
    lng: savedLanguage,
    fallbackLng: "en-UK",
    interpolation: {
      escapeValue: false,
    },
  });
};

initI18n();

export default i18n;
