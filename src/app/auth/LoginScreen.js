import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { loginUser } from '../../services/authService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import { TextInput } from 'react-native-paper';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen({ }) {
  const params = useLocalSearchParams();
  const selectedRole = Array.isArray(params.role) ? params.role[0] : params.role;
  const userRole = selectedRole === 'barber' ? 'barber' : 'client';
  console.log(userRole)
  const { t } = useTranslation();
  const { authStatus } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  React.useEffect(() => {
    if (authStatus === 'authenticated') {
      router.replace('/(protected)');
    }
  }, [authStatus]);

  const validationSchema = Yup.object().shape({
    email: Yup.string()
      .email(t('LoginScreen.emailValidation'))
      .required(t('LoginScreen.requiredValidation')),

    password: Yup.string()
      .min(8, t('LoginScreen.passwordValidation'))
      .required(t('LoginScreen.requiredValidation')),
  });

  const handleLogin = async (values) => {
    setIsLoggingIn(true);
    try {
      const { user, userData, role } = await loginUser(values.email, values.password, userRole);
      console.log('Login successo:', { user: user.email, role });
      // Firebase observer gestir� automaticamente lo stato
    } catch (error) {
      const knownErrorKeys = [
        'userNotFound',
        'wrongPassword',
        'invalidEmail',
        'userDisabled',
        'tooManyRequests',
        'barberAccountNotFound',
        'clientAccountNotFound',
        'invalidCredentials',
      ];
      const errorKey = error?.message;
      const errorMessage = knownErrorKeys.includes(errorKey)
        ? t(`LoginScreen.${errorKey}`)
        : t('LoginScreen.invalidCredentials');

      Alert.alert(t('LoginScreen.errorTitle'), errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const commonProps = {
    mode: 'outlined',
    outlineColor: '#00BCD4',
    activeOutlineColor: '#00BCD4',
    placeholderTextColor: '#737373',
    textColor: '#737373',
    cursorColor: '#737373',
    contentStyle: {
      fontSize: 14,
      color: '#737373',
    },
    style: {
      height: 48,
      backgroundColor: '#ffffff',
      fontSize: 14,
    },
    outlineStyle: {
      borderRadius: 4,
      borderColor: 'rgba(0, 188, 212, 0.2)',
    },
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>
            {t('LoginScreen.title')} {userRole === 'client' ? t('LoginScreen.client') : t('LoginScreen.hairArtist')}
          </Text>

          <Formik
            initialValues={{
              email: '',
              password: '',
            }}
            validationSchema={validationSchema}
            onSubmit={(values) => {
              handleLogin(values);
            }}
          >
            {({
              handleChange,
              handleBlur,
              handleSubmit,
              values,
              errors,
              touched,
            }) => (
              <>
                <View style={styles.loginBox}>
                  <View style={styles.inputContainer}>
                    <TextInput
                      label={t('LoginScreen.emailPlaceholder')}
                      placeholder={t('LoginScreen.emailPlaceholder')}
                      {...commonProps}
                      onChangeText={handleChange('email')}
                      onBlur={handleBlur('email')}
                      value={values.email}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                    <Text
                      style={{
                        color: 'red',
                        fontSize: 12,
                        display: touched.email && errors.email ? 'flex' : 'none',
                      }}
                    >
                      {touched.email && typeof errors.email === 'string'
                        ? errors.email
                        : ' '}
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <TextInput
                      label={t('LoginScreen.passwordPlaceholder')}
                      placeholder={t('LoginScreen.passwordPlaceholder')}
                      {...commonProps}
                      onChangeText={handleChange('password')}
                      onBlur={handleBlur('password')}
                      value={values.password}
                      secureTextEntry
                      keyboardType="default"
                      autoCapitalize="none"
                    />
                    <Text
                      style={{
                        color: 'red',
                        fontSize: 12,
                        display: touched.password && errors.password ? 'flex' : 'none',
                      }}
                    >
                      {touched.password && typeof errors.password === 'string'
                        ? errors.password
                        : ' '}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.loginButton, isLoggingIn && styles.loginButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={isLoggingIn}
                  >
                    {isLoggingIn ? (
                      <ActivityIndicator size="small" color="#00BCD4" />
                    ) : (
                      <Text style={styles.loginButtonText}>{t('LoginScreen.loginButton')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Formik>

          <View style={styles.registerSection}>
            <Text style={styles.registerText}>{t('LoginScreen.noAccount')}</Text>
            <TouchableOpacity
              onPress={() => {
                userRole === 'client'
                  ? router.navigate(`/auth/RegisterClientScreen`)
                  : router.navigate(`/auth/RegisterBarberScreen`);
              }}
            >
              <Text style={styles.registerLink}>{t('LoginScreen.register')}</Text>
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
  loginButtonDisabled: {
    opacity: 0.7,
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



