# YIIVA Mobile — Product Detail (API Contract)

> Screen 02 · companion to [`screen.md`](./screen.md)
>
> Manifest, not spec. Endpoint shapes are defined once in [`../../api/`](../../api/) by domain. This doc says which endpoints Product Detail calls, when, and any screen-specific context.
>
> Global rules → [`../../api-conventions.md`](../../api-conventions.md). Open questions → [`../../open-questions.md`](../../open-questions.md).

---

## Endpoints called by Product Detail

| # | Endpoint | Spec | When |
|---|---|---|---|
| 1 | `GET /products/{id}` | [`api/products.md`](../../api/products.md) §4 | Mount, pull-to-refresh |
| 2 | `GET /products/{id}/similar` | [`api/products.md`](../../api/products.md) §5 | Mount (parallel with §1) |
| 3 | `GET /cart/summary` | [`api/cart.md`](../../api/cart.md) §1 | Mount, after Add to Cart, foreground via `AppState` |
| 4 | `PUT/DELETE /products/{id}/like` | [`api/social.md`](../../api/social.md) §1 | User taps heart |
| 5 | `POST /cart/items` | [`api/cart.md`](../../api/cart.md) §3 | User taps ADD TO CART |
| 6 | `POST /products/{id}/view` 🔴 | [`api/products.md`](../../api/products.md) §6 | Mount (fire-and-forget, debounced) |
| 7 | `POST /shipping/eta` 🔴 | [`api/shipping.md`](../../api/shipping.md) §1 (TBD) | User taps "When will I get it?" + provides postcode |

---

## Call sequence on mount

```
1. Read productId from useLocalSearchParams
2. In parallel (cold-mount):
   - GET /products/{productId}           ← critical, blocks render
   - GET /products/{productId}/similar    ← non-blocking, fills carousel after
   - GET /cart/summary                    ← non-blocking, fills cart badge
3. After /products/{id} resolves successfully:
   - POST /products/{id}/view             ← fire-and-forget analytics
4. Show skeleton while /products/{id} is in flight.
   Show similar-items skeleton until /similar resolves.
```

## Call sequence on Add to Cart

```
1. Client-side validation: size required → if not selected, toast + return
2. Disable bottom-bar button, show spinner
3. POST /cart/items
   body: { productId, variantId (or size), quantity: 1 }
4a. 200 → optimistic cart badge += 1, toast "Added to cart", re-enable button
4b. 409 OUT_OF_STOCK → toast "Sold out — please choose another size",
    refetch GET /products/{id} to refresh variant availability,
    re-enable button
4c. 401 (guest add) → backend should accept via X-Cart-Session;
    if it doesn't, open login modal and retry on close
4d. 5xx / network → toast "Couldn't add to cart. Try again.", re-enable
```

## Call sequence on heart tap

```
Authenticated:
1. Optimistic: flip heart icon, increment local likeCount
2. PUT /products/{productId}/like   (or DELETE on un-like)
3a. 200 → confirm with server's likeCount in response
3b. 5xx → revert heart, toast
3c. 401 → silent refresh via auth wrapper; if refresh fails, open login modal

Guest:
1. Update local social-store cache
2. Queue sync for after sign-in (see open-questions §CC-6)
3. Do NOT call the API
```

## Call sequence on variant swap

