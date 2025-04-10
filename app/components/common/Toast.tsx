import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/app/constants/Colors';
import { FontAwesome } from '@expo/vector-icons';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onClose,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // Set timeout for auto-close
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        if (onClose) onClose();
      });
    }, duration);
    
    return () => clearTimeout(timer);
  }, [fadeAnim, duration, onClose]);
  
  // Handle manual close
  const handleClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      if (onClose) onClose();
    });
  };
  
  const getToastStyle = (): any => {
    switch (type) {
      case 'success':
        return { backgroundColor: Colors.success };
      case 'error':
        return { backgroundColor: Colors.danger };
      case 'warning':
        return { backgroundColor: Colors.warning };
      case 'info':
      default:
        return { backgroundColor: Colors.primary };
    }
  };
  
  const getIcon = (): string => {
    switch (type) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'exclamation-circle';
      case 'warning':
        return 'exclamation-triangle';
      case 'info':
      default:
        return 'info-circle';
    }
  };
  
  return (
    <Animated.View
      style={[
        styles.container,
        getToastStyle(),
        { opacity: fadeAnim },
      ]}
    >
      <View style={styles.content}>
        <FontAwesome name={getIcon()} size={20} color="white" style={styles.icon} />
        <Text style={styles.message}>{message}</Text>
      </View>
      <TouchableOpacity 
        onPress={handleClose}
        style={styles.closeButton}
        activeOpacity={0.7}
      >
        <FontAwesome name="times" size={16} color="white" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  message: {
    color: 'white',
    fontWeight: '500',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
});

// Add default export
export default Toast; 