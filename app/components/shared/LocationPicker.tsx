import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Colors } from '../../constants/Colors';
import { MapPin } from 'lucide-react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import Button from './Button';

interface LocationData {
  lat: number;
  lng: number;
  address?: string;
}

interface LocationPickerProps {
  label: string;
  value?: LocationData;
  onChange: (location: LocationData | undefined) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Select location',
  required,
  error,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [tempLocation, setTempLocation] = useState<LocationData | undefined>(value);
  const [mapRegion, setMapRegion] = useState({
    latitude: value?.lat || 20.5937, // Default location (India center)
    longitude: value?.lng || 78.9629,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [loading, setLoading] = useState(false);

  const openLocationPicker = () => {
    setModalVisible(true);
    setTempLocation(value);
  };

  const handleCancel = () => {
    setModalVisible(false);
    setTempLocation(value);
  };

  const handleConfirm = () => {
    onChange(tempLocation);
    setModalVisible(false);
  };

  const handleMapPress = (event: any) => {
    const { coordinate } = event.nativeEvent;
    setTempLocation({
      lat: coordinate.latitude,
      lng: coordinate.longitude,
    });
    
    // You could call a geocoding service here to get the address
    // For simplicity, we'll just use coordinates
  };

  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({});
      const currentLocation = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
      
      setTempLocation(currentLocation);
      setMapRegion({
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        latitudeDelta: 0.0122,
        longitudeDelta: 0.0121,
      });
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        {required && <Text style={styles.required}>*</Text>}
      </View>
      
      <TouchableOpacity
        style={[styles.picker, error ? styles.pickerError : {}]}
        onPress={openLocationPicker}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.pickerText,
          !value && styles.placeholderText
        ]}>
          {value 
            ? `${value.address || `${value.lat.toFixed(6)}, ${value.lng.toFixed(6)}`}` 
            : placeholder
          }
        </Text>
        <MapPin size={20} color={Colors.textSecondary} />
      </TouchableOpacity>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCancel}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Location</Text>
            
            <MapView
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              region={mapRegion}
              onPress={handleMapPress}
            >
              {tempLocation && (
                <Marker
                  coordinate={{
                    latitude: tempLocation.lat,
                    longitude: tempLocation.lng,
                  }}
                  pinColor={Colors.primary}
                />
              )}
            </MapView>
            
            <View style={styles.buttonRow}>
              <Button
                title="Use Current Location"
                onPress={getCurrentLocation}
                loading={loading}
                variant="outline"
                style={styles.button}
              />
            </View>
            
            <View style={styles.buttonRow}>
              <Button
                title="Cancel"
                onPress={handleCancel}
                variant="secondary"
                style={styles.button}
              />
              <Button
                title="Confirm"
                onPress={handleConfirm}
                disabled={!tempLocation}
                style={styles.button}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.text,
  },
  required: {
    fontSize: 16,
    color: Colors.error,
    marginLeft: 4,
  },
  picker: {
    backgroundColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerError: {
    borderColor: Colors.error,
  },
  pickerText: {
    fontSize: 16,
    color: Colors.text,
    fontFamily: 'SpaceGrotesk-Regular',
    flex: 1,
  },
  placeholderText: {
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.error,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    width: '90%',
    height: '80%',
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  map: {
    width: '100%',
    height: '70%',
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
  },
});

export default LocationPicker; 