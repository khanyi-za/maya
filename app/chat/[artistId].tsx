import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Text } from '@/components/ui/text';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useThemeColors } from '@/lib/theme';
import { imageSource } from '@/lib/image-source';
import { useAuthStore } from '@/lib/auth-store';
import {
  APIError,
  getConversationByMerchant,
  getChatMessages,
  markConversationRead,
  sendChatMessage,
  type ChatImageAttachment,
  type ChatMessage,
} from '@/lib/api-client';
import { openChatSocket } from '@/lib/chat-socket';
import { pickChatImage, uploadChatImage } from '@/lib/chat-upload';

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
  const colors = useThemeColors();
  const flatListRef = useRef<FlatList>(null);

  // Route param is named artistId for historical reasons; value = merchant
  // username. Optional orderId arrives when opened from Track Order.
  const username = params.artistId as string;
  const orderId = typeof params.orderId === 'string' ? params.orderId : undefined;

  const authStatus = useAuthStore((s) => s.state.status);

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [pendingAttachment, setPendingAttachment] = useState<
    | { localUri: string; status: 'uploading'; attachment: null }
    | { localUri: string; status: 'ready'; attachment: ChatImageAttachment }
    | null
  >(null);

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

  const canSend =
    (inputText.trim().length > 0 || pendingAttachment?.status === 'ready') &&
    pendingAttachment?.status !== 'uploading';

  const handleSend = async () => {
    const text = inputText.trim();
    const attachment =
      pendingAttachment?.status === 'ready' ? pendingAttachment.attachment : null;
    if ((text.length === 0 && !attachment) || !conversationId) return;
    if (pendingAttachment?.status === 'uploading') return;

    const idempotencyKey = uuid();
    const tempId = `local-${idempotencyKey}`;
    const optimistic: ChatMessage = {
      id: tempId,
      conversationId,
      sender: 'user',
      senderId: 'me',
      text: text || null,
      attachments: attachment ? [attachment] : [],
      orderRef: orderId ?? null,
      status: 'sent',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInputText('');
    setPendingAttachment(null);

    try {
      const { message } = await sendChatMessage(
        conversationId,
        {
          ...(text ? { text } : {}),
          ...(attachment ? { attachments: [attachment] } : {}),
          ...(orderId ? { orderRef: orderId } : {}),
        },
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

  const handleAttach = async () => {
    if (pendingAttachment) return;
    const picked = await pickChatImage();
    if (!picked) return;

    setPendingAttachment({ localUri: picked.uri, status: 'uploading', attachment: null });
    try {
      const attachment = await uploadChatImage(picked);
      setPendingAttachment({ localUri: picked.uri, status: 'ready', attachment });
    } catch {
      setPendingAttachment(null);
      Alert.alert("Couldn't upload the photo", 'Check your connection and try again.');
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

  const logoSource = imageSource(conversation?.merchant.logo);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === 'user';

    return (
      <View
        className={`mb-4 flex-row items-end ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        {!isUser && logoSource && (
          <Image
            source={logoSource}
            style={{ width: 28, height: 28, borderRadius: 14, marginRight: 8 }}
            contentFit="cover"
          />
        )}
        <View
          className={`max-w-[70%] rounded-[20px] px-4 py-2.5 ${
            isUser ? 'bg-brand rounded-br-md' : 'bg-muted rounded-bl-md'
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
              className={isUser ? 'text-brand-foreground' : 'text-foreground'}
            >
              {item.text}
            </Text>
          )}
          <Text
            variant="micro"
            className={`mt-1 ${
              isUser ? 'text-right text-brand-foreground' : 'text-muted-foreground'
            }`}
          >
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  // ── Auth / loading / error states ──

  if (authStatus !== 'authenticated') {
    return (
      <View className="flex-1 bg-background">
        <Stack.Screen options={{ headerShown: false }} />
        <View
          className="flex-1 items-center justify-center gap-4 px-10"
          style={{ paddingTop: insets.top }}
        >
          {authStatus === 'loading' ? (
            <ActivityIndicator size="large" color={colors.mutedForeground} />
          ) : (
            <>
              <Text variant="title" className="text-center">
                Sign in to chat
              </Text>
              <Text variant="body" className="text-center text-muted-foreground">
                Message brands directly from your YIIVA account.
              </Text>
              <Button className="rounded-full px-10" onPress={() => router.push('/auth/login')}>
                Sign In
              </Button>
              <TouchableOpacity onPress={() => router.back()}>
                <Text variant="caption" className="underline">
                  Go back
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  if (conversationQuery.isPending) {
    return (
      <View className="flex-1 bg-background">
        <Stack.Screen options={{ headerShown: false }} />
        <View
          className="flex-1 items-center justify-center gap-4 px-10"
          style={{ paddingTop: insets.top }}
        >
          <ActivityIndicator size="large" color={colors.mutedForeground} />
        </View>
      </View>
    );
  }

  if (conversationQuery.isError || !conversation) {
    const notFound =
      conversationQuery.error instanceof APIError &&
      conversationQuery.error.status === 404;
    return (
      <View className="flex-1 bg-background">
        <Stack.Screen options={{ headerShown: false }} />
        <View
          className="flex-1 items-center justify-center gap-4 px-10"
          style={{ paddingTop: insets.top }}
        >
          <Text variant="title" className="text-center">
            {notFound ? 'Brand not found' : "Couldn't open the chat"}
          </Text>
          <Button
            className="rounded-full px-10"
            onPress={() =>
              notFound ? router.back() : conversationQuery.refetch()
            }
          >
            {notFound ? 'Go back' : 'Retry'}
          </Button>
        </View>
      </View>
    );
  }

  const merchant = conversation.merchant;

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
          <Avatar
            uri={merchant.logo}
            fallback={merchant.displayName?.charAt(0)}
            size={36}
            variant="logo"
          />
          <View className="flex-1">
            <Text variant="heading">{merchant.displayName}</Text>
            <Text variant="caption" className="mt-0.5">
              {merchant.avgResponseTime
                ? `Usually responds within ${merchant.avgResponseTime}`
                : merchant.isVerified
                  ? 'Verified Brand'
                  : 'Brand'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          className="p-2"
          onPress={() => router.push(`/artist/${merchant.username}`)}
        >
          <IconSymbol name="info.circle" size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      {historyLoading ? (
        <View className="flex-1 gap-4 px-4 py-4">
          <Skeleton className="h-10 w-1/2 self-start rounded-[20px] rounded-bl-md" />
          <Skeleton className="h-16 w-3/5 self-end rounded-[20px] rounded-br-md" />
          <Skeleton className="h-10 w-2/5 self-start rounded-[20px] rounded-bl-md" />
          <Skeleton className="h-12 w-1/2 self-end rounded-[20px] rounded-br-md" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          ListEmptyComponent={
            <View className="items-center px-10 pt-20">
              <Text variant="caption" className="text-center">
                Say hi to {merchant.displayName} — ask about sizing, stock or
                your purchase.
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
        <View
          className="border-t border-border bg-card px-4 pt-2"
          style={{ paddingBottom: insets.bottom + 8 }}
        >
          {pendingAttachment && (
            <View className="mb-2 ml-10 self-start">
              <Image
                source={{ uri: pendingAttachment.localUri }}
                style={{ width: 72, height: 72, borderRadius: 10, backgroundColor: colors.muted }}
                contentFit="cover"
              />
              {pendingAttachment.status === 'uploading' && (
                <View className="absolute inset-0 items-center justify-center rounded-[10px] bg-black/35">
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              )}
              <TouchableOpacity
                className="absolute -right-2 -top-2 rounded-full bg-card"
                onPress={() => setPendingAttachment(null)}
              >
                <IconSymbol name="xmark.circle.fill" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>
          )}
          <View className="flex-row items-end gap-2">
            <TouchableOpacity
              className="mb-1 p-1"
              onPress={handleAttach}
              disabled={!!pendingAttachment}
            >
              <IconSymbol
                name="plus.circle.fill"
                size={28}
                color={pendingAttachment ? colors.mutedForeground : colors.brand}
              />
            </TouchableOpacity>

            <TextInput
              className="max-h-[100px] min-h-[40px] flex-1 rounded-[20px] bg-muted px-4 py-2 text-[15px] text-foreground"
              placeholder={`Message ${merchant.displayName}...`}
              placeholderTextColor={colors.mutedForeground}
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
