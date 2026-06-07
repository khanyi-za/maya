# YIIVA Mobile — API: Orders

> Canonical specs for order endpoints.
> Global rules → [`../api-conventions.md`](../api-conventions.md).
> Open questions → [`../open-questions.md`](../open-questions.md) §Orders.

All endpoints in this domain are **🔴 proposed (new)**.

---

## Endpoints

| § | Endpoint | Method | Auth | Used by |
|---|---|---|---|---|
| 1 | `/orders` | POST | optional | Checkout |
| 2 | `/orders/{id}` | GET | required | Checkout (post-payment poll), Order Success, Track Order |
| 3 | `/orders` | GET | required | Account → My Orders |
| 4 | `/orders/{id}/tracking` | GET | required | Track Order |
| 5 | `/orders/{id}/cancel` | POST | required | Track Order (early-stage cancellation) |

---

## Order lifecycle

```
PENDING_PAYMENT  →  PAYMENT_FAILED          (terminal — user retries from /orders/{id})
                 ↘  CONFIRMED               → PREPARING → SHIPPED → DELIVERED   (terminal)
                                                       ↘ CANCELLED              (terminal)
                                            ↘ CANCELLED  (early-stage user cancel)
```

Each status transition is server-driven; mobile reads but never writes status directly (except via §5 cancel).

---

## 1. Create order 🔴

The big one. Initiates payment flow and creates the order record.

```
POST /orders
```

**Auth:** optional (guest checkout works via `X-Cart-Session` + `email` in body)

### Body

```json
{
  "shippingMethod": "delivery",
  "addressId": "ck_addr_1",
  "shippingRateId": "ck_rate_std",
  "paymentMethod": "card",
  "paymentMethodId": "ck_pm_1",
  "applePayToken": null,
  "promoCode": "WELCOME10",
  "email": "buyer@example.com"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `shippingMethod` | `"delivery" \| "pickup"` | yes | |
| `addressId` | string | conditional | Required when `shippingMethod === "delivery"` |
| `pickupLocationId` | string | conditional | Required when `shippingMethod === "pickup"` |
| `shippingRateId` | string | conditional | Required for delivery — from `POST /shipping/rates` response |
| `paymentMethod` | `"apple_pay" \| "card" \| "payflex" \| "payjustnow" \| "mobicred" \| "rcs"` | yes | |
| `paymentMethodId` | string | conditional | Required when `paymentMethod === "card"` and using a saved card |
| `applePayToken` | string | conditional | Required when `paymentMethod === "apple_pay"` — encrypted token from Apple Pay sheet |
| `promoCode` | string | no | Validated again server-side |
| `email` | string | conditional | Required for guest checkout (no authed user) — for the confirmation email |

### Response — 200 OK (redirect-based payment)

```json
{
  "success": true,
  "data": {
    "order": {
      "id": "ck_order_abc",
      "status": "PENDING_PAYMENT",
      "total": 260360,
      "currency": "ZAR"
    },
    "payment": {
      "type": "redirect",
      "paymentUrl": "https://sandbox.payfast.co.za/eng/process?...",
      "returnUrl": "yiivaapp://payment-return?orderId=ck_order_abc"
    }
  }
}
```

### Response — 200 OK (Apple Pay completed in-app)

```json
{
  "success": true,
  "data": {
    "order": {
      "id": "ck_order_abc",
      "status": "CONFIRMED",
      "total": 260360,
      "currency": "ZAR"
    },
    "payment": {
      "type": "completed"
    }
  }
}
```

### Errors

| Status | Code | Cause | Mobile UX |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing required fields per body table | Should not occur — client validates first |
| 409 | `STOCK_DRIFT` | Item is no longer available | Toast + back to Cart |
| 409 | `CART_EMPTY` | Cart is empty | Back to Cart |
| 422 | `SHIPPING_UNAVAILABLE` | Can't ship to selected address | Force Pickup, banner |
| 422 | `PAYMENT_METHOD_UNAVAILABLE` | Payflex declined the user; saved card expired | Show inline error in payment section, prompt to pick another |
| 422 | `PROMO_INVALID` | Promo code expired / not applicable | Inline error on promo input; order does NOT proceed |
| 422 | `MINIMUM_NOT_MET` | Promo or shipping has a minimum cart value | Show the minimum amount in the error |

### Rate limit

10 requests / minute / user (or session for guests). Prevents accidental double-submission.

### Open questions

- See [open-questions §O-1](../open-questions.md#o-1--guest-order-email-as-identity), §O-2, §O-3.

---

## 2. Get order detail 🔴

```
GET /orders/{orderId}
```

**Auth:** required (or guest via `X-Cart-Session`)

### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "order": {
      "id": "ck_order_abc",
      "orderNumber": "YV-2026-000142",
      "status": "PREPARING",
      "statusHistory": [
        { "status": "PENDING_PAYMENT", "at": "2026-06-05T14:23:00.000Z" },
        { "status": "CONFIRMED", "at": "2026-06-05T14:23:14.000Z" },
        { "status": "PREPARING", "at": "2026-06-05T14:30:00.000Z" }
      ],
      "items": [
        {
          "id": "ck_order_item_1",
          "productId": "ck_abc123",
          "variantId": "ck_var_2",
          "name": "Mosadi Snatched Kimono",
          "image": "https://cdn.yiiva.co.za/products/abc123/01.jpg",
          "size": "M",
          "quantity": 1,
          "unitPrice": 89900,
          "lineTotal": 89900,
          "merchant": {
            "id": "ck_merchant_1",
            "username": "tol_thema",
            "displayName": "Tol'thema"
          }
        }
      ],
      "subtotal": 219900,
      "shippingFee": 6500,
      "tax": 33960,
      "discount": 0,
      "total": 260360,
      "currency": "ZAR",
      "shipping": {
        "method": "delivery",
        "address": { /* full address object */ },
        "rate": { "name": "Standard delivery", "courier": "Courier Guy", "minDays": 3, "maxDays": 5 },
        "estimatedDelivery": "2026-06-10"
      },
      "payment": {
        "method": "card",
        "last4": "1234",
        "status": "succeeded"
      },
      "createdAt": "2026-06-05T14:23:00.000Z"
    }
  }
}
```

