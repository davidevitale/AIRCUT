import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView,
  ScrollView,
  Alert
} from 'react-native';
import { registerClient } from '../services/authService';

export default function RegisterClientScreen({ onGoToLogin, navigation }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nomeUtente: '',
    sesso: '',
    preferenzaTaglio: [],
  });

  const scrollViewRef = useRef(null);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleTaglio = (taglioId) => {
    setFormData(prev => ({
      ...prev,
      preferenzaTaglio: prev.preferenzaTaglio.includes(taglioId)
        ? prev.preferenzaTaglio.filter(id => id !== taglioId)
        : [...prev.preferenzaTaglio, taglioId]
    }));
  };

  const tagliOptions = [
    { 
      id: 'classico', 
      name: 'Classico', 
      description: 'Taglio tradizionale e ordinato',
      emoji: '✂️'
    },
    { 
      id: 'fade', 
      name: 'Fade', 
      description: 'Sfumatura graduale',
      emoji: '✨'
    },
    { 
      id: 'rasati', 
      name: 'Rasati', 
      description: 'Taglio molto corto',
      emoji: '💈'
    },
    { 
      id: 'moderni', 
      name: 'Moderni', 
      description: 'Stili attuali e trendy',
      emoji: '🚀'
    },
    { 
      id: 'barba', 
      name: 'Barba', 
      description: 'Cura e styling barba',
      emoji: '🧔'
    },
    { 
      id: 'baffi', 
      name: 'Baffi', 
      description: 'Styling baffi',
      emoji: '👨‍💼'
    }
  ];

  const handleRegister = async () => {
    // Validazione: almeno uno tra email, nomeUtente, sesso deve essere compilato
    if (!formData.email && !formData.nomeUtente && !formData.sesso) {
      Alert.alert('Errore', 'Compila almeno email, nome utente o genere');
      return;
    }
    
    // Validazione password: se inserita, deve essere confermata
    if (formData.password && !formData.confirmPassword) {
      Alert.alert('Errore', 'Conferma la password');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Errore', 'Le password non coincidono');
      return;
    }
    
    try {
      // Costruisci l'oggetto SOLO con i campi che hanno valore
      const cleanedData = {};
      
      if (formData.email) cleanedData.email = formData.email;
      if (formData.password) cleanedData.password = formData.password;
      if (formData.nomeUtente) cleanedData.nomeUtente = formData.nomeUtente;
      if (formData.sesso) cleanedData.sesso = formData.sesso;
      if (formData.preferenzaTaglio.length > 0) cleanedData.preferenzaTaglio = formData.preferenzaTaglio;
      
      await registerClient(cleanedData);
      Alert.alert('Successo', 'Registrazione completata!');
      // Firebase observer gestirà automaticamente lo stato
    } catch (error) {
      Alert.alert('Errore', error.message);
    }
  };



  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} ref={scrollViewRef}>
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => {
                if (navigation && navigation.goBack) {
                  navigation.goBack();
                } else if (onGoToLogin) {
                  onGoToLogin();
                }
              }}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>aircut</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Credenziali</Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={formData.email}
                onChangeText={(value) => updateField('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={formData.password}
                onChangeText={(value) => updateField('password', value)}
                secureTextEntry
                autoCompleteType="off"
                textContentType="none"
                autoCorrect={false}
                autoCapitalize="none"
                keyboardType="default"
                passwordRules=""
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Conferma Password"
                value={formData.confirmPassword}
                onChangeText={(value) => updateField('confirmPassword', value)}
                secureTextEntry
                autoCompleteType="off"
                textContentType="none"
                autoCorrect={false}
                autoCapitalize="none"
                keyboardType="default"
                passwordRules=""
              />
            </View>
          </View>

          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Dati Personali</Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Nome utente"
                value={formData.nomeUtente}
                onChangeText={(value) => updateField('nomeUtente', value)}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Genere</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity 
                  style={[styles.genderButton, formData.sesso === 'M' && styles.genderButtonActive]}
                  onPress={() => updateField('sesso', 'M')}
                >
                  <Text style={[styles.genderText, formData.sesso === 'M' && styles.genderTextActive]}>Uomo</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.genderButton, formData.sesso === 'F' && styles.genderButtonActive]}
                  onPress={() => updateField('sesso', 'F')}
                >
                  <Text style={[styles.genderText, formData.sesso === 'F' && styles.genderTextActive]}>Donna</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.genderButton, formData.sesso === 'ALTRO' && styles.genderButtonActive]}
                  onPress={() => updateField('sesso', 'ALTRO')}
                >
                  <Text style={[styles.genderText, formData.sesso === 'ALTRO' && styles.genderTextActive]}>Altro</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>

          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Preferenze Taglio</Text>

            <Text style={styles.subtitle}>Scegli i tuoi stili preferiti (selezione multipla)</Text>
            <View style={styles.taglioGrid}>
              {tagliOptions.map((taglio) => (
                <TouchableOpacity
                  key={taglio.id}
                  style={[
                    styles.taglioCard,
                    formData.preferenzaTaglio.includes(taglio.id) && styles.taglioCardActive
                  ]}
                  onPress={() => toggleTaglio(taglio.id)}
                >
                  <Text style={styles.taglioEmoji}>{taglio.emoji}</Text>
                  <Text style={styles.taglioName}>{taglio.name}</Text>
                  <Text style={styles.taglioDescription}>{taglio.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
            <Text style={styles.registerButtonText}>Registrati</Text>
          </TouchableOpacity>

          <View style={styles.loginSection}>
            <Text style={styles.loginText}>Hai già un account?</Text>
            <TouchableOpacity onPress={onGoToLogin}>
              <Text style={styles.loginLink}>Accedi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 20,
    color: '#000',
    fontWeight: 'bold',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  content: {
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00BCD4',
    textAlign: 'center',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 15,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 10,
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 188, 212, 0.2)',
    borderRadius: 14,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: 'rgba(248, 248, 248, 0.6)',
    color: '#0f172a',
    shadowColor: '#00BCD4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  genderButton: {
    flex: 1,
    height: 50,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 188, 212, 0.2)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 248, 248, 0.6)',
    shadowColor: '#00BCD4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  genderButtonActive: {
    backgroundColor: 'rgba(0, 188, 212, 0.15)',
    borderColor: 'rgba(0, 188, 212, 0.5)',
  },
  genderText: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
  },
  genderTextActive: {
    color: '#00BCD4',
    fontWeight: 'bold',
  },
  taglioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  taglioCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  taglioCardActive: {
    backgroundColor: 'rgba(0, 188, 212, 0.15)',
    borderColor: 'rgba(0, 188, 212, 0.5)',
  },
  taglioEmoji: {
    fontSize: 35,
    marginBottom: 8,
  },
  taglioName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 5,
  },
  taglioDescription: {
    fontSize: 11,
    color: '#334155',
    textAlign: 'center',
  },
  sectionBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  registerButton: {
    backgroundColor: 'rgba(0, 188, 212, 0.35)',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 188, 212, 0.7)',
    shadowColor: '#00BCD4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  registerButtonText: {
    color: '#00BCD4',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  loginText: {
    fontSize: 16,
    color: '#334155',
  },
  loginLink: {
    fontSize: 16,
    color: '#00BCD4',
    fontWeight: 'bold',
    marginLeft: 5,
  },
});
