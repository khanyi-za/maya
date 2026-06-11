# YIIVA Mobile — API: Addresses

> Canonical specs for user address endpoints.
> Global rules → [`../api-conventions.md`](../api-conventions.md).
> Open questions → [`../open-questions.md`](../open-questions.md) §Addresses.

**✅ Implemented in nuwa** at `/api/me/addresses` (GET/POST/PATCH/DELETE + PATCH `:id/default`). Addresses are user-scoped — all endpoints require authentication. Reuses the web AddressService rules (max 4, one-default invariant, soft-delete, 404-on-cross-user). nuwa stores `addressLine1`/`addressLine2` ↔ maya `line1`/`line2`; `country` is always `"ZA"` in v1. (maya's `suburb`-less shape means ShipLogic geocoding loses the suburb component — acceptable v1.)

---

## Endpoints

| § | Endpoint | Method | Auth | Used by |
|---|---|---|---|---|
| 1 | `/me/addresses` | GET | required | Checkout, Account |
| 2 | `/me/addresses` | POST | required | Add address form |
| 3 | `/me/addresses/{id}` | PATCH | required | Edit address form |
| 4 | `/me/addresses/{id}` | DELETE | required | Account → manage addresses |
| 5 | `/me/addresses/{id}/default` | PATCH | required | Set default address |

---

## Address shape

```json
{
  "id": "ck_addr_1",
  "recipientName": "Jane Doe",
  "phone": "+27821234567",
  "line1": "123 Long Street",
  "line2": "Apt 4B",
  "city": "Cape Town",
  "province": "Western Cape",
  "postalCode": "8001",
  "country": "ZA",
  "isDefault": true,
  "label": "Home"
}
```

Field notes:
- **`recipientName`** + **`phone`** — required by courier; may differ from the account holder.
- **`line2`** is optional.
- **`province`** — South African provinces (e.g. *"Western Cape"*, *"Gauteng"*). Backend should validate against a fixed list.
- **`country`** — ISO 3166-1 alpha-2. For v1, must be `"ZA"`. v2 may open up to other countries.
- **`label`** — user-facing nickname (*"Home"*, *"Office"*). Optional.

---

## 1. List my addresses ✅

```
GET /me/addresses
```

**Auth:** required

### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "addresses": [
      { /* address shape */ }
    ]
  }
}
```

Sorted with default first, then by `createdAt` ascending.

### Errors

Standard auth errors.

### Rate limit

Standard.

---

## 2. Create address ✅

```
POST /me/addresses
```

**Auth:** required

### Body

Same as address shape minus `id` and `isDefault` (set via §5 separately, or via `isDefault: true` in the body — backend choice).

### Response — 201 Created

Returns the created address with its assigned `id`.

### Errors

| Status | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Bad postcode format, missing required fields |
| 422 | `UNSUPPORTED_COUNTRY` | Non-ZA country (v1 only) |

### Rate limit

10 / minute / user.

---

## 3. Update address ✅

```
PATCH /me/addresses/{id}
```

**Auth:** required

### Body

Partial address fields — any subset.

### Response — 200 OK

Returns the updated address.

### Errors

| Status | Code | Cause |
|---|---|---|
| 404 | `ADDRESS_NOT_FOUND` | |
| 400 | `VALIDATION_ERROR` | |

### Rate limit

Standard.

---

## 4. Delete address ✅

```
DELETE /me/addresses/{id}
```

**Auth:** required

### Response — 200 OK

```json
{ "success": true }
```

### Errors

| Status | Code | Cause | Mobile UX |
|---|---|---|---|
| 404 | `ADDRESS_NOT_FOUND` | Idempotent — treat as success |
| 409 | `ADDRESS_IN_USE_BY_ORDER` | Address referenced by a recent order | Toast: "Can't delete — used by a recent order. We'll archive it instead." (Backend may soft-delete in this case) |

### Rate limit

Standard.

---

## 5. Set default address ✅

```
PATCH /me/addresses/{id}/default
```

**Auth:** required

### Response — 200 OK

Returns the updated address with `isDefault: true`. Any previously-default address has its `isDefault` flipped to `false` server-side as part of this transaction.

### Errors

| Status | Code | Cause |
|---|---|---|
| 404 | `ADDRESS_NOT_FOUND` | |

### Rate limit

Standard.
