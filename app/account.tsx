import React from 'react';
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useThemeColors } from '@/lib/theme';
import { useAddresses } from '@/hooks/useCheckoutQueries';
import { useAuthStore } from '@/lib/auth-store';
import { logout } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import type { Address } from '@/lib/api-client';

/**
 * Signed-in account hub (reached from the SideMenu "Account" link). v1 scope:
 * profile identity + a read-only view of saved delivery addresses + sign out.
 * Address management and order history live elsewhere — adding/changing an
 * address happens in checkout, and "My orders" is pending its backend list
 * endpoint. Guests see a sign-in prompt (matching cart/wishlist).
 */
export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const authState = useAuthStore((s) => s.state);
  const addressesQuery = useAddresses();

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'You can sign back in at any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          haptics.medium();
          await logout();
          router.replace('/(tabs)');
        },
      },
    ]);
  };

  const renderBody = () => {
    if (authState.status === 'loading') {
      return (
        <View className="px-5 pt-6">
          <View className="flex-row items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <View className="flex-1 gap-2">
              <Skeleton className="h-5 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </View>
          </View>
          <Skeleton className="mt-8 h-24 w-full rounded-xl" />
          <Skeleton className="mt-4 h-14 w-full rounded-xl" />
        </View>
      );
    }

    if (authState.status === 'guest') {
      return (
        <EmptyState
          fill
          icon="person.crop.circle"
          title="Sign in to your account"
          caption="Manage your profile, addresses, and purchases"
        >
          <Button variant="brand" className="mt-4 px-12" onPress={() => router.push('/auth/login')}>
            Sign In
          </Button>
        </EmptyState>
      );
    }

    const user = authState.user;
    const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
      .trim()
      .toUpperCase();

    return (
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* Profile */}
        <View className="flex-row items-center gap-4 px-5 py-6">
          <Avatar uri={user.avatarUrl} fallback={initials || '·'} size={64} />
          <View className="flex-1">
            <Text variant="title" numberOfLines={1}>
              {user.firstName} {user.lastName}
            </Text>
            <Text variant="caption" numberOfLines={1} className="mt-0.5">
              {user.email}
            </Text>
          </View>
        </View>

        {/* Delivery addresses (view-only) */}
        <Text variant="micro" className="mb-2 mt-4 px-5 uppercase tracking-wide">
          Delivery addresses
        </Text>
        <Card className="mx-5 px-4">{renderAddresses(addressesQuery)}</Card>
        <Text variant="caption" className="mt-2 px-5">
          You can add or change addresses during checkout.
        </Text>

        {/* Orders */}
        <Text variant="micro" className="mb-2 mt-4 px-5 uppercase tracking-wide">
          My purchases
        </Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/orders')}>
          <Card className="mx-5 flex-row items-center justify-between px-4 py-4">
            <Text variant="body">Purchase history</Text>
            <IconSymbol name="chevron.right" size={20} color={colors.mutedForeground} />
          </Card>
        </TouchableOpacity>

        {/* Sign out */}
        <Button
          variant="outline"
          className="mx-5 mt-7"
          textClassName="text-danger"
          onPress={handleSignOut}
        >
          Sign out
        </Button>
      </ScrollView>
    );
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View
        className="flex-row items-center justify-between border-b border-border bg-card px-5 pb-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 justify-center">
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text variant="heading">Account</Text>
        <View className="w-10" />
      </View>

      {renderBody()}
    </View>
  );
}

function renderAddresses(query: ReturnType<typeof useAddresses>) {
  if (query.isPending) {
    return (
      <View className="gap-2 py-4">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-4/5" />
      </View>
    );
  }
  if (query.isError) {
    return (
      <View className="gap-2 py-4">
        <Text variant="caption">Couldn&apos;t load your addresses.</Text>
        <TouchableOpacity onPress={() => query.refetch()}>
          <Text variant="label" className="text-brand underline">
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const addresses = query.data?.addresses ?? [];
  if (addresses.length === 0) {
    return (
      <Text variant="caption" className="py-4">
        No saved addresses yet — add one when you check out.
      </Text>
    );
  }

  return addresses.map((address: Address, index: number) => (
    <View key={address.id}>
      {index > 0 && <Separator />}
      <View className="flex-row items-center justify-between gap-3 py-3.5">
        <View className="flex-1">
          <Text variant="label" className="mb-0.5">
            {address.label || address.recipientName}
          </Text>
          <Text variant="caption" numberOfLines={2}>
            {[address.line1, address.line2, address.city, address.province, address.postalCode]
              .filter(Boolean)
              .join(', ')}
          </Text>
        </View>
        {address.isDefault && (
          <View className="rounded-lg bg-success-subtle px-2.5 py-1">
            <Text variant="micro" className="text-success">
              Default
            </Text>
          </View>
        )}
      </View>
    </View>
  ));
}
