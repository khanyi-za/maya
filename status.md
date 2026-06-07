# YIIVA Mobile — Project Status

> Last updated: 2026-06-06
> Read `CLAUDE.md` first for durable project context.
> Read this for **where the work is right now** and what to pick up next.

---

## Where we are in one sentence

The buyer mobile app is a UI prototype running on bundled fixtures; we've finished a 13-screen documentation pass that converts that prototype into a per-screen UX + API spec that the backend team can implement against. The next batch of work is **either backend-led** (answering open questions) **or frontend-led** (replacing dummy data with real API calls + designing the screens that don't yet exist).

---

## Current focus

**Documentation project** — captured screen-by-screen what the buyer app does today, what it should do in production, and what the backend team needs to provide. This unblocks parallel frontend (wiring) and backend (implementation) work.

The documentation is structured as **two tracks plus a shared questions doc:**

- **Track A — Screen docs** (`docs/screens/<n>/screen.md`): UX, components, user actions, states, prototype-deprecation list
- **Track B — Canonical API specs** (`docs/api/<domain>.md`): one source of truth per endpoint, referenced from per-screen `api-contract.md` manifests
- **Open questions** (`docs/open-questions.md`): consolidated, organised by domain, each with a "Mobile vote" the backend/product team can confirm or override

---

## Completed (this documentation pass)

### Foundation docs
- `docs/api-conventions.md` — global rules (envelope, pagination, error codes, money, timestamps, CDN URLs, personalised fields convention)
- `docs/open-questions.md` — ~150 open questions across 14 domain buckets, each with a Mobile vote
- `docs/auth-mobile-guide.md` — pre-existing; patched in this session (base64url decoding, `auth: 'optional'` guard)

### Per-domain API specs (`docs/api/`)
12 files. Most have at least the screen-relevant endpoints fully spec'd; others stubbed for screens that haven't been documented yet:
- `products.md` — feed, new-arrivals (full); detail, similar, view tracking (full); featured (stubbed)
- `merchants.md` — by-username, products, trending, list (all full)
- `categories.md` — list categories (full); smart-categories (stub)
- `social.md` — like, bookmark, follow (full); my-bookmarks (full); my-likes, my-follows (stub)
- `cart.md` — summary, full cart, POST item, PATCH item, DELETE item, DELETE cart (all full)
- `orders.md` — create, get, tracking, cancel (all full); list mine (stub)
- `shipping.md` — rates, pickup-locations, eta (all full)
- `payments.md` — list payment methods (full); add, delete, default (high-level)
- `addresses.md` — full CRUD
- `notifications.md` — unread-count (full); list, mark-read, push-tokens (stubbed)
- `search.md` — universal search + 3 variants (full); suggestions, tracking (full)
- `chat.md` — get/create conversation, get messages, send, mark read, upload, report (full); list conversations, delete (stub)

**Not yet created:** `docs/api/reels.md` — referenced by Video Player screen contract but the domain file doesn't exist. **First task for next session if Video Player is pursued.**

### Per-screen docs (`docs/screens/`)
All 13 existing screens documented. Each folder has `screen.md` + `api-contract.md`:

| # | Screen | Route | Status |
|---|---|---|---|
| 01 | Home | `(tabs)/index.tsx` | ✓ |
| 02 | Product Detail | `product/[productId].tsx` | ✓ |
| 03 | Cart | `(tabs)/cart.tsx` | ✓ |
| 04 | Checkout | `checkout.tsx` | ✓ |
| 05 | Order Success | `order-success.tsx` | ✓ |
| 06 | Track Order | `track-order.tsx` | ✓ |
| 07 | Search | `(tabs)/search.tsx` | ✓ |
| 08 | Merchant Profile | `artist/[artistId].tsx` | ✓ |
| 09 | Wishlist | `(tabs)/bookmarks.tsx` | ✓ |
| 10 | Explore | `(tabs)/explore.tsx` | ✓ |
| 11 | Shop | `(tabs)/profile.tsx` | ✓ |
| 12 | Chat | `chat/[artistId].tsx` | ✓ |
| 13 | Video Player | `video-player.tsx` | ✓ |

Each screen doc covers: Purpose · Entry points · Visual layout (ASCII wireframe) · Layout breakdown · User actions · States · Prototype-only behavior to deprecate.

Each contract covers: Endpoint manifest pointing to `api/`, screen-specific call sequences, per-endpoint notes, failure modes.

---

## Open work

### Screens that don't yet exist but are referenced
These are flagged across the docs as "TBD" but need design before they can be documented. Listed in roughly the order they unblock other work:

| Screen | Why it matters | First referenced from |
|---|---|---|
| **Account / Profile** | Hub for orders, addresses, payment methods, settings | SideMenu, Order Success, Cart |
| **Account → My Orders** (order list + detail) | The buyer's order history surface | Track Order, SideMenu |
| **Account → Messages** (conversation list) | Without it, chats can only be reached via Merchant Profile | Chat (CH-11) |
| **Address Book** | Address management | Checkout "Edit" CTA |
| **Saved Payment Methods** | Card management | Checkout "Change Card" CTA |
| **Notifications** | In-app notification list | YiivaHeader bell tap |
| **Returns / Exchange flow** | Post-delivery action | Track Order (when DELIVERED) |
| **Category Listing** | Browse by category | CategoryFilter chip tap, Shop tab category tap |
| **Auth screens** (Login, Register, Verify Email, Reset Password, Claim) | Auth flow per `auth-mobile-guide.md` | Everywhere |

