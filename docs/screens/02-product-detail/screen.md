# YIIVA Mobile — Product Detail (Screen)

> Screen 02 · Route: `/product/[productId]` (`app/product/[productId].tsx`)
> Endpoints this screen calls → [`api-contract.md`](./api-contract.md)
> Open questions → [`../../open-questions.md`](../../open-questions.md) §Products · §Cart · §Product Detail

---

## Purpose

The conversion screen. Where a buyer goes from interest to intent: full media (image + video carousel), price, size selection, the brand context, and the **Add to Cart** decision. Everything on this screen exists to either close the sale or reduce a doubt that's preventing it (size confidence, payment flexibility, shipping certainty, returns policy).

This is the most important commercial surface in the buyer app. Latency and clarity here directly determine conversion.

---

## Entry points

- **Product card tap** from Home feed, Search results, Wishlist, Merchant Profile, Explore
- **Similar Items tap** within another Product Detail screen
- **Cart item tap** (re-opens the product the user has in cart)
- **Universal link** — `https://yiiva.co.za/products/<id>` opens this screen directly (shareable link target)

---

## Visual layout

```
┌───────────────────────────────────────────┐
│ [←]                         [↗]      [🛒]│  ← A   Floating header icons
│                                       ●   │        (over hero, badged cart)
│                                            │
│                                            │
│              [ H E R O ]                   │  ← B   Media carousel
│          images + videos mix               │        h-scroll, paged
│        (1.3 × screen width)                │        full-bleed
│                                            │
│                                            │
│ [TAP TO ZOOM]                        [♡]  │  ← C   Zoom hint + Heart
│                                            │
│                  · · ● ·                   │  ← D   Dot indicators
├───────────────────────────────────────────┤
│  Product Name              MORE →          │  ← E   Title + description link
│  By Merchant Name                          │        merchant tappable → profile
├───────────────────────────────────────────┤
│  Get it now, pay later     3 OPTIONS →     │  ← F   BNPL info
│  Pay using Payflex, PayJustNow…            │
├───────────────────────────────────────────┤
│  Select a size             SIZE INFO →     │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐                  │  ← G   Size selector
│  │XS│ │ S│ │ M│ │ L│ │XL│                  │        (only if variants exist)
│  └──┘ └──┘ └──┘ └──┘ └──┘                  │
│  📏 FIND YOUR FIT →                        │
├───────────────────────────────────────────┤
│  More options              2 Options       │
│  ┌─────────┐ ┌─────────┐   →               │  ← H   Color/variant options
│  │  swatch │ │  swatch │                   │        (currently placeholder)
│  └─────────┘ └─────────┘                   │
├───────────────────────────────────────────┤
│  Shipping        When will I get it? →     │
│  🚚 FREE Standard delivery over R650       │  ← I   Shipping copy
│  🏪 FREE Collection over R650              │
├───────────────────────────────────────────┤
│  Returns                                   │
│  Free exchange or return within 30 days    │  ← J   Returns policy
├───────────────────────────────────────────┤
│  Similar Items                             │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐   →           │  ← K   Similar carousel
│  │ IMG│ │ IMG│ │ IMG│ │ IMG│               │
│  └────┘ └────┘ └────┘ └────┘               │
├═══════════════════════════════════════════┤
│  R899.00            🛒  ADD TO CART        │  ← L   Fixed bottom bar
└───────────────────────────────────────────┘
```

### Section → data-source key

| § | Section | Data source |
|---|---|---|
| **A** | Floating header | Back ← navigator. Share ← deep-link generator (currently unwired). Cart badge ← `GET /cart/summary` |
| **B** | Hero media carousel | `media[]` from `GET /products/{id}` — interleaves images and videos |
| **C** | Zoom hint + Heart | Heart ← `PUT/DELETE /products/{id}/like`. Zoom hint is purely visual (no zoom modal implemented yet) |
| **D** | Dot indicators | Local state `currentMediaIndex` driven by horizontal scroll position |
| **E** | Title block | Name, merchant ← `GET /products/{id}`. MORE → opens long-form description (modal — TBD). Merchant name tappable → `/artist/{username}` |
| **F** | BNPL options | Static copy now. 3 OPTIONS → opens modal explaining Payflex/PayJustNow/Mobicred/RCS (TBD) |
| **G** | Size selector | From `variants[]` (proposed) or `size` string (current `lib/api-client.ts`). Sold-out variants greyed out |
| **H** | Color/variants | TBD — currently a placeholder. Likely same product with different `variantId` swaps |
| **I** | Shipping | Static copy v1. v2 dynamic via ShipLogic + user postcode |
| **J** | Returns | Static copy. May become per-merchant policy later |
| **K** | Similar Items | `GET /products/{id}/similar` (currently using `DUMMY_CAROUSEL_PRODUCTS`) |
| **L** | Fixed bottom bar | Price from product. ADD TO CART → `POST /cart/items` |

