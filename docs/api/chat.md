# YIIVA Mobile — API: Chat / Messaging

> Canonical specs for buyer ↔ merchant messaging endpoints.
> Global rules → [`../api-conventions.md`](../api-conventions.md).
> Open questions → [`../open-questions.md`](../open-questions.md) §Chat.

All endpoints in this domain are **🔴 proposed (new)**. The current mobile implementation (`lib/chat-store.ts` + `app/chat/[artistId].tsx`) is a local-state mock with `setTimeout` auto-replies — needs to become a real messaging backend.

> **Realtime mechanism is the largest single architecture decision.** Mobile vote: REST polling at 10s intervals for v1; WebSocket via Pusher / Ably / a backend-managed channel for v2. See [`../open-questions.md` §CH-1](../open-questions.md#ch-1--realtime-mechanism).

> ✅ **CH-1 decided: real-time via WebSocket (socket.io), self-hosted in nuwa.**
> Architecture = **REST writes + WS fan-out**: REST owns the durable operations
> (persist/paginate/authz), the socket.io `/chat` namespace pushes
> `message:new` / `read` events to connected participants — **no polling needed.**
> JWT is verified on the handshake; clients emit `join { conversationId }` then
> receive events. Both the buyer app and the **merchant dashboard** use the same
> REST core (merchant surface lives at `/stores/:storeId/conversations`).
> v1 notes: `messagingEnabled` always true (no per-store toggle), `avgResponseTime`
> null (no data yet), message `status` always `'sent'` (read receipts are v2 —
> read state is per-conversation via lastReadAt). Attachments are **image-only**
> in v1 (product cards v2).

---

## Endpoints

| § | Endpoint | Method | Auth | Used by |
|---|---|---|---|---|
| 1 | `/conversations/by-merchant/{username}` | GET | required | Chat (open or create conversation) |
| 2 | `/conversations/{id}/messages` | GET | required | Chat (history + polling) |
| 3 | `/conversations/{id}/messages` | POST | required | Chat (send) |
| 4 | `/conversations/{id}/read` | PATCH | required | Chat (mark read) |
| 5 | `/conversations/{id}/upload` | POST | required | Chat (image attachments) |
| 6 | `/conversations/{id}/report` | POST | required | Chat (moderation) |
| 7 | `/conversations` | GET | required | Conversation list screen (TBD) |
| 8 | `/conversations/{id}` | DELETE | required | Conversation list (delete/leave) |

---

## Shared shapes

### Message

```json
{
  "id": "ck_msg_1",
  "conversationId": "ck_conv_1",
  "sender": "user" | "merchant",
  "senderId": "ck_user_abc",
  "text": "Hi! Do you have this in M?",
  "attachments": [],
  "orderRef": "ck_order_abc" | null,
  "status": "sent" | "delivered" | "read",
  "createdAt": "2026-06-05T14:23:00.000Z"
}
```

### Attachment (polymorphic)

```json
// image
{ "type": "image", "url": "https://...", "thumbnailUrl": "https://...", "width": 1080, "height": 1440 }

// product (rendered as rich product card in chat)
{ "type": "product", "productId": "ck_abc123", "snapshot": { "name": "...", "price": 89900, "currency": "ZAR", "image": "https://..." } }

// order reference (rendered as small chip linking back to the order)
{ "type": "order", "orderId": "ck_order_abc", "snapshot": { "orderNumber": "YV-2026-000142" } }
```

---

## 1. Get or create conversation ✅

```
GET /conversations/by-merchant/{username}
```

**Auth:** required (guests can't have conversations)

### Path params

| Name | Type |
|---|---|
| `username` | string — merchant username |

### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "conversation": {
      "id": "ck_conv_1",
      "merchant": {
        "id": "ck_merchant_1",
        "username": "tol_thema",
        "displayName": "Tol'thema",
        "logo": "https://cdn.yiiva.co.za/merchants/tol_thema/logo.png",
        "isVerified": true,
        "messagingEnabled": true,
        "avgResponseTime": "2h"
      },
      "lastReadAt": "2026-06-05T14:22:00.000Z",
      "unreadCount": 0,
      "createdAt": "2026-06-01T10:00:00.000Z"
    }
  }
}
```

### Field notes

- **Idempotent** — first call creates the conversation; subsequent calls return the existing one. (userId, merchantId) is the natural key.
- **`avgResponseTime`** — human-readable estimate ("2h", "within a day"). Backend computes from merchant's historical response data; mobile renders in the chat header subtitle.
- **`messagingEnabled`** — `false` means the merchant has disabled DMs. Mobile renders the read-only state.

### Errors

| Status | Code | Cause |
|---|---|---|
| 404 | `MERCHANT_NOT_FOUND` | Unknown username |
| 403 | `MERCHANT_BLOCKED_YOU` | Merchant has blocked this user |

### Rate limit

Standard.

---

## 2. Get messages ✅

```
GET /conversations/{conversationId}/messages
```

**Auth:** required

### Query params

| Name | Type | Required | Notes |
|---|---|---|---|
| `limit` | integer | no | Default 50, max 100 |
| `before` | string | no | Cursor — return messages older than this messageId |
| `after` | string | no | Polling cursor — return messages newer than this messageId |

### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "messages": [ /* Message shape above, sorted by createdAt ASC */ ]
  },
  "pagination": { "limit": 50, "nextCursor": "ck_msg_30", "hasMore": true }
}
```

