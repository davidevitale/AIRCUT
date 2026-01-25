import { StatusBar } from "expo-status-bar";
import React, { useState, useEffect } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  onAuthStateChange,
  logoutUser,
  getCurrentUserData,
} from "./src/services/authService";
import "./src/i18n"; // i18n configuration

// Import components
import Header from "./components/Header";
import BarberPost from "./components/BarberPost";
import BottomNavigation from "./components/BottomNavigation";
import SplashScreen from "./components/SplashScreen";
import ConnectionStatus from "./components/ConnectionStatus";

// Import screens
import RoleSelectionScreen from "./src/screens/RoleSelectionScreen";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterClientScreen from "./src/screens/RegisterClientScreen";
import RegisterBarberScreen from "./src/screens/RegisterBarberScreen";
import ClientAccountScreen from "./src/screens/ClientAccountScreen";
import BarberAccountScreen from "./src/screens/BarberAccountScreen";
import EditClientProfileScreen from "./src/screens/EditClientProfileScreen";
import EditBarberProfileScreen from "./src/screens/EditBarberProfileScreen";
import HomeScreen from "./src/screens/HomeScreen";
import LikeScreen from "./src/screens/LikeScreen";
import SearchScreen from "./src/screens/SearchScreen";
import PrenotazioniScreen from "./src/screens/PrenotazioniScreen";
import GiftScreen from "./src/screens/GiftScreen";
import AccountScreen from "./src/screens/AccountScreen";
import BarberProfileScreen from "./src/screens/BarberProfileScreen";
import ShopScreen from "./src/screens/ShopScreen";

