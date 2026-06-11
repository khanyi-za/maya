import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useCart, useRemoveCartItem, useUpdateCartItem } from '@/hooks/useCartQueries';
import { useAuthStore } from '@/lib/auth-store';
import { APIError, type ServerCartItem } from '@/lib/api-client';
import { formatZAR } from '@/lib/format';
import { imageSource } from '@/lib/image-source';

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const handleRemoveItem = (itemId: string) => {
    removeItem.mutate(itemId);
  };

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
    // Guests sign in to buy (v1 — no guest server cart).
    if (authStatus === 'guest') {
      return (
        <View style={styles.emptyCartContainer}>
          <View style={styles.emptyCartIcon}>
            <IconSymbol name="cart" size={80} color="#ccc" />
          </View>
          <ThemedText style={styles.emptyCartTitle}>Sign in to see your cart</ThemedText>
          <ThemedText style={styles.emptyCartSubtitle}>
            Your cart lives in your YIIVA account
          </ThemedText>
          <TouchableOpacity
            style={styles.continueShoppingButton}
            onPress={() => router.push('/auth/login')}
          >
            <ThemedText style={styles.continueShoppingButtonText}>Sign In</ThemedText>
          </TouchableOpacity>
        </View>
      );
    }

    if (cartQuery.isPending || authStatus === 'loading') {
      return (
        <View style={styles.emptyCartContainer}>
          <ActivityIndicator size="large" color="#333" />
        </View>
      );
    }

    if (cartQuery.isError) {
      return (
        <View style={styles.emptyCartContainer}>
          <ThemedText style={styles.emptyCartTitle}>Couldn&apos;t load your cart</ThemedText>
          <TouchableOpacity
            style={styles.continueShoppingButton}
            onPress={() => cartQuery.refetch()}
          >
            <ThemedText style={styles.continueShoppingButtonText}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      );
    }

    if (items.length === 0) {
      return (
        <View style={styles.emptyCartContainer}>
          <View style={styles.emptyCartIcon}>
            <IconSymbol name="cart" size={80} color="#ccc" />
          </View>
          <ThemedText style={styles.emptyCartTitle}>Your cart is empty</ThemedText>
          <ThemedText style={styles.emptyCartSubtitle}>
            Add items to your cart to get started
          </ThemedText>
          <TouchableOpacity style={styles.continueShoppingButton} onPress={handleContinueShopping}>
            <ThemedText style={styles.continueShoppingButtonText}>Continue Shopping</ThemedText>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        {/* Cart Items */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={cartQuery.isRefetching}
              onRefresh={() => cartQuery.refetch()}
            />
          }
        >
          {/* Item Count */}
          <View style={styles.itemCountSection}>
            <ThemedText style={styles.itemCountText}>
              {itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart
            </ThemedText>
          </View>

          {/* Cart Items List */}
          <View style={styles.cartItemsList}>
            {items.map((item) => {
              const imageAsset = imageSource(item.image);

              return (
                <View key={item.id} style={[styles.cartItem, !item.available && styles.cartItemUnavailable]}>
                  {/* Product Image */}
                  <TouchableOpacity
                    style={styles.cartItemImage}
                    onPress={() => router.push(`/product/${item.productId}`)}
                  >
                    {imageAsset ? (
                      <Image source={imageAsset} style={styles.productImage} contentFit="cover" />
                    ) : (
                      <View style={[styles.productImage, styles.productImagePlaceholder]}>
                        <IconSymbol name="photo" size={24} color="#ccc" />
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Product Details */}
                  <View style={styles.cartItemDetails}>
                    <TouchableOpacity onPress={() => router.push(`/product/${item.productId}`)}>
                      <ThemedText style={styles.productName} numberOfLines={2}>
                        {item.name}
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => router.push(`/artist/${item.merchant.username}`)}
                    >
                      <ThemedText style={styles.merchantName}>
                        By {item.merchant.displayName}
                      </ThemedText>
                    </TouchableOpacity>
                    {item.size && (
                      <ThemedText style={styles.productSize}>Size: {item.size}</ThemedText>
                    )}
                    <ThemedText style={styles.productPrice}>
                      {formatZAR(item.unitPrice)}
                    </ThemedText>

                    {!item.available && (
                      <ThemedText style={styles.unavailableText}>
                        No longer available
                      </ThemedText>
                    )}

                    {/* Quantity Controls */}
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => handleQuantityChange(item, item.quantity - 1)}
                        disabled={updateItem.isPending || item.quantity <= 1}
                      >
                        <IconSymbol name="minus" size={16} color="#000" />
                      </TouchableOpacity>
                      <ThemedText style={styles.quantityText}>{item.quantity}</ThemedText>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => handleQuantityChange(item, item.quantity + 1)}
                        disabled={updateItem.isPending || !item.available}
                      >
                        <IconSymbol name="plus" size={16} color="#000" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Remove Button */}
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveItem(item.id)}
                    disabled={removeItem.isPending}
                  >
                    <IconSymbol name="trash" size={20} color="#ff3b30" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* Order Summary */}
          <View style={styles.orderSummarySection}>
            <ThemedText style={styles.orderSummaryTitle}>Order Summary</ThemedText>
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>
                Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
              </ThemedText>
              <ThemedText style={styles.summaryValue}>{formatZAR(subtotal)}</ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Shipping</ThemedText>
              <ThemedText style={styles.summaryValue}>Calculated at checkout</ThemedText>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <ThemedText style={styles.totalLabel}>Total</ThemedText>
              <ThemedText style={styles.totalValue}>{formatZAR(subtotal)}</ThemedText>
            </View>
          </View>

          {/* Bottom Padding */}
          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Fixed Checkout Button */}
        <View style={[styles.fixedButtonSection, { paddingBottom: Math.max(insets.bottom, 16) + 60 }]}>
          <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
            <ThemedText style={styles.checkoutButtonText}>
              PROCEED TO CHECKOUT - {formatZAR(subtotal)}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="#000" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Shopping Cart</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      {renderBody()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  emptyCartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyCartIcon: {
    marginBottom: 24,
  },
  emptyCartTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  emptyCartSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  continueShoppingButton: {
    backgroundColor: '#000',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  continueShoppingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  itemCountSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  cartItemsList: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  cartItem: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cartItemImage: {
    marginRight: 16,
  },
  productImage: {
    width: 100,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  imagePlaceholder: {
    width: 100,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 12,
    color: '#999',
  },
  cartItemDetails: {
    flex: 1,
    marginRight: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
    lineHeight: 20,
  },
  merchantName: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  productSize: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    fontFamily: 'Didot',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  quantityButton: {
    padding: 8,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginHorizontal: 16,
    minWidth: 24,
    textAlign: 'center',
  },
  removeButton: {
    padding: 8,
  },
  orderSummarySection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#f8f8f8',
    marginTop: 8,
  },
  orderSummaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#666',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    fontFamily: 'Didot',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'Didot',
  },
  bottomPadding: {
    height: 100,
  },
  fixedButtonSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  checkoutButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  cartItemUnavailable: {
    opacity: 0.6,
  },
  productImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  unavailableText: {
    fontSize: 13,
    color: '#b3261e',
    fontWeight: '600',
    marginBottom: 8,
  },
});
