# YIIVA Mobile — API: Shipping

> Canonical specs for shipping endpoints.
> Global rules → [`../api-conventions.md`](../api-conventions.md).
> Open questions → [`../open-questions.md`](../open-questions.md) §Shipping.

All endpoints in this domain are **🔴 proposed (new)** and depend on the ShipLogic / Courier Guy backend integration.

---

## Endpoints

| § | Endpoint | Method | Auth | Used by |
|---|---|---|---|---|
| 1 | `/shipping/rates` | POST | optional | Checkout (Delivery selected) |
| 2 | `/shipping/pickup-locations` | GET | optional | Checkout (Pickup selected) |
| 3 | `/shipping/eta` | POST | optional | Product Detail ("When will I get it?" modal) |

---

## 1. Get shipping rates 🔴

Returns courier rate options for a given cart + destination.

```
POST /shipping/rates
```

**Auth:** optional (works for guests via `X-Cart-Session`)

### Body

```json
{
  "items": [
    { "productId": "ck_abc123", "variantId": "ck_var_2", "quantity": 1 },
    { "productId": "ck_xyz", "variantId": "ck_var_3", "quantity": 2 }
  ],
  "destination": {
    "postalCode": "8001",
    "country": "ZA"
  }
}
```

Backend may also accept `addressId` instead of inline `destination` when the user is signed-in.

### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "rates": [
      {
        "id": "ck_rate_std",
        "name": "Standard delivery",
        "courier": "Courier Guy",
        "fee": 6500,
        "currency": "ZAR",
        "minDays": 3,
        "maxDays": 5,
        "recommended": true
      },
      {
        "id": "ck_rate_exp",
        "name": "Express delivery",
        "courier": "Courier Guy",
        "fee": 12000,
        "currency": "ZAR",
        "minDays": 1,
        "maxDays": 2,
        "recommended": false
      }
    ]
  }
}
```

### Field notes

- **`recommended: true`** — mobile pre-selects this rate. Backend marks the cheapest or the merchant-preferred option.
- **Empty `rates` array** — means no shipping is available to the destination. Mobile forces Pickup with a banner.
- **`fee` is in ZAR cents** per [`../api-conventions.md`](../api-conventions.md) §Money.

### Errors

| Status | Code | Cause | Mobile UX |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing `items` or `destination` | Should not occur |
| 422 | `INVALID_POSTAL_CODE` | Postcode doesn't exist | Toast: "We don't recognise this postcode. Check the address." |

### Rate limit

20 / minute / user. Mobile may re-call this every time the address changes — debounce client-side.

### Open questions

- See [open-questions §SH-1](../open-questions.md#sh-1--multi-merchant-shipping-rates), §SH-2.

---

## 2. List pickup locations 🔴

Returns Courier Guy pickup points near a postcode or coordinate.

```
GET /shipping/pickup-locations
```

**Auth:** optional

### Query params

| Name | Type | Required | Notes |
|---|---|---|---|
| `postalCode` | string | conditional | One of `postalCode` or `lat`+`lng` required |
| `lat` | number | conditional | |
| `lng` | number | conditional | |
| `limit` | integer | no | Default 10, max 50 |

### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "locations": [
      {
        "id": "ck_pickup_1",
        "name": "Canal Walk Shopping Centre",
        "address": "Century Blvd, Century City, Cape Town, 7441",
        "hours": "Mon-Sat: 9AM-9PM, Sun: 9AM-7PM",
        "distanceKm": 2.5,
        "lat": -33.8923,
        "lng": 18.5142
      }
    ]
  }
}
```

### Errors

| Status | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | No `postalCode` and no `lat`/`lng` |

### Rate limit

Standard. Response is cacheable — `Cache-Control: public, max-age=3600` recommended.

---

## 3. Get shipping ETA 🔴

For the "When will I get it?" modal on Product Detail.

```
POST /shipping/eta
```

**Auth:** optional

### Body

```json
{
  "productId": "ck_abc123",
  "variantId": "ck_var_2",
  "postalCode": "8001"
}
```

### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "eta": {
      "minDays": 3,
      "maxDays": 5,
      "displayText": "3-5 business days to Cape Town (8001)"
    },
    "options": [
      { "name": "Standard delivery", "fee": 6500, "minDays": 3, "maxDays": 5 },
      { "name": "Express delivery",  "fee": 12000, "minDays": 1, "maxDays": 2 }
    ]
  }
}
```

### Field notes

- Lightweight version of `/shipping/rates` — no cart, just a single product. Used for the discovery question *"if I order this now, when does it arrive?"*.
- If the product is `made_to_order`, the `displayText` should include the lead-time prefix: *"Ready in 2-3 weeks, then 3-5 days to Cape Town."*

### Errors

| Status | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Bad postcode or unknown product |
| 422 | `SHIPPING_UNAVAILABLE` | Can't ship to this postcode |

### Rate limit

Standard.
