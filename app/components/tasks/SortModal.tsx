import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Colors from '../../constants/Colors';

interface SortOption {
  id: string;
  label: string;
}

interface SortModalProps {
  visible: boolean;
  currentSortBy: string;
  onClose: () => void;
  onSort: (sortOption: string) => void;
}

const SortModal: React.FC<SortModalProps> = ({ 
  visible, 
  currentSortBy, 
  onClose, 
  onSort 
}) => {
  const sortOptions: SortOption[] = [
    { id: 'distance_near', label: 'Nearest First' },
    { id: 'distance_far', label: 'Furthest First' },
    { id: 'recent', label: 'Most Recent' },
    { id: 'oldest', label: 'Oldest First' },
    { id: 'deadline_soon', label: 'Deadline (Soonest)' },
    { id: 'priority_high', label: 'Highest Priority' },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={20} style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.modalOverlayTouch} 
          activeOpacity={1} 
          onPress={onClose}
        >
          <View style={styles.sortModalContainer}>
            <View style={styles.sortModalContent}>
              <Text style={styles.sortModalTitle}>Sort Tasks</Text>
              
              {sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.sortOption,
                    currentSortBy === option.id && styles.selectedSortOption
                  ]}
                  onPress={() => onSort(option.id)}
                >
                  <Text 
                    style={[
                      styles.sortOptionText,
                      currentSortBy === option.id && styles.selectedSortOptionText
                    ]}
                  >
                    {option.label}
                  </Text>
                  {currentSortBy === option.id && (
                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlayTouch: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortModalContainer: {
    width: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  sortModalContent: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  sortModalTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginBottom: 16,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  selectedSortOption: {
    backgroundColor: 'rgba(63, 137, 249, 0.1)',
  },
  sortOptionText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.text,
  },
  selectedSortOptionText: {
    color: Colors.primary,
  },
});

export default SortModal; 