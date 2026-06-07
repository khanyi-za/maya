# YIIVA Mobile — Cart (Screen)

> Screen 03 · Tab: **Cart** (`app/(tabs)/cart.tsx`)
> Endpoints this screen calls → [`api-contract.md`](./api-contract.md)
> Open questions → [`../../open-questions.md`](../../open-questions.md) §Cart · §Cart screen

---

## Purpose

The pre-checkout staging surface. Where the buyer reviews everything they've decided to buy, adjusts quantities, removes regrets, and commits to checkout. The cart is also the durable holding pen for items added during browsing — including across sessions and devices for signed-in users.

This screen is structurally simple but commercially critical: every churn here is a lost sale. The two failure modes that matter most are **stock drift** (the item was added but is now sold out) and **price drift** (rare, but possible if the merchant changes the listed price after add). Both must be handled with care.

---

## Entry points

- **Cart tab** from the bottom nav
- **Cart icon in `YiivaHeader`** from Home, Search, Wishlist, Explore, Shop tab
- **Cart icon (floating) in Product Detail header**
- **After Add to Cart confirmation toast** — current implementation does not auto-navigate; user can tap a "View cart" CTA in the toast (TBD)
- **Deep link** — `yiivaapp://cart` for internal navigation

---

## Visual layout

### Cart with items (primary state)

```
┌───────────────────────────────────────────┐
│  [←]       Shopping Cart                  │  ← A   Header
├───────────────────────────────────────────┤
│  3 items in your cart                      │  ← B   Item count banner
├───────────────────────────────────────────┤
│  ┌──────┐  Mosadi Snatched Kimono   [🗑] │
│  │      │  By Tol'thema                    │
│  │ IMG  │  Size: M                         │  ← C   Cart item
│  │      │  R899.00                         │       (repeats per item)
│  └──────┘  ┌──────────────┐                │
│            │  [-]   1  [+] │                │
│            └──────────────┘                │
│  ─────────────────────────────────────     │
│  ┌──────┐  The Khosi Shirt          [🗑] │
│  │ IMG  │  By Tol'thema                    │
│  │      │  Size: S                         │
│  └──────┘  R650.00                         │
│            ┌──────────────┐                │
│            │  [-]   2  [+] │                │
│            └──────────────┘                │
│              ⋮ more items ⋮                │
├───────────────────────────────────────────┤
│  Order Summary                             │
│  Subtotal (3 items)         R2,199.00      │  ← D   Order summary
│  Shipping       Calculated at checkout     │
│  ────────────────────────────────          │
│  Total                      R2,199.00      │
├═══════════════════════════════════════════┤
│  PROCEED TO CHECKOUT - R2,199.00          │  ← E   Fixed bottom button
└───────────────────────────────────────────┘
```

### Empty cart

```
┌───────────────────────────────────────────┐
│  [←]       Shopping Cart                  │
├───────────────────────────────────────────┤
│                                            │
│                                            │
│              [ 🛒 large ]                  │
│                                            │
│         Your cart is empty                 │
│                                            │
│    Add items to your cart to get started   │
│                                            │
│         ┌──────────────────────┐           │
│         │  Continue Shopping   │           │
│         └──────────────────────┘           │
│                                            │
│                                            │
└───────────────────────────────────────────┘
```

### Section → data-source key

| § | Section | Data source |
|---|---|---|
| **A** | Header | Static title. Back button pops navigator. |
| **B** | Item count banner | `cart.itemCount` from `GET /cart` |
| **C** | Cart item row | `cart.items[]` from `GET /cart`. Quantity controls → `PATCH /cart/items/{itemId}`. Trash → `DELETE /cart/items/{itemId}` |
| **D** | Order summary | `cart.subtotal` from `GET /cart`. Shipping deferred to Checkout. Total = subtotal (current — no tax/shipping shown here) |
| **E** | Fixed bottom button | Subtotal from `D`. Tap → `/checkout` |
| Empty | Empty state | Returned when `cart.items.length === 0` |

### Scroll & sticky behaviour

- **Vertical scroll** on the items list + order summary together.
- **Header (A)** is sticky (not part of the scroll).
- **Bottom button (E)** is sticky (absolute-positioned).
- **Empty state** has no scroll — fills the screen.

---

## Layout (top to bottom)

### Header (`header`)
- Back button (left)
- "Shopping Cart" title (center)
- Right spacer for symmetry (no action there currently)

### When cart is empty
- Large 🛒 icon (centered)
- "Your cart is empty" heading
- "Add items to your cart to get started" subtitle
- "Continue Shopping" CTA → `/(tabs)` (Home)

### When cart has items

1. **Item count banner** (`itemCountSection`)
   - "N items in your cart" (singular/plural handled)

