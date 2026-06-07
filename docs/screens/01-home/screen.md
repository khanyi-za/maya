# YIIVA Mobile — Home Feed (Screen)

> Screen 01 · Tab: **Home** (`app/(tabs)/index.tsx`)
> Endpoints this screen calls → [`api-contract.md`](./api-contract.md) (manifest pointing to canonical specs in [`../../api/`](../../api/))
> Open questions → [`../../open-questions.md`](../../open-questions.md) §Cross-cutting · §Products · §Merchants · §Categories · §Home

---

## Purpose

The default landing tab. Surfaces the buyer to a gender-filtered visual feed of products from South African creative brands, interleaved with discovery carousels (New Arrivals) and a curated brand spotlight (Trending Brands). The intent is to feel like scrolling a curated feed of local creativity, not searching a catalogue — every product card is a one-tap entry to purchase.

This is the screen that anchors the YIIVA buyer's daily-use case: *"show me what's new from brands I'd love."*

---

## Entry points

- **App cold start** — `/` redirects to `/(tabs)/` which lands here
- **Tapping the Home tab** from anywhere in the bottom nav
- **"Continue Shopping" CTA** on the empty-cart screen
- **"See All" CTAs** from other screens that route back to Home

---

## Visual layout

ASCII wireframe of the screen in its default state (Women tab, signed-in buyer with cart + unread notifications). Each lettered section maps to the endpoint that feeds it in the key below the diagram.

```
┌───────────────────────────────────────────┐
│  ☰       [ Y I I V A ]           🔔  🛒  │  ← A  YiivaHeader
│                                   ●    ●  │       (badges)
├───────────────────────────────────────────┤
│      Women    Men    Home & Lifestyle     │  ← B  FeedTabs
│      ─────                                 │
├───────────────────────────────────────────┤
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐  →         │  ← C  CategoryFilter
│  │🥿│ │👕│ │💄│ │👗│ │👖│ │💍│            │       horizontal scroll
│  Shoes Tops Beauty Dress Bottm Acce        │
├───────────────────────────────────────────┤
│   ┌──────────────┐  ┌──────────────┐      │
│   │     IMG      │  │     IMG      │      │
│   │          💗🔖│  │          💗🔖│      │  ← D  Product grid
│   │ ◯ merchant   │  │ ◯ merchant   │      │       rows 1–3
│   │ Product Name │  │ Product Name │      │       (6 products,
│   │ R899.00      │  │ R650.00      │      │        2 columns)
│   └──────────────┘  └──────────────┘      │
│            ⋮ rows 2–3 ⋮                    │
├───────────────────────────────────────────┤
│   New Arrivals              See All  →    │
│   ┌────┐ ┌────┐ ┌────┐ ┌────┐   →         │  ← E  New Arrivals
│   │ IMG│ │ IMG│ │ IMG│ │ IMG│             │       horizontal carousel
│   │R590│ │R890│ │R450│ │R720│             │       (~6 items)
│   └────┘ └────┘ └────┘ └────┘             │
├───────────────────────────────────────────┤
│   ┌──────────────┐  ┌──────────────┐      │  ← F  Product grid
│   │     ...      │  │     ...      │      │       rows 4–6
│   └──────────────┘  └──────────────┘      │       (6 products)
├───────────────────────────────────────────┤
│   Trending Brands           See All  →    │
│    ╭───╮     ╭───╮     ╭───╮     →        │  ← G  Trending Brands
│    │ ◯ │     │ ◯ │     │ ◯ │              │       horizontal carousel
│    ╰───╯     ╰───╯     ╰───╯              │       (circular logos
│   Tol'thema  SUHU    Sakhanya              │        + Follow button)
│   [Follow] [✓ Following] [Follow]          │
├───────────────────────────────────────────┤
│   ┌──────────────┐  ┌──────────────┐      │  ← H  Remaining grid
│   │     ...      │  │     ...      │      │       (infinite scroll)
│   └──────────────┘  └──────────────┘      │
│            ⟳  Loading more...              │
├═══════════════════════════════════════════┤
│    🏠      🛍       🔍       🛒      🔖    │  ← I  Bottom tab bar
│   Home    Shop   Search    Cart   Wishlist │       (system, every tab)
└───────────────────────────────────────────┘
```

### Section → data-source key

| § | Section | Data source |
|---|---|---|
| **A** | YiivaHeader | Bell badge ← `GET /notifications/unread-count` · Cart badge ← `GET /cart/summary` |
| **B** | FeedTabs | Local `FilterContext` state. Tab change triggers refetch of **C, D, E, F, G, H** |
| **C** | CategoryFilter | `GET /categories?genderType=<current>` |
| **D** | Product grid rows 1–3 | `GET /products/feed` page 1 (sliced 0–5) |
| **E** | New Arrivals carousel | `GET /products/new-arrivals` |
| **F** | Product grid rows 4–6 | Same `/products/feed` page 1 response, sliced 6–11. **No second API call** |
| **G** | Trending Brands | `GET /merchants/trending` |
| **H** | Remaining grid (infinite) | `GET /products/feed` with cursor, paginates as the user scrolls |
| **I** | Bottom tab bar | System — not Home-specific |

### Scroll & sticky behaviour

