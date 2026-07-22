// Hands the payment redirect payload from Checkout to the WebView screen.
// Router params can't safely carry the signed form fields (URL length +
// encoding), so the payload rides in module state for the one navigation hop.

import type { PlaceOrderResult } from './api-client';

let current: PlaceOrderResult | null = null;

export function setPaymentSession(session: PlaceOrderResult): void {
  current = session;
}

export function getPaymentSession(): PlaceOrderResult | null {
  return current;
}

export function clearPaymentSession(): void {
  current = null;
}
