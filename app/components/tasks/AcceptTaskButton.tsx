import React, { useState } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  Alert,
  View,
  TextInput,
  Modal
} from 'react-native';
import { taskService } from '@/app/services/taskService';
import { useRouter } from 'expo-router';
import Colors from '@/app/constants/Colors';
import { X, Send, MessageSquare } from 'lucide-react-native';

interface AcceptTaskButtonProps {
  taskId: string;
  style?: any;
  onSuccess?: (conversationId: string | null) => void;
  buttonText?: string;
  showMessageInput?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export default function AcceptTaskButton({
  taskId,
  style,
  onSuccess,
  buttonText = "Accept Task",
  showMessageInput = true,
  size = 'medium'
}: AcceptTaskButtonProps) {
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handlePress = () => {
    if (showMessageInput) {
      setModalVisible(true);
    } else {
      acceptTask();
    }
  };

  const acceptTask = async (applicationMessage?: string) => {
    setLoading(true);
    
    try {
      const result = await taskService.acceptTask(taskId, applicationMessage);
      
      if (result.success) {
        if (onSuccess) {
          onSuccess(result.conversationId);
        } else {
          Alert.alert(
            'Success', 
            'Task application submitted successfully!', 
            [
              { 
                text: 'View Conversation', 
                onPress: () => {
                  if (result.conversationId) {
                    router.push(`/chat/${result.conversationId}`);
                  }
                } 
              },
              { text: 'OK', style: 'cancel' }
            ]
          );
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to accept task. Please try again.');
      }
    } catch (error) {
      console.error('Error accepting task:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
      setModalVisible(false);
    }
  };

  const handleSubmit = () => {
    acceptTask(message);
  };

  const buttonSize = {
    small: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      fontSize: 14,
    },
    medium: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      fontSize: 16,
    },
    large: {
      paddingVertical: 14,
      paddingHorizontal: 20,
      fontSize: 18,
    }
  }[size];

  return (
    <>
      <TouchableOpacity
        style={[
          styles.button,
          { 
            paddingVertical: buttonSize.paddingVertical,
            paddingHorizontal: buttonSize.paddingHorizontal
          },
          style
        ]}
        onPress={handlePress}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Accept task"
      >
        {loading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={[styles.buttonText, { fontSize: buttonSize.fontSize }]}>
            {buttonText}
          </Text>
        )}
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply for this task</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              Add a message to the task owner (optional)
            </Text>
            
            <TextInput
              style={styles.messageInput}
              placeholder="Why are you a good fit for this task?"
              placeholderTextColor={Colors.textSecondary}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Send size={16} color="#ffffff" />
                    <Text style={styles.submitButtonText}>Send Application</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  buttonText: {
    color: '#ffffff',
    fontFamily: 'SpaceGrotesk-Bold',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    width: '100%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk-Bold',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  messageInput: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    color: Colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
    color: Colors.textSecondary,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#ffffff',
    marginLeft: 8,
  },
}); 