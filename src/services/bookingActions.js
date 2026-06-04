import { Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";

// ============================================================================
// Azione condivisa BOOK NOW (M4 D2 / §4.1 / §4.4)
// ----------------------------------------------------------------------------
// - Apre il `website` del barbiere via WebBrowser.openBrowserAsync (in-app).
// - Fallback: se manca website ma c'è il telefono → Linking.openURL('tel:...').
// - Se mancano entrambi → no-op (il chiamante disabilita il bottone).
// I nomi campo reali sul documento barbiere sono `website` e `telephone`
// (verificati in authService.registerBarber). Accettiamo anche alias legacy.
// ============================================================================

export const getBookingTargets = (barber = {}) => {
  const website =
    barber.website || barber.sitoWeb || barber.websiteUrl || "";
  const phone =
    barber.telephone || barber.phone || barber.telefono || barber.phoneNumber || "";
  return {
    website: typeof website === "string" ? website.trim() : "",
    phone: typeof phone === "string" ? phone.trim() : "",
  };
};

export const canBookNow = (barber = {}) => {
  const { website, phone } = getBookingTargets(barber);
  return !!(website || phone);
};

const normalizeUrl = (url) => {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
};

export const openBookNow = async (barber = {}) => {
  const { website, phone } = getBookingTargets(barber);

  if (website) {
    try {
      await WebBrowser.openBrowserAsync(normalizeUrl(website));
      return true;
    } catch (error) {
      console.warn("openBookNow: errore apertura website:", error?.message);
    }
  }

  if (phone) {
    try {
      await Linking.openURL(`tel:${phone}`);
      return true;
    } catch (error) {
      console.warn("openBookNow: errore apertura telefono:", error?.message);
    }
  }

  return false;
};
