# YIIVA Mobile — API: Merchants

> Canonical specs for merchant-related endpoints. Referenced by per-screen `api-contract.md` files in [`../screens/`](../screens/).
> Global rules → [`../api-conventions.md`](../api-conventions.md).
> Open questions → [`../open-questions.md`](../open-questions.md) §Merchants.

---

## Endpoints

| § | Endpoint | Method | Auth | Status | Used by |
|---|---|---|---|---|---|
| 1 | `/merchants/trending` | GET | optional | ✅ | Home |
| 2 | `/merchants/{username}` | GET | optional | ✅ | Merchant Profile |
| 3 | `/merchants/{username}/products` | GET | optional | ✅ | Merchant Profile |
| 4 | `/merchants` | GET | optional | ✅ | Shop tab (A–Z brand directory) |

Status: ✅ implemented · 🟡 proposed (already in `lib/api-client.ts`) · 🔴 proposed (new)

---

## 1. Get trending merchants ✅

> Implemented in nuwa: `GET /api/merchants/trending`. v1 heuristic = ACTIVE
> stores by `followerCount` (Phalo replaces later). `username` = `Store.slug`;
> `isVerified` always true (buyer-visible stores are go-live/verified).

```
GET /merchants/trending
```

**Auth:** optional (returns `isFollowedByMe` when authed)

### Query params

| Name | Type | Required | Notes |
|---|---|---|---|
| `genderType` | string | no | When set, only returns merchants whose catalogue contains products in that gender |
| `limit` | integer | no | Default 10, max 30 |

### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "merchants": [
      {
        "id": "ck_merchant_1",
        "username": "tol_thema",
        "displayName": "Tol'thema",
        "logo": "https://cdn.yiiva.co.za/merchants/tol_thema/logo.png",
        "followerCount": 17201,
        "isVerified": true,
        "isFollowedByMe": false
      }
    ]
  }
}
```

### Errors

Standard.

### Rate limit

Global default. Response is cacheable — recommend `Cache-Control: public, max-age=300` (5min) if the ranking signal updates that often, or `max-age=86400` (daily) if admin-curated.

---

## 2. Get merchant by username ✅

> **Implemented in nuwa: `GET /api/merchants/:username`** (`username` = Store
> slug). `heroMedia` ← `StoreBannerMedia` (ordered); `bio` ← store description;
> `location` ← first public StoreAddress city (null if none); `contact.email` ←
> `store.contactEmail`; `postCount` = ACTIVE product count; `isVerified` = true
> for ACTIVE stores. **`messagingEnabled` is always `true` in v1** (no per-store
> toggle; Chat backend is Screen 12). `followingCount` = 0 (MP-1).
> **Status handling (MP-10):** ACTIVE → full profile; SUSPENDED/CLOSED → returned
> WITH `status` (maya shows the unavailable placeholder); never-live stores
> (DRAFT/PENDING/APPROVED/PENDING_GO_LIVE) → `404 MERCHANT_NOT_FOUND`.
> Merchant view tracking (`POST /api/merchants/:id/view`, thin AnalyticsEvent →
> Phalo) is also implemented.

```
GET /merchants/{username}
```

**Auth:** optional (returns `isFollowedByMe` when authenticated)

### Path params

| Name | Type |
|---|---|
| `username` | string (lowercase, hyphens/underscores allowed) |

### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "merchant": {
      "id": "ck_merchant_1",
      "username": "tol_thema",
      "displayName": "Tol'thema",
      "logo": "https://cdn.yiiva.co.za/merchants/tol_thema/logo.png",
      "heroMedia": [
        "https://cdn.yiiva.co.za/merchants/tol_thema/hero_1.mp4",
        "https://cdn.yiiva.co.za/merchants/tol_thema/hero_2.mp4",
        "https://cdn.yiiva.co.za/merchants/tol_thema/hero_3.mp4"
      ],
      "bio": "Heritage textiles, reimagined.",
      "location": "Cape Town",
      "isVerified": true,
      "status": "ACTIVE",
      "followerCount": 17201,
      "followingCount": 0,
      "postCount": 42,
      "isFollowedByMe": false,
      "messagingEnabled": true,
      "contact": {
        "email": "hello@tolthema.co.za"
      }
    }
  }
}
```

### Field notes

