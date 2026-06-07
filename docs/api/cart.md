# YIIVA Mobile — API: Cart

> Canonical specs for cart endpoints.
> Global rules → [`../api-conventions.md`](../api-conventions.md).
> Open questions → [`../open-questions.md`](../open-questions.md) §Cart.

All endpoints in this domain are **🔴 proposed (new)**. Cart is currently entirely client-side in `lib/cart-store.ts` — needs to become server-backed for guest-checkout + cross-device support.

---

## Endpoints

| § | Endpoint | Method | Auth | Used by |
|---|---|---|---|---|
| 1 | `/cart/summary` | GET | optional | Home (badge), every screen with cart icon |
| 2 | `/cart` | GET | optional | Cart screen, Checkout |
| 3 | `/cart/items` | POST | optional | Product Detail (add to cart) |
| 4 | `/cart/items/{itemId}` | PATCH | optional | Cart screen (quantity / size change) |
| 5 | `/cart/items/{itemId}` | DELETE | optional | Cart screen |
| 6 | `/cart` | DELETE | optional | Cart screen (clear all) |

---

## Guest cart sessions

For unauthenticated users (guest browsing → guest checkout), carts are keyed by an anonymous session UUID stored on-device. The mobile client sends this on every cart call:

```
X-Cart-Session: <uuid>
```

The UUID is generated on first add-to-cart and stored in SecureStore (or AsyncStorage — non-sensitive). On login or guest-claim, the backend should reconcile the guest cart into the user's authenticated cart.

When `Authorization: Bearer <token>` is present, the backend uses the user's cart and ignores `X-Cart-Session` (or merges if both are present and the user has no items).

---

## 1. Get cart summary 🔴

Lightweight endpoint for the cart-icon badge on every screen with `YiivaHeader`.

```
GET /cart/summary
```

**Auth:** optional (works for guests via `X-Cart-Session`)

### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "itemCount": 3,
    "subtotal": 247500,
    "currency": "ZAR"
  }
}
```

### Errors

| Status | Code | Cause |
|---|---|---|
| 404 | `CART_NOT_FOUND` | Guest with no session cart yet — mobile treats as `itemCount: 0` |

### Rate limit

Global default. Called frequently — recommend ETag support so 304 responses are cheap.

---

## 2. Get full cart 🔴

```
GET /cart
```

**Auth:** optional (works for guests via `X-Cart-Session`)

### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "cart": {
      "id": "ck_cart_abc",
      "itemCount": 3,
      "subtotal": 219900,
      "currency": "ZAR",
      "items": [
        {
          "id": "ck_cart_item_1",
          "productId": "ck_abc123",
          "variantId": "ck_var_2",
          "name": "Mosadi Snatched Kimono",
          "image": "https://cdn.yiiva.co.za/products/abc123/01.jpg",
          "size": "M",
          "quantity": 1,
          "unitPrice": 89900,
          "lineTotal": 89900,
          "available": true,
          "stockCount": null,
          "priceChanged": false,
          "merchant": {
            "id": "ck_merchant_1",
            "username": "tol_thema",
            "displayName": "Tol'thema"
          }
        }
      ]
    }
  }
}
```

### Field notes

- **`available`** — `false` if the variant is sold out since the item was added. Mobile renders the row with strikethrough + "Sold out" badge.
- **`stockCount`** — current stock for the variant. May be `null` if backend doesn't expose granular stock.
- **`priceChanged`** — `true` if `unitPrice` differs from the price at add-time. Backend tracks the add-time price in the cart item record so it can detect drift.
- **`image`** — static thumbnail (never video). Backend uses the product's `media[0].thumbnail` if media[0] is a video, else `media[0].url`.
- **`subtotal`** — sum of `lineTotal` across all items. Tax and shipping are NOT included — those are computed at Checkout.

### Errors

| Status | Code | Cause |
|---|---|---|
| 404 | `CART_NOT_FOUND` | Guest with no session cart yet — mobile treats as empty cart (200 with `items: []`) is preferred; backend should choose one convention. |
| 401 | `AUTH_REQUIRED` | Should not happen — endpoint is optional auth. |

### Rate limit

Global default. Cart screen calls this on mount, on pull-to-refresh, and on `AppState` foreground.

---

---

## 3. Add item to cart 🔴

```
POST /cart/items
```

**Auth:** optional (works for guests via `X-Cart-Session`)

### Body

