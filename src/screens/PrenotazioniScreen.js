import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { Image } from "expo-image";

const logoBook = require('../../assets/icons8-più-48.png');

const PrenotazioniScreen = () => (
  <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <View style={styles.emptyState}>
      <Image source={logoBook} style={styles.emptyIcon} />
      <Text style={styles.emptyTitle}>Le tue prenotazioni</Text>
      <Text style={styles.emptyDescription}>
        Qui gestirai tutti i tuoi appuntamenti con i parrucchieri
      </Text>
    </View>
  </ScrollView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyIcon: {
    width: 40,
    height: 40,
    marginBottom: 20,
    resizeMode: 'contain',
    tintColor: '#00BCD4',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default PrenotazioniScreen;