- **`heroMedia[]`** — ordered list of absolute CDN URLs. Mix of images and videos; mobile detects type from extension (`.mp4` → video).
- **`status`** values: `"ACTIVE" | "SUSPENDED" | "DEACTIVATED" | "CLOSED" | "PENDING_REVIEW"`. Mobile renders the suspended placeholder for anything other than `ACTIVE`. See [open-questions §MP-10](../open-questions.md#mp-10--suspended-deactivated-merchant-response).
- **`contact.email`** — may be `null` if merchant hasn't published one. Mobile hides the Email option in the Contact modal when null.
- **`messagingEnabled`** — boolean. When `false`, mobile hides the Message option (e.g. merchant doesn't want DMs).
- **`postCount`** — total products in the catalogue.
- **No `email` exposed at the top level** (deprecation of the field currently in `lib/api-client.ts:115`) — moved under `contact.email`. See [M-4](../open-questions.md#m-4--email-on-public-merchant-profile).

### Errors

| Status | Code | Cause |
|---|---|---|
| 404 | `MERCHANT_NOT_FOUND` | Unknown username, or merchant is hard-deleted |

### Rate limit

Global default.

---

## 3. Get merchant products ✅

> **Implemented in nuwa: `GET /api/merchants/:username/products`** — reuses the
> shared feed-grid query (same product card shape, cursor pagination,
> personalised flags). `categories[]` = distinct **category slugs** across the
> store's ACTIVE products; `clothingType` filters by category slug/name. **Sort
> is `newest` only in v1** — price sorts (MP-7) need cursor-on-price, deferred to
> v2 (the `sort` param is accepted but ignored beyond newest). 404 if the store
> isn't ACTIVE.

```
GET /merchants/{username}/products
```

**Auth:** optional (personalised fields when authed)

### Query params

| Name | Type | Required | Notes |
|---|---|---|---|
| `clothingType` | string | no | Filter to a specific category (e.g. `"kimono"`) |
| `limit` | integer | no | Default 20, max 50 |
| `cursor` | string | no | Cursor pagination |
| `sort` | `"newest" \| "price_asc" \| "price_desc"` | no | Default `"newest"`. See [MP-7](../open-questions.md#mp-7--product-sort-order) |

### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "products": [ /* full Product objects, same as /products/feed */ ],
    "categories": ["kimono", "shirt", "dress", "set"]
  },
  "pagination": { "limit": 20, "nextCursor": "eyJ...", "hasMore": true }
}
```

### Field notes

- **`categories[]`** — distinct `clothingType` values across this merchant's catalogue. Drives the category tab rail on Merchant Profile. "All" is prepended client-side.
- **Always returned** — even when `clothingType` is set in the query (so the tab rail stays stable as the user filters).
- **Personalised fields** — `isLikedByMe`, `isBookmarkedByMe`, `merchant.isFollowedByMe` per the standard rules.

### Errors

| Status | Code | Cause |
|---|---|---|
| 404 | `MERCHANT_NOT_FOUND` | Unknown username |

### Rate limit

Global default.

---

## 4. List merchants (A–Z directory) ✅

> **Implemented in nuwa: `GET /api/merchants`** — ACTIVE stores, optional
> `genderType` (brands with ≥1 product in that gender) + `letter` filters,
> `sort` (name_asc default / name_desc / newest / popularity), cursor-paginated.
> Cards are the lighter directory shape (no bio/heroMedia) with `productCount`
> (ACTIVE products) and `isFollowedByMe` when authed. `lettersWithBrands[]` is
> computed across the whole gender-filtered set for the alphabet index. (v1
> loads all matching names to build the letter set — fine at current scale;
> precompute if the brand count grows large.)

```
GET /merchants
```

**Auth:** optional (returns `isFollowedByMe` when authenticated)

### Query params

| Name | Type | Required | Notes |
|---|---|---|---|
| `genderType` | `"women" \| "men" \| "unisex"` | no | When set, only returns merchants with at least one product in that gender |
| `letter` | string (1 char) | no | Filter to merchants whose `displayName` starts with this letter |
| `limit` | integer | no | Default 100, max 500 |
| `cursor` | string | no | Cursor pagination |
| `sort` | `"name_asc" \| "name_desc" \| "newest" \| "popularity"` | no | Default `"name_asc"` |

### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "merchants": [
      {
        "id": "ck_merchant_1",
        "username": "tol_thema",
        "displayName": "Tol'thema",
        "logo": "https://cdn.yiiva.co.za/merchants/tol_thema/logo.png",
        "isVerified": true,
        "followerCount": 17201,
        "productCount": 42,
        "isFollowedByMe": false
      }
    ],
    "lettersWithBrands": ["A", "B", "C", "D", "M", "S", "T", "V"]
  },
  "pagination": { "limit": 100, "nextCursor": "eyJ...", "hasMore": true }
}
```

### Field notes

- **Merchant items here are lighter** than the full profile from §2 — no `bio`, `heroMedia`, etc. Just what the directory rows need.
- **`lettersWithBrands[]`** — first letters that have at least one brand in the filtered set. Mobile uses this to grey out letters in the alphabet index that have no brands (so the user doesn't tap a dead letter).
- **Default sort = `name_asc`** — alphabetical by `displayName`. Mobile relies on this for the grouped-by-letter rendering.

### Errors

| Status | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Bad `genderType` or `letter` |

### Rate limit

Global default. Highly cacheable for `name_asc` sort.
