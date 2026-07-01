import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
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
import { useThemeColors } from '@/lib/theme';
import { cn } from '@/lib/utils';

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

// PayFast validates return_url/cancel_url as http(s) and rejects custom schemes
// (a yiivaapp:// deep link → "url format is invalid", 400). We use an https
// sentinel on a real domain; the WebView intercepts navigation to it
// (onShouldStartLoadWithRequest) before it ever loads — see app/payfast.tsx.
const RETURN_URL = 'https://yiiva.co.za/payment-return?status=success';
const CANCEL_URL = 'https://yiiva.co.za/payment-return?status=cancelled';

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
  const colors = useThemeColors();
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
      <View className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0 bg-black/50"
          onPress={() => setAddressModalVisible(false)}
        />
        <View
          className="max-h-[85%] rounded-t-[20px] bg-card px-5 pt-3"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="mb-4 h-1 w-10 self-center rounded-full bg-border" />
          <Text variant="heading" className="mb-4">
            {showAddressForm ? 'Add address' : 'Delivery address'}
          </Text>

          {showAddressForm ? (
            <ScrollView keyboardShouldPersistTaps="handled">
              {formError && (
                <Text variant="caption" className="mb-3 text-danger">
                  {formError}
                </Text>
              )}
              <Input
                className="mb-3"
                placeholder="Recipient name"
                error={!!formError}
                value={addressForm.recipientName}
                onChangeText={(v) => setAddressForm((s) => ({ ...s, recipientName: v }))}
              />
              <Input
                className="mb-3"
                placeholder="Phone (e.g. 0821234567)"
                error={!!formError}
                keyboardType="phone-pad"
                value={addressForm.phone}
                onChangeText={(v) => setAddressForm((s) => ({ ...s, phone: v }))}
              />
              <Input
                className="mb-3"
                placeholder="Street address"
                error={!!formError}
                value={addressForm.line1}
                onChangeText={(v) => setAddressForm((s) => ({ ...s, line1: v }))}
              />
              <Input
                className="mb-3"
                placeholder="Apartment, suite, etc. (optional)"
                value={addressForm.line2}
                onChangeText={(v) => setAddressForm((s) => ({ ...s, line2: v }))}
              />
              <Input
                className="mb-3"
                placeholder="City"
                error={!!formError}
                value={addressForm.city}
                onChangeText={(v) => setAddressForm((s) => ({ ...s, city: v }))}
              />
              <View className="mb-3 flex-row flex-wrap gap-2">
                {SA_PROVINCES.map((province) => {
                  const active = addressForm.province === province;
                  return (
                    <TouchableOpacity
                      key={province}
                      className={cn(
                        'rounded-2xl border px-3.5 py-2',
                        active ? 'border-brand bg-brand-subtle' : 'border-border bg-muted'
                      )}
                      onPress={() => setAddressForm((s) => ({ ...s, province }))}
                    >
                      <Text
                        variant="caption"
                        className={active ? 'font-semibold text-brand' : ''}
                      >
                        {province}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Input
                className="mb-3"
                placeholder="Postal code (4 digits)"
                error={!!formError}
                keyboardType="number-pad"
                maxLength={4}
                value={addressForm.postalCode}
                onChangeText={(v) => setAddressForm((s) => ({ ...s, postalCode: v }))}
              />
              <Button
                variant="brand"
                size="lg"
                className="mb-3 mt-2"
                loading={createAddressMutation.isPending}
                onPress={handleSubmitAddress}
              >
                {createAddressMutation.isPending ? 'Saving…' : 'Save Address'}
              </Button>
              {addresses.length > 0 && (
                <TouchableOpacity onPress={() => setShowAddressForm(false)}>
                  <Text variant="caption" className="mb-2 text-center text-muted-foreground underline">
                    Back to my addresses
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          ) : (
            <ScrollView>
              {addresses.map((address: Address) => {
                const active = selectedAddressId === address.id;
                return (
                  <TouchableOpacity
                    key={address.id}
                    className={cn(
                      'mb-3 flex-row items-center rounded-xl border-2 p-4',
                      active ? 'border-brand bg-brand-subtle' : 'border-border bg-muted'
                    )}
                    onPress={() => {
                      setSelectedAddressId(address.id);
                      setAddressModalVisible(false);
                    }}
                  >
                    <View className="flex-1">
                      <Text variant="label" className="mb-2">
                        {address.recipientName}
                        {address.isDefault ? '  ·  Default' : ''}
                      </Text>
                      <Text variant="caption">
                        {address.line1}
                        {address.line2 ? `, ${address.line2}` : ''}
                      </Text>
                      <Text variant="caption">
                        {address.city}, {address.postalCode}
                      </Text>
                    </View>
                    <View
                      className={cn(
                        'ml-3 h-5 w-5 items-center justify-center rounded-full border-2',
                        active ? 'border-brand' : 'border-border'
                      )}
                    >
                      {active && <View className="h-2.5 w-2.5 rounded-full bg-brand" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
              <Button
                variant="brand"
                size="lg"
                className="mb-3 mt-2"
                onPress={() => setShowAddressForm(true)}
              >
                Add New Address
              </Button>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {renderAddressModal()}

      {/* Header */}
      <View
        className="flex-row items-center justify-between border-b border-border px-5 pb-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <TouchableOpacity onPress={handleBackPress} className="p-2">
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text variant="heading">Checkout</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Unavailable-items banner */}
        {hasUnavailable && (
          <View className="mx-5 mt-4 gap-2 rounded-[10px] bg-danger-subtle p-3.5">
            <Text variant="body" className="text-danger">
              An item in your cart is no longer available. Remove it before
              placing your order.
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text variant="label" className="text-danger underline">
                Back to Cart
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Order Summary */}
        <View className="border-b border-border px-5 py-5">
          <Text variant="heading" className="mb-4">
            Order Summary
          </Text>
          {cartQuery.isPending ? (
            <ActivityIndicator size="small" color={colors.mutedForeground} />
          ) : (
            items.map((item) => {
              const imageAsset = imageSource(item.image);
              return (
                <View key={item.id} className="mb-3 flex-row items-center gap-3">
                  {imageAsset ? (
                    <Image
                      source={imageAsset}
                      style={{ width: 60, height: 80, borderRadius: 8, backgroundColor: colors.muted }}
                      contentFit="cover"
                    />
                  ) : (
                    <View className="h-20 w-[60px] rounded-lg bg-muted" />
                  )}
                  <View className="flex-1">
                    <Text variant="label" className="mb-1" numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text variant="caption" className="mb-0.5 italic">
                      By {item.merchant.displayName}
                    </Text>
                    {item.size && (
                      <Text variant="caption" className="mb-0.5">
                        Size: {item.size}
                      </Text>
                    )}
                    {item.quantity > 1 && (
                      <Text variant="caption" className="font-semibold">
                        Qty: {item.quantity}
                      </Text>
                    )}
                  </View>
                  <Text variant="label">{formatZAR(item.lineTotal)}</Text>
                </View>
              );
            })
          )}
        </View>

        {/* Delivery Address */}
        <View className="border-b border-border px-5 py-5">
          <View className="flex-row items-center justify-between">
            <Text variant="heading" className="mb-4">
              Delivery Address
            </Text>
            {addresses.length > 0 && (
              <TouchableOpacity onPress={() => { setShowAddressForm(false); setAddressModalVisible(true); }}>
                <Text variant="label" className="text-brand">
                  Change
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {addressesQuery.isPending ? (
            <ActivityIndicator size="small" color={colors.mutedForeground} />
          ) : selectedAddress ? (
            <View className="rounded-xl bg-muted p-4">
              <Text variant="label" className="mb-2">
                {selectedAddress.recipientName}
              </Text>
              <Text variant="caption">
                {selectedAddress.line1}
                {selectedAddress.line2 ? `, ${selectedAddress.line2}` : ''}
              </Text>
              <Text variant="caption">
                {selectedAddress.city}, {selectedAddress.postalCode}
              </Text>
              <Text variant="caption">
                {selectedAddress.province}, South Africa
              </Text>
              <Text variant="caption" className="mt-1">
                {selectedAddress.phone}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              className="items-center rounded-xl border border-dashed border-border py-5"
              onPress={() => { setShowAddressForm(true); setAddressModalVisible(true); }}
            >
              <Text variant="label" className="text-brand">
                + Add a delivery address
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Payment Method — PayFast redirect only in v1 */}
        <View className="border-b border-border px-5 py-5">
          <Text variant="heading" className="mb-4">
            Payment Method
          </Text>
          <Card className="overflow-hidden border-2 border-brand bg-brand-subtle">
            <View className="p-4">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-lg bg-card">
                  <IconSymbol name="creditcard" size={24} color={colors.foreground} />
                </View>
                <View className="flex-1">
                  <Text variant="label" className="mb-0.5">
                    PayFast
                  </Text>
                  <Text variant="caption">
                    Card, Instant EFT and more — secure checkout
                  </Text>
                </View>
                <View className="ml-3 h-5 w-5 items-center justify-center rounded-full border-2 border-brand">
                  <View className="h-2.5 w-2.5 rounded-full bg-brand" />
                </View>
              </View>
            </View>
          </Card>
        </View>

        {/* Order Total — server quote, VAT-inclusive */}
        <View className="border-b border-border px-5 py-5">
          <Text variant="heading" className="mb-4">
            Order Total
          </Text>
          {!selectedAddress ? (
            <Text variant="caption" className="mb-2">
              Add a delivery address to see shipping and totals.
            </Text>
          ) : quoteQuery.isPending ? (
            <ActivityIndicator size="small" color={colors.mutedForeground} />
          ) : quoteQuery.isError ? (
            <View>
              <Text variant="caption" className="mb-2">
                {quoteQuery.error instanceof APIError
                  ? quoteQuery.error.message
                  : "Couldn't get shipping rates."}
              </Text>
              <TouchableOpacity onPress={() => quoteQuery.refetch()}>
                <Text variant="label" className="text-brand">
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          ) : quote ? (
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text variant="body" className="text-muted-foreground">Subtotal</Text>
                <Text variant="body" className="font-medium">{formatZAR(quote.subtotal)}</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text variant="body" className="text-muted-foreground">Shipping</Text>
                <Text variant="body" className="font-medium">{formatZAR(quote.shipping)}</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text variant="body" className="text-muted-foreground">VAT (included)</Text>
                <Text variant="body" className="font-medium">{formatZAR(quote.tax)}</Text>
              </View>
              <View className="mt-2 flex-row items-center justify-between border-t border-border pt-3">
                <Text variant="heading">Total</Text>
                <Text variant="heading">{formatZAR(quote.total)}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Bottom padding for fixed button */}
        <View className="h-[100px]" />
      </ScrollView>

      {/* Fixed Place Order Button */}
      <View
        className="absolute inset-x-0 bottom-0 bg-background px-5 pt-4"
        style={{ paddingBottom: insets.bottom, ...FIXED_BAR_SHADOW }}
      >
        <Button
          variant="brand"
          size="lg"
          loading={placeOrderMutation.isPending}
          disabled={!canPlaceOrder}
          onPress={handlePlaceOrder}
        >
          {placeOrderMutation.isPending
            ? 'PLACING ORDER…'
            : quote
              ? `PLACE ORDER - ${formatZAR(quote.total)}`
              : 'PLACE ORDER'}
        </Button>
      </View>
    </View>
  );
}

const FIXED_BAR_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.15,
  shadowRadius: 8,
  elevation: 10,
};