### Errors

| Status | Code | Cause |
|---|---|---|
| 404 | `CONVERSATION_NOT_FOUND` | |
| 403 | `FORBIDDEN` | Not a participant |

### Rate limit

60 / minute. Polling at 10s = 6/min, well within limit.

---

## 3. Send message ✅

```
POST /conversations/{conversationId}/messages
```

**Auth:** required

### Headers

```
Idempotency-Key: <client-generated UUID>
```

**Strongly recommended** — prevents duplicate sends on retry.

### Body

```json
{
  "text": "Hi! Do you have this in M?",
  "attachments": [],
  "orderRef": "ck_order_abc"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `text` | string | yes (unless attachments has items) | Max 2000 chars |
| `attachments` | array | no | Up to 5 attachments per message |
| `orderRef` | string \| null | no | Order ID for context (from `?orderId` query param when chat opened from Track Order) |

### Response — 201 Created

Returns the created message (server-assigned `id` + `createdAt`).

### Errors

| Status | Code | Cause | Mobile UX |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | Empty body / missing fields | Should not occur — mobile validates first |
| 403 | `MERCHANT_BLOCKED_YOU` | Merchant has blocked this user | Read-only state |
| 422 | `MESSAGE_TOO_LONG` | text > 2000 chars | Inline error |
| 429 | `RATE_LIMIT_EXCEEDED` | > 30/min/conversation | Toast |

### Rate limit

30 / minute / conversation. Per-user across all their conversations: standard.

---

## 4. Mark read ✅

```
PATCH /conversations/{conversationId}/read
```

**Auth:** required

### Body

None.

### Response — 204 No Content

Side effects: decrements the conversation's `unreadCount` to 0, updates `lastReadAt` to server's "now", recomputes the global `/conversations/unread-count` aggregate.

### Errors

Mobile ignores all errors (fire-and-forget).

### Rate limit

60 / minute.

---

## 5. Upload attachment ✅ (via signed-direct Cloudinary, not multipart)

> Chat images use nuwa's **signed-direct Cloudinary flow** (consistent with the
> rest of the app — backend never touches the file), NOT a multipart upload to
> this path. Client: `POST /uploads/cloudinary-signature` with
> `uploadContext: "chat_attachment"` → upload direct to Cloudinary → include
> `{ type:'image', url, thumbnailUrl?, width?, height? }` in the message's
> `attachments`. Send validates the URL is a Cloudinary URL. (Requires a
> `chat_attachment` signed preset in the Cloudinary dashboard.)

```
POST /conversations/{conversationId}/upload
```

**Auth:** required

### Body

`multipart/form-data` with `file` field. Max 10MB.

### Response — 201 Created

```json
{
  "success": true,
  "data": {
    "attachment": {
      "type": "image",
      "url": "https://cdn.yiiva.co.za/chat/uploads/abc.jpg",
      "thumbnailUrl": "https://cdn.yiiva.co.za/chat/uploads/abc-thumb.jpg",
      "width": 1080,
      "height": 1440,
      "sizeBytes": 524288
    }
  }
}
```

### Errors

| Status | Code | Cause |
|---|---|---|
| 413 | `FILE_TOO_LARGE` | > 10MB |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Not an image |

### Rate limit

10 / minute / user.

---

## 6. Report conversation ✅

```
POST /conversations/{conversationId}/report
```

**Auth:** required

### Body

```json
{
  "reason": "harassment" | "scam" | "spam" | "other",
  "details": "..."
}
```

### Response — 204 No Content

Backend flags for moderation. May result in conversation being closed pending review.

### Errors

Standard.

### Rate limit

5 / hour / user.

---

## 7. List conversations 🔴

```
GET /conversations
```

**Auth:** required · **Used by:** Conversation list screen (TBD)

Full spec drafted with the Conversation list screen doc.

---

## 8. Delete conversation 🔴

```
DELETE /conversations/{conversationId}
```

**Auth:** required · **Used by:** Conversation list screen

Full spec drafted with the Conversation list screen doc.
