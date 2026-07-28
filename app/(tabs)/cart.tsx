import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useCart, useRemoveCartItem, useUpdateCartItem } from '@/hooks/useCartQueries';
import { useAuthStore } from '@/lib/auth-store';
import { APIError, type ServerCartItem } from '@/lib/api-client';
import { track } from '@/lib/analytics';
import { formatZAR } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { imageSource } from '@/lib/image-source';
import { cn } from '@/lib/utils';
import { useThemeColors } from '@/lib/theme';

const FIXED_BAR_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.12,
  shadowRadius: 8,
  elevation: 10,
};

function CartSkeleton() {
  return (
    <View className="gap-5 px-5 pt-6">
      <Skeleton className="h-4 w-1/3" />
      {[0, 1, 2].map((i) => (
        <View key={i} className="flex-row gap-4">
          <Skeleton className="h-[120px] w-[100px] rounded-lg" />
          <View className="flex-1 gap-2 py-1">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="mt-2 h-8 w-24 rounded-lg" />
          </View>
        </View>
      ))}
    </View>
  );
}

type MerchantGroup = {
  merchant: ServerCartItem['merchant'];
  items: ServerCartItem[];
};

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const authStatus = useAuthStore((s) => s.state.status);

  const cartQuery = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  const cart = cartQuery.data?.cart;
  const items = useMemo(() => cart?.items ?? [], [cart]);
  const itemCount = cart?.itemCount ?? 0;
  const subtotal = cart?.subtotal ?? 0;

  // Checkout creates one order per store — mirror that split in the UI by
  // grouping lines under their brand (order of first appearance preserved).
  const groups = useMemo(() => {
    const map = new Map<string, MerchantGroup>();
    for (const item of items) {
      const key = item.merchant.username;
      const group = map.get(key);
      if (group) {
        group.items.push(item);
      } else {
        map.set(key, { merchant: item.merchant, items: [item] });
      }
    }
    return [...map.values()];
  }, [items]);

  const handleBackPress = () => router.back();
  const handleCheckout = () => {
    if (items.length === 0) return;
    router.push('/checkout');
  };
  const removeNow = (item: ServerCartItem) => {
    haptics.medium();
    track('remove_from_cart', {
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    });
    removeItem.mutate(item.id);
  };
  // Trash tap confirms; swipe-to-delete is deliberate enough to skip it.
  const confirmRemove = (item: ServerCartItem) => {
    Alert.alert('Remove item', `Remove "${item.name}" from your cart?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeNow(item) },
    ]);
  };
  const handleQuantityChange = (item: ServerCartItem, nextQuantity: number) => {
    if (nextQuantity < 1) return;
    haptics.light();
    updateItem.mutate(
      { itemId: item.id, quantity: nextQuantity },
      {
        onError: (err) => {
          if (err instanceof APIError && err.code === 'OUT_OF_STOCK') {
            Alert.alert('Not enough stock', `Only ${item.stockCount} left of this item.`);
          } else {
            Alert.alert("Couldn't update quantity", 'Please try again.');
          }
        },
      }
    );
  };
  const handleContinueShopping = () => router.push('/(tabs)');

  const renderDeleteAction = (item: ServerCartItem) => () => (
    <TouchableOpacity
      className="mb-5 ml-3 w-20 items-center justify-center rounded-xl bg-danger"
      onPress={() => removeNow(item)}
      disabled={removeItem.isPending}
    >
      <IconSymbol name="trash.fill" size={20} color={colors.dangerForeground} />
      <Text variant="caption" className="mt-1 font-semibold text-danger-foreground">
        Delete
      </Text>
    </TouchableOpacity>
  );

  const renderItem = (item: ServerCartItem) => {
    const imageAsset = imageSource(item.image);
    const decDisabled = updateItem.isPending || item.quantity <= 1;
    const incDisabled = updateItem.isPending || !item.available;
    return (
      <ReanimatedSwipeable
        key={item.id}
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        renderRightActions={renderDeleteAction(item)}
      >
        <View
          className={cn(
            'mb-5 flex-row border-b border-border bg-background pb-5',
            !item.available && 'opacity-60'
          )}
        >
          <TouchableOpacity className="mr-4" onPress={() => router.push(`/product/${item.productId}`)}>
            {imageAsset ? (
              <Image
                source={imageAsset}
                style={{ width: 100, height: 120, borderRadius: 8, backgroundColor: colors.muted }}
                contentFit="cover"
              />
            ) : (
              <View className="h-[120px] w-[100px] items-center justify-center rounded-lg bg-muted">
                <IconSymbol name="photo" size={24} color={colors.mutedForeground} />
              </View>
            )}
          </TouchableOpacity>

          <View className="mr-2 flex-1">
            <TouchableOpacity onPress={() => router.push(`/product/${item.productId}`)}>
              <Text variant="label" numberOfLines={2}>
                {item.name}
              </Text>
            </TouchableOpacity>
            {item.size && <Text variant="caption">Size: {item.size}</Text>}
            <Text className="mb-3 mt-1 text-[16px] font-bold text-foreground">
              {formatZAR(item.unitPrice)}
              {item.quantity > 1 && (
                <Text variant="caption" className="font-normal text-muted-foreground">
                  {'   '}{item.quantity} × = {formatZAR(item.lineTotal)}
                </Text>
              )}
            </Text>

            {!item.available && (
              <Text className="mb-2 text-[13px] font-semibold text-danger">No longer available</Text>
            )}

            {/* Quantity */}
            <View className="flex-row items-center self-start rounded-lg bg-muted px-2 py-1">
              <TouchableOpacity
                className={cn('p-2', decDisabled && 'opacity-30')}
                onPress={() => handleQuantityChange(item, item.quantity - 1)}
                disabled={decDisabled}
              >
                <IconSymbol name="minus" size={16} color={colors.foreground} />
              </TouchableOpacity>
              <Text className="mx-4 min-w-6 text-center text-[16px] font-semibold text-foreground">
                {item.quantity}
              </Text>
              <TouchableOpacity
                className={cn('p-2', incDisabled && 'opacity-30')}
                onPress={() => handleQuantityChange(item, item.quantity + 1)}
                disabled={incDisabled}
              >
                <IconSymbol name="plus" size={16} color={colors.foreground} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity className="p-2" onPress={() => confirmRemove(item)} disabled={removeItem.isPending}>
            <IconSymbol name="trash" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </ReanimatedSwipeable>
    );
  };

  const renderBody = () => {
    if (authStatus === 'guest') {
      return (
        <EmptyState fill
          icon="cart"
          title="Sign in to see your cart"
          caption="Your cart lives in your YIIVA account"
        >
          <Button variant="brand" className="mt-4 px-8" onPress={() => router.push('/auth/login')}>
            Sign In
          </Button>
        </EmptyState>
      );
    }

    if (cartQuery.isPending || authStatus === 'loading') {
      return <CartSkeleton />;
    }

    if (cartQuery.isError) {
      return (
        <EmptyState fill icon="wifi.slash" title="Couldn't load your cart">
          <Button variant="brand" className="mt-4 px-8" onPress={() => cartQuery.refetch()}>
            Retry
          </Button>
        </EmptyState>
      );
    }

    if (items.length === 0) {
      return (
        <EmptyState fill
          icon="cart"
          title="Your cart is empty"
          caption="Add items to your cart to get started"
        >
          <Button variant="brand" className="mt-4 px-8" onPress={handleContinueShopping}>
            Continue Shopping
          </Button>
        </EmptyState>
      );
    }

    return (
      <>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={cartQuery.isRefetching}
              onRefresh={() => cartQuery.refetch()}
              tintColor={colors.mutedForeground}
            />
          }
        >
          {/* Item count */}
          <View className="border-b border-border bg-muted px-5 py-4">
            <Text variant="caption" className="font-semibold">
              {itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart
            </Text>
          </View>

          {/* Items, grouped per brand */}
          <View className="px-5 pt-4">
            {groups.map((group) => (
              <View key={group.merchant.username}>
                <TouchableOpacity
                  className="mb-3 flex-row items-center gap-1 self-start"
                  onPress={() => router.push(`/artist/${group.merchant.username}`)}
                >
                  <Text variant="label">{group.merchant.displayName}</Text>
                  <IconSymbol name="chevron.right" size={12} color={colors.mutedForeground} />
                </TouchableOpacity>
                {group.items.map(renderItem)}
              </View>
            ))}
          </View>

          {/* Order summary */}
          <View className="mt-2 bg-muted px-5 py-5">
            <Text variant="heading" className="mb-4">
              Purchase Summary
            </Text>
            <View className="mb-3 flex-row items-center justify-between">
              <Text variant="body" className="text-muted-foreground">
                Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
              </Text>
              <Text variant="body" className="font-medium">
                {formatZAR(subtotal)}
              </Text>
            </View>
            <View className="mb-3 flex-row items-center justify-between">
              <Text variant="body" className="text-muted-foreground">
                Shipping
              </Text>
              <Text variant="body" className="font-medium">
                Calculated at checkout
              </Text>
            </View>
            <View className="my-3 h-px bg-border" />
            <View className="flex-row items-center justify-between">
              <Text variant="heading">Total</Text>
              <Text className="text-[20px] font-bold text-foreground">{formatZAR(subtotal)}</Text>
            </View>
          </View>

          <View className="h-28" />
        </ScrollView>

        {/* Fixed checkout */}
        <View
          className="absolute inset-x-0 bottom-0 bg-card px-5 pt-4"
          style={[{ paddingBottom: Math.max(insets.bottom, 16) + 60 }, FIXED_BAR_SHADOW]}
        >
          <Button variant="brand" className="w-full" onPress={handleCheckout}>
            {`Proceed to checkout · ${formatZAR(subtotal)}`}
          </Button>
        </View>
      </>
    );
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View
        className="flex-row items-center justify-between border-b border-border px-5 pb-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <TouchableOpacity onPress={handleBackPress} className="p-2">
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text variant="heading">Shopping Cart</Text>
        <View className="w-10" />
      </View>

      {renderBody()}
    </View>
  );
}
