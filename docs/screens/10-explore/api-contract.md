# YIIVA Mobile — Explore (API Contract)

> Screen 10 · companion to [`screen.md`](./screen.md)
>
> Manifest, not spec. Endpoint shapes are defined once in [`../../api/`](../../api/) by domain. This doc says which endpoints Explore calls, when, and any screen-specific context.
>
> Global rules → [`../../api-conventions.md`](../../api-conventions.md). Open questions → [`../../open-questions.md`](../../open-questions.md).

---

## Endpoints called by Explore

| # | Endpoint | Spec | When |
|---|---|---|---|
| 1 | `GET /merchants/trending` | [`api/merchants.md`](../../api/merchants.md) §1 | Mount, tab change, pull-to-refresh |
| 2 | `GET /categories` | [`api/categories.md`](../../api/categories.md) §1 | Mount, tab change |
| 3 | `GET /products/featured` | [`api/products.md`](../../api/products.md) §3 | Mount, tab change, infinite scroll |
| 4 | `GET /cart/summary` | [`api/cart.md`](../../api/cart.md) §1 | Mount (cart badge) |
| 5 | `GET /notifications/unread-count` | [`api/notifications.md`](../../api/notifications.md) §1 | Mount (bell badge) |
| 6 | `PUT/DELETE /merchants/{id}/follow` | [`api/social.md`](../../api/social.md) §3 | Follow tap on a Trending Brand |
| 7 | `GET /collections` 🔴 | [`api/collections.md`](../../api/collections.md) (TBD) | Mount, ONLY if [EX-2](../../open-questions.md#ex-2--collections-revive-drop-or-rethink) ships |

---

## Call sequence on mount

```
1. In parallel:
   - GET /merchants/trending?genderType=<current>&limit=10   ← Trending Brands
   - GET /categories?genderType=<current>                    ← CategoryFilter
   - GET /products/featured?limit=20                          ← "For You" grid
   - GET /cart/summary                                        ← cart badge
   - GET /notifications/unread-count (if authed)              ← bell badge
   - (if EX-2 shipped) GET /collections?genderType=<current>  ← Collections row
2. Render skeletons until each resolves; sections fail independently.
```

## Call sequence on tab change

```
1. Update FilterContext.activePrimaryFilter
2. In parallel (cart/notifications calls do NOT refetch):
   - GET /merchants/trending?genderType=<new>
   - GET /categories?genderType=<new>
   - GET /products/featured (NOTE: featured is gender-agnostic per current
     api-client.ts — see [open-questions §EX-8])
   - (if shipped) GET /collections?genderType=<new>
3. Reset selectedCategory to "All"
```

## Call sequence on Trending Brand follow

```
Same as Home — see [`screens/01-home/api-contract.md`](../01-home/api-contract.md) §9
notes. Optimistic flip, PUT/DELETE /merchants/{id}/follow, patch cached
trending response, revert on error.
```

## Call sequence on category chip tap

```
Currently unwired (handleCategoryChange is console.log only).

Mobile vote for behaviour (see [EX-6](../../open-questions.md#ex-6--category-chip-behavior-in-explore)):
- Tapping a category navigates to a dedicated listing screen:
  /(tabs)/explore/category/{slug} or similar
- Alternative: filter the "For You" grid in-place with a `category` query param.
```

## Call sequence on infinite scroll (For You grid)

```
1. If pagination.hasMore: GET /products/featured?cursor=<nextCursor>&limit=20
2. Append products to grid
```

---

## Explore-specific notes per endpoint

### 1. `GET /merchants/trending`

- **Same call as Home.** TanStack cache should share between the two screens (same query key).
- **Same Mobile vote (M-1 / M-3)** on ranking signal and update frequency.

### 2. `GET /categories`

- **Same call as Home and Search.** Highly cacheable; staleTime 24h.

### 3. `GET /products/featured`

- **Used here as the "For You" data source.** Today it returns randomly-selected products with no personalisation.
- **Should `/products/featured` accept `genderType`?** Currently doesn't (per `api-client.ts`). If "For You" should reflect the user's gender tab, this needs to change OR Explore uses `GET /products/feed` instead.
- **Personalised fields** — when authed, response should include `isLikedByMe` and `isBookmarkedByMe` since the cards may show like counts (see [EX-7](../../open-questions.md#ex-7--like-counts-on-product-cards)).
- **`likeCount`** must be in the response — Explore is the only screen that displays it on product cards.
- **Cache strategy** — staleTime 10min. Featured products don't churn within a session.

### 4-5. Cart + notification badges

- Same pattern as Home (Home's api-contract documents the optimistic-update + foreground-refetch behaviour).

### 6. `PUT/DELETE /merchants/{id}/follow`

- Same as Home's Trending Brands follow.

### 7. `GET /collections` 🔴

- **Only wired if Collections is revived.** Endpoint TBD; would return curated thematic groupings (e.g. "Heritage Collection", "Summer Essentials") with cover image + item count + slug.
- **Spec drafted in `api/collections.md` when EX-2 lands** as a "ship it" decision.

---

## Failure modes specific to Explore

| Scenario | Mobile behaviour |
|---|---|
| Trending Brands fails | Hide section with inline retry pill |
| Categories fails | Hide CategoryFilter |
| "For You" fails | Show inline retry where the grid would be |
| Cart/notification badge calls fail | Same graceful degradation as Home |
| All sections empty | Show single "Nothing here yet — try a different category" placeholder |
| Follow mutation fails | Revert + toast |
| Featured returns no products for the selected gender (if gender filtering is added) | Show empty state for "For You" |
| Collections endpoint fails (when enabled) | Hide Collections section |