### Errors

| Status | Code | Cause |
|---|---|---|
| 404 | `ORDER_NOT_FOUND` | |
| 403 | `FORBIDDEN` | Order belongs to a different user |

### Rate limit

Standard. Mobile polls this every 3s during payment-return window (up to 30s, then backs off).

---

## 3. List my orders 🔴

```
GET /orders
```

**Auth:** required · **Used by:** Account → My Orders

Full spec drafted with the Account screen doc.

---

## 4. Get order tracking 🔴

Live courier-side tracking for shipped orders. Proxies ShipLogic.

```
GET /orders/{orderId}/tracking
```

**Auth:** required (signed-in users) OR `X-Cart-Session` (guest order owner)

### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "tracking": {
      "trackingNumber": "CG-2026-78421",
      "courier": "Courier Guy",
      "courierTrackingUrl": "https://www.thecourierguy.co.za/track/CG-2026-78421",
      "currentStatus": "in_transit",
      "lastEvent": {
        "at": "2026-06-06T11:00:00.000Z",
        "location": "Cape Town hub",
        "description": "Package scanned at sorting facility"
      },
      "estimatedDeliveryFrom": "2026-06-10",
      "estimatedDeliveryTo": "2026-06-12",
      "events": [
        {
          "at": "2026-06-06T11:00:00.000Z",
          "location": "Cape Town hub",
          "description": "Package scanned at sorting facility"
        },
        {
          "at": "2026-06-06T08:30:00.000Z",
          "location": "Tol'thema studio, Cape Town",
          "description": "Package collected by courier"
        }
      ]
    }
  }
}
```

### Field notes

- **`currentStatus`** values: `"pre_shipment" | "in_transit" | "out_for_delivery" | "delivered" | "exception"`. Coarser than ShipLogic's raw event types — mobile renders these as user-friendly labels.
- **`events[]`** — newest first. Track Order shows only `lastEvent` in the timeline summary; the full event list is available if the user taps "Tracking history" (TBD).
- **`courierTrackingUrl`** — optional external link. When present, mobile shows a "Track on Courier Guy" affordance.
- **`exception`** status — unhappy paths like "Couldn't deliver — no one home." Mobile renders these with a warning treatment + courier contact info if available.

### Errors

| Status | Code | Cause | Mobile UX |
|---|---|---|---|
| 404 | `TRACKING_NOT_AVAILABLE` | Order is pre-SHIPPED, or ShipLogic has no record yet | Mobile treats as "no events yet" — hide tracking sub-section |
| 502 | `UPSTREAM_TIMEOUT` | ShipLogic API down | Toast + retry; timeline still works without tracking |

### Rate limit

20 / minute / user. Mobile polls every 5min on the Track Order screen while it's open (or use push notifications to invalidate the cache).

### Open questions

- See [open-questions §TO-2](../open-questions.md#to-2--tracking-granularity), §SH-4.

---

## 5. Cancel order 🔴

```
POST /orders/{orderId}/cancel
```

**Auth:** required (signed-in users) OR `X-Cart-Session` (guest order owner — limited to within cancellation window)

### Body

None (the action is unambiguous — cancel this order).

### Response — 200 OK

Returns the updated order with `status: "CANCELLED"` and a refund record:

```json
{
  "success": true,
  "data": {
    "order": {
      "id": "ck_order_abc",
      "status": "CANCELLED",
      "cancelledAt": "2026-06-06T15:12:00.000Z",
      "refund": {
        "status": "processing",
        "amount": 260360,
        "currency": "ZAR",
        "expectedClearedBy": "2026-06-13"
      }
    }
  }
}
```

### Field notes

- **`refund.status`** values: `"processing" | "cleared" | "failed"`. Refunds are async; status flips to `cleared` after the payment provider confirms.
- **`refund.expectedClearedBy`** — ISO date — used in mobile copy: *"Refund expected by 13 June."*

### Errors

| Status | Code | Cause | Mobile UX |
|---|---|---|---|
| 409 | `ORDER_NOT_CANCELLABLE` | Order is past the cancellation window OR already shipped | Toast: "This order can't be cancelled. Contact support." Refetch order. |
| 404 | `ORDER_NOT_FOUND` | | Standard 404 handling |
| 403 | `FORBIDDEN` | Not the order owner | Should not occur for legitimate flows |

### Rate limit

5 / minute / user. Cancellation is a deliberate action; rate limit guards against accidental double-clicks.

### Open questions

- See [open-questions §O-3](../open-questions.md#o-3--order-cancellation-window) for the cancellation window definition.
