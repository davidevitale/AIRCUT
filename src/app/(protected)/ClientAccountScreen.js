import React, { useState, useEffect } from 'react';
import { router } from 'expo-router';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { logoutUser, getCurrentUserData } from '../../services/authService';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import LanguageToggle from '../../components/LanguageToggle';
import { SafeAreaView } from 'react-native-safe-area-context'

export default function ClientAccountScreen({ userData: propUserData, onLogout, navigate }) {
  const { t, i18n } = useTranslation();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tagsById, setTagsById] = useState({});

  useEffect(() => {
    if (propUserData) {
      setUserData(propUserData);
      setLoading(false);
    } else {
      loadUserData();
    }
  }, [propUserData]);

  useEffect(() => {
    loadTags();
  }, []);

  const loadUserData = async () => {
    try {
      const data = await getCurrentUserData();
      if (data && data.role === 'client') {
        setUserData(data.userData);
      }
    } catch (error) {
      console.error('Errore nel caricamento dati:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const tagsSnapshot = await getDocs(collection(db, 'tags'));
      const mappedTags = tagsSnapshot.docs.reduce((acc, tagDoc) => {
        acc[tagDoc.id] = {
          id: tagDoc.id,
          ...tagDoc.data(),
        };
        return acc;
      }, {});

      setTagsById(mappedTags);
    } catch (error) {
      console.error('Errore nel caricamento tag:', error);
    }
  };

  const getLocalizedTagLabel = (tag) => {
    if (!tag) {
      return '';
    }

    if (typeof tag === 'string') {
      const tagFromCollection = tagsById[tag];
      if (tagFromCollection) {
        return getLocalizedTagLabel(tagFromCollection);
      }
      return tag;
    }

    const label = tag.label || tag;
    if (typeof label === 'string') {
      return label;
    }

    return i18n.language === 'en-UK'
      ? label.en ?? label.it ?? tag.id ?? ''
      : label.it ?? label.en ?? tag.id ?? '';
  };

  const preferenceTags = Array.isArray(userData?.preferenceCut)
    ? userData.preferenceCut.map(getLocalizedTagLabel).filter(Boolean)
    : [];

  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const closeMenu = () => setMenuOpen(false);

  const goToEditProfile = () => {
    router.push('/(protected)/EditClientProfileScreen');
  };

  const handleLogout = async () => {
    Alert.alert(
      t('ClientAccountScreen.logoutTitle'),
      t('ClientAccountScreen.logoutMessage'),
      [
        { text: t('ClientAccountScreen.cancel'), style: 'cancel' },
        {
          text: t('ClientAccountScreen.logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              await logoutUser();
              if (typeof onLogout === 'function') {
                onLogout();
              }
            } catch (error) {
              Alert.alert(t('ClientAccountScreen.errorTitle'), t('ClientAccountScreen.logoutError'));
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('ClientAccountScreen.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const profileInitial = userData?.nomeUtente?.charAt(0)?.toUpperCase() || t('ClientAccountScreen.defaultInitial');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={toggleMenu}
              style={styles.menuButton}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
            </TouchableOpacity>

            <View style={styles.headerContent}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileInitial}>{profileInitial}</Text>
              </View>

              <View style={styles.userInfo}>
                <Text style={styles.welcomeText}>{userData?.nomeUtente || t('ClientAccountScreen.client')}</Text>
                <Text style={styles.roleText}>{t('ClientAccountScreen.clientAccount')}</Text>
              </View>
            </View>
          </View>
          {menuOpen && (
            <View style={styles.menuPortal} pointerEvents="box-none">
              <TouchableOpacity style={styles.menuOverlay} onPress={closeMenu} />
              <View style={styles.menuContainer}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    closeMenu();
                    goToEditProfile();
                  }}
                >
                  <Text style={styles.menuItemText}>{t('ClientAccountScreen.editProfile')}</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <View style={styles.menuToggleRow}>
                  <Text style={styles.menuItemText}>{t('language')}</Text>
                  <View style={styles.menuToggleControl}>
                    <LanguageToggle />
                  </View>
                </View>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('ClientAccountScreen.yourData')}</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('ClientAccountScreen.email')}</Text>
              <Text style={styles.infoValue}>{userData?.email}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('ClientAccountScreen.gender')}</Text>
              <Text style={styles.infoValue}>
                {userData?.sesso === 'M' ? t('ClientAccountScreen.male') : t('ClientAccountScreen.female')}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('ClientAccountScreen.yourPreferences')}</Text>

            {preferenceTags.length > 0 && (
              <>
                <Text style={styles.infoLabel}>{t('ClientAccountScreen.favoriteCuts')}</Text>
                <View style={styles.tagsContainer}>
                  {preferenceTags.map((tagLabel, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tagLabel}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}> {t('ClientAccountScreen.logout')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  backgroundBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    position: 'relative',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  header: {
    position: 'relative',
    backgroundColor: 'white',
    borderRadius: 0,
    padding: 25,
    marginBottom: 20,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 5,
  },
  menuButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 40,
    elevation: 40,
  },
  menuLine: {
    width: 24,
    height: 2.5,
    backgroundColor: '#0f172a',
    marginVertical: 3,
    borderRadius: 2,
  },
  menuPortal: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  menuContainer: {
    position: 'absolute',
    top: 40,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 18,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    zIndex: 110,
    elevation: 110,
    overflow: 'visible',
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemText: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: 4,
  },
  menuToggleRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  menuToggleControl: {
    zIndex: 2,
    elevation: 2,
    marginLeft: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 48,
    width: '100%',
  },
  profileAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0, 188, 212, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#00BCD4',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
    flexShrink: 0,
  },
  profileInitial: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  roleText: {
    fontSize: 15,
    color: '#00BCD4',
    fontWeight: '500',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 5,
    padding: 16,
    marginBottom: 15,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 15,
    color: '#666',
    flex: 1,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#00BCD4',
    fontSize: 14,
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.25)',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  logoutBlur: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  logoutButtonText: {
    color: '#FF6B6B',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
