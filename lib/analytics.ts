// Client-side product analytics (PostHog, EU cloud). The entire surface
// no-ops when EXPO_PUBLIC_POSTHOG_API_KEY is unset — the app must behave
// identically with analytics disabled (dev default).
//
// This is Layer 1 (behavioral analytics: funnels, retention, drop-off).
// The backend tracking calls in api-client.ts (recordProductView,
// recordMerchantView, trackSearch) are Layer 2 — the phalo engine's feed —
// and stay independent; captures here are co-located next to them at the
// hook/handler level so the two layers never disagree about when an event
// happened.
//
// Privacy: identify() sends only the internal user id + role — no email or
// name in person properties (POPIA-lean v1).

import { useEffect, useRef } from 'react';
import { usePathname, useSegments } from 'expo-router';
import { PostHog } from 'posthog-react-native';

const API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

/** Null when no API key is configured — every helper below guards on this. */
export const posthog: PostHog | null = API_KEY
  ? new PostHog(API_KEY, { host: HOST })
  : null;

export type AnalyticsEvent =
  | 'product_viewed'
  | 'brand_viewed'
  | 'search_performed'
  | 'search_result_clicked'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'checkout_step_viewed'
  | 'payment_method_selected'
  | 'order_placed'
  | 'payment_cancelled'
  | 'purchase_completed'
  | 'reel_viewed'
  | 'reel_watched'
  | 'reel_buy_tapped'
  | 'brand_subscribed'
  | 'brand_unsubscribed'
  | 'wishlist_toggled'
  | 'sign_up_submitted';

type AnalyticsProps = Record<string, string | number | boolean | null>;

export function track(event: AnalyticsEvent, properties?: AnalyticsProps): void {
  posthog?.capture(event, properties);
}

/**
 * Called from auth-store's setAuthenticated — covers every path a session is
 * established (login, verify-email auto-login, cold-start refresh, foreground
 * refresh). Stitches the anonymous session to the user.
 */
export function identifyUser(user: { id: string; role: string }): void {
  posthog?.identify(user.id, { role: user.role });
}

/**
 * Called from auth-store's setGuest ONLY on an authenticated→guest
 * transition (sign-out). Never call on cold-start guest resolution — reset()
 * rotates the anonymous id and would break guest→signup journey stitching.
 */
export function resetAnalytics(): void {
  posthog?.reset();
}

/**
 * Screen tracking for the root layout. Reports the route PATTERN
 * (`/product/[productId]`), not the concrete path — ids belong on the
 * dedicated events, not in screen names.
 */
export function useScreenTracking(): void {
  const pathname = usePathname();
  const segments = useSegments();
  const lastPathname = useRef<string | null>(null);

  useEffect(() => {
    if (!posthog || !pathname || pathname === lastPathname.current) return;
    lastPathname.current = pathname;
    const route = segments.length > 0 ? `/${segments.join('/')}` : '/';
    posthog.screen(route);
  }, [pathname, segments]);
}
