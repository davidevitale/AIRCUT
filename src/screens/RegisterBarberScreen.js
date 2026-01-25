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
import { registerBarber } from '../services/authService';

export default function RegisterBarberScreen({ onGoToLogin, navigation }) {
  const [formData, setFormData] = useState({
    // 1) Email, password
    email: '',
    password: '',
    confirmPassword: '',
    
    // 2) Nome salone, nomi dipendenti, via, specializzazioni taglio
    nomeSalone: '',
    nomiDipendenti: '',
    via: '',
    tipiTaglio: [], // Array per selezione multipla specializzazioni
    
    // 3) Contatti e sito per prenotazione
    telefono: '',
    sitoWeb: '',
    emailContatto: '',
  });

  const panResponderRef = useRef(null);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    // PanResponder non è necessario, useremo solo il back button
  }, []);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleTaglio = (taglioId) => {
    setFormData(prev => ({
      ...prev,
      tipiTaglio: prev.tipiTaglio.includes(taglioId)
        ? prev.tipiTaglio.filter(id => id !== taglioId)
        : [...prev.tipiTaglio, taglioId]
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
    // Validazione campi obbligatori
    if (!formData.email || !formData.password || !formData.confirmPassword || 
        !formData.nomeSalone || !formData.via || !formData.telefono || 
        !formData.emailContatto) {
      Alert.alert('Errore', 'Completa tutti i campi obbligatori');
      return;
    }
    
    // Validazione password
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Errore', 'Le password non coincidono');
      return;
    }
    
    try {
      await registerBarber(formData);
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
            <Text style={styles.sectionTitle}>Dati Salone</Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Nome del Salone"
                value={formData.nomeSalone}
                onChangeText={(value) => updateField('nomeSalone', value)}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Via (Indirizzo del salone)"
                value={formData.via}
                onChangeText={(value) => updateField('via', value)}
              />
            </View>

            <Text style={styles.subtitle}>Specializzazioni taglio (selezione multipla)</Text>
            <View style={styles.taglioGrid}>
              {tagliOptions.map((taglio) => (
                <TouchableOpacity
                  key={taglio.id}
                  style={[
                    styles.taglioCard,
                    formData.tipiTaglio.includes(taglio.id) && styles.taglioCardActive
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

          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Contatti e Prenotazione</Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Numero di telefono"
                value={formData.telefono}
                onChangeText={(value) => updateField('telefono', value)}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Sito web (opzionale)"
                value={formData.sitoWeb}
                onChangeText={(value) => updateField('sitoWeb', value)}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email per contatti/prenotazioni"
                value={formData.emailContatto}
                onChangeText={(value) => updateField('emailContatto', value)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
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
  mediaSection: {
    marginBottom: 25,
  },
  mediaSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  mediaSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  addMediaButton: {
    backgroundColor: '#00BCD4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addMediaButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  mediaItem: {
    marginRight: 15,
    position: 'relative',
  },
  mediaPreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
  },
  videoPreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: '#E8F8F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00BCD4',
    borderStyle: 'dashed',
  },
  videoIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  videoText: {
    fontSize: 12,
    color: '#00BCD4',
    fontWeight: '600',
  },
  removeMediaButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeMediaText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noMediaText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
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
