import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView,
  Alert
} from 'react-native';
import { loginUser } from '../services/authService';

export default function LoginScreen({ userRole, onGoToRegister, navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Errore', 'Inserisci email e password');
      return;
    }
    
    try {
      const { user, userData, role } = await loginUser(email, password);
      console.log('Login successo:', { user: user.email, role });
      // Firebase observer gestirà automaticamente lo stato
    } catch (error) {
      Alert.alert('Errore', 'Email o password non corretti');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          Accedi come {userRole === 'client' ? 'Cliente' : 'Parrucchiere'}
        </Text>

        <View style={styles.loginBox}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCompleteType="off"
              textContentType="none"
              autoCorrect={false}
              autoCapitalize="none"
              keyboardType="default"
              passwordRules=""
            />
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Accedi</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.registerSection}>
          <Text style={styles.registerText}>Non hai un account?</Text>
          <TouchableOpacity onPress={onGoToRegister}>
            <Text style={styles.registerLink}>Registrati</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 40,
  },
  loginBox: {
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
  loginButton: {
    backgroundColor: 'rgba(0, 188, 212, 0.35)',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 188, 212, 0.7)',
    shadowColor: '#00BCD4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  loginButtonText: {
    color: '#00BCD4',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  registerText: {
    fontSize: 16,
    color: '#334155',
  },
  registerLink: {
    fontSize: 16,
    color: '#00BCD4',
    fontWeight: 'bold',
    marginLeft: 5,
  },
});
