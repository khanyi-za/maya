# YIIVA Mobile — Search (API Contract)

> Screen 07 · companion to [`screen.md`](./screen.md)
>
> Manifest, not spec. Endpoint shapes are defined once in [`../../api/`](../../api/) by domain. This doc says which endpoints Search calls, when, and any screen-specific context.
>
> Global rules → [`../../api-conventions.md`](../../api-conventions.md). Open questions → [`../../open-questions.md`](../../open-questions.md).

---

## Endpoints called by Search

| # | Endpoint | Spec | When |
|---|---|---|---|
| 1 | `GET /search` | [`api/search.md`](../../api/search.md) §1 | Query change (debounced 250ms), submit, recent/trending tap, pull-to-refresh, infinite scroll |
| 2 | `GET /search/suggestions` | [`api/search.md`](../../api/search.md) §5 | Mount + focus (for Trending tags) |
| 3 | `GET /categories` | [`api/categories.md`](../../api/categories.md) §1 | Mount (for CategoryFilter — same as Home) |
| 4 | `PUT/DELETE /products/{id}/like` | [`api/social.md`](../../api/social.md) §1 | Heart tap on result card |
| 5 | `PUT/DELETE /products/{id}/bookmark` | [`api/social.md`](../../api/social.md) §2 | Bookmark tap on result card |
| 6 | `POST /search/track` 🔴 | [`api/search.md`](../../api/search.md) §6 | After a search resolves with results (debounced, opt-in by backend) |

---

## Call sequence on mount

```
1. In parallel:
   - GET /categories?genderType=<FilterContext>   ← for the CategoryFilter
   - GET /search/suggestions                       ← for Trending tags
2. Hydrate recent searches from AsyncStorage (no network call)
3. Render Initial state.
```

## Call sequence on query change

```
User types "ki" → "kim" → "kimo" → "kimon" → "kimono"

1. Each keystroke updates local state immediately (uncontrolled input)
2. Debounce 250ms after the last keystroke
3. GET /search?q=kimono&genderType=women&limit=20
4. While in flight: keep previous results visible (faded), or show skeleton if first search
5. On resolve: render Results state
6. If results.length > 0: optionally POST /search/track (analytics — see SR-8)
```

## Call sequence on submit

```
User taps "search" on keyboard (or recent/trending tap):

1. Cancel any in-flight debounced search
2. Fire GET /search immediately (skip debounce)
3. If query is new (not in recent list): prepend to recent searches in AsyncStorage,
   trim list to 5 max
4. If query is already in recent: move to position 0
```

## Call sequence on infinite scroll

```
User scrolls near bottom of results:

1. Check pagination.hasMore from last response
2. If true and not already fetching: GET /search?q=...&cursor=<nextCursor>
3. Append new products to the rendered list
```

## Call sequence on social actions

```
User taps heart on a result card:

1. Optimistic flip
2. PUT/DELETE /products/{id}/like
3. On success: patch the cached search response so refetching doesn't snap state back
4. Guest: local-only (per CC-6)
```

---

## Search-specific notes per endpoint

### 1. `GET /search`

- **Debounce 250ms client-side** — prevents firing on every keystroke. Submit / recent / trending taps bypass the debounce.
- **`q` minimum length** — fire at >= 1 character. Backend may require >= 2 — confirm in [open-questions §SR-3](../../open-questions.md#sr-3--minimum-query-length).
- **`genderType` always passed** — sourced from `FilterContext.activePrimaryFilter`. Mobile vote: search respects the global gender filter so results match the user's current browsing context.
- **`category` param** — optional, set when CategoryFilter chip is tapped (per [SR-6](../../open-questions.md#sr-6--category-chip-behavior-in-search) decision).
- **Pagination** — cursor (preferred). Mobile uses `useInfiniteQuery` from TanStack Query.
- **Cache strategy** — staleTime 0 (each query is fresh); gcTime 5min. Switching queries doesn't refetch the previous one if the user navigates back within 5min.
- **Personalised fields** — same as `/products/feed`: `isLikedByMe`, `isBookmarkedByMe`, `merchant.isFollowedByMe`. Mobile renders state from response.

### 2. `GET /search/suggestions`

- **Returns trending tags + (optionally) autocomplete suggestions for the current `q`.**
- **Cache strategy** — staleTime 1h for trending; suggestions fetched on focus.
- **Failure mode** — if trending fails, hide the Trending section silently. The search itself still works.

### 3. `GET /categories`

- **Same call as Home** — see [`screens/01-home/api-contract.md`](../01-home/api-contract.md) §4 for caching strategy. The mobile TanStack cache should share between Home and Search (same query key).

### 4-5. Social mutations

- **Same shape and behaviour as elsewhere.** Search results don't get any unique treatment.

### 6. `POST /search/track` 🔴

- **Optional analytics signal** — only fire if backend wants it. Useful for "top searches by week" reports and for tuning the relevance algorithm.
- **Fire-and-forget** — mobile doesn't wait for or surface errors.
- **Debounce** — only track the *settled* query (after the user stops typing), not every keystroke.

---

## Failure modes specific to Search

| Scenario | Mobile behaviour |
|---|---|
| `GET /search` fails on a fresh query | Toast + retry; if prior results are visible, keep them. |
| `GET /search` fails on pagination | Toast "Couldn't load more"; user can scroll back and retry. |
| `GET /search/suggestions` fails | Hide Trending section. |
| `GET /categories` fails | Hide CategoryFilter (graceful degradation). |
| User clears query mid-fetch | Cancel in-flight request via AbortController; reset to focused-empty state. |
| User switches to a different tab mid-fetch | Cancel via `useFocusEffect` cleanup. |
| Network drops | Last results stay visible with offline banner; new queries blocked until back online. |
| Backend returns the wrong gender (e.g. men's items on a women's search) | Mobile vote: trust the backend. If it's wrong, that's a backend bug — file it. Don't filter client-side. |
| User types extremely fast (e.g. paste) | Debounce + AbortController together ensure only the final query's results render. |