### Scroll & sticky behaviour

- **Vertical scroll** on the entire content. Hero (A–D) is at the top of the scroll — when the user scrolls down, the hero scrolls away.
- The **floating header icons (A) scroll away with the hero in the current implementation.** That likely needs to change — most commerce apps keep at least back + cart available as the user scrolls. Flagged as a design question.
- **Bottom bar (L) is sticky** (`position: 'absolute'` at the bottom).
- **Horizontal scroll** on B (hero media, paged), H (variants), K (similar items).

---

## Layout (top to bottom)

1. **Hero section** (`heroSection` in current code, height `1.3 × screenWidth`)
   - Floating back button (top-left, over hero)
   - Floating share button (top-right area, currently no handler)
   - Floating cart icon (top-right corner, navigates to `/cart`, badged)
   - Horizontal paging ScrollView of `media[]`
     - `MediaItem` component renders image or video based on `media.type`
     - Videos autoplay when the slide becomes active, pause when scrolled away
     - Play/pause button overlays video slides
   - "TAP TO ZOOM" pill (bottom-left of hero) — placeholder, no zoom modal yet
   - Heart icon (bottom-right of hero) — **currently unwired**
   - Dot indicators (bottom-center)

2. **Product header** (`productHeader`)
   - Product name (left)
   - "MORE →" link (right) — placeholder, no handler
   - "By <merchant display name>" subtext — **not currently tappable**

3. **Payment options** (`paymentSection`)
   - "Get it now, pay later" title + "3 OPTIONS →" link (no handler)
   - Static body: *"Pay using our credit options, Payflex, PayJustNow, Mobicred or RCS."*

4. **Size selector** (`sizeSection`) — only renders if the product has sizes
   - "Select a size" title + "SIZE INFO →" link (no handler)
   - Size chips, single-select
   - "📏 FIND YOUR FIT →" button (no handler)

5. **More options** (`moreOptionsSection`) — currently a placeholder
   - "More options" title + "2 Options" count
   - Horizontal scroll with a placeholder card: *"Color variants coming soon"*

6. **Shipping** (`shippingSection`)
   - "Shipping" title + "When will I get it? →" link (no handler)
   - 🚚 *FREE Standard delivery on orders over R650. Faster options available.*
   - 🏪 *FREE Collection on orders over R650. Open 7 days a week.*

7. **Returns** (`returnsSection`)
   - "Returns" title
   - *"Free exchange or return within 30 days"*

8. **Similar Items** (`similarSection`)
   - Title + horizontal carousel
   - Tap → navigates to `/product/{id}` for the tapped item

9. **Fixed bottom bar** (`bottomBar`, absolute-positioned)
   - Price (Didot font, large)
   - "🛒 ADD TO CART" button

---

## User actions

| Action | Result |
|---|---|
| Tap back | Pop navigator |
| Tap share | Generate share link `https://yiiva.co.za/products/{id}` + open system share sheet (currently unwired) |
| Tap cart icon (header) | Navigate to `/cart` |
| Swipe hero media | Update `currentMediaIndex`, autoplay incoming video / pause outgoing |
| Tap play/pause on video | Toggle video playback |
| Tap "TAP TO ZOOM" / tap hero image | Open fullscreen zoom modal (TBD — not implemented) |
| Tap heart | Toggle like (optimistic; persisted server-side). Guest → open login modal |
| Tap "MORE →" | Open description modal (TBD) |
| Tap merchant name "By X" | Navigate to `/artist/{username}` (currently unwired) |
| Tap "3 OPTIONS →" | Open BNPL info modal (TBD) |
| Tap a size chip | Set selected size (local state). Required before Add to Cart |
| Tap "SIZE INFO →" | Open size guide (TBD — content source open question) |
| Tap "FIND YOUR FIT →" | Open fit-guide tool (TBD — likely modal flow) |
| Tap a variant swatch | Swap product detail to that variant's data (currently placeholder) |
| Tap "When will I get it? →" | Open shipping ETA modal — requires user's postcode → ShipLogic call (TBD) |
| Tap a similar item | Navigate to `/product/{id}` for that item (pushes new screen) |
| Tap ADD TO CART | Validate size is selected if required → `POST /cart/items` → success toast → cart badge updates |
| Swipe right from screen edge | Pop navigator (gesture handler) |

