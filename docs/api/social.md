# YIIVA Mobile — API: Social (Likes, Bookmarks, Follows)

> Canonical specs for social-action endpoints.
> Global rules → [`../api-conventions.md`](../api-conventions.md).
> Open questions → [`../open-questions.md`](../open-questions.md) §Social.

All endpoints in this domain are **🔴 proposed (new)**. Currently held entirely client-side in `lib/social-store.ts` — needs to become server-backed for cross-device + signed-in persistence.

---

## Endpoints

| § | Endpoint | Method | Auth | Used by |
|---|---|---|---|---|
| 1 | `/products/{productId}/like` | PUT, DELETE | required | Home, Product Detail, Search, Merchant Profile, Wishlist |
| 2 | `/products/{productId}/bookmark` | PUT, DELETE | required | Home, Product Detail, Search, Merchant Profile, Wishlist |
| 3 | `/merchants/{merchantId}/follow` | PUT, DELETE | required | Home (Trending Brands), Merchant Profile, Explore |
| 4 | `/me/bookmarks` | GET | required | Wishlist |
| 5 | `/me/likes` | GET | required | Account / Settings (TBD) |
| 6 | `/me/follows` | GET | required | Account / Settings (TBD) |

---

## Idempotency contract (applies to §1, §2, §3)

`PUT` and `DELETE` are **idempotent**. Backend behaviour:

- `PUT` on an already-liked/bookmarked/followed resource → 200 OK, no-op, response reflects current state
- `DELETE` on a not-liked/bookmarked/followed resource → 200 OK, no-op, response reflects current state

We deliberately rejected a single `POST /toggle` endpoint — two concurrent taps with toggle semantics can land in opposite states from what the user intended. `PUT`/`DELETE` are safe to retry on flaky networks.

---

## 1. Like / unlike a product 🔴

```
PUT    /products/{productId}/like     → like
DELETE /products/{productId}/like     → unlike
```

**Auth:** required

### Response — 200 OK

```json
{ "success": true, "data": { "liked": true, "likeCount": 143 } }
```

### Errors

| Status | Code | Cause |
|---|---|---|
| 404 | `PRODUCT_NOT_FOUND` | Unknown `productId` |
| 401 | `AUTH_REQUIRED` | No session — mobile opens login modal |

### Rate limit

Global default. Burst-friendly.

---

## 2. Bookmark / unbookmark a product ✅

> Implemented in nuwa: `PUT/DELETE /api/products/{productId}/bookmark`
> (= WishlistItem). Idempotent.

```
PUT    /products/{productId}/bookmark    → bookmark
DELETE /products/{productId}/bookmark    → unbookmark
```

**Auth:** required

### Response — 200 OK

```json
{ "success": true, "data": { "bookmarked": true } }
```

No `bookmarkCount` — bookmarks are private to the user, not a public metric.

### Errors / rate limit

Same as Like.

---

## 3. Follow / unfollow a merchant ✅

> Implemented in nuwa: `PUT/DELETE /api/merchants/{merchantId}/follow`
> (= StoreFollower; `merchantId` is the Store id). Idempotent; returns updated
> `followerCount`. `CANNOT_FOLLOW_SELF` (409) when the user owns the store.
> Note: §1 Like is NOT implemented — likes stay local-only on maya for v1.

```
PUT    /merchants/{merchantId}/follow    → follow
DELETE /merchants/{merchantId}/follow    → unfollow
```

**Auth:** required

### Response — 200 OK

```json
{ "success": true, "data": { "following": true, "followerCount": 17202 } }
```

### Errors

| Status | Code | Cause |
|---|---|---|
| 404 | `MERCHANT_NOT_FOUND` | Unknown `merchantId` |
| 401 | `AUTH_REQUIRED` | No session |
| 409 | `CANNOT_FOLLOW_SELF` | Merchant user trying to follow their own merchant account |

### Rate limit

Global default.

---

## 4. List my bookmarks ✅

> **Implemented in nuwa: `GET /api/me/bookmarks`** (auth-required). Lists
> `WishlistItem`s as the bookmark wrapper; `product` is the standard feed card +
> an `available` flag (computed from stock; inactive/sold-out kept with
> `available: false` per WL-11). **`priceChanged` is always `false` + `priceAtBookmark`
> = the current price** — `WishlistItem` has no add-time price yet (same v1
> limitation as the cart). Cursor-paginated. **Sort: `newest`/`oldest` only in
> v1** (`price_asc`/`price_desc`/`merchant` accepted but deferred to v2).

```
GET /me/bookmarks
```

**Auth:** required

### Query params

| Name | Type | Required | Notes |
|---|---|---|---|
| `limit` | integer | no | Default 20, max 50 |
| `cursor` | string | no | Cursor pagination |
| `sort` | `"newest" \| "oldest" \| "price_asc" \| "price_desc" \| "merchant"` | no | Default `"newest"` (most recently bookmarked first) |

### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "bookmarks": [
      {
        "bookmarkedAt": "2026-06-03T14:20:00.000Z",
        "priceChanged": false,
        "priceAtBookmark": 89900,
        "product": {
          "id": "ck_abc123",
          "name": "Mosadi Snatched Kimono",
          "price": 89900,
          "currency": "ZAR",
          "primaryImage": "https://cdn.yiiva.co.za/products/abc123/cover.jpg",
          "available": true,
          "merchant": {
            "id": "ck_merchant_1",
            "username": "tol_thema",
            "displayName": "Tol'thema",
            "logo": "https://cdn.yiiva.co.za/merchants/tol_thema/logo.png",
            "isVerified": true,
            "isFollowedByMe": false
          },
          "isLikedByMe": false,
          "isBookmarkedByMe": true
        }
      }
    ]
  },
  "pagination": { "limit": 20, "nextCursor": "eyJ...", "hasMore": true }
}
```

### Field notes

- **Wrapper shape** — each list item is `{ bookmarkedAt, priceChanged, priceAtBookmark, product }`, not just a Product. The wrapper carries bookmark-specific metadata that doesn't belong on the product itself.
- **`bookmarkedAt`** — ISO timestamp. Mobile formats relative time at display ("Saved 2 days ago").
- **`priceChanged`** — `true` when `product.price !== priceAtBookmark`. Mobile uses this to show a "Price dropped" / "Price increased" affordance. Backend computes; mobile renders.
- **`priceAtBookmark`** — the price at the moment the bookmark was created, in ZAR cents. Used in the price-change copy ("was R1,100, now R899").
- **`product.available`** — `false` for sold-out / unavailable items. Mobile renders with strikethrough + Unavailable badge; user can remove.
- **Hard-deleted products** — filtered server-side. Bookmarks referencing deleted products are silently removed from the response.

### Errors

Standard auth errors.

### Rate limit

Standard.

### Open questions

- See [open-questions §WL-3, §WL-6, §WL-11](../open-questions.md#wishlist-screen---product--ux--backend-questions).

---

## 5. List my likes 🔴

```
GET /me/likes
```

**Auth:** required · **Used by:** Account / Settings (TBD)

Full spec TBD.

---

## 6. List my follows 🔴

```
GET /me/follows
```

**Auth:** required · **Used by:** Account / Settings (TBD)

Full spec TBD. Returns merchants the user follows.
