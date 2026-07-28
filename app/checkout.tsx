import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useCart } from '@/hooks/useCartQueries';
import {
  useAddresses,
  useCheckoutQuote,
  useCreateAddress,
  usePlaceOrder,
} from '@/hooks/useCheckoutQueries';
import { useAuthStore } from '@/lib/auth-store';
import { APIError, type Address, type ServerCartItem } from '@/lib/api-client';
import { track } from '@/lib/analytics';
import { setPaymentSession } from '@/lib/payment-session';
import { formatZAR } from '@/lib/format';
import { haptics } from '@/lib/haptics';
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

// Payment providers validate return/callback URLs as http(s) and reject
// custom schemes (a yiivaapp:// deep link → 400 — learned the hard way on
// PayFast; Paystack's callback_url is the same). We use an https sentinel on
// a real domain; the WebView intercepts navigation to it
// (onShouldStartLoadWithRequest) before it ever loads — see app/payment.tsx.
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

// Real, selectable payment methods — each maps to a Paystack channel, so the
// choice genuinely restricts the hosted payment page to that method.
// Channels verified live against the Paystack account (card/eft/qr active;
// apple_pay not yet enabled — add it back here once activated). Payflex is
// the one roadmap row (rendered disabled with a Soon tag).
type PayChannel = 'card' | 'eft' | 'qr';
const PAYMENT_METHODS: {
  id: PayChannel;
  title: string;
  caption: string;
  icon: string;
}[] = [
  {
    id: 'card',
    title: 'Add card / Pay with card',
    caption: 'Visa or Mastercard — entered securely at payment',
    icon: 'creditcard',
  },
  {
    id: 'eft',
    title: 'Pay by bank',
    caption: 'Instant EFT with Ozow — all major SA banks',
    icon: 'building.columns',
  },
  {
    id: 'qr',
    title: 'SnapScan',
    caption: 'Scan and pay with the SnapScan app',
    icon: 'qrcode',
  },
];

// 3-step checkout: the address is chosen in Delivery and re-confirmed on
// Review (with an edit affordance) before any money moves — the commit
// button only exists on step 3.
type Step = 1 | 2 | 3;
const STEP_LABELS = ['Delivery', 'Payment', 'Review'] as const;

