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
import { auth } from '../../config/firebase'

export default function EditBarberProfileScreen({ userData, onGoBack }) {
  const userId = userData?.id || auth.currentUser?.uid;
  const currentUserData = userData;

  const [formData, setFormData] = useState({
    nomeSalone: '',
    via: '',
    citta: '',
    provincia: '',
    telefono: '',
    email: '',
    emailContatto: '',
    sitoWeb: '',
    nomiDipendenti: '',
    descrizione: '',
    orari: '',
    prezziServizi: [] // Array per i prezzi dei servizi
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showEmailSection, setShowEmailSection] = useState(false);
  const [newService, setNewService] = useState({
    servizio: '',
    descrizione: '',
    prezzo: ''
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const userData = await getUserProfileData(userId);
      setFormData({
        nomeSalone: userData.nomeSalone || '',
        via: userData.via || '',
        citta: userData.citta || '',
        provincia: userData.provincia || '',
        telefono: userData.telefono || '',
        email: userData.email || '',
        emailContatto: userData.emailContatto || '',
        sitoWeb: userData.sitoWeb || '',
        nomiDipendenti: userData.nomiDipendenti || '',
        descrizione: userData.descrizione || '',
        orari: userData.orari || '',
        prezziServizi: userData.prezziServizi || []
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
      if (!formData.nomeSalone.trim() || !formData.via.trim() || !formData.telefono.trim()) {
        Alert.alert('Errore', 'Nome salone, indirizzo e telefono sono obbligatori');
        return;
      }

      await updateUserProfile(userId, { ...formData, userType: 1 });
      Alert.alert('Successo', 'Profilo del salone aggiornato con successo', [
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

  const addService = () => {
    if (!newService.servizio.trim() || !newService.prezzo.trim()) {
      Alert.alert('Errore', 'Nome servizio e prezzo sono obbligatori');
      return;
    }

    const servizio = {
      servizio: newService.servizio.trim(),
      descrizione: newService.descrizione.trim(),
      prezzo: parseFloat(newService.prezzo).toFixed(2)
    };

    setFormData(prev => ({
      ...prev,
      prezziServizi: [...(prev.prezziServizi || []), servizio]
    }));

    setNewService({ servizio: '', descrizione: '', prezzo: '' });
    Alert.alert('Successo', 'Servizio aggiunto! Non dimenticare di salvare le modifiche.');
  };

  const removeService = (index) => {
    Alert.alert(
      'Rimuovi Servizio',
      'Sei sicuro di voler rimuovere questo servizio?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rimuovi',
          style: 'destructive',
          onPress: () => {
            setFormData(prev => ({
              ...prev,
              prezziServizi: prev.prezziServizi.filter((_, i) => i !== index)
            }));
          }
        }
      ]
    );
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
          <Text style={styles.backText}>← Indietro</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modifica Profilo Salone</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Dati Salone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dati del Salone</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nome Salone *</Text>
            <TextInput
              style={styles.input}
              value={formData.nomeSalone}
              onChangeText={(value) => updateField('nomeSalone', value)}
              placeholder="Nome del tuo salone"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Indirizzo *</Text>
            <TextInput
              style={styles.input}
              value={formData.via}
              onChangeText={(value) => updateField('via', value)}
              placeholder="Via, numero civico"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Città</Text>
            <TextInput
              style={styles.input}
              value={formData.citta}
              onChangeText={(value) => updateField('citta', value)}
              placeholder="Città"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Provincia</Text>
            <TextInput
              style={styles.input}
              value={formData.provincia}
              onChangeText={(value) => updateField('provincia', value)}
              placeholder="Provincia"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Telefono *</Text>
            <TextInput
              style={styles.input}
              value={formData.telefono}
              onChangeText={(value) => updateField('telefono', value)}
              placeholder="Numero di telefono del salone"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Contatti</Text>
            <TextInput
              style={styles.input}
              value={formData.emailContatto}
              onChangeText={(value) => updateField('emailContatto', value)}
              placeholder="Email per prenotazioni clienti"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Sito Web</Text>
            <TextInput
              style={styles.input}
              value={formData.sitoWeb}
              onChangeText={(value) => updateField('sitoWeb', value)}
              placeholder="www.tuosito.it"
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Staff/Dipendenti</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.nomiDipendenti}
              onChangeText={(value) => updateField('nomiDipendenti', value)}
              placeholder="Nomi dei tuoi dipendenti/collaboratori"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Descrizione Salone</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.descrizione}
              onChangeText={(value) => updateField('descrizione', value)}
              placeholder="Descrivi il tuo salone, i servizi offerti..."
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Orari di Apertura</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.orari}
              onChangeText={(value) => updateField('orari', value)}
              placeholder="Es: Lun-Ven 9:00-19:00, Sab 9:00-18:00"
              multiline
              numberOfLines={2}
            />
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
            <Text style={styles.saveButtonText}>💾 Salva Modifiche Salone</Text>
          </TouchableOpacity>
        </View>

        {/* Gestione Prezzi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prezzi e Servizi</Text>

          {/* Lista prezzi esistenti */}
          {formData.prezziServizi && formData.prezziServizi.length > 0 && (
            <View style={styles.pricesList}>
              <Text style={styles.subsectionTitle}>Servizi attuali:</Text>
              {formData.prezziServizi.map((servizio, index) => (
                <View key={index} style={styles.existingServiceItem}>
                  <View style={styles.serviceContent}>
                    <Text style={styles.existingServiceName}>{servizio.servizio}</Text>
                    <Text style={styles.existingServiceDescription}>{servizio.descrizione}</Text>
                  </View>
                  <View style={styles.serviceActions}>
                    <Text style={styles.existingServicePrice}>€{servizio.prezzo}</Text>
                    <TouchableOpacity
                      style={styles.deleteServiceButton}
                      onPress={() => removeService(index)}
                    >
                      <Text style={styles.deleteServiceText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Aggiungi nuovo servizio */}
          <Text style={styles.subsectionTitle}>Aggiungi nuovo servizio:</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nome Servizio</Text>
            <TextInput
              style={styles.input}
              value={newService.servizio}
              onChangeText={(value) => setNewService({ ...newService, servizio: value })}
              placeholder="Es: Taglio uomo, Colore donna..."
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Descrizione</Text>
            <TextInput
              style={styles.input}
              value={newService.descrizione}
              onChangeText={(value) => setNewService({ ...newService, descrizione: value })}
              placeholder="Breve descrizione del servizio"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Prezzo (€)</Text>
            <TextInput
              style={styles.input}
              value={newService.prezzo}
              onChangeText={(value) => setNewService({ ...newService, prezzo: value })}
              placeholder="0.00"
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity style={styles.addServiceButton} onPress={addService}>
            <Text style={styles.addServiceButtonText}>➕ Aggiungi Servizio</Text>
          </TouchableOpacity>
        </View>

        {/* Gestione Email */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email Account</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Account Attuale</Text>
            <View style={styles.emailRow}>
              <TextInput
                style={[styles.input, styles.emailInput]}
                value={formData.email}
                onChangeText={(value) => updateField('email', value)}
                placeholder="Email del tuo account"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={showEmailSection}
              />
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setShowEmailSection(!showEmailSection)}
              >
                <Text style={styles.editButtonText}>
                  {showEmailSection ? '✖️' : '✏️'}
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
                <Text style={styles.updateButtonText}>📧 Aggiorna Email Account</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Gestione Password */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sicurezza Account</Text>

          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setShowPasswordSection(!showPasswordSection)}
          >
            <Text style={styles.toggleButtonText}>
              🔑 {showPasswordSection ? 'Nascondi' : 'Cambia Password'}
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
                <Text style={styles.updateButtonText}>🔐 Cambia Password</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.resetButton} onPress={handlePasswordReset}>
            <Text style={styles.resetButtonText}>📩 Invia Email Reset Password</Text>
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
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#00BCD4',
    paddingTop: 50,
  },
  backButton: {
    padding: 5,
  },
  backText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#00BCD4',
    paddingBottom: 8,
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
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
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
    backgroundColor: '#00BCD4',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#00BCD4',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  toggleButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  updateButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomSpacing: {
    height: 30,
  },
  // Stili per la sezione prezzi
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  pricesList: {
    marginBottom: 20,
  },
  existingServiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#00BCD4',
  },
  serviceContent: {
    flex: 1,
  },
  existingServiceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  existingServiceDescription: {
    fontSize: 14,
    color: '#666',
  },
  serviceActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  existingServicePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00BCD4',
    marginRight: 12,
  },
  deleteServiceButton: {
    padding: 8,
  },
  deleteServiceText: {
    fontSize: 16,
  },
  addServiceButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  addServiceButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
