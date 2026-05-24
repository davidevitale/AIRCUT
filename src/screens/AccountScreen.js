import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { logoutUser } from '../services/authService';
import { Image } from "expo-image";

const logoAccount = require('../../assets/icons8-user-96.png');

const AccountScreen = ({ onLogout }) => {

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
              if (onLogout) onLogout();
            } catch (error) {
              Alert.alert('Errore', 'Impossibile disconnettersi');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.emptyState}>
        <Image source={logoAccount} style={styles.emptyIcon} />
        <Text style={styles.emptyTitle}>Il tuo profilo</Text>
        <Text style={styles.emptyDescription}>
          Gestisci il tuo account, impostazioni e preferenze
        </Text>

        {/* Pulsante di logout temporaneo */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}> Disconnetti</Text>
        </TouchableOpacity>

        <Text style={styles.debugText}>
          DEBUG: Se vedi questa schermata, il sistema non ha riconosciuto il tuo ruolo
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyIcon: {
    width: 40,
    height: 40,
    marginBottom: 20,
    resizeMode: 'contain',
    tintColor: '#00BCD4',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 30,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  debugText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
});

export default AccountScreen;
