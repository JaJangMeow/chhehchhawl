import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal,
  ScrollView,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../../types/task';
import Colors from '../../constants/Colors';
import { MapPin, Navigation } from 'lucide-react-native';

// Define a type alias for the filter options
type TaskFilters = {
  status: string[];
  category: string[];
  urgency: boolean | null;
  minBudget: number | null;
  maxBudget: number | null;
  maxDistance: number | null;
  minDistance: number | null;
  distanceRange: string | null;
};

interface FilterModalProps {
  visible: boolean;
  tasks: Task[];
  filters: TaskFilters;
  tempFilters: TaskFilters;
  onClose: () => void;
  onApplyFilters: (filters: TaskFilters) => void;
  onResetFilters: () => void;
  setTempFilters: React.Dispatch<React.SetStateAction<TaskFilters>>;
}

const FilterModal: React.FC<FilterModalProps> = ({ 
  visible, 
  tasks,
  filters,
  tempFilters,
  onClose, 
  onApplyFilters,
  onResetFilters,
  setTempFilters
}) => {
  // Extract all unique categories from tasks
  const allCategories = Array.from(
    new Set(
      tasks
        .filter(task => task.categories && task.categories.length > 0)
        .flatMap(task => task.categories || [])
    )
  );

  const statusOptions = [
    { id: 'pending', label: 'Pending' },
    { id: 'assigned', label: 'Assigned' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  const toggleStatusFilter = (status: string) => {
    if (tempFilters.status.includes(status)) {
      setTempFilters({
        ...tempFilters,
        status: tempFilters.status.filter(s => s !== status)
      });
    } else {
      setTempFilters({
        ...tempFilters,
        status: [...tempFilters.status, status]
      });
    }
  };

  const toggleCategoryFilter = (category: string) => {
    if (tempFilters.category.includes(category)) {
      setTempFilters({
        ...tempFilters,
        category: tempFilters.category.filter(c => c !== category)
      });
    } else {
      setTempFilters({
        ...tempFilters,
        category: [...tempFilters.category, category]
      });
    }
  };

  const setUrgencyFilter = (urgency: boolean | null) => {
    setTempFilters({
      ...tempFilters,
      urgency
    });
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.filterModalContainer}>
        <View style={styles.filterModalContent}>
          <View style={styles.filterModalHeader}>
            <Text style={styles.filterModalTitle}>Filter Tasks</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterScrollContent}>
            {/* Status Filters */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Status</Text>
              <View style={styles.filterOptions}>
                {statusOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.filterChip,
                      tempFilters.status.includes(option.id) && styles.selectedFilterChip
                    ]}
                    onPress={() => toggleStatusFilter(option.id)}
                  >
                    <Text 
                      style={[
                        styles.filterChipText,
                        tempFilters.status.includes(option.id) && styles.selectedFilterChipText
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Category Filters */}
            {allCategories.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Categories</Text>
                <View style={styles.filterOptions}>
                  {allCategories.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.filterChip,
                        tempFilters.category.includes(category) && styles.selectedFilterChip
                      ]}
                      onPress={() => toggleCategoryFilter(category)}
                    >
                      <Text 
                        style={[
                          styles.filterChipText,
                          tempFilters.category.includes(category) && styles.selectedFilterChipText
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Urgency Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Urgency</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    tempFilters.urgency === true && styles.selectedFilterChip
                  ]}
                  onPress={() => setUrgencyFilter(tempFilters.urgency === true ? null : true)}
                >
                  <Text 
                    style={[
                      styles.filterChipText,
                      tempFilters.urgency === true && styles.selectedFilterChipText
                    ]}
                  >
                    Urgent Only
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    tempFilters.urgency === false && styles.selectedFilterChip
                  ]}
                  onPress={() => setUrgencyFilter(tempFilters.urgency === false ? null : false)}
                >
                  <Text 
                    style={[
                      styles.filterChipText,
                      tempFilters.urgency === false && styles.selectedFilterChipText
                    ]}
                  >
                    Non-Urgent Only
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Budget Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Budget Range</Text>
              <View style={styles.budgetInputContainer}>
                <View style={styles.budgetInput}>
                  <Text style={styles.budgetInputLabel}>Min ₹</Text>
                  <TextInput
                    style={styles.budgetInputField}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={Colors.textSecondary}
                    value={tempFilters.minBudget?.toString() || ''}
                    onChangeText={(text) => setTempFilters({
                      ...tempFilters,
                      minBudget: text ? parseInt(text, 10) : null
                    })}
                  />
                </View>
                <Text style={styles.budgetSeparator}>to</Text>
                <View style={styles.budgetInput}>
                  <Text style={styles.budgetInputLabel}>Max ₹</Text>
                  <TextInput
                    style={styles.budgetInputField}
                    keyboardType="numeric"
                    placeholder="Any"
                    placeholderTextColor={Colors.textSecondary}
                    value={tempFilters.maxBudget?.toString() || ''}
                    onChangeText={(text) => setTempFilters({
                      ...tempFilters,
                      maxBudget: text ? parseInt(text, 10) : null
                    })}
                  />
                </View>
              </View>
            </View>

            {/* Distance Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Distance</Text>
              <View style={styles.distanceOptionsContainer}>
                <TouchableOpacity 
                  style={[
                    styles.distanceOption,
                    tempFilters.distanceRange === 'nearby' && styles.selectedDistanceOption
                  ]}
                  onPress={() => setTempFilters({...tempFilters, distanceRange: 'nearby', maxDistance: 1000})}
                >
                  <MapPin size={16} color={tempFilters.distanceRange === 'nearby' ? Colors.primary : Colors.textSecondary} />
                  <Text style={[
                    styles.distanceOptionText,
                    tempFilters.distanceRange === 'nearby' && styles.selectedDistanceOptionText
                  ]}>
                    &lt;1km
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.distanceOption,
                    tempFilters.distanceRange === 'close' && styles.selectedDistanceOption
                  ]}
                  onPress={() => setTempFilters({...tempFilters, distanceRange: 'close', minDistance: 1000, maxDistance: 5000})}
                >
                  <Navigation size={16} color={tempFilters.distanceRange === 'close' ? Colors.primary : Colors.textSecondary} />
                  <Text style={[
                    styles.distanceOptionText,
                    tempFilters.distanceRange === 'close' && styles.selectedDistanceOptionText
                  ]}>
                    1-5km
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.distanceOption,
                    tempFilters.distanceRange === 'medium' && styles.selectedDistanceOption
                  ]}
                  onPress={() => setTempFilters({...tempFilters, distanceRange: 'medium', minDistance: 5000, maxDistance: 50000})}
                >
                  <Navigation size={16} color={tempFilters.distanceRange === 'medium' ? Colors.primary : Colors.textSecondary} />
                  <Text style={[
                    styles.distanceOptionText,
                    tempFilters.distanceRange === 'medium' && styles.selectedDistanceOptionText
                  ]}>
                    5-50km
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.distanceOption,
                    tempFilters.distanceRange === 'far' && styles.selectedDistanceOption
                  ]}
                  onPress={() => setTempFilters({...tempFilters, distanceRange: 'far', minDistance: 50000, maxDistance: null})}
                >
                  <MapPin size={16} color={tempFilters.distanceRange === 'far' ? Colors.primary : Colors.textSecondary} />
                  <Text style={[
                    styles.distanceOptionText,
                    tempFilters.distanceRange === 'far' && styles.selectedDistanceOptionText
                  ]}>
                    &gt;50km
                  </Text>
                </TouchableOpacity>
              </View>
              
              {tempFilters.distanceRange && (
                <TouchableOpacity
                  style={styles.resetDistanceButton}
                  onPress={() => setTempFilters({
                    ...tempFilters, 
                    distanceRange: null, 
                    minDistance: null, 
                    maxDistance: null
                  })}
                >
                  <Text style={styles.resetDistanceText}>Reset Distance Filter</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          <View style={styles.filterActions}>
            <TouchableOpacity 
              style={styles.resetButton}
              onPress={onResetFilters}
            >
              <Text style={styles.resetButtonText}>Reset All</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={() => onApplyFilters(tempFilters)}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  filterModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '80%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  filterModalTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
  },
  filterScrollContent: {
    flex: 1,
  },
  filterSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  selectedFilterChip: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.text,
  },
  selectedFilterChipText: {
    color: '#fff',
  },
  budgetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  budgetInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  budgetInputLabel: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.textSecondary,
    marginRight: 4,
  },
  budgetInputField: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.text,
  },
  budgetSeparator: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.textSecondary,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    marginRight: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#fff',
  },
  distanceOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 16,
    gap: 8,
  },
  distanceOption: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  selectedDistanceOption: {
    backgroundColor: 'rgba(71, 133, 255, 0.15)',
    borderColor: Colors.primary,
  },
  distanceOptionText: {
    marginLeft: 6,
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.textSecondary,
  },
  selectedDistanceOptionText: {
    color: Colors.primary,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  resetDistanceButton: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginTop: 8,
  },
  resetDistanceText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.primary,
  },
});

export default FilterModal; 