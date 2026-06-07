# YIIVA Mobile — API Conventions

> Shared conventions for all HTTP endpoints consumed by the YIIVA buyer mobile app.
> Per-screen endpoint specs live in [`screens/<screen>/api-contract.md`](./screens/) and reference this doc rather than redefining the rules.

---

## Base URL

| Environment | Base URL |
|---|---|
| Local (iOS simulator) | `http://localhost:3000` |
| Local (Android emulator) | `http://10.0.2.2:3000` |
| Staging | TBD |
| Production | `https://api.yiiva.co.za` |

All paths in screen-level `api-contract.md` files are relative to the base URL.

---

## Authentication

Protected endpoints expect `Authorization: Bearer <accessToken>` per [`auth-mobile-guide.md`](./auth-mobile-guide.md). The mobile client's `api()` wrapper attaches this automatically; see `lib/api.ts`.

Each endpoint declares one of three auth modes:

| Mode | Meaning |
|---|---|
| **required** | Returns 401 if no valid token |
| **optional** | Endpoint works without a token but returns personalised fields (e.g. `isLikedByMe`) when present |
| **none** | Public endpoint, no token attached |

For **guest-cart endpoints**, see the cart spec — anonymous session is via `X-Cart-Session: <uuid>` header, not the Authorization header.

---

## Response envelope

Successful responses:

```json
{
  "success": true,
  "data": { /* endpoint-specific */ },
  "pagination": { "limit": 20, "offset": 0, "total": 142, "hasMore": true }
}
```

Errors:

```json
{
  "success": false,
  "error": { "code": "PRODUCT_NOT_FOUND", "message": "Product not found" }
}
```

> ⚠️ **Backend decision needed.** The auth endpoints in [`auth-mobile-guide.md`](./auth-mobile-guide.md) §4 return a different shape — `{ accessToken, refreshToken, user }` directly for success, and `{ statusCode, message, error }` for errors. Recommendation: harmonise on the envelope above so the mobile client has one parser. If auth must stay as-is for backwards-compat with the web app, document the split explicitly per endpoint.

---

## Pagination

Two patterns are supported. Each endpoint declares which it uses.

### Offset-based (good for fixed-order lists)

Request: `?limit=20&offset=40`

Response includes:
```json
"pagination": { "limit": 20, "offset": 40, "total": 142, "hasMore": true }
```

### Cursor-based (good for infinite feeds where order can drift)

Request: `?limit=20&cursor=<opaque>`

Response includes:
```json
"pagination": { "limit": 20, "nextCursor": "eyJ...", "hasMore": true }
```

**Recommendation:** use cursor for the home feed and any personalised list; offset for fixed-order data (search results, merchant product list).

---

## Error codes

Standard HTTP status codes plus a machine-readable `error.code`:

| HTTP | Meaning | Common codes |
|---|---|---|
| 400 | Bad request / validation | `VALIDATION_ERROR`, `INVALID_TOKEN`, `INVALID_CURSOR` |
| 401 | Unauthenticated | `AUTH_REQUIRED`, `TOKEN_EXPIRED`, `TOKEN_INVALID` |
| 403 | Forbidden | `ACCOUNT_SUSPENDED`, `ACCOUNT_DEACTIVATED`, `EMAIL_NOT_VERIFIED` |
| 404 | Not found | `PRODUCT_NOT_FOUND`, `MERCHANT_NOT_FOUND`, `ORDER_NOT_FOUND` |
| 409 | Conflict | `EMAIL_TAKEN`, `ALREADY_EXISTS`, `OUT_OF_STOCK` |
| 422 | Unprocessable | `BUSINESS_RULE_VIOLATION` |
| 429 | Rate limited | `RATE_LIMIT_EXCEEDED` |
| 5xx | Server error | `INTERNAL_ERROR`, `UPSTREAM_TIMEOUT` |

Mobile client matches on `error.code` (not on `error.message`) — messages can be displayed to the user, codes are for branching.

---

## Rate limits

Global defaults:
- **Unauthenticated:** 100 requests / minute / IP
- **Authenticated:** 200 requests / minute / user

Per-endpoint overrides are documented inline in each `api-contract.md`. Auth endpoints have their own limits (see `auth-mobile-guide.md` §7).

On `429`, the mobile client surfaces a toast and disables the relevant submit button for 60 seconds. It does **not** auto-retry.

---

## Money & currency

All monetary values are returned as **integer cents** (ZAR cents):

```json
{ "price": 89900, "currency": "ZAR" }   // R899.00
```

Mobile client formats to display by dividing by 100 and prepending `R`.

> ⚠️ **Decision required before payments integration.** Current `lib/api-client.ts` uses `price: number` ambiguously (could be R899.00 or 89900). Lock this in before the checkout work starts — a mid-flight change here causes pricing bugs that are very expensive to debug.

For v1, `currency` is always `"ZAR"`. Backend may omit `currency` if always ZAR; mobile defaults to `"ZAR"` when missing.

---

## Timestamps

All timestamps are **ISO 8601 UTC strings**:

```json
{ "createdAt": "2026-06-04T13:24:00.000Z" }
```

Mobile client converts to local timezone at display.

---

## URLs & media

All image/video URLs in responses must be **absolute** (e.g. `https://cdn.yiiva.co.za/products/abc123.jpg`), not relative paths. The mobile client today translates relative `/demo-assets/...` paths to bundled assets via `lib/local-assets.ts` — that translation disappears once real CDN URLs ship.

Recommendation: a single CDN host (`cdn.yiiva.co.za`) so the mobile client can prefetch / cache with consistent rules.

---

## Personalised fields on list responses

When an endpoint returns a list of products or merchants AND the request is authenticated, each item should include personalised fields so the mobile client doesn't N+1 fetch:

| Field | On | Meaning |
|---|---|---|
| `isLikedByMe` | product | Current user has liked this product |
| `isBookmarkedByMe` | product | Current user has wishlisted this product |
| `merchant.isFollowedByMe` | product → merchant subdoc | Current user follows this product's merchant |
| `isFollowedByMe` | merchant | Current user follows this merchant |

When unauthenticated, these fields may be omitted from the response (mobile treats absent as `false`).

---

## ID format

All resource IDs are **CUID-shaped strings** (e.g. `ck_abc123`). Mobile treats them as opaque — no parsing required, no assumed format beyond "string."

---

## Changelog

| Date | Change |
|---|---|
| 2026-06-04 | Initial draft. Conventions extracted from prior consolidated `api-contract.md`; per-screen contracts now reference this doc. |
