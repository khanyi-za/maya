# YIIVA Mobile — Track Order (Screen)

> Screen 06 · Route: `/track-order?orderId=<id>` (`app/track-order.tsx`)
> Endpoints this screen calls → [`api-contract.md`](./api-contract.md)
> Open questions → [`../../open-questions.md`](../../open-questions.md) §Track Order · §Orders · §Shipping

---

## Purpose

The post-purchase visibility surface. Tells the buyer where their order is in its lifecycle, what to expect next, and gives them the relevant actions for each stage: contact the merchant for early-stage questions, cancel while still eligible, manage notifications, and (later) initiate a return.

This is the screen the buyer returns to most often after a purchase — every time a push notification arrives, every time they want to "check on my kimono." Latency, accuracy, and clarity here determine post-purchase trust.

---

## Entry points

- **Order Success screen** — "Track Your Order" button
- **Push notification** — *"Your YIIVA order is shipped"* deep links here
- **Account → My Orders** — tapping any order row
- **SideMenu** — "Track your purchase/order" (current code routes here without orderId — needs context)
- **Deep link** — `yiivaapp://track-order?orderId=X`
- **Email link** — confirmation / shipping emails route here via universal link

---

## Visual layout

### Active order (PREPARING, current state shown)

```
┌───────────────────────────────────────────┐
│             Track Order             [✕]   │  ← A   Header (close right)
├───────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐ │
│  │ #YV-2026-000142          Details →   │ │
│  │ R2,603.60                             │ │
│  │                                       │ │  ← B   Order info card
│  │ Items (2)                             │ │
│  │ ┌────┐  Mosadi Snatched Kimono        │ │
│  │ │ IMG│  By Tol'thema                  │ │
│  │ │    │  Size: M  Qty: 1   R899.00     │ │
│  │ └────┘                                │ │
│  │ ⋮                                     │ │
│  │ 📅 Estimated delivery: 10-12 June     │ │
│  │ 📍 123 Long Street, Cape Town, 8001   │ │
│  └──────────────────────────────────────┘ │
├───────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐ │
│  │ Order Status                          │ │
│  │                                       │ │
│  │ ✓── Order Placed                     │ │
│  │ │   Your order has been received      │ │
│  │ │   5 Jun, 2:30pm                     │ │
│  │ │                                     │ │
│  │ ✓── Confirmed                        │ │  ← C   Status timeline
│  │ │   Payment cleared                   │ │
│  │ │   5 Jun, 3:45pm                     │ │
│  │ │                                     │ │
│  │ ●── Preparing  ← current              │ │
│  │ │   Tol'thema is creating your item   │ │
│  │ │   Ready by 22 Jun                   │ │
│  │ │                                     │ │
│  │ ○── Shipped                          │ │
│  │ │   Pending                           │ │
│  │ │                                     │ │
│  │ ○── Delivered                        │ │
│  │     Pending                           │ │
│  └──────────────────────────────────────┘ │
├───────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐ │
│  │ 💬  Contact Tol'thema           →    │ │
│  │     Ask questions about your order    │ │
│  │  ─────                                │ │  ← D   Actions card
│  │ 🔔  Notification Settings       →    │ │
│  │     Change how you get updates        │ │
│  │  ─────                                │ │
│  │ ⊘   Cancel Order                →    │ │
│  │     Cancel eligible until 6 Jun, 3pm  │ │
│  └──────────────────────────────────────┘ │
├───────────────────────────────────────────┤
│  ❓ Need Help?                             │
│     If you have any questions about your   │  ← E   Help card
│     order, contact support or the artist.  │
│     ┌─────────────────────────────┐        │
│     │  Contact Support            │        │
│     └─────────────────────────────┘        │
└───────────────────────────────────────────┘
```

### Shipped state (with live tracking)

```
│ ●── Shipped  ← current                    │
│ │   Picked up by Courier Guy              │
│ │   Tracking: CG-2026-78421               │  ← additional tracking info
│ │   Last update: 6 Jun, 11am              │       (from ShipLogic)
│ │   Last location: Cape Town hub          │
│ │   [Track on Courier Guy →]              │
```

### Cancelled state

