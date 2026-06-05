import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { auth } from '../../config/firebase';
import { REPORT_REASONS, submitReport } from '../services/reportService';
import { blockUser, markBlockedLocally } from '../services/blockService';

// M5 §5.1.a — Menu "tre puntini" su post/profilo.
// Mostra Report e Block; nasconde le azioni sui propri contenuti.
// Props:
//   targetType:      'post' | 'profile'
//   targetId:        string (postId o uid barbiere)
//   targetOwnerUid:  string (uid proprietario)
//   onBlocked:       () => void  (callback dopo blocco, per filtrare lo state locale)
//   onReported:      () => void  (callback dopo report, per eventuale UI)
//   color:           string opzionale, colore icona ⋮
const PostActionsMenu = ({
  targetType,
  targetId,
  targetOwnerUid,
  onBlocked,
  onReported,
  color = '#262626',
  testID,
}) => {
  const { t } = useTranslation();
  const [menuVisible, setMenuVisible] = useState(false);
  const [reasonPickerVisible, setReasonPickerVisible] = useState(false);

  // Auto-hide: non mostrare il menu per i propri contenuti.
  const currentUid = auth.currentUser?.uid;
  if (!currentUid || !targetOwnerUid || currentUid === targetOwnerUid) {
    return null;
  }

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);
  const closeReasons = () => setReasonPickerVisible(false);

  const handleReportPress = () => {
    closeMenu();
    setReasonPickerVisible(true);
  };

  const handleBlockPress = () => {
    closeMenu();
    Alert.alert(
      t('PostActionsMenu.blockConfirmTitle'),
      t('PostActionsMenu.blockConfirmMessage'),
      [
        { text: t('PostActionsMenu.cancel'), style: 'cancel' },
        {
          text: t('PostActionsMenu.blockAction'),
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(targetOwnerUid);
              markBlockedLocally(targetOwnerUid);
              if (typeof onBlocked === 'function') onBlocked(targetOwnerUid);
              Alert.alert(
                t('PostActionsMenu.blockedTitle'),
                t('PostActionsMenu.blockedMessage'),
              );
            } catch (error) {
              Alert.alert(
                t('PostActionsMenu.errorTitle'),
                t('PostActionsMenu.blockError'),
              );
            }
          },
        },
      ],
    );
  };

  const submitWithReason = async (reasonKey) => {
    closeReasons();
    try {
      await submitReport({
        targetType,
        targetId,
        targetOwnerUid,
        reason: reasonKey,
      });
      if (typeof onReported === 'function') onReported();
      Alert.alert(
        t('PostActionsMenu.reportedTitle'),
        t('PostActionsMenu.reportedMessage'),
      );
    } catch (error) {
      Alert.alert(
        t('PostActionsMenu.errorTitle'),
        t('PostActionsMenu.reportError'),
      );
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={openMenu}
        style={styles.trigger}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        accessibilityLabel={t('PostActionsMenu.openMenu')}
        testID={testID}
      >
        <Text style={[styles.triggerText, { color }]}>⋮</Text>
      </TouchableOpacity>

      {/* Action sheet principale */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.backdrop} onPress={closeMenu}>
          <Pressable style={styles.sheet}>
            <TouchableOpacity style={styles.action} onPress={handleReportPress}>
              <Text style={styles.actionText}>{t('PostActionsMenu.report')}</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.action} onPress={handleBlockPress}>
              <Text style={[styles.actionText, styles.dangerText]}>
                {t('PostActionsMenu.block')}
              </Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.action} onPress={closeMenu}>
              <Text style={[styles.actionText, styles.cancelText]}>
                {t('PostActionsMenu.cancel')}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Picker motivo report */}
      <Modal
        visible={reasonPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={closeReasons}
      >
        <Pressable style={styles.backdrop} onPress={closeReasons}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('PostActionsMenu.reasonTitle')}</Text>
            {REPORT_REASONS.map((reasonKey, idx) => (
              <React.Fragment key={reasonKey}>
                {idx > 0 ? <View style={styles.divider} /> : null}
                <TouchableOpacity
                  style={styles.action}
                  onPress={() => submitWithReason(reasonKey)}
                >
                  <Text style={styles.actionText}>
                    {t(`PostActionsMenu.reason_${reasonKey}`)}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
            <View style={styles.divider} />
            <TouchableOpacity style={styles.action} onPress={closeReasons}>
              <Text style={[styles.actionText, styles.cancelText]}>
                {t('PostActionsMenu.cancel')}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    padding: 4,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerText: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 22,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingVertical: 6,
    paddingBottom: 24,
  },
  sheetTitle: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  action: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  actionText: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
  },
  dangerText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  cancelText: {
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
});

export default PostActionsMenu;
