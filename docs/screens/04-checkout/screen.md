# YIIVA Mobile — Checkout (Screen)

> Screen 04 · Route: `/checkout` (`app/checkout.tsx`)
> Endpoints this screen calls → [`api-contract.md`](./api-contract.md)
> Open questions → [`../../open-questions.md`](../../open-questions.md) §Checkout · §Shipping · §Payments

---

## Purpose

The commitment screen. Where the buyer locks in shipping, picks a payment method, sees the true total (with tax + shipping), and authorises the transaction. Every commercial promise YIIVA makes is realised here: PayFast for cards, Apple Pay, Payflex for BNPL, ShipLogic / Courier Guy for delivery, pickup network for collection.

This is the most operationally complex screen in the buyer app. It binds together five external integrations (cart, addresses, shipping rates, payment provider, order creation) and one critical state machine (the order). The doc treats payment as a black box for now — the precise PayFast / Apple Pay / Payflex wiring is its own domain decision.

---

## Entry points

- **PROCEED TO CHECKOUT button on Cart** screen
- **Deep link** — `yiivaapp://checkout` (signed-in users only — guests must reach Checkout through the Cart flow so the cart context exists)
- **Return from failed payment** — `yiivaapp://payment-return?orderId=X&status=failed` lands user back here with cart preserved

---

## Visual layout

```
┌───────────────────────────────────────────┐
│  [←]           Checkout                   │  ← A   Header
├───────────────────────────────────────────┤
│  Order Summary                             │
│  ┌────┐  Mosadi Snatched Kimono            │
│  │ IMG│  By Tol'thema         R899.00      │  ← B   Cart line items
│  │    │  Size: M  Qty: 1                   │       (read-only)
│  └────┘                                    │
│  ┌────┐  The Khosi Shirt                   │
│  │ IMG│  By Tol'thema         R1,300.00    │
│  │    │  Size: S  Qty: 2                   │
│  └────┘                                    │
├───────────────────────────────────────────┤
│  Shipping                                  │
│  ┌──────────────┬──────────────┐           │
│  │ 🏠 Delivery  │ 📍 Pickup    │           │  ← C   Shipping method toggle
│  └──────────────┴──────────────┘           │
│                                            │
│  [if Delivery:]                            │
│  Delivery Address              Edit        │
│  ┌─────────────────────────────┐           │
│  │ John Doe                    │           │  ← D   Address card
│  │ 123 Long Street             │           │       (or add-address CTA)
│  │ Cape Town, 8001             │           │
│  │ +27 82 123 4567             │           │
│  └─────────────────────────────┘           │
│  Standard delivery (3-5 days)     R65.00   │  ← D2  Shipping rate options
│  Express delivery (1-2 days)      R120.00  │       (from ShipLogic)
│                                            │
│  [if Pickup:]                              │
│  Select Pickup Location                    │
│  ┌─────────────────────────────┐           │
│  │ Canal Walk Shopping Centre  │ ●         │  ← E   Pickup locations
│  │ Century Blvd, Cape Town...  │           │       (radio selector)
│  │ Mon-Sat: 9AM-9PM            │           │
│  └─────────────────────────────┘           │
│  ... more locations ...                    │
├───────────────────────────────────────────┤
│  Payment Method                            │
│  ┌─────────────────────────────┐           │
│  │ 🍎  Apple Pay              ●│           │
│  │     Touch ID or Face ID     │           │
│  └─────────────────────────────┘           │
│  ┌─────────────────────────────┐           │  ← F   Payment options
│  │ 💳  Credit/Debit Card      ○│           │
│  │     Visa, Mastercard, Amex  │           │
│  │     ↳ Change Card           │           │
│  └─────────────────────────────┘           │
│  ┌─────────────────────────────┐           │
│  │ 🟣  Payflex                ○│           │
│  │     4 installments          │           │
│  └─────────────────────────────┘           │
├───────────────────────────────────────────┤
│  Promo code                      [Apply]   │  ← G   Promo entry (TBD)
│  [_____________________]                   │
├───────────────────────────────────────────┤
│  Order Total                               │
│  Subtotal                       R2,199.00  │
│  Shipping                       R65.00     │  ← H   Order total
│  Tax (15% VAT)                  R339.60    │
│  ────────────────────────────              │
│  Total                          R2,603.60  │
├═══════════════════════════════════════════┤
│  PLACE ORDER  ·  R2,603.60                │  ← I   Fixed bottom button
└───────────────────────────────────────────┘
```

### Section → data-source key

