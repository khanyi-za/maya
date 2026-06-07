# YIIVA Mobile — Chat with Merchant (API Contract)

> Screen 12 · companion to [`screen.md`](./screen.md)
>
> Manifest, not spec. Endpoint shapes are defined once in [`../../api/`](../../api/) by domain. This doc says which endpoints Chat calls, when, and any screen-specific context.
>
> Global rules → [`../../api-conventions.md`](../../api-conventions.md). Open questions → [`../../open-questions.md`](../../open-questions.md).

> **The messaging backend is the biggest pending architecture decision in this app.** Mobile vote: REST polling for v1 (simpler), WebSocket / Pusher / Ably for v2 (proper). See [open-questions §CH-1](../../open-questions.md#ch-1--realtime-mechanism).

---

## Endpoints called by Chat

| # | Endpoint | Spec | When |
|---|---|---|---|
| 1 | `GET /conversations/by-merchant/{username}` | [`api/chat.md`](../../api/chat.md) §1 | Mount |
| 2 | `GET /conversations/{conversationId}/messages` | [`api/chat.md`](../../api/chat.md) §2 | Mount, scroll-to-top (backward pagination), polling |
| 3 | `POST /conversations/{conversationId}/messages` | [`api/chat.md`](../../api/chat.md) §3 | User taps Send |
| 4 | `PATCH /conversations/{conversationId}/read` | [`api/chat.md`](../../api/chat.md) §4 | Foreground while on screen, after new message lands |
| 5 | `POST /conversations/{conversationId}/upload` 🔴 | [`api/chat.md`](../../api/chat.md) §5 (TBD) | Attach photo flow |
| 6 | `POST /conversations/{conversationId}/report` 🔴 | [`api/chat.md`](../../api/chat.md) §6 (TBD) | "Report this conversation" flow |
| 7 | `GET /orders/{orderId}/preview` 🔴 | [`api/orders.md`](../../api/orders.md) (TBD §) | When `?orderId` is present — fetch lightweight order summary for the context banner |

---

## Call sequence on mount

```
1. Read username from useLocalSearchParams; read optional orderId
2. GET /conversations/by-merchant/{username}
   - If conversation doesn't exist yet → backend creates one (returns id)
   - Returns: { conversationId, merchant, messagingEnabled, lastReadAt }
3. In parallel:
   - GET /conversations/{conversationId}/messages?limit=50 (latest first)
   - GET /orders/{orderId}/preview (if orderId)
4. PATCH /conversations/{conversationId}/read (mark this conversation read)
5. Render. Start polling (or open WebSocket) for new messages.
6. If guest: SKIP all the above; render the "Sign in to message" gate.
```

## Call sequence on Send

```
1. Validate locally: inputText.trim().length > 0
2. Disable send button, optimistic-append message with status='sending'
3. Clear input
4. POST /conversations/{conversationId}/messages
   body: { text, attachments: [], orderRef: orderId or null }
5a. 200 → replace optimistic message with server response (real id, server timestamp)
5b. 5xx / network → mark message status='failed'; show "Tap to retry" affordance
5c. 403 MERCHANT_BLOCKED_YOU → toast: "You can't message this merchant"
5d. 422 MESSAGE_TOO_LONG (if > backend max) → inline error, message stays in input
```

## Call sequence on polling tick (v1 — REST)

```
Every 10 seconds while screen is open:
1. GET /conversations/{conversationId}/messages?after=<lastMessageId>
2. If new messages: append; if user is at bottom → auto-scroll; otherwise show "New ↓" pill
3. PATCH /conversations/{conversationId}/read (silent — keeps server unread count accurate)
4. Stop polling on screen blur (useFocusEffect cleanup)
```

## Call sequence on attach photo

```
1. User taps + → action sheet → "Photo"
2. expo-image-picker (or similar) → returns local URI
3. POST /conversations/{conversationId}/upload  (multipart, returns attachment URL)
4. POST /conversations/{conversationId}/messages with attachments[0] = upload result
5. Optimistic photo bubble appears with upload progress; replaced with final URL on success
```

## Call sequence on attach product

```
1. User taps + → action sheet → "Product"
2. Open product picker modal (recently viewed, wishlist, cart items as source)
3. User picks a product
4. POST /conversations/{conversationId}/messages
   body: { text: '', attachments: [{ type: 'product', productId }], orderRef: null }
5. Renders as a rich product card inside the conversation
```

## Call sequence on backward pagination

```
1. User scrolls to top of message list
2. If hasMoreOlder: GET /conversations/{conversationId}/messages?before=<oldestMessageId>&limit=50
3. Prepend results; preserve scroll position (use FlatList's maintainVisibleContentPosition)
```

## Call sequence on push notification

```
Push arrives: { type: "chat_new_message", conversationId, messageId, preview }

If user is on this Chat screen for the same conversationId:
1. Silently refetch latest messages (or pull via WebSocket if v2)
2. Auto-scroll if at bottom; pill if scrolled up
3. PATCH /read

If user is elsewhere:
1. Show notification banner; deep link → /chat/{username}
2. Mobile invalidates the badge counts (notifications + conversations)
```

---

## Chat-specific notes per endpoint

### 1. `GET /conversations/by-merchant/{username}`

- **Idempotent create-or-fetch** — first call for a (user, merchant) pair creates the conversation; subsequent calls return the existing one. Backend uses (userId, merchantId) as the natural key.
- **Auth required** — guests can't have conversations (per [CH-15](../../open-questions.md#ch-15--guest-users-and-chat)).
- **Returns merchant metadata** so the screen header doesn't need a separate `/merchants/{username}` fetch (shared cache key with Merchant Profile is fine).
- **`messagingEnabled`** — when `false`, mobile shows the "not accepting messages" state.

### 2. `GET /conversations/{id}/messages`

- **Three modes via query params:**
  - `?limit=50` — initial fetch, latest 50 messages newest-first
  - `?after=<messageId>&limit=50` — incremental, anything newer than messageId
  - `?before=<messageId>&limit=50` — backward pagination
- **Cache strategy** — TanStack `useInfiniteQuery` with `getNextPageParam` returning `before` cursor. Polling refetches the latest page on the same query key.
- **Server-side ordering** by `createdAt` ascending in storage; mobile renders chronologically.

### 3. `POST /conversations/{id}/messages`

- **Body** — `{ text, attachments: [], orderRef: orderId or null }`.
- **Attachments** structure per `chat.md` §3 — flexible: image, product, order reference, etc.
- **Optimistic** — append immediately with `id: 'temp-<uuid>', status: 'sending'`. Replace with server response.
- **Rate limit** — 30 messages / minute / conversation (anti-spam).
- **Idempotency key** — recommend `Idempotency-Key` header set to client-side UUID to prevent duplicate sends on retry.

### 4. `PATCH /conversations/{id}/read`

- **Fire-and-forget** — mobile doesn't surface errors.
- **Triggers** — mount, foreground, after each new incoming message.
- **Decrements `unreadCount`** on both this conversation's record and the global `unreadCount` used by the conversation-list badge.

### 5. `POST /conversations/{id}/upload` 🔴

- **Multipart** — image file in the body.
- **Returns** — `{ url, thumbnailUrl, mimeType, sizeBytes }`.
- **Validation** — backend rejects non-images, files > 10MB.

### 6. `POST /conversations/{id}/report` 🔴

- **Body** — `{ reason: "harassment" | "scam" | "spam" | "other", details?: string }`.
- **Backend response** — confirmation; conversation may be flagged for moderation review.

### 7. `GET /orders/{orderId}/preview` 🔴

- **Lightweight version** of the full `GET /orders/{id}` — just `{ orderNumber, total, firstItem: { name, image, price } }` for the context banner.
- **Auth required.**

---

## Failure modes specific to Chat

| Scenario | Mobile behaviour |
|---|---|
| `GET /conversations/by-merchant/{username}` fails | Toast + retry; back button still works |
| Merchant has `messagingEnabled: false` | Render read-only state with input replaced by "This merchant isn't accepting messages right now" |
| Send fails (5xx) | Message bubble marked failed; tap to retry posts the same body again with same `Idempotency-Key` |
| Send fails (rate limit 429) | Toast: "Slow down — you've sent a lot of messages. Try again in a minute." |
| Polling fails | Backoff: double the polling interval up to 60s. Foreground resumes 10s cadence. |
| User loses network mid-conversation | Show offline banner; queued sends fail; on reconnect, queue retries automatically |
| Attachment upload fails | Photo bubble marked failed; tap to retry; user can also remove and re-pick |
| Conversation deleted server-side (merchant deactivated) | Toast: "This brand is no longer available on YIIVA." Navigate back. |
| Push payload references a conversationId mobile doesn't have cached | Mobile fetches the conversation on tap (cold-start handles it) |
| App backgrounds during send | Optimistic message is in local cache; on foreground, refetch reconciles |
| Message text exceeds backend max length | Inline error before send; refuse to fire request |
| Guest attempts to send | Input shows "Sign in to message" CTA → opens login modal |
