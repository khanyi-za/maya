# YIIVA Mobile — Search (Screen)

> Screen 07 · Tab: **Search** (`app/(tabs)/search.tsx`)
> Endpoints this screen calls → [`api-contract.md`](./api-contract.md)
> Open questions → [`../../open-questions.md`](../../open-questions.md) §Search

---

## Purpose

The directed-discovery surface. Home is browse; Search is for users who already know what they're looking for — a category, a brand, a vibe ("kimono", "streetwear", "minimal art"). Surfaces trending tags + recent personal searches to remove the blank-page problem.

This is the second-most-used discovery surface after Home, and the primary way users find brands by name once they've heard of YIIVA in the wild.

---

## Entry points

- **Search tab** from bottom nav
- **Tap a Trending tag** on Search itself → re-fires search with the tag
- **Tap a recent search** → re-fires with that query
- **Deep link** — `yiivaapp://search?q=kimono` for share / shortcut entry

---

## Visual layout

### Initial state (not focused, no query)

```
┌───────────────────────────────────────────┐
│  ☰   [🔍 Search artists, products…]      │  ← A   Search header
├───────────────────────────────────────────┤
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐  →             │  ← B   CategoryFilter
│  │🥿│ │👕│ │💄│ │👗│ │👖│                │       (h-scroll)
├───────────────────────────────────────────┤
│                                            │
│                                            │
│              [ 🔍 large ]                  │
│                                            │
│         Search for products                │  ← C   Placeholder
│                                            │
│    Search by product name, category,       │
│    or brand name                           │
│                                            │
└───────────────────────────────────────────┘
```

### Focused, no query

```
┌───────────────────────────────────────────┐
│  ☰   [🔍 |_________________]     ✕       │  ← A   Search header (active)
├───────────────────────────────────────────┤
│  Recent Searches                           │
│  🕐  Abstract Art                   ✕     │
│  🕐  Handmade Rugs                  ✕     │  ← D   Recent searches
│  🕐  Urban Style                    ✕     │       (per-row clear)
│  🕐  Local Artists                  ✕     │
│                                            │
│  Trending                                  │
│  ┌──────────────────────────────────────┐ │
│  │ #HandmadeArt  #LocalArtists          │ │  ← E   Trending tags
│  │ #VintageRugs  #ModernDesign          │ │       (wrap)
│  │ #SouthAfricanArt                     │ │
│  └──────────────────────────────────────┘ │
└───────────────────────────────────────────┘
```

### Active query (results)

```
┌───────────────────────────────────────────┐
│  ☰   [🔍 kimono            ]      ✕      │
├───────────────────────────────────────────┤
│  12 results for "kimono"                   │  ← F   Results header
├───────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐       │
│  │     IMG      │  │     IMG      │       │
│  │          💗🔖│  │          💗🔖│       │
│  │ ◯ merchant   │  │ ◯ merchant   │       │  ← G   Results grid
│  │ Product Name │  │ Product Name │       │       (same ProductCard)
│  │ R899.00      │  │ R650.00      │       │
│  └──────────────┘  └──────────────┘       │
│              ⋮ infinite scroll ⋮           │
└───────────────────────────────────────────┘
```

### No results

```
┌───────────────────────────────────────────┐
│  ☰   [🔍 xyzbloop          ]      ✕      │
├───────────────────────────────────────────┤
│  0 results for "xyzbloop"                  │
│                                            │
│              [ 🔍 medium ]                 │
│                                            │
│       No results found                     │  ← H   Empty results
│                                            │
│   Try adjusting your search or browse      │
│   by category                              │
│                                            │
└───────────────────────────────────────────┘
```

### Section → data-source key

| § | Section | Data source |
|---|---|---|
| **A** | Search header | Search input is local state. Menu icon → SideMenu. Clear (×) resets query |
| **B** | CategoryFilter | `GET /categories?genderType=<FilterContext>` |
| **C** | Placeholder | Static copy |
| **D** | Recent searches | Client-side persisted list (AsyncStorage). No backend call for v1 |
| **E** | Trending tags | `GET /search/suggestions` returns trending array |
| **F** | Results header | Count from `GET /search` response pagination |
| **G** | Results grid | `GET /search?q=…&genderType=…` paginated |
| **H** | No results | Triggered when `data.products.length === 0` after search resolves |

### Scroll & sticky behaviour

- **Vertical scroll** on the content area (varies by state).
- **Search header (A) is sticky** at the top.
- **CategoryFilter (B) scrolls horizontally.**
- **Results grid (G) scrolls vertically and paginates infinitely.**

---

## Layout (top to bottom)

### Search header
- Menu button (hamburger, left) → opens SideMenu
- Search input (flexible) with magnifying-glass icon prefix
- Clear button (×, right) — visible only when query is non-empty
- Focus / blur animates the input subtly; full focus state has the clear button always shown

### CategoryFilter (only when not focused AND no query)
- Same component as Home but with `searchMode={true}` flag
- Tapping a chip filters by category — see Open Questions for whether this should navigate to a listing screen or filter results inline

