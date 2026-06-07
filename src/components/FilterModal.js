import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Entypo from '@expo/vector-icons/Entypo';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getAllBarberPosts } from '../services/postService';
import {
  COLOR_TAG,
  COLOR_TAG_ID,
  getColorTagOptions,
  isColorTagId,
} from '../services/tagOptions';

// Pannello filtri riutilizzabile (Task 4): si apre come Modal in-screen, senza
// navigazione, così non si perde scroll/contesto della schermata chiamante.
// Include il tag speciale "colore" (Task 2): selezionandolo si rivelano i colori
// come tag selezionabili.
// Task 4: animazione spring nativa (UI thread) + niente overlay scuro.
// `SHEET_TRAVEL` è la distanza che la sheet percorre dall'alto al basso.
// Calcolata dall'altezza dello schermo (80% max) per coprire anche dispositivi
// piccoli senza mai mostrare un "salto" finale.
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_TRAVEL = Math.round(SCREEN_HEIGHT * 0.85);
// Curva spring "morbida" – damping alto = nessun overshoot fastidioso, stiffness
// medio-bassa per discesa/salita fluida tipo iOS sheet.
const SHEET_SPRING = { damping: 22, stiffness: 180, mass: 0.9, overshootClamping: false };

const FilterModal = ({ visible, initialSelected = [], onApply, onClose }) => {
  const { t, i18n } = useTranslation();
  const [availableTags, setAvailableTags] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [trendOrder, setTrendOrder] = useState({}); // tagKey -> punteggio trend
  const [draftSelected, setDraftSelected] = useState(initialSelected);
  // Stato locale di mount: il Modal nativo deve restare montato per tutta la
  // durata dell'animazione di uscita (altrimenti la sheet scompare di colpo).
  // Quando `visible` diventa false, `mounted` rimane true finché lo spring di
  // chiusura non ha completato (callback runOnJS → setMounted(false)).
  const [mounted, setMounted] = useState(visible);

  // Posizione verticale della sheet (0 = visibile, SHEET_TRAVEL = nascosta in basso).
  const translateY = useSharedValue(SHEET_TRAVEL);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      // Apertura: dal basso verso 0 con spring naturale.
      translateY.value = withSpring(0, SHEET_SPRING);
    } else if (mounted) {
      // Chiusura: torna giù con la stessa curva e poi smonta.
      translateY.value = withSpring(SHEET_TRAVEL, SHEET_SPRING, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
    // translateY è SharedValue stabile, non serve in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const getLocalizedText = useCallback(
    (value, fallback = '') => {
      if (!value) return fallback;
      if (typeof value === 'string') return value;
      const language = i18n.language?.toLowerCase() || '';
      return language.startsWith('en')
        ? value.en ?? value.it ?? fallback
        : value.it ?? value.en ?? fallback;
    },
    [i18n.language],
  );

  // Sincronizza la selezione di bozza ogni volta che il modal si apre.
  useEffect(() => {
    if (visible) setDraftSelected(initialSelected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Carica i tag reali + calcola un ordine "trending" dai post (Task 2).
  useEffect(() => {
    if (!visible) return;

    let active = true;
    const load = async () => {
      try {
        setTagsLoading(true);
        const [tagsSnapshot, posts] = await Promise.all([
          getDocs(collection(db, 'tags')),
          getAllBarberPosts().catch(() => []),
        ]);

        const tags = tagsSnapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((tag) => tag.active !== false);

        // Trend = somma dei like dei post in cui il tag compare.
        const trend = {};
        (Array.isArray(posts) ? posts : []).forEach((post) => {
          const weight = (post?.likesCount || post?.likes || 0) + 1; // +1 per dare peso anche ai post senza like
          const postTags = Array.isArray(post?.selectedTags) ? post.selectedTags : [];
          postTags.forEach((tg) => {
            const key = typeof tg === 'string' ? tg : tg?.id;
            if (!key) return;
            trend[key] = (trend[key] || 0) + weight;
          });
        });

        if (active) {
          setTrendOrder(trend);
          setAvailableTags(tags);
        }
      } catch (error) {
        console.error('FilterModal: errore caricamento tag:', error);
        if (active) setAvailableTags([]);
      } finally {
        if (active) setTagsLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [visible]);

  const colorSelected = draftSelected.includes(COLOR_TAG_ID);

  // Lista finale: tag "colore" sintetico + tag reali, ordinati per trend desc,
  // poi alfabeticamente. Il tag "colore" è messo sempre in testa per visibilità.
  const orderedTags = useMemo(() => {
    const real = [...availableTags].sort((a, b) => {
      const ta = trendOrder[a.id] || 0;
      const tb = trendOrder[b.id] || 0;
      if (tb !== ta) return tb - ta;
      return getLocalizedText(a.label, a.id).localeCompare(getLocalizedText(b.label, b.id));
    });
    return [COLOR_TAG, ...real];
  }, [availableTags, trendOrder, getLocalizedText]);

  const toggleTag = useCallback((tagId) => {
    setDraftSelected((prev) => {
      if (prev.includes(tagId)) {
        // Deselezionando "colore" si rimuovono anche i colori selezionati.
        if (tagId === COLOR_TAG_ID) {
          return prev.filter((id) => id !== COLOR_TAG_ID && !isColorTagId(id));
        }
        return prev.filter((id) => id !== tagId);
      }
      return [...prev, tagId];
    });
  }, []);

  const handleApply = () => {
    onApply?.(draftSelected);
    onClose?.();
  };

  // "Pulisci" azzera E applica immediatamente i filtri, senza bisogno di "Applica".
  const handleClear = () => {
    setDraftSelected([]);
    onApply?.([]);
    onClose?.();
  };

  const colorOptions = getColorTagOptions();

  return (
    // Task 4:
    //   - `animationType="none"` → l'animazione la guidiamo noi via Reanimated
    //     spring (UI thread, 60fps, niente "scatti" della slide nativa).
    //   - root contenitore con `pointerEvents="box-none"` + nessun colore di
    //     sfondo → lo schermo dietro alla sheet resta visibile e cliccabile,
    //     come richiesto (niente overlay scuro).
    //   - L'utente chiude tappando fuori (area trasparente sopra la sheet) o
    //     usando il bottone × dentro l'header. Pressable invisibile in alto
    //     gestisce il tap-fuori senza colorare il background.
    <Modal
      visible={mounted}
      animationType="none"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root} pointerEvents="box-none">
        {/* Area "tap fuori per chiudere": copre tutto lo schermo SOPRA la
            sheet ma è trasparente. Niente backdrop scuro. */}
        <Pressable style={styles.tapOutside} onPress={onClose} />
        <Reanimated.View style={[styles.sheet, sheetAnimatedStyle]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{t('HomeScreen.filtersTitle', 'Filtri')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Entypo name="cross" size={22} color="#111" />
            </TouchableOpacity>
          </View>

          {tagsLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color="#00BCD4" />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
              <View style={styles.chips}>
                {orderedTags.map((tag) => {
                  const selected = draftSelected.includes(tag.id);
                  return (
                    <TouchableOpacity
                      key={tag.id}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => toggleTag(tag.id)}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {getLocalizedText(tag.label, tag.id)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Colori come tag, visibili solo quando "colore" è selezionato (Task 2). */}
              {colorSelected && (
                <View style={styles.colorSection}>
                  <Text style={styles.colorSectionTitle}>
                    {t('HomeScreen.selectColors', 'Seleziona i colori')}
                  </Text>
                  <View style={styles.chips}>
                    {colorOptions.map((color) => {
                      const selected = draftSelected.includes(color.id);
                      return (
                        <TouchableOpacity
                          key={color.id}
                          style={[styles.colorChip, selected && styles.chipSelected]}
                          onPress={() => toggleTag(color.id)}
                        >
                          <View style={[styles.colorDot, { backgroundColor: color.hex }]} />
                          <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                            {getLocalizedText(color.label, color.id)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleClear}>
              <Text style={styles.secondaryText}>{t('HomeScreen.clear', 'Pulisci')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleApply}>
              <Text style={styles.primaryText}>{t('HomeScreen.apply', 'Applica')}</Text>
            </TouchableOpacity>
          </View>
        </Reanimated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Task 4: niente colore di sfondo qui — lo schermo dietro la sheet resta
  // visibile e interattivo. La sheet è posizionata in basso in modo assoluto
  // così il translateY animato non scolla dal bordo inferiore.
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  tapOutside: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
    // Ombra morbida per "staccare" la sheet dallo schermo senza overlay scuro.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#d6d6d6',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    color: '#111',
    fontSize: 22,
    fontWeight: '800',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f2f2f2',
  },
  loading: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  colorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  chipSelected: {
    borderColor: '#00BCD4',
    backgroundColor: '#e9fbfd',
  },
  chipText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#008fa1',
  },
  colorSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  colorSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
  },
  secondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f2f2f2',
    marginRight: 10,
  },
  secondaryText: {
    color: '#333',
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00BCD4',
  },
  primaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});

export default FilterModal;
