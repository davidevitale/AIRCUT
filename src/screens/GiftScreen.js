import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getCurrentUserData, updateUserXP, getUserXP, checkDailySlot, updateDailySlot } from '../services/authService';

const { width, height } = Dimensions.get('window');

const GiftScreen = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userXP, setUserXP] = useState(0);
  const [dailySlots, setDailySlots] = useState(0);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [lastPrize, setLastPrize] = useState(null);
  
  // Animazioni per i rulli
  const reel1Anim = useRef(new Animated.Value(0)).current;
  const reel2Anim = useRef(new Animated.Value(0)).current;
  const reel3Anim = useRef(new Animated.Value(0)).current;
  const prizeAnim = useRef(new Animated.Value(0)).current;

  // Simboli della slot (multipli di 100 da 100 a 1000)
  const symbols = ['100', '200', '300', '400', '500', '600', '700', '800', '900', '1000'];

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const userData = await getCurrentUserData();
      if (userData) {
        setCurrentUser(userData);
        const xp = await getUserXP(userData.user.uid);
        setUserXP(xp);
        
        const slotsData = await checkDailySlot(userData.user.uid);
        setDailySlots(slotsData.count);
      }
    } catch (error) {
      console.error('Errore caricamento dati utente:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRandomPrize = () => {
    // Genera un premio casuale tra 100 e 1000 (multipli di 100)
    const multiplier = Math.floor(Math.random() * 10) + 1; // 1-10
    return multiplier * 100;
  };

  const startSlotMachine = async () => {
    if (!currentUser) {
      Alert.alert('Errore', 'Devi essere loggato per giocare');
      return;
    }

    if (dailySlots >= 5) {
      Alert.alert(
        'Limite raggiunto',
        'Hai già fatto il massimo di slottate giornaliere. Torna domani!',
        [{ text: 'OK' }]
      );
      return;
    }

    if (dailySlots >= 1) {
      // Mostra popup per video AdMob (simulato per ora)
      Alert.alert(
        'Slot extra',
        'Vuoi slottare di nuovo? Guarda un breve video per ottenere un\'altra possibilità!',
        [
          { text: 'No grazie', style: 'cancel' },
          { text: 'Guarda video', onPress: () => simulateAdReward() }
        ]
      );
      return;
    }

    performSlot();
  };

  const simulateAdReward = () => {
    // Simula la visualizzazione di un video AdMob
    Alert.alert(
      'Video completato!',
      'Hai guardato il video completo. Ora puoi fare un\'altra slottata!',
      [{ text: 'Continua', onPress: () => performSlot() }]
    );
  };

  const performSlot = async () => {
    setSpinning(true);
    
    // Genera il premio prima dell'animazione
    const prize = generateRandomPrize();
    const prizeSymbol = prize.toString();
    
    // Animazione dei rulli
    const animations = [
      Animated.loop(
        Animated.timing(reel1Anim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        { iterations: 20 }
      ),
      Animated.loop(
        Animated.timing(reel2Anim, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
        { iterations: 17 }
      ),
      Animated.loop(
        Animated.timing(reel3Anim, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }),
        { iterations: 14 }
      ),
    ];

    // Avvia le animazioni
    Animated.parallel(animations).start();

    // Ferma le animazioni dopo 2 secondi e mostra il risultato
    setTimeout(async () => {
      // Ferma le animazioni
      reel1Anim.stopAnimation();
      reel2Anim.stopAnimation();
      reel3Anim.stopAnimation();
      
      // Reset delle animazioni
      reel1Anim.setValue(0);
      reel2Anim.setValue(0);
      reel3Anim.setValue(0);
      
      setSpinning(false);
      setLastPrize(prize);

      // Animazione del premio
      Animated.sequence([
        Animated.timing(prizeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(prizeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      try {
        // Aggiorna XP e slot giornalieri
        await updateUserXP(currentUser.user.uid, prize);
        await updateDailySlot(currentUser.user.uid);
        
        // Ricarica i dati
        await loadUserData();
        
        // Mostra il premio
        Alert.alert(
          '🎉 Congratulazioni!',
          `Hai vinto ${prize} XP!`,
          [{ text: 'Fantastico!' }]
        );
      } catch (error) {
        console.error('Errore aggiornamento dati:', error);
        Alert.alert('Errore', 'Impossibile salvare il premio');
      }
    }, 2000);
  };

  const redeemGiveawayTicket = async () => {
    if (userXP < 10000) {
      Alert.alert(
        'XP insufficienti',
        `Ti servono 10.000 XP per riscattare un ticket. Ne hai ${userXP}.`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Riscatta Ticket Giveaway',
      'Vuoi riscattare un ticket per il giveaway mensile? Ti costerà 10.000 XP.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Riscatta',
          onPress: async () => {
            try {
              await updateUserXP(currentUser.user.uid, -10000);
              await loadUserData();
              Alert.alert(
                '🎫 Ticket Riscattato!',
                'Hai riscattato con successo un ticket per il giveaway mensile!',
                [{ text: 'Perfetto!' }]
              );
            } catch (error) {
              console.error('Errore riscatto ticket:', error);
              Alert.alert('Errore', 'Impossibile riscattare il ticket');
            }
          }
        }
      ]
    );
  };

  const calculateBoostTickets = () => {
    if (userXP < 10000) return 0;
    const extraXP = userXP - 10000;
    return Math.floor(extraXP / 500);
  };

  const renderSlotReel = (animValue, symbol) => {
    const translateY = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -50],
    });

    return (
      <Animated.View style={[styles.reel, { transform: [{ translateY }] }]}>
        <Text style={styles.reelText}>{spinning ? '?' : symbol}</Text>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Caricamento...</Text>
      </View>
    );
  }

  const boostTickets = calculateBoostTickets();
  const canPlayFree = dailySlots === 0;
  const canPlayWithAd = dailySlots > 0 && dailySlots < 5;
  const maxSlotsReached = dailySlots >= 5;

  return (
    <LinearGradient colors={['#FF6B6B', '#4ECDC4']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header con XP */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🎁 Gift Zone</Text>
          <View style={styles.xpContainer}>
            <Text style={styles.xpText}>⭐ {userXP.toLocaleString()} XP</Text>
          </View>
        </View>

        {/* Slot Machine */}
        <View style={styles.slotContainer}>
          <Text style={styles.slotTitle}>🎰 Slot Machine XP</Text>
          
          <View style={styles.slotMachine}>
            <View style={styles.reelsContainer}>
              {renderSlotReel(reel1Anim, lastPrize ? lastPrize.toString() : '100')}
              {renderSlotReel(reel2Anim, lastPrize ? lastPrize.toString() : '100')}
              {renderSlotReel(reel3Anim, lastPrize ? lastPrize.toString() : '100')}
            </View>
          </View>

          <View style={styles.slotInfo}>
            <Text style={styles.slotInfoText}>
              Slot giornaliere: {dailySlots}/5
            </Text>
            <Text style={styles.slotInfoSubtext}>
              Premio: 100-1000 XP
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.slotButton,
              (spinning || maxSlotsReached) && styles.slotButtonDisabled
            ]}
            onPress={startSlotMachine}
            disabled={spinning || maxSlotsReached}
          >
            <Text style={styles.slotButtonText}>
              {spinning
                ? 'Girando...'
                : canPlayFree
                ? '🎰 SLOT GRATIS'
                : canPlayWithAd
                ? '📺 SLOT CON VIDEO'
                : '⏰ TORNA DOMANI'
              }
            </Text>
          </TouchableOpacity>
        </View>

        {/* Giveaway Section */}
        <View style={styles.giveawayContainer}>
          <Text style={styles.giveawayTitle}>🏆 Giveaway Mensile</Text>
          
          <View style={styles.giveawayInfo}>
            <Text style={styles.giveawayText}>
              Riscatta un ticket con 10.000 XP
            </Text>
            <Text style={styles.giveawayProgress}>
              Progresso: {Math.min(userXP, 10000).toLocaleString()}/10.000 XP
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.giveawayButton,
              userXP < 10000 && styles.giveawayButtonDisabled
            ]}
            onPress={redeemGiveawayTicket}
            disabled={userXP < 10000}
          >
            <Text style={styles.giveawayButtonText}>
              🎫 RISCATTA TICKET
            </Text>
          </TouchableOpacity>

          {boostTickets > 0 && (
            <View style={styles.boostContainer}>
              <Text style={styles.boostText}>
                🚀 Boost Tickets disponibili: {boostTickets}
              </Text>
              <Text style={styles.boostSubtext}>
                Aumentano le probabilità di vittoria!
              </Text>
            </View>
          )}
        </View>

        {/* Prize Animation */}
        {lastPrize && (
          <Animated.View
            style={[
              styles.prizePopup,
              {
                opacity: prizeAnim,
                transform: [
                  {
                    scale: prizeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  },
                ],
              },
            ]}
            pointerEvents="none"
          >
            <Text style={styles.prizeText}>🎉 +{lastPrize} XP! 🎉</Text>
          </Animated.View>
        )}
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#fff',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  xpContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  xpText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  slotContainer: {
    margin: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  slotTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  slotMachine: {
    backgroundColor: '#2C3E50',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  reelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  reel: {
    backgroundColor: '#fff',
    width: 60,
    height: 60,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  reelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  slotInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  slotInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  slotInfoSubtext: {
    fontSize: 14,
    color: '#666',
  },
  slotButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  slotButtonDisabled: {
    backgroundColor: '#ccc',
  },
  slotButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  giveawayContainer: {
    margin: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  giveawayTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  giveawayInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  giveawayText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  giveawayProgress: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  giveawayButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  giveawayButtonDisabled: {
    backgroundColor: '#ccc',
  },
  giveawayButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  boostContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 10,
    alignItems: 'center',
  },
  boostText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
  },
  boostSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  prizePopup: {
    position: 'absolute',
    top: height / 2 - 50,
    left: width / 2 - 100,
    width: 200,
    height: 100,
    backgroundColor: 'rgba(255, 215, 0, 0.95)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  prizeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
});

export default GiftScreen;
