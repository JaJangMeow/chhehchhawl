import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/app/constants/Colors';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  centered?: boolean;
}

const Logo: React.FC<LogoProps> = ({ 
  size = 'medium', 
  color = Colors.primary,
  centered = true
}) => {
  // Determine font size and spacing based on size prop
  let fontSize = 48;
  let asteriskSize = 16;
  let asteriskOffset = -8;
  
  if (size === 'small') {
    fontSize = 32;
    asteriskSize = 12;
    asteriskOffset = -6;
  } else if (size === 'large') {
    fontSize = 120;
    asteriskSize = 40;
    asteriskOffset = -20;
  }
  
  return (
    <View style={[styles.container, centered && styles.centered]}>
      <Text style={[styles.asterisk, { fontSize: asteriskSize, color, top: asteriskOffset, left: asteriskOffset }]}>*</Text>
      <Text style={[styles.logo, { fontSize, color }]}>CCCL</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontFamily: 'SpaceGrotesk-Bold',
    letterSpacing: -2,
  },
  asterisk: {
    fontFamily: 'SpaceGrotesk-Bold',
    position: 'absolute',
    zIndex: 1,
  }
});

export default Logo; 