---

## States

| State | Trigger | UI |
|---|---|---|
| **Loading** | Initial fetch in flight | Skeleton: blank hero with placeholder; skeleton blocks for title / size / shipping; bottom bar disabled |
| **Loaded** | Product data resolved | Full UI |
| **Sold out (whole product)** | `stock.available === false` | Bottom bar shows "SOLD OUT" disabled, size selector disabled, all CTAs except similar items disabled |
| **Sold out (single variant)** | `variants[i].available === false` | That size chip rendered greyed/strikethrough; tapping it shows toast: *"This size is sold out"* |
| **No sizes** | `variants.length === 0` (e.g. accessory) | Size selector section hidden; Add to Cart enabled without size selection |
| **Made to order / preorder** | `inventoryType !== 'in_stock'` | Add to Cart label changes (e.g. "PRE-ORDER · R899.00"); leadTime shown near price |
| **Add-to-cart in flight** | After tap | Bottom-bar button disabled with spinner; on success: brief toast + badge animates |
| **Add-to-cart failed (409 out-of-stock)** | Inventory changed between view and add | Toast: *"Sold out — please choose another size"* + size selector refreshes |
| **Like in flight** | After heart tap | Optimistic flip; revert on 5xx with toast |
| **Guest social action** | Guest taps heart | Open login modal (`/(auth)/login` as modal route) |
| **Error (product fetch failed)** | Network / 404 | Full-screen error with retry CTA; back button still works |
| **Product not found (404)** | Stale link | "This product is no longer available" + CTA to Home |
| **Suspended/deactivated session** | Stale auth | Top-level guard handles — Product Detail never renders for these states |

---

## Prototype-only behavior to deprecate

| Item | Location | Replace with |
|---|---|---|
| `getDummyProductDetail` | `lib/dummy-data.ts` → `[productId].tsx:131` | `useQuery(['product', productId])` against `GET /products/{id}` |
| `DUMMY_CAROUSEL_PRODUCTS` for Similar Items | `[productId].tsx:320` | `useQuery(['product', productId, 'similar'])` against `GET /products/{id}/similar` |
| Heart icon with no handler | `[productId].tsx:199` | Wire to `PUT/DELETE /products/{id}/like` via social-store mutation |
| Merchant name not tappable | `[productId].tsx:225` | Wrap in `<TouchableOpacity onPress={() => router.push(\`/artist/${product.merchant.username}\`)}>` |
| Share icon with no handler | `[productId].tsx:166` | Wire to `Share.share({ url: \`https://yiiva.co.za/products/${id}\` })` |
| "MORE →" link no handler | `[productId].tsx:221` | Open description modal (design TBD) |
| "SIZE INFO →" no handler | `[productId].tsx:244` | Open size guide modal (content source TBD — see open questions) |
| "FIND YOUR FIT →" no handler | `[productId].tsx:264` | TBD — likely modal flow with a few sizing questions |
| "When will I get it? →" no handler | `[productId].tsx:288` | Open shipping ETA modal — requires user postcode + ShipLogic |
| "More options" placeholder | `[productId].tsx:272-282` | Variant swatch UI; swatches drive a re-fetch of the chosen variant's data |
| Floating cart icon is emoji `🛒` | `[productId].tsx:171` | Use `IconSymbol` for visual consistency with the rest of the app |
| `alert()` for cart feedback | `[productId].tsx:154` | Toast / snackbar component instead of native alert |
| Size stored as comma-split string | `[productId].tsx:132` | Replace with `variants[]` from API once §P-7 lands |
| Floating header icons scroll away with hero | `[productId].tsx:161-172` | Decision needed — likely sticky after hero scrolls past a threshold |
