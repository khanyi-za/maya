import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useCartStore } from '@/lib/cart-store';
import { getLocalAsset } from '@/lib/local-assets';

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, removeFromCart, updateQuantity, getCartTotal, getItemCount } = useCartStore();

  const cartTotal = getCartTotal();
  const itemCount = getItemCount();

  const handleBackPress = () => {
    router.back();
  };

  const handleCheckout = () => {
    if (items.length === 0) return;
    router.push('/checkout');
  };

  const handleRemoveItem = (itemId: string) => {
    removeFromCart(itemId);
  };

  const handleIncreaseQuantity = (itemId: string, currentQuantity: number) => {
    updateQuantity(itemId, currentQuantity + 1);
  };

  const handleDecreaseQuantity = (itemId: string, currentQuantity: number) => {
    if (currentQuantity > 1) {
      updateQuantity(itemId, currentQuantity - 1);
    }
  };

  const handleContinueShopping = () => {
    router.push('/(tabs)');
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

      {/* Empty Cart State */}
      {items.length === 0 ? (
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
      ) : (
        <>
          {/* Cart Items */}
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Item Count */}
            <View style={styles.itemCountSection}>
              <ThemedText style={styles.itemCountText}>
                {itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart
              </ThemedText>
            </View>

            {/* Cart Items List */}
            <View style={styles.cartItemsList}>
              {items.map((item) => {
                const imageAsset = getLocalAsset(item.image);

                return (
                  <View key={item.id} style={styles.cartItem}>
                    {/* Product Image */}
                    <TouchableOpacity
                      style={styles.cartItemImage}
                      onPress={() => router.push(`/product/${item.productId}`)}
                    >
                      {imageAsset ? (
                        <Image source={imageAsset} style={styles.productImage} contentFit="cover" />
                      ) : (
                        <View style={styles.imagePlaceholder}>
                          <Text style={styles.imagePlaceholderText}>No image</Text>
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
                      {item.selectedSize && (
                        <ThemedText style={styles.productSize}>Size: {item.selectedSize}</ThemedText>
                      )}
                      <ThemedText style={styles.productPrice}>
                        {item.currency} {item.price.toFixed(2)}
                      </ThemedText>

                      {/* Quantity Controls */}
                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => handleDecreaseQuantity(item.id, item.quantity)}
                        >
                          <IconSymbol name="minus" size={16} color="#000" />
                        </TouchableOpacity>
                        <ThemedText style={styles.quantityText}>{item.quantity}</ThemedText>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => handleIncreaseQuantity(item.id, item.quantity)}
                        >
                          <IconSymbol name="plus" size={16} color="#000" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Remove Button */}
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveItem(item.id)}
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
                <ThemedText style={styles.summaryValue}>R{cartTotal.toFixed(2)}</ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Shipping</ThemedText>
                <ThemedText style={styles.summaryValue}>Calculated at checkout</ThemedText>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <ThemedText style={styles.totalLabel}>Total</ThemedText>
                <ThemedText style={styles.totalValue}>R{cartTotal.toFixed(2)}</ThemedText>
              </View>
            </View>

            {/* Bottom Padding */}
            <View style={styles.bottomPadding} />
          </ScrollView>

          {/* Fixed Checkout Button */}
          <View style={[styles.fixedButtonSection, { paddingBottom: Math.max(insets.bottom, 16) + 60 }]}>
            <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
              <ThemedText style={styles.checkoutButtonText}>
                PROCEED TO CHECKOUT - R{cartTotal.toFixed(2)}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </>
      )}
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
});