```
│ ✓── Order Placed                          │
│ ✓── Confirmed                             │
│ ✗── Cancelled                             │
│     You cancelled this order              │
│     6 Jun, 5:12pm                         │
│     Refund processed to **** 1234         │
```

### Section → data-source key

| § | Section | Data source |
|---|---|---|
| **A** | Header | Static. Close → navigate back to entry point (Home if no history) |
| **B** | Order info card | `GET /orders/{id}` — orderNumber, total, items, shipping.estimatedDelivery, shipping.address |
| **C** | Status timeline | `order.status` + `order.statusHistory` for completed steps + `GET /orders/{id}/tracking` for live courier data on the SHIPPED step |
| **D** | Actions card | "Contact" navigates to `/chat/{merchantUsername}?orderId=X`. "Notifications" → settings. "Cancel" visible only when `cancellationEligibleUntil > now` |
| **E** | Help card | Static. Contact Support → TBD support flow |

### Scroll & sticky behaviour

- **Vertical scroll** for the whole content.
- **Header (A) is sticky.**
- **No bottom action bar** — actions are inline cards.

---

## Layout (top to bottom)

### Header
- Spacer (left, no action)
- "Track Order" title (center)
- Close button (×) — navigates back to entry point (Home if opened via push/deep link with no history)

### Order info card
- Order number (bold) + total (right)
- "Details →" button → opens full order detail screen (TBD)
- "Items (N)" subheader
- Compact item list (image 60×80, name, merchant, size if any, quantity, line total)
- Estimated delivery row (📅 icon + date range)
- Shipping address row (📍 icon + formatted address) — for pickup orders, shows pickup location name instead

### Status timeline
- Title "Order Status"
- Vertical timeline with 5 steps:
  - **Order Placed** (always completed for any rendered order)
  - **Confirmed** (completed when status ≥ CONFIRMED)
  - **Preparing** (completed when status ≥ SHIPPED)
  - **Shipped** (completed when status === DELIVERED)
  - **Delivered** (completed when status === DELIVERED)
- Step indicator states:
  - ✓ green filled circle with checkmark — completed
  - ● black filled circle — current
  - ○ grey outlined circle — pending
