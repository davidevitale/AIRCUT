import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Alert,
  Modal,
  Animated,
  Share
} from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { getBarberProfileData, getBarberPrices, togglePostLike, getCurrentUserData } from '../services/authService';

const { width } = Dimensions.get('window');
const imageSize = width - 32; // Align portfolio card width with profile card padding

// Componente Cuore SVG Instagram-style
const HeartIcon = ({ size = 24, filled = false, color = '#262626' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      fill={filled ? color : 'none'}
      stroke={filled ? 'none' : color}
      strokeWidth={filled ? 0 : 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const BarberProfileScreen = ({ barberName, onGoBack }) => {
  const [barberData, setBarberData] = useState(null);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('portfolio'); // 'portfolio' o 'prices'
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [imageLikes, setImageLikes] = useState({}); // Track likes per image
  const [currentUser, setCurrentUser] = useState(null);
  
  // Animazioni per il cuore su doppio tap
  const heartAnimations = useRef({});
  const lastTaps = useRef({});

  useEffect(() => {
    loadBarberProfile();
    loadCurrentUser();
  }, [barberName]);

  const loadCurrentUser = async () => {
    try {
      const userData = await getCurrentUserData();
      setCurrentUser(userData);
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadBarberProfile = async () => {
    try {
      setLoading(true);
      console.log('BarberProfileScreen: Caricamento profilo per:', barberName);

      const profile = await getBarberProfileData(barberName);
      if (profile) {
        setBarberData(profile);
        
        // Carica anche i prezzi
        const barberPrices = await getBarberPrices(profile.id);
        setPrices(barberPrices);
        
        // Inizializza gli state per i like delle immagini
        if (profile.portfolioImages) {
          const initialLikes = {};
          profile.portfolioImages.forEach((img, idx) => {
            initialLikes[idx] = {
              count: 0,
              isLiked: false
            };
          });
          setImageLikes(initialLikes);
        }
      } else {
        Alert.alert('Errore', 'Profilo parrucchiere non trovato');
        onGoBack();
      }
    } catch (error) {
      console.error('Errore caricamento profilo:', error);
      Alert.alert('Errore', 'Impossibile caricare il profilo');
    } finally {
      setLoading(false);
    }
  };

  const profileInitial = barberData?.nomeSalone?.charAt(0)?.toUpperCase() || 'S';
  const portfolioData = barberData?.portfolioImages?.length ? barberData.portfolioImages : [null];

  const handleImageDoubleTap = async (imageIndex) => {
    try {
      if (!currentUser) {
        Alert.alert('Errore', 'Devi essere loggato per mettere like');
        return;
      }

      const currentLike = imageLikes[imageIndex] || { count: 0, isLiked: false };
      
      // Solo aggiungi like se non è già piaciuto
      if (!currentLike.isLiked) {
        const postId = `${barberData.id}_portfolio_${imageIndex}`;
        
        await togglePostLike(postId, currentUser.user.uid);
        
        setImageLikes(prev => ({
          ...prev,
          [imageIndex]: {
            count: currentLike.count + 1,
            isLiked: true
          }
        }));
      }
      
      // Anima il cuore
      animateHeartForImage(imageIndex);
    } catch (error) {
      console.error('Errore nel gestire il doppio tap like:', error);
    }
  };

  const animateHeartForImage = (imageIndex) => {
    // Crea animazioni per questa immagine se non esistono
    if (!heartAnimations.current[imageIndex]) {
      heartAnimations.current[imageIndex] = {
        likeAnimation: new Animated.Value(0),
        heartOpacity: new Animated.Value(0),
        heartVibration: new Animated.Value(0),
        heartScale: new Animated.Value(1),
      };
    }

    const anim = heartAnimations.current[imageIndex];
    
    // Reset delle animazioni
    anim.likeAnimation.setValue(0);
    anim.heartOpacity.setValue(1);
    anim.heartVibration.setValue(0);

    // Animazione complessa del cuore
    Animated.parallel([
      // Animazione principale (scala e fade)
      Animated.sequence([
        // Apparizione rapida
        Animated.timing(anim.likeAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        // Mantieni visibile
        Animated.delay(300),
        // Scomparsa
        Animated.timing(anim.likeAnimation, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      
      // Vibrazione del cuore
      Animated.sequence([
        Animated.timing(anim.heartVibration, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(anim.heartVibration, {
          toValue: -1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(anim.heartVibration, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(anim.heartVibration, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const handleLikePress = async (imageIndex) => {
    try {
      if (!currentUser) {
        Alert.alert('Errore', 'Devi essere loggato per mettere like');
        return;
      }

      const currentLike = imageLikes[imageIndex] || { count: 0, isLiked: false };
      const postId = `${barberData.id}_portfolio_${imageIndex}`;
      
      // Toggle like
      await togglePostLike(postId, currentUser.user.uid);
      
      setImageLikes(prev => ({
        ...prev,
        [imageIndex]: {
          count: currentLike.isLiked ? currentLike.count - 1 : currentLike.count + 1,
          isLiked: !currentLike.isLiked
        }
      }));
    } catch (error) {
      console.error('Errore toggle like:', error);
    }
  };

  const handleShareImage = async (imageUrl, imageIndex) => {
    try {
      await Share.share({
        message: `Guarda questo fantastico lavoro di ${barberData.nomeSalone}! 💇‍♂️`,
        url: imageUrl,
      });
    } catch (error) {
      console.log('Errore condivisione:', error.message);
    }
  };

  const renderPortfolioImage = ({ item, index }) => {
    const currentLike = imageLikes[index] || { count: 0, isLiked: false };
    
    // Crea animazioni se non esistono
    if (!heartAnimations.current[index]) {
      heartAnimations.current[index] = {
        likeAnimation: new Animated.Value(0),
        heartOpacity: new Animated.Value(0),
        heartVibration: new Animated.Value(0),
        heartScale: new Animated.Value(1),
      };
    }

    const anim = heartAnimations.current[index];
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;

    const handleImagePress = () => {
      if (!lastTaps.current[index]) {
        lastTaps.current[index] = now;
      } else if ((now - lastTaps.current[index]) < DOUBLE_PRESS_DELAY) {
        // Doppio tap
        handleImageDoubleTap(index);
        lastTaps.current[index] = 0;
      } else {
        lastTaps.current[index] = now;
      }
    };

    const hasImage = !!item;
    const uri = hasImage ? item : 'https://via.placeholder.com/1200/A8D8EA/FFFFFF?text=Portfolio';

    return (
      <View style={styles.portfolioImageContainer}>
        <TouchableOpacity 
          style={[styles.imageItem, !hasImage && styles.imageItemPlaceholder]}
          onPress={handleImagePress}
          activeOpacity={0.8}
        >
          <Image source={{ uri }} style={styles.portfolioImage} />
          
          {/* Cuore animato per doppio tap */}
          <Animated.View 
            style={[
              styles.likeHeartOverlay,
              {
                opacity: Animated.multiply(anim.likeAnimation, anim.heartOpacity),
                transform: [
                  {
                    scale: anim.likeAnimation.interpolate({
                      inputRange: [0, 0.3, 1],
                      outputRange: [0, 1.2, 1],
                    }),
                  },
                  {
                    rotate: anim.heartVibration.interpolate({
                      inputRange: [-1, 0, 1],
                      outputRange: ['-15deg', '0deg', '15deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <Svg width={60} height={60} viewBox="0 0 24 24" style={styles.animatedHeartSvg}>
              <Defs>
                <SvgLinearGradient id={`heartGradient${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#007BFF" />
                  <Stop offset="50%" stopColor="#00D4AA" />
                  <Stop offset="100%" stopColor="#40E0D0" />
                </SvgLinearGradient>
              </Defs>
              <Path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill={`url(#heartGradient${index})`}
                stroke="none"
              />
            </Svg>
          </Animated.View>
        </TouchableOpacity>
        
        {/* Like e Condivisioni sotto la foto */}
        <View style={styles.imageActionsContainer}>
          <View style={styles.imageLeftActions}>
            <TouchableOpacity 
              style={styles.imageActionBtn}
              onPress={() => handleLikePress(index)}
            >
              <HeartIcon 
                size={20} 
                filled={currentLike.isLiked} 
                color={currentLike.isLiked ? '#ff3040' : '#262626'}
              />
              <Text style={styles.imageLikesCount}>{currentLike.count}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.imageActionBtn}
              onPress={() => handleShareImage(uri, index)}
            >
              <Text style={styles.shareIconSmall}>↗</Text>
              <Text style={styles.imageLikesCount}>0</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderPriceItem = ({ item }) => (
    <View style={styles.priceItem}>
      <View style={styles.priceContent}>
        <Text style={styles.serviceName}>{item.servizio}</Text>
        <Text style={styles.serviceDescription}>{item.descrizione}</Text>
      </View>
      <Text style={styles.servicePrice}>€{item.prezzo}</Text>
    </View>
  );

  const renderTabContent = () => {
    if (activeTab === 'portfolio') {
      return (
        <View style={styles.portfolioContainer}>
          <FlatList
            key="portfolio"
            data={portfolioData}
            renderItem={renderPortfolioImage}
            numColumns={1}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.portfolioGrid}
            scrollEnabled={false}
          />
        </View>
      );
    } else {
      return (
        <FlatList
          key="prices"
          data={prices}
          renderItem={renderPriceItem}
          numColumns={1}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.pricesList}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyPrices}>
              <Text style={styles.emptyPricesText}>Prezzi non disponibili</Text>
            </View>
          }
        />
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          {/*<Text style={styles.headerTitle}>{barberName}</Text> */}
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00BCD4" />
          <Text style={styles.loadingText}>Caricamento profilo...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!barberData) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          {/*<Text style={styles.headerTitle}>{barberData.nomeSalone}</Text>
          <View style={styles.headerActions}>
            <Text style={styles.moreIcon}>⋯</Text>
          </View>*/}
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatar}>
              {barberData.portfolioImages?.[0] ? (
                <Image
                  source={{ uri: barberData.portfolioImages[0] }}
                  style={styles.profileImage}
                />
              ) : (
                <Text style={styles.profileInitial}>{profileInitial}</Text>
              )}
            </View>
            <View style={styles.profileInfoText}>
              <Text style={styles.bioName}>{barberData.nomeSalone}</Text>
              <Text style={styles.bioCategory}>Salone di bellezza / Hair Artist</Text>
              {barberData.via && (
                <Text style={styles.bioLocation}>{barberData.via}</Text>
              )}
              {barberData.telefono && (
                <Text style={styles.bioContact}>{barberData.telefono}</Text>
              )}
              {barberData.sitoWeb && (
                <TouchableOpacity style={styles.websiteButton}>
                  <Text style={styles.websiteButtonText}>{barberData.sitoWeb}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Highlights (placeholder) 
        <View style={styles.highlightsSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.highlightItem}>
              <View style={styles.highlightCircle}>
                <Text style={styles.highlightIcon}>✂️</Text>
              </View>
              <Text style={styles.highlightLabel}>Tagli</Text>
            </View>
            <View style={styles.highlightItem}>
              <View style={styles.highlightCircle}>
                <Text style={styles.highlightIcon}>💇</Text>
              </View>
              <Text style={styles.highlightLabel}>Colori</Text>
            </View>
            <View style={styles.highlightItem}>
              <View style={styles.highlightCircle}>
                <Text style={styles.highlightIcon}>💰</Text>
              </View>
              <Text style={styles.highlightLabel}>Prezzi</Text>
            </View>
          </ScrollView>
        </View>*/}

        {/* Tab Navigation 
        <View style={styles.tabNavigation}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'portfolio' && styles.activeTab]}
            onPress={() => setActiveTab('portfolio')}
          >
            <Text style={styles.tabIcon}></Text>
          </TouchableOpacity>
          {/*<TouchableOpacity 
            style={[styles.tabButton, activeTab === 'prices' && styles.activeTab]}
            onPress={() => setActiveTab('prices')}
          >
            <Text style={styles.tabIcon}></Text>
          </TouchableOpacity>
        </View>*/}

        {/* Tab Content */}
        {renderTabContent()}
      </ScrollView>

      {/* Image Viewer Modal */}
      <Modal
        visible={showImageViewer}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageViewer(false)}
      >
        <SafeAreaView style={styles.imageViewerContainer}>
          <View style={styles.imageViewerHeader}>
            <TouchableOpacity 
              onPress={() => setShowImageViewer(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.imageCounter}>
              {selectedImageIndex + 1} / {portfolioData.length}
            </Text>
          </View>

          <FlatList
            data={portfolioData}
            renderItem={({ item }) => (
              <View style={styles.imageFullscreen}>
                <Image 
                  source={{ uri: item || 'https://via.placeholder.com/1200/A8D8EA/FFFFFF?text=Portfolio' }} 
                  style={styles.fullscreenImage}
                  resizeMode="contain"
                />
              </View>
            )}
            keyExtractor={(item, index) => index.toString()}
            horizontal
            pagingEnabled
            scrollEventThrottle={16}
            initialScrollIndex={selectedImageIndex || 0}
            getItemLayout={(data, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            onMomentumScrollEnd={(event) => {
              const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
              setSelectedImageIndex(newIndex);
            }}
            showsHorizontalScrollIndicator={false}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#000',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerActions: {
    padding: 8,
  },
  moreIcon: {
    fontSize: 24,
    color: '#000',
  },

  // Profile Section
  profileSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  profileAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
  },
  profileInitial: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  profileInfoText: {
    flex: 1,
  },
  bioName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  bioCategory: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 6,
  },
  bioDescription: {
    fontSize: 14,
    color: '#000',
    marginBottom: 2,
  },
  bioLocation: {
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 2,
  },
  bioContact: {
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 6,
  },
  websiteButton: {
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  websiteButtonText: {
    fontSize: 14,
    color: '#0a84ff',
    fontWeight: '600',
  },

  // Highlights
  highlightsSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  highlightItem: {
    alignItems: 'center',
    marginRight: 20,
  },
  highlightCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  highlightIcon: {
    fontSize: 24,
  },
  highlightLabel: {
    fontSize: 12,
    color: '#666',
  },

  // Tab Navigation
  tabNavigation: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#000',
  },
  tabIcon: {
    fontSize: 20,
    color: '#666',
  },

  // Portfolio Grid
  portfolioContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  portfolioGrid: {
    paddingTop: 0,
  },
  portfolioImageContainer: {
    width: imageSize,
    height: 'auto',
    marginBottom: 16,
  },
  imageItem: {
    width: imageSize,
    height: 350,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#A8D8EA',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    position: 'relative',
  },
  imageItemPlaceholder: {
    backgroundColor: '#A8D8EA',
  },
  portfolioImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    backgroundColor: 'transparent',
  },
  
  // Like Heart Overlay - Animato
  likeHeartOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 60,
    height: 60,
    marginTop: -30,
    marginLeft: -30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  animatedHeartSvg: {
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  
  // Image Actions Container
  imageActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  imageLeftActions: {
    flexDirection: 'row',
  },
  imageActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  imageLikesCount: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  shareIconSmall: {
    fontSize: 16,
    color: '#262626',
    marginRight: 2,
  },

  // Image Viewer
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  imageViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  imageCounter: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  imageFullscreen: {
    width: width,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },

  // Prices List
  pricesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  priceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  priceContent: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#666',
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00BCD4',
  },
  emptyPrices: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyPricesText: {
    fontSize: 16,
    color: '#666',
  },
});

export default BarberProfileScreen;
