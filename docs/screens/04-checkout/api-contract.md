# YIIVA Mobile — Checkout (API Contract)

> Screen 04 · companion to [`screen.md`](./screen.md)
>
> Manifest, not spec. Endpoint shapes are defined once in [`../../api/`](../../api/) by domain. This doc says which endpoints Checkout calls, when, and any screen-specific context.
>
> Global rules → [`../../api-conventions.md`](../../api-conventions.md). Open questions → [`../../open-questions.md`](../../open-questions.md).

---

## Endpoints called by Checkout

| # | Endpoint | Spec | When |
|---|---|---|---|
| 1 | `GET /cart` | [`api/cart.md`](../../api/cart.md) §2 | Mount (re-validate cart before commit) |
| 2 | `GET /me/addresses` | [`api/addresses.md`](../../api/addresses.md) §1 | Mount (signed-in only) |
| 3 | `POST /me/addresses` | [`api/addresses.md`](../../api/addresses.md) §2 | "Add address" form submit |
| 4 | `PATCH /me/addresses/{id}` | [`api/addresses.md`](../../api/addresses.md) §3 | "Edit address" form submit |
| 5 | `POST /shipping/rates` | [`api/shipping.md`](../../api/shipping.md) §1 | Address selected/changed, Delivery toggle, mount |
| 6 | `GET /shipping/pickup-locations` | [`api/shipping.md`](../../api/shipping.md) §2 | Pickup toggle selected |
| 7 | `GET /me/payment-methods` | [`api/payments.md`](../../api/payments.md) §1 | Mount (signed-in only) |
| 8 | `POST /me/payment-methods` | [`api/payments.md`](../../api/payments.md) §2 | "Add card" form (TBD — likely separate screen) |
| 9 | `POST /promo-codes/validate` | [`api/promos.md`](../../api/promos.md) §1 (TBD) | "Apply" promo tap |
| 10 | `POST /orders` | [`api/orders.md`](../../api/orders.md) §1 | "PLACE ORDER" tap |
| 11 | `GET /orders/{id}` | [`api/orders.md`](../../api/orders.md) §2 | Polling after payment return (until status transitions) |

---

## Call sequence on mount

```
1. In parallel:
   - GET /cart                              ← critical, blocks render
   - GET /me/addresses (if signed in)       ← non-blocking; affects D
   - GET /me/payment-methods (if signed in) ← non-blocking; affects F
2. Once /cart resolves:
   - Check for unavailable items → if any, show banner + back-to-Cart CTA
3. Default selections applied:
   - Shipping method: Delivery
   - Address: default from /me/addresses (or "Add address" CTA if none)
   - Payment: Apple Pay if iOS available, else first saved card, else Payflex
4. POST /shipping/rates (if address resolved) — fills shipping rate options
5. Render.
```

## Call sequence on Delivery ↔ Pickup toggle

```
Delivery selected:
1. Hide pickup locations
2. POST /shipping/rates with current address — refresh rate options
3. Recompute total locally from selected rate

Pickup selected:
1. Hide delivery address + rates
2. GET /shipping/pickup-locations (with postcode or device location)
3. Auto-select nearest location
4. Pickup is FREE — shipping line shows R0.00
5. Recompute total
```

## Call sequence on address change

```
1. User taps Edit → address book screen
2. User selects different address → returns to Checkout with new addressId
3. POST /shipping/rates with new address
4. Update rate list, re-select cheapest, recompute total
```

## Call sequence on PLACE ORDER

```
1. Validate locally: address selected (delivery), location selected (pickup),
   payment method selected. If invalid: scroll to + flash the missing section.
2. Disable bottom button, show spinner
3. POST /orders
   body: { shippingMethod, addressId or pickupLocationId, shippingRateId,
           paymentMethod, paymentMethodId (for saved card),
           promoCode, applePayToken (if Apple Pay) }
4a. 200 with paymentUrl → open WebView with returnUrl=yiivaapp://payment-return?orderId=X
4b. 200 with status=succeeded (Apple Pay completed natively) → navigate to /order-success?orderId=X
4c. 409 STOCK_DRIFT → toast + navigate back to Cart
4d. 422 SHIPPING_UNAVAILABLE → toast + force Pickup
4e. 5xx → toast, re-enable button
```

## Call sequence on payment return

```
Deep link: yiivaapp://payment-return?orderId=X&status=success|failed|cancelled

If success:
1. Navigate to /order-success?orderId=X
2. Poll GET /orders/X every 3s for up to 30s, until status === "CONFIRMED"
   (the PayFast IPN may take a moment to land server-side)
3. If status doesn't confirm within 30s, navigate to /order-success with a
   "We're processing your payment" banner; the Order Success screen handles
   long-tail confirmation

If failed or cancelled:
1. Toast: "Payment didn't complete. Try again or use another method."
2. Stay on Checkout (cart still has items, selections preserved)
3. Re-enable PLACE ORDER
```

---

## Checkout-specific notes per endpoint

### 1. `GET /cart`

- **Critical path** — Checkout cannot render without it. Failure → return to Cart with error banner.
- **Stock revalidation** — backend should compute `available` per item at this fetch time. Any item with `available === false` shows the banner at the top of Checkout and blocks PLACE ORDER.
- **Cache strategy** — staleTime 0 on Checkout. Always fresh.
- **No `/cart/summary`** — Checkout needs the full item list for the order summary section.

