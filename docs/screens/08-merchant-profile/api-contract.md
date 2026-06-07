# YIIVA Mobile — Merchant Profile (API Contract)

> Screen 08 · companion to [`screen.md`](./screen.md)
>
> Manifest, not spec. Endpoint shapes are defined once in [`../../api/`](../../api/) by domain. This doc says which endpoints Merchant Profile calls, when, and any screen-specific context.
>
> Global rules → [`../../api-conventions.md`](../../api-conventions.md). Open questions → [`../../open-questions.md`](../../open-questions.md).

---

## Endpoints called by Merchant Profile

| # | Endpoint | Spec | When |
|---|---|---|---|
| 1 | `GET /merchants/{username}` | [`api/merchants.md`](../../api/merchants.md) §2 | Mount, pull-to-refresh |
| 2 | `GET /merchants/{username}/products` | [`api/merchants.md`](../../api/merchants.md) §3 | Mount, category tab change, infinite scroll |
| 3 | `PUT/DELETE /merchants/{id}/follow` | [`api/social.md`](../../api/social.md) §3 | Follow / unfollow tap |
| 4 | `PUT/DELETE /products/{id}/like` | [`api/social.md`](../../api/social.md) §1 | If product cards in grid surface a like icon (currently they don't on this screen) |
| 5 | `PUT/DELETE /products/{id}/bookmark` | [`api/social.md`](../../api/social.md) §2 | Same as §4 |
| 6 | `POST /merchants/{id}/view` 🔴 | (TBD — same pattern as `POST /products/{id}/view`) | Mount (fire-and-forget, debounced) |

---

## Call sequence on mount

```
1. Read username from useLocalSearchParams (router param is "artistId" but value is the username)
2. In parallel:
   - GET /merchants/{username}                       ← critical, blocks render
   - GET /merchants/{username}/products?limit=20      ← non-blocking, fills grid
3. After /merchants/{username} resolves:
   - POST /merchants/{id}/view (fire-and-forget — analytics)
4. Render skeleton until merchant resolves; show products skeleton until grid resolves.
```

## Call sequence on category tab change

```
User taps a category tab (e.g. "Kimono"):

1. Set selectedCategory locally
2. GET /merchants/{username}/products?clothingType=kimono&limit=20  (resets pagination cursor)
3. Render new grid; previous grid remains visible (faded) during the fetch
```

## Call sequence on Follow / Unfollow

```
User taps Follow button:

1. Optimistic UI: flip Follow → Following, increment followerCount
2. PUT (or DELETE) /merchants/{merchantId}/follow
3. On success: confirm with the response's followerCount
4. On 401 (no session): revert, open login modal
5. On 5xx: revert, toast
```

## Call sequence on Contact → Message

```
User taps Contact → Message {merchant}:

1. Close the Contact modal
2. Navigate to /chat/{username}
3. Chat screen handles conversation creation per its own contract (TBD — Screen 13)
```

## Call sequence on Contact → Email

```
User taps Contact → Email:

1. If merchant.email is null → option should be hidden; user can't reach this branch
2. Linking.openURL('mailto:' + merchant.email)
3. Close modal
4. Note: native mail app opens; no further app-side handling
```

## Call sequence on infinite scroll

```
User scrolls near bottom of product grid:

1. Check pagination.hasMore from last response
2. If true and not already fetching: GET /merchants/{username}/products?cursor=<nextCursor>&clothingType=<selectedCategory>
3. Append new products to the rendered list
```

---

## Merchant Profile-specific notes per endpoint

### 1. `GET /merchants/{username}`

- **Critical path** — screen can't render without it.
- **Auth mode** — optional. When authenticated, response includes `isFollowedByMe` for the Follow button state.
- **Cache strategy** — TanStack staleTime 5min. Invalidate on follow/unfollow mutations affecting this merchant.
- **Pull-to-refresh** — force refetch (followers / verified state may have changed).
- **404 handling** — show "Brand not found" + Browse YIIVA CTA. Log to error tracker.
- **Suspended merchant** — backend returns the merchant with `status: "SUSPENDED"` (or 404 — see [open-questions §MP-10](../../open-questions.md#mp-10--suspended-deactivated-merchant-response)). Mobile renders the suspended placeholder.

### 2. `GET /merchants/{username}/products`

- **Returns products + the list of distinct `clothingType` values** in this merchant's catalogue (drives the category tabs).
- **Pagination** — cursor preferred for infinite scroll.
- **`clothingType` param** — optional; when set, filters to that category.
- **Cache strategy** — staleTime 5min per `(username, clothingType)` combination. Switching tabs uses different cache entries.
- **`personalised fields`** — `isLikedByMe`, `isBookmarkedByMe` per the convention; mobile renders these if/when the grid cards expose like/bookmark icons (currently they don't on this screen, but the data should be there).

### 3. `PUT/DELETE /merchants/{id}/follow`

- **Optimistic** — flip immediately, increment `followerCount` by 1 (or -1 for unfollow).
- **Cache invalidation** — patch the cached `GET /merchants/{username}` response with the new `isFollowedByMe` + `followerCount`.
- **Guest** — local-only, queued for sign-in sync (same as Home Trending Brands follow per [CC-6](../../open-questions.md#cc-6--guest-social-actions)).

### 4-5. `PUT/DELETE /products/{id}/like` and `/bookmark`

- **Currently not surfaced on this screen** — the EvenGrid renders price-only cards. If like/bookmark icons are added (per design call), the social pattern from Home applies.

### 6. `POST /merchants/{id}/view` 🔴

- **Same shape as `POST /products/{id}/view`** in [`api/products.md`](../../api/products.md) §6.
- **Fire and forget** — no error handling.
- **Debounce** — 30s per (user, merchant). Tab back doesn't double-count.
- **Purpose** — feeds the merchant's analytics ("brand profile viewed N times this week") and the trending merchants ranking signal.

---

## Failure modes specific to Merchant Profile

| Scenario | Mobile behaviour |
|---|---|
| `/merchants/{username}` 404 | "Brand not found" + Browse YIIVA CTA |
| `/merchants/{username}` 5xx | Toast + retry; if cached, keep showing |
| `/merchants/{username}/products` fails | Show grid error state with retry; rest of profile still renders |
| Merchant is suspended / deactivated | Render suspended placeholder; hide Follow / Contact / grid |
| `heroMedia` is empty | Render hero as solid placeholder block (use `merchant.logo` as background); hide dot indicators |
| `heroMedia` has only images, no videos | Hide mute button |
| Hero video fails to load | Show fallback image (first image in heroMedia if any) for that slide |
| Follow mutation fails | Revert optimistic flip + toast |
| Contact email is null | Hide Email option in modal; only Message remains |
| Chat target merchant has messaging disabled | Chat screen handles — Merchant Profile passes through |
| Network drops during infinite scroll | Toast "Couldn't load more"; user can scroll back and retry |
| User opens profile from share link but merchant doesn't exist | Same 404 path as above |
| Suspended merchant has cached data on device | Refetch on mount → suspended placeholder replaces stale cached profile |