// Funzione per renderizzare la schermata attiva
const renderActiveScreen = (
  activeTab,
  userRole,
  userData,
  handleLogout,
  isLoggedIn,
  checkUserRole,
  setActiveTab,
  setViewingProfile,
  viewingProfile,
  setSearchHashtag,
  searchHashtag,
  editingProfile,
  navigate,
  goBackFromEdit,
) => {
  console.log("renderActiveScreen called with:", {
    activeTab,
    userRole,
    userData,
    editingProfile,
  });

  // Funzione wrapper per il view profile con logging
  const handleViewProfile = (barberName) => {
    console.log(
      "App.js: handleViewProfile called with barberName:",
      barberName,
    );
    setViewingProfile(barberName);
  };

  // Funzione per gestire la ricerca hashtag
  const handleHashtagPress = (hashtag) => {
    console.log("App.js: handleHashtagPress called with hashtag:", hashtag);
    setSearchHashtag(hashtag);
    setActiveTab("search");
  };

  // Se stiamo modificando un profilo, mostra la schermata di edit appropriata
  if (editingProfile) {
    console.log("App.js: Showing edit profile screen for:", editingProfile);
    if (editingProfile === "client") {
      return (
        <EditClientProfileScreen
          userData={userData}
          onGoBack={goBackFromEdit}
        />
      );
    } else if (editingProfile === "barber") {
      return (
        <EditBarberProfileScreen
          userData={userData}
          onGoBack={goBackFromEdit}
        />
      );
    }
  }

  // Se stiamo visualizzando un profilo parrucchiere
  if (viewingProfile) {
    console.log(
      "App.js: Showing BarberProfileScreen for barberName:",
      viewingProfile,
    );
    return (
      <BarberProfileScreen
        barberName={viewingProfile}
        onGoBack={() => setViewingProfile(null)}
      />
    );
  }

  switch (activeTab) {
    case "home":
      return (
        <HomeScreen
          onViewProfile={handleViewProfile}
          onHashtagPress={handleHashtagPress}
        />
      );
    case "like":
      return <LikeScreen />;
    /*case 'search':
      return (
        <SearchScreen 
          onViewProfile={handleViewProfile} 
          initialHashtag={searchHashtag}
        />
      );*/
    case "shop":
      return <ShopScreen />;
    case "prenotazioni":
      return <PrenotazioniScreen />;
    case "gift":
      return <GiftScreen />;
    case "account":
      console.log("Rendering account screen for role:", userRole);
      console.log('userRole === "client"?', userRole === "client");
      console.log('userRole === "barber"?', userRole === "barber");
      console.log("userRole type:", typeof userRole);
      console.log("userData:", userData);

      // Verifica alternativa usando userData se userRole è null
      let effectiveRole = userRole || (userData && userData.role);

      // Se ancora non abbiamo il ruolo, usa il roleCode
      if (!effectiveRole && userData && userData.roleCode !== undefined) {
        effectiveRole = userData.roleCode === 0 ? "client" : "barber";
        console.log(
          "Using roleCode to determine role:",
          userData.roleCode,
          "-> effectiveRole:",
          effectiveRole,
        );
      }

      console.log("effectiveRole:", effectiveRole);

      // Se ancora non abbiamo il ruolo, proviamo a ricontrollare
      if (!effectiveRole && isLoggedIn) {
        console.log("No role found, triggering manual check");
        // Trigger del check manuale
        setTimeout(checkUserRole, 100);
        return <AccountScreen onLogout={handleLogout} />; // Temporaneo mentre carichiamo
      }

      // Mostra account specifico in base al ruolo
      if (effectiveRole === "client") {
        console.log("Returning ClientAccountScreen");
        return (
          <ClientAccountScreen
            userData={userData}
            onLogout={handleLogout}
            navigate={navigate}
          />
        );
      } else if (effectiveRole === "barber") {
        console.log("Returning BarberAccountScreen");
        return (
          <BarberAccountScreen
            userData={userData}
            onLogout={handleLogout}
            navigate={navigate}
          />
        );
      }
      console.log(
        "Returning default AccountScreen because role is:",
        effectiveRole,
      );
      return <AccountScreen onLogout={handleLogout} />;
    default:
      return <HomeScreen />;
  }
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [showRoleSelection, setShowRoleSelection] = useState(false); // Inizia come false
  const [currentScreen, setCurrentScreen] = useState("login");
  const [userRole, setUserRole] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [viewingProfile, setViewingProfile] = useState(null); // ID del parrucchiere di cui stiamo visualizzando il profilo
  const [searchHashtag, setSearchHashtag] = useState(null); // Hashtag da cercare
  const [editingProfile, setEditingProfile] = useState(null); // 'client' o 'barber' se stiamo modificando un profilo

  // Funzione di navigazione personalizzata
  const navigate = (screenName, params = {}) => {
    switch (screenName) {
      case "EditClientProfile":
        setEditingProfile("client");
        break;
      case "EditBarberProfile":
        setEditingProfile("barber");
        break;
      default:
        console.log("Navigation to", screenName, "not implemented");
    }
  };

  // Funzione per tornare indietro dalla modifica profilo
  const goBackFromEdit = () => {
    setEditingProfile(null);
  };

  // Funzione per verificare manualmente il ruolo utente
  const checkUserRole = async () => {
    try {
      const currentUserData = await getCurrentUserData();
      console.log("Manual check - current user data:", currentUserData);
      if (currentUserData) {
        setUserRole(currentUserData.role);
        setUserData(currentUserData.userData);
        console.log(
          "Updated role to:",
          currentUserData.role,
          "with roleCode:",
          currentUserData.roleCode,
        );
      }
    } catch (error) {
      console.error("Error checking user role:", error);
    }
  };

  useEffect(() => {
    // Timeout di sicurezza per evitare blocchi infiniti
    const authTimeout = setTimeout(() => {
      console.warn("Firebase Auth timeout - assuming not logged in");
      setAuthLoading(false);
      setShowRoleSelection(true); // Mostra selezione ruolo solo se timeout
      setIsLoggedIn(false);
    }, 10000); // 10 secondi timeout

    // Observer per lo stato di autenticazione
    const unsubscribe = onAuthStateChange((authData) => {
      clearTimeout(authTimeout); // Cancella il timeout se Firebase risponde
      console.log("AuthState changed:", authData);
      if (authData) {
        // Utente loggato - mantieni loggato
        console.log("User logged in with role:", authData.role);
        setIsLoggedIn(true);
        setUserRole(authData.role);
        setUserData(authData.userData);
        setShowRoleSelection(false); // Non mostrare selezione ruolo
        setCurrentScreen("app"); // Vai direttamente all'app
        setAuthLoading(false);
      } else {
        // Utente non loggato - mostra selezione ruolo
        console.log("User logged out - showing role selection");
        setIsLoggedIn(false);
        setUserRole(null);
        setUserData(null);
        setShowRoleSelection(true); // Ora mostra la selezione ruolo
        setCurrentScreen("login");
        setAuthLoading(false);
      }
    });

    return () => {
      clearTimeout(authTimeout);
      unsubscribe();
    };
  }, []);

  // Verifica il ruolo quando l'app è loggata ma il ruolo è null
  useEffect(() => {
    if (isLoggedIn && !userRole) {
      console.log("User is logged in but no role found, checking manually...");
      checkUserRole();
    }
  }, [isLoggedIn, userRole]);

  // Reset searchHashtag quando si cambia tab (eccetto search)
  useEffect(() => {
    if (activeTab !== "search") {
      setSearchHashtag(null);
    }
  }, [activeTab]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      // Firebase observer gestirà automaticamente il reset dello stato
    } catch (error) {
      console.error("Errore logout:", error);
    }
  };

  // Mostra splash screen
  if (showSplash) {
    console.log("App: Showing splash screen");
    return (
      <SplashScreen
        onFinish={() => {
          console.log("App: Splash screen finished");
          setShowSplash(false);
        }}
      />
    );
  }

  // Mostra loading durante il controllo auth
  if (authLoading) {
    console.log("App: Auth loading, showing splash");
    return <SplashScreen onFinish={() => { }} />;
  }

  // Mostra selezione ruolo se non è ancora stato scelto
  if (showRoleSelection && !isLoggedIn) {
    console.log("App: Showing role selection screen");
    return (
      <RoleSelectionScreen
        onRoleSelected={(role) => {
          console.log("App: Role selected:", role);
          setUserRole(role);
          setShowRoleSelection(false);
          setCurrentScreen("login");
        }}
      />
    );
  }

  // Se non è loggato, mostra le schermate di autenticazione
  if (!isLoggedIn) {
    if (currentScreen === "login") {
      return (
        <LoginScreen
          userRole={userRole}
          onGoToRegister={() => {
            if (userRole === "client") {
              setCurrentScreen("registerClient");
            } else {
              setCurrentScreen("registerBarber");
            }
          }}
        />
      );
    }

    if (currentScreen === "registerClient") {
      return (
        <RegisterClientScreen onGoToLogin={() => setCurrentScreen("login")} />
      );
    }

    if (currentScreen === "registerBarber") {
      return (
        <RegisterBarberScreen onGoToLogin={() => setCurrentScreen("login")} />
      );
    }
  }

  // Mostra app principale se è loggato
  console.log("Rendering main app with:", {
    isLoggedIn,
    userRole,
    userData: !!userData,
  });
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ConnectionStatus />
      {!viewingProfile && !editingProfile && <Header />}
      {renderActiveScreen(
        activeTab,
        userRole,
        userData,
        handleLogout,
        isLoggedIn,
        checkUserRole,
        setActiveTab,
        setViewingProfile,
        viewingProfile,
        setSearchHashtag,
        searchHashtag,
        editingProfile,
        navigate,
        goBackFromEdit,
      )}
      {!viewingProfile && !editingProfile && (
        <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
