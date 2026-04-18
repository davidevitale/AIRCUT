import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { registerBarber } from "../../services/authService";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Checkbox, TextInput } from "react-native-paper";
import { router } from "expo-router";
import { Formik } from "formik";
import * as Yup from "yup";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../config/firebase";

export default function RegisterBarberScreen({ onGoToLogin }) {
  const { t, i18n } = useTranslation();
  const [tags, setTags] = useState([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  const validationSchema = Yup.object().shape({
    email: Yup.string()
      .email(t("BarberRegistrationScreen.emailValidation"))
      .required(t("BarberRegistrationScreen.required")),

    password: Yup.string()
      .min(8, t("BarberRegistrationScreen.passwordValidation"))
      .required(t("BarberRegistrationScreen.required")),

    confirmPassword: Yup.string()
      .oneOf([Yup.ref("password")], t("BarberRegistrationScreen.confirmPasswordValidation"))
      .required(t("BarberRegistrationScreen.required")),

    firstName: Yup.string()
      .min(2, t("BarberRegistrationScreen.firstNameValidation"))
      .required(t("BarberRegistrationScreen.required")),

    lastName: Yup.string()
      .min(2, t("BarberRegistrationScreen.lastNameValidation"))
      .required(t("BarberRegistrationScreen.required")),

    workGender: Yup.string()
      .oneOf(["male", "female", "unisex"], t("BarberRegistrationScreen.required"))
      .required(t("BarberRegistrationScreen.required")),

    salonName: Yup.string()
      .min(2, t("BarberRegistrationScreen.salonNameValidation"))
      .required(t("BarberRegistrationScreen.required")),

    salonAddress: Yup.string()
      .min(3, t("BarberRegistrationScreen.salonAddressNameValidation"))
      .required(t("BarberRegistrationScreen.required")),

    typesCut: Yup.array()
      .min(1, t("BarberRegistrationScreen.typesCut"))
      .required(t("BarberRegistrationScreen.required")),

    phoneNumber: Yup.string()
      .min(9, t("BarberRegistrationScreen.phoneNumber"))
      .required(t("BarberRegistrationScreen.required")),

    contactEmail: Yup.string()
      .email(t("BarberRegistrationScreen.contactEmail"))
      .required(t("BarberRegistrationScreen.required")),

    termsService: Yup.boolean().oneOf(
      [true],
      t("BarberRegistrationScreen.termsServiceValidation")
    ),
  });

  const fetchAllTags = async () => {
    setIsLoadingTags(true);
    try {
      const tagsRef = collection(db, "tags");
      const querySnapshot = await getDocs(tagsRef);
      const allTags = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setTags(allTags);
    } catch (error) {
      console.error("Error fetching tags:", error);
    } finally {
      setIsLoadingTags(false);
    }
  };

  const getFilteredTagsByWorkGender = (allTags = [], workGender) => {
    return allTags.filter((tag) => {
      if (!tag.active || !workGender) {
        return false;
      }

      if (workGender === "male") {
        return tag.visibility === "male" || tag.visibility === "male_unisex";
      }

      if (workGender === "female") {
        return tag.visibility === "female";
      }

      if (workGender === "unisex") {
        return (
          tag.visibility === "male" ||
          tag.visibility === "male_unisex" ||
          tag.visibility === "female"
        );
      }

      return false;
    });
  };


  const buildLocalizedTypesCut = (selectedIds = []) => {
    return selectedIds
      .map((tagId) => {
        const tag = tags.find((item) => item.id === tagId);

        if (!tag) {
          return null;
        }

        return {
          id: tag.id,
          en: tag.label?.en ?? tag.id,
          it: tag.label?.it ?? tag.label?.en ?? tag.id,
        };
      })
      .filter(Boolean);
  };

  const handleRegister = async (values) => {
    // return console.log(JSON.stringify(values, null, 2))
    if (isRegistering) return;
    setIsRegistering(true);
    try {
      await registerBarber(values);
      Alert.alert(
        t("BarberRegistrationScreen.successTitle"),
        t("BarberRegistrationScreen.successMessage"),
        [
          {
            text: "OK",
            onPress: () => {
              router.replace("/(protected)");
            },
          },
        ]
      );
    } catch (error) {
      const knownErrorKeys = [
        "emailAlreadyExist",
        "passwordWeak",
        "invalidEmail",
        "notAllowed",
        "salonNameExists",
      ];

      let message;

      if (knownErrorKeys.includes(error.message)) {
        message = t(`BarberRegistrationScreen.${error.message}`);
      } else {
        message = error.message || t("common.genericError");
      }

      Alert.alert(t("BarberRegistrationScreen.errorTitle"), message);
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
  };

  useEffect(() => {
    fetchAllTags();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Formik
          initialValues={{
            email: "",
            password: "",
            confirmPassword: "",
            firstName: "",
            lastName: "",
            workGender: "",
            salonName: "",
            salonAddress: "",
            typesCut: [],
            phoneNumber: "",
            website: "",
            contactEmail: "",
            termsService: false,
            role: "barber",
            accountType: "barber",
            roleCode: 1,
            createdAt: new Date().toISOString(),
          }}
          validationSchema={validationSchema}
          onSubmit={(values) => {
            const payload = {
              ...values,
              typesCut: buildLocalizedTypesCut(values.typesCut),
              liabilityAccepted: values.termsService,
            };
            handleRegister(payload);
          }}
        >
          {({ handleChange, handleBlur, handleSubmit, setFieldValue, values, errors, touched }) => {
            const filteredTags = getFilteredTagsByWorkGender(tags, values.workGender);
            return (
              <>
                <View style={styles.headerRow}>
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                      router.back();
                    }}
                  >
                    <Text style={styles.backButtonText}>{"<"}</Text>
                  </TouchableOpacity>
                  <Text style={styles.title}>aircut</Text>
                  <View style={{ width: 44 }} />
                </View>

                <View style={styles.sectionBox}>
                  <Text style={styles.sectionTitle}>
                    {t("BarberRegistrationScreen.Credentials")}
                  </Text>

                  <View style={styles.inputContainer}>
                    <TextInput
                      label={t("BarberRegistrationScreen.emailPlaceholder")}
                      placeholder={t("BarberRegistrationScreen.emailPlaceholder")}
                      {...commonProps}
                      value={values.email}
                      onChangeText={handleChange("email")}
                      onBlur={handleBlur("email")}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <Text style={{ color: "red", fontSize: 12, display: touched.email && errors.email ? "flex" : "none" }}>
                      {touched.email && typeof errors.email === "string" ? errors.email : " "}
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <TextInput
                      label={t("BarberRegistrationScreen.passwordPlaceholder")}
                      placeholder={t("BarberRegistrationScreen.passwordPlaceholder")}
                      {...commonProps}
                      value={values.password}
                      onChangeText={handleChange("password")}
                      onBlur={handleBlur("password")}
                      secureTextEntry
                      keyboardType="default"
                      autoCapitalize="none"
                    />
                    <Text style={{ color: "red", fontSize: 12, display: touched.password && errors.password ? "flex" : "none" }}>
                      {touched.password && typeof errors.password === "string" ? errors.password : " "}
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <TextInput
                      label={t("BarberRegistrationScreen.confirmPasswordPlaceholder")}
                      placeholder={t("BarberRegistrationScreen.confirmPasswordPlaceholder")}
                      {...commonProps}
                      value={values.confirmPassword}
                      onChangeText={handleChange("confirmPassword")}
                      onBlur={handleBlur("confirmPassword")}
                      secureTextEntry
                      keyboardType="default"
                      autoCapitalize="none"
                    />
                    <Text style={{ color: "red", fontSize: 12, display: touched.confirmPassword && errors.confirmPassword ? "flex" : "none" }}>
                      {touched.confirmPassword && typeof errors.confirmPassword === "string" ? errors.confirmPassword : " "}
                    </Text>
                  </View>
                </View>

                <View style={styles.sectionBox}>
                  <Text style={styles.sectionTitle}>
                    {t("BarberRegistrationScreen.personalData")}
                  </Text>

                  <View style={styles.inputContainer}>
                    <TextInput
                      label={t("BarberRegistrationScreen.BarberFirstNamePlaceholder")}
                      placeholder={t("BarberRegistrationScreen.BarberFirstNamePlaceholder")}
                      {...commonProps}
                      value={values.firstName}
                      onChangeText={handleChange("firstName")}
                      onBlur={handleBlur("firstName")}
                    />
                    <Text style={{ color: "red", fontSize: 12, display: touched.firstName && errors.firstName ? "flex" : "none" }}>
                      {touched.firstName && typeof errors.firstName === "string" ? errors.firstName : " "}
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <TextInput
                      label={t("BarberRegistrationScreen.BarberLastNamePlaceholder")}
                      placeholder={t("BarberRegistrationScreen.BarberLastNamePlaceholder")}
                      {...commonProps}
                      value={values.lastName}
                      onChangeText={handleChange("lastName")}
                      onBlur={handleBlur("lastName")}
                    />
                    <Text style={{ color: "red", fontSize: 12, display: touched.lastName && errors.lastName ? "flex" : "none" }}>
                      {touched.lastName && typeof errors.lastName === "string" ? errors.lastName : " "}
                    </Text>
                  </View>



                  <View style={styles.inputContainer}>
                    <TextInput
                      label={t("BarberRegistrationScreen.studioNamePlaceholder")}
                      placeholder={t("BarberRegistrationScreen.studioNamePlaceholder")}
                      {...commonProps}
                      value={values.salonName}
                      onChangeText={handleChange("salonName")}
                      onBlur={handleBlur("salonName")}
                    />
                    <Text style={{ color: "red", fontSize: 12, display: touched.salonName && errors.salonName ? "flex" : "none" }}>
                      {touched.salonName && typeof errors.salonName === "string" ? errors.salonName : " "}
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <TextInput
                      label={t("BarberRegistrationScreen.addressPlaceholder")}
                      placeholder={t("BarberRegistrationScreen.addressPlaceholder")}
                      {...commonProps}
                      value={values.salonAddress}
                      onChangeText={handleChange("salonAddress")}
                      onBlur={handleBlur("salonAddress")}
                    />
                    <Text style={{ color: "red", fontSize: 12, display: touched.salonAddress && errors.salonAddress ? "flex" : "none" }}>
                      {touched.salonAddress && typeof errors.salonAddress === "string" ? errors.salonAddress : " "}
                    </Text>
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.fieldLabel}>
                      {t("BarberRegistrationScreen.workGenderLabel")}
                    </Text>
                    <View style={styles.genderContainer}>
                      <TouchableOpacity
                        style={[
                          styles.genderButton,
                          values.workGender === "male" && styles.genderButtonActive,
                        ]}
                        onPress={() => {
                          setFieldValue("workGender", "male");
                          setFieldValue("typesCut", []);
                        }}
                      >
                        <Text
                          style={[
                            styles.genderText,
                            values.workGender === "male" && styles.genderTextActive,
                          ]}
                        >
                          {t("BarberRegistrationScreen.workGenderMale")}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.genderButton,
                          values.workGender === "female" && styles.genderButtonActive,
                        ]}
                        onPress={() => {
                          setFieldValue("workGender", "female");
                          setFieldValue("typesCut", []);
                        }}
                      >
                        <Text
                          style={[
                            styles.genderText,
                            values.workGender === "female" && styles.genderTextActive,
                          ]}
                        >
                          {t("BarberRegistrationScreen.workGenderFemale")}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.genderButton,
                          values.workGender === "unisex" && styles.genderButtonActive,
                        ]}
                        onPress={() => {
                          setFieldValue("workGender", "unisex");
                          setFieldValue("typesCut", []);
                        }}
                      >
                        <Text
                          style={[
                            styles.genderText,
                            values.workGender === "unisex" && styles.genderTextActive,
                          ]}
                        >
                          {t("BarberRegistrationScreen.workGenderUnisex")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={{ color: "red", fontSize: 12, display: touched.workGender && errors.workGender ? "flex" : "none" }}>
                      {touched.workGender && typeof errors.workGender === "string" ? errors.workGender : " "}
                    </Text>
                  </View>

                  <Text style={styles.subtitle}>
                    {t("BarberRegistrationScreen.specializations")}
                  </Text>
                  {!values.workGender ? (
                    <Text style={styles.helperText}>
                      {t("BarberRegistrationScreen.selectWorkGenderHelper")}
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
                              setFieldValue("typesCut", updated);
                            }}
                          >
                            <Text style={styles.taglioName}>
                              {i18n.language === "en-UK"
                                ? taglio?.label?.en ?? taglio.id
                                : taglio?.label?.it ?? taglio?.label?.en ?? taglio.id}
                            </Text>
                            <Text style={styles.taglioDescription}>
                              {i18n.language === "en-UK"
                                ? taglio?.description?.en ?? ""
                                : taglio?.description?.it ?? taglio?.description?.en ?? ""}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                  <Text style={{ color: "red", fontSize: 12, display: touched.typesCut && errors.typesCut ? "flex" : "none" }}>
                    {touched.typesCut && typeof errors.typesCut === "string" ? errors.typesCut : " "}
                  </Text>
                </View>

                <View style={styles.sectionBox}>
                  <Text style={styles.sectionTitle}>
                    {t("BarberRegistrationScreen.contactsAndBooking")}
                  </Text>

                  <View style={styles.inputContainer}>
                    <TextInput
                      label={t("BarberRegistrationScreen.phonePlaceholder")}
                      placeholder={t("BarberRegistrationScreen.phonePlaceholder")}
                      {...commonProps}
                      value={values.phoneNumber}
                      onChangeText={handleChange("phoneNumber")}
                      onBlur={handleBlur("phoneNumber")}
                      keyboardType="phone-pad"
                    />
                    <Text style={{ color: "red", fontSize: 12, display: touched.phoneNumber && errors.phoneNumber ? "flex" : "none" }}>
                      {touched.phoneNumber && typeof errors.phoneNumber === "string" ? errors.phoneNumber : " "}
                    </Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <TextInput
                      label={t("BarberRegistrationScreen.websitePlaceholder")}
                      placeholder={t("BarberRegistrationScreen.websitePlaceholder")}
                      {...commonProps}
                      value={values.website}
                      onChangeText={handleChange("website")}
                      onBlur={handleBlur("website")}
                      keyboardType="url"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <TextInput
                      label={t("BarberRegistrationScreen.emailBookingPlaceholder")}
                      placeholder={t("BarberRegistrationScreen.emailBookingPlaceholder")}
                      {...commonProps}
                      value={values.contactEmail}
                      onChangeText={handleChange("contactEmail")}
                      onBlur={handleBlur("contactEmail")}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <Text style={{ color: "red", fontSize: 12, display: touched.contactEmail && errors.contactEmail ? "flex" : "none" }}>
                      {touched.contactEmail && typeof errors.contactEmail === "string" ? errors.contactEmail : " "}
                    </Text>
                  </View>
                </View>

                <View style={[styles.sectionBox, { flexDirection: "row" }]}>
                  <Checkbox.Android
                    uncheckedColor="rgba(0, 188, 212, 0.7)"
                    color="#00BCD4"
                    status={values.termsService ? "checked" : "unchecked"}
                    onPress={() => setFieldValue("termsService", !values.termsService)}
                  />
                  <Text style={styles.checkboxLabel}>
                    {t("BarberRegistrationScreen.termsAndConditions")}
                  </Text>
                </View>
                <Text style={{ color: "red", fontSize: 12, display: touched.termsService && errors.termsService ? "flex" : "none" }}>
                  {touched.termsService && typeof errors.termsService === "string" ? errors.termsService : " "}
                </Text>

                <TouchableOpacity
                  style={[styles.registerButton, isRegistering && styles.registerButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={isRegistering}
                >
                  {isRegistering ? (
                    <ActivityIndicator color="#00BCD4" />
                  ) : (
                    <Text style={styles.registerButtonText}>
                      {t("BarberRegistrationScreen.registerButton")}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            );
          }}
        </Formik>

        <View style={styles.loginSection}>
          <Text style={styles.loginText}>
            {t("ClientRegistrationScreen.haveAccount")}
          </Text>
          <TouchableOpacity onPress={onGoToLogin}>
            <Text style={styles.loginLink}>
              {t("ClientRegistrationScreen.login")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  checkboxLabel: { paddingRight: 20 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 20,
    color: "#000",
    fontWeight: "bold",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#00BCD4",
    textAlign: "center",
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 15,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: "#334155",
    marginBottom: 20,
    textAlign: "center",
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 10,
  },
  helperText: {
    fontSize: 14,
    color: "#475569",
    textAlign: "center",
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  genderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  genderButton: {
    flex: 1,
    height: 50,
    borderWidth: 1.5,
    borderColor: "rgba(0, 188, 212, 0.2)",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(248, 248, 248, 0.6)",
    shadowColor: "#00BCD4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  genderButtonActive: {
    backgroundColor: "rgba(0, 188, 212, 0.15)",
    borderColor: "rgba(0, 188, 212, 0.5)",
  },
  genderText: {
    fontSize: 16,
    color: "#334155",
    fontWeight: "500",
  },
  genderTextActive: {
    color: "#00BCD4",
    fontWeight: "bold",
  },
  tagsLoader: {
    minHeight: 120,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  taglioGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  taglioCard: {
    width: "48%",
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  taglioCardActive: {
    backgroundColor: "rgba(0, 188, 212, 0.15)",
    borderColor: "rgba(0, 188, 212, 0.5)",
  },
  taglioName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 5,
    textAlign: "center",
  },
  taglioDescription: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 16,
    textAlign: "center",
  },
  sectionBox: {
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  registerButton: {
    backgroundColor: "rgba(0, 188, 212, 0.35)",
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
    borderWidth: 1.5,
    borderColor: "rgba(0, 188, 212, 0.7)",
    shadowColor: "#00BCD4",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: "#00BCD4",
    fontSize: 18,
    fontWeight: "bold",
  },
  loginSection: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 20,
  },
  loginText: {
    fontSize: 16,
    color: "#334155",
  },
  loginLink: {
    fontSize: 16,
    color: "#00BCD4",
    fontWeight: "bold",
    marginLeft: 5,
  },
});
