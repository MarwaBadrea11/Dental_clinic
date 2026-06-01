import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal as RNModal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import Text from './Text';

interface CustomModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  isRTL: boolean;
}

export const CustomModal: React.FC<CustomModalProps> = ({
  visible,
  onClose,
  title,
  children,
  isRTL,
}) => {
  const { colors } = useTheme();
  
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalContent, { backgroundColor: colors.surfaceCard }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { 
              color: colors.text, 
              textAlign: isRTL ? 'right' : 'left',
              flex: 1 
            }]}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textSub} />
            </TouchableOpacity>
          </View>
          {children}
        </Pressable>
      </Pressable>
    </RNModal>
  );
};

interface DropdownProps {
  label: string;
  value: string | null;
  placeholder: string;
  onPress: () => void;
  isRTL: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  value,
  placeholder,
  onPress,
  isRTL,
}) => {
  const { colors } = useTheme();
  
  return (
    <View style={styles.dropdownContainer}>
      <Text style={[styles.dropdownLabel, { 
        color: colors.textSub, 
        textAlign: isRTL ? 'right' : 'left' 
      }]}>
        {label}
      </Text>
      <TouchableOpacity 
        style={[styles.dropdownButton, { 
          borderColor: colors.outline + '60',
          backgroundColor: colors.surfaceCard,
          flexDirection: isRTL ? 'row-reverse' : 'row'
        }]} 
        onPress={onPress}
      >
        <Text style={[styles.dropdownValue, { 
          color: value ? colors.text : colors.textSub + '70',
          textAlign: isRTL ? 'right' : 'left',
          flex: 1
        }]}>
          {value || placeholder}
        </Text>
        <Ionicons 
          name={isRTL ? 'chevron-back' : 'chevron-forward'} 
          size={20} 
          color={colors.textSub} 
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '70%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  dropdownContainer: {
    marginBottom: 20,
  },
  dropdownLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdownButton: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dropdownValue: {
    fontSize: 16,
    fontWeight: '500',
  },
});