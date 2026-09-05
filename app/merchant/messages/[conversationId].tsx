import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Text } from '@/components/ui/text';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useThemeColors } from '@/lib/theme';
import { haptics } from '@/lib/haptics';
import {
  APIError,
  getMerchantChatMessages,
  markMerchantConversationRead,
  sendMerchantChatMessage,
  type ChatMessage,
} from '@/lib/api-client';
import { openChatSocket } from '@/lib/chat-socket';

// Merchant side of a buyer conversation — mirrors app/chat/[artistId].tsx with
// the perspective reversed: "my" bubbles are sender === 'merchant'. Text-only
// in v1 (attachments follow the buyer screen once the upload preset ships).

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type ChatRow =
  | { kind: 'day'; id: string; label: string }
  | { kind: 'msg'; msg: ChatMessage };

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === new Date(now.getTime() - 86_400_000).toDateString()) {
    return 'Yesterday';
  }
  return d.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'long',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
}

function withDaySeparators(messages: ChatMessage[]): ChatRow[] {
  const rows: ChatRow[] = [];
  let lastDay = '';
  for (const msg of messages) {
    const day = new Date(msg.createdAt).toDateString();
    if (day !== lastDay) {
      rows.push({ kind: 'day', id: `day-${day}`, label: dayLabel(msg.createdAt) });
      lastDay = day;
    }
    rows.push({ kind: 'msg', msg });
  }
  return rows;
}

export default function MerchantChatScreen() {
  const params = useLocalSearchParams<{
    conversationId: string;
    buyerName?: string;
    buyerAvatar?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);

  const conversationId = params.conversationId;
  const buyerName = params.buyerName || 'Buyer';
  const buyerAvatar = params.buyerAvatar || null;

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const appendUnique = useCallback((message: ChatMessage) => {
    setMessages((prev) =>
      prev.some((m) => m.id === message.id) ? prev : [...prev, message]
    );
  }, []);

  const markRead = useCallback(() => {
    if (!conversationId) return;
    markMerchantConversationRead(conversationId)
      .then(() =>
        queryClient.invalidateQueries({ queryKey: ['merchant', 'conversations'] })
      )
      .catch(() => {});
  }, [conversationId, queryClient]);

  // Initial history load.
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    setHistoryLoading(true);
    getMerchantChatMessages(conversationId, { limit: 50 })
      .then(({ messages: history }) => {
        if (!cancelled) setMessages(history);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    markRead();
    return () => {
      cancelled = true;
    };
  }, [conversationId, markRead]);

  // Real-time fan-out — the /chat gateway admits store managers already.
  useEffect(() => {
    if (!conversationId) return;
    let cleanup: (() => void) | undefined;
    let unmounted = false;

    openChatSocket(conversationId, {
      onMessage: (message) => {
        appendUnique(message);
        if (message.sender === 'user') {
          markRead();
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
  }, [conversationId, appendUnique, markRead]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const canSend = inputText.trim().length > 0;

  const handleSend = async () => {
    const text = inputText.trim();
    if (text.length === 0 || !conversationId) return;

    haptics.light();
    const idempotencyKey = uuid();
    const tempId = `local-${idempotencyKey}`;
    const optimistic: ChatMessage = {
      id: tempId,
      conversationId,
      sender: 'merchant',
      senderId: 'me',
      text,
      attachments: [],
      orderRef: null,
      status: 'sent',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInputText('');

    try {
      const { message } = await sendMerchantChatMessage(
        conversationId,
        { text },
        idempotencyKey
      );
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

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  const renderRow = ({ item: row }: { item: ChatRow }) => {
    if (row.kind === 'day') {
      return (
        <View className="my-3 items-center">
          <View className="rounded-full bg-muted px-3 py-1">
            <Text variant="micro" className="font-normal">
              {row.label}
            </Text>
          </View>
        </View>
      );
    }
    const item = row.msg;
    const isMine = item.sender === 'merchant';

    return (
      <View
        className={`mb-4 flex-row items-end ${isMine ? 'justify-end' : 'justify-start'}`}
      >
        <View
          className={`max-w-[70%] rounded-[20px] px-4 py-2.5 ${
            isMine ? 'bg-brand rounded-br-md' : 'bg-muted rounded-bl-md'
          }`}
        >
          {item.attachments.map((attachment, index) => {
            const aspect =
              attachment.width && attachment.height
                ? attachment.width / attachment.height
                : 1;
            return (
              <Image
                key={`${item.id}-att-${index}`}
                source={{ uri: attachment.thumbnailUrl ?? attachment.url }}
                style={{
                  width: 200,
                  borderRadius: 12,
                  marginTop: 2,
                  marginBottom: 6,
                  backgroundColor: colors.muted,
                  aspectRatio: Math.min(Math.max(aspect, 0.5), 2),
                }}
                contentFit="cover"
              />
            );
          })}
          {!!item.text && (
            <Text
              variant="body"
              className={isMine ? 'text-brand-foreground' : 'text-foreground'}
            >
              {item.text}
            </Text>
          )}
          <Text
            variant="micro"
            className={`mt-1 ${
              isMine ? 'text-right text-brand-foreground' : 'text-muted-foreground'
            }`}
          >
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View
        className="flex-row items-center border-b border-border bg-card px-4 pb-3"
        style={{ paddingTop: insets.top + 12 }}
      >
        <TouchableOpacity onPress={() => router.back()} className="mr-2 p-2">
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </TouchableOpacity>

        <View className="flex-1 flex-row items-center gap-3">
          <Avatar uri={buyerAvatar} fallback={buyerName.charAt(0)} size={36} />
          <View className="flex-1">
            <Text variant="heading">{buyerName}</Text>
            <Text variant="caption" className="mt-0.5">
              Buyer
            </Text>
          </View>
        </View>
      </View>

      {/* Messages List */}
      {historyLoading ? (
        <View className="flex-1 gap-4 px-4 py-4">
          <Skeleton className="h-10 w-1/2 self-start rounded-[20px] rounded-bl-md" />
          <Skeleton className="h-16 w-3/5 self-end rounded-[20px] rounded-br-md" />
          <Skeleton className="h-10 w-2/5 self-start rounded-[20px] rounded-bl-md" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={withDaySeparators(messages)}
          renderItem={renderRow}
          keyExtractor={(item) => (item.kind === 'day' ? item.id : item.msg.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          ListEmptyComponent={
            <EmptyState
              icon="bubble.left.fill"
              title="No messages yet"
              caption="Reply to buyers here — they'll get a push notification."
            />
          }
        />
      )}

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View
          className="border-t border-border bg-card px-4 pt-2"
          style={{ paddingBottom: insets.bottom + 8 }}
        >
          <View className="flex-row items-end gap-2">
            <TextInput
              className="max-h-[100px] min-h-[40px] flex-1 rounded-[20px] bg-muted px-4 py-2 text-[15px] text-foreground"
              placeholder={`Reply to ${buyerName}...`}
              placeholderTextColor={colors.mutedForeground}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
              autoCorrect={true}
              autoCapitalize="sentences"
              returnKeyType="default"
              blurOnSubmit={false}
            />

            <TouchableOpacity
              className={`mb-0.5 h-9 w-9 items-center justify-center rounded-full ${
                canSend ? 'bg-brand' : 'bg-muted'
              }`}
              onPress={handleSend}
              disabled={!canSend}
            >
              <IconSymbol
                name="arrow.up"
                size={18}
                color={canSend ? colors.brandForeground : colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
