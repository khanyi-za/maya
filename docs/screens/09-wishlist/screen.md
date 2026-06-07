# YIIVA Mobile — Wishlist (Screen)

> Screen 09 · Tab: **Wishlist** (`app/(tabs)/bookmarks.tsx`)
> Endpoints this screen calls → [`api-contract.md`](./api-contract.md)
> Open questions → [`../../open-questions.md`](../../open-questions.md) §Wishlist · §Social

---

## Purpose

The buyer's saved-for-later surface. Where a user goes to revisit products they marked with the bookmark icon — typically while comparison shopping, waiting for payday, or deciding on a gift. The buyer expects this list to be reliable across devices and sessions; losing it kills trust.

For the YIIVA commercial model, Wishlist is also the highest-intent re-engagement surface: users who bookmark are highly likely to buy. Surfacing changes in saved items (price drops, low stock, restocks) is a future v2 lever.

---

## Entry points

- **Wishlist tab** in bottom nav
- **SideMenu** → "Wishlist" → `/(tabs)/bookmarks`
- **Cart screen's empty state** does NOT route here today, but could ("Save things for later") — flagged

---

## Visual layout

### List view (with items)

```
┌───────────────────────────────────────────┐
│  Wishlist                          [⊞]   │  ← A   Header
│                                            │       title + view toggle
├───────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐ │
│  │      IMG                              │ │
│  │              💗  🔖                   │ │
│  │  ◯ Merchant                           │ │  ← B   List view item
│  │  Product Title                        │ │       (full ProductCard
│  │  R899.00                              │ │        + saved-at meta)
│  │  Saved 2 days ago                     │ │
│  └──────────────────────────────────────┘ │
│  ⋮ more items ⋮                            │
└───────────────────────────────────────────┘
```

### Grid view (toggle)

```
┌───────────────────────────────────────────┐
│  Wishlist                          [☰]   │
├───────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐                  │
│  │   IMG   │  │   IMG   │                  │
│  │ taller  │  │         │                  │  ← C   Grid view
│  │         │  └─────────┘                  │       (MasonryGrid 2-col,
│  │         │  ┌─────────┐                  │        variable heights)
│  └─────────┘  │   IMG   │                  │
│  ┌─────────┐  │  taller │                  │
│  │   IMG   │  │         │                  │
│  └─────────┘  └─────────┘                  │
│  ⋮                                          │
└───────────────────────────────────────────┘
```

### Empty state

```
┌───────────────────────────────────────────┐
│  Wishlist                          [⊞]   │
├───────────────────────────────────────────┤
│                                            │
│                                            │
│             [ 🔖 large ]                  │
│                                            │
│         No bookmarks yet                   │  ← Empty state
│                                            │
│   Save products you love by tapping the    │
│   bookmark icon                            │
│                                            │
│     ┌─────────────────────────┐            │
│     │  Browse YIIVA           │            │
│     └─────────────────────────┘            │
│                                            │
└───────────────────────────────────────────┘
```

### Section → data-source key

| § | Section | Data source |
|---|---|---|
| **A** | Header | Static title. View toggle is local UI state — persisted to AsyncStorage so user's preferred mode survives sessions |
| **B** | List view item | `GET /me/bookmarks` — each row is a Product + the `bookmarkedAt` timestamp |
| **C** | Grid view tiles | Same data, different layout. Heights derived from image aspect ratio (NOT random as in current code) |
| Empty | Empty state | Shown when `data.bookmarks.length === 0` |

### Scroll & sticky behaviour

- **Vertical scroll** on the whole content.
- **Header (A) is sticky** at the top.
- **No bottom action bar.**
- **Pull-to-refresh** refetches the bookmarks list.

---

## Layout (top to bottom)

### Header
- "Wishlist" title (left, large bold)
- View toggle (right): squares-grid icon when in list mode (tap → switch to grid), list-bullet icon when in grid mode (tap → switch to list)

### List view (one of two)
- Full-width ProductCard per row (same component as Home grid cards)
- Below the card: "Saved <relative time>" meta line
- Tapping the card → `/product/{productId}`
- Tapping the bookmark icon → un-bookmark (removes from this list with optimistic animation)
- Tapping the heart → toggle like (independent of bookmark)
- Tapping the merchant → `/artist/{username}`

### Grid view
- MasonryGrid component (2 columns, variable item heights)
- Heights derived from image aspect ratio — NOT random as in current code
- Tap a tile → `/product/{productId}` (currently `console.log`)

