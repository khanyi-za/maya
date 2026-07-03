import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Alert, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useCart, useRemoveCartItem, useUpdateCartItem } from '@/hooks/useCartQueries';
import { useAuthStore } from '@/lib/auth-store';
import { APIError, type ServerCartItem } from '@/lib/api-client';
import { formatZAR } from '@/lib/format';
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

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const authStatus = useAuthStore((s) => s.state.status);

  const cartQuery = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  const cart = cartQuery.data?.cart;
  const items = cart?.items ?? [];
  const itemCount = cart?.itemCount ?? 0;
  const subtotal = cart?.subtotal ?? 0;

  const handleBackPress = () => router.back();
  const handleCheckout = () => {
    if (items.length === 0) return;
    router.push('/checkout');
  };
  const handleRemoveItem = (itemId: string) => removeItem.mutate(itemId);
  const handleQuantityChange = (item: ServerCartItem, nextQuantity: number) => {
    if (nextQuantity < 1) return;
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

  const renderBody = () => {
    if (authStatus === 'guest') {
      return (
        <View className="flex-1 items-center justify-center px-10">
          <IconSymbol name="cart" size={80} color={colors.mutedForeground} />
          <Text variant="title" className="mb-3 mt-6">
            Sign in to see your cart
          </Text>
          <Text variant="body" className="mb-8 text-center text-muted-foreground">
            Your cart lives in your YIIVA account
          </Text>
          <Button variant="brand" className="px-8" onPress={() => router.push('/auth/login')}>
            Sign In
          </Button>
        </View>
      );
    }

    if (cartQuery.isPending || authStatus === 'loading') {
      return <CartSkeleton />;
    }

    if (cartQuery.isError) {
      return (
        <View className="flex-1 items-center justify-center gap-4 px-10">
          <Text variant="title">Couldn&apos;t load your cart</Text>
          <Button variant="brand" className="px-8" onPress={() => cartQuery.refetch()}>
            Retry
          </Button>
        </View>
      );
    }

    if (items.length === 0) {
      return (
        <View className="flex-1 items-center justify-center px-10">
          <IconSymbol name="cart" size={80} color={colors.mutedForeground} />
          <Text variant="title" className="mb-3 mt-6">
            Your cart is empty
          </Text>
          <Text variant="body" className="mb-8 text-center text-muted-foreground">
            Add items to your cart to get started
          </Text>
          <Button variant="brand" className="px-8" onPress={handleContinueShopping}>
            Continue Shopping
          </Button>
        </View>
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

          {/* Items */}
          <View className="px-5 pt-4">
            {items.map((item) => {
              const imageAsset = imageSource(item.image);
              const decDisabled = updateItem.isPending || item.quantity <= 1;
              const incDisabled = updateItem.isPending || !item.available;
              return (
                <View
                  key={item.id}
                  className={cn('mb-5 flex-row border-b border-border pb-5', !item.available && 'opacity-60')}
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
                    <TouchableOpacity onPress={() => router.push(`/artist/${item.merchant.username}`)}>
                      <Text variant="caption" className="italic">
                        By {item.merchant.displayName}
                      </Text>
                    </TouchableOpacity>
                    {item.size && <Text variant="caption">Size: {item.size}</Text>}
                    <Text className="mb-3 mt-1 text-[16px] font-bold text-foreground">
                      {formatZAR(item.unitPrice)}
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

                  <TouchableOpacity className="p-2" onPress={() => handleRemoveItem(item.id)} disabled={removeItem.isPending}>
                    <IconSymbol name="trash" size={20} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              );
            })}
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
