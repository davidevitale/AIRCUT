import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
} from 'react-native';

const UserListItem = ({ user, onUserPress }) => {
  const profileInitial = user?.nomeSalone?.charAt(0)?.toUpperCase() || 'S';

  const handleUserPress = () => {
    if (onUserPress) {
      onUserPress(user);
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handleUserPress}>
      <View style={styles.content}>
        {/* Immagine Profilo */}
        <View style={styles.profileImageContainer}>
          {user.profileImage ? (
            <Image
              source={{ uri: user.profileImage }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.profileInitial}>{profileInitial}</Text>
            </View>
          )}
        </View>

        {/* Informazioni Utente */}
        <View style={styles.userInfo}>
          <Text style={styles.salonName} numberOfLines={1}>
            {user.nomeSalone || 'Salone'}
          </Text>
          
          {user.nomiDipendenti && (
            <Text style={styles.employeeName} numberOfLines={1}>
              {user.nomiDipendenti}
            </Text>
          )}
          
          {user.via && (
            <Text style={styles.location} numberOfLines={1}>
               {user.via}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageContainer: {
    marginRight: 14,
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f0f0',
  },
  profilePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  profileInitial: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  userInfo: {
    flex: 1,
  },
  salonName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  employeeName: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#334155',
  },
});

export default UserListItem;
