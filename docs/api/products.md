# YIIVA Mobile — API: Products

> Canonical specs for product-related endpoints. Referenced by per-screen `api-contract.md` files in [`../screens/`](../screens/).
> Global rules (envelope, pagination, error codes, money, timestamps) → [`../api-conventions.md`](../api-conventions.md).
> All open questions about these endpoints → [`../open-questions.md`](../open-questions.md) §Products.

---

## Endpoints

| § | Endpoint | Method | Auth | Status | Used by |
|---|---|---|---|---|---|
| 1 | `/products/feed` | GET | optional | 🟡 | Home |
| 2 | `/products/new-arrivals` | GET | optional | 🟡 | Home |
| 3 | `/products/featured` | GET | optional | 🟡 | TBD (Explore) |
| 4 | `/products/{id}` | GET | optional | 🟡 | Product Detail, Cart |
| 5 | `/products/{id}/similar` | GET | optional | 🟡 | Product Detail |
| 6 | `/products/{id}/view` | POST | optional | 🔴 | Product Detail (analytics) |

Status: ✅ implemented · 🟡 proposed (already in `lib/api-client.ts`) · 🔴 proposed (new)

---

## 1. Get product feed 🟡

The gender-filtered, paginated main grid. Infinite scroll-friendly.

```
GET /products/feed
```

**Auth:** optional (personalised fields included when authenticated — see [`../api-conventions.md`](../api-conventions.md) §Personalised fields)

### Query params

| Name | Type | Required | Notes |
|---|---|---|---|
| `genderType` | `"women" \| "men" \| "unisex"` | yes | |
| `category` | string | no | Slug from `/categories` |
| `limit` | integer | no | Default 20, max 50 |
| `cursor` | string | no | Cursor pagination (preferred) |
| `offset` | integer | no | Offset pagination (alternative) |

### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "ck_abc123",
        "name": "Mosadi Snatched Kimono",
        "price": 89900,
        "currency": "ZAR",
        "primaryImage": "https://cdn.yiiva.co.za/products/abc123/cover.jpg",
        "merchant": {
          "id": "ck_merchant_1",
          "username": "tol_thema",
          "displayName": "Tol'thema",
          "logo": "https://cdn.yiiva.co.za/merchants/tol_thema/logo.png",
          "isVerified": true,
          "isFollowedByMe": false
        },
        "category": "outerwear",
        "clothingType": "kimono",
        "genderType": "women",
        "isLikedByMe": false,
        "isBookmarkedByMe": true
      }
    ]
  },
  "pagination": { "limit": 20, "nextCursor": "eyJpZCI6...", "hasMore": true }
}
```

### Errors

| Status | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Bad `genderType`, `limit > 50` |
| 400 | `INVALID_CURSOR` | Cursor expired or from a different query shape |
| 429 | `RATE_LIMIT_EXCEEDED` | |

### Rate limit

Global default.

---

## 2. Get new arrivals 🟡

```
GET /products/new-arrivals
```

**Auth:** optional

### Query params

| Name | Type | Required | Notes |
|---|---|---|---|
| `genderType` | `"women" \| "men" \| "unisex"` | yes | |
| `limit` | integer | no | Default 6, max 20 |

### Response — 200 OK

Carousel-shaped product items (lighter than feed):

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "ck_xyz",
        "name": "Eye Knitted Golfer",
        "price": 65000,
        "currency": "ZAR",
        "image": "https://cdn.yiiva.co.za/products/xyz/cover.jpg",
        "merchant": { "displayName": "SUHU" }
      }
    ]
  }
}
```

### Errors

Standard. Empty result is 200 with `products: []` (no 404).

### Rate limit

Global default.

---

## 3. Get featured products 🟡

```
GET /products/featured
```

**Auth:** optional · **Used by:** TBD

Full spec drafted when the Explore screen doc lands. Shape mirrors `/products/new-arrivals` (carousel items, no gender filter, random selection of `limit` items).

---

## 4. Get product detail 🟡

```
GET /products/{productId}
```

**Auth:** optional (personalised fields included when authenticated)

### Path params

| Name | Type |
|---|---|
| `productId` | string (CUID) |

### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "product": {
      "id": "ck_abc123",
      "name": "Mosadi Snatched Kimono",
      "description": "A flowing kimono inspired by Venda heritage textiles, hand-finished in Cape Town.",
      "price": 89900,
      "currency": "ZAR",
      "category": "outerwear",
      "clothingType": "kimono",
      "genderType": "women",
      "smartCategories": ["heritage", "minimalist"],
      "inventoryType": "made_to_order",
      "leadTime": { "minDays": 14, "maxDays": 21, "displayText": "2-3 weeks" },
      "variants": [
        { "id": "ck_var_1", "size": "XS", "sku": "MOS-KIM-XS", "available": true, "stockCount": 3 },
        { "id": "ck_var_2", "size": "S",  "sku": "MOS-KIM-S",  "available": true, "stockCount": null },
        { "id": "ck_var_3", "size": "M",  "sku": "MOS-KIM-M",  "available": false, "stockCount": 0 },
        { "id": "ck_var_4", "size": "L",  "sku": "MOS-KIM-L",  "available": true, "stockCount": null },
        { "id": "ck_var_5", "size": "XL", "sku": "MOS-KIM-XL", "available": true, "stockCount": null }
      ],
      "stock": { "available": true },
      "media": [
        { "type": "video", "url": "https://cdn.yiiva.co.za/products/abc123/hero.mp4", "thumbnail": "https://cdn.yiiva.co.za/products/abc123/hero-thumb.jpg" },
        { "type": "image", "url": "https://cdn.yiiva.co.za/products/abc123/01.jpg" },
        { "type": "image", "url": "https://cdn.yiiva.co.za/products/abc123/02.jpg" }
      ],
      "merchant": {
        "id": "ck_merchant_1",
        "username": "tol_thema",
        "displayName": "Tol'thema",
        "logo": "https://cdn.yiiva.co.za/merchants/tol_thema/logo.png",
        "isVerified": true,
        "bio": "Heritage textiles, reimagined.",
        "location": "Cape Town",
        "isFollowedByMe": false
      },
      "isLikedByMe": false,
      "isBookmarkedByMe": true,
      "likeCount": 142,
      "returnPolicy": { "windowDays": 30, "type": "free_exchange_or_return", "displayText": "Free exchange or return within 30 days" }
    }
  }
}
```

### Field notes

- **`variants`** — array of size/variant objects. If the product has no sizes (e.g. an accessory), return `variants: []` (mobile hides the size selector). See [open-questions §P-7](../open-questions.md#p-7--product-variants--sizes--stock).
- **`stock.available`** — convenience flag: `true` if any variant is available. Mobile uses this to gate "SOLD OUT" UI when no sizes are usable.
- **`stockCount`** — optional. When present and ≤5, mobile may show "Only 3 left" affordance. When `null`, mobile shows nothing. Backend may always return `null` for v1 if low-stock urgency UX is out of scope.
- **`inventoryType`** — `"in_stock" | "made_to_order" | "preorder"`. Drives the bottom-bar label (e.g. "PRE-ORDER · R899.00").
- **`leadTime`** — present and non-null when `inventoryType !== "in_stock"`. Displayed near the price.
- **`media[0]`** — recommend it's the canonical cover. If `media[0].type === "video"`, also include `thumbnail` so the cart can use a static image for its line items.
- **`smartCategories`** — used to drive better Similar Items ranking on v2.
- **`likeCount`** — public count. Cached client-side via TanStack Query; updated by the response of `PUT/DELETE /products/{id}/like`.

### Errors

| Status | Code | Cause |
|---|---|---|
| 404 | `PRODUCT_NOT_FOUND` | Unknown `productId`, product is unpublished, or product is deleted |
| 410 | `PRODUCT_REMOVED` | Optional — distinguish "deleted" from "not found" if backend tracks soft-deletion |

### Rate limit

Global default.

---

## 5. Get similar products 🟡

```
GET /products/{productId}/similar
```

**Auth:** optional

### Path params

| Name | Type |
|---|---|
| `productId` | string |

### Query params

| Name | Type | Required | Notes |
|---|---|---|---|
| `limit` | integer | no | Default 6, max 20 |

### Response — 200 OK

Carousel-shaped product items (lighter than full product):

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "ck_xyz",
        "name": "Lufuno Set",
        "price": 120000,
        "currency": "ZAR",
        "image": "https://cdn.yiiva.co.za/products/xyz/cover.jpg",
        "merchant": { "displayName": "Tol'thema" }
      }
    ]
  }
}
```

### Errors

| Status | Code | Cause |
|---|---|---|
| 404 | `PRODUCT_NOT_FOUND` | Unknown `productId` |

### Rate limit

Global default.

---

## 6. Record product view 🔴

Analytics signal — records that the current user (or anonymous session) viewed a product. Feeds recommendation engines and merchant analytics.

```
POST /products/{productId}/view
```

**Auth:** optional (anonymous views recorded via `X-Cart-Session` UUID; authed views attached to the user)

### Body

None (empty body — the productId is in the path, the actor is inferred from headers).

### Response — 204 No Content

Backend should return 204 (no body) to keep this call cheap. Mobile fires and forgets.

### Errors

Mobile ignores all errors on this endpoint — it's best-effort analytics.

### Rate limit

Standard. Mobile debounces: a given productId is sent at most once per 30s per session.

### Open question

Backend may prefer routing this through a dedicated analytics pipeline (Segment, PostHog, Mixpanel) rather than a REST endpoint. See [open-questions §PD-8](../open-questions.md#pd-8--view-analytics-events).
