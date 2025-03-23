import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useState } from 'react';
import { Colors } from '@/app/constants/Colors';
import { ChevronDown, Check } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

type Gender = 'Male' | 'Female' | null;

interface GenderDropdownProps {
  label: string;
  value: Gender;
  onChange: (gender: Gender) => void;
  delay?: number;
  error?: string;
}

export default function GenderDropdown({
  label,
  value,
  onChange,
  delay = 0,
  error
}: GenderDropdownProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalVisible(true);
  };

  const handleSelect = (gender: Gender) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChange(gender);
    setModalVisible(false);
  };

  return (
    <Animated.View 
      entering={FadeIn.delay(delay).duration(500)}
      style={styles.container}
    >
      <Text style={styles.label}>{label}</Text>
      
      <TouchableOpacity
        style={[styles.dropdownButton, error ? styles.errorBorder : null]}
        onPress={handlePress}
      >
        <Text style={value ? styles.selectedText : styles.placeholderText}>
          {value || 'Select Gender'}
        </Text>
        <ChevronDown size={20} color={Colors.textSecondary} />
      </TouchableOpacity>
      
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <Animated.View 
            entering={FadeInDown.duration(300)}
            style={styles.modalContent}
          >
            <Text style={styles.modalTitle}>Select Gender</Text>
            
            <TouchableOpacity
              style={styles.option}
              onPress={() => handleSelect('Male')}
            >
              <Text style={styles.optionText}>Male</Text>
              {value === 'Male' && <Check size={20} color={Colors.primary} />}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.option}
              onPress={() => handleSelect('Female')}
            >
              <Text style={styles.optionText}>Female</Text>
              {value === 'Female' && <Check size={20} color={Colors.primary} />}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: Colors.text,
    fontSize: 16,
    marginBottom: 8,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
  },
  selectedText: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  placeholderText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  errorBorder: {
    borderColor: Colors.error,
    borderWidth: 1,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  optionText: {
    fontSize: 16,
    color: Colors.text,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  cancelButton: {
    marginTop: 20,
    alignItems: 'center',
    padding: 15,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: 'SpaceGrotesk-Regular',
  },
}); 