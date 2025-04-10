import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Colors } from '@/app/constants/Colors';
import { MapPin, Search, X, Locate } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import debounce from 'lodash.debounce';
import * as Location from 'expo-location';

// Mock address autocomplete API - in a real app, replace with Google Places API or similar
const mockAddressSearch = async (query: string): Promise<Array<{description: string, city: string, state: string}>> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (!query || query.length < 3) return [];
  
  // Mock data
  const addresses = [
    { description: '123 Main Street, Mumbai', city: 'Mumbai', state: 'Maharashtra' },
    { description: '456 Park Avenue, Delhi', city: 'Delhi', state: 'Delhi' },
    { description: '789 Oak Road, Bangalore', city: 'Bangalore', state: 'Karnataka' },
    { description: '101 Pine Lane, Chennai', city: 'Chennai', state: 'Tamil Nadu' },
    { description: '202 Maple Drive, Kolkata', city: 'Kolkata', state: 'West Bengal' },
    { description: '303 Cedar Blvd, Aizawl', city: 'Aizawl', state: 'Mizoram' },
    { description: '404 Elm Court, Shillong', city: 'Shillong', state: 'Meghalaya' },
  ];
  
  return addresses.filter(addr => 
    addr.description.toLowerCase().includes(query.toLowerCase())
  );
};

// Mock reverse geocoding function that would be replaced with actual API call in production
const mockReverseGeocode = async (latitude: number, longitude: number): Promise<{
  address: string;
  city: string;
  state: string;
} | null> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Return mock data for demo purposes
  // In a real app, this would call Google Maps Geocoding API or similar
  return {
    address: '303 Cedar Blvd, Aizawl',
    city: 'Aizawl',
    state: 'Mizoram'
  };
};

interface AddressInputProps {
  label: string;
  value: string;
  onChangeAddress: (address: string) => void;
  onChangeCity: (city: string) => void;
  onChangeState?: (state: string) => void;
  delay?: number;
  error?: string;
}

export default function AddressInput({
  label,
  value,
  onChangeAddress,
  onChangeCity,
  onChangeState,
  delay = 0,
  error
}: AddressInputProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Array<{description: string, city: string, state: string}>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Setup debounced search function
  const debouncedSearch = useRef(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length >= 3) {
        setLoading(true);
        try {
          const results = await mockAddressSearch(searchQuery);
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
        } catch (error) {
          console.error('Address search error:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 500)
  ).current;

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const handleInputChange = (text: string) => {
    setQuery(text);
    onChangeAddress(text);
    
    if (text.length >= 3) {
      setLoading(true);
      debouncedSearch(text);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionPress = (suggestion: {description: string, city: string, state: string}) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setQuery(suggestion.description);
    onChangeAddress(suggestion.description);
    onChangeCity(suggestion.city);
    if (onChangeState) {
      onChangeState(suggestion.state);
    }
    setShowSuggestions(false);
  };

  const handleAutoDetect = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLocationLoading(true);
    
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        throw new Error('Permission to access location was denied');
      }
      
      // Get current position
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      // Use reverse geocoding to get address details
      const addressData = await mockReverseGeocode(latitude, longitude);
      
      if (addressData) {
        setQuery(addressData.address);
        onChangeAddress(addressData.address);
        onChangeCity(addressData.city);
        if (onChangeState) {
          onChangeState(addressData.state);
        }
        
        // Haptic feedback for success
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error detecting location:', error);
      // Haptic feedback for error
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLocationLoading(false);
    }
  };

  const clearInput = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuery('');
    onChangeAddress('');
    onChangeCity('');
    if (onChangeState) {
      onChangeState('');
    }
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <Animated.View 
      entering={FadeIn.delay(delay).duration(500)}
      style={styles.container}
    >
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity 
          style={styles.autoDetectButton}
          onPress={handleAutoDetect}
          disabled={locationLoading}
        >
          {locationLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <>
              <Locate size={16} color={Colors.primary} />
              <Text style={styles.autoDetectText}>Auto Detect</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      
      <View style={[styles.inputContainer, error ? styles.errorBorder : null]}>
        <MapPin size={20} color={Colors.textSecondary} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={handleInputChange}
          placeholder="Enter your address"
          placeholderTextColor={Colors.textSecondary}
          onFocus={() => {
            if (query.length >= 3) {
              debouncedSearch(query);
            }
          }}
        />
        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : query.length > 0 ? (
          <TouchableOpacity onPress={clearInput}>
            <X size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>
      
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}
      
      {showSuggestions && (
        <Animated.View 
          entering={FadeInDown.duration(300)}
          style={styles.suggestionsContainer}
        >
          <ScrollView>
            {suggestions.length > 0 ? (
              suggestions.map((item, index) => (
                <TouchableOpacity
                  key={`suggestion-${index}`}
                  style={styles.suggestionItem}
                  onPress={() => handleSuggestionPress(item)}
                >
                  <MapPin size={16} color={Colors.primary} />
                  <Text style={styles.suggestionText}>{item.description}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noResultsText}>No results found</Text>
            )}
          </ScrollView>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    zIndex: 10,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  autoDetectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.primary}20`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  autoDetectText: {
    color: Colors.primary,
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 12,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    paddingVertical: 16,
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
  suggestionsContainer: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 200,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  suggestionText: {
    color: Colors.text,
    fontSize: 14,
    flex: 1,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  noResultsText: {
    padding: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: 'SpaceGrotesk-Regular',
  },
}); 