
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, StyleProp, ViewStyle, TextStyle } from 'react-native';
import Colors from '../../constants/Colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  isLoading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
}

const Button = ({
  title,
  onPress,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}: ButtonProps) => {
  // Determine button style based on variant
  const getButtonStyle = (): StyleProp<ViewStyle> => {
    const baseStyle: ViewStyle = {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    };

    switch (variant) {
      case 'primary':
        return { ...baseStyle, backgroundColor: Colors.primary };
      case 'secondary':
        return { ...baseStyle, backgroundColor: Colors.secondary };
      case 'outline':
        return { 
          ...baseStyle, 
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: Colors.primary 
        };
      case 'danger':
        return { ...baseStyle, backgroundColor: Colors.error };
      default:
        return baseStyle;
    }
  };

  // Determine text style based on variant
  const getTextStyle = (): StyleProp<TextStyle> => {
    const baseStyle: TextStyle = {
      fontSize: 16,
      fontFamily: 'SpaceGrotesk-Medium',
      textAlign: 'center',
    };

    switch (variant) {
      case 'primary':
        return { ...baseStyle, color: '#fff' };
      case 'secondary':
        return { ...baseStyle, color: '#fff' };
      case 'outline':
        return { ...baseStyle, color: Colors.primary };
      case 'danger':
        return { ...baseStyle, color: '#fff' };
      default:
        return baseStyle;
    }
  };

  return (
    <TouchableOpacity
      style={[
        getButtonStyle(),
        disabled && { opacity: 0.5 },
        style,
      ]}
      onPress={onPress}
      disabled={isLoading || disabled}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          {icon && icon}
          <Text style={[getTextStyle(), icon && { marginLeft: 8 }, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

export default Button;
