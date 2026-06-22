import React, { useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clearPaymentSession, getPaymentSession } from '@/lib/payment-session';

// Must match checkout.tsx's RETURN_URL/CANCEL_URL prefix. The WebView intercepts
// navigation to this https sentinel (it never actually loads) to detect the
// payment outcome — PayFast rejects custom-scheme return URLs.
const RETURN_SCHEME = 'https://yiiva.co.za/payment-return';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * PayFast hosted-payment WebView. Auto-submits the signed form payload from
 * POST /api/orders, then intercepts the yiivaapp://payment-return deep link
 * PayFast redirects to (docs/screens/04-checkout/api-contract.md).
 */
export default function PayfastScreen() {
  const insets = useSafeAreaInsets();
  const session = useMemo(getPaymentSession, []);
  const finished = useRef(false);

  const html = useMemo(() => {
    if (!session) return '';
    const inputs = Object.entries(session.payment.fields)
      .map(
        ([name, value]) =>
          `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(String(value))}" />`
      )
      .join('\n');
    return `<!DOCTYPE html>
<html>
  <head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
  <body style="background:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:-apple-system,sans-serif;color:#666">
    Redirecting to PayFast…
    <form id="payfast" action="${escapeHtml(session.payment.actionUrl)}" method="post">${inputs}</form>
    <script>document.getElementById('payfast').submit();</script>
  </body>
</html>`;
  }, [session]);

  const finish = (status: 'success' | 'cancelled') => {
    if (finished.current) return;
    finished.current = true;
    const orderId = session?.order.id;
    clearPaymentSession();
    if (status === 'success') {
      router.replace({ pathname: '/order-success', params: { orderId } });
    } else {
      router.back();
    }
  };

  const handleClose = () => {
    Alert.alert('Cancel payment?', 'Your order will stay unpaid and you can retry from checkout.', [
      { text: 'Keep paying', style: 'cancel' },
      { text: 'Cancel payment', style: 'destructive', onPress: () => finish('cancelled') },
    ]);
  };

  if (!session) {
    // Deep-linked here without a live session (e.g. cold start) — bail out.
    return (
      <View style={[styles.container, styles.center]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.missingText}>No payment in progress.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.dismissTo('/(tabs)')}>
          <Text style={styles.buttonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Secure payment</Text>
        <View style={styles.headerSpacer} />
      </View>

      <WebView
        source={{ html, baseUrl: 'https://app.yiiva.co.za' }}
        originWhitelist={['*']}
        startInLoadingState
        renderLoading={() => (
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <ActivityIndicator size="large" color="#333" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 20,
    color: '#000',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  headerSpacer: {
    width: 36,
  },
  missingText: {
    fontSize: 16,
    color: '#666',
  },
  button: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
