import React from 'react';
import { FlatList, RefreshControl, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useMerchantConversations } from '@/hooks/useMerchantDashboard';
import type { MerchantConversation } from '@/lib/api-client';
import { haptics } from '@/lib/haptics';
import { useThemeColors } from '@/lib/theme';

// Merchant chat inbox — buyers who messaged the store, newest activity first.

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso);
  const diffMs = Date.now() - then.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return then.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

function InboxSkeleton() {
  return (
    <View className="gap-3 p-4">
      {[0, 1, 2, 3].map((i) => (
        <View key={i} className="flex-row items-center gap-3 rounded-xl border border-border p-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </View>
        </View>
      ))}
    </View>
  );
}

function ConversationCard({
  conversation,
  onPress,
}: {
  conversation: MerchantConversation;
  onPress: () => void;
}) {
  const preview = conversation.lastMessage
    ? `${conversation.lastMessage.sender === 'merchant' ? 'You: ' : ''}${
        conversation.lastMessage.text ?? 'Sent a photo'
      }`
    : 'No messages yet';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} className="mb-3">
      <Card className="flex-row items-center gap-3 p-3">
        <Avatar
          uri={conversation.buyer.avatar}
          fallback={conversation.buyer.name[0] ?? '·'}
          size={48}
        />
        <View className="flex-1">
          <View className="flex-row items-center justify-between gap-2">
            <Text variant="label" numberOfLines={1} className="flex-1">
              {conversation.buyer.name}
            </Text>
            <Text variant="micro">{relativeTime(conversation.lastMessageAt)}</Text>
          </View>
          <View className="mt-0.5 flex-row items-center justify-between gap-2">
            <Text variant="caption" numberOfLines={1} className="flex-1">
              {preview}
            </Text>
            {conversation.unreadCount > 0 && (
              <Badge tone="brand">{String(conversation.unreadCount)}</Badge>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function MerchantMessagesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const conversationsQuery = useMerchantConversations();

  const renderBody = () => {
    if (conversationsQuery.isPending) {
      return <InboxSkeleton />;
    }

    if (conversationsQuery.isError) {
      return (
        <EmptyState fill icon="wifi.slash" title="Couldn't load your messages">
          <Button
            variant="brand"
            className="mt-4 px-10"
            onPress={() => conversationsQuery.refetch()}
          >
            Retry
          </Button>
        </EmptyState>
      );
    }

    const conversations = conversationsQuery.data.conversations;
    if (conversations.length === 0) {
      return (
        <EmptyState
          fill
          icon="bubble.left.fill"
          title="No messages yet"
          caption="When buyers message your store, their conversations appear here."
        />
      );
    }

    return (
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={conversationsQuery.isRefetching}
            onRefresh={() => conversationsQuery.refetch()}
            tintColor={colors.mutedForeground}
          />
        }
        renderItem={({ item }) => (
          <ConversationCard
            conversation={item}
            onPress={() => {
              haptics.light();
              router.push({
                pathname: '/merchant/messages/[conversationId]',
                params: {
                  conversationId: item.id,
                  buyerName: item.buyer.name,
                  buyerAvatar: item.buyer.avatar ?? '',
                },
              });
            }}
          />
        )}
      />
    );
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      <View
        className="flex-row items-center justify-between border-b border-border px-5 pb-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text variant="heading">Messages</Text>
        <View className="w-10" />
      </View>

      {renderBody()}
    </View>
  );
}
