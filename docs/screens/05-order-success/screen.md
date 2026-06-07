# YIIVA Mobile — Order Success (Screen)

> Screen 05 · Route: `/order-success?orderId=<id>` (`app/order-success.tsx`)
> Endpoints this screen calls → [`api-contract.md`](./api-contract.md)
> Open questions → [`../../open-questions.md`](../../open-questions.md) §Order Success · §Orders

---

## Purpose

The confirmation moment. Reassures the buyer that payment succeeded and the order is recorded; sets expectations for what happens next; and — critically for the YIIVA commercial model — surfaces the **guest claim CTA** for users who just bought without an account.

This screen also covers the *"payment is processing"* state (the IPN-confirmation polling window from Checkout) and the *"payment failed"* recovery path. It's a state machine, not a static congratulations.

---

## Entry points

- **From Checkout** — `POST /orders` succeeded (Apple Pay sync) OR payment-return deep link with `status=success`
- **Deep link** — `yiivaapp://order-success?orderId=X` (from push notifications, email links, etc.)
- **Universal link** — `https://yiiva.co.za/orders/<id>` redirects here on mobile

---

## Visual layout

### Confirmed state (primary)

```
┌───────────────────────────────────────────┐
│                                            │
│                                            │
│                 [ ✅ ]                     │  ← A   Success icon
│                                            │
│        Order Placed Successfully!          │  ← B   Title + subtitle
│                                            │
│   Thank you for your order. We'll send     │
│   you a confirmation email shortly.        │
│                                            │
├───────────────────────────────────────────┤
│  Order Number:        #YV-2026-000142     │
│  Total Amount:        R2,603.60            │  ← C   Order details card
│  Items:               3                    │
│  Estimated Delivery:  3-5 business days    │
├───────────────────────────────────────────┤
│  Your Order                                │
│  ┌────┐  Mosadi Snatched Kimono            │
│  │ IMG│  By Tol'thema                      │  ← D   Order items list
│  │    │  Size: M    Qty: 1    R899.00      │       (read-only)
│  └────┘                                    │
│            ⋮ more items ⋮                  │
├───────────────────────────────────────────┤
│  What's Next?                              │
│  ✉   You'll receive a confirmation email   │
│  🔨  Tol'thema will start creating it      │  ← E   Next steps
│  🚚  We'll notify you when it ships        │       (varies by inventoryType)
├───────────────────────────────────────────┤
│  [Guests only:]                            │
│  Save your account                         │
│                                            │
│  Track your orders, save addresses, and    │  ← F   Guest claim CTA
│  check out faster next time.               │       (signed-in users: hidden)
│  ┌─────────────────────────────┐           │
│  │  Create Account             │           │
│  └─────────────────────────────┘           │
├───────────────────────────────────────────┤
│  ┌─────────────────────────────┐           │
│  │  📍 Track Your Order        │           │  ← G   Action buttons
│  └─────────────────────────────┘           │
│  ┌─────────────────────────────┐           │
│  │  Continue Shopping          │           │
│  └─────────────────────────────┘           │
└───────────────────────────────────────────┘
```

### Pending state (payment IPN not yet confirmed)

```
┌───────────────────────────────────────────┐
│                                            │
│                                            │
│                 [ ⏳ ]                     │  ← spinning hourglass
│                                            │
│       We're processing your payment        │
│                                            │
│  Hang tight — your order is being          │
│  confirmed. This usually takes a moment.   │
│                                            │
│       Order Number: #YV-2026-000142        │
│                                            │
│       Auto-refreshing…                     │
│                                            │
│  ┌─────────────────────────────┐           │
│  │  View My Orders             │           │
│  └─────────────────────────────┘           │
└───────────────────────────────────────────┘
```

### Failed state (payment authorisation rejected)

```
┌───────────────────────────────────────────┐
│                                            │
│                 [ ⚠ ]                     │
│                                            │
│       Payment didn't complete              │
│                                            │
│  Your order is on hold. Try paying again   │
│  or pick a different payment method.       │
│                                            │
│       Order Number: #YV-2026-000142        │
│                                            │
│  ┌─────────────────────────────┐           │
│  │  Try Payment Again          │           │
│  └─────────────────────────────┘           │
│  ┌─────────────────────────────┐           │
│  │  Cancel Order               │           │
│  └─────────────────────────────┘           │
└───────────────────────────────────────────┘
```

### Section → data-source key

| § | Section | Data source |
|---|---|---|
| **A** | Success / pending / failed icon | Derived from `order.status` (`CONFIRMED` → ✅, `PENDING_PAYMENT` → ⏳, `PAYMENT_FAILED` → ⚠) |
| **B** | Title + subtitle | Static copy per status |
| **C** | Order details card | `GET /orders/{id}` — `orderNumber`, `total`, `items.length`, `shipping.estimatedDelivery` |
| **D** | Order items list | `order.items[]` from `GET /orders/{id}` |
| **E** | What's Next | Static base copy; the "creating it" step is replaced when `order.items[].inventoryType === 'in_stock'` |
| **F** | Guest claim CTA | Hidden if `useAuthStore().state.status === 'authenticated'`. Otherwise prompts the claim flow per [`auth-mobile-guide.md`](../../auth-mobile-guide.md) §4.10 |
| **G** | Action buttons | "Track Your Order" → `/track-order?orderId=X`. "Continue Shopping" → `/(tabs)` |

### Scroll & sticky behaviour

- **Vertical scroll** for the whole content.
- **No header bar, no back button** — intentional; this is a terminal screen for the checkout flow.
- **No sticky elements.**

---

## Layout (top to bottom)

### Header
- None. The system bottom-bar is the only persistent chrome.

