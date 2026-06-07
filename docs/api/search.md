# YIIVA Mobile — API: Search

> Canonical specs for search endpoints.
> Global rules → [`../api-conventions.md`](../api-conventions.md).
> Open questions → [`../open-questions.md`](../open-questions.md) §Search.

---

## Endpoints

| § | Endpoint | Method | Auth | Status | Used by |
|---|---|---|---|---|---|
| 1 | `/search` | GET | optional | 🟡 | Search screen |
| 2 | `/search/category` | GET | optional | 🟡 | Search, Explore |
| 3 | `/search/smart-category` | GET | optional | 🟡 | Explore |
| 4 | `/search/merchant` | GET | optional | 🟡 | Search (when filtering by brand name) |
| 5 | `/search/suggestions` | GET | none | 🔴 | Search screen (Trending + autocomplete) |
| 6 | `/search/track` | POST | optional | 🔴 | Search screen (analytics) |

Status: ✅ implemented · 🟡 proposed (already in `lib/api-client.ts`) · 🔴 proposed (new)

---

## Shared response shape

All four search endpoints (§1-§4) return the same shape — a paginated product list. Mobile renders all of them through the same component.

```json
{
  "success": true,
  "data": {
    "products": [ /* full Product objects, same as /products/feed */ ]
  },
  "pagination": { "limit": 20, "nextCursor": "eyJ...", "hasMore": true }
}
```

Personalised fields (`isLikedByMe`, etc.) follow the standard rules in [`../api-conventions.md`](../api-conventions.md) §Personalised fields.

---

## 1. Universal search 🟡

The default search endpoint used by the Search screen. Searches across product name, category, clothingType, smartCategories, and merchant name.

```
GET /search
```

**Auth:** optional

### Query params

| Name | Type | Required | Notes |
|---|---|---|---|
| `q` | string | yes | Min length 1 (or 2 — see [open-questions §SR-3](../open-questions.md#sr-3--minimum-query-length)) |
| `genderType` | `"women" \| "men" \| "unisex"` | no | When set, only returns products matching that gender |
| `category` | string | no | Optional category-slug filter |
| `limit` | integer | no | Default 20, max 50 |
| `cursor` | string | no | Cursor pagination |

### Response — 200 OK

Shared shape above.

### Errors

| Status | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `q` missing or too short |
| 429 | `RATE_LIMIT_EXCEEDED` | |

### Rate limit

Standard (200/min authed, 100/min unauthed).

### Open questions

See [open-questions §SR-1 through §SR-10](../open-questions.md#search-screen---product--ux--backend-questions) for ranking, gender filtering, merchant inclusion, and analytics.

---

## 2. Search by category 🟡

Narrower scope — searches only category + clothingType fields.

```
GET /search/category
```

**Auth:** optional

### Query params

| Name | Type | Required |
|---|---|---|
| `category` | string | yes |
| `genderType` | string | no |
| `limit` | integer | no |
| `cursor` | string | no |

### Response — 200 OK

Shared shape.

### Rate limit

Standard.

---

## 3. Search by smart category 🟡

Narrows to AI-generated `smartCategory1-3` tags.

```
GET /search/smart-category
```

**Auth:** optional

### Query params

| Name | Type | Required |
|---|---|---|
| `smartCategory` | string | yes |
| `genderType` | string | no |
| `limit` | integer | no |
| `cursor` | string | no |

### Response — 200 OK

Shared shape.

---

## 4. Search by merchant name 🟡

For users who type a brand name and want product results from that brand.

```
GET /search/merchant
```

**Auth:** optional

### Query params

| Name | Type | Required |
|---|---|---|
| `merchantName` | string | yes |
| `genderType` | string | no |
| `limit` | integer | no |
| `cursor` | string | no |

### Response — 200 OK

Shared shape.

---

## 5. Search suggestions 🔴

Trending queries + (optionally) autocomplete for the current `q`.

```
GET /search/suggestions
```

**Auth:** none

### Query params

| Name | Type | Required | Notes |
|---|---|---|---|
| `q` | string | no | When provided, response includes autocomplete `suggestions[]` |

### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "trending": [
      "#HandmadeArt",
      "#LocalArtists",
      "kimono",
      "streetwear"
    ],
    "suggestions": [
      "kimono dress",
      "kimono set"
    ]
  }
}
```

### Field notes

- **`trending[]`** — admin-curated or algorithmic (see [open-questions §SR-2](../open-questions.md#sr-2--trending-tags-source)). Mix of hashtag-style tags and plain queries.
- **`suggestions[]`** — only present when `q` is in the request. Used for in-search autocomplete (TBD — not in mobile UI yet).

### Errors

Standard.

### Rate limit

Standard. Response is highly cacheable; `Cache-Control: public, max-age=3600` recommended for the trending portion.

---

## 6. Track search query 🔴

Optional analytics signal — records that a user performed a search. Feeds ranking improvements.

```
POST /search/track
```

**Auth:** optional

### Body

```json
{
  "q": "kimono",
  "genderType": "women",
  "resultCount": 12
}
```

### Response — 204 No Content

### Errors

Mobile ignores all errors on this endpoint.

### Rate limit

Standard. Mobile debounces — only tracks the *settled* query, not every keystroke.

### Open question

Backend may prefer routing this through a dedicated analytics pipeline. See [§PD-8](../open-questions.md#pd-8--view-analytics-events) for the same question applied to product views.
