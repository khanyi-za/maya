import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { imageSource } from '@/lib/image-source';
import { useAuthStore } from '@/lib/auth-store';
import {
  APIError,
  getConversationByMerchant,
  getChatMessages,
  markConversationRead,
  sendChatMessage,
  type ChatMessage,
} from '@/lib/api-client';
import { openChatSocket } from '@/lib/chat-socket';

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function ChatScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  // Route param is named artistId for historical reasons; value = merchant
  // username. Optional orderId arrives when opened from Track Order.
  const username = params.artistId as string;
  const orderId = typeof params.orderId === 'string' ? params.orderId : undefined;

  const authStatus = useAuthStore((s) => s.state.status);

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const conversationQuery = useQuery({
    queryKey: ['chat', 'conversation', username],
    queryFn: () => getConversationByMerchant(username),
    staleTime: 5 * 60 * 1000,
    enabled: !!username && authStatus === 'authenticated',
  });
  const conversation = conversationQuery.data?.conversation;
  const conversationId = conversation?.id;

  const appendUnique = useCallback((message: ChatMessage) => {
    setMessages((prev) =>
      prev.some((m) => m.id === message.id) ? prev : [...prev, message]
    );
  }, []);

  // Initial history load.
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    setHistoryLoading(true);
    getChatMessages(conversationId, { limit: 50 })
      .then(({ messages: history }) => {
        if (!cancelled) setMessages(history);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    markConversationRead(conversationId).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Real-time fan-out: join the conversation room, append incoming messages.
  useEffect(() => {
    if (!conversationId) return;
    let cleanup: (() => void) | undefined;
    let unmounted = false;

    openChatSocket(conversationId, {
      onMessage: (message) => {
        appendUnique(message);
        if (message.sender === 'merchant') {
          markConversationRead(conversationId).catch(() => {});
        }
      },
    })
      .then((c) => {
        if (unmounted) c();
        else cleanup = c;
      })
      .catch(() => {});

    return () => {
      unmounted = true;
      cleanup?.();
    };
  }, [conversationId, appendUnique]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (text.length === 0 || !conversationId) return;

    const idempotencyKey = uuid();
    const tempId = `local-${idempotencyKey}`;
    const optimistic: ChatMessage = {
      id: tempId,
      conversationId,
      sender: 'user',
      senderId: 'me',
      text,
      attachments: [],
      orderRef: orderId ?? null,
      status: 'sent',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInputText('');

    try {
      const { message } = await sendChatMessage(
        conversationId,
        { text, ...(orderId ? { orderRef: orderId } : {}) },
        idempotencyKey
      );
      // Swap the optimistic bubble for the server message; if the socket echo
      // already delivered it, just drop the temp.
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        return withoutTemp.some((m) => m.id === message.id)
          ? withoutTemp
          : [...withoutTemp, message];
      });
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputText(text);
      if (err instanceof APIError && err.status === 429) {
        Alert.alert('Slow down', 'Too many messages. Wait a moment and try again.');
      } else {
        Alert.alert("Couldn't send", 'Check your connection and try again.');
      }
    }
  };

  const handleAttach = () => {
    // Image attachments need the chat_attachment Cloudinary preset (ops item).
    Alert.alert('Coming soon', 'Photo attachments are on their way.');
  };

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  const logoSource = imageSource(conversation?.merchant.logo);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === 'user';

    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.artistMessageContainer,
        ]}
      >
        {!isUser && logoSource && (
          <Image source={logoSource} style={styles.messageAvatar} contentFit="cover" />
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.artistBubble]}>
          <Text
            style={[styles.messageText, isUser ? styles.userMessageText : styles.artistMessageText]}
          >
            {item.text}
          </Text>
          <Text style={[styles.messageTime, isUser ? styles.userMessageTime : styles.artistMessageTime]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  // ── Auth / loading / error states ──

  if (authStatus !== 'authenticated') {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.stateContainer, { paddingTop: insets.top }]}>
          {authStatus === 'loading' ? (
            <ActivityIndicator size="large" color="#333" />
          ) : (
            <>
              <Text style={styles.stateTitle}>Sign in to chat</Text>
              <Text style={styles.stateText}>
                Message brands directly from your YIIVA account.
              </Text>
              <TouchableOpacity
                style={styles.stateButton}
                onPress={() => router.push('/auth/login')}
              >
                <Text style={styles.stateButtonText}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.stateBackLink}>Go back</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  if (conversationQuery.isPending) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.stateContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color="#333" />
        </View>
      </View>
    );
  }

  if (conversationQuery.isError || !conversation) {
    const notFound =
      conversationQuery.error instanceof APIError &&
      conversationQuery.error.status === 404;
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.stateContainer, { paddingTop: insets.top }]}>
          <Text style={styles.stateTitle}>
            {notFound ? 'Brand not found' : "Couldn't open the chat"}
          </Text>
          <TouchableOpacity
            style={styles.stateButton}
            onPress={() =>
              notFound ? router.back() : conversationQuery.refetch()
            }
          >
            <Text style={styles.stateButtonText}>{notFound ? 'Go back' : 'Retry'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const merchant = conversation.merchant;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          {logoSource && (
            <Image source={logoSource} style={styles.headerAvatar} contentFit="cover" />
          )}
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{merchant.displayName}</Text>
            <Text style={styles.headerSubtitle}>
              {merchant.avgResponseTime
                ? `Usually responds within ${merchant.avgResponseTime}`
                : merchant.isVerified
                  ? 'Verified Brand'
                  : 'Brand'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.headerAction}
          onPress={() => router.push(`/artist/${merchant.username}`)}
        >
          <IconSymbol name="info.circle" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      {historyLoading ? (
        <View style={styles.historyLoading}>
          <ActivityIndicator size="small" color="#333" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>
                Say hi to {merchant.displayName} — ask about sizing, stock or
                your order.
              </Text>
            </View>
          }
        />
      )}

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.attachButton} onPress={handleAttach}>
              <IconSymbol name="plus.circle.fill" size={28} color="#007AFF" />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder={`Message ${merchant.displayName}...`}
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
              autoCorrect={true}
              autoCapitalize="sentences"
              returnKeyType="default"
              blurOnSubmit={false}
              editable={true}
            />

            <TouchableOpacity
              style={[styles.sendButton, inputText.trim().length === 0 && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={inputText.trim().length === 0}
            >
              <IconSymbol
                name="arrow.up.circle.fill"
                size={32}
                color={inputText.trim().length > 0 ? '#007AFF' : '#ccc'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  stateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  stateButton: {
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 24,
  },
  stateButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  stateBackLink: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'underline',
  },
  historyLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChat: {
    paddingTop: 80,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  emptyChatText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  headerAction: {
    padding: 8,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  artistMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '70%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  artistBubble: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  artistMessageText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  userMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  artistMessageTime: {
    color: '#999',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  attachButton: {
    padding: 4,
    marginBottom: 4,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 18,
    fontSize: 15,
    color: '#000',
  },
  sendButton: {
    padding: 4,
    marginBottom: 2,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
