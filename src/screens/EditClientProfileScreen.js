import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import {
  updateUserProfile,
  updateUserEmail,
  updateUserPassword,
  sendPasswordResetEmailToUser,
  getUserProfileData
} from '../services/authService';
import { auth } from '../../config/firebase';

export default function EditClientProfileScreen({ userData, onGoBack }) {
  const userId = userData?.id || auth.currentUser?.uid;
  const currentUserData = userData;

  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    email: '',
    telefono: '',
    username: '',
    citta: '',
    provincia: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showEmailSection, setShowEmailSection] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const userData = await getUserProfileData(userId);
      setFormData({
        nome: userData.nome || '',
        cognome: userData.cognome || '',
        email: userData.email || '',
        telefono: userData.telefono || '',
        username: userData.username || '',
        citta: userData.citta || '',
        provincia: userData.provincia || ''
      });
    } catch (error) {
      Alert.alert('Errore', 'Impossibile caricare i dati del profilo');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);

      // Validazione base
      if (!formData.nome.trim() || !formData.cognome.trim() || !formData.username.trim()) {
        Alert.alert('Errore', 'Nome, cognome e username sono obbligatori');
        return;
      }

      await updateUserProfile(userId, formData);
      Alert.alert('Successo', 'Profilo aggiornato con successo', [
        { text: 'OK', onPress: () => onGoBack() }
      ]);
    } catch (error) {
      Alert.alert('Errore', error.message || 'Errore durante l\'aggiornamento del profilo');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    try {
      if (!passwordData.currentPassword) {
        Alert.alert('Errore', 'Inserisci la password attuale per cambiare email');
        return;
      }

      setLoading(true);
      await updateUserEmail(passwordData.currentPassword, formData.email);

      Alert.alert('Successo', 'Email aggiornata con successo');
      setShowEmailSection(false);
      setPasswordData({ ...passwordData, currentPassword: '' });
    } catch (error) {
      Alert.alert('Errore', error.message || 'Errore durante l\'aggiornamento dell\'email');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    try {
      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        Alert.alert('Errore', 'Compila tutti i campi password');
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        Alert.alert('Errore', 'Le nuove password non corrispondono');
        return;
      }

      if (passwordData.newPassword.length < 6) {
        Alert.alert('Errore', 'La password deve essere di almeno 6 caratteri');
        return;
      }

      setLoading(true);
      await updateUserPassword(passwordData.currentPassword, passwordData.newPassword);

      Alert.alert('Successo', 'Password aggiornata con successo');
      setShowPasswordSection(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      Alert.alert('Errore', error.message || 'Errore durante l\'aggiornamento della password');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    Alert.alert(
      'Reset Password',
      'Vuoi ricevere un\'email per resettare la password?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Invia Email',
          onPress: async () => {
            try {
              setLoading(true);
              await sendPasswordResetEmailToUser(formData.email);
              Alert.alert('Successo', 'Email di reset inviata. Controlla la tua casella di posta.');
            } catch (error) {
              Alert.alert('Errore', error.message || 'Errore durante l\'invio dell\'email');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updatePasswordField = (field, value) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00BCD4" />
        <Text style={styles.loadingText}>Caricamento...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => onGoBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Dati Personali */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dati Personali</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nome *</Text>
            <TextInput
              style={styles.input}
              value={formData.nome}
              onChangeText={(value) => updateField('nome', value)}
              placeholder="Il tuo nome"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Cognome *</Text>
            <TextInput
              style={styles.input}
              value={formData.cognome}
              onChangeText={(value) => updateField('cognome', value)}
              placeholder="Il tuo cognome"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username *</Text>
            <TextInput
              style={styles.input}
              value={formData.username}
              onChangeText={(value) => updateField('Nome Utente', value)}
              placeholder="Nome utente"
            />
          </View>

          {/*<View style={styles.inputContainer}>
            <Text style={styles.label}>Telefono</Text>
            <TextInput
              style={styles.input}
              value={formData.telefono}
              onChangeText={(value) => updateField('telefono', value)}
              placeholder="Numero di telefono"
              keyboardType="phone-pad"
            />
          </View>*/}

          {/*<View style={styles.inputContainer}>
            <Text style={styles.label}>Città</Text>
            <TextInput
              style={styles.input}
              value={formData.citta}
              onChangeText={(value) => updateField('citta', value)}
              placeholder="La tua città"
            />
          </View>*/}

          {/*<View style={styles.inputContainer}>
            <Text style={styles.label}>Provincia</Text>
            <TextInput
              style={styles.input}
              value={formData.provincia}
              onChangeText={(value) => updateField('provincia', value)}
              placeholder="La tua provincia"
            />
          </View>*/}

          <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
            <Text style={styles.saveButtonText}>Salva Modifiche</Text>
          </TouchableOpacity>
        </View>

        {/* Gestione Email */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Attuale</Text>
            <View style={styles.emailRow}>
              <TextInput
                style={[styles.input, styles.emailInput]}
                value={formData.email}
                onChangeText={(value) => updateField('email', value)}
                placeholder="La tua email"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={showEmailSection}
              />
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setShowEmailSection(!showEmailSection)}
              >
                <Text style={styles.editButtonText}>
                  {showEmailSection ? 'Chiudi' : 'Modifica'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {showEmailSection && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password Attuale (per conferma) *</Text>
                <TextInput
                  style={styles.input}
                  value={passwordData.currentPassword}
                  onChangeText={(value) => updatePasswordField('currentPassword', value)}
                  placeholder="Password attuale"
                  secureTextEntry
                />
              </View>

              <TouchableOpacity style={styles.updateButton} onPress={handleUpdateEmail}>
                <Text style={styles.updateButtonText}>Aggiorna Email</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Gestione Password */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sicurezza</Text>

          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setShowPasswordSection(!showPasswordSection)}
          >
            <Text style={styles.toggleButtonText}>
              {showPasswordSection ? 'Nascondi' : 'Cambia Password'}
            </Text>
          </TouchableOpacity>

          {showPasswordSection && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password Attuale *</Text>
                <TextInput
                  style={styles.input}
                  value={passwordData.currentPassword}
                  onChangeText={(value) => updatePasswordField('currentPassword', value)}
                  placeholder="Password attuale"
                  secureTextEntry
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Nuova Password *</Text>
                <TextInput
                  style={styles.input}
                  value={passwordData.newPassword}
                  onChangeText={(value) => updatePasswordField('newPassword', value)}
                  placeholder="Nuova password (min. 6 caratteri)"
                  secureTextEntry
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Conferma Nuova Password *</Text>
                <TextInput
                  style={styles.input}
                  value={passwordData.confirmPassword}
                  onChangeText={(value) => updatePasswordField('confirmPassword', value)}
                  placeholder="Conferma nuova password"
                  secureTextEntry
                />
              </View>

              <TouchableOpacity style={styles.updateButton} onPress={handleUpdatePassword}>
                <Text style={styles.updateButtonText}>Cambia Password</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.resetButton} onPress={handlePasswordReset}>
            <Text style={styles.resetButtonText}>Invia Email Reset Password</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'transparent',
    paddingTop: 50,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  backText: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 0,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 188, 212, 0.3)',
    paddingBottom: 12,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(248, 248, 248, 0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 188, 212, 0.2)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emailInput: {
    flex: 1,
    marginRight: 12,
  },
  editButton: {
    backgroundColor: 'rgba(0, 188, 212, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 188, 212, 0.5)',
  },
  editButtonText: {
    fontSize: 14,
    color: '#00BCD4',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: 'rgba(0, 188, 212, 0.35)',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 188, 212, 0.7)',
    shadowColor: '#00BCD4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonText: {
    color: '#00BCD4',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleButton: {
    backgroundColor: 'rgba(248, 248, 248, 0.6)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 188, 212, 0.2)',
  },
  toggleButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  updateButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(76, 175, 80, 0.5)',
  },
  updateButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: 'rgba(255, 152, 0, 0.3)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 152, 0, 0.5)',
  },
  resetButtonText: {
    color: '#FF9800',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 30,
  },
});
