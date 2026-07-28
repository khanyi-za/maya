import React, { useMemo, useRef } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/lib/theme';
import { clearPaymentSession, getPaymentSession } from '@/lib/payment-session';
import { track } from '@/lib/analytics';

// Must match checkout.tsx's RETURN_URL/CANCEL_URL prefix. The WebView intercepts
// navigation to this https sentinel (it never actually loads) to detect the
// payment outcome — payment providers reject custom-scheme return URLs.
const RETURN_SCHEME = 'https://yiiva.co.za/payment-return';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const session = useMemo(getPaymentSession, []);
  const finished = useRef(false);

  // Provider-neutral redirect (contract v3): GET providers (Paystack) give a
  // plain URL to load; a POST provider would give signed form fields.
  const redirect = useMemo(() => session?.payment.redirect ?? null, [session]);

  const html = useMemo(() => {
    if (!redirect || redirect.method !== 'POST') return '';
    const inputs = Object.entries(redirect.fields ?? {})
      .map(
        ([name, value]) =>
          `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(String(value))}" />`
      )
      .join('\n');
    return `<!DOCTYPE html>
<html>
  <head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
  <body style="background:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:-apple-system,sans-serif;color:#666">
    Redirecting to secure checkout…
    <form id="pay" action="${escapeHtml(redirect.url)}" method="post">${inputs}</form>
    <script>document.getElementById('pay').submit();</script>
  </body>
</html>`;
  }, [redirect]);

  const finish = (status: 'success' | 'cancelled') => {
    if (finished.current) return;
    finished.current = true;
    const orderId = session?.order.id;
    if (status === 'cancelled') {
      track('payment_cancelled', { orderId: orderId ?? null });
    }
    clearPaymentSession();
    if (status === 'success') {
      router.replace({ pathname: '/order-success', params: { orderId } });
    } else {
      router.back();
    }
  };

  const handleClose = () => {
    Alert.alert('Cancel payment?', 'Your purchase will stay unpaid and you can retry from checkout.', [
      { text: 'Keep paying', style: 'cancel' },
      { text: 'Cancel payment', style: 'destructive', onPress: () => finish('cancelled') },
    ]);
  };

  if (!session || !redirect) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background">
        <Stack.Screen options={{ headerShown: false }} />
        <Text variant="body" className="text-muted-foreground">
          No payment in progress.
        </Text>
        <Button variant="brand" className="px-8" onPress={() => router.dismissTo('/(tabs)')}>
          Back to Home
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />
      <View
        className="flex-row items-center border-b border-border px-4 pb-2.5"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity onPress={handleClose} className="h-9 w-9 items-center justify-center">
          <Text className="text-[20px] text-foreground">✕</Text>
        </TouchableOpacity>
        <Text variant="heading" className="flex-1 text-center">
          Secure payment
        </Text>
        <View className="w-9" />
      </View>

      <WebView
        source={
          redirect.method === 'GET'
            ? { uri: redirect.url }
            : { html, baseUrl: 'https://app.yiiva.co.za' }
        }
        originWhitelist={['*']}
        startInLoadingState
        renderLoading={() => (
          <View style={StyleSheet.absoluteFill} className="items-center justify-center bg-background">
            <ActivityIndicator size="large" color={colors.mutedForeground} />
          </View>
        )}
        onShouldStartLoadWithRequest={(request) => {
          if (request.url.startsWith(RETURN_SCHEME)) {
            const cancelled = request.url.includes('status=cancelled');
            finish(cancelled ? 'cancelled' : 'success');
            return false;
          }
          return true;
        }}
        onError={() => {
          Alert.alert('Payment page failed to load', 'Please try again.', [
            { text: 'OK', onPress: () => finish('cancelled') },
          ]);
        }}
      />
    </View>
  );
}
