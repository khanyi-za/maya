# YIIVA Mobile — Wishlist (API Contract)

> Screen 09 · companion to [`screen.md`](./screen.md)
>
> Manifest, not spec. Endpoint shapes are defined once in [`../../api/`](../../api/) by domain. This doc says which endpoints Wishlist calls, when, and any screen-specific context.
>
> Global rules → [`../../api-conventions.md`](../../api-conventions.md). Open questions → [`../../open-questions.md`](../../open-questions.md).

---

## Endpoints called by Wishlist

| # | Endpoint | Spec | When |
|---|---|---|---|
| 1 | `GET /me/bookmarks` | [`api/social.md`](../../api/social.md) §4 | Mount, pull-to-refresh, foreground via `AppState`, infinite scroll |
| 2 | `DELETE /products/{id}/bookmark` | [`api/social.md`](../../api/social.md) §2 | Bookmark icon tap (unbookmark) |
| 3 | `PUT /products/{id}/bookmark` | [`api/social.md`](../../api/social.md) §2 | Undo on the 5-second toast |
| 4 | `PUT/DELETE /products/{id}/like` | [`api/social.md`](../../api/social.md) §1 | Heart icon tap |
| 5 | `POST /cart/items` | [`api/cart.md`](../../api/cart.md) §3 | "Add to Cart" affordance (TBD per WL-4) |

---

## Call sequence on mount

```
1. GET /me/bookmarks?limit=20    ← critical (signed-in users)
2. Render skeleton until resolved
3. If guest: read from local AsyncStorage bookmarks instead;
   no network call until they sign in (see WL-12)
4. View mode hydrated from AsyncStorage on the same tick
```

## Call sequence on remove (bookmark tap)

```
User taps bookmark icon on a row/tile:

1. Optimistic: fade-out animation, decrement local list length
2. DELETE /products/{productId}/bookmark
3. Toast appears: "Removed from wishlist  ·  Undo" (5s)
4a. Toast dismissed without Undo → final
4b. Undo tapped → PUT /products/{productId}/bookmark to re-add → fade back in
5. On 5xx: re-insert into list with toast "Couldn't remove. Try again."
```

## Call sequence on view-mode toggle

```
User taps the view-mode icon:

1. Flip viewMode local state (list ↔ grid)
2. Persist new mode to AsyncStorage (key: `yiiva.wishlistViewMode`)
3. No API call — same data, different layout
```

## Call sequence on infinite scroll

```
User scrolls near bottom:

1. If pagination.hasMore: GET /me/bookmarks?cursor=<nextCursor>&limit=20
2. Append to list
```

## Call sequence on "Add to Cart" (per WL-4 — if shipped)

```
1. Long-press a tile OR tap a contextual menu → "Add to Cart"
2. If product has variants and no variant selected → navigate to /product/{id}
   (user needs to pick a size on the product detail page)
3. If product has no variants → POST /cart/items { productId, quantity: 1 }
4. On success: toast "Added to cart" with cart badge animation
5. Item remains in wishlist (not auto-removed — per WL-4 mobile vote)
```

---

## Wishlist-specific notes per endpoint

### 1. `GET /me/bookmarks`

- **Auth mode** — required for signed-in users. For guests, mobile reads from AsyncStorage instead (no call).
- **Cache strategy** — TanStack staleTime 1min; pull-to-refresh forces immediate.
- **Pagination** — cursor preferred. Wishlists can grow large; lazy-load.
- **Response includes** the full Product shape + a `bookmarkedAt` ISO timestamp per item. Used to render relative-time meta ("Saved 2 days ago") on list cards.
- **Item availability** — `available: false` items still appear in the list (user can decide to remove); rendered with strikethrough + "Unavailable" badge. Hard-deleted products are filtered server-side and never appear.
- **Price drift detection** — backend may include `priceChanged: boolean` per item if it tracks the add-time price (similar to cart). Mobile can render a "Price dropped" affordance — TBD per [WL-6](../../open-questions.md#wl-6--price-drop--restock-notifications).

### 2-3. `DELETE / PUT /products/{id}/bookmark`

- **Idempotent** — repeat calls are safe (200 in both directions). See [`api/social.md`](../../api/social.md) Idempotency contract.
- **Undo via PUT** — the 5-second undo affordance re-adds via PUT. The user perceives it as undo; the server sees a new bookmark.
- **Cache invalidation** — patch the cached `GET /me/bookmarks` response: remove (or re-insert) the affected item locally without refetching.

### 4. `PUT/DELETE /products/{id}/like`

- **Same shape as other screens.** Wishlist may surface like indirectly through the card — tapping heart toggles independently of bookmark state.

### 5. `POST /cart/items`

- **Only fires if Move-to-Cart is shipped (per WL-4).** v1 may skip this entirely.

---

## Failure modes specific to Wishlist

| Scenario | Mobile behaviour |
|---|---|
| `GET /me/bookmarks` fails on mount | Toast + retry; if cached, keep visible. If no cache, show error state with retry button. |
| Guest user opens Wishlist (no session) | Read from AsyncStorage; show local-only bookmarks with subtle banner "Sign in to sync your wishlist across devices" |
| `DELETE /products/{id}/bookmark` fails | Re-insert into list + toast "Couldn't remove. Try again." |
| Bookmark item references a deleted product | Backend filters server-side; item should never appear |
| Bookmarked item is now unavailable | Render with strikethrough + Unavailable badge; user can remove manually |
| Network drops mid-scroll | Toast "Couldn't load more"; user can scroll back and retry |
| AsyncStorage write fails (e.g. storage full) | Mutation API call still succeeds; only local optimistic state is unaffected (rare edge case) |
| Switching view mode while loading | View-mode toggle is local-state-only; the data fetch isn't interrupted; the new layout renders when data arrives |
| Two devices toggle the same bookmark | Last write wins per server; mobile reflects on next mount/refetch via cache invalidation |
