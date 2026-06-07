# YIIVA Mobile — Chat with Merchant (Screen)

> Screen 12 · Route: `/chat/[artistId]` (`app/chat/[artistId].tsx`)
> Endpoints this screen calls → [`api-contract.md`](./api-contract.md)
> Open questions → [`../../open-questions.md`](../../open-questions.md) §Chat

> Same naming-artifact note as Merchant Profile: the route is `/chat/[artistId]` but the param is the merchant **username**. The screen subtitle ("Verified Artist" / "Artist") also uses legacy terminology. Worth a future rename to `/chat/[username]` and "Merchant" / "Brand" copy.

---

## Purpose

The direct line between buyer and merchant. The asynchronous channel where pre-purchase questions ("Do you have this in size L?", "When will this restock?"), post-purchase support ("Where's my order?"), and brand-to-customer relationship-building happen. This is what YIIVA replaces in the buyer's life: the merchant's Instagram DMs.

For the YIIVA commercial model, chat is the conversion-rescue surface — the buyer who has a question but doesn't get an answer is the buyer who doesn't buy. Latency to first merchant response is the load-bearing metric here.

---

## Entry points

- **Merchant Profile** → "Contact" → "Message {merchant}"
- **Track Order** → "Contact {merchant}" action (with `?orderId=X` query for context)
- **Order Success** → "Contact merchant" CTA (TBD if shipped)
- **Push notification** — *"{merchant} replied to your message"* deep links here
- **Conversation list screen** (TBD — see [open-questions §CH-11](../../open-questions.md#ch-11--conversation-list-screen))
- **Deep link** — `yiivaapp://chat/<username>?orderId=<id>` (orderId optional)

---

## Visual layout

### Standard state

```
┌───────────────────────────────────────────┐
│ [←]   ◯ Tol'thema                   [ⓘ] │  ← A   Header
│         Verified Merchant                  │       (avatar, name, subtitle,
│         Typically replies in 2h            │        info button)
├───────────────────────────────────────────┤
│  [if ?orderId is present:]                 │
│  ┌──────────────────────────────────────┐ │
│  │ Re: Order #YV-2026-000142        [✕] │ │  ← B   Order context banner
│  │ Mosadi Snatched Kimono · R899        │ │       (optional, dismissable)
│  └──────────────────────────────────────┘ │
├───────────────────────────────────────────┤
│                                            │
│   ◯ ┌──────────────────────────┐           │
│     │ Hi there, we are         │           │
│     │ Tol'thema. How can we    │           │  ← C   Message list
│     │ assist you today?        │           │       (merchant left,
│     │                  2:34 PM │           │        user right)
│     └──────────────────────────┘           │
│                                            │
│         ┌──────────────────────────┐       │
│         │ Hi! I'm interested in    │       │
│         │ your kimono in M, are    │       │
│         │ those still in stock?    │       │
│         │              2:35 PM ✓✓ │       │   ✓✓ = delivered+read (v2)
│         └──────────────────────────┘       │
│                                            │
│   ◯ ┌──────────────────────────┐           │
│     │ Yes! We have 3 left in M.│           │
│     │ Want me to reserve one?  │           │
│     │                  2:37 PM │           │
│     └──────────────────────────┘           │
│                                            │
│   ◯ ●●●  (typing — v2)                     │  ← D   Typing indicator (v2)
│                                            │
├───────────────────────────────────────────┤
│  [+]  [Message Tol'thema...]         [↑] │  ← E   Input area
└───────────────────────────────────────────┘
```

### Empty conversation state (first time opening)

```
┌───────────────────────────────────────────┐
│ [←]   ◯ Tol'thema                   [ⓘ] │
│         Verified Merchant                  │
├───────────────────────────────────────────┤
│                                            │
│                                            │
│              [ ◯ large ]                  │
│                                            │
│         Start the conversation             │
│                                            │
│   Send a message to Tol'thema. They        │
│   typically reply within 2 hours.          │
│                                            │
├───────────────────────────────────────────┤
│  [+]  [Message Tol'thema...]         [↑] │
└───────────────────────────────────────────┘
```

### Section → data-source key

| § | Section | Data source |
|---|---|---|
| **A** | Header | Merchant ← `GET /merchants/{username}` (cached from prior visits). Subtitle uses `merchant.isVerified` + `merchant.avgResponseTime` (proposed) |
| **B** | Order context banner | `orderId` from query param + lightweight `GET /orders/{orderId}/preview` (TBD — or backend includes order context when conversation is opened with an `orderId`) |
| **C** | Messages list | `GET /conversations/{conversationId}/messages` paginated, with polling or WebSocket for live updates |
| **D** | Typing indicator | v2 only — WebSocket-driven |
| **E** | Input | Local input state. Send → `POST /conversations/{conversationId}/messages` |

### Scroll & sticky behaviour

- **Vertical scroll** on the message list (C).
- **Header (A) is sticky.**
- **Order context banner (B) is sticky** below the header (if present).
- **Input area (E) is sticky** at the bottom, with `KeyboardAvoidingView` to lift on keyboard focus.
- **New messages auto-scroll to bottom** unless the user has scrolled up to read history (then a "New messages ↓" pill appears).

---

## Layout (top to bottom)

### Header
- Back button (left) → `router.back()`
- Merchant avatar (small circle)
- Display name + subtitle (Verified Merchant / Merchant + typical response time)
- Info button (right, ⓘ) → navigate to `/artist/{username}`

### Order context banner (when `?orderId` is present)
- Background tint (subtle)
- "Re: Order #YV-..." label
- Product summary (first item's name + price)
- Dismiss button (×) — hides the banner for this session

### Messages list
- Per message bubble:
  - Sender side determines layout (merchant → left with avatar; user → right, no avatar)
  - Bubble background: user = brand-blue, merchant = light grey
  - Text + timestamp inside bubble
  - (v2) Delivery status indicator for user messages (sent/delivered/read)
- Date separators between messages from different days
- Latest message at the bottom; auto-scroll on new

### Input area
- Attach button (+, left) — opens action sheet: Photo / Product / (others TBD)
- Multi-line text input (auto-grows to ~3-4 lines, then scrolls)
- Send button (↑, right) — disabled when input is empty
- Wrapped in `KeyboardAvoidingView` for keyboard handling

### Empty state
- Centered merchant avatar (large)
- "Start the conversation" heading
- Body: "Send a message to {merchant}. They typically reply within {avgResponseTime}."

---

## User actions

| Action | Result |
|---|---|
| Tap back | `router.back()` |
| Tap merchant header / info button | Navigate to `/artist/{username}` |
| Tap dismiss (×) on order context banner | Hide for this session (state-only, not persisted) |
| Type in input | Update local state; "Send" enables when non-empty |
| Tap Send | `POST /conversations/{id}/messages` — optimistic append + scroll |
| Tap attach (+) | Open action sheet: Photo · Product · Cancel |
| Tap "Photo" | Open image picker → upload → send as image message |
| Tap "Product" | Open product picker (recently viewed, wishlist, cart) → send as product attachment |
| Pull to load older messages | Paginate backward via cursor |
| Scroll up + new message arrives | Show "New messages ↓" pill; tap to scroll to bottom |
| App backgrounds during chat | Mark conversation as paused; refetch on foreground |
| Push notification arrives for this conversation | If screen is open: silently invalidate cache + append new message. If background: standard push UX. |

---

## States

| State | Trigger | UI |
|---|---|---|
| **Loading (first paint)** | Mount, fetching conversation | Skeleton with header populated; messages area shows spinner |
| **Empty conversation** | No prior messages | Empty state with "Start the conversation" prompt |
| **Active conversation** | Messages loaded | Standard list |
| **Sending** | After Send tap | Optimistic message appears with "Sending..." indicator; replaced by sent state on response |
| **Send failed** | 5xx / network | Message bubble shows "Failed to send · Tap to retry" |
| **Merchant typing (v2)** | WebSocket event | Bubble with animated dots above input |
| **Merchant offline / slow** | `merchant.avgResponseTime` > 24h | Header subtitle reads "Typically replies within a day" |
| **Order context** | `?orderId` in URL | Sticky banner above message list |
| **Conversation closed** | Merchant has disabled messaging (`messagingEnabled: false`) | Input area replaced with: "This merchant isn't accepting messages right now" |
| **Reported / blocked** | User reported the conversation | Read-only view; banner explaining the state |
| **Network error** | Failed to load messages | Toast + retry |
| **Authenticated** | Signed in | Full functionality |
| **Guest** | No session | Block message send; CTA: "Sign in to message {merchant}" — see [CH-15](../../open-questions.md#ch-15--guest-users-and-chat) |

---

## Prototype-only behavior to deprecate

| Item | Location | Replace with |
|---|---|---|
| Entire chat logic is local component state + setTimeout auto-reply | `[artistId].tsx:36-75` | Server-backed conversations via the messaging endpoints in [`api/chat.md`](../../api/chat.md) (TBD) |
| Inline duplicate of `autoReplies` array (already exists in `lib/chat-store.ts`) | `[artistId].tsx:340-355` | Delete — real merchant replies come from the server |
| `chat-store.ts` itself (also auto-reply mock) | `lib/chat-store.ts` | Replace with TanStack Query mutations + WebSocket / polling layer |
| Welcome message hard-coded on mount | `[artistId].tsx:38-43` | Either omit (let conversation start empty until user sends) OR server-side auto-welcome per [CH-13](../../open-questions.md#ch-13--auto-welcome-message) |
| Auto-scroll uses `setTimeout(100)` to scroll-to-end | `[artistId].tsx:46-52` | Use `onContentSizeChange` / `onLayout` callbacks for deterministic scroll |
| Attach button (+) has no handler | `[artistId].tsx:166-168` | Wire to action sheet → image picker / product picker per [CH-3](../../open-questions.md#ch-3--attach-button-actions) |
| Merchant data via `getDummyMerchant` | `[artistId].tsx:34` | `GET /merchants/{username}` via TanStack cache shared with Merchant Profile |
| Logo path constructed manually (`/demo-assets/${username}/${logo}`) | `[artistId].tsx:87` | `merchant.logo` is an absolute CDN URL from the API |
| "Artist" / "Verified Artist" subtitle copy | `[artistId].tsx:134` | "Merchant" / "Verified Merchant" — align with the platform's actual terminology |
| Time formatting client-side | `[artistId].tsx:78-85` | Keep client-side, but timestamp source must be server ISO (not `new Date()`) |
| No order context handling despite `?orderId` query param mentioned in Track Order contract | — | Add the order context banner — see Layout §B |
| No message pagination | — | Add backward-paginating message history via cursor |
| No typing indicator, read receipts, or delivery status | — | v2 features — see [CH-5](../../open-questions.md#ch-5--typing-indicators), [CH-6](../../open-questions.md#ch-6--read-receipts) |
| No conversation list — user can only get to chats via Merchant Profile or Track Order | — | Add a conversation list screen — see [CH-11](../../open-questions.md#ch-11--conversation-list-screen) |
| No push notification for new merchant messages | — | Per [CH-14](../../open-questions.md#ch-14--push-notifications-for-merchant-replies) — required for real chat UX |
| No "Report" / "Block" affordance | — | Required for moderation; minimum-viable per [CH-10](../../open-questions.md#ch-10--report--block-affordances) |
| Route param is "artistId" but value is username | route file | Rename to `/chat/[username]` in a future refactor |
