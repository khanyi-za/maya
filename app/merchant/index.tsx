import React from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Avatar } from '@/components/ui/avatar';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import {
  useMerchantConversations,
  useMerchantLowStock,
  useMerchantOrders,
  useMerchantOverview,
  useMerchantStore,
} from '@/hooks/useMerchantDashboard';
import { useAuthStore } from '@/lib/auth-store';
import type { MerchantSaleStatus, MerchantStore } from '@/lib/api-client';
import { formatZAR } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { MERCHANT_SALE_STATUS } from '@/lib/merchant-sale-status';
import { useThemeColors } from '@/lib/theme';

// Merchant dashboard home — the "Manage my store" landing screen. UI copy says
// "sales" (sales-vocabulary convention); the buyer side of the app is untouched.
// Layout: greeting → gradient revenue hero → needs-attention chips → compact
// KPI tiles → recent sales preview → ops navigation.

const STORE_STATUS_META: Record<MerchantStore['status'], { label: string; tone: BadgeTone }> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  PENDING_REVIEW: { label: 'Under review', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'info' },
  PENDING_GO_LIVE: { label: 'Launch review', tone: 'warning' },
  ACTIVE: { label: 'Live', tone: 'success' },
  SUSPENDED: { label: 'Suspended', tone: 'danger' },
  CLOSED: { label: 'Closed', tone: 'neutral' },
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Bars drawn in translucent white inside the gradient hero. Today pops solid. */
function HeroBars({ series }: { series: { date: string; valueInCents: number }[] }) {
  const max = Math.max(...series.map((p) => p.valueInCents), 1);
  return (
    <View className="mt-4 h-12 flex-row items-end gap-1">
      {series.map((p, i) => (
        <View
          key={p.date}
          className="flex-1 rounded-sm bg-white"
          style={{
            height: Math.max(3, (p.valueInCents / max) * 48),
            opacity:
              i === series.length - 1 ? 0.95 : p.valueInCents === 0 ? 0.18 : 0.45,
          }}
        />
      ))}
    </View>
  );
}

function KpiTile({
  label,
  value,
  trendPct,
}: {
  label: string;
  value: string;
  trendPct?: number;
}) {
  return (
    <Card className="flex-1 p-3">
      <Text variant="micro" className="uppercase tracking-wide" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="heading" className="mt-1" numberOfLines={1}>
        {value}
      </Text>
      {trendPct !== undefined && (
        <Text
          variant="micro"
          className={trendPct >= 0 ? 'mt-0.5 text-success' : 'mt-0.5 text-danger'}
        >
          {trendPct >= 0 ? '↑' : '↓'} {Math.abs(trendPct)}%
        </Text>
      )}
    </Card>
  );
}

