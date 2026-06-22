import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/useNotificationQueries';
import { useAuthStore } from '@/lib/auth-store';
import type { AppNotification } from '@/lib/api-client';

function relativeTime(iso: string): string {
  const then = new Date(iso);
  const diffMs = Date.now() - then.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(diffMs / 86_400_000);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const authStatus = useAuthStore((s) => s.state.status);
  const query = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const notifications = query.data?.pages.flatMap((p) => p.notifications) ?? [];
  const unreadCount = query.data?.pages[0]?.unreadCount ?? 0;

  const handlePress = (n: AppNotification) => {
    if (!n.isRead) markRead.mutate(n.id);
    const orderId = n.data?.orderId;
    if (orderId) {
      router.push({ pathname: '/track-order', params: { orderId } });
    }
  };

  const renderBody = () => {
    if (authStatus === 'guest') {
      return (
        <View style={styles.centered}>
          <Text style={styles.stateTitle}>Sign in to see your notifications</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (query.isPending || authStatus === 'loading') {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#333" />
        </View>
      );
    }

    if (query.isError) {
      return (
        <View style={styles.centered}>
          <Text style={styles.stateTitle}>Couldn&apos;t load notifications</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => query.refetch()}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (notifications.length === 0) {
      return (
        <View style={styles.centered}>
          <Text style={styles.stateTitle}>No notifications yet</Text>
          <Text style={styles.stateSubtitle}>
            Order updates and confirmations will show up here.
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => query.refetch()}
          />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
        }}
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <ActivityIndicator color="#333" style={{ marginVertical: 16 }} />
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, !item.isRead && styles.rowUnread]}
            onPress={() => handlePress(item)}
            activeOpacity={0.7}
          >
            {!item.isRead && <View style={styles.unreadDot} />}
            <View style={styles.rowBody}>
              <Text style={[styles.rowTitle, !item.isRead && styles.rowTitleUnread]}>
                {item.title}
              </Text>
              <Text style={styles.rowText} numberOfLines={2}>
                {item.body}
              </Text>
              <Text style={styles.rowTime}>{relativeTime(item.createdAt)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {authStatus === 'authenticated' && unreadCount > 0 ? (
          <TouchableOpacity onPress={() => markAll.mutate()}>
            <Text style={styles.markAll}>Read all</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {renderBody()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: { width: 56, height: 40, justifyContent: 'center' },
  backText: { fontSize: 26, color: '#000' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  headerSpacer: { width: 56 },
  markAll: { width: 56, fontSize: 14, color: '#666', textAlign: 'right' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  stateSubtitle: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 24 },
  primaryButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    gap: 10,
  },
  rowUnread: { backgroundColor: '#fafafe' },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1a73e8',
    marginTop: 6,
  },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 15, color: '#222', marginBottom: 3 },
  rowTitleUnread: { fontWeight: '700', color: '#000' },
  rowText: { fontSize: 14, color: '#666', lineHeight: 19 },
  rowTime: { fontSize: 12, color: '#aaa', marginTop: 6 },
});