```json
{
  "productId": "ck_abc123",
  "variantId": "ck_var_2",
  "quantity": 1
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `productId` | string | yes | |
| `variantId` | string | conditional | Required if the product has variants (`variants.length > 0`). Omit for sizeless products |
| `quantity` | integer | no | Default 1. Max enforced by backend per variant `stockCount` if known |

### Response — 200 OK

Returns the **full updated cart** (so the mobile client can reconcile without a second call):

```json
{
  "success": true,
  "data": {
    "cart": {
      "id": "ck_cart_abc",
      "itemCount": 4,
      "subtotal": 337400,
      "currency": "ZAR",
      "items": [
        {
          "id": "ck_cart_item_1",
          "productId": "ck_abc123",
          "variantId": "ck_var_2",
          "name": "Mosadi Snatched Kimono",
          "image": "https://cdn.yiiva.co.za/products/abc123/01.jpg",
          "size": "S",
          "quantity": 1,
          "unitPrice": 89900,
          "lineTotal": 89900,
          "merchant": {
            "id": "ck_merchant_1",
            "username": "tol_thema",
            "displayName": "Tol'thema"
          }
        }
      ]
    }
  }
}
```

### Field notes

- **`image`** — use the product's `media[0].url` if it's an image, else `media[0].thumbnail` if it's a video. Cart line items render as static thumbnails — never video.
- **`unitPrice` vs `lineTotal`** — both present for client convenience. `lineTotal = unitPrice × quantity`.
- **`merchant` subdoc** — needed so the cart can group line items by merchant when v2 ships multi-merchant checkout.

### Errors

| Status | Code | Cause | Mobile UX |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing `variantId` for a product that requires one, or `quantity < 1` | Toast: "Please select a size" |
| 404 | `PRODUCT_NOT_FOUND` | Unknown `productId` | Toast: "This product is no longer available." Navigate back to Home. |
| 409 | `OUT_OF_STOCK` | Variant `available === false` or `stockCount` insufficient for requested `quantity` | Toast: "Sold out — please choose another size." Refetch `GET /products/{id}` to refresh availability. |
| 401 | `AUTH_REQUIRED` | Should not happen — endpoint is optional auth. If returned, treat as a backend bug. |

### Rate limit

Global default. Burst-friendly.

### Open questions

- See [open-questions §C-2](../open-questions.md#c-2--guest-cart-reconciliation-on-login) — guest-cart reconciliation on login.

---

## 4. Update cart item 🔴

```
PATCH /cart/items/{itemId}
```

**Auth:** optional (works for guests via `X-Cart-Session`)

### Body

```json
{ "quantity": 2 }
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `quantity` | integer | yes | Must be ≥ 1. To remove an item, use `DELETE` (§5), not `quantity: 0` |

### Response — 200 OK

Returns the **full updated cart** (same shape as §2 `GET /cart`).

### Errors

| Status | Code | Cause | Mobile UX |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | `quantity < 1` or missing | Should not occur — mobile validates client-side |
| 404 | `CART_ITEM_NOT_FOUND` | Item already removed (e.g. concurrent delete from another device) | Refetch `GET /cart`, drop the row from the list silently |
| 409 | `OUT_OF_STOCK` | `quantity > available stockCount` | Toast: "Only N available" with the actual stock count from the response. Revert optimistic update. |

### Rate limit

Global default.

---

## 5. Remove cart item 🔴

```
DELETE /cart/items/{itemId}
```

**Auth:** optional (works for guests via `X-Cart-Session`)

### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "cart": { /* full cart, same shape as §2 */ }
  }
}
```

The full updated cart is returned so the mobile client can reconcile the subtotal + item count without a second call.

### Errors

| Status | Code | Cause | Mobile UX |
|---|---|---|---|
| 404 | `CART_ITEM_NOT_FOUND` | Item already removed | Idempotent — treat as success. Refetch optional. |

### Rate limit

Global default.

---

## 6. Clear cart 🔴

```
DELETE /cart
```

**Auth:** optional (works for guests via `X-Cart-Session`)

### Response — 200 OK

```json
{ "success": true, "data": { "cart": { "id": "ck_cart_abc", "itemCount": 0, "subtotal": 0, "currency": "ZAR", "items": [] } } }
```

Returns the empty cart so the mobile client's cache stays consistent.

### Errors

| Status | Code | Cause |
|---|---|---|
| 404 | `CART_NOT_FOUND` | No cart to clear — treat as success |

### Rate limit

Global default. Rarely called from UI; used as post-checkout cleanup if backend doesn't auto-clear on order creation.