- Connecting line between steps (filled green for completed segments, grey for pending)
- Each step: title, description, timestamp (or relative "Pending" / "Expected by …" for future steps)
- **Shipped step (when current or completed)** includes courier tracking sub-section (tracking number, last update time, last location, optional link to courier's web tracker)
- **Cancelled timeline variant**: shows ✗ red X for the cancellation step, hides Shipped/Delivered rows below it

### Actions card
- Per row: icon, title, subtitle, chevron-right
- **Contact <Merchant Name>** → navigate to `/chat/{merchantUsername}?orderId=X` (when multi-merchant, this row repeats per merchant)
- **Notification Settings** → app-wide notification settings screen (per [open-questions §TO-5](../../open-questions.md#to-5--update-notifications-destination))
- **Cancel Order** (conditional) — shown only when status is CONFIRMED or PREPARING and within the cancellation window. Subtitle shows the eligible-until time
- (Post-delivery only) **Return or Exchange** → starts returns flow (TBD)

### Help card
- Static block with icon, title, body
- "Contact Support" button (TBD destination)

---

## User actions

| Action | Result |
|---|---|
| Tap close (×) | Navigate back to entry point (Home if no history) |
| Tap Details → on order info card | Navigate to `/account/orders/{orderId}` (full order detail — TBD) |
| Tap a product item | Navigate to `/product/{productId}` |
| Tap Contact <Merchant> | Navigate to `/chat/{merchantUsername}?orderId=X` |
| Tap Notification Settings | Navigate to `/account/notifications` |
| Tap Cancel Order | Confirm dialog → `POST /orders/{id}/cancel` → toast → status timeline updates to cancelled |
| Tap Track on Courier Guy (shipped step) | Open courier's web tracker in in-app browser |
| Tap Contact Support | Open support flow (TBD — likely WhatsApp link, in-app message, or email) |
| Pull to refresh | Refetch `GET /orders/{id}` + `GET /orders/{id}/tracking` |
| App foregrounds while on Track Order | Refetch order + tracking via `AppState` listener |
| Push notification arrives while screen is open | Status transition is auto-reflected by the next refetch (push payload includes the new status; mobile invalidates the query) |

---

## States

| State | Trigger | UI |
|---|---|---|
| **Loading** | First fetch in flight | Skeleton of order info card + timeline + actions |
| **CONFIRMED** | `order.status === 'CONFIRMED'` | Timeline shows steps 1-2 completed, Preparing as current |
| **PREPARING** | `order.status === 'PREPARING'` | Timeline shows steps 1-3 with Preparing as current |
| **SHIPPED** | `order.status === 'SHIPPED'` | Timeline + courier tracking sub-section in Shipped step |
| **DELIVERED** | `order.status === 'DELIVERED'` | All steps green, with delivery timestamp. Actions card adds "Return or Exchange" |
| **CANCELLED** | `order.status === 'CANCELLED'` | Cancelled variant of timeline; refund details if applicable |
| **PAYMENT_FAILED** | `order.status === 'PAYMENT_FAILED'` | Edge case — shouldn't normally land here, but if so: nudge user back to Order Success for retry |
| **Cancellation eligible** | `order.status` ∈ {CONFIRMED, PREPARING} AND `cancellationEligibleUntil > now` | Cancel Order action row visible |
| **Cancellation expired** | Past `cancellationEligibleUntil` | Cancel Order row hidden; contact support to cancel |
| **Order not found (404)** | Bad `orderId` | "Order not found" + back-to-Home CTA |
| **Forbidden (403)** | Wrong user/session | "You don't have access to this order" + back-to-Home CTA |
| **Network error** | 5xx / offline | Toast + retry; cached order data stays visible |
| **Live tracking unavailable** | ShipLogic error or order pre-shipping | Shipped step shows status but no tracking sub-section |
| **Multi-merchant order** | Order has items from 2+ merchants | Single consolidated timeline + Contact rows per merchant in Actions card (per [open-questions §TO-8](../../open-questions.md#to-8--multi-merchant-order-timeline)) |

---

## Prototype-only behavior to deprecate

| Item | Location | Replace with |
|---|---|---|
| Reads from `useCartStore` for items | `track-order.tsx:24` | Read from `order.items[]` via `GET /orders/{id}` — the cart was cleared at checkout |
| Fake order number from `Date.now()` per render | `track-order.tsx:46` | `order.orderNumber` from API |
| Hard-coded timestamps in `orderStatuses` array | `track-order.tsx:63-94` | Derive from `order.statusHistory[]` ISO timestamps |
| Hard-coded estimated delivery "Feb 15, 2024" | `track-order.tsx:59` | `order.shipping.estimatedDelivery` |
| Hard-coded shipping address | `track-order.tsx:60` | `order.shipping.address` — formatted |
| Tax/total computed client-side | `track-order.tsx:50-52` | Server-computed totals from order |
| No `orderId` URL param | route is `/track-order` with no params | `/track-order?orderId=X`; use `useLocalSearchParams<{orderId: string}>()` |
| 4 hard-coded status steps (Order Placed, Confirmed, Shipped, Delivered) | `track-order.tsx:63-94` | 5 steps derived from the actual lifecycle (Order Placed, Confirmed, Preparing, Shipped, Delivered). Cancelled inserts a sixth optional step |
| `console.log` for Contact Artist | `track-order.tsx:31` | `router.push('/chat/' + merchantUsername + '?orderId=' + orderId)` |
| `console.log` for View Order Details | `track-order.tsx:36` | Navigate to full order detail screen (TBD) |
| `console.log` for Update Notifications | `track-order.tsx:41` | Navigate to `/account/notifications` |
| No Cancel Order action | — | Add per [open-questions §TO-4](../../open-questions.md#to-4--cancel-order-affordance). Visible only when eligible |
| No live courier tracking | — | Pull from `GET /orders/{id}/tracking` (ShipLogic) when status is SHIPPED |
| No Return / Exchange affordance for delivered orders | — | Add when status is DELIVERED — opens returns flow (TBD) |
| Close button routes to `/(tabs)/` even when there's a back history | `track-order.tsx:27` | `router.canGoBack() ? router.back() : router.push('/(tabs)')` |