- **Vertical scroll** on the whole content area (D through H). The header (A), FeedTabs (B), and tab bar (I) **do not stick** in the current implementation — they scroll away with the content. Open question for design: should the header / FeedTabs become sticky?
- **Horizontal scroll** on C, E, and G.
- **D, F, H** read visually as one continuous feed interleaved with the E and G carousels — but D and F are slices of the same page-1 response (no extra call), and H starts a new paginated fetch only when the user reaches the end of F.

---

## Layout (top to bottom)

1. **YiivaHeader** (`components/YiivaHeader.tsx`)
   - Hamburger icon → opens `SideMenu`
   - YIIVA logo (centered)
   - Notifications bell with unread badge → opens notifications screen (TBD)
   - Cart icon with item-count badge → opens `/cart`

2. **FeedTabs** (`components/FeedTabs.tsx`)
   - Three tabs: **Women** · **Men** · **Home & Lifestyle**
   - Selection writes to global `FilterContext` (`contexts/FilterContext.tsx`)
   - Drives every query on this page — selection change triggers refetch of feed + new arrivals + trending brands
   - Default: `Women`

3. **CategoryFilter** (`components/CategoryFilter.tsx`)
   - Horizontal scroll of category chips with image thumbnails
   - Set varies per gender tab (sourced from `/categories?genderType=<gender>`)
   - Tapping a chip filters the feed below by `category`

4. **Product grid — rows 1–3** (6 products, 2-column)
   - Each card via `ProductCard`: product image, merchant logo + display name, product title, price (Didot font), heart, bookmark

5. **New Arrivals carousel** (`components/RowProductList.tsx`)
   - Section title + "See All" link
   - Horizontal scroll of ~6 product cards (same gender filter)

6. **Product grid — rows 4–6** (next 6 products)

7. **Trending Brands carousel** (inline section)
   - Section title + "See All" → `/explore`
   - Horizontal scroll of brand cards (logo + display name + Follow/Following button)
   - Tapping the brand → `/artist/[username]`

8. **Product grid — remaining** (paginates, infinite scroll)

---

## User actions

| Action | Result |
|---|---|
| Tap product card | Navigate to `/product/[productId]` |
| Tap heart on product card | Toggle like (optimistic; server-side persisted) |
| Tap bookmark on product card | Toggle wishlist (optimistic; server-side persisted) |
| Tap merchant name/logo on product card | Navigate to `/artist/[username]` |
| Tap brand in Trending Brands | Navigate to `/artist/[username]` |
| Tap Follow on a Trending Brand | Toggle follow (optimistic) |
| Tap "See All" on New Arrivals | Navigate to a "New Arrivals" listing screen (TBD route) |
| Tap "See All" on Trending Brands | Navigate to `/explore` |
| Tap a FeedTabs option | Update `FilterContext`, refetch all three sections |
| Tap a CategoryFilter chip | Filter feed by category |
| Tap hamburger | Open `SideMenu` |
| Tap cart icon in header | Navigate to `/cart` |
| Tap notifications bell | Open notifications screen |
| Pull to refresh | Refetch feed + carousels |
| Scroll to bottom of feed | Load next page (infinite scroll) |

---

## States

| State | Trigger | UI |
|---|---|---|
| **Loading (first paint)** | Initial fetch in flight | Skeleton grid (2-col placeholders) + skeleton carousels; no spinner overlay |
| **Loading (refetch)** | Pull-to-refresh, tab change, category change | Inline activity indicator below header; existing data stays visible |
| **Empty** | API returns 0 products for selected gender/category | Centered message: *"Nothing here yet — try another category."* + CTA "Back to Women" |
| **Error** | Network / 5xx | Toast with retry CTA. Last cached page stays visible if present. |
| **Authenticated buyer** | User signed in | Like/bookmark/follow reflect server state; mutations call API; cart/notification badges visible |
| **Guest** | No session | Like/bookmark/follow buttons present but tapping opens login modal |
| **Suspended/deactivated** | Stale session | Top-level guard routes to takeover screen — Home never renders for these states |

---

## Prototype-only behavior to deprecate

| Item | Location | Replace with |
|---|---|---|
| `DUMMY_FEED_PRODUCTS` | `lib/dummy-data.ts` → `index.tsx:82` | `useQuery` against `GET /products/feed` |
| `DUMMY_CAROUSEL_PRODUCTS` (New Arrivals) | `index.tsx:131` | `useQuery` against `GET /products/new-arrivals` |
| Hard-coded `trendingBrands` array | `index.tsx:32-45` | `useQuery` against `GET /merchants/trending` |
| Local-only `social-store.ts` | `lib/social-store.ts` | Server-backed mutations; local store becomes optimistic cache, not source of truth |
| Hard-coded category lists | `app/(tabs)/profile.tsx:23-47` (also affects Home's CategoryFilter) | `GET /categories?genderType=...` |
| `console.log` notifications handler | `index.tsx:49` | Navigate to `/notifications` |
| `console.log` feed-tab handler | `index.tsx:53` | Already covered by `FilterContext` — remove placeholder |
| Hard-coded `userName="Khanyisomthamo2"` passed to SideMenu | `index.tsx:64` | `useAuthStore().state.user?.firstName` |