### Empty state
- Bookmark icon (64px, light grey)
- "No bookmarks yet" heading
- Body copy
- "Browse YIIVA" CTA → `/(tabs)` (Home)

---

## User actions

| Action | Result |
|---|---|
| Tap view toggle | Switch list ↔ grid; persist mode to AsyncStorage |
| Tap product card / tile | Navigate to `/product/{productId}` |
| Tap bookmark icon on card | `DELETE /products/{id}/bookmark` — optimistic removal with Undo toast (5s) |
| Tap heart on card | Toggle like (optimistic + API) |
| Tap merchant name | Navigate to `/artist/{username}` |
| Long-press a tile (TBD) | Open contextual menu: "Remove" / "Add to Cart" / "Share" |
| Pull to refresh | Refetch `GET /me/bookmarks` (revalidates availability, prices) |
| Scroll to bottom | Load next page (infinite scroll — wishlist may be long) |
| Tap "Browse YIIVA" (empty state) | Navigate to `/(tabs)` (Home) |

---

## States

| State | Trigger | UI |
|---|---|---|
| **Loading** | First fetch in flight | Skeleton in current view mode |
| **List view** | `viewMode === 'list'` | Vertical ProductCard list |
| **Grid view** | `viewMode === 'grid'` | MasonryGrid layout |
| **Empty** | `bookmarks.length === 0` | Empty state with Browse YIIVA CTA |
| **Authenticated** | Signed in | List reflects server-backed bookmarks |
| **Guest** | No session | List reflects locally-stored bookmarks (AsyncStorage). On sign-in, sync to server (per [WL-12](../../open-questions.md#wl-12--guest-bookmarks)) |
| **Unavailable item** | A bookmarked product is sold out / unpublished | Render with strikethrough name + "Unavailable" badge; bookmark remains until user removes (or auto-removed if product is hard-deleted) |
| **Price drift detected** | `currentPrice !== priceAtBookmark` | Optional v2: badge "Price dropped: was R1,100, now R899" |
| **Network error** | 5xx / offline | Toast + retry; cached list stays visible if present |
| **Bookmark in flight (removal)** | After tap | Optimistic fade-out; Undo toast appears for 5s |

---

## Prototype-only behavior to deprecate

| Item | Location | Replace with |
|---|---|---|
| Hard-coded `bookmarkedItems` array — completely disconnected from `social-store.ts` | `bookmarks.tsx:19-44` | `useQuery` against `GET /me/bookmarks` |
| Image paths reference `assets/mock-data/tol-thema/` — may not exist in repo | `bookmarks.tsx:22, 30, 38` | Absolute CDN URLs from API |
| `bookmarkedAt` stored as a string ("2 days ago") | `bookmarks.tsx:26, 34, 42` | ISO timestamp from API; mobile formats relative time at display |
| `handleBookmarkRemove` is `console.log` only — doesn't update the store or call the API | `bookmarks.tsx:49-52` | Mutation calling `DELETE /products/{id}/bookmark` + Undo toast |
| `handleLike` is `console.log` only | `bookmarks.tsx:54-57` | Mutation calling `PUT/DELETE /products/{id}/like` |
| MasonryGrid item tap is `console.log` | `bookmarks.tsx:135` | `router.push('/product/{id}')` |
| `MasonryGrid` heights are `Math.random()` — chaos every render | `bookmarks.tsx:133` | Compute heights from product image aspect ratio |
| Header doesn't use `YiivaHeader` — inconsistent with Home/Search | `bookmarks.tsx:78-90` | Decide consistency — see [WL-10](../../open-questions.md#wl-10--header-design) |
| `paddingTop: 60` hard-coded instead of safe-area | `bookmarks.tsx:158` | Use `useSafeAreaInsets().top + 16` |
| No empty-state CTA | `bookmarks.tsx:64-72` | Add "Browse YIIVA" button → `/(tabs)` |
| No sort or filter | — | Add basic sort dropdown (Newest saved / Price asc / Price desc / Brand) per [WL-3](../../open-questions.md#wl-3--sort-order) |
| No "Add to Cart" affordance from wishlist | — | Add Move-to-Cart per [WL-4](../../open-questions.md#wl-4--move-to-cart-affordance) |
| No view-mode persistence | `bookmarks.tsx:47` | Persist `viewMode` to AsyncStorage so it survives sessions |
| No pagination | — | Wishlists can grow long; add `useInfiniteQuery` |
| No undo on remove | `bookmarks.tsx:49-52` | 5-second Undo toast, consistent with Cart's CT-3 |
