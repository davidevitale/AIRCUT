import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Image
} from 'react-native';
import { logoutUser } from '../services/authService';
import { getCurrentUserData } from '../services/userService';
import { auth } from '../../config/firebase';

export default function ClientAccountScreen({ userData: propUserData, onLogout, navigate }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    console.log('ClientAccountScreen received userData:', propUserData);
    if (propUserData) {
      setUserData(propUserData);
      setLoading(false);
    } else {
      loadUserData();
    }
  }, [propUserData]);

  const loadUserData = async () => {
    try {
      const data = await getCurrentUserData();
      console.log('Loaded user data from service:', data);
      if (data && data.role === 'client') {
        setUserData(data.userData);
      }
    } catch (error) {
      console.error('Errore nel caricamento dati:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMenu = () => setMenuOpen(prev => !prev);
  const closeMenu = () => setMenuOpen(false);

  const goToEditProfile = () => {
    navigate('EditClientProfile', {
      userId: userData?.id || auth.currentUser?.uid,
      currentUserData: userData
    });
  };

  const handleLogout = async () => {
    Alert.alert(
      'Disconnessione',
      'Sei sicuro di voler uscire?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Esci',
          style: 'destructive',
          onPress: async () => {
            try {
              await logoutUser();
              onLogout();
            } catch (error) {
              Alert.alert('Errore', 'Impossibile disconnettersi');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const profileInitial = userData?.nomeUtente?.charAt(0)?.toUpperCase() || 'C';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>

          {/* Header Account */}
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

            {menuOpen && (
              <>
                <TouchableOpacity style={styles.headerOverlay} onPress={closeMenu} />
                <View style={styles.menuContainer}>
                  <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); goToEditProfile(); }}>
                    <Text style={styles.menuItemText}>Modifica profilo</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <View style={styles.headerContent}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileInitial}>{profileInitial}</Text>
              </View>

              <View style={styles.userInfo}>
                <Text style={styles.welcomeText}>{userData?.nomeUtente || 'Cliente'}</Text>
                <Text style={styles.roleText}>Account Cliente</Text>
              </View>
            </View>
          </View>

          {/* Dati Personali */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>I tuoi dati</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{userData?.email}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Età</Text>
              <Text style={styles.infoValue}>{userData?.eta} anni</Text>
            </View>

            {/*<View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Indirizzo</Text>
              <Text style={styles.infoValue}>{userData?.via}</Text>
            </View>*/}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sesso</Text>
              <Text style={styles.infoValue}>{userData?.sesso === 'M' ? 'Maschio' : 'Femmina'}</Text>
            </View>
          </View>

          {/* Preferenze */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Le tue preferenze</Text>

            {userData?.preferenzaTaglio && userData.preferenzaTaglio.length > 0 && (
              <>
                <Text style={styles.infoLabel}>Tipi di taglio preferiti</Text>
                <View style={styles.tagsContainer}>
                  {userData.preferenzaTaglio.map((taglio, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{taglio}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/*<View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Raggio di ricerca</Text>
              <Text style={styles.infoValue}>{userData?.raggio} km</Text>
            </View>*/}
          </View>

          {/* Azioni rapide 
          <BlurView intensity={24} tint="light" style={styles.section}>
            <Text style={styles.sectionTitle}>Azioni rapide</Text>
            
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>✂️ Prenota un taglio</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>📍 Trova parrucchieri vicini</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>⭐ Le mie recensioni</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigate('EditClientProfile', { 
                userId: userData?.id || auth.currentUser?.uid,
                currentUserData: userData 
              })}
            >
              <Text style={styles.actionButtonText}>⚙️ Modifica profilo</Text>
            </TouchableOpacity>
          </BlurView>*/}

          {/* Logout */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}> Disconnetti</Text>
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

  // Header Card
  header: {
    backgroundColor: 'white',
    borderRadius: 0,
    padding: 25,
    marginBottom: 20,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  menuLine: {
    width: 24,
    height: 2.5,
    backgroundColor: '#0f172a',
    marginVertical: 3,
    borderRadius: 2,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9,
  },
  menuContainer: {
    position: 'absolute',
    top: 50,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 18,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 11,
    overflow: 'hidden',
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

  // Section Card
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

  // Action Buttons
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

  // Logout Button
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
