# YIIVA Mobile — Home Feed (API Contract)

> Screen 01 · companion to [`screen.md`](./screen.md)
>
> This is a **manifest**, not a spec. Endpoint shapes are defined once in [`../../api/`](../../api/) by domain. This doc says which endpoints Home calls, with what parameters, when, and any Home-specific context the backend engineer should know.
>
> Global rules → [`../../api-conventions.md`](../../api-conventions.md). Open questions → [`../../open-questions.md`](../../open-questions.md).

---

## Endpoints called by Home

| # | Endpoint | Spec | When |
|---|---|---|---|
| 1 | `GET /products/feed` | [`api/products.md`](../../api/products.md) §1 | Mount, tab change, category change, pull-to-refresh, infinite scroll |
| 2 | `GET /products/new-arrivals` | [`api/products.md`](../../api/products.md) §2 | Mount, tab change, pull-to-refresh |
| 3 | `GET /merchants/trending` | [`api/merchants.md`](../../api/merchants.md) §1 | Mount, tab change, pull-to-refresh |
| 4 | `GET /categories` | [`api/categories.md`](../../api/categories.md) §1 | Mount, tab change (cached aggressively) |
| 5 | `GET /cart/summary` | [`api/cart.md`](../../api/cart.md) §1 | Mount, returning from `/cart`, foreground via `AppState` |
| 6 | `GET /notifications/unread-count` | [`api/notifications.md`](../../api/notifications.md) §1 | Mount, foreground via `AppState` |
| 7 | `PUT/DELETE /products/{id}/like` | [`api/social.md`](../../api/social.md) §1 | User taps heart |
| 8 | `PUT/DELETE /products/{id}/bookmark` | [`api/social.md`](../../api/social.md) §2 | User taps bookmark |
| 9 | `PUT/DELETE /merchants/{id}/follow` | [`api/social.md`](../../api/social.md) §3 | User taps Follow in Trending Brands |

---

## Call sequence on mount (cold start)

```
1. Auth hydration completes (see auth-mobile-guide.md §5.1)
2. In parallel:
   - GET /categories?genderType=<FilterContext default: women>
   - GET /products/feed?genderType=women&limit=20
   - GET /products/new-arrivals?genderType=women&limit=6
   - GET /merchants/trending?genderType=women&limit=10
   - GET /cart/summary
   - GET /notifications/unread-count (only if authenticated)
3. Render skeleton until all six resolve OR until any one fails:
   - On failure, show last cached data if present
   - On all-empty, show empty state
```

## Call sequence on tab change (Women → Men, etc.)

```
1. Update FilterContext.activePrimaryFilter
2. In parallel (the cart/notifications calls do NOT refetch):
   - GET /categories?genderType=<new>
   - GET /products/feed?genderType=<new>&limit=20  (resets pagination)
   - GET /products/new-arrivals?genderType=<new>&limit=6
   - GET /merchants/trending?genderType=<new>&limit=10
3. Reset selectedCategory to "All"
```

## Call sequence on category chip tap

```
1. Update local selectedCategory state
2. GET /products/feed?genderType=<current>&category=<slug>&limit=20  (resets pagination)
3. New arrivals + trending brands carousels are NOT refetched (they aren't category-filtered)
```

---

## Home-specific notes per endpoint

### 1. `GET /products/feed`

- **Pagination:** cursor (see [open-questions §P-1](../../open-questions.md#p-1--feed-pagination-strategy)). On `nextCursor` from prior response, append.
- **Personalised fields:** `isLikedByMe`, `isBookmarkedByMe`, `merchant.isFollowedByMe` consumed directly to render heart / bookmark / follow state on cards.
- **Cache strategy:** TanStack Query staleTime 5min, gcTime 10min (mobile default). Invalidate on any social mutation that affects a visible product.

### 2. `GET /products/new-arrivals`

- **Personalised fields:** none consumed — carousel cards don't expose like/bookmark interactions. Tapping a card navigates to product detail.
- **Cache strategy:** staleTime 10min — new arrivals don't churn within a session.

### 3. `GET /merchants/trending`

- **Personalised fields:** `isFollowedByMe` consumed to render Follow / Following button state.
- **Cache strategy:** staleTime 30min (aligned with the assumed daily admin curation cadence — see [§M-3](../../open-questions.md#m-3--trending-update-frequency)).

### 4. `GET /categories`

- **Cache strategy:** staleTime 24h — admin-controlled, low churn. Bonus: backend should send `Cache-Control: public, max-age=3600` so the HTTP layer cache helps too.
- **Image URLs:** thumbnails rendered inside chips. Categories without images get a text-only chip fallback.

### 5. `GET /cart/summary`

- **Auth mode:** uses `Authorization` header if signed in, `X-Cart-Session` if guest. Either is fine — backend resolves automatically.
- **Cache strategy:** staleTime 0 (always refetch on Home mount + foreground). It's a tiny payload and the badge must be accurate.
- **Optimistic updates:** when the user adds to cart from Product Detail and returns to Home, the badge should already reflect the new count (optimistic update from the mutation response). The mount refetch is a safety net, not the primary update path.

### 6. `GET /notifications/unread-count`

- **Auth mode:** required. Skip the call entirely if `useAuthStore().state.status === 'guest'`.
- **Cache strategy:** staleTime 30s. Refetch on Home mount and on app foreground via `AppState` listener — same pattern as the access-token refresh in [`auth-mobile-guide.md`](../../auth-mobile-guide.md) §9.

### 7. `PUT/DELETE /products/{id}/like`

- **Optimistic UI:** flip the heart immediately on tap. On 401, revert and open login modal. On 5xx, revert and toast.
- **Cache invalidation:** mutate the cached product in any visible list (feed, new arrivals) so the next render doesn't snap back.
- **Guest behaviour:** if user is guest, do NOT call the API. Update the local `social-store.ts` cache and queue a sync for after sign-in (see [`open-questions §CC-6`](../../open-questions.md#cc-6--guest-social-actions)).

### 8. `PUT/DELETE /products/{id}/bookmark`

Same pattern as Like.

### 9. `PUT/DELETE /merchants/{id}/follow`

- **Optimistic UI:** flip Follow → Following immediately. Increment `followerCount` by 1 (optimistic) for any visible merchant card; on success, replace with the real count from the response.

---

## Failure modes specific to Home

| Scenario | Mobile behaviour |
|---|---|
| Feed succeeds, carousels fail | Render grid only; show inline retry pill where each carousel would have been |
| Carousels succeed, feed fails | Render carousels; show a full-width retry CTA where the grid would be |
| Categories endpoint fails | Hide the chip rail (categories degrade gracefully — feed still works without category filter) |
| Cart-summary 404 (guest with no session cart) | Treat as `itemCount: 0`, hide badge |
| Notifications unread-count 401 (token expired mid-session) | Silent refresh per auth wrapper; if refresh fails, hide the bell badge until re-auth |
| All-network failure (offline) | Render last cached data with a banner: *"You're offline. Showing your last view."* |
