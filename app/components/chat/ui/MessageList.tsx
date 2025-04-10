import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowDown } from 'lucide-react-native';
import Colors from '@/app/constants/Colors';
import MessageItem from '../MessageItem';
import { Message } from '@/app/types/messages';

interface MessageListProps {
  groupedMessages: any[];
  messages: Message[];
  loading: boolean;
  refreshing: boolean;
  currentUserId: string | null;
  onRefresh: () => void;
  onLoadMessages: () => void;
}

const MessageList: React.FC<MessageListProps> = ({
  groupedMessages,
  messages,
  loading,
  refreshing,
  currentUserId,
  onRefresh,
  onLoadMessages
}) => {
  const flatListRef = useRef<FlatList>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const hasScrolledToBottomOnceRef = useRef(false);
  const prevMessagesLengthRef = useRef(0);
  const isScrollingRef = useRef(false);
  
  // Memoize scroll to bottom function to maintain consistent reference
  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && !isScrollingRef.current) {
      isScrollingRef.current = true;
      flatListRef.current.scrollToEnd({ animated: true });
      setShowScrollButton(false);
      // Reset scrolling flag after animation completes
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 300);
    }
  }, []);
  
  // Scroll to bottom when new messages arrive, but only if we're already at the bottom
  // or when we receive the first batch of messages
  useEffect(() => {
    if (!messages.length) return;
    
    const isFirstLoad = prevMessagesLengthRef.current === 0 && messages.length > 0;
    const hasNewMessages = messages.length > prevMessagesLengthRef.current;
    const shouldScrollToBottom = 
      isFirstLoad || 
      (hasNewMessages && !showScrollButton);
    
    if (shouldScrollToBottom && flatListRef.current && !isScrollingRef.current) {
      // Small delay to allow rendering
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: false });
          hasScrolledToBottomOnceRef.current = true;
        }
      }, 100);
    }
    
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, showScrollButton]);
  
  // Handle scroll events to show/hide scroll button
  const handleScroll = useCallback((event: any) => {
    if (isScrollingRef.current) return;
    
    const offsetY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const layoutHeight = event.nativeEvent.layoutMeasurement.height;
    
    // Show button if not at bottom (with a threshold of 100)
    const isAtBottom = contentHeight - layoutHeight - offsetY < 100;
    setShowScrollButton(!isAtBottom);
  }, []);
  
  // Memoize renderEmptyState
  const renderEmptyState = useCallback(() => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No messages yet</Text>
        <Text style={styles.emptyText}>
          Your conversation will appear here. Start the conversation by sending a message.
        </Text>
      </View>
    );
  }, [loading]);
  
  // Memoize renderMessageGroup
  const renderMessageGroup = useCallback(({ item, index }: { item: any; index: number }) => {
    if (item.isUnreadIndicator) {
      return (
        <View style={styles.unreadIndicator}>
          <Text style={styles.unreadCount}>{item.unreadCount}</Text>
        </View>
      );
    }
    
    if (!item.messages?.length) return null;
    
    return (
      <View style={styles.messageGroup}>
        {item.messages.map((message: Message, msgIndex: number) => (
          <MessageItem
            key={message.id}
            message={message}
            currentUserId={currentUserId || ''}
            showAvatar={msgIndex === (item.messages?.length || 0) - 1}
            refreshMessages={onLoadMessages}
          />
        ))}
      </View>
    );
  }, [currentUserId, onLoadMessages]);
  
  // Memoize key extractor
  const keyExtractor = useCallback((item: any, index: number) => {
    if (item.isUnreadIndicator) {
      return 'unread-indicator';
    }
    if (item.messages?.length) {
      return `group-${item.messages[0]?.id || index}`;
    }
    return item.id || `item-${index}`;
  }, []);
  
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.messagesContainer}>
      <FlatList
        ref={flatListRef}
        data={groupedMessages}
        keyExtractor={keyExtractor}
        renderItem={renderMessageGroup}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={200}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
        // Disable the automatic scrollToIndex behavior
        disableScrollViewPanResponder={true}
        // Disable automatic content size updates that can cause loops
        automaticallyAdjustContentInsets={false}
      />
      
      {/* Scroll to bottom button */}
      {showScrollButton && (
        <TouchableOpacity 
          style={styles.scrollToBottomButton}
          onPress={scrollToBottom}
        >
          <ArrowDown size={20} color={Colors.white} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  messagesContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
  },
  messagesList: {
    flexGrow: 1,
    backgroundColor: '#000000',
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 5,
  },
  messageGroup: {
    marginBottom: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000000',
  },
  loadingText: {
    marginTop: 12,
    color: Colors.primary,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000000',
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#e0e0e0',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9e9e9e',
    marginTop: 10,
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 15,
  },
  scrollToBottomButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 100,
  },
  unreadIndicator: {
    backgroundColor: Colors.primary,
    alignSelf: 'center',
    padding: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginVertical: 8,
  },
  unreadCount: {
    color: Colors.white,
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Bold',
  },
});

export default React.memo(MessageList); 