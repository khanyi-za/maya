# YIIVA Mobile — Explore (Screen)

> Screen 10 · Route: `/(tabs)/explore` (`app/(tabs)/explore.tsx`)
> Endpoints this screen calls → [`api-contract.md`](./api-contract.md)
> Open questions → [`../../open-questions.md`](../../open-questions.md) §Explore

> ⚠️ **This is the screen with the least clear product purpose today.** The tab is hidden from the bottom nav (`href: null` in `(tabs)/_layout.tsx:47`); reached only via "See All" CTAs from Home. The implementation surfaces Trending Brands + a CategoryFilter + a "For You" products grid — but every section overlaps with what Home already does. **A product owner decision is needed before this screen can scale (see open-questions §EX-1).** This doc captures what's there and flags the strategic gap.

---

## Purpose (current implementation)

A secondary discovery surface. Surfaces trending brands and a curated "For You" product grid with like-count badges. Less feed-driven than Home, more grid-driven.

## Purpose (intended, per about doc)

The editorial / curatorial surface — the place to find brands you wouldn't have encountered otherwise. Magazine-style layout combining featured content (brand stories, reels), curated collections, and discovery prompts. Today's implementation is a structural placeholder; the editorial layer is the missing half.

---

## Entry points

- **"See All" from Home's New Arrivals carousel** → currently routes to `/explore`
- **"See All" from Home's Trending Brands carousel** → currently routes to `/explore`
- **Deep link** — `yiivaapp://explore`
- **NOT in the bottom tab bar** — `href: null` hides it (per `(tabs)/_layout.tsx:47`)

---

## Visual layout

```
┌───────────────────────────────────────────┐
│  ☰         [ YIIVA logo ]         🔔  🛒 │  ← A   YiivaHeader
│                                    ●    ● │       (badges)
├───────────────────────────────────────────┤
│      Women    Men    Home & Lifestyle     │  ← B   FeedTabs
│      ─────                                 │
├───────────────────────────────────────────┤
│   [Featured Collections section            │
│    is COMMENTED OUT in current code]      │  ← C   Collections
│                                            │       (currently disabled)
├───────────────────────────────────────────┤
│   Trending Brands             See All →   │
│    ╭───╮   ╭───╮   ╭───╮   ╭───╮   →      │  ← D   Trending Brands
│    │ ◯ │   │ ◯ │   │ ◯ │   │ ◯ │          │       horizontal carousel
│    ╰───╯   ╰───╯   ╰───╯   ╰───╯          │
│    Name    Name    Name    Name            │
│   [Follow][✓Following][Follow][Follow]     │
├───────────────────────────────────────────┤
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐  →              │  ← E   CategoryFilter
│  │🥿│ │👕│ │💄│ │👗│ │👖│                 │       horizontal scroll
├───────────────────────────────────────────┤
│   For You                                  │
│   ┌──────────────┐  ┌──────────────┐      │
│   │     IMG      │  │     IMG      │      │
│   │              │  │              │      │  ← F   "For You" grid
│   │ ◯ Merchant   │  │ ◯ Merchant   │      │       2-column products
│   │ Product Name │  │ Product Name │      │       with like counts
│   │ R899   ❤ 234 │  │ R650   ❤ 1.2K│      │
│   └──────────────┘  └──────────────┘      │
│              ⋮                              │
└───────────────────────────────────────────┘
```

### Section → data-source key

| § | Section | Data source |
|---|---|---|
| **A** | YiivaHeader | Same as Home — bell badge ← notifications, cart badge ← cart summary |
| **B** | FeedTabs | Local `FilterContext`. Tab change refetches D, E, F |
| **C** | Featured Collections | **Currently commented out.** When enabled, → `GET /collections` 🔴 |
| **D** | Trending Brands | `GET /merchants/trending` — same as Home |
| **E** | CategoryFilter | `GET /categories?genderType=<current>` — same as Home |
| **F** | "For You" products grid | `GET /products/featured` (today) — or a personalised endpoint once "For You" actually means *for you* |

### Scroll & sticky behaviour

- **Vertical scroll** on the whole content.
- **YiivaHeader (A) and FeedTabs (B)** are NOT sticky — same as Home.
- **D and E** scroll horizontally.

---

## Layout (top to bottom)

