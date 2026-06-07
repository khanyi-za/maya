# YIIVA Mobile — API: Payments

> Canonical specs for payment endpoints (saved payment methods, BNPL, integration).
> Global rules → [`../api-conventions.md`](../api-conventions.md).
> Open questions → [`../open-questions.md`](../open-questions.md) §Payments.

All endpoints in this domain are **🔴 proposed (new)**.

> ⚠️ **Payment integration is the highest-stakes work in this app.** This doc covers the mobile-visible endpoints. The actual PayFast / Apple Pay / Payflex wiring is documented separately in `payments-integration.md` (TBD) — that's where webhook handling, IPN verification, fraud rules, and PCI scope live.

---

## Endpoints

| § | Endpoint | Method | Auth | Used by |
|---|---|---|---|---|
| 1 | `/me/payment-methods` | GET | required | Checkout, Account |
| 2 | `/me/payment-methods` | POST | required | "Add card" flow (PayFast tokenisation) |
| 3 | `/me/payment-methods/{id}` | DELETE | required | Account → manage cards |
| 4 | `/me/payment-methods/{id}/default` | PATCH | required | Set default card |

> Note: order creation itself is `POST /orders` (see [`orders.md`](./orders.md) §1) — that endpoint takes a payment method and returns either a `paymentUrl` (redirect-based) or a completed status (Apple Pay).

---

## 1. List my payment methods 🔴

```
GET /me/payment-methods
```

**Auth:** required

### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "paymentMethods": [
      {
        "id": "ck_pm_1",
        "type": "card",
        "brand": "visa",
        "last4": "1234",
        "expiryMonth": 12,
        "expiryYear": 2028,
        "isDefault": true,
        "isExpired": false
      },
      {
        "id": "ck_pm_2",
        "type": "card",
        "brand": "mastercard",
        "last4": "5678",
        "expiryMonth": 6,
        "expiryYear": 2024,
        "isDefault": false,
        "isExpired": true
      }
    ]
  }
}
```

### Field notes

- **No PAN, no CVV, no full card data** — only the tokenised reference (`id`) and display fields.
- **`isExpired`** — backend computes this from `expiryMonth/expiryYear` vs. current date. Mobile renders expired cards greyed out and disables their selection at Checkout.
- **`brand`** values: `"visa" | "mastercard" | "amex" | "diners"`.

### Errors

Standard auth errors.

### Rate limit

Standard.

---

## 2. Add payment method 🔴

The card is captured via PayFast's hosted tokenisation flow — the mobile client never handles raw PAN/CVV (PCI scope stays minimal).

```
POST /me/payment-methods
```

**Auth:** required

### Flow

1. Mobile calls `POST /me/payment-methods/initiate` (or similar — backend choice) → backend creates a PayFast tokenisation session, returns a `tokenisationUrl`
2. Mobile opens WebView with the `tokenisationUrl` + `returnUrl=yiivaapp://payment-method-added`
3. User enters card details in PayFast's hosted form
4. PayFast tokenises, backend receives the token, saves the payment method
5. Deep link returns to app with `?paymentMethodId=X` or `?status=cancelled`

**Two-step pattern** (recommended): an `/initiate` endpoint that returns the WebView URL, then a confirm endpoint hit via webhook by PayFast. Mobile only sees the URL + the eventual deep link.

### Response — 200 OK (from `/initiate`)

```json
{
  "success": true,
  "data": {
    "tokenisationUrl": "https://...",
    "returnUrl": "yiivaapp://payment-method-added"
  }
}
```

### Errors

| Status | Code | Cause |
|---|---|---|
| 422 | `TOKENISATION_FAILED` | PayFast session creation failed |

### Rate limit

5 / minute / user.

---

## 3. Delete payment method 🔴

```
DELETE /me/payment-methods/{id}
```

**Auth:** required · **Used by:** Account

Full spec drafted with the Account screen doc.

---

## 4. Set default payment method 🔴

```
PATCH /me/payment-methods/{id}/default
```

**Auth:** required · **Used by:** Account

Full spec drafted with the Account screen doc.

---

## Payment integration notes (high level)

These aren't endpoints — they're context for the backend team designing the integration.

### Card / Payflex / PayJustNow / Mobicred / RCS (redirect-based)

- `POST /orders` returns `paymentUrl` + `returnUrl`
- Mobile opens WebView with `paymentUrl`
- User completes payment on the provider's hosted page
- Provider redirects to `returnUrl` (deep link back to app)
- PayFast IPN (webhook) updates the order server-side asynchronously
- Mobile polls `GET /orders/{id}` until status confirms (or hits the polling timeout and surfaces "We're processing")

### Apple Pay (native)

- Mobile presents the Apple Pay sheet locally (using PayFast's iOS SDK or Stripe-like Apple Pay support)
- User authenticates with Face/Touch ID
- Mobile receives the encrypted Apple Pay token
- Mobile sends the token in `POST /orders` body as `applePayToken`
- Backend submits the token to PayFast for charge
- Response is synchronous — `status: 'succeeded'` returned in the order response

### Google Pay (Android)

- Same pattern as Apple Pay but with Google Pay SDK. Out of scope for v1.

### Open questions (cross-cutting)

- See [open-questions §PMT-1 through PMT-6](../open-questions.md#payments---product--ux--backend-questions) for the major decisions: PayFast vs. Stripe vs. Yoco, Apple Pay availability, Payflex SDK vs. WebView, etc.
