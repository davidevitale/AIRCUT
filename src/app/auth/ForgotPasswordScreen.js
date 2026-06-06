import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { TextInput } from 'react-native-paper';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { sendPasswordReset } from '../../services/authService';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);

  const validationSchema = Yup.object().shape({
    email: Yup.string()
      .email(t('LoginScreen.emailValidation'))
      .required(t('LoginScreen.requiredValidation')),
  });

  const handleSubmit = async (values) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await sendPasswordReset(values.email);
      // Messaggio statico: non rivela se l'email è registrata (privacy by design).
      setConfirmationVisible(true);
    } catch (error) {
      // Solo errori "mostrabili" arrivano qui (email malformata, troppi tentativi).
      // Per ogni altro caso mostriamo comunque la conferma statica.
      const showableKeys = ['invalidEmail', 'tooManyRequests'];
      if (showableKeys.includes(error?.message)) {
        // Riusiamo le chiavi già presenti in LoginScreen.
        setConfirmationVisible(true);
      } else {
        setConfirmationVisible(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const commonProps = {
    mode: 'outlined',
    outlineColor: '#00BCD4',
    activeOutlineColor: '#00BCD4',
    placeholderTextColor: '#737373',
    textColor: '#737373',
    cursorColor: '#737373',
    contentStyle: { fontSize: 14, color: '#737373' },
    style: { height: 48, backgroundColor: '#ffffff', fontSize: 14 },
    outlineStyle: { borderRadius: 4, borderColor: 'rgba(0, 188, 212, 0.2)' },
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{t('ForgotPasswordScreen.title')}</Text>
            <View style={{ width: 44 }} />
          </View>

          <Text style={styles.instructions}>
            {t('ForgotPasswordScreen.instructions')}
          </Text>

          {confirmationVisible ? (
            <View style={styles.confirmationBox}>
              <Text style={styles.confirmationText}>
                {t('ForgotPasswordScreen.confirmation')}
              </Text>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => router.back()}
              >
                <Text style={styles.submitButtonText}>
                  {t('ForgotPasswordScreen.backToLogin')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Formik
              initialValues={{ email: '' }}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({
                handleChange,
                handleBlur,
                handleSubmit: formikSubmit,
                values,
                errors,
                touched,
              }) => (
                <View style={styles.formBox}>
                  <View style={styles.inputContainer}>
                    <TextInput
                      label={t('ForgotPasswordScreen.emailLabel')}
                      placeholder={t('ForgotPasswordScreen.emailLabel')}
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

                  <TouchableOpacity
                    style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                    onPress={formikSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#00BCD4" />
                    ) : (
                      <Text style={styles.submitButtonText}>
                        {t('ForgotPasswordScreen.submitButton')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </Formik>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollView: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 30, paddingVertical: 40 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
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
  },
  backButtonText: { fontSize: 20, color: '#000', fontWeight: 'bold' },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
    flex: 1,
  },
  instructions: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 24,
  },
  formBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  inputContainer: { marginBottom: 10 },
  submitButton: {
    backgroundColor: 'rgba(0, 188, 212, 0.35)',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 188, 212, 0.7)',
    shadowColor: '#00BCD4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: '#00BCD4', fontSize: 18, fontWeight: 'bold' },
  confirmationBox: {
    backgroundColor: 'rgba(0, 188, 212, 0.08)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 188, 212, 0.3)',
  },
  confirmationText: {
    fontSize: 15,
    color: '#0f172a',
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
});
