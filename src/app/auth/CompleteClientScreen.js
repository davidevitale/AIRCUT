import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { TextInput } from 'react-native-paper';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { auth } from '../../../config/firebase';
import { createClientDocFromSocial, logoutUser } from '../../services/authService';

/**
 * CompleteClientScreen — mostrato dopo il social signup di un NUOVO utente
 * che ha scelto il ruolo "client". Richiede SOLO il nickname: email e
 * credenziali vengono dal provider social.
 *
 * Al submit crea il documento clients/{uid}; AuthContext (onAuthStateChanged)
 * rileva il nuovo documento e naviga automaticamente a (protected).
 */
export default function CompleteClientScreen() {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validationSchema = Yup.object().shape({
    nickname: Yup.string()
      .min(3, t('ClientRegistrationScreen.userNameValidation'))
      .required(t('ClientRegistrationScreen.requiredValidation')),
  });

  const handleSubmit = async (values) => {
    if (isSubmitting) return;
    const user = auth.currentUser;
    if (!user) {
      Alert.alert(t('LoginScreen.errorTitle'), t('LoginScreen.socialError'));
      router.replace('/auth');
      return;
    }

    setIsSubmitting(true);
    try {
      await createClientDocFromSocial(user, { nickname: values.nickname });
      // AuthContext rileva il nuovo doc e naviga a (protected).
      router.replace('/(protected)');
    } catch (error) {
      let message;
      if (error?.message === 'nicknameAlreadyExists') {
        message = t('CompleteClientScreen.nicknameTaken');
      } else if (error?.message === 'userNameValidation') {
        message = t('ClientRegistrationScreen.userNameValidation');
      } else {
        message = t('LoginScreen.socialError');
      }
      Alert.alert(t('LoginScreen.errorTitle'), message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    // Annulla: l'utente Auth esiste ma senza documento. Facciamo signOut così
    // non resta in uno stato "a metà".
    try {
      await logoutUser();
    } catch (e) {
      // no-op
    }
    router.replace('/auth');
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
          <Text style={styles.title}>{t('CompleteClientScreen.title')}</Text>
          <Text style={styles.subtitle}>{t('CompleteClientScreen.subtitle')}</Text>

          <Formik
            initialValues={{ nickname: '' }}
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
                    label={t('CompleteClientScreen.title')}
                    placeholder={t('CompleteClientScreen.title')}
                    {...commonProps}
                    onChangeText={handleChange('nickname')}
                    onBlur={handleBlur('nickname')}
                    value={values.nickname}
                    autoCapitalize="none"
                  />
                  <Text
                    style={{
                      color: 'red',
                      fontSize: 12,
                      display: touched.nickname && errors.nickname ? 'flex' : 'none',
                    }}
                  >
                    {touched.nickname && typeof errors.nickname === 'string'
                      ? errors.nickname
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
                      {t('CompleteClientScreen.submitButton')}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelLink} onPress={handleCancel}>
                  <Text style={styles.cancelText}>
                    {t('CompleteClientScreen.cancel')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Formik>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollView: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 30, paddingVertical: 60, justifyContent: 'center' },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#334155',
    textAlign: 'center',
    marginBottom: 30,
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
  cancelLink: { marginTop: 18, alignItems: 'center' },
  cancelText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
});