### Confirmed state
1. Success icon (large green checkmark)
2. Title ("Order Placed Successfully!") + subtitle (email confirmation note)
3. **Order details card** — order number, total amount, item count, estimated delivery
4. **Your Order** — read-only list of order items (image, name, merchant, size, quantity, price)
5. **What's Next?** — three icon + text rows (email confirmation, fulfilment, shipping)
6. **Guest claim CTA** — only shown if user is not authenticated
7. **Action buttons** — Track Your Order (primary) + Continue Shopping (secondary)

### Pending state
1. Spinning hourglass icon
2. "We're processing your payment" title
3. Reassuring subtitle
4. Order number
5. "Auto-refreshing…" affordance
6. "View My Orders" button (lets user bail out to /account/orders without losing the order)

### Failed state
1. Warning icon
2. "Payment didn't complete" title
3. Recovery copy
4. Order number
5. "Try Payment Again" button → re-opens payment flow for the same order
6. "Cancel Order" button → confirms then `POST /orders/{id}/cancel`

---

## User actions

| Action | Result |
|---|---|
| Tap Track Your Order | Navigate to `/track-order?orderId=X` |
| Tap Continue Shopping | Navigate to `/(tabs)` |
| Tap Create Account (guest CTA) | Navigate to `/(auth)/claim?email=<order.email>` — email prefilled and locked per [`auth-mobile-guide.md`](../../auth-mobile-guide.md) §5.8 |
| Tap View My Orders (pending state) | Navigate to `/account/orders` |
| Tap Try Payment Again (failed state) | Open the payment WebView again (or Apple Pay sheet) for the same `orderId` |
| Tap Cancel Order (failed state) | Confirm dialog → `POST /orders/{id}/cancel` → toast → navigate to `/(tabs)` |
| Pull to refresh (any state) | `GET /orders/{id}` — useful for the pending state when the user wants to nudge a status check |
| App backgrounds during pending state | When foregrounded, refetch `GET /orders/{id}` and update state |

---

## States

| State | Trigger | UI |
|---|---|---|
| **Loading** | First fetch in flight (no order data yet) | Skeleton variant of the Confirmed state |
| **Confirmed** | `order.status === 'CONFIRMED'` (or any status downstream of it — PREPARING, SHIPPED, etc.) | Primary confirmed visual |
| **Pending** | `order.status === 'PENDING_PAYMENT'` | Pending visual; auto-poll `GET /orders/{id}` every 5s for up to 2 minutes |
| **Failed** | `order.status === 'PAYMENT_FAILED'` | Failed visual with recovery actions |
| **Cancelled** | `order.status === 'CANCELLED'` | Show a simplified cancelled state with "Browse YIIVA" CTA |
| **Order not found (404)** | Bad `orderId` in URL | Error: "We couldn't find that order. Check the link or contact support." |
| **Forbidden (403)** | `orderId` belongs to another user | Error: "You don't have access to this order." |
| **Network error** | 5xx / offline | Toast + retry CTA. Keep showing the URL-derived order number so the user has something to reference. |
| **Guest, confirmed** | Confirmed state + no auth session | Show the claim CTA section (F) |
| **Authenticated, confirmed** | Confirmed state + auth session | Hide claim CTA section |
| **In-stock vs made-to-order** | Varies per item | "What's Next?" wording adapts — for in-stock items, the "Artist will start creating it" line becomes "Your order will be prepared for shipping" |

---

## Prototype-only behavior to deprecate

| Item | Location | Replace with |
|---|---|---|
| Fake order number generated client-side per render | `order-success.tsx:18` `YV${Date.now().toString().slice(-6)}` | `order.orderNumber` from `GET /orders/{id}` (and the screen takes `orderId` from query params) |
| No `orderId` URL param | route is `/order-success` (no params) | Route becomes `/order-success?orderId=X`; component uses `useLocalSearchParams<{orderId: string}>()` |
| Tax/total computed client-side with 15% VAT and R650-free-shipping rule | `order-success.tsx:21-24` | All totals come from `order.total` / `order.subtotal` / `order.tax` / `order.shippingFee` in the API response |
| Reads from `useCartStore` for items | `order-success.tsx:15` | Read from `order.items[]` — the cart is cleared server-side after a successful order |
| Hard-coded "7-10 business days" delivery estimate | `order-success.tsx:69` | `order.shipping.estimatedDelivery` ISO date, formatted as relative ("Arriving 10-12 June") |
| "Artist will start creating your item" assumes made-to-order | `order-success.tsx:116` | Vary based on `order.items[].inventoryType`: in-stock items get "We're preparing your order for shipping" |
| `console.log` placeholder for tracking nav | `order-success.tsx:32` | Wire to `router.push(\`/track-order?orderId=${orderId}\`)` |
| Track Order navigation passes no order id | `order-success.tsx:33` | Pass `orderId` |
| `clearCart` destructured but not called | `order-success.tsx:15` | Remove — backend clears the cart server-side; mobile invalidates the cached `GET /cart` query via TanStack |
| No claim CTA for guest checkout | — | Add the "Save your account" section conditional on `useAuthStore().state.status !== 'authenticated'` |
| No pending / failed state | — | Add per States table — required for production payment flow per [`screens/04-checkout/api-contract.md`](../04-checkout/api-contract.md) Call sequence on payment return |
| No polling on pending state | — | Auto-poll `GET /orders/{id}` every 5s for up to 2 minutes when status is `PENDING_PAYMENT` |
| No back button — intentional, but no clear "exit" if user lands here in error | — | Confirmed; ensure deep-link error states have a "Browse YIIVA" CTA so the user is never stranded |