> Depends on which variant model the backend picks — see [open-questions §PD-9](../../open-questions.md#pd-9--variant-swap-mechanic).

**Mobile vote (single-fetch model):** `/products/{id}` returns all variants in one response. Tapping a variant swatch just swaps which variant's data is rendered — no second API call. Add-to-Cart sends the selected `variantId`.

**Alternative (per-variant fetch model):** each variant is a separate product ID; swatch tap navigates to `/product/{newId}`. More work for backend (variant grouping metadata), more navigation churn for users.

---

## Product Detail-specific notes per endpoint

### 1. `GET /products/{id}`

- **Critical path** — the screen can't render without this. Failure → full-screen error with retry.
- **Personalised fields** — `isLikedByMe`, `isBookmarkedByMe`, `merchant.isFollowedByMe`, `likeCount` (when authed).
- **Cache strategy** — TanStack Query staleTime 2min, gcTime 10min. Invalidate on like/bookmark/follow mutations affecting this product. Refetch on `AppState` foreground if data is >2min old (stock may have changed).
- **Pull-to-refresh** — force refetch ignoring staleTime (stock + lead time are time-sensitive).
- **404 handling** — show "This product is no longer available" + back-to-Home CTA. Do NOT crash.

### 2. `GET /products/{id}/similar`

- **Non-blocking** — screen renders without this; carousel section shows a skeleton until it resolves.
- **No personalised fields needed** — similar carousel cards don't expose like/bookmark interactions.
- **Cache strategy** — staleTime 30min (similar items don't churn within a session).

### 3. `GET /cart/summary`

- **For the floating cart badge in the header.** Same conventions as on Home — see [`screens/01-home/api-contract.md`](../01-home/api-contract.md) §5.
- After Add to Cart succeeds, **invalidate this query** (or optimistically increment `itemCount` and let the next mount confirm).

### 4. `PUT/DELETE /products/{id}/like`

- **Optimistic UI** — flip immediately. Revert on 5xx.
- **Cache invalidation** — patch the cached `GET /products/{id}` response with the new `isLikedByMe` + `likeCount` so a back-then-forward navigation doesn't show stale state.
- **Guest** — local-only, queued for sign-in sync. Do NOT hit the API.

### 5. `POST /cart/items`

- **Optimistic badge update** — cart-icon badge `itemCount += 1` immediately on tap. Reconcile from response.
- **Body** — at minimum `{ productId, variantId, quantity }`. Send `quantity: 1` from Product Detail (no quantity selector here — that lives in Cart).
- **409 OUT_OF_STOCK race** — the doc treats this as a recoverable error: toast + refetch product. Critically important — without this branch, a user can add a phantom item and discover it at checkout.
- **Guest** — backend resolves via `X-Cart-Session` header; mobile generates a UUID on first add and stores it in SecureStore (or AsyncStorage).

### 6. `POST /products/{id}/view` 🔴

- **Fire and forget** — no error handling, no spinner.
- **Debounce** — don't fire if the user opened the same product within the last 30s (e.g. tapping a Similar item that bounces back).
- **Purpose** — feeds recommendation engine + merchant analytics ("brand X had 1,242 product views this week").
- **Open question** — does the backend want this as REST `POST` or via a dedicated analytics pipeline (Segment/Posthog/etc.)? See [open-questions §PD-8](../../open-questions.md#pd-8--view-analytics-events).

### 7. `POST /shipping/eta` 🔴

- **Triggered by "When will I get it?" modal.** Modal collects postcode (or uses the user's saved default address if signed in).
- **Body** — `{ productId, variantId, postalCode }`.
- **Response** — `{ minDays, maxDays, options: [{ name, fee, minDays, maxDays }] }`.
- **Spec drafted with the Shipping domain** (parallel work — see [open-questions §PD-5](../../open-questions.md#pd-5--shipping-eta-modal-mechanic)).

---

## Failure modes specific to Product Detail

| Scenario | Mobile behaviour |
|---|---|
| `/products/{id}` fails (network / 5xx) | Full-screen error with retry button. Back navigates as usual. |
| `/products/{id}` returns 404 | "This product is no longer available" + CTA back to Home. |
| `/products/{id}/similar` fails | Hide the Similar Items section entirely — non-essential. |
| `/cart/summary` fails | Hide the cart badge; cart icon still navigates. |
| Add-to-Cart returns 409 OUT_OF_STOCK | Toast + refetch product to refresh size availability. Do NOT add. |
| Add-to-Cart returns 5xx | Toast "Couldn't add to cart. Try again." — DO retry on user tap. Do NOT auto-retry. |
| Like mutation fails | Revert optimistic flip + toast. |
| `/products/{id}/view` fails | Silent — analytics is best-effort. |
| Video media fails to load (corrupt URL / unsupported codec) | Show fallback image (first image in `media[]`) for that carousel slide. |
| User backgrounds during Add-to-Cart | If app comes back foreground and the call resolved, badge reflects the new count. If it errored, the toast is missed but the cart accurately reflects state on the next view. |
| Variant-availability drift mid-screen | Stock changes between mount and add — handled by 409 OUT_OF_STOCK branch above. |