1. **YiivaHeader** (same component as Home)
2. **FeedTabs** (same component as Home — Women / Men / Home & Lifestyle)
3. **Featured Collections** (currently commented out — see Open Questions §EX-2)
4. **Trending Brands carousel** — horizontal scroll of circular merchant cards with Follow buttons (mirrors Home's Trending Brands section)
5. **CategoryFilter** — horizontal chips (mirrors Home's chip rail; placement is between sections rather than at the top)
6. **"For You" products grid** — 2-column grid of product cards with merchant header (logo + name), title, price, and like count badge (`❤ N` / `❤ 1.2K`)

---

## User actions

| Action | Result |
|---|---|
| Tap hamburger | Open SideMenu |
| Tap cart icon | Navigate to `/cart` |
| Tap notifications bell | Open notifications screen (TBD) |
| Tap a FeedTabs option | Refetch D, E, F with new gender filter |
| Tap a Trending Brand | Navigate to `/artist/{username}` |
| Tap Follow on a Trending Brand | Toggle follow (optimistic + API) |
| Tap "See All" on Trending Brands | **No handler currently** — TBD what this opens (a full brands directory?) |
| Tap a CategoryFilter chip | TBD — currently `console.log` (see Open Questions §EX-6) |
| Tap a "For You" product card | Navigate to `/product/{productId}` |
| (If collections enabled) Tap a Collection card | Navigate to `/collections/{id}` — TBD screen |
| Pull to refresh | Refetch D, E, F |
| Scroll to bottom of products grid | Load next page (currently not paginated) |

---

## States

| State | Trigger | UI |
|---|---|---|
| **Loading** | First fetch in flight | Skeleton sections |
| **Loaded** | All fetches resolved | Standard layout |
| **Empty Trending Brands** | API returns 0 merchants | Hide section entirely |
| **Empty "For You"** | API returns 0 products | Empty state with category-browse prompt |
| **Error** | Network / 5xx | Inline retry pills per section (Trending or For You can fail independently) |
| **Authenticated** | Signed in | Follow buttons + like counts work; "For You" could become personalised |
| **Guest** | No session | Follow prompts login; "For You" defaults to globally trending |
| **Collections enabled** | If [EX-2](../../open-questions.md#ex-2--collections-revive-drop-or-rethink) is shipped | Collections carousel appears between FeedTabs and Trending Brands |

---

## Prototype-only behavior to deprecate

| Item | Location | Replace with |
|---|---|---|
| Static `merchants`, `trendingProducts`, `collections` arrays | `explore.tsx:64-151` | `useQuery` calls against the real endpoints |
| Hard-coded `loading = false` / `error = null` flags | `explore.tsx:153-158` | TanStack Query's `isLoading` / `error` from the actual hooks |
| Featured Collections section commented out | `explore.tsx:223-273` | Either ship the Collections feature (and uncomment + wire) or delete the dead code (per [EX-2](../../open-questions.md#ex-2--collections-revive-drop-or-rethink)) |
| `getLocalAsset` fixture resolution | `explore.tsx:249, 307, 372, 380` | Absolute CDN URLs from API |
| "For You" labelled but actually trending | `explore.tsx:352` | Either personalise (see [EX-3](../../open-questions.md#ex-3--for-you-personalised-or-trending)) or relabel ("Trending Now") |
| `handleCollectionPress` orphan handler | `explore.tsx:180-183` | Remove unless Collections is revived |
| `handleVideoLike` / `handleVideoArtistPress` orphan handlers | `explore.tsx:197-203` | Remove or wire to actual video sections (per [EX-4](../../open-questions.md#ex-4--brand-story-video-reels)) |
| `handleCategoryChange` is `console.log` only | `explore.tsx:176-178` | Wire to filter "For You" products by category, or navigate to a listing screen |
| "See All" on Trending Brands has no handler | `explore.tsx:279-281` | Wire to navigate to a brands directory screen |
| Hard-coded `userName="Khanyisomthamo2"` in SideMenu | `explore.tsx:211` | `useAuthStore().state.user?.firstName` |
| `console.log` notifications handler | `explore.tsx:168-170` | Navigate to `/notifications` |
| `console.log` feed-tab handler | `explore.tsx:172-174` | Already covered by `FilterContext`; remove placeholder |
| Products grid not paginated | `explore.tsx:363-407` | Add `useInfiniteQuery` with cursor pagination |
| Like count badges on product cards (unique to this screen) | `explore.tsx:393-402` | Confirm intentional — see [EX-7](../../open-questions.md#ex-7--like-counts-on-product-cards) |