| § | Section | Data source |
|---|---|---|
| **A** | Header | Static title. Back → Cart. |
| **B** | Order Summary line items | `cart.items` from `GET /cart` (refetched on mount) |
| **C** | Delivery/Pickup toggle | Local state. Default: Delivery |
| **D** | Delivery address card | `GET /me/addresses` — default address selected. "Edit" → address book screen |
| **D2** | Shipping rate options | `POST /shipping/rates` with cart + destination address |
| **E** | Pickup locations | `GET /shipping/pickup-locations` near user (postcode or GPS) |
| **F** | Payment methods | Apple Pay native availability check + `GET /me/payment-methods` for saved cards + Payflex always-available |
| **G** | Promo code | Currently not in code. `POST /promo-codes/validate` on Apply (TBD) |
| **H** | Order Total | Computed from B + selected shipping rate + tax (server-calc'd) |
| **I** | PLACE ORDER button | `POST /orders` → returns `paymentUrl` (or initiates Apple Pay sheet) → navigate to confirmation |

### Scroll & sticky behaviour

- **Vertical scroll** on B through H.
- **Header (A)** is sticky.
- **Bottom button (I)** is sticky (absolute-positioned).
- **No horizontal scroll** anywhere — pickup locations, payment methods, and addresses are all vertical lists.

---

## Layout (top to bottom)

### Header
- Back button (left) → returns to Cart
- "Checkout" title (center)
- Right spacer (no action)

### Order Summary (`section` — read-only)
- Per cart item: image (60×80), title, "By <merchant>", size, quantity (if > 1), line total
- This list mirrors the Cart screen but with no edit affordances — to modify, the user must back out to Cart

### Shipping (`section`)

**Method toggle:**
- Two pill-shaped tabs: 🏠 Delivery · 📍 Pickup
- Selection highlights with a card-like background

**If Delivery is selected:**
- Subsection title: "Delivery Address" + "Edit" link (right)
- Default address rendered as a card with: recipient name, street, city + postcode, country, phone
- If no saved address: "Add a delivery address" CTA (opens address-add form)
- Below the address: shipping rate options (radio list) — from ShipLogic
  - Each option: label (e.g. "Standard delivery (3-5 days)"), fee (or "FREE")
  - One option auto-selected (cheapest, or per backend recommendation)

**If Pickup is selected:**
- Subsection title: "Select Pickup Location"
- List of pickup locations (Courier Guy network) with radio selector
- Per location: name, address, hours, distance from user
- One auto-selected (nearest)

### Payment Method (`section`)
- Per payment option: card with icon, title, subtitle, radio selector
- Tap to select; subtitles change based on selection (e.g. card shows last 4 digits when selected; Payflex shows installment breakdown when selected)
- Options:
  - **Apple Pay** (iOS only; Android device → hide)
  - **Credit/Debit Card** — when selected, shows saved card's last-4 + "Change Card" link
  - **Payflex** — when selected, shows 4-installment breakdown (`total/4` per installment)
  - (Future: PayJustNow, Mobicred, RCS — per Product Detail mention)

### Promo code (NEW — not in current code)
- Single-line input + Apply button
- On Apply: `POST /promo-codes/validate` → success rewrites the totals; failure shows inline error

### Order Total
- Subtotal · Shipping · Tax (15% VAT) · Total
- Tax + Total recompute when shipping method or rate changes
- Promo discount, if applied, shows as a negative line before Tax

### Fixed bottom button
- "PLACE ORDER · R<total>"
- Disabled state while order is being placed (with spinner)
- Disabled if any required selection is missing (no address for delivery, no pickup location for pickup, no payment method)

---

## User actions

| Action | Result |
|---|---|
| Tap back | Return to Cart (with cart state preserved) |
| Tap Delivery toggle | Switch to Delivery; refetch `POST /shipping/rates` for the selected address |
| Tap Pickup toggle | Switch to Pickup; refetch `GET /shipping/pickup-locations` |
| Tap "Edit" on address | Open address book screen (stack push); on return, recompute shipping rates |
| Tap a shipping rate radio | Set selected rate; recompute totals locally (shipping fee is in the rate response) |
| Tap a pickup location radio | Set selected location |
| Tap a payment option radio | Set selected method; update subtitles (last 4, installment breakdown, etc.) |
| Tap "Change Card" | Open saved payment methods sheet → select different card or add new |
| Tap Apply (promo) | `POST /promo-codes/validate` → on success, totals update; on failure, inline error |
| Tap PLACE ORDER | `POST /orders` → triggers payment flow (WebView for PayFast/Payflex, native sheet for Apple Pay) → on success, navigate to `/order-success?orderId=X` |
| App backgrounds during payment WebView | iOS/Android may pause the WebView — see Failure modes |
| Return from payment via deep link | `yiivaapp://payment-return?orderId=X&status=success\|failed` — mobile handles each branch |

---

## States

| State | Trigger | UI |
|---|---|---|
| **Loading (first paint)** | Initial fetch in flight | Skeleton for order summary + shipping section + payment section; PLACE ORDER disabled |
| **Loaded (default state)** | All fetches resolved | Default selections applied (default address, cheapest shipping rate, Apple Pay if iOS, nearest pickup if Pickup) |
| **No saved address** | `GET /me/addresses` returns empty array, Delivery selected | Address card replaced with "Add a delivery address" CTA |
| **No saved payment method** | Card selected, no saved card | "Change Card" → "Add a card" CTA; or fall back to Apple Pay / Payflex |
| **Shipping rates loading** | Address changed or postcode change | Inline spinner over the shipping rates list |
| **Shipping rates failed** | ShipLogic error | Show error: "Couldn't fetch shipping options. Try a different address or pickup." |
| **No shipping available to address** | ShipLogic returns no rates | Disable Delivery toggle, force Pickup, banner: "We don't ship to <postcode> yet." |
| **Promo code validating** | After Apply tap | Apply button shows spinner |
| **Promo code applied** | Success | Discount line appears in totals; promo input shows applied-state with `[Remove]` |
| **Promo code invalid** | Failure | Inline error below input |
| **Placing order in flight** | After PLACE ORDER tap | Bottom button shows spinner; all inputs disabled |
| **Payment WebView open** | After `POST /orders` returns `paymentUrl` | WebView modal over the app; user pays on PayFast / Payflex |
| **Payment succeeded** | Deep link with `status=success` | Navigate to `/order-success?orderId=X`; clear cart |
| **Payment failed (user cancelled / declined)** | Deep link with `status=failed` | Return to Checkout with cart preserved; toast: "Payment didn't complete. Try again or use another method." |
| **Order creation failed (cart drift)** | `POST /orders` returns 409 | Toast: "An item in your cart is no longer available. Please review your cart." → navigate back to Cart |
| **Order creation failed (network)** | `POST /orders` 5xx | Toast: "Couldn't place order. Try again." Keep PLACE ORDER enabled. |
| **Stale cart detected on mount** | Items unavailable since Cart | Banner: "Some items are no longer available. Review your cart." + back-to-cart CTA |
| **Guest checkout** | No session | All flows work; payment goes through; on `/order-success`, surface the "Save my account" claim CTA |

---

## Prototype-only behavior to deprecate

| Item | Location | Replace with |
|---|---|---|
| Cart total computed client-side with hard-coded 15% VAT and R650-free-shipping rule | `checkout.tsx:21-24` | Server-computed totals via `POST /shipping/rates` (returns fee) and order-creation response (returns tax). Tax may differ per item/merchant |
| Hard-coded delivery address (John Doe / 123 Long Street) | `checkout.tsx:182-189` | `GET /me/addresses` — show default address; "Edit" opens address book |
| Hard-coded pickup locations (3 Cape Town locations) | `checkout.tsx:54-76` | `GET /shipping/pickup-locations` — near user (postcode or device location) |
| Hard-coded shipping fee logic (R65 flat or FREE > R650) | `checkout.tsx:22` | `POST /shipping/rates` returns option breakdown; user picks a rate |
| Card shown as "**** 1234" placeholder | `checkout.tsx:287` | Pull from `GET /me/payment-methods` — show actual last 4 of the default card |
| Apple Pay always shown even on Android | `checkout.tsx:243` | Native availability check via `expo-apple-authentication` or PayFast SDK; hide on Android |
| BNPL = Payflex only; Product Detail mentions PayJustNow, Mobicred, RCS too | `checkout.tsx:307-365` (only Payflex) | Either trim Product Detail copy OR add the other BNPL options here |
| No promo code section | — | Add per [open-questions §CT-5](../../open-questions.md#ct-5--promo-code-entry-on-cart) — Checkout, not Cart |
| PLACE ORDER → `router.push('/order-success')` with no real backend call | `checkout.tsx:38` | `POST /orders` → handle payment flow → navigate on confirmation |
| No order-creation error handling | — | 409 stock drift, 5xx network, payment failed — see States table |
| `console.log` on shipping/pickup/payment changes | `checkout.tsx:33, 47, 50` | Remove |
| No deep-link handler for payment return | — | `app/payment-return.tsx` (or similar) handles `yiivaapp://payment-return?orderId=X&status=...` |
| No "review cart" affordance from Checkout | — | Back button works; consider an inline "Edit cart" link on Order Summary section header |