### Code wiring (frontend production work)
Each screen's `screen.md` has a "Prototype-only behavior to deprecate" table listing the specific replacements (e.g. "Replace `DUMMY_FEED_PRODUCTS` with `useQuery` against `GET /products/feed`"). The aggregate is the frontend production roadmap.

Largest single tasks:
- Wire the auth flow (per `auth-mobile-guide.md`)
- Replace `lib/dummy-data.ts` consumers with TanStack Query hooks against `api-client.ts`
- Move `social-store.ts` from local-only to server-backed mutations + optimistic cache
- Move `cart-store.ts` to server-backed (depends on backend deciding CC-3)
- Replace `lib/chat-store.ts` mock with the real `chat.md` endpoints

### Backend work
- Review every `docs/api/<domain>.md` and confirm / amend the proposed shapes
- Answer the open-questions doc — start with the cross-cutting CC-* questions which block multiple screens

---

## Critical blockers (decisions that ripple)

These are the open questions whose answers unblock the most other work. **Listed in priority order:**

| ID | Question | Blocks |
|---|---|---|
| **CC-1** | Response envelope harmonisation (auth endpoints diverge from the rest) | Every screen's HTTP wrapper |
| **CC-2** | Money: integer cents vs decimal string | Payments integration; all price rendering |
| **CC-3** | Server-side cart vs client-only | Cart screen, Checkout, guest-claim flow |
| **CC-4** | Personalised fields on list responses (`isLikedByMe` etc.) | Home, Search, Merchant Profile, Wishlist |
| **PMT-1** | PayFast as primary payment processor | All payment endpoints |
| **PMT-2** | Apple Pay via PayFast vs native Stripe | Payment integration architecture |
| **P-7** | Product variants / sizes / stock structure | Product Detail, Cart, Checkout |
| **VP-1** | Video Player: ship in v1, defer to v2, or remove | Whether content-becomes-commerce is in v1 scope |
| **EX-1** | What IS Explore vs Home? | Whether Explore tab exists at all |
| **CH-1** | Chat realtime mechanism (REST polling vs WebSocket) | Chat backend architecture |

The full open-questions catalog is in `docs/open-questions.md`. Total: ~150 questions across 14 buckets. Each has a Mobile vote — most are answerable in minutes once a product owner triages.

---

## Session log (rough chronology — recent first)

These notes summarise what happened in recent sessions, in case the next session needs context on *why* something is shaped a certain way.

### 2026-06-04 → 2026-06-06 (this run)
- Patched `auth-mobile-guide.md`: `decodeBase64Url` helper for JWT decoding; `auth: 'optional'` 401 guard
- Established two-track doc structure (screens + canonical API specs) after iterating with the user on format
- Created `api-conventions.md` and `open-questions.md` as the load-bearing reference docs
- Documented 13 screens in buyer-journey order (Home through Track Order first, then discovery surfaces, then Chat + Video Player)
- Each screen review surfaced product/UX questions consolidated into `open-questions.md` with Mobile votes
- User confirmed core architectural choices: Expo Router (not raw RN Navigation), custom `fetch` wrapper (not axios), Zustand (not Context/Redux)

### Earlier (pre-this run)
- `about_yiiva.md` and `auth-guide.md` (web-targeted) authored
- `auth-mobile-guide.md` authored by user with mobile adaptations of the auth flow
- `lib/api-client.ts` typed REST contract authored

---

## How to pick up next session

1. **Read `CLAUDE.md`** first for durable context (tech stack, conventions, footguns).
2. **Read this file** for current state.
3. **Ask the user what's next.** Likely candidates:
   - Continue the screen-doc series for screens that don't yet exist (Account, Notifications, etc. — needs design)
   - Start the frontend wiring work (pick a screen's deprecation table and start replacing dummy data)
   - Triage `open-questions.md` with the user (they may have answers from the backend / product team since this run)
   - Write `docs/api/reels.md` if Video Player is being pursued
   - Build the auth screens per `auth-mobile-guide.md`
4. **When in doubt:** the screen docs are the source of truth for product intent; the `api/` files are the source of truth for endpoint shapes. Both are derivable from the codebase + the user's product decisions captured in open-questions.

---

## Working agreements with the user

These are stylistic preferences established across the docs session. Worth maintaining unless the user signals otherwise:

- **Mobile votes** on every open question — frontend recommendation with reasoning
- **Per-screen depth** with cross-references to canonical specs (vs duplication)
- **One consolidated open-questions doc** (not scattered per screen)
- **Visual layout (ASCII wireframe)** in every screen doc — backend devs see the shape before reading the breakdown
- **Honest framing of prototype state** — when a screen is broken or aspirational, the doc says so
- **No emoji decoration** in code; UI emojis only where the design uses them
- **Terse responses** — minimal preamble, get to the work; flag decisions explicitly when they need user input