### 2-4. `/me/addresses`

- **Auth required** — guest users get the inline address form instead.
- **Cache strategy** — staleTime 5min. Refetch on return from address book screen.
- **Default address** — backend designates one address as default via `isDefault: true`. Mobile picks this for the initial render.

### 5. `POST /shipping/rates`

- **Re-call triggers** — every address change, Delivery toggle, and on initial mount with default address.
- **Body** — `{ items: [{ productId, variantId, quantity }], destination: { postalCode, country } }`.
- **Response** — array of rate options with `{ id, name, fee, minDays, maxDays, courier }`. Mobile pre-selects cheapest.
- **Cache strategy** — no client cache (server is authoritative; rates can change).

### 6. `GET /shipping/pickup-locations`

- **Query params** — `?postalCode=X&limit=10` OR `?lat=X&lng=Y&limit=10` (whichever is available).
- **Cache strategy** — staleTime 1h (pickup locations are stable).
- **No GPS in v1** — start with postcode entry. GPS-based location resolution is v2.

### 7-8. `/me/payment-methods`

- **Auth required** — guest pays via Apple Pay or one-off card entry (no save).
- **Saved cards never expose CVV or full PAN** — backend returns `{ id, brand, last4, expiryMonth, expiryYear, isDefault }`.
- **PCI scope** — adding a card goes through PayFast's tokenisation flow; mobile never handles raw card data.

### 9. `POST /promo-codes/validate`

- **Body** — `{ code, cartId }`.
- **Response** — `{ valid: true, discount: { type: 'percentage' | 'fixed', value, displayText } }` or error.
- **No partial application** — one promo code at a time. Stacking rules TBD.

### 10. `POST /orders`

- **The big one.** This is where the buy actually happens.
- **Auth optional** — guest checkout works via `X-Cart-Session`.
- **Body fields:**
  - `shippingMethod: 'delivery' | 'pickup'`
  - `addressId` (delivery) OR `pickupLocationId` (pickup)
  - `shippingRateId` (delivery only)
  - `paymentMethod: 'apple_pay' | 'card' | 'payflex' | 'payjustnow' | ...`
  - `paymentMethodId` — for saved cards
  - `applePayToken` — encrypted token from Apple Pay sheet
  - `promoCode` — optional
  - `email` — required for guest checkout (for the order confirmation email)
- **Response 200 with `paymentUrl`** — for redirect-based payment methods (card via PayFast, Payflex). Mobile opens WebView.
- **Response 200 with `status: 'succeeded'`** — for completed-in-app methods (Apple Pay via PayFast). Mobile navigates straight to /order-success.
- **Errors:**
  - `409 STOCK_DRIFT` — an item is no longer available. Mobile navigates back to Cart.
  - `422 SHIPPING_UNAVAILABLE` — selected address can't be shipped to. Mobile forces Pickup.
  - `422 PAYMENT_METHOD_UNAVAILABLE` — Payflex declined the user, etc.
  - `5xx` — generic error; retry-on-user-tap (no auto-retry).

### 11. `GET /orders/{id}`

- **Used during the payment-return polling window.** PayFast IPN may take a few seconds to land server-side; mobile polls until `status === 'CONFIRMED'`.
- **Polling cadence** — every 3 seconds for up to 30 seconds, then move on (Order Success screen handles long-tail).

---

## Failure modes specific to Checkout

| Scenario | Mobile behaviour |
|---|---|
| `/cart` fails on mount | Bounce back to Cart with error banner |
| Cart has unavailable items on mount | Banner at top + PLACE ORDER disabled until user returns to Cart and removes them |
| `/me/addresses` fails | Continue with inline address-entry form; surface error subtly |
| `/me/payment-methods` fails | Hide saved-card option; user can still pay via Apple Pay / Payflex |
| `POST /shipping/rates` fails | Show retry pill in rates section; PLACE ORDER disabled until rates resolve |
| `POST /shipping/rates` returns empty (no shipping to address) | Disable Delivery toggle, force Pickup with banner |
| `POST /orders` 409 STOCK_DRIFT | Toast + back to Cart (the cart will show which item is sold out) |
| `POST /orders` 5xx | Toast, re-enable button, user retries |
| Payment WebView fails to load | Close WebView, toast, re-enable PLACE ORDER |
| User closes WebView mid-payment | Treat as cancelled — return to Checkout |
| Deep link `status=success` but `GET /orders/{id}` doesn't confirm within 30s | Navigate to Order Success with "We're processing your payment" banner; show pending state until next refresh |
| Deep link arrives but app was killed | iOS/Android relaunch handles the URL; cold-start flow + deep-link handler navigate to `/order-success?orderId=X` |
| Apple Pay sheet cancelled by user | Re-enable PLACE ORDER silently (no toast — they explicitly cancelled) |
| Network drops during `POST /orders` | Toast: "Couldn't reach YIIVA. Check your connection." Re-enable button. Do NOT auto-retry — risk of duplicate orders. |
| `POST /orders` succeeds but app crashes before navigating | On next cold start, the cart is server-cleared and the order exists. Order Success can still be reached via the order detail link in the confirmation email or push notification. |