### Recent Searches (only when focused, no query)
- Section title "Recent Searches"
- Per row: clock icon + search term + clear button (×)
- Most recent at top; 5 max displayed
- Tap row → set query, fire search (also moves the entry to position 0)

### Trending (only when focused, no query)
- Section title "Trending"
- Wrap-flow of tag chips (`#HandmadeArt`, etc.)
- Tap chip → set query (stripped of `#`), fire search

### Results header (only when active query)
- "N results for "<query>""
- "0 results" triggers the empty state

### Results grid (only when active query, results > 0)
- 2-column grid of ProductCard components (same as Home)
- Infinite scroll: next page on near-bottom
- Each card: image, like, bookmark, merchant link, product title, price

### Placeholder (only when not focused AND no query)
- Centered icon + heading + body text
- No CTAs — the search header is the action

---

## User actions

| Action | Result |
|---|---|
| Tap search input | Focus → show Recent + Trending |
| Type in input | Debounce 250ms → `GET /search?q=...&genderType=...` |
| Tap clear (×) | Reset query + state (unfocus if needed) |
| Tap submit on keyboard | Force search now (skips debounce) + add query to recent searches |
| Tap recent search row | Set query + fire search + move row to top of recents |
| Tap × on recent row | Remove from recent searches (AsyncStorage only) |
| Tap trending tag | Strip `#` + set query + fire search |
| Tap category chip | Filter results by category (if has query) OR navigate to category listing (if no query) |
| Tap product card | Navigate to `/product/{productId}` |
| Tap heart on product | Toggle like (optimistic + API) |
| Tap bookmark on product | Toggle bookmark (optimistic + API) |
| Tap merchant in product card | Navigate to `/artist/{username}` |
| Pull to refresh (results) | Refetch current search |
| Scroll to bottom of results | Load next page (infinite scroll) |
| Tap outside input area (backToGridArea) | Unfocus the input |
| Navigate to another tab and back | Reset query and unfocus (handled by `useFocusEffect`) |

---

## States

| State | Trigger | UI |
|---|---|---|
| **Initial** | Mount, not focused, no query | CategoryFilter + Placeholder |
| **Focused, empty** | Input focused, query empty | Recent + Trending |
| **Search in flight** | Query >= 1 char, request in flight | Show last results (if any) faded; otherwise skeleton grid |
| **Results** | Search resolved with products | Results header + grid |
| **Empty results** | Search resolved with 0 products | "0 results" + empty state |
| **Search error** | Network / 5xx | Toast + retry; if a prior result is cached, keep it visible |
| **Network offline** | Search attempted offline | Toast: "Couldn't reach YIIVA. Check your connection." |
| **Authenticated** | Signed in | Like/bookmark work normally |
| **Guest** | No session | Like/bookmark prompt for sign-in OR use local-only state per [CC-6](../../open-questions.md#cc-6--guest-social-actions) |
| **Trending fetch failed** | `GET /search/suggestions` 5xx | Hide Trending section silently |

---

## Prototype-only behavior to deprecate

| Item | Location | Replace with |
|---|---|---|
| `searchDummyProducts` | `lib/dummy-data.ts` → `search.tsx:21,42` | `useQuery` against `GET /search?q=...&genderType=...` |
| Recent searches hard-coded initial list | `search.tsx:27-32` | Empty array on first load; persist user's actual searches to AsyncStorage |
| Recent searches kept in local state only — lost on tab change due to `useFocusEffect` reset | `search.tsx:83-92` | Persist to AsyncStorage; reset only the focus/query state on blur, not the recent list |
| Trending tags hard-coded (`#HandmadeArt`, etc.) | `search.tsx:168-174` | `GET /search/suggestions` returns trending dynamically |
| No genderType filter passed to search | `search.tsx:42` | Pass `FilterContext.activePrimaryFilter` as `genderType` |
| `getLocalAsset` fixture resolution | `search.tsx:210, 234` | Use absolute CDN URLs from server response |
| No pagination on results | `search.tsx:204-264` | Add infinite scroll using `useInfiniteQuery` with cursor pagination |
| Category chip behavior is unclear (sets `activeCategory` locally but doesn't drive any query) | `search.tsx:62-64` | Wire to filter the query (`category` param) OR navigate to listing screen — see [SR-6](../../open-questions.md#sr-6--category-chip-behavior-in-search) |
| No analytics on search queries | — | Optional: `POST /search/track` to record queries for ranking improvements (see [SR-8](../../open-questions.md#sr-8--search-analytics)) |
| Social state from `social-store.ts` (client-only) | `search.tsx:38, 224-227` | Server-backed once Social endpoints land |
| `selectedCategory` state unused beyond setting | `search.tsx:36, 62-64` | Either wire it up or remove |
| Search debounce missing — fires on every keystroke | `search.tsx:46-50` `handleSearch` | Add 250ms debounce |
