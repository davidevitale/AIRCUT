import React, { useEffect, useState } from 'react';
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
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../../../config/firebase';
import { createBarberDocFromSocial, logoutUser } from '../../services/authService';

/**
 * CompleteBarberProfileScreen — mostrato dopo il social signup di un NUOVO
 * utente che ha scelto il ruolo "barber". Richiede tutti i campi del barber
 * (esclusi email/password, che vengono dal provider social).
 *
 * Al submit crea il documento barbers/{uid}; AuthContext rileva il nuovo
 * documento e naviga automaticamente a (protected).
 */
export default function CompleteBarberProfileScreen() {
  const { t, i18n } = useTranslation();
  const [tags, setTags] = useState([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validationSchema = Yup.object().shape({
    firstName: Yup.string()
      .min(2, t('BarberRegistrationScreen.firstNameValidation'))
      .required(t('BarberRegistrationScreen.required')),
    lastName: Yup.string()
      .min(2, t('BarberRegistrationScreen.lastNameValidation'))
      .required(t('BarberRegistrationScreen.required')),
    nickName: Yup.string()
      .min(2, t('BarberRegistrationScreen.nicknameValidation'))
      .required(t('BarberRegistrationScreen.required')),
    workGender: Yup.string()
      .oneOf(['male', 'female', 'unisex'], t('BarberRegistrationScreen.required'))
      .required(t('BarberRegistrationScreen.required')),
    salonName: Yup.string()
      .min(2, t('BarberRegistrationScreen.salonNameValidation'))
      .required(t('BarberRegistrationScreen.required')),
    salonAddress: Yup.string()
      .min(3, t('BarberRegistrationScreen.salonAddressNameValidation'))
      .required(t('BarberRegistrationScreen.required')),
    typesCut: Yup.array()
      .min(1, t('BarberRegistrationScreen.typesCut'))
      .required(t('BarberRegistrationScreen.required')),
    phoneNumber: Yup.string()
      .min(9, t('BarberRegistrationScreen.phoneNumber'))
      .required(t('BarberRegistrationScreen.required')),
    contactEmail: Yup.string()
      .email(t('BarberRegistrationScreen.contactEmail'))
      .required(t('BarberRegistrationScreen.required')),
  });

  const fetchAllTags = async () => {
    setIsLoadingTags(true);
    try {
      const tagsRef = collection(db, 'tags');
      const querySnapshot = await getDocs(tagsRef);
      const allTags = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setTags(allTags);
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setIsLoadingTags(false);
    }
  };

  const getFilteredTagsByWorkGender = (allTags = [], workGender) => {
    return allTags.filter((tag) => {
      if (!tag.active || !workGender) return false;
      if (workGender === 'male') {
        return tag.visibility === 'male' || tag.visibility === 'male_unisex';
      }
      if (workGender === 'female') {
        return tag.visibility === 'female';
      }
      if (workGender === 'unisex') {
        return (
          tag.visibility === 'male' ||
          tag.visibility === 'male_unisex' ||
          tag.visibility === 'female'
        );
      }
      return false;
    });
  };

  const buildLocalizedTypesCut = (selectedIds = []) => {
    return selectedIds
      .map((tagId) => {
        const tag = tags.find((item) => item.id === tagId);
        if (!tag) return null;
        return {
          id: tag.id,
          en: tag.label?.en ?? tag.id,
          it: tag.label?.it ?? tag.label?.en ?? tag.id,
        };
      })
      .filter(Boolean);
  };

  useEffect(() => {
    fetchAllTags();
  }, []);

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
      await createBarberDocFromSocial(user, {
        ...values,
        typesCut: buildLocalizedTypesCut(values.typesCut),
      });
      router.replace('/(protected)');
    } catch (error) {
      let message;
      if (error?.message === 'nicknameExists') {
        message = t('BarberRegistrationScreen.nicknameExists');
      } else {
        message = t('LoginScreen.socialError');
      }
      Alert.alert(t('LoginScreen.errorTitle'), message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
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
      <ScrollView style={styles.content}>
        <Formik
          initialValues={{
            firstName: '',
            lastName: '',
            nickName: '',
            workGender: '',
            salonName: '',
            salonAddress: '',
            typesCut: [],
            phoneNumber: '',
            website: '',
            contactEmail: auth.currentUser?.email || '',
          }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit: formikSubmit,
            setFieldValue,
            values,
            errors,
            touched,
          }) => {
            const filteredTags = getFilteredTagsByWorkGender(tags, values.workGender);
            return (
              <>
                <Text style={styles.title}>
                  {t('CompleteBarberProfileScreen.title')}
                </Text>
                <Text style={styles.subtitle}>
                  {t('CompleteBarberProfileScreen.subtitle')}
                </Text>

                <View style={styles.sectionBox}>
                  <View style={styles.inputContainer}>
                    <TextInput
                      label={t('BarberRegistrationScreen.BarberFirstNamePlaceholder')}
                      placeholder={t('BarberRegistrationScreen.BarberFirstNamePlaceholder')}
                      {...commonProps}
                      value={values.firstName}
                      onChangeText={handleChange('firstName')}
                      onBlur={handleBlur('firstName')}
                    />
                    <Text style={errStyle(touched.firstName, errors.firstName)}>
                      {touched.firstName && typeof errors.firstName === 'string' ? errors.firstName : ' '}
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <TextInput
                      label={t('BarberRegistrationScreen.BarberLastNamePlaceholder')}
                      placeholder={t('BarberRegistrationScreen.BarberLastNamePlaceholder')}
                      {...commonProps}
                      value={values.lastName}
                      onChangeText={handleChange('lastName')}
                      onBlur={handleBlur('lastName')}
                    />
                    <Text style={errStyle(touched.lastName, errors.lastName)}>
                      {touched.lastName && typeof errors.lastName === 'string' ? errors.lastName : ' '}
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <TextInput
                      label={t('BarberRegistrationScreen.nicknamePlaceholder')}
                      placeholder={t('BarberRegistrationScreen.nicknamePlaceholder')}
                      {...commonProps}
                      value={values.nickName}
                      onChangeText={handleChange('nickName')}
                      onBlur={handleBlur('nickName')}
                      autoCapitalize="none"
                    />
                    <Text style={errStyle(touched.nickName, errors.nickName)}>
                      {touched.nickName && typeof errors.nickName === 'string' ? errors.nickName : ' '}
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <TextInput
                      label={t('BarberRegistrationScreen.studioNamePlaceholder')}
                      placeholder={t('BarberRegistrationScreen.studioNamePlaceholder')}
                      {...commonProps}
                      value={values.salonName}
                      onChangeText={handleChange('salonName')}
                      onBlur={handleBlur('salonName')}
                    />
                    <Text style={errStyle(touched.salonName, errors.salonName)}>
                      {touched.salonName && typeof errors.salonName === 'string' ? errors.salonName : ' '}
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <TextInput
                      label={t('BarberRegistrationScreen.addressPlaceholder')}
                      placeholder={t('BarberRegistrationScreen.addressPlaceholder')}
                      {...commonProps}
                      value={values.salonAddress}
                      onChangeText={handleChange('salonAddress')}
                      onBlur={handleBlur('salonAddress')}
                    />
                    <Text style={errStyle(touched.salonAddress, errors.salonAddress)}>
                      {touched.salonAddress && typeof errors.salonAddress === 'string' ? errors.salonAddress : ' '}
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.fieldLabel}>
                      {t('BarberRegistrationScreen.workGenderLabel')}
                    </Text>
                    <View style={styles.genderContainer}>
                      {['male', 'female', 'unisex'].map((g) => (
                        <TouchableOpacity
                          key={g}
                          style={[
                            styles.genderButton,
                            values.workGender === g && styles.genderButtonActive,
                          ]}
                          onPress={() => {
                            setFieldValue('workGender', g);
                            setFieldValue('typesCut', []);
                          }}
                        >
                          <Text
                            style={[
                              styles.genderText,
                              values.workGender === g && styles.genderTextActive,
                            ]}
                          >
                            {t(
                              g === 'male'
                                ? 'BarberRegistrationScreen.workGenderMale'
                                : g === 'female'
                                ? 'BarberRegistrationScreen.workGenderFemale'
                                : 'BarberRegistrationScreen.workGenderUnisex'
                            )}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={errStyle(touched.workGender, errors.workGender)}>
                      {touched.workGender && typeof errors.workGender === 'string' ? errors.workGender : ' '}
                    </Text>
                  </View>

                  <Text style={styles.subtitleSmall}>
                    {t('BarberRegistrationScreen.specializations')}
                  </Text>
                  {!values.workGender ? (
                    <Text style={styles.helperText}>
                      {t('BarberRegistrationScreen.selectWorkGenderHelper')}
                    </Text>
                  ) : isLoadingTags ? (
                    <View style={styles.tagsLoader}>
                      <ActivityIndicator size="large" color="#00BCD4" />
                    </View>
                  ) : (
                    <View style={styles.taglioGrid}>
                      {filteredTags.map((taglio) => {
                        const isSelected = values.typesCut.includes(taglio.id);
                        return (
                          <TouchableOpacity
                            key={taglio.id}
                            style={[styles.taglioCard, isSelected && styles.taglioCardActive]}
                            onPress={() => {
                              const updated = isSelected
                                ? values.typesCut.filter((id) => id !== taglio.id)
                                : [...values.typesCut, taglio.id];
                              setFieldValue('typesCut', updated);
                            }}
                          >
                            <Text style={styles.taglioName}>
                              {i18n.language === 'en-UK'
                                ? taglio?.label?.en ?? taglio.id
                                : taglio?.label?.it ?? taglio?.label?.en ?? taglio.id}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                  <Text style={errStyle(touched.typesCut, errors.typesCut)}>
                    {touched.typesCut && typeof errors.typesCut === 'string' ? errors.typesCut : ' '}
                  </Text>
                </View>

                <View style={styles.sectionBox}>
                  <Text style={styles.sectionTitle}>
                    {t('BarberRegistrationScreen.contactsAndBooking')}
                  </Text>

                  <View style={styles.inputContainer}>
                    <TextInput
                      label={t('BarberRegistrationScreen.phonePlaceholder')}
                      placeholder={t('BarberRegistrationScreen.phonePlaceholder')}
                      {...commonProps}
                      value={values.phoneNumber}
                      onChangeText={handleChange('phoneNumber')}
                      onBlur={handleBlur('phoneNumber')}
                      keyboardType="phone-pad"
                    />
                    <Text style={errStyle(touched.phoneNumber, errors.phoneNumber)}>
                      {touched.phoneNumber && typeof errors.phoneNumber === 'string' ? errors.phoneNumber : ' '}
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <TextInput
                      label={t('BarberRegistrationScreen.websitePlaceholder')}
                      placeholder={t('BarberRegistrationScreen.websitePlaceholder')}
                      {...commonProps}
                      value={values.website}
                      onChangeText={handleChange('website')}
                      onBlur={handleBlur('website')}
                      keyboardType="url"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <TextInput
                      label={t('BarberRegistrationScreen.emailBookingPlaceholder')}
                      placeholder={t('BarberRegistrationScreen.emailBookingPlaceholder')}
                      {...commonProps}
                      value={values.contactEmail}
                      onChangeText={handleChange('contactEmail')}
                      onBlur={handleBlur('contactEmail')}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <Text style={errStyle(touched.contactEmail, errors.contactEmail)}>
                      {touched.contactEmail && typeof errors.contactEmail === 'string' ? errors.contactEmail : ' '}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.registerButton, isSubmitting && styles.registerButtonDisabled]}
                  onPress={formikSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#00BCD4" />
                  ) : (
                    <Text style={styles.registerButtonText}>
                      {t('CompleteBarberProfileScreen.submitButton')}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelLink} onPress={handleCancel}>
                  <Text style={styles.cancelText}>
                    {t('CompleteBarberProfileScreen.cancel')}
                  </Text>
                </TouchableOpacity>
              </>
            );
          }}
        </Formik>
      </ScrollView>
    </SafeAreaView>
  );
}

const errStyle = (touched, error) => ({
  color: 'red',
  fontSize: 12,
  display: touched && error ? 'flex' : 'none',
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingHorizontal: 20, paddingVertical: 40 },
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
    marginBottom: 24,
  },
  subtitleSmall: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 14,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 15,
    marginTop: 4,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 10,
  },
  helperText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: { marginBottom: 15 },
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
  },
  genderButtonActive: {
    backgroundColor: 'rgba(0, 188, 212, 0.15)',
    borderColor: 'rgba(0, 188, 212, 0.5)',
  },
  genderText: { fontSize: 16, color: '#334155', fontWeight: '500' },
  genderTextActive: { color: '#00BCD4', fontWeight: 'bold' },
  tagsLoader: {
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  taglioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
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
  },
  taglioCardActive: {
    backgroundColor: 'rgba(0, 188, 212, 0.15)',
    borderColor: 'rgba(0, 188, 212, 0.5)',
  },
  taglioName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
  },
  sectionBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  registerButton: {
    backgroundColor: 'rgba(0, 188, 212, 0.35)',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 188, 212, 0.7)',
  },
  registerButtonDisabled: { opacity: 0.7 },
  registerButtonText: { color: '#00BCD4', fontSize: 18, fontWeight: 'bold' },
  cancelLink: { marginTop: 18, marginBottom: 20, alignItems: 'center' },
  cancelText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
});
