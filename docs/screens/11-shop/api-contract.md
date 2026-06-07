# YIIVA Mobile — Shop (API Contract)

> Screen 11 · companion to [`screen.md`](./screen.md)
>
> Manifest, not spec. Endpoint shapes are defined once in [`../../api/`](../../api/) by domain. This doc says which endpoints Shop calls, when, and any screen-specific context.
>
> Global rules → [`../../api-conventions.md`](../../api-conventions.md). Open questions → [`../../open-questions.md`](../../open-questions.md).

---

## Endpoints called by Shop

| # | Endpoint | Spec | When |
|---|---|---|---|
| 1 | `GET /categories` | [`api/categories.md`](../../api/categories.md) §1 | Mount (Categories view), tab change |
| 2 | `GET /merchants` | [`api/merchants.md`](../../api/merchants.md) §4 | Mount (Brands view), tab change, infinite scroll |
| 3 | `GET /cart/summary` | [`api/cart.md`](../../api/cart.md) §1 | Mount (cart badge) |
| 4 | `GET /notifications/unread-count` | [`api/notifications.md`](../../api/notifications.md) §1 | Mount (bell badge, signed-in only) |
| 5 | `PUT/DELETE /merchants/{id}/follow` | [`api/social.md`](../../api/social.md) §3 | If brand rows expose a Follow button (currently they don't, but design might add it) |

---

## Call sequence on mount

```
1. In parallel:
   - GET /categories?genderType=<FilterContext>     ← Categories view data
   - GET /merchants?genderType=<FilterContext>      ← Brands view data
   - GET /cart/summary                              ← cart badge
   - GET /notifications/unread-count (if authed)    ← bell badge
2. Read viewMode from AsyncStorage (default: 'brands' per current code,
   but see ST-4 mobile vote)
3. Render the active view; skeleton for the other if user toggles soon
```

> Both views' data is fetched on mount because the user is one tap away
> from toggling. Pre-fetching makes the toggle feel instant.

## Call sequence on tab change

```
1. Update FilterContext.activePrimaryFilter
2. In parallel:
   - GET /categories?genderType=<new>
   - GET /merchants?genderType=<new>
3. Cart/notification calls do NOT refetch
4. Scroll position resets in both views
```

## Call sequence on view toggle

```
1. Flip viewMode local state
2. Persist new mode to AsyncStorage (key: `yiiva.shopViewMode`)
3. No API call — data for both views is already cached from mount
```

## Call sequence on category card tap

```
1. router.push('/category/' + category.slug)
2. The category listing screen handles its own fetches
```

## Call sequence on brand row tap

```
1. router.push('/artist/' + brand.username)
2. Merchant Profile handles its own fetches
```

## Call sequence on alphabet index tap

```
1. Tap a letter (e.g. 'M')
2. Local computation: find the index of the first brand whose displayName
   starts with 'M' in the rendered list
3. ScrollView ref.scrollTo({ y: measuredOffset, animated: true })
4. No API call
```

## Call sequence on infinite scroll (Brands view)

```
1. If pagination.hasMore: GET /merchants?cursor=<nextCursor>&genderType=<current>
2. Append to brand list
3. Recompute alphabet index from the now-larger list
```

---

## Shop-specific notes per endpoint

### 1. `GET /categories`

- **Same call as Home and Search.** Highly cacheable; staleTime 24h.
- **`image` URL** — Shop renders larger thumbnail tiles than Home (full-width cards vs chip-sized). Backend should serve images sized for the larger use case (or include multiple sizes — see [open-questions §CAT-5](../../open-questions.md#cat-5--category-image-sizes)).

### 2. `GET /merchants`

- **Used here for the A–Z brand directory.** Different access pattern than Home's `/merchants/trending`.
- **`genderType` filter** — returns brands that have at least one product in the selected gender. Maintains the gender focus across views.
- **Sort** — alphabetical by `displayName` (default). Mobile relies on this for the grouped-by-letter layout; if backend sorts differently, mobile would need to re-sort client-side.
- **Pagination** — cursor preferred. 37 brands today, but the real catalogue will grow into the hundreds.
- **Cache strategy** — TanStack staleTime 30min; refetch on FeedTabs change or pull-to-refresh.
- **Personalised fields** — when authed, response may include `isFollowedByMe` per brand if/when Follow buttons land in the directory.

### 3-4. Badges

- Same pattern as Home/Search/Explore. Shared TanStack query keys keep this cheap.

### 5. `PUT/DELETE /merchants/{id}/follow`

- **Not currently surfaced on Shop.** If design adds Follow buttons to brand rows (per [ST-3](../../open-questions.md#st-3--follow-button-on-brand-rows)), same pattern as Home's Trending Brands.

---

## Failure modes specific to Shop

| Scenario | Mobile behaviour |
|---|---|
| Categories fetch fails | Hide Categories view's content; show retry pill. If user is in Brands view, no impact. |
| Brands fetch fails | Hide Brands view's content; show retry pill. |
| Both fail | Empty error state with retry covering both. |
| Empty categories for selected gender (Home & Lifestyle today) | "Coming soon" placeholder |
| Empty brands for selected gender | "No brands yet" placeholder |
| Alphabet index tap with letter that has no brands | No-op (letter is rendered greyed if it has no entries — backend can hint this via the `letters` field if added) |
| Network drops during infinite scroll | Toast "Couldn't load more"; user can retry by scrolling again |
| User toggles view while loading | Toggle is instant; both fetches are independent. The active view shows skeleton until its fetch resolves. |
| Foreground from background after extended time | Refetch via `AppState` listener if cache is stale; otherwise render cached data. |
