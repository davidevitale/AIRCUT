import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity
} from 'react-native';

const logoHome = require('../assets/icons8-casa-256.png');
const logoLikeB = require('../assets/icons8-cuore-48.png');
const logoSearch = require('../assets/icons8-ricerca-480.png'); // Riutilizziamo questa icona per search
const logobag = require('../assets/icons8-borsa-della-spesa-96.png');
const logoAccount = require('../assets/icons8-user-96.png');

// Componente Bottom Navigation
const BottomNavigation = ({ activeTab, setActiveTab }) => (
  <View style={styles.bottomNav}>
    <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('home')}>
      <Image source={logoHome} style={[styles.logoIcon, { tintColor: activeTab === 'home' ? '#00BCD4' : '#000' }]} />
      <Text style={activeTab === 'home' ? styles.navLabelActive : styles.navLabel}>Home</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('like')}>
      <Image source={logoLikeB} style={[styles.logoIcon, { tintColor: activeTab === 'like' ? '#00BCD4' : '#000' }]} />
      <Text style={activeTab === 'like' ? styles.navLabelActive : styles.navLabel}>Like</Text>
    </TouchableOpacity>
    {/*  <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('search')}>
      <Image source={logoSearch} style={[styles.logoIcon, { tintColor: activeTab === 'search' ? '#00BCD4' : '#000' }]} />
      <Text style={activeTab === 'search' ? styles.navLabelActive : styles.navLabel}>Cerca</Text> 
    </TouchableOpacity> */}
    <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('shop')}>
      <Image source={logobag} style={[styles.logoIcon, { tintColor: activeTab === 'shop' ? '#00BCD4' : '#000' }]} />
      <Text style={activeTab === 'shop' ? styles.navLabelActive : styles.navLabel}>Shop</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('account')}>
      <Image source={logoAccount} style={[styles.logoIcon, { tintColor: activeTab === 'account' ? '#00BCD4' : '#000' }]} />
      <Text style={activeTab === 'account' ? styles.navLabelActive : styles.navLabel}>Account</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  // Bottom Navigation
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navItem: {
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 12,
    color: '#000',
  },
  navLabelActive: {
    fontSize: 12,
    color: '#00BCD4',
    fontWeight: '500',
  },
  logoIcon: {
    width: 25,
    height: 25,
    marginBottom: 4,
    resizeMode: 'contain',
  },
  searchIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
});

export default BottomNavigation;