2. **Cart items list** (`cartItemsList`)
   - Per item (`cartItem`):
     - Product image (left, 100×120, tappable → product detail)
     - Product name (top, tappable → product detail)
     - "By <merchant displayName>" (italic, tappable → merchant profile)
     - "Size: M" (only shown if `selectedSize` is set)
     - Price (Didot font)
     - Quantity controls (`quantityControls`): `[-] N [+]`
     - Trash button (top-right corner) — `🗑`
   - Each item separated by a thin border-bottom

3. **Order summary section** (`orderSummarySection`)
   - "Order Summary" title
   - Subtotal row: "Subtotal (N items)" → amount
   - Shipping row: "Shipping" → "Calculated at checkout"
   - Divider
   - Total row: "Total" → amount (currently equals subtotal — see open questions)

4. **Fixed bottom button** (`fixedButtonSection`)
   - "PROCEED TO CHECKOUT - R<subtotal>"

---

## User actions

| Action | Result |
|---|---|
| Tap back | Pop navigator |
| Tap product image or name | Navigate to `/product/{productId}` |
| Tap "By <merchant>" | Navigate to `/artist/{username}` |
| Tap `+` on quantity | `PATCH /cart/items/{itemId}` with `quantity + 1` (optimistic) |
| Tap `-` on quantity (qty > 1) | `PATCH /cart/items/{itemId}` with `quantity - 1` (optimistic) |
| Tap `-` on quantity (qty == 1) | No-op (button disabled visually); alternative UX: confirm-remove dialog |
| Tap 🗑 trash | `DELETE /cart/items/{itemId}` (optimistic; undo toast TBD) |
| Tap PROCEED TO CHECKOUT | Navigate to `/checkout` |
| Tap Continue Shopping (empty state) | Navigate to `/(tabs)` (Home) |
| Pull to refresh | Refetch `GET /cart` (re-validates stock + prices) |

---

## States

| State | Trigger | UI |
|---|---|---|
| **Loading (first paint)** | Initial fetch in flight | Skeleton: item count banner + 2-3 skeleton item rows + skeleton summary; bottom button disabled |
| **Loaded (with items)** | `cart.items.length > 0` | Primary visual layout above |
| **Empty** | `cart.items.length === 0` | Empty state with Continue Shopping CTA |
| **Quantity update in flight** | After +/- tap | Disable both qty buttons + faint spinner over the item; revert on error |
| **Item removal in flight** | After trash tap | Optimistic remove from list; on error → re-insert with toast "Couldn't remove item" |
| **Stock drift detected** | On mount, an item's `available === false` | That item rendered with strikethrough name + "Sold out" badge + only the trash button is enabled |
| **Price drift detected** | On mount, an item's `unitPrice` differs from add-time | Subtle banner per item: "Price changed: was R600, now R650" — user must acknowledge before checkout (TBD) |
| **Cart fetch failed** | Network / 5xx | Error state with retry CTA. Last cached cart stays visible if present. |
| **Authenticated buyer** | Signed in | Cart server-backed; persists across devices |
| **Guest** | No session | Cart server-backed via `X-Cart-Session` UUID; reconciles on login |

---

## Prototype-only behavior to deprecate

| Item | Location | Replace with |
|---|---|---|
| Cart state entirely client-side | `lib/cart-store.ts` | Server-backed cart via `GET /cart` + mutation endpoints |
| Currency stored as `'R'` (symbol) instead of `'ZAR'` (code) | `cart-store.ts` add-to-cart fallback | Always store `'ZAR'`; format `'R'` symbol at display time |
| Quantity `+` doesn't check stock | `cart.tsx:42` `handleIncreaseQuantity` | After `PATCH`, backend may return 409 if exceeding `stockCount` — handle |
| Quantity `-` disabled at 1 instead of confirm-remove | `cart.tsx:45-47` | Decision: keep disabled-at-1 OR show confirm dialog at 1→0 |
| No "save for later" / "move to wishlist" affordance | — | Optional v2 feature (likely product call) |
| Order summary "Total" equals subtotal (no shipping/tax visible) | `cart.tsx:179-181` | Either show "estimated total" with tax-inclusive subtotal, or relabel "Subtotal" everywhere on this screen and reserve "Total" for the Checkout screen |
| Image rendering goes through `getLocalAsset` fixtures | `cart.tsx:96` | Use absolute CDN URLs from the server cart |
| `selectedSize` is a string ("M"), not a variantId | `cart-store.ts`, `cart.tsx:128-130` | Use `variantId` per [open-questions §PD-9](../../open-questions.md#pd-9--variant-swap-mechanic); display the size label from the variant object |
| No undo on remove | `cart.tsx:36-38` | Toast with "Undo" affordance (5s) — re-add the item if tapped |
| No promo code input | — | TBD product call — likely a section above Order Summary |
| Hard-coded "Continue Shopping" → `/(tabs)` | `cart.tsx:51` | Same destination is fine; consider remembering the screen the user came from |
