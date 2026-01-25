import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Text,
  TouchableOpacity,
  Image,
} from 'react-native';
import { BlurView } from 'expo-blur';

// Dati casuali per i prodotti con brand e colori vivaci
const RANDOM_PRODUCTS = [
  { id: '1', name: 'Shampoo Profesionale', brand: 'Luxe Hair', price: '12,99€', color: '#FF6B6B' },
  { id: '2', name: 'Balsamo Nutriente', brand: 'Silky Threads', price: '14,99€', color: '#4ECDC4' },
  { id: '3', name: 'Gel Fissante', brand: 'Style Max', price: '9,99€', color: '#FFE66D' },
  { id: '4', name: 'Mousse Volume', brand: 'Cloud Care', price: '10,99€', color: '#95E1D3' },
  { id: '5', name: 'Olio Capelli', brand: 'Pure Essence', price: '18,99€', color: '#F38181' },
  { id: '6', name: 'Siero Lisciante', brand: 'Sleek Pro', price: '16,99€', color: '#AA96DA' },
  { id: '7', name: 'Pettine Professionlae', brand: 'Precision', price: '7,99€', color: '#FCBAD3' },
  { id: '8', name: 'Spazzola Premium', brand: 'Brush Masters', price: '8,99€', color: '#A8D8EA' },
];

const ShopScreen = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    // Mescola i prodotti in ordine casuale
    const shuffled = [...RANDOM_PRODUCTS].sort(() => Math.random() - 0.5);
    setProducts(shuffled);
  }, []);

  const renderProductItem = ({ item }) => (
    <TouchableOpacity style={styles.productCard}>
      <View style={[styles.productImagePlaceholder, { backgroundColor: item.color }]}>
        <Text style={styles.productIcon}>✨</Text>
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productBrand}>{item.brand}</Text>
        <Text style={styles.productName}>{item.name}</Text>
        <View style={styles.productFooter}>
          <Text style={styles.productPrice}>{item.price}</Text>
          <TouchableOpacity style={styles.addButton}>
            <Text style={styles.addButtonText}>add +</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>

    
      <FlatList
        data={products}
        renderItem={renderProductItem}
        keyExtractor={item => item.id}
        numColumns={1}
        contentContainerStyle={styles.listContent}
        scrollEnabled={true}
      />

      {/* Overlay con blur e messaggio "Disponibile a breve" */}
       <BlurView intensity={35} style={styles.blurOverlay}>
        <View style={styles.glassmorphicContainer}>
          <Text style={styles.comingSoonText}>Disponibile a breve</Text>
          <Text style={styles.subText}>Questo servizio sarà presto disponibile</Text>
        </View>
      </BlurView> 
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00BCD4',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  productImagePlaceholder: {
    width: '100%',
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productIcon: {
    fontSize: 80,
  },
  productInfo: {
    padding: 16,
  },
  productBrand: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  productName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#00BCD4',
  },
  addButton: {
    width: 70,
    height: 70,
    borderRadius: 25,
    backgroundColor: '#ffffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ffffffff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassmorphicContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backdropFilter: 'blur(20px)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 5,
  },
  comingSoonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00BCD4',
    marginBottom: 10,
    textAlign: 'center',
  },
  subText: {
    fontSize: 16,
    color: '#00BCD4',
    textAlign: 'center',
    fontWeight: '500',
    opacity: 0.85,
  },
});

export default ShopScreen;
