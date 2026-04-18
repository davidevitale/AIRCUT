import React, { useState, useEffect, useCallback } from "react";
import { router } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  FlatList,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  logoutUser,
  getCurrentUserData,
  updateBarberPortfolio,
} from "../../services/authService";
import {
  pickImages,
  pickVideos,
  uploadMultipleFiles,
} from "../../services/mediaService";
import LanguageToggle from "../../components/LanguageToggle";
import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { auth, db } from "../../../config/firebase";
import { deleteObject, getStorage, listAll, ref } from "firebase/storage";
import { useFocusEffect } from "@react-navigation/native";


export default function BarberAccountScreen({
  userData: propUserData,
  onLogout,
  navigate,
}) {

  const { t, i18n } = useTranslation();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [newService, setNewService] = useState({ name: "", price: "" });
  const [editingService, setEditingService] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [localProfileUri, setLocalProfileUri] = useState(null);
  const [barberPosts, setBarberPosts] = useState([]);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    console.log("BarberAccountScreen received userData:", propUserData);
    if (propUserData) {
      setUserData(propUserData);
      setCurrentUser(auth.currentUser || null);
      setLoading(false);
    } else {
      loadUserData();
    }
  }, [propUserData]);

  const loadUserData = async () => {
    try {
      const data = await getCurrentUserData();
      console.log("Loaded user data from service:", JSON.stringify(data.userData, null, 2));
      if (data && data.role === "barber") {
        setUserData(data.userData);
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error("Errore nel caricamento dati:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddImages = async () => {
    try {
      const images = await pickImages(true);
      if (images && currentUser) {
        setUploading(true);

        const uploadedImages = await uploadMultipleFiles(
          images,
          currentUser.uid,
          "portfolio/images",
          (current, total) => {
            // Progresso upload
            console.log(`Upload ${current}/${total}`);
          },
        );

        if (uploadedImages.length > 0) {
          // Estrai solo gli URL dalle immagini caricate
          const imageUrls = uploadedImages.map((img) => img.url);

          const updatedImages = [
            ...(userData.portfolioImages || []),
            ...imageUrls,
          ];

          await updateBarberPortfolio(currentUser.uid, {
            portfolioImages: updatedImages,
          });

          setUserData((prev) => ({
            ...prev,
            portfolioImages: updatedImages,
          }));

          Alert.alert(
            t("BarberAccountScreen.successTitle"),
            t("BarberAccountScreen.imagesUploaded", { count: uploadedImages.length }),
          );
        }
      }
    } catch (error) {
      console.error("handleAddImages error:", error);
      Alert.alert(
        t("BarberAccountScreen.errorTitle"),
        t("BarberAccountScreen.imageUploadError", {
          message: error?.message || t("BarberAccountScreen.unknownError"),
        }),
      );
    } finally {
      setUploading(false);
    }
  };

  const handleAddVideos = async () => {
    try {
      const videos = await pickVideos(true);
      if (videos && currentUser) {
        setUploading(true);

        const uploadedVideos = await uploadMultipleFiles(
          videos,
          currentUser.uid,
          "portfolio/videos",
          (current, total) => {
            console.log(`Upload ${current}/${total}`);
          },
        );

        if (uploadedVideos.length > 0) {
          // Estrai solo gli URL dai video caricati
          const videoUrls = uploadedVideos.map((vid) => vid.url);

          const updatedVideos = [
            ...(userData.portfolioVideos || []),
            ...videoUrls,
          ];

          await updateBarberPortfolio(currentUser.uid, {
            portfolioVideos: updatedVideos,
          });

          setUserData((prev) => ({
            ...prev,
            portfolioVideos: updatedVideos,
          }));

          Alert.alert(
            t("BarberAccountScreen.successTitle"),
            t("BarberAccountScreen.videosUploaded", { count: uploadedVideos.length }),
          );
        }
      }
    } catch (error) {
      console.error("handleAddVideos error:", error);
      Alert.alert(
        t("BarberAccountScreen.errorTitle"),
        t("BarberAccountScreen.videoUploadError", {
          message: error?.message || t("BarberAccountScreen.unknownError"),
        }),
      );
    } finally {
      setUploading(false);
    }
  };

  const deletePost = async (postId) => {
    setDeleting(true)               // Renamed to deletePost for clarity
    try {
      const storage = getStorage();

      // 1. Delete all images from Storage folder: posts/{postId}
      const folderRef = ref(storage, `posts/${postId}`);

      const result = await listAll(folderRef);

      // Delete every file inside the folder
      const deletePromises = result.items.map((itemRef) => deleteObject(itemRef));

      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
        console.log(`✅ Storage folder deleted: posts/${postId}`);
      } else {
        console.log('No files found in storage folder');
      }

      // 2. Delete the Firestore document (this removes the URLs)
      const postRef = doc(db, 'posts', postId);
      await deleteDoc(postRef);

      console.log(`✅ Firestore document deleted: posts/${postId}`);

      setDeleting(false)
      Alert.alert('Success', 'Post and images deleted successfully');
      fetchData()

      // Optional: Refresh your UI here (e.g. remove from state, refetch posts, go back, etc.)
      // navigation.goBack(); or setPosts(prev => prev.filter(p => p.id !== postId));

    } catch (error) {
      setDeleting(false)
      console.error('Delete failed:', error);

      if (error.code === 'storage/object-not-found') {
        Alert.alert('Not Found', 'Some images were already deleted.');
      } else if (error.code === 'permission-denied') {
        Alert.alert('Permission Denied', 'You can only delete your own posts.');
      } else {
        Alert.alert('Error', 'Failed to delete post. Please try again.');
      }
    }
  };

  const handleLogout = async () => {
    Alert.alert(t("BarberAccountScreen.logoutTitle"), t("BarberAccountScreen.logoutMessage"), [
      { text: t("BarberAccountScreen.cancel"), style: "cancel" },
      {
        text: t("BarberAccountScreen.logout"),
        style: "destructive",
        onPress: async () => {
          try {
            await logoutUser();
            if (typeof onLogout === "function") {
              onLogout();
            }
          } catch (error) {
            Alert.alert(t("BarberAccountScreen.errorTitle"), t("BarberAccountScreen.logoutError"));
          }
        },
      },
    ]);
  };

  const addServiceToPrice = async () => {
    if (!newService.name.trim() || !newService.price.trim()) {
      Alert.alert(t("BarberAccountScreen.errorTitle"), t("BarberAccountScreen.serviceNamePriceRequired"));
      return;
    }

    try {
      console.log("addServiceToPrice: Adding service:", newService);

      const currentPriceList = userData.listinoPrezzo || [];
      console.log("addServiceToPrice: Current price list:", currentPriceList);

      const newServiceItem = {
        id: Date.now().toString(),
        name: newService.name.trim(),
        price: parseFloat(newService.price).toFixed(2),
        addedAt: new Date().toISOString(),
      };

      const updatedPriceList = [...currentPriceList, newServiceItem];

      console.log("addServiceToPrice: Updated price list:", updatedPriceList);

      await updateBarberPortfolio(currentUser.uid, {
        listinoPrezzo: updatedPriceList,
      });

      setUserData((prev) => ({
        ...prev,
        listinoPrezzo: updatedPriceList,
      }));

      setNewService({ name: "", price: "" });
      setShowPriceModal(false);
      Alert.alert(t("BarberAccountScreen.successTitle"), t("BarberAccountScreen.serviceAdded"));
    } catch (error) {
      console.error("addServiceToPrice: Error:", error);
      Alert.alert(
        t("BarberAccountScreen.errorTitle"),
        t("BarberAccountScreen.serviceAddError", { message: error.message }),
      );
    }
  };

  const removeServiceFromPrice = async (serviceId) => {
    Alert.alert(
      t("BarberAccountScreen.removeServiceTitle"),
      t("BarberAccountScreen.removeServiceMessage"),
      [
        { text: t("BarberAccountScreen.cancel"), style: "cancel" },
        {
          text: t("BarberAccountScreen.remove"),
          style: "destructive",
          onPress: async () => {
            try {
              console.log(
                "removeServiceFromPrice: Removing service:",
                serviceId,
              );

              const updatedPriceList = userData.listinoPrezzo.filter(
                (service) => service.id !== serviceId,
              );
              console.log(
                "removeServiceFromPrice: Updated list:",
                updatedPriceList,
              );

              await updateBarberPortfolio(currentUser.uid, {
                listinoPrezzo: updatedPriceList,
              });

              setUserData((prev) => ({
                ...prev,
                listinoPrezzo: updatedPriceList,
              }));

              Alert.alert(t("BarberAccountScreen.successTitle"), t("BarberAccountScreen.serviceRemoved"));
            } catch (error) {
              console.error("removeServiceFromPrice: Error:", error);
              Alert.alert(
                t("BarberAccountScreen.errorTitle"),
                t("BarberAccountScreen.serviceRemoveError", { message: error.message }),
              );
            }
          },
        },
      ],
    );
  };

  const editService = (service) => {
    setEditingService(service);
    setNewService({ name: service.name, price: service.price });
    setIsEditing(true);
    setShowPriceModal(true);
  };

  const updateService = async () => {
    if (!newService.name.trim() || !newService.price.trim()) {
      Alert.alert(t("BarberAccountScreen.errorTitle"), t("BarberAccountScreen.serviceNamePriceRequired"));
      return;
    }

    try {
      console.log("updateService: Updating service:", editingService.id);

      const updatedPriceList = userData.listinoPrezzo.map((service) =>
        service.id === editingService.id
          ? {
            ...service,
            name: newService.name.trim(),
            price: parseFloat(newService.price).toFixed(2),
            updatedAt: new Date().toISOString(),
          }
          : service,
      );

      console.log("updateService: Updated list:", updatedPriceList);

      await updateBarberPortfolio(currentUser.uid, {
        listinoPrezzo: updatedPriceList,
      });

      setUserData((prev) => ({
        ...prev,
        listinoPrezzo: updatedPriceList,
      }));

      setNewService({ name: "", price: "" });
      setEditingService(null);
      setIsEditing(false);
      setShowPriceModal(false);
      Alert.alert(t("BarberAccountScreen.successTitle"), t("BarberAccountScreen.serviceUpdated"));
    } catch (error) {
      console.error("updateService: Error:", error);
      Alert.alert(
        t("BarberAccountScreen.errorTitle"),
        t("BarberAccountScreen.serviceUpdateError", { message: error.message }),
      );
    }
  };

  const cancelEdit = () => {
    setNewService({ name: "", price: "" });
    setEditingService(null);
    setIsEditing(false);
    setShowPriceModal(false);
  };

  const goToEditProfile = () => {
    router.push("/(protected)/EditBarberProfileScreen");
  };

  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const closeMenu = () => setMenuOpen(false);

  const handleProfileImageUpload = async () => {
    try {
      const images = await pickImages(false); // Single image
      if (images && images.length > 0 && currentUser) {
        setUploadingProfileImage(true);
        // Anteprima immediata locale
        const picked = images[0];
        if (picked?.uri) {
          setLocalProfileUri(picked.uri);
        }

        const uploadedImages = await uploadMultipleFiles(
          [picked],
          currentUser.uid,
          "profile",
          (current, total) => {
            console.log(`Upload immagine profilo ${current}/${total}`);
          },
        );

        if (uploadedImages.length > 0) {
          const imageUrl = uploadedImages[0].url;

          await updateBarberPortfolio(currentUser.uid, {
            profileImage: imageUrl,
          });

          setUserData((prev) => ({
            ...prev,
            profileImage: imageUrl,
          }));
          setLocalProfileUri(null);

          Alert.alert(t("BarberAccountScreen.successTitle"), t("BarberAccountScreen.profileImageUpdated"));
        }
      }
    } catch (error) {
      console.error("handleProfileImageUpload error:", error);
      Alert.alert(
        t("BarberAccountScreen.errorTitle"),
        t("BarberAccountScreen.profileImageUploadError", {
          message: error?.message || t("BarberAccountScreen.unknownError"),
        }),
      );
    } finally {
      setUploadingProfileImage(false);
    }
  };

  const fetchData = async () => {
    const post = collection(db, "posts");
    const querySnapshot = await getDocs(post);

    const filteredPosts = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter(post => post.barberId == currentUser?.uid);
    // console.log("Fetched posts:", JSON.stringify(currentUser.uid, null, 2));
    // console.log("Fetched posts:", JSON.stringify(filteredPosts.filter(post => post.barberId == currentUser?.uid), null, 2));
    console.log('filterd Post', filteredPosts)
    setBarberPosts(filteredPosts);
  }
  useFocusEffect(
    useCallback(() => {
      fetchData()
      return () => {
        // cleanup logic
      }
    }, [currentUser])
  )




  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t("BarberAccountScreen.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Header Account */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={toggleMenu}
              style={styles.menuButton}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              {/* Profile image on the left with + to upload */}
              <TouchableOpacity
                style={styles.profileImageContainer}
                onPress={handleProfileImageUpload}
                disabled={uploadingProfileImage}
              >
                {localProfileUri || userData?.profileImage ? (
                  <Image
                    source={{ uri: localProfileUri || userData.profileImage }}
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Text style={styles.profileImagePlaceholderText}>
                      {userData?.salonName?.charAt(0) || "S"}
                    </Text>
                  </View>
                )}
                <View style={styles.addImageButton}>
                  <Text style={styles.addImageButtonText}>
                    {uploadingProfileImage ? "Â·Â·" : "+"}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Name and role to the right */}
              <View style={styles.salonInfo}>
                <Text style={styles.salonName}>{userData?.salonName}</Text>
                <Text style={styles.roleText}>{t("BarberAccountScreen.hairArtist")}</Text>
              </View>
            </View>
          </View>
          {menuOpen && (
            <View style={styles.menuPortal} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.menuOverlay}
                onPress={closeMenu}
              />
              <View style={styles.menuContainer}>
                <View style={styles.menuToggleRow}>
                  <Text style={styles.menuItemText}>{t("language")}</Text>
                  <View style={styles.menuToggleControl}>
                    <LanguageToggle />
                  </View>
                </View>
                <View style={styles.menuDivider} />
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    closeMenu();
                    goToEditProfile();
                  }}
                >
                  <Text style={styles.menuItemText}>{t("BarberAccountScreen.editProfile")}</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    closeMenu();
                    handleProfileImageUpload();
                  }}
                >
                  <Text style={styles.menuItemText}>
                    {t("BarberAccountScreen.changeProfileImage")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Dati Salone */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("BarberAccountScreen.yourSalon")}</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t("BarberAccountScreen.nameLabel")}</Text>
              <Text style={styles.infoValue}>{userData?.salonName}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t("BarberAccountScreen.addressLabel")}</Text>
              <Text style={styles.infoValue}>{userData?.address}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t("BarberAccountScreen.phoneLabel")}</Text>
              <Text style={styles.infoValue}>{userData?.telephone}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t("BarberAccountScreen.workGenderLabel")}</Text>
              <Text style={styles.infoValue}>{userData?.workGender}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t("BarberAccountScreen.contactEmailLabel")}</Text>
              <Text style={styles.infoValue}>{userData?.emailContact}</Text>
            </View>

            {userData?.website && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t("BarberAccountScreen.websiteLabel")}</Text>
                <Text style={styles.infoValue}>{userData.website}</Text>
              </View>
            )}
          </View>

          {/* Staff 
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Il tuo team</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Dipendenti:</Text>
            </View>
            <Text style={styles.staffText}>{userData?.nomiDipendenti || 'Nessun dipendente inserito'}</Text>
          </View>*/}

          {/* Specializzazioni */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("BarberAccountScreen.yourSpecializations")}</Text>

            <View style={styles.tagsContainer}>
              {userData?.typesCut?.map((taglio, index) => {
                // console.log(taglio)
                return (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>
                      {i18n.language === "en-UK"
                        ? taglio?.en ?? ""
                        : taglio?.it ?? taglio?.en ?? ""}

                      {/* {taglio} */}
                    </Text>
                  </View>)
              })}
            </View>
          </View>

          {/* Gestione Business
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>âš™ï¸ Modifica profilo salone</Text>
          </View>
          */}

          {/* Promozione */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("BarberAccountScreen.postsTitle", { count: barberPosts?.length || 0 })}
            </Text>

            {/* Foto Portfolio */}
            <View style={styles.portfolioSection}>
              <View style={styles.portfolioHeader}>
                <TouchableOpacity
                  style={[
                    styles.addButton,
                    uploading && styles.addButtonDisabled,
                  ]}
                  onPress={() => {
                    router.replace('/(protected)/PostScreen');

                  }}
                  disabled={uploading}
                >
                  <Text style={styles.addButtonText}>
                    {t("BarberAccountScreen.add")}
                  </Text>
                </TouchableOpacity>
              </View>

              {barberPosts?.length > 0 ? (
                <FlatList
                  data={barberPosts}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={({ item, index }) => (
                    <View style={styles.mediaItem}>
                      <Image
                        source={{
                          uri:
                            typeof item === "string"
                              ? item
                              : (item?.thumbnailUrl ?? item?.thumbnailUrl ?? item?.url ?? ""),
                        }}
                        style={styles.mediaPreview}
                      />
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => {
                          deletePost(item.postId)
                        }}
                        disabled={deleting}
                      // onPress={() => removeMedia(index, "image")}
                      >
                        {deleting ? <ActivityIndicator color={'#ffff'} /> :
                          <Text style={styles.removeButtonText}>x</Text>
                        }
                      </TouchableOpacity>
                    </View>
                  )}
                />
              ) : (
                <Text style={styles.emptyPortfolioText}>{t("BarberAccountScreen.emptyPortfolioText")}</Text>
              )}
            </View>

            {/* Video Portfolio 
            <View style={styles.portfolioSection}>
              <View style={styles.portfolioHeader}>
                <Text style={styles.portfolioTitle}>ðŸŽ¥ Video dei tuoi lavori ({userData?.portfolioVideos?.length || 0})</Text>
                <TouchableOpacity 
                  style={[styles.addButton, uploading && styles.addButtonDisabled]} 
                  onPress={handleAddVideos}
                  disabled={uploading}
                >
                  <Text style={styles.addButtonText}>
                    {uploading ? 'Caricando...' : '+ Aggiungi'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {userData?.portfolioVideos?.length > 0 ? (
                <FlatList
                  data={userData.portfolioVideos}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={({ item, index }) => (
                    <View style={styles.mediaItem}>
                      <View style={styles.videoPreview}>
                        <Text style={styles.videoIcon}>ðŸŽ¥</Text>
                        <Text style={styles.videoText}>Video {index + 1}</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.removeButton} 
                        onPress={() => removeMedia(index, 'video')}
                      >
                        <Text style={styles.removeButtonText}>âœ•</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                />
              ) : (
                <Text style={styles.emptyPortfolioText}>
                  Nessun video nel portfolio. Aggiungi video dei tuoi lavori per mostrare le tue skill!
                </Text>
              )}
            </View>
            */}
          </View>

          {/* Listino Prezzi 
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>ðŸ’° Listino Prezzi ({userData?.listinoPrezzo?.length || 0})</Text>
              <TouchableOpacity 
                style={styles.addButton} 
                onPress={() => setShowPriceModal(true)}
              >
                <Text style={styles.addButtonText}>+ Aggiungi</Text>
              </TouchableOpacity>
            </View>
            
            {userData?.listinoPrezzo?.length > 0 ? (
              <View style={styles.priceList}>
                {userData.listinoPrezzo.map((service) => (
                  <View key={service.id} style={styles.priceItem}>
                    <View style={styles.priceInfo}>
                      <Text style={styles.serviceName}>{service.name}</Text>
                      <Text style={styles.servicePrice}>â‚¬{service.price}</Text>
                    </View>
                    <View style={styles.serviceButtons}>
                      <TouchableOpacity 
                        style={styles.editServiceButton}
                        onPress={() => editService(service)}
                      >
                        <Text style={styles.editServiceText}>âœï¸</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.removeServiceButton}
                        onPress={() => removeServiceFromPrice(service.id)}
                      >
                        <Text style={styles.removeServiceText}>âœ•</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyPortfolioText}>
                Nessun servizio nel listino. Aggiungi i tuoi servizi con i prezzi!
              </Text>
            )}
          </View>*/}

          {/* Promozione 
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Promuovi il tuo salone</Text>
            
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>ðŸ“¸ Carica foto lavori</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>â­ Gestisci recensioni</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>ðŸŽ¯ Crea offerte speciali</Text>
            </TouchableOpacity>
          </View>
          */}

          {/* Logout */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}> {t("BarberAccountScreen.logout")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal per aggiungere servizio al listino */}
      <Modal
        visible={showPriceModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPriceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {isEditing ? t("BarberAccountScreen.editServiceTitle") : t("BarberAccountScreen.addServiceTitle")}
            </Text>{" "}
            <Text style={styles.inputLabel}>{t("BarberAccountScreen.serviceNameLabel")}</Text>
            <TextInput
              style={styles.textInput}
              value={newService.name}
              onChangeText={(text) =>
                setNewService((prev) => ({ ...prev, name: text }))
              }
              placeholder={t("BarberAccountScreen.serviceNamePlaceholder")}
              placeholderTextColor="#999"
            />
            <Text style={styles.inputLabel}>{t("BarberAccountScreen.priceLabel")}</Text>
            <TextInput
              style={styles.textInput}
              value={newService.price}
              onChangeText={(text) =>
                setNewService((prev) => ({ ...prev, price: text }))
              }
              placeholder={t("BarberAccountScreen.pricePlaceholder")}
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelEdit}
              >
                <Text style={styles.cancelButtonText}>{t("BarberAccountScreen.cancel")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={isEditing ? updateService : addServiceToPrice}
              >
                <Text style={styles.confirmButtonText}>
                  {isEditing ? t("BarberAccountScreen.update") : t("BarberAccountScreen.add")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffffff",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    position: "relative",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  header: {
    position: "relative",
    backgroundColor: "white",
    borderRadius: 0,
    padding: 25,
    marginBottom: 20,
    shadowColor: "#ffffffff",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 5,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  profileImageContainer: {
    position: "relative",
    marginRight: 15,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#F0F0F0",
  },
  profileImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(0, 188, 212, 0.35)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.6)",
    shadowColor: "#00BCD4",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  profileImagePlaceholderText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
  },
  addImageButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "rgba(0, 188, 212, 0.4)",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.7)",
    shadowColor: "#00BCD4",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  addImageButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 18,
  },
  salonInfo: {
    flex: 1,
    justifyContent: "center",
  },
  menuButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 40,
    elevation: 40,
  },
  menuLine: {
    width: 20,
    height: 2,
    backgroundColor: "#333",
    borderRadius: 2,
    marginVertical: 2,
  },
  menuPortal: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  menuContainer: {
    position: "absolute",
    top: 36,
    right: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 18,
    paddingVertical: 6,
    minWidth: 180,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 110,
    zIndex: 110,
    overflow: "visible",
  },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  menuItemText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#EEE",
    marginVertical: 4,
  },
  menuToggleRow: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 56,
  },
  menuToggleControl: {
    zIndex: 2,
    elevation: 2,
    marginLeft: 10,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  salonName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#00BCD4",
    marginBottom: 3,
  },
  roleText: {
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
  },
  section: {
    backgroundColor: "white",
    borderRadius: 5,
    padding: 5,
    marginBottom: 15,
    shadowColor: "#ffffffff",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 16,
    color: "#666",
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
    flex: 2,
    textAlign: "right",
  },
  staffText: {
    fontSize: 16,
    color: "#333",
    fontStyle: "italic",
    lineHeight: 22,
    marginTop: 5,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tag: {
    backgroundColor: "#ffffffff",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: "#00BCD4",
    fontSize: 14,
    fontWeight: "500",
  },
  actionButton: {
    backgroundColor: "rgba(0, 188, 212, 0.15)",
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "rgba(0, 188, 212, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#00BCD4",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 16,
    color: "#00BCD4",
    fontWeight: "600",
  },
  logoutButton: {
    backgroundColor: "rgba(255, 107, 107, 0.25)",
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.4)",
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  logoutButtonText: {
    color: "#FF6B6B",
    fontSize: 18,
    fontWeight: "bold",
  },
  portfolioSection: {
    marginBottom: 20,
  },
  portfolioHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  portfolioTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  addButton: {
    backgroundColor: "rgba(0, 188, 212, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.5)",
    shadowColor: "#00BCD4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonDisabled: {
    backgroundColor: "rgba(200, 200, 200, 0.2)",
    borderColor: "rgba(200, 200, 200, 0.3)",
  },
  addButtonText: {
    color: "#00BCD4",
    fontSize: 12,
    fontWeight: "600",
  },
  mediaItem: {
    marginRight: 15,
    position: "relative",
  },
  mediaPreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: "#F0F0F0",
  },
  videoPreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: "#E8F8F5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#00BCD4",
    borderStyle: "dashed",
  },
  videoIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  videoText: {
    fontSize: 12,
    color: "#00BCD4",
    fontWeight: "600",
  },
  removeButton: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#FF6B6B",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  removeButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  emptyPortfolioText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
    padding: 20,
    backgroundColor: "#F8F8F8",
    borderRadius: 10,
  },
  // Stili Listino Prezzi
  priceList: {
    marginTop: 10,
  },
  priceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    marginBottom: 8,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  priceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 2,
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#00BCD4",
  },
  serviceButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editServiceButton: {
    backgroundColor: "rgba(33, 150, 243, 0.3)",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.2,
    borderColor: "rgba(33, 150, 243, 0.5)",
  },
  editServiceText: {
    fontSize: 14,
  },
  removeServiceButton: {
    backgroundColor: "rgba(255, 82, 82, 0.3)",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
    borderWidth: 1.2,
    borderColor: "rgba(255, 82, 82, 0.5)",
  },
  removeServiceText: {
    color: "#FF5252",
    fontSize: 16,
    fontWeight: "bold",
  },
  // Stili Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: 30,
    padding: 25,
    margin: 20,
    width: "90%",
    maxWidth: 400,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.6)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 5,
    marginTop: 15,
  },
  textInput: {
    backgroundColor: "rgba(248, 248, 248, 0.6)",
    borderRadius: 14,
    padding: 15,
    fontSize: 16,
    color: "#000",
    borderWidth: 1.5,
    borderColor: "rgba(0, 188, 212, 0.2)",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 25,
    gap: 15,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "rgba(245, 245, 245, 0.6)",
    borderWidth: 1.5,
    borderColor: "rgba(0, 188, 212, 0.3)",
  },
  confirmButton: {
    backgroundColor: "rgba(0, 188, 212, 0.35)",
    borderWidth: 1.5,
    borderColor: "rgba(0, 188, 212, 0.7)",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#00BCD4",
  },
});





