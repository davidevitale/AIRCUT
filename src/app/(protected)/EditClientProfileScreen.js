import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { TextInput } from 'react-native-paper';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { collection, getDocs } from 'firebase/firestore';

import { auth, db } from '../../../config/firebase';
import {
  getCurrentUserData,
  updateClient,
  deleteAccount,
} from '../../services/userService';
import { logoutUser } from '../../services/authService';
import { useToast } from '../../context/ToastContext';

// Modifica account CLIENTE (expo-router attivo). Mostra SOLO i campi realmente
// salvati su clients/{uid} ed editabili dal profilo: userName, sex,
// preferenceCut. Email / role / campi di sistema restano fuori (non editabili).
// Salvataggio via userService.updateClient (no Firestore diretto nello screen).
// In fondo: tasto distruttivo "Elimina account" con conferma obbligatoria.
export default function EditClientProfileScreen() {
  const { t, i18n } = useTranslation();
  const { showSuccess, showError } = useToast();
  const currentUser = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tags, setTags] = useState([]);
  const [initialValues, setInitialValues] = useState({
    userName: '',
    sex: '',
    preferenceCut: [],
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [data, tagsSnapshot] = await Promise.all([
          getCurrentUserData(),
          getDocs(collection(db, 'tags')),
        ]);
        const ud = data?.userData || {};
        setInitialValues({
          userName: ud.userName || '',
          sex: ud.sex || '',
          preferenceCut: Array.isArray(ud.preferenceCut) ? ud.preferenceCut : [],
        });
        setTags(
          tagsSnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
        );
      } catch (error) {
        console.error('EditClientProfileScreen load error:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Schema coerente con la registrazione cliente (userName/sex/preferenceCut).
  const validationSchema = Yup.object().shape({
    userName: Yup.string()
      .trim()
      .min(3, t('editProfileClient.userNameValidation'))
      .required(t('editProfileClient.required')),
    sex: Yup.string()
      .oneOf(['M', 'F', 'ALTRO'], t('editProfileClient.sexValidation'))
      .required(t('editProfileClient.required')),
    preferenceCut: Yup.array()
      .min(1, t('editProfileClient.preferenceCutValidation'))
      .required(t('editProfileClient.required')),
  });

  // Stessa logica di visibilità tag della registrazione cliente.
  const filterTags = (sex) =>
    tags.filter((tag) => {
      if (!tag.active) return false;
      if (sex === 'M') return tag.visibility === 'male';
      if (sex === 'F' || sex === 'ALTRO') {
        return tag.visibility === 'male' || tag.visibility === 'female';
      }
      return false;
    });

  const handleSave = async (values) => {
    if (!currentUser) return;
    setSaving(true);
    try {
      await updateClient(currentUser.uid, {
        userName: values.userName.trim(),
        sex: values.sex,
        preferenceCut: values.preferenceCut,
      });
      showSuccess(t('editProfileClient.saved'));
      router.back();
    } catch (error) {
      console.error('EditClientProfileScreen save error:', error);
      showError(t('editProfileClient.saveError'));
    } finally {
      setSaving(false);
    }
  };

  // Eliminazione account: conferma forte (Alert distruttivo) → service →
  // logout/redirect. Gestione esplicita di auth/requires-recent-login.
  const handleDeleteAccount = () => {
    if (deleting || saving) return;
    Alert.alert(
      t('DeleteAccount.confirmTitle'),
      t('DeleteAccount.confirmMessage'),
      [
        { text: t('DeleteAccount.cancel'), style: 'cancel' },
        {
          text: t('DeleteAccount.confirmAction'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
              showSuccess(t('DeleteAccount.success'));
              router.replace('/auth');
            } catch (error) {
              if (error?.code === 'auth/requires-recent-login') {
                Alert.alert(
                  t('DeleteAccount.reauthTitle'),
                  t('DeleteAccount.reauthMessage'),
                  [
                    {
                      text: t('DeleteAccount.reauthOk'),
                      onPress: async () => {
                        try { await logoutUser(); } catch {}
                        router.replace('/auth');
                      },
                    },
                  ],
                );
              } else {
                showError(t('DeleteAccount.errorMessage'));
              }
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const paperProps = {
    mode: 'outlined',
    outlineColor: 'rgba(0, 188, 212, 0.2)',
    activeOutlineColor: '#00BCD4',
    textColor: '#0f172a',
    style: styles.input,
    outlineStyle: { borderRadius: 14 },
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00BCD4" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('editProfileClient.title')}</Text>
          <View style={{ width: 44 }} />
        </View>

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          enableReinitialize
          onSubmit={handleSave}
        >
          {({ handleChange, handleBlur, handleSubmit, setFieldValue, values, errors, touched }) => {
            const filteredTags = filterTags(values.sex);
            return (
              <View style={styles.formCard}>
                {/* Username */}
                <View style={styles.fieldBlock}>
                  <TextInput
                    {...paperProps}
                    label={t('editProfileClient.userName')}
                    value={values.userName}
                    onChangeText={handleChange('userName')}
                    onBlur={handleBlur('userName')}
                  />
                  <Text style={[styles.errorText, { display: touched.userName && errors.userName ? 'flex' : 'none' }]}>
                    {touched.userName && typeof errors.userName === 'string' ? errors.userName : ' '}
                  </Text>
                </View>

                {/* Sesso */}
                <View style={styles.fieldBlock}>
                  <Text style={styles.label}>{t('editProfileClient.sex')}</Text>
                  <View style={styles.genderContainer}>
                    {[
                      { key: 'M', label: t('ClientRegistrationScreen.M') },
                      { key: 'F', label: t('ClientRegistrationScreen.F') },
                      { key: 'ALTRO', label: t('ClientRegistrationScreen.ALTRO') },
                    ].map((opt) => {
                      const active = values.sex === opt.key;
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          style={[styles.genderButton, active && styles.genderButtonActive]}
                          onPress={() => {
                            // Cambiare sesso può rendere invalidi alcuni tag selezionati:
                            // ripuliamo le preferenze non più visibili.
                            setFieldValue('sex', opt.key);
                            const stillValid = filterTags(opt.key).map((tg) => tg.id);
                            setFieldValue(
                              'preferenceCut',
                              values.preferenceCut.filter((id) => stillValid.includes(id)),
                            );
                          }}
                        >
                          <Text style={[styles.genderText, active && styles.genderTextActive]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={[styles.errorText, { display: touched.sex && errors.sex ? 'flex' : 'none' }]}>
                    {touched.sex && typeof errors.sex === 'string' ? errors.sex : ' '}
                  </Text>
                </View>

                {/* Preferenze taglio */}
                {values.sex ? (
                  <View style={styles.fieldBlock}>
                    <Text style={styles.label}>{t('editProfileClient.preferenceCut')}</Text>
                    <View style={styles.taglioGrid}>
                      {filteredTags.map((taglio) => {
                        const isSelected = values.preferenceCut.includes(taglio.id);
                        return (
                          <TouchableOpacity
                            key={taglio.id}
                            style={[styles.taglioCard, isSelected && styles.taglioCardActive]}
                            onPress={() => {
                              const updated = isSelected
                                ? values.preferenceCut.filter((id) => id !== taglio.id)
                                : [...values.preferenceCut, taglio.id];
                              setFieldValue('preferenceCut', updated);
                            }}
                          >
                            <Text style={styles.taglioName}>
                              {i18n.language === 'en-UK' ? taglio.label?.en : taglio.label?.it}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <Text style={[styles.errorText, { display: touched.preferenceCut && errors.preferenceCut ? 'flex' : 'none' }]}>
                      {touched.preferenceCut && typeof errors.preferenceCut === 'string' ? errors.preferenceCut : ' '}
                    </Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.saveButton, (saving || deleting) && styles.saveButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={saving || deleting}
                >
                  {saving ? (
                    <ActivityIndicator color="#00BCD4" />
                  ) : (
                    <Text style={styles.saveButtonText}>{t('editProfileClient.save')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          }}
        </Formik>

        {/* Zona pericolosa: eliminazione account (azione irreversibile). */}
        <View style={styles.dangerZone}>
          <View style={styles.dangerDivider} />
          <TouchableOpacity
            style={[styles.deleteAccountButton, (deleting || saving) && styles.saveButtonDisabled]}
            onPress={handleDeleteAccount}
            disabled={deleting || saving}
          >
            {deleting ? (
              <ActivityIndicator color="#DC2626" />
            ) : (
              <Text style={styles.deleteAccountButtonText}>{t('DeleteAccount.button')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 20, paddingVertical: 24 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(0, 188, 212, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: { fontSize: 20, color: '#00BCD4', fontWeight: 'bold' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#00BCD4', flex: 1, textAlign: 'center' },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 188, 212, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  fieldBlock: { marginBottom: 6 },
  input: { backgroundColor: '#ffffff', fontSize: 14 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginBottom: 10 },
  errorText: { color: 'red', fontSize: 12, marginBottom: 6, marginTop: 2 },
  genderContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  genderButton: {
    flex: 1,
    height: 50,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 188, 212, 0.2)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 248, 248, 0.6)',
  },
  genderButtonActive: {
    backgroundColor: 'rgba(0, 188, 212, 0.15)',
    borderColor: 'rgba(0, 188, 212, 0.5)',
  },
  genderText: { fontSize: 16, color: '#334155', fontWeight: '500' },
  genderTextActive: { color: '#00BCD4', fontWeight: 'bold' },
  taglioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  taglioCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 188, 212, 0.15)',
  },
  taglioCardActive: {
    backgroundColor: 'rgba(0, 188, 212, 0.15)',
    borderColor: 'rgba(0, 188, 212, 0.5)',
  },
  taglioName: { fontSize: 15, fontWeight: 'bold', color: '#0f172a', textAlign: 'center' },
  saveButton: {
    backgroundColor: 'rgba(0, 188, 212, 0.35)',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 188, 212, 0.7)',
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: '#00BCD4', fontSize: 17, fontWeight: 'bold' },
  dangerZone: { marginTop: 28 },
  dangerDivider: {
    height: 1,
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    marginBottom: 16,
  },
  deleteAccountButton: {
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(220, 38, 38, 0.6)',
  },
  deleteAccountButtonText: { color: '#DC2626', fontSize: 16, fontWeight: '700' },
});
