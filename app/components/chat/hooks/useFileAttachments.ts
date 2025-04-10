import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/app/lib/supabase';
import { chatService } from '@/app/services/chatService';

const useFileAttachments = (
  conversationId: string, 
  setToastMessage: (message: string) => void, 
  setShowToast: (show: boolean) => void,
  loadMessages: () => void
) => {
  const [sending, setSending] = useState(false);
  
  // Function to handle file attachment
  const handleAttachment = async () => {
    Alert.alert(
      "Choose Attachment",
      "What would you like to share?",
      [
        {
          text: "Photo from Gallery",
          onPress: () => pickImage()
        },
        {
          text: "Document",
          onPress: () => pickDocument()
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  };
  
  // Function to pick an image from the gallery
  const pickImage = async () => {
    try {
      // Request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission needed", "Please allow access to your photo library to share images.");
        return;
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Start upload process
        setToastMessage("Uploading image...");
        setShowToast(true);
        
        // Get the selected image URI
        const imageUri = result.assets[0].uri;
        
        // Upload the image and send a message with the image URL
        await uploadAndSendFile(imageUri, 'image');
      }
    } catch (error) {
      console.error("Error picking image:", error);
      setToastMessage("Failed to attach image");
      setShowToast(true);
    }
  };
  
  // Function to pick a document
  const pickDocument = async () => {
    try {
      // Use the correct DocumentPicker API
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain', 'application/msword', 
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      
      if (result.assets && result.assets.length > 0) {
        // Start upload process
        setToastMessage("Uploading document...");
        setShowToast(true);
        
        // Upload the document and send a message with the document URL
        await uploadAndSendFile(result.assets[0].uri, 'document', result.assets[0].name);
      }
    } catch (error) {
      console.error("Error picking document:", error);
      setToastMessage("Failed to attach document");
      setShowToast(true);
    }
  };
  
  // Function to upload a file and send a message with the file URL
  const uploadAndSendFile = async (uri: string, fileType: 'image' | 'document', fileName: string | null = null) => {
    try {
      setSending(true);
      
      // Create a unique file path
      const fileExt = uri.split('.').pop()?.toLowerCase() || (fileType === 'image' ? 'jpg' : 'pdf');
      const timestamp = Date.now();
      const generatedFileName = fileName || `${fileType}_${timestamp}.${fileExt}`;
      const filePath = `chat_files/${conversationId}/${timestamp}_${generatedFileName}`;
      
      // Read file as base64
      const fileContent = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Upload to Supabase Storage using the profiles bucket
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, decode(fileContent), {
          contentType: fileType === 'image' 
            ? `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
            : `application/${fileExt}`,
          upsert: true
        });
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Get the public URL
      const { data: urlData } = await supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);
      
      const publicUrl = urlData.publicUrl;
      
      // Send a message with the file information
      const fileMessage = fileType === 'image' 
        ? `[Image] ${publicUrl}`
        : `[Document: ${generatedFileName}] ${publicUrl}`;
      
      await chatService.sendMessage(conversationId, fileMessage);
      
      // Success message
      setToastMessage(`${fileType === 'image' ? 'Image' : 'Document'} sent successfully`);
      setShowToast(true);
      
      // Refresh messages immediately
      loadMessages();
      
      return true;
    } catch (error) {
      console.error(`Error uploading ${fileType}:`, error);
      setToastMessage(`Failed to send ${fileType}. Please try again.`);
      setShowToast(true);
      return false;
    } finally {
      setSending(false);
    }
  };
  
  return {
    sending,
    handleAttachment,
    pickImage,
    pickDocument,
    uploadAndSendFile
  };
};

export { useFileAttachments };
export default useFileAttachments; 