function AttentionChip({
  icon,
  label,
  tone,
  onPress,
}: {
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  label: string;
  tone: 'brand' | 'warning';
  onPress: () => void;
}) {
  const colors = useThemeColors();
  // Borderless subtle-tinted pill — opacity modifiers (border-warning/40)
  // don't compose with the var()-based token colors, so tone lives in the
  // -subtle background alone (same treatment as Badge).
  const toneClasses = tone === 'warning' ? 'bg-warning-subtle' : 'bg-brand-subtle';
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <View
        className={`flex-row items-center gap-2 rounded-full px-3.5 py-2 ${toneClasses}`}
      >
        <IconSymbol
          name={icon}
          size={15}
          color={tone === 'warning' ? colors.warning : colors.brand}
        />
        <Text variant="caption" className="font-medium text-foreground">
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function NavRow({
  icon,
  label,
  caption,
  badgeCount,
  onPress,
}: {
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  label: string;
  caption: string;
  badgeCount?: number;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <Card className="flex-row items-center justify-between px-4 py-3.5">
        <View className="flex-1 flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-subtle">
            <IconSymbol name={icon} size={18} color={colors.brand} />
          </View>
          <View className="flex-1">
            <Text variant="body">{label}</Text>
            <Text variant="micro" numberOfLines={1}>
              {caption}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          {badgeCount !== undefined && badgeCount > 0 && (
            <Badge tone="brand">{String(badgeCount)}</Badge>
          )}
          <IconSymbol name="chevron.right" size={20} color={colors.mutedForeground} />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

function DashboardSkeleton() {
  return (
    <View className="gap-4 p-4">
      <View className="flex-row items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-5 w-2/5" />
      </View>
      <Skeleton className="h-44 rounded-2xl" />
      <View className="flex-row gap-3">
        <Skeleton className="h-20 flex-1 rounded-xl" />
        <Skeleton className="h-20 flex-1 rounded-xl" />
        <Skeleton className="h-20 flex-1 rounded-xl" />
      </View>
      <Skeleton className="h-28 rounded-xl" />
    </View>
  );
}

export default function MerchantDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const authState = useAuthStore((s) => s.state);

  const storeQuery = useMerchantStore();
  const overviewQuery = useMerchantOverview();
  const lowStockQuery = useMerchantLowStock();
  const conversationsQuery = useMerchantConversations();
  const recentSalesQuery = useMerchantOrders(undefined);

  const unreadTotal =
    conversationsQuery.data?.conversations.reduce(
      (sum, c) => sum + c.unreadCount,
      0
    ) ?? 0;

  const goToSales = (status?: MerchantSaleStatus) => {
    haptics.light();
    router.push({
      pathname: '/merchant/sales',
      params: status ? { initialStatus: status } : {},
    });
  };

  const renderBody = () => {
    if (authState.status === 'guest') {
      return (
        <EmptyState
          fill
          icon="storefront"
          title="Sign in to manage your store"
          caption="Store management lives in your YIIVA merchant account"
        >
          <Button variant="brand" className="mt-4 px-10" onPress={() => router.push('/auth/login')}>
            Sign In
          </Button>
        </EmptyState>
      );
    }

    if (authState.status === 'authenticated' && authState.user.role !== 'MERCHANT') {
      return (
        <EmptyState
          fill
          icon="storefront"
          title="This area is for YIIVA merchants"
          caption="Want to sell on YIIVA? Get started on our merchant web dashboard."
        />
      );
    }

    if (storeQuery.isPending || overviewQuery.isPending || authState.status === 'loading') {
      return <DashboardSkeleton />;
    }

    if (storeQuery.isError || overviewQuery.isError) {
      return (
        <EmptyState fill icon="wifi.slash" title="Couldn't load your store">
          <Button
            variant="brand"
            className="mt-4 px-10"
            onPress={() => {
              storeQuery.refetch();
              overviewQuery.refetch();
            }}
          >
            Retry
          </Button>
        </EmptyState>
      );
    }

    const store = storeQuery.data.store;
    const overview = overviewQuery.data;
    const statusMeta = STORE_STATUS_META[store.status];
    const { newSales, preparing } = overview.actionable;
    const lowStockCount = lowStockQuery.data?.count ?? 0;
    const hasAttention =
      newSales > 0 || preparing > 0 || unreadTotal > 0 || lowStockCount > 0;
    const avgSaleInCents =
      overview.orders.count > 0
        ? Math.round(overview.revenue.valueInCents / overview.orders.count)
        : null;
    const revenueUp = overview.revenue.trendPct >= 0;
    const recentSales =
      recentSalesQuery.data?.pages[0]?.orders.slice(0, 3) ?? [];

    return (
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
      >
        {/* Greeting + identity */}
        <View className="flex-row items-center gap-3">
          <Avatar
            uri={store.logoUrl}
            fallback={store.displayName[0]}
            size={48}
            variant="logo"
          />
          <View className="flex-1">
            <Text variant="caption">{greeting()}</Text>
            <Text variant="heading" numberOfLines={1}>
              {store.displayName}
            </Text>
          </View>
          <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
        </View>

        {store.status !== 'ACTIVE' && (
          <Card className="mt-4 flex-row items-center gap-3 bg-warning-subtle p-4">
            <IconSymbol name="exclamationmark.triangle" size={20} color={colors.warning} />
            <Text variant="caption" className="flex-1 text-foreground">
              Your store isn't live to buyers right now. Manage your setup from the
              web dashboard.
            </Text>
          </Card>
        )}

        {/* Revenue hero */}
        <LinearGradient
          colors={['#0ea5e9', '#0369a1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 20, marginTop: 20, padding: 20 }}
        >
          <View className="flex-row items-start justify-between">
            <View>
              <Text variant="micro" className="uppercase tracking-widest text-white/80">
                Revenue · last 14 days
              </Text>
              <Text
                variant="display"
                className="mt-1 text-white"
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatZAR(overview.revenue.valueInCents)}
              </Text>
            </View>
            <View className="rounded-full bg-white/20 px-2.5 py-1">
              <Text variant="micro" className="font-semibold text-white">
                {revenueUp ? '↑' : '↓'} {Math.abs(overview.revenue.trendPct)}%
              </Text>
            </View>
          </View>
          <HeroBars series={overview.revenue.series} />
          <Text variant="micro" className="mt-2 text-white/70">
            {overview.orders.count} sales
            {avgSaleInCents !== null ? ` · avg ${formatZAR(avgSaleInCents)} per sale` : ''}
          </Text>
        </LinearGradient>

        {/* Needs attention */}
        <Text variant="micro" className="mb-2 mt-6 uppercase tracking-wide">
          Needs attention
        </Text>
        {hasAttention ? (
          <View className="flex-row flex-wrap gap-2">
            {newSales > 0 && (
              <AttentionChip
                icon="chart.bar.fill"
                tone="brand"
                label={`${newSales} new ${newSales === 1 ? 'sale' : 'sales'}`}
                onPress={() => goToSales('CONFIRMED')}
              />
            )}
            {preparing > 0 && (
              <AttentionChip
                icon="shippingbox"
                tone="brand"
                label={`${preparing} preparing`}
                onPress={() => goToSales('PROCESSING')}
              />
            )}
            {unreadTotal > 0 && (
              <AttentionChip
                icon="bubble.left.fill"
                tone="brand"
                label={`${unreadTotal} unread`}
                onPress={() => {
                  haptics.light();
                  router.push('/merchant/messages');
                }}
              />
            )}
            {lowStockCount > 0 && (
              <AttentionChip
                icon="exclamationmark.triangle"
                tone="warning"
                label={`${lowStockCount} low on stock`}
                onPress={() => {
                  haptics.light();
                  router.push('/merchant/stock');
                }}
              />
            )}
          </View>
        ) : (
          <Card className="flex-row items-center gap-3 p-4">
            <View className="h-8 w-8 items-center justify-center rounded-full bg-success-subtle">
              <Text variant="body" className="text-success">
                ✓
              </Text>
            </View>
            <Text variant="caption" className="flex-1">
              All caught up — nothing needs your attention right now.
            </Text>
          </Card>
        )}

        {/* KPI tiles */}
        <View className="mt-6 flex-row gap-3">
          <KpiTile
            label="Sales"
            value={String(overview.orders.count)}
            trendPct={overview.orders.trendPct}
          />
          <KpiTile label="Subscribers" value={overview.followers.count.toLocaleString('en-ZA')} />
          <KpiTile
            label="Rating"
            value={overview.rating.value > 0 ? `★ ${overview.rating.value.toFixed(1)}` : '—'}
          />
        </View>

        {/* Recent sales */}
        <View className="mt-6 flex-row items-center justify-between">
          <Text variant="micro" className="uppercase tracking-wide">
            Recent sales
          </Text>
          <TouchableOpacity onPress={() => goToSales()}>
            <Text variant="caption" className="font-medium text-brand">
              View all
            </Text>
          </TouchableOpacity>
        </View>
        {recentSales.length > 0 ? (
          <Card className="mt-2 px-4">
            {recentSales.map((sale, i) => {
              const meta = MERCHANT_SALE_STATUS[sale.status];
              return (
                <TouchableOpacity
                  key={sale.id}
                  activeOpacity={0.7}
                  onPress={() => {
                    haptics.light();
                    router.push({
                      pathname: '/merchant/sales/[orderId]',
                      params: { orderId: sale.id },
                    });
                  }}
                  className={
                    i > 0
                      ? 'flex-row items-center justify-between border-t border-border py-3'
                      : 'flex-row items-center justify-between py-3'
                  }
                >
                  <View className="flex-1 pr-3">
                    <Text variant="body" numberOfLines={1}>
                      {sale.buyerName}
                    </Text>
                    <Text variant="micro" className="mt-0.5">
                      #{sale.orderNumber}
                    </Text>
                  </View>
                  <View className="items-end gap-1">
                    <Text variant="label">{formatZAR(sale.totalInCents)}</Text>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </View>
                </TouchableOpacity>
              );
            })}
          </Card>
        ) : (
          <Card className="mt-2 p-4">
            <Text variant="caption">
              No sales yet — they'll show up here the moment a buyer checks out.
            </Text>
          </Card>
        )}

        {/* Operations */}
        <View className="mt-6 gap-3">
          <NavRow
            icon="chart.bar.fill"
            label="Sales"
            caption="Accept, prepare and hand over to the courier"
            onPress={() => goToSales()}
          />
          <NavRow
            icon="shippingbox"
            label="Stock alerts"
            caption="Products running low or sold out"
            badgeCount={lowStockCount}
            onPress={() => {
              haptics.light();
              router.push('/merchant/stock');
            }}
          />
          <NavRow
            icon="bubble.left.fill"
            label="Messages"
            caption="Chat with your buyers"
            badgeCount={unreadTotal}
            onPress={() => {
              haptics.light();
              router.push('/merchant/messages');
            }}
          />
        </View>
      </ScrollView>
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
        <Text variant="heading">My store</Text>
        <View className="w-10" />
      </View>

      {renderBody()}
    </View>
  );
}
