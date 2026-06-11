import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useCart } from '@/hooks/useCartQueries';
import {
  useAddresses,
  useCheckoutQuote,
  useCreateAddress,
  usePlaceOrder,
} from '@/hooks/useCheckoutQueries';
import { useAuthStore } from '@/lib/auth-store';
import { APIError, type Address } from '@/lib/api-client';
import { setPaymentSession } from '@/lib/payment-session';
import { formatZAR } from '@/lib/format';
import { imageSource } from '@/lib/image-source';

const SA_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape',
];

const RETURN_URL = 'yiivaapp://payment-return?status=success';
const CANCEL_URL = 'yiivaapp://payment-return?status=cancelled';

const EMPTY_ADDRESS_FORM = {
  recipientName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  province: '',
  postalCode: '',
};

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const authStatus = useAuthStore((s) => s.state.status);

  const cartQuery = useCart();
  const addressesQuery = useAddresses();
  const createAddressMutation = useCreateAddress();
  const placeOrderMutation = usePlaceOrder();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const addresses = useMemo(
    () => addressesQuery.data?.addresses ?? [],
    [addressesQuery.data]
  );
  const items = cartQuery.data?.cart.items ?? [];
  const hasUnavailable = items.some((item) => !item.available);

  // Default to the user's default address (or their only one) once loaded.
  useEffect(() => {
    if (selectedAddressId || addresses.length === 0) return;
    const preferred = addresses.find((a) => a.isDefault) ?? addresses[0];
    setSelectedAddressId(preferred.id);
  }, [addresses, selectedAddressId]);

  const selectedAddress =
    addresses.find((a) => a.id === selectedAddressId) ?? null;

  const quoteQuery = useCheckoutQuote(selectedAddressId);
  const quote = quoteQuery.data;

  // Checkout is auth-required in v1 — guests bounce to login.
  useEffect(() => {
    if (authStatus === 'guest') {
      router.replace('/auth/login');
    }
  }, [authStatus, router]);

  const handleBackPress = () => router.back();

  const canPlaceOrder =
    !!quote &&
    !!selectedAddress &&
    items.length > 0 &&
    !hasUnavailable &&
    !placeOrderMutation.isPending;

  const handlePlaceOrder = () => {
    if (!canPlaceOrder || !selectedAddressId) return;
    placeOrderMutation.mutate(
      {
        addressId: selectedAddressId,
        returnUrl: RETURN_URL,
        cancelUrl: CANCEL_URL,
      },
      {
        onSuccess: (result) => {
          setPaymentSession(result);
          router.push('/payfast');
        },
        onError: (err) => {
          if (err instanceof APIError && err.code === 'STOCK_DRIFT') {
            Alert.alert(
              'Item no longer available',
              'Something in your cart sold out. Please review your cart.',
              [{ text: 'Back to Cart', onPress: () => router.back() }]
            );
          } else if (err instanceof APIError && err.code === 'CART_EMPTY') {
            Alert.alert('Your cart is empty', undefined, [
              { text: 'OK', onPress: () => router.back() },
            ]);
          } else {
            Alert.alert("Couldn't place your order", 'Please try again.');
          }
        },
      }
    );
  };

  const handleSubmitAddress = () => {
    const f = addressForm;
    if (!f.recipientName.trim() || !f.phone.trim() || !f.line1.trim() || !f.city.trim() || !f.province || !f.postalCode.trim()) {
      setFormError('Fill in all required fields.');
      return;
    }
    if (!/^\d{4}$/.test(f.postalCode.trim())) {
      setFormError('Postal code must be 4 digits.');
      return;
    }
    setFormError(null);
    createAddressMutation.mutate(
      {
        recipientName: f.recipientName.trim(),
        phone: f.phone.trim(),
        line1: f.line1.trim(),
        ...(f.line2.trim() ? { line2: f.line2.trim() } : {}),
        city: f.city.trim(),
        province: f.province,
        postalCode: f.postalCode.trim(),
        isDefault: addresses.length === 0,
      },
      {
        onSuccess: (data) => {
          setSelectedAddressId(data.address.id);
          setAddressForm(EMPTY_ADDRESS_FORM);
          setShowAddressForm(false);
          setAddressModalVisible(false);
        },
        onError: (err) => {
          setFormError(
            err instanceof APIError ? err.message : "Couldn't save the address."
          );
        },
      }
    );
  };

  const renderAddressModal = () => (
    <Modal
      visible={addressModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setAddressModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setAddressModalVisible(false)}
        />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.modalHandle} />
          <ThemedText style={styles.modalTitle}>
            {showAddressForm ? 'Add address' : 'Delivery address'}
          </ThemedText>

          {showAddressForm ? (
            <ScrollView keyboardShouldPersistTaps="handled">
              {formError && (
                <ThemedText style={styles.formError}>{formError}</ThemedText>
              )}
              <TextInput
                style={styles.formInput}
                placeholder="Recipient name"
                placeholderTextColor="#999"
                value={addressForm.recipientName}
                onChangeText={(v) => setAddressForm((s) => ({ ...s, recipientName: v }))}
              />
              <TextInput
                style={styles.formInput}
                placeholder="Phone (e.g. 0821234567)"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                value={addressForm.phone}
                onChangeText={(v) => setAddressForm((s) => ({ ...s, phone: v }))}
              />
              <TextInput
                style={styles.formInput}
                placeholder="Street address"
                placeholderTextColor="#999"
                value={addressForm.line1}
                onChangeText={(v) => setAddressForm((s) => ({ ...s, line1: v }))}
              />
              <TextInput
                style={styles.formInput}
                placeholder="Apartment, suite, etc. (optional)"
                placeholderTextColor="#999"
                value={addressForm.line2}
                onChangeText={(v) => setAddressForm((s) => ({ ...s, line2: v }))}
              />
              <TextInput
                style={styles.formInput}
                placeholder="City"
                placeholderTextColor="#999"
                value={addressForm.city}
                onChangeText={(v) => setAddressForm((s) => ({ ...s, city: v }))}
              />
              <View style={styles.provinceWrap}>
                {SA_PROVINCES.map((province) => (
                  <TouchableOpacity
                    key={province}
                    style={[
                      styles.provinceChip,
                      addressForm.province === province && styles.provinceChipActive,
                    ]}
                    onPress={() => setAddressForm((s) => ({ ...s, province }))}
                  >
                    <ThemedText
                      style={[
                        styles.provinceChipText,
                        addressForm.province === province && styles.provinceChipTextActive,
                      ]}
                    >
                      {province}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.formInput}
                placeholder="Postal code (4 digits)"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={4}
                value={addressForm.postalCode}
                onChangeText={(v) => setAddressForm((s) => ({ ...s, postalCode: v }))}
              />
              <TouchableOpacity
                style={[
                  styles.modalPrimaryButton,
                  createAddressMutation.isPending && styles.modalPrimaryButtonDisabled,
                ]}
                onPress={handleSubmitAddress}
                disabled={createAddressMutation.isPending}
              >
                <ThemedText style={styles.modalPrimaryButtonText}>
                  {createAddressMutation.isPending ? 'Saving…' : 'Save Address'}
                </ThemedText>
              </TouchableOpacity>
              {addresses.length > 0 && (
                <TouchableOpacity onPress={() => setShowAddressForm(false)}>
                  <ThemedText style={styles.modalLink}>Back to my addresses</ThemedText>
                </TouchableOpacity>
              )}
            </ScrollView>
          ) : (
            <ScrollView>
              {addresses.map((address: Address) => (
                <TouchableOpacity
                  key={address.id}
                  style={[
                    styles.addressOption,
                    selectedAddressId === address.id && styles.addressOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedAddressId(address.id);
                    setAddressModalVisible(false);
                  }}
                >
                  <View style={styles.addressOptionBody}>
                    <ThemedText style={styles.addressName}>
                      {address.recipientName}
                      {address.isDefault ? '  ·  Default' : ''}
                    </ThemedText>
                    <ThemedText style={styles.addressText}>
                      {address.line1}
                      {address.line2 ? `, ${address.line2}` : ''}
                    </ThemedText>
                    <ThemedText style={styles.addressText}>
                      {address.city}, {address.postalCode}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.radioButton,
                      selectedAddressId === address.id && styles.selectedRadioButton,
                    ]}
                  >
                    {selectedAddressId === address.id && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={() => setShowAddressForm(true)}
              >
                <ThemedText style={styles.modalPrimaryButtonText}>
                  Add New Address
                </ThemedText>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {renderAddressModal()}

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="#000" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Checkout</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Unavailable-items banner */}
        {hasUnavailable && (
          <View style={styles.unavailableBanner}>
            <ThemedText style={styles.unavailableBannerText}>
              An item in your cart is no longer available. Remove it before
              placing your order.
            </ThemedText>
            <TouchableOpacity onPress={() => router.back()}>
              <ThemedText style={styles.unavailableBannerLink}>Back to Cart</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* Order Summary */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Order Summary</ThemedText>
          {cartQuery.isPending ? (
            <ActivityIndicator size="small" color="#333" />
          ) : (
            items.map((item) => {
              const imageAsset = imageSource(item.image);
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
                    {item.size && (
                      <ThemedText style={styles.itemSize}>Size: {item.size}</ThemedText>
                    )}
                    {item.quantity > 1 && (
                      <ThemedText style={styles.itemQuantity}>Qty: {item.quantity}</ThemedText>
                    )}
                  </View>
                  <ThemedText style={styles.itemPrice}>
                    {formatZAR(item.lineTotal)}
                  </ThemedText>
                </View>
              );
            })
          )}
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Delivery Address</ThemedText>
            {addresses.length > 0 && (
              <TouchableOpacity onPress={() => { setShowAddressForm(false); setAddressModalVisible(true); }}>
                <ThemedText style={styles.editButton}>Change</ThemedText>
              </TouchableOpacity>
            )}
          </View>

          {addressesQuery.isPending ? (
            <ActivityIndicator size="small" color="#333" />
          ) : selectedAddress ? (
            <View style={styles.addressCard}>
              <ThemedText style={styles.addressName}>
                {selectedAddress.recipientName}
              </ThemedText>
              <ThemedText style={styles.addressText}>
                {selectedAddress.line1}
                {selectedAddress.line2 ? `, ${selectedAddress.line2}` : ''}
              </ThemedText>
              <ThemedText style={styles.addressText}>
                {selectedAddress.city}, {selectedAddress.postalCode}
              </ThemedText>
              <ThemedText style={styles.addressText}>
                {selectedAddress.province}, South Africa
              </ThemedText>
              <ThemedText style={styles.addressPhone}>{selectedAddress.phone}</ThemedText>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addAddressButton}
              onPress={() => { setShowAddressForm(true); setAddressModalVisible(true); }}
            >
              <ThemedText style={styles.addAddressButtonText}>
                + Add a delivery address
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {/* Payment Method — PayFast redirect only in v1 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Payment Method</ThemedText>
          <View style={[styles.paymentOptionCard, styles.selectedPaymentOption]}>
            <View style={styles.paymentOptionContent}>
              <View style={styles.paymentOptionHeader}>
                <View style={styles.paymentOptionIcon}>
                  <IconSymbol name="creditcard" size={24} color="#000" />
                </View>
                <View style={styles.paymentOptionInfo}>
                  <ThemedText style={styles.paymentOptionTitle}>PayFast</ThemedText>
                  <ThemedText style={styles.paymentOptionSubtitle}>
                    Card, Instant EFT and more — secure checkout
                  </ThemedText>
                </View>
                <View style={[styles.radioButton, styles.selectedRadioButton]}>
                  <View style={styles.radioButtonInner} />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Order Total — server quote, VAT-inclusive */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Order Total</ThemedText>
          {!selectedAddress ? (
            <ThemedText style={styles.quoteHint}>
              Add a delivery address to see shipping and totals.
            </ThemedText>
          ) : quoteQuery.isPending ? (
            <ActivityIndicator size="small" color="#333" />
          ) : quoteQuery.isError ? (
            <View>
              <ThemedText style={styles.quoteHint}>
                {quoteQuery.error instanceof APIError
                  ? quoteQuery.error.message
                  : "Couldn't get shipping rates."}
              </ThemedText>
              <TouchableOpacity onPress={() => quoteQuery.refetch()}>
                <ThemedText style={styles.editButton}>Retry</ThemedText>
              </TouchableOpacity>
            </View>
          ) : quote ? (
            <View style={styles.totalBreakdown}>
              <View style={styles.totalRow}>
                <ThemedText style={styles.totalLabel}>Subtotal</ThemedText>
                <ThemedText style={styles.totalValue}>{formatZAR(quote.subtotal)}</ThemedText>
              </View>
              <View style={styles.totalRow}>
                <ThemedText style={styles.totalLabel}>Shipping</ThemedText>
                <ThemedText style={styles.totalValue}>{formatZAR(quote.shipping)}</ThemedText>
              </View>
              <View style={styles.totalRow}>
                <ThemedText style={styles.totalLabel}>VAT (included)</ThemedText>
                <ThemedText style={styles.totalValue}>{formatZAR(quote.tax)}</ThemedText>
              </View>
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <ThemedText style={styles.grandTotalLabel}>Total</ThemedText>
                <ThemedText style={styles.grandTotalValue}>{formatZAR(quote.total)}</ThemedText>
              </View>
            </View>
          ) : null}
        </View>

        {/* Bottom padding for fixed button */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Fixed Place Order Button */}
      <View style={[styles.fixedButtonSection, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity
          style={[styles.placeOrderButton, !canPlaceOrder && styles.placeOrderButtonDisabled]}
          onPress={handlePlaceOrder}
          disabled={!canPlaceOrder}
        >
          <ThemedText style={styles.placeOrderButtonText}>
            {placeOrderMutation.isPending
              ? 'PLACING ORDER…'
              : quote
                ? `PLACE ORDER - ${formatZAR(quote.total)}`
                : 'PLACE ORDER'}
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
  unavailableBanner: {
    backgroundColor: '#fdecec',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  unavailableBannerText: {
    color: '#b3261e',
    fontSize: 14,
    lineHeight: 19,
  },
  unavailableBannerLink: {
    color: '#b3261e',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
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
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  editButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
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
  addAddressButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
  },
  addAddressButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  quoteHint: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
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
  placeOrderButtonDisabled: {
    backgroundColor: '#999',
  },
  placeOrderButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  // Address modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  addressOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 16,
    marginBottom: 12,
  },
  addressOptionActive: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  addressOptionBody: {
    flex: 1,
  },
  formError: {
    color: '#b3261e',
    fontSize: 14,
    marginBottom: 12,
  },
  formInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
    marginBottom: 12,
  },
  provinceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  provinceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
  },
  provinceChipActive: {
    backgroundColor: '#000',
  },
  provinceChipText: {
    fontSize: 13,
    color: '#666',
  },
  provinceChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  modalPrimaryButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  modalPrimaryButtonDisabled: {
    backgroundColor: '#999',
  },
  modalPrimaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  modalLink: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'underline',
    textAlign: 'center',
    marginBottom: 8,
  },
});
