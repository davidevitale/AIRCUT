import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,

  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { registerClient } from '../../services/authService';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Checkbox, TextInput } from 'react-native-paper';
import { Formik } from 'formik';
import * as Yup from "yup";
import { changeLanguage } from 'i18next';
import { router } from 'expo-router';




export default function RegisterClientScreen({ }) {
  const { t, i18n } = useTranslation();
  const [isRegistering, setIsRegistering] = useState(false);
  const validationSchema = Yup.object().shape({
    email: Yup.string()
      .email(t("ClientRegistrationScreen.emailValidation"))
      .required(t("ClientRegistrationScreen.requiredValidation")),

    password: Yup.string()
      .min(8, t("ClientRegistrationScreen.passwordValidation"))
      .required(t("ClientRegistrationScreen.requiredValidation")),

    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password')], t("ClientRegistrationScreen.confirmPasswordValidation"))
      .required(t("ClientRegistrationScreen.requiredValidation")),

    userName: Yup.string()
      .min(3, t("ClientRegistrationScreen.userNameValidation"))
      .required(t("ClientRegistrationScreen.requiredValidation")),

    sex: Yup.string()
      .oneOf(['M', 'F', 'ALTRO'], t("ClientRegistrationScreen.sexValidation"))
      .required(t("ClientRegistrationScreen.requiredValidation")),

    preferenceCut: Yup.array()
      .min(1, t('ClientRegistrationScreen.preferenceCutValidation'))
      .required(t("ClientRegistrationScreen.requiredValidation")),

    termsService: Yup.boolean()
      .oneOf([true], t("ClientRegistrationScreen.termsServiceValidation")),
  });
  const [tags, setTags] = useState([])
  const scrollViewRef = useRef(null);

  const fetchAllTags = async () => {
    try {
      const tagsRef = collection(db, "tags");
      const querySnapshot = await getDocs(tagsRef);

      const tags = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // console.log("Fetched tags:", JSON.stringify(tags, null, 2));
      setTags(tags)

    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const filterTags = (sex) => {
    return tags.filter(tag => {
      if (!tag.active) return false;

      if (sex === "M") {
        return tag.visibility === "male_unisex";
      }

      if (sex === "F" || sex === "ALTRO") {
        return (
          tag.visibility === "male_unisex" ||
          tag.visibility === "female"
        );
      }
      return false;
    });
  };

  const handleRegister = async (values) => {
    if (isRegistering) return;
    setIsRegistering(true);

    try {
      await registerClient(values);
      Alert.alert(
        t('ClientRegistrationScreen.successTitle'),
        t('ClientRegistrationScreen.successMessage'),
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/(protected)');
            },
          },
        ]
      );
    } catch (error) {
      const knownErrorKeys = [
        'emailAlreadyExist',
        'passwordWeak',
        'invalidEmail',
        'notAllowed',
      ];


      let message;


      if (knownErrorKeys.includes(error.message)) {
        message = t(`ClientRegistrationScreen.${error.message}`);
      } else {
        // Fallback: show original error message
        message = error.message || t('common.genericError');
      }

      Alert.alert(
        t('ClientRegistrationScreen.errorTitle'),
        message
      );
    } finally {
      setIsRegistering(false);
    }
  };

  const commonProps = {
    mode: "outlined",
    outlineColor: "#00BCD4",
    activeOutlineColor: "#00BCD4",
    placeholderTextColor: "#737373",
    textColor: "#737373",
    cursorColor: "#737373",
    contentStyle: {
      fontSize: 14,
      color: "#737373",
    },
    style: {
      height: 48,
      backgroundColor: "#ffffff",
      fontSize: 14,
    },
    outlineStyle: {
      borderRadius: 4,
      borderColor: "rgba(0, 188, 212, 0.2)",
    },
  }

  useEffect(() => {
    fetchAllTags()
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} ref={scrollViewRef}>
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                router.back()
              }}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text onPress={() => {
              changeLanguage(i18n.language === "en-UK" ? "it-IT" : "en-UK")
            }} style={styles.title}>aircut</Text>
            <View style={{ width: 44 }} />
          </View>
          <Formik
            initialValues={{
              email: '', password: '', confirmPassword: '', userName: '', sex: "", preferenceCut: [], termsService: false, role: 'client',
              accountType: 'client',
              roleCode: 0, // 0 for client
              createdAt: new Date().toISOString(),
            }}
            validationSchema={validationSchema}
            onSubmit={(values) => {
              const payload = {
                ...values,
                liabilityAccepted: values.termsService,
              };
              // return console.log(payload)
              handleRegister(payload)
            }}>
            {({ handleChange,
              handleBlur,
              handleSubmit,
              setFieldValue,
              values,
              errors,
              touched }) => {
              const filteredTags = useMemo(
                () => filterTags(values.sex),
                [values.sex]
              );
              return (
                <>
                  <View style={styles.sectionBox}>
                    <Text style={styles.sectionTitle}>{t('ClientRegistrationScreen.Credentials')}</Text>

                    <View style={styles.inputContainer}>

                      <TextInput
                        label={t('ClientRegistrationScreen.emailPlaceholder')}
                        placeholder={t('ClientRegistrationScreen.emailPlaceholder')}
                        {...commonProps}
                        onChangeText={handleChange("email")}
                        onBlur={handleBlur("email")}
                        value={values.email}
                        autoCapitalize='none'
                        keyboardType='email-address'
                      />
                      <Text
                        style={{
                          color: "red",
                          fontSize: 12,
                          display: touched.email && errors.email ? 'flex' : 'none'

                        }}
                      >
                        {touched.email && typeof errors.email === "string"
                          ? errors.email
                          : " "}
                      </Text>
                    </View>

                    <View style={styles.inputContainer}>
                      <TextInput
                        label={t('ClientRegistrationScreen.passwordPlaceholder')}
                        placeholder={t('ClientRegistrationScreen.passwordPlaceholder')}
                        {...commonProps}
                        onChangeText={handleChange("password")}
                        onBlur={handleBlur("password")}
                        value={values.password}
                        secureTextEntry
                        keyboardType="default"
                        autoCapitalize="none"
                      />
                      <Text
                        style={{
                          color: "red",
                          fontSize: 12,
                          display: touched.email && errors.email ? 'flex' : 'none'
                        }}
                      >
                        {touched.password && typeof errors.password === "string"
                          ? errors.password
                          : " "}
                      </Text>
                    </View>

                    <View style={styles.inputContainer}>
                      <TextInput
                        label={t('ClientRegistrationScreen.ConfirmPasswordPlaceholder')}
                        placeholder={t('ClientRegistrationScreen.ConfirmPasswordPlaceholder')}
                        {...commonProps}
                        onChangeText={handleChange("confirmPassword")}
                        onBlur={handleBlur("confirmPassword")}
                        value={values.confirmPassword}
                        secureTextEntry
                        keyboardType="default"
                        autoCapitalize="none"
                      />
                      <Text
                        style={{
                          color: "red",
                          fontSize: 12,
                          display: touched.email && errors.email ? 'flex' : 'none'
                        }}
                      >
                        {touched.confirmPassword && typeof errors.confirmPassword === "string"
                          ? errors.confirmPassword
                          : " "}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.sectionBox}>
                    <Text style={styles.sectionTitle}>{t('ClientRegistrationScreen.personalData')}</Text>

                    <View style={styles.inputContainer}>
                      <TextInput
                        label={t('ClientRegistrationScreen.userNamePlaceholder')}
                        placeholder={t('ClientRegistrationScreen.userNamePlaceholder')}
                        {...commonProps}
                        onChangeText={handleChange("userName")}
                        onBlur={handleBlur("userName")}
                        value={values.userName}
                      />
                      <Text style={{ color: "red", fontSize: 12, display: touched.email && errors.email ? 'flex' : 'none' }}>
                        {touched.userName && typeof errors.userName === "string"
                          ? errors.userName
                          : " "}
                      </Text>
                    </View>


                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>
                        {t('ClientRegistrationScreen.typePlaceholder')}
                      </Text>

                      <View style={styles.genderContainer}>
                        <TouchableOpacity
                          style={[
                            styles.genderButton,
                            values.sex === 'M' && styles.genderButtonActive
                          ]}
                          onPress={() => { setFieldValue('sex', 'M') }}
                        >
                          <Text
                            style={[
                              styles.genderText,
                              values.sex === 'M' && styles.genderTextActive
                            ]}
                          >
                            {t('ClientRegistrationScreen.M')}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.genderButton,
                            values.sex === 'F' && styles.genderButtonActive
                          ]}
                          onPress={() => { setFieldValue('sex', 'F') }}
                        >
                          <Text
                            style={[
                              styles.genderText,
                              values.sex === 'F' && styles.genderTextActive
                            ]}
                          >
                            {t('ClientRegistrationScreen.F')}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.genderButton,
                            values.sex === 'ALTRO' && styles.genderButtonActive
                          ]}
                          onPress={() => { setFieldValue('sex', 'ALTRO') }}
                        >
                          <Text
                            style={[
                              styles.genderText,
                              values.sex === 'ALTRO' && styles.genderTextActive
                            ]}
                          >
                            {t('ClientRegistrationScreen.ALTRO')}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={{ color: "red", fontSize: 12, display: touched.email && errors.email ? 'flex' : 'none' }}>
                        {touched.sex && typeof errors.sex === "string"
                          ? errors.sex
                          : " "}
                      </Text>
                    </View>
                  </View>


                  {values.sex && (
                    <View style={styles.sectionBox}>
                      <Text style={styles.sectionTitle}>
                        {t('ClientRegistrationScreen.preferences')}
                      </Text>

                      <Text style={styles.subtitle}>
                        {t('ClientRegistrationScreen.MultipleSelectionPlaceholder')}
                      </Text>

                      <View style={styles.taglioGrid}>
                        {filteredTags.map((taglio) => {
                          const isSelected = values.preferenceCut.includes(taglio.id)
                          return (
                            <TouchableOpacity
                              key={taglio.id}
                              style={[
                                styles.taglioCard,
                                isSelected && styles.taglioCardActive
                              ]}
                              onPress={() => {
                                const updated = isSelected
                                  ? values.preferenceCut.filter(id => id !== taglio.id)
                                  : [...values.preferenceCut, taglio.id]

                                setFieldValue('preferenceCut', updated)
                              }}
                            >
                              <Text style={styles.taglioName}>
                                {i18n.language === 'en-UK'
                                  ? taglio.label.en
                                  : taglio.label.it}
                              </Text>
                            </TouchableOpacity>
                          )
                        })}
                      </View>

                      <Text style={{ color: "red", fontSize: 12 }}>
                        {touched.preferenceCut && typeof errors.preferenceCut === "string"
                          ? errors.preferenceCut
                          : " "}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.sectionBox, { flexDirection: 'row' }]}>
                    <Checkbox.Android
                      uncheckedColor="rgba(0, 188, 212, 0.7)"
                      color="#00BCD4"
                      status={values.termsService ? 'checked' : 'unchecked'}
                      onPress={() =>
                        setFieldValue('termsService', !values.termsService)
                      }
                    />

                    <Text style={styles.checkboxLabel}>
                      {t('BarberRegistrationScreen.termsAndConditions')}
                    </Text>
                  </View>

                  <Text style={{ color: "red", fontSize: 12 }}>
                    {touched.termsService && typeof errors.termsService === "string"
                      ? errors.termsService
                      : " "}
                  </Text>

                  <TouchableOpacity style={[styles.registerButton, isRegistering && styles.registerButtonDisabled]} onPress={() => {
                    handleSubmit()
                  }} disabled={isRegistering}>
                    {isRegistering ? (
                      <ActivityIndicator color="#00BCD4" />
                    ) : (
                      <Text style={styles.registerButtonText}>{t('ClientRegistrationScreen.registerButton')}</Text>
                    )}
                  </TouchableOpacity>
                </>
              )
            }
            }
          </Formik>


          <View style={styles.loginSection}>
            <Text style={styles.loginText}>{t('ClientRegistrationScreen.haveAccount')}</Text>
            <TouchableOpacity onPress={() => {
              router.back()
              // router.replace('/auth');

            }}>
              <Text style={styles.loginLink}>{t('ClientRegistrationScreen.login')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView >
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
    // padding: 20,
    marginBottom: 20,

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
  registerButtonDisabled: {
    opacity: 0.7,
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
