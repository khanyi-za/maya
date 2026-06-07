# YIIVA Mobile — API: Categories

> Canonical specs for category and smart-category endpoints.
> Global rules → [`../api-conventions.md`](../api-conventions.md).
> Open questions → [`../open-questions.md`](../open-questions.md) §Categories.

---

## Endpoints

| § | Endpoint | Method | Auth | Status | Used by |
|---|---|---|---|---|---|
| 1 | `/categories` | GET | none | 🔴 | Home (chip rail), Shop tab (categories grid) |
| 2 | `/smart-categories` | GET | none | 🔴 | TBD (Explore, Search) |

Status: 🔴 proposed (new — currently hard-coded in mobile)

---

## 1. List categories 🔴

```
GET /categories
```

**Auth:** none

### Query params

| Name | Type | Required | Notes |
|---|---|---|---|
| `genderType` | `"women" \| "men" \| "unisex"` | yes | Different category sets per gender |

### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "slug": "shoes",
        "displayName": "Shoes",
        "image": "https://cdn.yiiva.co.za/categories/women/shoes.png",
        "productCount": 142,
        "order": 1
      }
    ]
  }
}
```

### Field notes

- `slug` is the value passed to `/products/feed?category=<slug>`.
- `image` is used in chip thumbnails on Home and tile imagery on the Shop tab.
- `productCount` is optional (display only).
- `order` is admin-controlled for stable client-side rendering.

### Errors

| Status | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Bad `genderType` |

### Rate limit

Global default. Highly cacheable — recommend `Cache-Control: public, max-age=3600`.

---

## 2. List smart categories 🔴

```
GET /smart-categories
```

**Auth:** none · **Used by:** TBD (Explore, Search)

Full spec drafted with the Explore screen doc. Smart categories are the AI-generated tags (`smartCategory1-3`) referenced in `lib/api-client.ts` search endpoints.
