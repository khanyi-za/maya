import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useCartStore } from '@/lib/cart-store';
import { getLocalAsset } from '@/lib/local-assets';

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, getCartTotal, getItemCount } = useCartStore();
  const [shippingMethod, setShippingMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [selectedPickupLocation, setSelectedPickupLocation] = useState('canal-walk');
  const [paymentMethod, setPaymentMethod] = useState<'apple-pay' | 'card' | 'payflex'>('apple-pay');

  // Calculate order totals
  const subtotal = getCartTotal();
  const shippingFee = subtotal >= 650 ? 0 : 65; // Free shipping over R650
  const tax = subtotal * 0.15; // 15% VAT
  const total = subtotal + shippingFee + tax;

  const handleBackPress = () => {
    router.back();
  };

  const handlePlaceOrder = () => {
    // Handle order placement
    console.log('Order placed successfully');
    console.log('Shipping method:', shippingMethod);
    if (shippingMethod === 'pickup') {
      console.log('Pickup location:', selectedPickupLocation);
    }
    // Navigate to order confirmation or success page
    router.push('/order-success');
  };

  const handleShippingMethodChange = (method: 'delivery' | 'pickup') => {
    setShippingMethod(method);
  };

  const handlePickupLocationChange = (locationId: string) => {
    setSelectedPickupLocation(locationId);
  };

  const handlePaymentMethodChange = (method: 'apple-pay' | 'card' | 'payflex') => {
    setPaymentMethod(method);
  };

  // Pickup locations data
  const pickupLocations = [
    {
      id: 'canal-walk',
      name: 'Canal Walk Shopping Centre',
      address: 'Century Blvd, Century City, Cape Town, 7441',
      hours: 'Mon-Sat: 9AM-9PM, Sun: 9AM-7PM',
      distance: '2.5 km away'
    },
    {
      id: 'v-a-waterfront',
      name: 'V&A Waterfront',
      address: 'V&A Waterfront, Cape Town, 8001',
      hours: 'Daily: 9AM-9PM',
      distance: '5.1 km away'
    },
    {
      id: 'tyger-valley',
      name: 'Tyger Valley Shopping Centre',
      address: 'Willie van Schoor Ave, Bellville, 7530',
      hours: 'Mon-Sat: 9AM-9PM, Sun: 10AM-6PM',
      distance: '12.3 km away'
    }
  ];

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="#000" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Checkout</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Order Summary */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Order Summary</ThemedText>
          {items.map((item) => {
            const imageAsset = getLocalAsset(item.image);
            return (
              <View key={item.id} style={styles.orderItem}>
                {imageAsset ? (
                  <Image source={imageAsset} style={styles.itemImage} contentFit="cover" />
                ) : (
                  <View style={styles.itemImagePlaceholder} />
                )}
                <View style={styles.itemDetails}>
                  <ThemedText style={styles.itemTitle} numberOfLines={2}>
                    {item.name}
                  </ThemedText>
                  <ThemedText style={styles.itemBrand}>
                    By {item.merchant.displayName}
                  </ThemedText>
                  {item.selectedSize && (
                    <ThemedText style={styles.itemSize}>Size: {item.selectedSize}</ThemedText>
                  )}
                  {item.quantity > 1 && (
                    <ThemedText style={styles.itemQuantity}>Qty: {item.quantity}</ThemedText>
                  )}
                </View>
                <ThemedText style={styles.itemPrice}>
                  {item.currency}{(item.price * item.quantity).toFixed(2)}
                </ThemedText>
              </View>
            );
          })}
        </View>

        {/* Shipping Method */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Shipping</ThemedText>
          
          {/* Delivery/Pickup Toggle */}
          <View style={styles.shippingMethodToggle}>
            <TouchableOpacity 
              style={[
                styles.methodOption,
                shippingMethod === 'delivery' && styles.selectedMethodOption
              ]}
              onPress={() => handleShippingMethodChange('delivery')}
            >
              <IconSymbol 
                name="house" 
                size={20} 
                color={shippingMethod === 'delivery' ? '#007AFF' : '#666'} 
              />
              <ThemedText style={[
                styles.methodOptionText,
                shippingMethod === 'delivery' && styles.selectedMethodOptionText
              ]}>
                Delivery
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.methodOption,
                shippingMethod === 'pickup' && styles.selectedMethodOption
              ]}
              onPress={() => handleShippingMethodChange('pickup')}
            >
              <IconSymbol 
                name="location" 
                size={20} 
                color={shippingMethod === 'pickup' ? '#007AFF' : '#666'} 
              />
              <ThemedText style={[
                styles.methodOptionText,
                shippingMethod === 'pickup' && styles.selectedMethodOptionText
              ]}>
                Pickup
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Delivery Address */}
          {shippingMethod === 'delivery' && (
            <View style={styles.deliverySection}>
              <View style={styles.sectionHeader}>
                <ThemedText style={styles.subsectionTitle}>Delivery Address</ThemedText>
                <TouchableOpacity>
                  <ThemedText style={styles.editButton}>Edit</ThemedText>
                </TouchableOpacity>
              </View>
              <View style={styles.addressCard}>
                <ThemedText style={styles.addressName}>John Doe</ThemedText>
                <ThemedText style={styles.addressText}>123 Long Street</ThemedText>
                <ThemedText style={styles.addressText}>Cape Town, 8001</ThemedText>
                <ThemedText style={styles.addressText}>South Africa</ThemedText>
                <ThemedText style={styles.addressPhone}>+27 82 123 4567</ThemedText>
              </View>
            </View>
          )}

          {/* Pickup Locations */}
          {shippingMethod === 'pickup' && (
            <View style={styles.pickupSection}>
              <ThemedText style={styles.subsectionTitle}>Select Pickup Location</ThemedText>
              {pickupLocations.map((location) => (
                <TouchableOpacity
                  key={location.id}
                  style={[
                    styles.pickupLocationCard,
                    selectedPickupLocation === location.id && styles.selectedPickupLocation
                  ]}
                  onPress={() => handlePickupLocationChange(location.id)}
                >
                  <View style={styles.pickupLocationHeader}>
                    <View style={styles.pickupLocationInfo}>
                      <ThemedText style={styles.pickupLocationName}>
                        {location.name}
                      </ThemedText>
                      <ThemedText style={styles.pickupLocationDistance}>
                        {location.distance}
                      </ThemedText>
                    </View>
                    <View style={[
                      styles.radioButton,
                      selectedPickupLocation === location.id && styles.selectedRadioButton
                    ]}>
                      {selectedPickupLocation === location.id && (
                        <View style={styles.radioButtonInner} />
                      )}
                    </View>
                  </View>
                  <ThemedText style={styles.pickupLocationAddress}>
                    {location.address}
                  </ThemedText>
                  <ThemedText style={styles.pickupLocationHours}>
                    {location.hours}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Payment Method</ThemedText>
          
          {/* Payment Options */}
          <View style={styles.paymentOptionsContainer}>
            {/* Apple Pay */}
            <TouchableOpacity
              style={[
                styles.paymentOptionCard,
                paymentMethod === 'apple-pay' && styles.selectedPaymentOption
              ]}
              onPress={() => handlePaymentMethodChange('apple-pay')}
            >
              <View style={styles.paymentOptionContent}>
                <View style={styles.paymentOptionHeader}>
                  <View style={styles.paymentOptionIcon}>
                    <IconSymbol name="applelogo" size={24} color="#000" />
                  </View>
                  <View style={styles.paymentOptionInfo}>
                    <ThemedText style={styles.paymentOptionTitle}>Apple Pay</ThemedText>
                    <ThemedText style={styles.paymentOptionSubtitle}>Touch ID or Face ID</ThemedText>
                  </View>
                  <View style={[
                    styles.radioButton,
                    paymentMethod === 'apple-pay' && styles.selectedRadioButton
                  ]}>
                    {paymentMethod === 'apple-pay' && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            {/* Credit/Debit Card */}
            <TouchableOpacity
              style={[
                styles.paymentOptionCard,
                paymentMethod === 'card' && styles.selectedPaymentOption
              ]}
              onPress={() => handlePaymentMethodChange('card')}
            >
              <View style={styles.paymentOptionContent}>
                <View style={styles.paymentOptionHeader}>
                  <View style={styles.paymentOptionIcon}>
                    <IconSymbol name="creditcard" size={24} color="#000" />
                  </View>
                  <View style={styles.paymentOptionInfo}>
                    <ThemedText style={styles.paymentOptionTitle}>Credit/Debit Card</ThemedText>
                    <ThemedText style={styles.paymentOptionSubtitle}>
                      {paymentMethod === 'card' ? '**** **** **** 1234' : 'Visa, Mastercard, Amex'}
                    </ThemedText>
                  </View>
                  <View style={[
                    styles.radioButton,
                    paymentMethod === 'card' && styles.selectedRadioButton
                  ]}>
                    {paymentMethod === 'card' && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                </View>
                {paymentMethod === 'card' && (
                  <TouchableOpacity style={styles.changeCardButton}>
                    <ThemedText style={styles.changeCardText}>Change Card</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>

            {/* Payflex */}
            <TouchableOpacity
              style={[
                styles.paymentOptionCard,
                paymentMethod === 'payflex' && styles.selectedPaymentOption
              ]}
              onPress={() => handlePaymentMethodChange('payflex')}
            >
              <View style={styles.paymentOptionContent}>
                <View style={styles.paymentOptionHeader}>
                  <View style={styles.paymentOptionIcon}>
                    <View style={styles.payflexLogo}>
                      <ThemedText style={styles.payflexLogoText}>PF</ThemedText>
                    </View>
                  </View>
                  <View style={styles.paymentOptionInfo}>
                    <ThemedText style={styles.paymentOptionTitle}>Payflex</ThemedText>
                    <ThemedText style={styles.paymentOptionSubtitle}>Buy now, pay later - 4 installments</ThemedText>
                  </View>
                  <View style={[
                    styles.radioButton,
                    paymentMethod === 'payflex' && styles.selectedRadioButton
                  ]}>
                    {paymentMethod === 'payflex' && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                </View>
                {paymentMethod === 'payflex' && (
                  <View style={styles.payflexDetails}>
                    <View style={styles.payflexBreakdown}>
                      <ThemedText style={styles.payflexBreakdownTitle}>Payment breakdown:</ThemedText>
                      <View style={styles.payflexInstallments}>
                        <View style={styles.payflexInstallment}>
                          <ThemedText style={styles.payflexInstallmentText}>
                            Today: R{(total / 4).toFixed(2)}
                          </ThemedText>
                        </View>
                        <View style={styles.payflexInstallment}>
                          <ThemedText style={styles.payflexInstallmentText}>
                            Week 2: R{(total / 4).toFixed(2)}
                          </ThemedText>
                        </View>
                        <View style={styles.payflexInstallment}>
                          <ThemedText style={styles.payflexInstallmentText}>
                            Week 4: R{(total / 4).toFixed(2)}
                          </ThemedText>
                        </View>
                        <View style={styles.payflexInstallment}>
                          <ThemedText style={styles.payflexInstallmentText}>
                            Week 6: R{(total / 4).toFixed(2)}
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Total */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Order Total</ThemedText>
          <View style={styles.totalBreakdown}>
            <View style={styles.totalRow}>
              <ThemedText style={styles.totalLabel}>Subtotal</ThemedText>
              <ThemedText style={styles.totalValue}>R{subtotal.toFixed(2)}</ThemedText>
            </View>
            <View style={styles.totalRow}>
              <ThemedText style={styles.totalLabel}>Shipping</ThemedText>
              <ThemedText style={styles.totalValue}>
                {shippingFee === 0 ? 'FREE' : `R${shippingFee.toFixed(2)}`}
              </ThemedText>
            </View>
            <View style={styles.totalRow}>
              <ThemedText style={styles.totalLabel}>Tax (15% VAT)</ThemedText>
              <ThemedText style={styles.totalValue}>R{tax.toFixed(2)}</ThemedText>
            </View>
            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <ThemedText style={styles.grandTotalLabel}>Total</ThemedText>
              <ThemedText style={styles.grandTotalValue}>R{total.toFixed(2)}</ThemedText>
            </View>
          </View>
        </View>

        {/* Bottom padding for fixed button */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Fixed Place Order Button */}
      <View style={[styles.fixedButtonSection, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity style={styles.placeOrderButton} onPress={handlePlaceOrder}>
          <ThemedText style={styles.placeOrderButtonText}>
            PLACE ORDER - R{total.toFixed(2)}
          </ThemedText>
        </TouchableOpacity>
      </View>
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
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  editButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  shippingMethodToggle: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  methodOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  selectedMethodOption: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  methodOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  selectedMethodOptionText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  deliverySection: {
    marginTop: 4,
  },
  pickupSection: {
    marginTop: 4,
  },
  pickupLocationCard: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPickupLocation: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  pickupLocationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  pickupLocationInfo: {
    flex: 1,
  },
  pickupLocationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  pickupLocationDistance: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  pickupLocationAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  pickupLocationHours: {
    fontSize: 12,
    color: '#999',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  selectedRadioButton: {
    borderColor: '#007AFF',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  paymentOptionsContainer: {
    gap: 12,
  },
  paymentOptionCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  selectedPaymentOption: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  paymentOptionContent: {
    padding: 16,
  },
  paymentOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  paymentOptionInfo: {
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  paymentOptionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  changeCardButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  changeCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  payflexLogo: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#6B73FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payflexLogoText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  payflexDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  payflexBreakdown: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
  },
  payflexBreakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  payflexInstallments: {
    gap: 4,
  },
  payflexInstallment: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payflexInstallmentText: {
    fontSize: 14,
    color: '#666',
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  itemImage: {
    width: 60,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  itemImagePlaceholder: {
    width: 60,
    height: 80,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  itemBrand: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  itemSize: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'Didot',
  },
  addressCard: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  addressPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  totalBreakdown: {
    gap: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    fontFamily: 'Didot',
  },
  grandTotalRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  grandTotalValue: {
    fontSize: 18,
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
  placeOrderButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  placeOrderButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});