function Stepper({ step, onStepPress }: { step: Step; onStepPress: (s: Step) => void }) {
  const colors = useThemeColors();
  return (
    <View className="border-b border-border px-8 pb-3 pt-4">
      <View className="flex-row">
        {STEP_LABELS.map((label, i) => {
          const n = (i + 1) as Step;
          const done = step > n;
          const current = step === n;
          return (
            <React.Fragment key={label}>
              {i > 0 && (
                <View
                  className={cn('mt-[13px] h-[2px] flex-1', step > i ? 'bg-brand' : 'bg-border')}
                />
              )}
              <TouchableOpacity
                className="w-16 items-center"
                onPress={() => onStepPress(n)}
                disabled={!done}
              >
                {done ? (
                  <View className="h-7 w-7 items-center justify-center rounded-full border-2 border-brand">
                    <IconSymbol name="checkmark" size={12} color={colors.brand} />
                  </View>
                ) : current ? (
                  <View className="h-7 w-7 rounded-full bg-brand" />
                ) : (
                  <View className="h-7 w-7 items-center justify-center">
                    <View className="h-3 w-3 rounded-full bg-border" />
                  </View>
                )}
                <Text
                  variant="caption"
                  className={cn('mt-1.5', current ? 'font-semibold' : 'text-muted-foreground')}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const authStatus = useAuthStore((s) => s.state.status);
  const scrollRef = useRef<ScrollView>(null);

  const cartQuery = useCart();
  const addressesQuery = useAddresses();
  const createAddressMutation = useCreateAddress();
  const placeOrderMutation = usePlaceOrder();

  const [step, setStep] = useState<Step>(1);
  const [paymentMethod, setPaymentMethod] = useState<PayChannel>('card');
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const addresses = useMemo(
    () => addressesQuery.data?.addresses ?? [],
    [addressesQuery.data]
  );
  const items = useMemo(() => cartQuery.data?.cart.items ?? [], [cartQuery.data]);
  const hasUnavailable = items.some((item) => !item.available);

  // Same brand grouping as the Cart screen — checkout creates one order per
  // store, so the summary mirrors that split.
  const groups = useMemo(() => {
    const map = new Map<string, { merchant: ServerCartItem['merchant']; items: ServerCartItem[] }>();
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

  // Funnel: the delivery step counts once on entry, the later steps on each
  // forward transition via goToStep.
  useEffect(() => {
    track('checkout_step_viewed', { step: 'delivery' });
  }, []);

  const goToStep = (next: Step) => {
    haptics.light();
    track('checkout_step_viewed', {
      step: STEP_LABELS[next - 1].toLowerCase(),
    });
    setStep(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  // Header back walks back a step before leaving the screen; Android
  // hardware back matches.
  const handleBackPress = () => {
    if (step > 1) {
      goToStep((step - 1) as Step);
    } else {
      router.back();
    }
  };
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step > 1) {
        setStep((s) => (s - 1) as Step);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [step]);

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
        paymentMethod,
      },
      {
        onSuccess: (result) => {
          haptics.success();
          track('order_placed', {
            paymentMethod,
            totalInCents: quote?.total ?? null,
            itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
            brandCount: groups.length,
          });
          setPaymentSession(result);
          router.push('/payment');
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
            Alert.alert("Couldn't complete your purchase", 'Please try again.');
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
        },
        onError: (err) => {
          setFormError(
            err instanceof APIError ? err.message : "Couldn't save the address."
          );
        },
      }
    );
  };

  const renderAddressForm = () => (
    <View>
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
    </View>
  );

  // ── Step 1: Delivery ─────────────────────────────────────────────────────
  const renderDeliveryStep = () => (
    <View className="px-5 py-5">
      <Text variant="title" className="mb-1">
        Delivery address
      </Text>
      <Text variant="body" className="mb-5 text-muted-foreground">
        Where should your purchase go?
      </Text>

      {addressesQuery.isPending ? (
        <View className="gap-2">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </View>
      ) : showAddressForm || addresses.length === 0 ? (
        renderAddressForm()
      ) : (
        <View>
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
                  haptics.light();
                  setSelectedAddressId(address.id);
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
                  <Text variant="caption">{address.province}</Text>
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
          <TouchableOpacity
            className="items-center rounded-xl border border-dashed border-border py-4"
            onPress={() => setShowAddressForm(true)}
          >
            <Text variant="label" className="text-brand">
              + Add a new address
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // ── Step 2: Payment ──────────────────────────────────────────────────────
  const renderPaymentStep = () => (
    <View className="px-5 py-5">
      <Text variant="title" className="mb-1">
        Payment method
      </Text>
      <Text variant="body" className="mb-5 text-muted-foreground">
        You won&apos;t be charged yet — you&apos;ll review your purchase on the
        next step first.
      </Text>

      {/* Single-select method list (Baymard: one-column, ≥44pt targets,
          action-verb labels, brand marks as trust signals). Selection is
          REAL — it restricts the Paystack hosted page to that channel. */}
      <View className="gap-3">
        {PAYMENT_METHODS.map((method) => {
          const selected = paymentMethod === method.id;
          return (
            <TouchableOpacity
              key={method.id}
              activeOpacity={0.85}
              className={cn(
                'flex-row items-center gap-3 rounded-xl p-4',
                selected
                  ? 'border-2 border-brand bg-brand-subtle'
                  : 'border border-border bg-card'
              )}
              onPress={() => {
                haptics.light();
                track('payment_method_selected', { method: method.id });
                setPaymentMethod(method.id);
              }}
            >
              <View className="h-10 w-10 items-center justify-center rounded-lg border border-border bg-card">
                <IconSymbol
                  name={method.icon as never}
                  size={22}
                  color={colors.foreground}
                />
              </View>
              <View className="flex-1">
                <Text variant="label" className="mb-0.5">
                  {method.title}
                </Text>
                <Text variant="caption">{method.caption}</Text>
              </View>
              {method.id === 'card' && (
                <View className="mr-1 flex-row items-center gap-2">
                  <Text
                    style={{
                      color: '#1A1F71',
                      fontStyle: 'italic',
                      fontWeight: '800',
                      fontSize: 12,
                      letterSpacing: -0.5,
                    }}
                  >
                    VISA
                  </Text>
                  <View className="flex-row items-center">
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#EB001B' }} />
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#F79E1B', marginLeft: -6, opacity: 0.9 }} />
                  </View>
                </View>
              )}
              <View
                className={cn(
                  'h-5 w-5 items-center justify-center rounded-full border-2',
                  selected ? 'border-brand' : 'border-border'
                )}
              >
                {selected && <View className="h-2.5 w-2.5 rounded-full bg-brand" />}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Payflex — the one roadmap method, deliberately inert. */}
        <View className="flex-row items-center gap-3 rounded-xl border border-border p-4 opacity-60">
          <View className="h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted">
            <IconSymbol name="calendar" size={22} color={colors.mutedForeground} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text variant="label" className="text-muted-foreground">
                Payflex
              </Text>
              <Badge tone="neutral">Soon</Badge>
            </View>
            <Text variant="caption" className="mt-0.5 text-muted-foreground">
              Pay in 4, interest-free
            </Text>
          </View>
          <Text className="text-[13px] font-bold lowercase text-foreground">payflex</Text>
        </View>
      </View>

      <View className="mt-4 flex-row items-center gap-2">
        <IconSymbol name="lock.fill" size={14} color={colors.mutedForeground} />
        <Text variant="caption" className="flex-1 text-muted-foreground">
          Payments are processed securely by Paystack. YIIVA never sees your
          card details.
        </Text>
      </View>
    </View>
  );

  // ── Step 3: Review ───────────────────────────────────────────────────────
  const renderReviewStep = () => (
    <View>
      <View className="px-5 pt-5">
        <Text variant="title" className="mb-1">
          Review your purchase
        </Text>
        <Text variant="body" className="mb-4 text-muted-foreground">
          Check that everything is correct — especially the delivery address.
        </Text>
      </View>

      {/* Delivery address — re-confirmation with edit */}
      <View className="border-b border-border px-5 pb-5">
        <View className="mb-3 flex-row items-center justify-between">
          <Text variant="heading">Delivering to</Text>
          <TouchableOpacity className="flex-row items-center gap-1 p-1" onPress={() => goToStep(1)}>
            <IconSymbol name="pencil" size={14} color={colors.brand} />
            <Text variant="label" className="text-brand">
              Edit
            </Text>
          </TouchableOpacity>
        </View>
        {selectedAddress && (
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
        )}
      </View>

      {/* Payment method */}
      <View className="border-b border-border px-5 py-5">
        <View className="mb-3 flex-row items-center justify-between">
          <Text variant="heading">Paying with</Text>
          <TouchableOpacity className="flex-row items-center gap-1 p-1" onPress={() => goToStep(2)}>
            <IconSymbol name="pencil" size={14} color={colors.brand} />
            <Text variant="label" className="text-brand">
              Edit
            </Text>
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center gap-3 rounded-xl bg-muted p-4">
          <IconSymbol
            name={
              (PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.icon ??
                'creditcard') as never
            }
            size={20}
            color={colors.foreground}
          />
          <View className="flex-1">
            <Text variant="label">
              {PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.title ?? 'Card'}
            </Text>
            <Text variant="caption" className="mt-0.5">
              Secured by Paystack
            </Text>
          </View>
        </View>
      </View>

      {/* Purchase Summary — grouped per brand, mirroring the per-store order split */}
      <View className="border-b border-border px-5 py-5">
        <Text variant="heading" className="mb-4">
          Purchase Summary
        </Text>
        {cartQuery.isPending ? (
          <View className="gap-3">
            {[0, 1].map((i) => (
              <View key={i} className="flex-row items-center gap-3">
                <Skeleton className="h-20 w-[60px] rounded-lg" />
                <View className="flex-1 gap-2">
                  <Skeleton className="h-4 w-3/5" />
                  <Skeleton className="h-3 w-2/5" />
                </View>
                <Skeleton className="h-4 w-14" />
              </View>
            ))}
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.merchant.username} className="mb-2">
              <Text variant="caption" className="mb-2 font-semibold">
                {group.merchant.displayName}
              </Text>
              {group.items.map((item) => {
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
              })}
            </View>
          ))
        )}
      </View>

      {/* Purchase Total — server quote, VAT-inclusive */}
      <View className="border-b border-border px-5 py-5">
        <Text variant="heading" className="mb-4">
          Purchase Total
        </Text>
        {quoteQuery.isPending ? (
          <View className="gap-3">
            {[0, 1, 2].map((i) => (
              <View key={i} className="flex-row items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </View>
            ))}
          </View>
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
    </View>
  );

  // Per-step primary CTA in the fixed bottom bar.
  const renderCta = () => {
    if (step === 1) {
      return (
        <Button
          variant="brand"
          size="lg"
          disabled={!selectedAddress || showAddressForm}
          onPress={() => goToStep(2)}
        >
          Continue to Payment
        </Button>
      );
    }
    if (step === 2) {
      return (
        <Button variant="brand" size="lg" onPress={() => goToStep(3)}>
          Continue to Review
        </Button>
      );
    }
    return (
      <Button
        variant="brand"
        size="lg"
        loading={placeOrderMutation.isPending}
        disabled={!canPlaceOrder}
        onPress={handlePlaceOrder}
      >
        {placeOrderMutation.isPending
          ? 'COMPLETING PURCHASE…'
          : quote
            ? `COMPLETE PURCHASE - ${formatZAR(quote.total)}`
            : 'COMPLETE PURCHASE'}
      </Button>
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
        <Text variant="heading">Checkout</Text>
        <View className="w-10" />
      </View>

      <Stepper step={step} onStepPress={goToStep} />

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Unavailable-items banner */}
        {hasUnavailable && (
          <View className="mx-5 mt-4 gap-2 rounded-[10px] bg-danger-subtle p-3.5">
            <Text variant="body" className="text-danger">
              An item in your cart is no longer available. Remove it before
              completing your purchase.
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text variant="label" className="text-danger underline">
                Back to Cart
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 1 && renderDeliveryStep()}
        {step === 2 && renderPaymentStep()}
        {step === 3 && renderReviewStep()}

        {/* Bottom padding for fixed button */}
        <View className="h-[100px]" />
      </ScrollView>

      {/* Fixed per-step CTA */}
      <View
        className="absolute inset-x-0 bottom-0 bg-background px-5 pt-4"
        style={{ paddingBottom: insets.bottom, ...FIXED_BAR_SHADOW }}
      >
        {renderCta()}
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
