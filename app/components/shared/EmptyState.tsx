import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/Colors';
import { AlertCircle, MessageCircle, ListMinus } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: string | keyof typeof Ionicons.glyphMap;
  buttonText?: string;
  onButtonPress?: () => void;
  // To distinguish between Ionicons and Lucide icons
  useIonicons?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  icon = 'alert-circle',
  buttonText,
  onButtonPress,
  useIonicons = false
}) => {
  const getIcon = () => {
    // If useIonicons is true, render an Ionicons icon
    if (useIonicons) {
      return <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={64} color={Colors.textSecondary} />;
    }

    // Otherwise render Lucide icons
    switch (icon) {
      case 'message-circle':
        return <MessageCircle size={64} color={Colors.textSecondary} />;
      case 'list-minus':
        return <ListMinus size={64} color={Colors.textSecondary} />;
      case 'alert-circle':
      default:
        return <AlertCircle size={64} color={Colors.textSecondary} />;
    }
  };

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        {getIcon()}
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      
      {buttonText && onButtonPress && (
        <TouchableOpacity style={styles.emptyButton} onPress={onButtonPress}>
          <Text style={styles.emptyButtonText}>{buttonText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Default export
export default EmptyState;

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.7,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
  }
}); 