import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Text,
  TouchableOpacity,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import Reanimated, { useAnimatedScrollHandler } from 'react-native-reanimated';
import { useTabBarScroll } from '../../context/TabBarScrollContext';

const AnimatedFlatList = Reanimated.createAnimatedComponent(FlatList);

const ShopScreen = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  // FloatingTabBar shrink-on-scroll
  const { scrollY } = useTabBarScroll();
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      scrollY.value = Math.max(0, event.contentOffset.y);
    },
  });

  const randomProducts = [
    { id: '1', name: t('ShopScreen.products.shampoo'), brand: 'Luxe Hair', price: 'EUR 12.99', color: '#FF6B6B' },
    { id: '2', name: t('ShopScreen.products.conditioner'), brand: 'Silky Threads', price: 'EUR 14.99', color: '#4ECDC4' },
    { id: '3', name: t('ShopScreen.products.gel'), brand: 'Style Max', price: 'EUR 9.99', color: '#FFE66D' },
    { id: '4', name: t('ShopScreen.products.mousse'), brand: 'Cloud Care', price: 'EUR 10.99', color: '#95E1D3' },
    { id: '5', name: t('ShopScreen.products.hairOil'), brand: 'Pure Essence', price: 'EUR 18.99', color: '#F38181' },
    { id: '6', name: t('ShopScreen.products.serum'), brand: 'Sleek Pro', price: 'EUR 16.99', color: '#AA96DA' },
    { id: '7', name: t('ShopScreen.products.comb'), brand: 'Precision', price: 'EUR 7.99', color: '#FCBAD3' },
    { id: '8', name: t('ShopScreen.products.brush'), brand: 'Brush Masters', price: 'EUR 8.99', color: '#A8D8EA' },
  ];

  useEffect(() => {
    const shuffled = [...randomProducts].sort(() => Math.random() - 0.5);
    setProducts(shuffled);
  }, [t]);

  const renderProductItem = ({ item }) => (
    <TouchableOpacity style={styles.productCard}>
      <View style={[styles.productImagePlaceholder, { backgroundColor: item.color }]}>
        <Text style={styles.productIcon}>*</Text>
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productBrand}>{item.brand}</Text>
        <Text style={styles.productName}>{item.name}</Text>
        <View style={styles.productFooter}>
          <Text style={styles.productPrice}>{item.price}</Text>
          <TouchableOpacity style={styles.addButton}>
            <Text style={styles.addButtonText}>{t('ShopScreen.addButton')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <AnimatedFlatList
        data={products}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id}
        numColumns={1}
        contentContainerStyle={[styles.listContent, { paddingBottom: 120 }]}
        scrollEnabled
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      />

      <BlurView intensity={35} style={styles.blurOverlay}>
        <View style={styles.glassmorphicContainer}>
          <Text style={styles.comingSoonText}>{t('ShopScreen.comingSoonTitle')}</Text>
          <Text style={styles.subText}>{t('ShopScreen.comingSoonDescription')}</Text>
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
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
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

