import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import Colors from '../../constants/Colors';

interface ToastProps {
  message: string;
  show: boolean;
  onHide: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, show, onHide }) => {
  const [fadeAnim] = useState(new Animated.Value(0)); // Initial value for opacity: 0

  useEffect(() => {
    if (show) {
      Animated.timing(
        fadeAnim,
        {
          toValue: 1,
          duration: 500,
          easing: Easing.ease,
          useNativeDriver: true,
        }
      ).start(() => {
        setTimeout(() => {
          Animated.timing(
            fadeAnim,
            {
              toValue: 0,
              duration: 500,
              easing: Easing.ease,
              useNativeDriver: true,
            }
          ).start(onHide);
        }, 3000);
      });
    } else {
      fadeAnim.setValue(0);
    }
  }, [show, fadeAnim, onHide]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
        }
      ]}
    >
      <AlertCircle size={20} color="#fff" />{/* Replace with valid icon */}
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    color: Colors.white,
    marginLeft: 8,
  },
});

export default Toast;
