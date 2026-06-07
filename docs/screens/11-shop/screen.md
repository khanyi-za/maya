# YIIVA Mobile — Shop (Screen)

> Screen 11 · Tab: **Shop** (`app/(tabs)/profile.tsx`)
> Endpoints this screen calls → [`api-contract.md`](./api-contract.md)
> Open questions → [`../../open-questions.md`](../../open-questions.md) §Shop

> The tab is labelled "Shop" in the bottom nav but the route file is `profile.tsx` — a historical naming artifact (the route was earlier conceived as a user profile and was repurposed). The Shop tab IS the directory: a toggle between **Brands** (A–Z) and **Categories** (large image cards).

---

## Purpose

The structured-browse surface. Where users go when they know they want to find something but don't yet know what — and want to walk the directory rather than scroll a feed. Two complementary lenses on the same catalogue:

- **Brands** — name-first discovery for users who want a specific label
- **Categories** — type-first discovery (shoes, dresses, accessories) for users who want a particular product type

Both are sourced from the same catalogue; the toggle just changes the access pattern.

---

## Entry points

- **Shop tab** in bottom nav (default icon: shopping bag)
- **"See All" from Home's Trending Brands → currently routes to `/explore`** but logically belongs here — see [open-questions §ST-9](../../open-questions.md#st-9--see-all-trending-brands-destination)
- **SideMenu** has no direct link today — could add per [ST-9](../../open-questions.md#st-9--see-all-trending-brands-destination)
- **Deep links** — `yiivaapp://shop` (default), `yiivaapp://shop?view=brands` or `?view=categories` (TBD)

---

## Visual layout

### Categories view

```
┌───────────────────────────────────────────┐
│  ☰         [ YIIVA logo ]         🔔  🛒 │  ← A   YiivaHeader
│                                    ●    ● │       (badges)
├───────────────────────────────────────────┤
│      Women    Men    Home & Lifestyle     │  ← B   FeedTabs
│      ─────                                 │
├───────────────────────────────────────────┤
│   ┌──Brands──┬─Categories(sel)─┐          │  ← C   View toggle
│   └──────────┴─────────────────┘          │
├───────────────────────────────────────────┤
│   ┌──────────────────────────────────┐    │
│   │   SHOES                     🥿   │    │
│   └──────────────────────────────────┘    │
│   ┌──────────────────────────────────┐    │
│   │   TOPS                      👕   │    │  ← D   Category cards
│   └──────────────────────────────────┘    │       (large rectangular tiles
│   ┌──────────────────────────────────┐    │        with right-aligned img)
│   │   BEAUTY                    💄   │    │
│   └──────────────────────────────────┘    │
│              ⋮                              │
│   ┌──────────────────────────────────┐    │
│   │   SWIMWEAR                  👙   │    │
│   └──────────────────────────────────┘    │
└───────────────────────────────────────────┘
```

### Brands view

```
┌───────────────────────────────────────────┐
│  ☰         [ YIIVA logo ]         🔔  🛒 │  ← A   YiivaHeader
├───────────────────────────────────────────┤
│      Women    Men    Home & Lifestyle     │  ← B   FeedTabs
├───────────────────────────────────────────┤
│   ┌──Brands(sel)──┬─Categories─┐          │  ← C   View toggle
│   └───────────────┴────────────┘          │
├───────────────────────────────────────────┤
│ A │  ─── A ──────────────────────────     │
│ B │   ◯  Alora Men                  >    │
│ C │   ◯  Alora women                >    │  ← E   Brand list
│ D │   ◯  Amanda Laird Cherry         >    │       (alphabetical groups,
│ E │   ◯  ArtClub & friends           >    │        circular logo per row)
│ . │  ─── B ──────────────────────────     │
│ . │   ◯  Ben Sherman SA              >    │
│ . │   ◯  Black Monarchy              >    │       ← F   Alphabet index
│ Z │              ⋮                          │       (left-side, 1-char per
│   │                                          │        letter, tappable)
└───────────────────────────────────────────┘
```

### Empty state (Home & Lifestyle, Categories view)

```
┌───────────────────────────────────────────┐
│  ☰         [ YIIVA logo ]         🔔  🛒 │
├───────────────────────────────────────────┤
│      Women    Men    Home & Lifestyle(sel)│
├───────────────────────────────────────────┤
│   ┌──Brands──┬─Categories(sel)─┐          │
│   └──────────┴─────────────────┘          │
├───────────────────────────────────────────┤
│                                            │
│           [ 🛍 large ]                    │
│                                            │
│         Coming soon                        │  ← Empty state
│                                            │
│   Home & Lifestyle categories are on       │
│   the way                                  │
│                                            │
└───────────────────────────────────────────┘
```

### Section → data-source key

| § | Section | Data source |
|---|---|---|
| **A** | YiivaHeader | Same as Home — bell badge ← notifications, cart badge ← cart summary |
| **B** | FeedTabs | Local `FilterContext`. Tab change refetches D, E |
| **C** | View toggle | Local UI state; persisted to AsyncStorage |
| **D** | Category cards | `GET /categories?genderType=<current>` — large tiles, one per category |
| **E** | Brand list | `GET /merchants?genderType=<current>` — alphabetical groups |
| **F** | Alphabet index | Derived from `E` data — letters present in result set |

### Scroll & sticky behaviour

- **Vertical scroll** on D and E.
- **YiivaHeader (A), FeedTabs (B), and view toggle (C)** are NOT sticky in current code — they scroll with content. Worth flagging as a design call ([ST-1](../../open-questions.md#st-1--sticky-controls)).
- **Alphabet index (F)** in Brands view is positioned alongside the list — tapping a letter scrolls the list to that letter section.
- **No horizontal scroll** on this screen.

---

## Layout (top to bottom)

### Header
- `YiivaHeader` (consistent with Home, Search, Explore)

### FeedTabs
- Three tabs: Women · Men · Home & Lifestyle
- Drives both views — different category sets per gender; different brand subset per gender (only brands with products in that gender)

### View toggle
- Segmented control: "Brands" · "Categories"
- Default: **Brands** (current code defaults to Brands; see [ST-4](../../open-questions.md#st-4--default-view-mode-brands-or-categories))
- Tap to switch; persist user's choice

### Categories view
- Vertical list of large category cards (one per row, full-width)
- Each card: title (large, left), thumbnail image (right)
- Tap → navigate to category listing screen (TBD route — `/category/{slug}` proposed)

### Brands view
- Two-column layout:
  - **Left column** — narrow alphabet index strip (A, B, C, …, Z) — tap a letter to scroll the right column to that letter section
  - **Right column** — scrollable list of brands grouped by first letter
- Each letter section has a header strip ("A", "B", etc.)
- Each brand row: circular logo + display name + chevron-right
- Tap a row → `/artist/{username}`

---

## User actions

| Action | Result |
|---|---|
| Tap hamburger | Open SideMenu |
| Tap cart icon | Navigate to `/cart` |
| Tap notifications bell | Open notifications screen (TBD) |
| Tap a FeedTabs option | Update `FilterContext`, refetch D + E |
| Tap "Brands" toggle | Switch to Brands view |
| Tap "Categories" toggle | Switch to Categories view |
| Tap a category card | Navigate to `/category/{slug}` (TBD listing screen) |
| Tap a brand row | Navigate to `/artist/{username}` |
| Tap an alphabet index letter | Scroll the brand list to that letter section |
| Pull to refresh | Refetch categories + brands |
| Scroll to bottom (brands) | Load next page (cursor pagination if needed) |

---

## States

| State | Trigger | UI |
|---|---|---|
| **Loading (first paint)** | Initial fetch in flight | Skeleton in active view |
| **Categories view** | Toggle = Categories AND list resolved | Vertical card list |
| **Brands view** | Toggle = Brands AND list resolved | Two-column alphabet + list |
| **Empty (Home & Lifestyle)** | No categories returned for this gender | "Coming soon" placeholder |
| **Empty (brands)** | No brands match the gender filter | "No brands yet for this category" placeholder |
| **Error** | Network / 5xx | Toast + retry; cached data stays visible |
| **Filter change** | Tab change in B | Refetch with new gender; show loading state briefly |
| **Pull-to-refresh** | User pulls | Refetch; existing data stays during fetch |
| **Authenticated** | Signed in | Cart + notification badges work |
| **Guest** | No session | Notification badge hidden; cart badge still works (guest cart session) |

---

## Prototype-only behavior to deprecate

| Item | Location | Replace with |
|---|---|---|
| Hard-coded `womenCategories` array | `profile.tsx:23-34` | `GET /categories?genderType=women` |
| Hard-coded `menCategories` array | `profile.tsx:36-47` | `GET /categories?genderType=men` |
| Home & Lifestyle has empty categories returned (`return []`) | `profile.tsx:128` | Decide: either define the Home & Lifestyle taxonomy ([P-4](../../open-questions.md#p-4--home--lifestyle-gender-taxonomy)) or hide the tab when no content exists |
| Hard-coded `allBrands` array of 37 brands with broken image paths | `profile.tsx:51-87` | `GET /merchants?genderType=<current>&limit=100&cursor=…` |
| **Most brand entries use a misspelled path with a leading space** (`' masonwabe_profile_pic.png'`) — silently fails to render | `profile.tsx:58-87` | Absolute CDN URLs from API |
| Brand tap is `console.log` only | `profile.tsx:132-134` | `router.push('/artist/' + brand.username)` |
| Category tap is `console.log` only | `profile.tsx:120-122` | `router.push('/category/' + category.slug)` — TBD listing screen exists |
| Alphabet index letters are not interactive | `profile.tsx:226-232` | Wire to scroll the list to the corresponding letter section using a `ScrollView` ref + measured offsets |
| `handleCartPress` is `console.log` (DIFFERENT from Home where it routes to /cart) | `profile.tsx:99-102` | Wire to `router.push('/cart')` |
| `handleNotificationsPress` is `console.log` | `profile.tsx:104-107` | Navigate to `/notifications` |
| Hard-coded `userName="Khanyisomthamo2"` in SideMenu | `profile.tsx:158` | `useAuthStore().state.user?.firstName` |
| View toggle (Brands ↔ Categories) is not persisted | `profile.tsx:92` `useState<...>('brands')` | Persist to AsyncStorage so the user's choice survives sessions |
| Brand directory not paginated | — | Add `useInfiniteQuery` with cursor; 37 brands today, but real catalogue will grow |
| No search within brands | — | Add a search input at top of Brands view per [ST-2](../../open-questions.md#st-2--search-within-brands) |
| File is named `profile.tsx` but route is "Shop" | route config | Rename to `shop.tsx` in a future refactor (consistent with the tab label and route purpose) |
