import React, { useRef, useState } from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Send, Paperclip } from 'lucide-react-native';
import Colors from '@/app/constants/Colors';

interface MessageInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttachment: () => void;
  sending: boolean;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  value,
  onChangeText,
  onSend,
  onAttachment,
  sending,
  disabled = false
}) => {
  const [inputHeight, setInputHeight] = useState(40);
  const inputRef = useRef<TextInput>(null);
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      style={styles.keyboardContainer}
    >
      <View style={styles.inputContainer}>
        {/* Attachment button */}
        <TouchableOpacity 
          style={styles.attachmentButton}
          onPress={onAttachment}
          disabled={sending || disabled}
        >
          <Paperclip size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
        
        <TextInput
          style={[styles.input, { height: Math.max(40, inputHeight) }]}
          value={value}
          onChangeText={onChangeText}
          placeholder="Type a message..."
          multiline
          onContentSizeChange={(e) => {
            const height = e.nativeEvent.contentSize.height;
            setInputHeight(Math.min(height, 120));
          }}
          placeholderTextColor={Colors.textSecondary}
          ref={inputRef}
          editable={!disabled}
        />
        
        <TouchableOpacity 
          style={[
            styles.sendButton,
            { opacity: !value.trim() || sending || disabled ? 0.5 : 1 }
          ]}
          onPress={onSend}
          disabled={!value.trim() || sending || disabled}
        >
          {sending ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Send size={20} color={Colors.white} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  input: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    color: '#e0e0e0',
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  attachmentButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    marginRight: 8,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  }
});

export default MessageInput; 