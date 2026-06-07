# YIIVA Mobile — Order Success (API Contract)

> Screen 05 · companion to [`screen.md`](./screen.md)
>
> Manifest, not spec. Endpoint shapes are defined once in [`../../api/`](../../api/) by domain. This doc says which endpoints Order Success calls, when, and any screen-specific context.
>
> Global rules → [`../../api-conventions.md`](../../api-conventions.md). Open questions → [`../../open-questions.md`](../../open-questions.md).

---

## Endpoints called by Order Success

| # | Endpoint | Spec | When |
|---|---|---|---|
| 1 | `GET /orders/{id}` | [`api/orders.md`](../../api/orders.md) §2 | Mount, pull-to-refresh, poll-on-pending, foreground via `AppState` |
| 2 | `POST /orders/{id}/cancel` | [`api/orders.md`](../../api/orders.md) §5 | "Cancel Order" (failed state) |
| 3 | `POST /auth/claim` | [`auth-mobile-guide.md`](../../auth-mobile-guide.md) §4.10 | "Create Account" (guest claim CTA) |

Note: this screen does NOT call `/cart` — the cart is server-cleared by `POST /orders` and Order Success reads the order, not the cart.

---

## Call sequence on mount

```
1. Read orderId from useLocalSearchParams
2. GET /orders/{orderId}   ← critical, blocks render
3. Switch on order.status:
   - CONFIRMED / PREPARING / SHIPPED / DELIVERED → render Confirmed state
   - PENDING_PAYMENT → render Pending state, start polling
   - PAYMENT_FAILED → render Failed state
   - CANCELLED → render Cancelled state
4. If guest (useAuthStore().state.status !== 'authenticated'):
   - Show the Create Account CTA in section F
5. Invalidate the TanStack cache for GET /cart (cart was server-cleared by POST /orders)
6. Invalidate TanStack cache for GET /cart/summary so the cart-icon badge reflects 0
```

## Call sequence on pending poll

```
While order.status === 'PENDING_PAYMENT':
  1. Poll GET /orders/{orderId} every 5 seconds
  2. On status change → stop polling, switch render to the new state
  3. After 2 minutes of polling with no change → stop polling
     - Keep the Pending state visible
     - Show "Still processing. We'll email you when it's confirmed."
     - The user can continue using the app; eventually a push notification
       (or refreshing the screen) will surface the final status
  4. On AppState foreground during the polling window → immediate refetch
```

## Call sequence on Try Payment Again (failed state)

```
1. POST /orders/{id}/retry-payment   🔴 (proposed — not yet in api/orders.md)
   Returns a fresh paymentUrl for the same order
2. Open WebView with the paymentUrl
3. Standard payment-return deep link handling
4. Re-render Order Success based on new status
```

> Alternative: instead of retrying payment on the same order, the user could
> cancel and create a new order from a saved cart. Simpler backend, worse UX.
> See [open-questions §OS-3](../../open-questions.md#os-3--payment-retry-mechanic).

## Call sequence on Cancel Order (failed state)

```
1. Confirm dialog ("Cancel this order?")
2. POST /orders/{orderId}/cancel
3. On success → navigate to /(tabs) with toast: "Order cancelled."
4. On failure (e.g. order moved out of cancellable state) → toast + stay on screen
```

## Call sequence on guest claim

```
1. Tap "Create Account" → navigate to /(auth)/claim with email prefilled from order
2. The Claim screen calls POST /auth/claim per auth-mobile-guide.md §5.8
3. After successful claim, Login screen prefilled with email
4. After login, the now-authed user returns; backend reconciles their email
   with prior guest orders so /account/orders shows this order
```

---

## Order Success-specific notes per endpoint

### 1. `GET /orders/{id}`

- **Critical path** — screen can't render without it.
- **Auth mode** — required for authed users; for guest checkouts, this endpoint must accept `X-Cart-Session` (the same UUID used during the order). Otherwise the guest can never load their own confirmation. **See [open-questions §OS-2](../../open-questions.md#os-2--guest-order-access).**
- **Cache strategy** — TanStack staleTime 0 on this screen (status matters). For polling, manual `refetch()` every 5s while pending.
- **Personalised fields** — none on this endpoint; order details are universal.

### 2. `POST /orders/{id}/cancel`

- **Confirm dialog mandatory** — irreversible action.
- **Spec drafted with Track Order screen doc** — for the buyer cancellation flow general case.
- **Order Success uses this only in the Failed state**, to abandon a failed-payment order rather than retry.

### 3. `POST /auth/claim`

- **Fully spec'd in [`auth-mobile-guide.md`](../../auth-mobile-guide.md) §4.10 + §5.8.**
- The Order Success CTA is the highest-conversion entry point for this flow — the user has just transacted, the email is captured, and they have a concrete reason to want an account (track this order).
- Mobile prefills the email in the Claim form so it's locked (user can't claim with a different email than the order).

---

## Failure modes specific to Order Success

| Scenario | Mobile behaviour |
|---|---|
| `orderId` missing from URL | Show error: "We couldn't find that order." + Browse YIIVA CTA. Log to error tracker. |
| `GET /orders/{id}` 404 | Same error UI as above. May happen if the user opens an old deep link. |
| `GET /orders/{id}` 403 | "You don't have access to this order." + Browse YIIVA CTA. May happen if a user is signed in but the order belongs to a different account (e.g. guest order with a different email). |
| `GET /orders/{id}` 5xx | Toast with retry. Show order number from URL as a fallback so the user has something to reference. |
| Pending state polls indefinitely | Cap at 2 minutes. After timeout, show "Still processing" affordance with View My Orders CTA. |
| Push notification arrives while user is on Pending state | Status transition is auto-reflected by the next poll tick. No extra handling needed. |
| Failed payment → user retries via WebView → succeeds → returns via deep link | Deep link handler refetches order; transitions to Confirmed state. |
| User force-closes app on Pending state | On next open, deep link or notification routes them back here; polling resumes. |
| Guest claim succeeds but then user navigates away before logging in | Their email is now a real account; on next login, prior guest orders are linked by email server-side (per [open-questions §O-1](../../open-questions.md#o-1--guest-order-email-as-identity)). |
