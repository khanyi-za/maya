# YIIVA Mobile — Open Questions

> Consolidated list of decisions pending from the backend team, product owner, or design.
> Organised by domain. As questions get answered, move them to a "Decisions" section at the bottom (with date + answer) and update the relevant spec / screen doc.
>
> Each question carries a **Mobile vote** — the mobile team's recommended default. The backend/product owner can confirm or override.

---

## Cross-cutting

### CC-1 — Response envelope harmonisation
**Where:** [`api-conventions.md`](./api-conventions.md) §Response envelope
**The question:** auth endpoints (per [`auth-mobile-guide.md`](./auth-mobile-guide.md) §4) return `{ accessToken, refreshToken, user }` directly with no envelope; everything else uses `{ success, data, pagination }`. Should we harmonise?
**Mobile vote:** harmonise on the envelope. One parser for the whole API. If auth has to stay shaped as-is for backwards-compat with the web app, document the split explicitly.
**Asked of:** backend

### CC-2 — Money format (cents vs decimal)
**Where:** [`api-conventions.md`](./api-conventions.md) §Money
**The question:** current `lib/api-client.ts` uses `price: number` ambiguously. Lock as integer cents or decimal string?
**Mobile vote:** integer cents (`89900` = R899.00). Avoids float math at checkout.
**Asked of:** backend
**Blocks:** payments integration. Decide before Checkout work starts.

### CC-3 — Server-side vs client-side cart
**Where:** [`api/cart.md`](./api/cart.md)
**The question:** carts are currently client-only (`lib/cart-store.ts` + AsyncStorage). Move to server-side?
**Mobile vote:** server-side. Unlocks guest-checkout reconciliation, cross-device carts, abandoned-cart recovery, and accurate inventory holds.
**Asked of:** backend, product
**Blocks:** Cart screen contract, guest-checkout flow.

### CC-4 — Personalised fields on list responses
**Where:** [`api-conventions.md`](./api-conventions.md) §Personalised fields
**The question:** when an authed request returns a list of products/merchants, will each item include `isLikedByMe` / `isBookmarkedByMe` / `merchant.isFollowedByMe` / `isFollowedByMe`?
**Mobile vote:** yes, on every list response when the request is authenticated. Without these, the mobile client either N+1 fetches or renders stale local-only state.
**Asked of:** backend

### CC-5 — CDN URLs
**Where:** [`api-conventions.md`](./api-conventions.md) §URLs & media
**The question:** will responses return absolute CDN URLs (e.g. `https://cdn.yiiva.co.za/...`) for all image/video assets?
**Mobile vote:** yes — single CDN host, absolute URLs. Mobile's current `lib/local-assets.ts` translation of relative `/demo-assets/...` paths goes away once this lands.
**Asked of:** backend

### CC-6 — Guest social actions
**Where:** Home screen and others using social-store
**The question:** for unauthenticated users, do likes / bookmarks / follows work locally and sync on sign-in, or are they blocked behind a sign-in wall?
**Mobile vote:** local + sync on sign-in. Preserves discovery momentum; the sign-in wall kills conversion on a discovery app.
**Asked of:** product

---

## Products

### P-1 — Feed pagination strategy
**Where:** [`api/products.md`](./api/products.md) §1
**The question:** cursor or offset for `/products/feed`? Cursor scales better for infinite scroll with shifting order; offset is simpler.
**Mobile vote:** cursor. If only offset is feasible for v1, document cursor stability characteristics (does adding new products mid-scroll cause duplicates?).
**Asked of:** backend

### P-2 — Feed personalisation
**Where:** [`api/products.md`](./api/products.md) §1
**The question:** is `/products/feed` personalised per buyer (algorithmic ranking from follows / likes / browse history) or globally ranked?
**Mobile vote:** v1 globally ranked (sort: newest first); v2 personalised. Affects CDN-cacheability.
**Asked of:** backend, product

### P-3 — `category` filter on feed
**Where:** [`api/products.md`](./api/products.md) §1
**The question:** does `/products/feed` accept a `category` param to filter inline, or should category taps navigate to a dedicated listing screen?
**Mobile vote:** support both. Home keeps users on Home (filter inline). Shop tab routes to a dedicated category screen.
**Asked of:** backend

### P-4 — "Home & Lifestyle" gender taxonomy
**Where:** [`api/products.md`](./api/products.md) §1, Home screen
**The question:** does this third gender tab map to existing `genderType=unisex`, or a new taxonomy axis (e.g. `productCategory=home`)?
**Mobile vote:** clarify before the tab ships. Recommendation: dedicated axis (`category=home-lifestyle`) because home goods / art aren't gendered.
**Asked of:** product, backend

### P-5 — "New arrivals" definition
**Where:** [`api/products.md`](./api/products.md) §2
**The question:** what defines "new" — last 7 days, 30 days, configurable?
**Mobile vote:** last 30 days, configurable in admin.
**Asked of:** backend, product

### P-6 — Sold-out filter on new arrivals
**Where:** [`api/products.md`](./api/products.md) §2
**The question:** should sold-out products be excluded from new arrivals?
**Mobile vote:** yes.
**Asked of:** backend

### P-7 — Product variants / sizes / stock
**Where:** [`api/products.md`](./api/products.md) §4 (Product Detail)
**The question:** current `lib/api-client.ts` declares `size: string | null` (e.g. `"S, M, L"`). For variant-level inventory (size A available, size B sold out) we need a structured `variants` array.
**Mobile vote:** structured `variants: [{ size, sku, available, stockCount }]` from v1 — the Cart and Checkout flows depend on this.
**Asked of:** backend
**Blocks:** Product Detail screen contract, Cart contract.

### P-8 — `inventoryType` values
**Where:** [`api/products.md`](./api/products.md) §4
**The question:** what are the valid values for `inventoryType`? Proposed: `"in_stock" | "made_to_order" | "preorder"`.
**Mobile vote:** confirm proposal. `leadTime` field becomes meaningful when `inventoryType !== "in_stock"`.
**Asked of:** backend, product

### P-9 — "Similar" definition
**Where:** [`api/products.md`](./api/products.md) §5
**The question:** what defines similar — same gender (current `api-client.ts` comment), or also same category + price band + smart-category overlap?
**Mobile vote:** v1 gender + category, randomised. v2 ML-driven.
**Asked of:** backend, product

---

## Merchants

### M-1 — Trending merchants ranking signal
**Where:** [`api/merchants.md`](./api/merchants.md) §1
**The question:** algorithmic (recent followers / orders / engagement), admin-curated, or "most followers ever"?
**Mobile vote:** admin-curated for v1, real signal for v2.
**Asked of:** backend, product

### M-2 — `genderType` filter semantics on trending
**Where:** [`api/merchants.md`](./api/merchants.md) §1
**The question:** does the filter check if the merchant has *any* product in that gender, or majority?
**Mobile vote:** any.
**Asked of:** backend

### M-3 — Trending update frequency
**Where:** [`api/merchants.md`](./api/merchants.md) §1
**The question:** how often does the trending set refresh — cached for the day, hourly, real-time?
**Mobile vote:** daily if admin-curated; hourly if algorithmic.
**Asked of:** backend

### M-4 — Email on public merchant profile
**Where:** [`api/merchants.md`](./api/merchants.md) §2 (full spec in Merchant Profile contract)
**The question:** current `MerchantProfile` in `lib/api-client.ts:115` includes `email`. Should this be public, or only visible to admins / the merchant?
**Mobile vote:** hide from public response. Surface only on contact form (`mailto:` link or in-app message).
**Asked of:** backend

---

## Categories

### CAT-1 — Source of truth
**Where:** [`api/categories.md`](./api/categories.md) §1
**The question:** is the canonical category list maintained in the backend or hard-coded in the app?
**Mobile vote:** backend. Adding categories shouldn't require an app release. Today's hard-coded lists in `app/(tabs)/profile.tsx` and `index.tsx` need to deprecate.
**Asked of:** backend, product

### CAT-2 — Category images
**Where:** [`api/categories.md`](./api/categories.md) §1
**The question:** does the backend serve category thumbnail images, or does the mobile bundle them?
**Mobile vote:** backend.
**Asked of:** backend

### CAT-3 — Category ordering
**Where:** [`api/categories.md`](./api/categories.md) §1
**The question:** alphabetical, by `productCount`, or admin-controlled `order` field?
**Mobile vote:** admin-controlled `order` field with `productCount` as secondary sort.
**Asked of:** backend, product

### CAT-4 — Smart categories source
**Where:** [`api/categories.md`](./api/categories.md) §2
**The question:** what's the source-of-truth for smart categories? LLM-generated on product upload? Who curates the canonical list?
**Mobile vote:** LLM-generated at upload, normalised into a canonical curated set by admin.
**Asked of:** backend, product

---

## Social

### S-1 — Idempotent PUT/DELETE vs single toggle endpoint
**Where:** [`api/social.md`](./api/social.md)
**The question:** confirmed approach? Mobile rejected `POST /toggle` because concurrent taps can land in opposite states.
**Mobile vote:** PUT (like/bookmark/follow) + DELETE (un-like/un-bookmark/un-follow), both idempotent.
**Asked of:** backend (confirmation)

### S-2 — `likeCount` in like response
**Where:** [`api/social.md`](./api/social.md) §1
**The question:** does the like response return the updated public `likeCount` for the product, or do we fetch separately?
**Mobile vote:** include in response. Saves a round-trip.
**Asked of:** backend

### S-3 — Notification on follow
**Where:** [`api/social.md`](./api/social.md) §3
**The question:** does following a merchant trigger a "Buyer X started following you" notification on the merchant side?
**Mobile vote:** yes (merchant team should opt in). Out of scope for the buyer app — flagged for the merchant team.
**Asked of:** product (merchant team)

---

## Cart

(See CC-3 for the foundational decision: server-side vs client-side cart. Most cart questions depend on that.)

### C-1 — Lightweight `/cart/summary` endpoint
**Where:** [`api/cart.md`](./api/cart.md) §1
**The question:** support a separate lightweight summary endpoint, or have mobile call full `/cart` and pick out `itemCount`?
**Mobile vote:** lightweight `/cart/summary`. The cart badge is on every screen — saves bandwidth.
**Asked of:** backend

### C-2 — Guest-cart reconciliation on login
**Where:** [`api/cart.md`](./api/cart.md) §Guest cart sessions
**The question:** when a guest user logs in / claims their account, how does the guest session cart reconcile with the user's authenticated cart? Merge? Replace? Prompt?
**Mobile vote:** merge. If the user has an empty authenticated cart, take the guest cart wholesale. If they have items in both, merge with quantities added (deduped by product+size).
**Asked of:** backend, product

---

## Notifications

### N-1 — Push tokens vs polling
**Where:** [`api/notifications.md`](./api/notifications.md)
**The question:** once push notifications ship, do we still need the polling `/notifications/unread-count` endpoint?
**Mobile vote:** yes, for cold-start hydration before the first push arrives, and as a fallback if Expo Push fails delivery.
**Asked of:** backend

### N-2 — Notification types and payloads
**Where:** [`api/notifications.md`](./api/notifications.md) §2
**The question:** what are the notification types (order_placed, order_shipped, order_delivered, message_received, merchant_promotion, …) and their payload shapes?
**Mobile vote:** start with order_* + message_received for v1; merchant_promotion / follower_milestone for v2.
**Asked of:** backend, product

---

## Video Player / Reels — product / UX / backend questions

### VP-1 — Ship in v1, or remove?
**Where:** [`screens/13-video-player/screen.md`](./screens/13-video-player/screen.md) Purpose
**The question:** the strategic one. This screen is the most ambitious in the repo (TikTok-style reels feed) and the least production-ready (renders images not video, no backend for anything, not entered from anywhere). Ship the real version in v1, defer to v2, or remove from the repo?
**Mobile vote:** **defer to v2 OR remove from v1 codebase.** Shipping a "videos" surface that doesn't play video and isn't reached from anywhere will damage user trust. Three options:
  (a) Build the real version — major backend + merchant-upload work
  (b) Ship a constrained version — admin-curated reels only (no merchant uploads)
  (c) Remove from v1 entirely
The about doc's "content becomes commerce" pitch hinges on this — so the answer depends on whether YIIVA is positioning v1 against the full pitch or a leaner buyer-storefront MVP.
**Asked of:** product
**Blocks:** every other Video Player question.

### VP-2 — Merchant video upload tooling
**Where:** [`screens/13-video-player/screen.md`](./screens/13-video-player/screen.md) Purpose
**The question:** if reels ship, merchants need an upload surface (the merchant web dashboard). What's the scope — full editing, just upload, integration with existing tools (uploading from phone gallery)?
**Mobile vote:** out of scope for the buyer mobile app, but flagged. Recommendation: simple upload via merchant dashboard for v1 (no editing); v2 add in-app upload from the merchant's own mobile flow.
**Asked of:** product, merchant team

### VP-3 — Product attachments ("Shop the look")
**Where:** [`screens/13-video-player/screen.md`](./screens/13-video-player/screen.md) Layout §E
**The question:** how do merchants attach products to their reels? Mandatory per reel, or optional? UI prominence?
**Mobile vote:** optional (some reels are pure brand content, no products), surfaced as a chip rail below the description when present. Tappable → bottom sheet with Add to Cart. **Without product attachments, reels are content for content's sake — they fail YIIVA's commerce thesis.**
**Asked of:** product, design

### VP-4 — Comments system
**Where:** [`api/reels.md`](./api/reels.md) §5-§6 (TBD)
**The question:** build comments from scratch, use a managed service, or skip entirely?
**Mobile vote:** v1 read-only comments (curated, no user posts) — appears more lively than an empty section. v2 user comments with moderation. Skipping entirely cheapens the social signal that makes a reels feed compelling.
**Asked of:** product

### VP-5 — Feed algorithm
**Where:** [`screens/13-video-player/api-contract.md`](./screens/13-video-player/api-contract.md) §1 notes
**The question:** personalised / algorithmic or chronological / trending?
**Mobile vote:** v1 trending (algorithmic ranking based on engagement signals — likes, follows, completion rate); v2 personalised once we have data per user. Pure chronological feels boring; trending is achievable.
**Asked of:** product, backend

### VP-6 — Real video playback
**Where:** [`screens/13-video-player/screen.md`](./screens/13-video-player/screen.md) Prototype-only behavior
**The question:** confirm `expo-video` (already in deps) is the playback choice. Codec / format requirements? CDN delivery? HLS streaming?
**Mobile vote:** `expo-video` is fine. Backend uploads as MP4 (H.264) and serves via CDN with progressive download for v1. HLS streaming in v2 for bandwidth efficiency.
**Asked of:** backend

### VP-7 — Entry points
**Where:** [`screens/13-video-player/screen.md`](./screens/13-video-player/screen.md) Entry points
**The question:** assuming reels ship — where in the app do users find them?
**Mobile vote:** (1) a Reels section on Home; (2) a Reels carousel on Explore (per [EX-4](#ex-4--brand-story-video-reels)); (3) a Reels section on Merchant Profile; (4) universal links for shareable reels. Without entry points, the feature is invisible.
**Asked of:** product, design

### VP-8 — Background audio handling
**Where:** [`screens/13-video-player/screen.md`](./screens/13-video-player/screen.md) Prototype-only behavior
**The question:** when app backgrounds, pause video, mute video and pause, or let audio continue?
**Mobile vote:** pause completely on background; resume on foreground at saved position. Don't be the app that randomly blares audio.
**Asked of:** product

### VP-9 — Engagement count accuracy
**Where:** [`screens/13-video-player/api-contract.md`](./screens/13-video-player/api-contract.md) §1 notes
**The question:** display real counts ("12,431 likes") or approximated ("12.4K")?
**Mobile vote:** approximated above 1K, exact below. Standard pattern. Update counts optimistically on user interaction.
**Asked of:** design

### VP-10 — Reels for direct purchase
**Where:** [`screens/13-video-player/screen.md`](./screens/13-video-player/screen.md) Layout §E
**The question:** when a reel features a specific product, can the user buy it without leaving the reels feed?
**Mobile vote:** yes — tapping a product chip opens a bottom sheet with Add to Cart. User stays in reels. Cart badge updates. Critical for the commerce thesis: don't break flow to buy.
**Asked of:** product, design

### VP-11 — Reels in deep links / shares
**Where:** [`screens/13-video-player/screen.md`](./screens/13-video-player/screen.md) Entry points
**The question:** does sharing a reel work as a universal link? Web fallback?
**Mobile vote:** yes — `https://yiiva.co.za/reels/{id}` is a universal link that opens the app to that reel (or shows a web preview if user doesn't have the app). Web fallback shows the video, merchant, products, and "Get the app to buy" CTA.
**Asked of:** product, web team

### VP-12 — Report and moderation
**Where:** [`screens/13-video-player/api-contract.md`](./screens/13-video-player/api-contract.md) §9
**The question:** minimum-viable moderation for reels?
**Mobile vote:** Report flow in v1 (ellipsis → Report → reason picker → POST). Manual review server-side. Automated moderation (Vision API for inappropriate content) in v2.
**Asked of:** product, legal

---

## Chat screen — product / UX / backend questions

### CH-1 — Realtime mechanism
**Where:** [`api/chat.md`](./api/chat.md) intro
**The question:** the biggest single architecture call. REST polling, WebSocket, or a managed service (Pusher / Ably / Firebase)?
**Mobile vote:** REST polling (10s tick while screen open) for v1 — simpler backend, simpler client. WebSocket via Pusher / Ably for v2 once chat usage justifies the operational complexity. The polling-to-realtime transition is invisible to UX if cache invalidation is shared.
**Asked of:** backend, product
**Blocks:** every Chat decision below.

### CH-2 — Welcome message source
**Where:** [`screens/12-chat/screen.md`](./screens/12-chat/screen.md) Prototype-only behavior
**The question:** current code hard-codes "Hi there, we are {merchant}. How can we assist you today?" as a fake first message. Replace with server-side auto-welcome, or omit?
**Mobile vote:** omit in v1. An empty conversation is fine ("Start the conversation" empty state covers it). Server-side auto-welcome is v2 and configurable per merchant.
**Asked of:** product

### CH-3 — Attach button actions
**Where:** [`screens/12-chat/screen.md`](./screens/12-chat/screen.md) Layout §E
**The question:** the + button currently does nothing. What options should it surface?
**Mobile vote:** v1: Photo + Product. Photo = upload an image (e.g. of damaged item). Product = pick from recently viewed / wishlist / cart and attach as a rich card (high-intent — buyer says "I'm looking at this").
**Asked of:** product, design

### CH-4 — Order context banner
**Where:** [`screens/12-chat/screen.md`](./screens/12-chat/screen.md) Layout §B
**The question:** when chat is opened with `?orderId=X`, show a sticky banner with order context (per current proposal)?
**Mobile vote:** yes — sticky context banner with order number, first item summary, and dismiss. Backend includes `orderRef` in any messages sent during this chat session so merchant sees the context too.
**Asked of:** product, design

### CH-5 — Typing indicators
**Where:** [`screens/12-chat/screen.md`](./screens/12-chat/screen.md) States
**The question:** show "{merchant} is typing..." indicator?
**Mobile vote:** v2 with WebSocket. REST polling can fake it but the UX is choppy. Skip in v1.
**Asked of:** product

### CH-6 — Read receipts
**Where:** [`screens/12-chat/screen.md`](./screens/12-chat/screen.md) Layout §C
**The question:** show ✓ / ✓✓ delivery + read indicators on user messages?
**Mobile vote:** v2. Adds privacy concerns (some merchants may not want their read state exposed). Backend exposes `status` field per message; mobile uses it once UX is signed off.
**Asked of:** product, design

### CH-7 — Message delivery status
**Where:** [`api/chat.md`](./api/chat.md) §3
**The question:** track and expose `sent | delivered | read` states server-side?
**Mobile vote:** track all three server-side from v1 (no extra work — the `read` PATCH already runs); expose to UI in v2 once read-receipt design lands.
**Asked of:** backend

### CH-8 — Conversation history retention
**Where:** [`api/chat.md`](./api/chat.md) §2
**The question:** keep messages forever, or prune after N months?
**Mobile vote:** keep forever for v1 (storage is cheap, UX value of "I asked Tol'thema about this 8 months ago" is high). Add archival policy in v2 if storage becomes a real cost.
**Asked of:** backend, legal

### CH-9 — Response time displayed in header
**Where:** [`api/chat.md`](./api/chat.md) §1 `avgResponseTime`
**The question:** show "Typically replies in 2h" in the chat header?
**Mobile vote:** yes — useful expectation-setter. Computed server-side from merchant's actual response data; mobile renders the human-readable label.
**Asked of:** backend, product

### CH-10 — Report / Block affordances
**Where:** [`api/chat.md`](./api/chat.md) §6
**The question:** minimum-viable moderation in v1?
**Mobile vote:** Report yes (via info-button overflow menu). Block deferred to v2 (interacts with the merchant-side blocking question).
**Asked of:** product, legal

### CH-11 — Conversation list screen
**Where:** [`screens/12-chat/screen.md`](./screens/12-chat/screen.md) Entry points
**The question:** today, users only reach chats via Merchant Profile or Track Order. Need a dedicated "Messages" or "Conversations" surface listing all chats?
**Mobile vote:** yes — required for real chat UX. Surface in Account screen ("Messages" row) + SideMenu. New screen `/account/messages` lists conversations sorted by `lastMessageAt` desc with unread badge per row.
**Asked of:** product, design

### CH-12 — Product attach UX
**Where:** [`screens/12-chat/screen.md`](./screens/12-chat/screen.md) User actions
**The question:** product picker source — recently viewed, wishlist, cart, or all of YIIVA via search?
**Mobile vote:** recently viewed + wishlist + cart for v1 (high-intent contextual sources). Full search in v2.
**Asked of:** product, design

### CH-13 — Auto-welcome message
**Where:** [`screens/12-chat/screen.md`](./screens/12-chat/screen.md) Prototype-only behavior
**The question:** server-side auto-welcome when a buyer opens a new conversation? Configurable per merchant?
**Mobile vote:** v2 feature. Configurable per merchant via the merchant dashboard. Not blocking.
**Asked of:** product

### CH-14 — Push notifications for merchant replies
**Where:** [`screens/12-chat/api-contract.md`](./screens/12-chat/api-contract.md) Call sequence on push notification
**The question:** push notification when a merchant replies?
**Mobile vote:** required for v1. Without it, chat doesn't work asynchronously.
**Asked of:** backend, product

### CH-15 — Guest users and chat
**Where:** [`screens/12-chat/screen.md`](./screens/12-chat/screen.md) States
**The question:** can guest users (no account) send messages?
**Mobile vote:** no — require sign-in. Spam vector + merchant-side moderation gets impossible. Show "Sign in to message {merchant}" CTA → opens login modal.
**Asked of:** product

---

## Shop screen — product / UX / backend questions

### ST-1 — Sticky controls
**Where:** [`screens/11-shop/screen.md`](./screens/11-shop/screen.md) Scroll & sticky behaviour
**The question:** YiivaHeader + FeedTabs + View toggle currently scroll away with content. Make any of them sticky?
**Mobile vote:** sticky FeedTabs + View toggle (stays accessible as user scrolls deep into a long brand list). Header can scroll away. Matches typical commerce-app patterns (Takealot, Superbalist).
**Asked of:** design

### ST-2 — Search within brands
**Where:** [`screens/11-shop/screen.md`](./screens/11-shop/screen.md) Prototype-only behavior
**The question:** with 37 brands today and growing, do we add a search input at the top of the Brands view?
**Mobile vote:** yes, when brand count exceeds ~50 (rough threshold for when alphabet index alone becomes painful). Below that, the alphabet index suffices.
**Asked of:** product, design

### ST-3 — Follow button on brand rows
**Where:** [`screens/11-shop/screen.md`](./screens/11-shop/screen.md) Layout §E
**The question:** add a Follow button to each brand row in the directory?
**Mobile vote:** no on the row itself (clutters the long list). Yes in a contextual swipe / long-press action.
**Asked of:** design

### ST-4 — Default view mode (Brands or Categories)
**Where:** [`screens/11-shop/screen.md`](./screens/11-shop/screen.md) Layout §C
**The question:** which view does the user see first time they open Shop?
**Mobile vote:** **Categories**. Lower cognitive load — the user picks a need ("shoes") rather than recalling a brand. Most new users don't know YIIVA brands by name yet. Persist the user's last choice after first toggle.
**Asked of:** product, design

### ST-5 — Category card destination
**Where:** [`screens/11-shop/screen.md`](./screens/11-shop/screen.md) User actions
**The question:** tapping a category card — does it open a listing screen, or filter Home/Search?
**Mobile vote:** dedicated listing screen `/category/{slug}` (TBD — same destination flagged from Home and Search). Cleaner navigation flow than redirecting back to a feed-shaped screen.
**Asked of:** product, design

### ST-6 — Brand directory pagination
**Where:** [`api/merchants.md`](./api/merchants.md) §4
**The question:** for a directory that's meant to be exhaustive, do we paginate or load all at once?
**Mobile vote:** paginate with large pages (100 per page). The list is meant to feel exhaustive but the user almost never scrolls to Z — pagination saves bandwidth without breaking the UX.
**Asked of:** backend

### ST-7 — Empty Home & Lifestyle gender
**Where:** [`screens/11-shop/screen.md`](./screens/11-shop/screen.md) States
**The question:** Home & Lifestyle currently returns empty for both Brands and Categories. Show "Coming soon" placeholder (proposed), hide the tab entirely, or build the taxonomy?
**Mobile vote:** placeholder for v1; build the real taxonomy in parallel (see [P-4](#p-4--home--lifestyle-gender-taxonomy)). Hiding the tab dynamically per content availability is more complex than it sounds.
**Asked of:** product

### ST-8 — Recently-added brands
**Where:** [`screens/11-shop/screen.md`](./screens/11-shop/screen.md) Layout
**The question:** surface a "New on YIIVA" carousel at the top of the Brands view (similar to New Arrivals on Home)?
**Mobile vote:** v2. v1 ships the directory; v2 adds discovery aids when brand count is high enough to warrant them.
**Asked of:** product

### ST-9 — "See All Trending Brands" destination
**Where:** [`screens/11-shop/screen.md`](./screens/11-shop/screen.md) Entry points
**The question:** Home's Trending Brands "See All" currently routes to `/explore`. Logically it should route to the Brands view of `/shop`. Move?
**Mobile vote:** route to `/shop?view=brands` (and accept the query param to override the default view). More coherent than routing to Explore.
**Asked of:** product, design

### ST-10 — Rename file `profile.tsx` → `shop.tsx`
**Where:** [`screens/11-shop/screen.md`](./screens/11-shop/screen.md) Prototype-only behavior
**The question:** the route file is historically `profile.tsx` but the tab and purpose are "Shop". Rename for clarity?
**Mobile vote:** rename in a future refactor. Not blocking, but reduces confusion for new contributors.
**Asked of:** mobile (execute later)

---

## Explore screen — product / UX / backend questions

### EX-1 — What IS Explore (vs Home)?
**Where:** [`screens/10-explore/screen.md`](./screens/10-explore/screen.md) Purpose
**The question:** the strategic one. Home shows trending brands + a product feed. Explore shows trending brands + a product grid. Both feel like discovery; both surface mostly the same data. What's the differentiation?
**Mobile vote:** Explore becomes the **editorial / curatorial** surface — admin-curated collections, brand stories, themed product mixes, plus the featured/trending data. Home stays algorithmic + feed-shaped. Without this differentiation, the tab is redundant and should be removed.
**Asked of:** product
**Blocks:** every other Explore question.

### EX-2 — Collections: revive, drop, or rethink?
**Where:** [`screens/10-explore/screen.md`](./screens/10-explore/screen.md) Layout §C
**The question:** the Featured Collections section is **commented out** in current code. Bring it back, delete it, or replace with a different feature?
**Mobile vote:** revive as the centerpiece of Explore (per EX-1 — collections ARE the editorial layer). Admin-curated thematic groupings ("Heritage Collection", "Summer Essentials") with cover image, description, item count, and link to a Collection Detail screen.
**Asked of:** product

### EX-3 — "For You" — personalised or trending?
**Where:** [`screens/10-explore/screen.md`](./screens/10-explore/screen.md) Layout §F
**The question:** the section is labelled "For You" (implies personalised) but the data is just trending products. Rename or actually personalise?
**Mobile vote:** rename to "Trending Now" for v1; build real personalisation in v2 once we have engagement data to train on. Don't ship the personalised label without the personalised content — it's a small but real trust issue.
**Asked of:** product

### EX-4 — Brand story video reels
**Where:** [`screens/10-explore/screen.md`](./screens/10-explore/screen.md) Purpose (intended)
**The question:** per the about doc's "content becomes commerce" vision, should Explore include video reels from merchants — full-screen, swipeable, TikTok-style?
**Mobile vote:** v2. Strong fit for YIIVA's content-first positioning, but requires merchant uploads (which currently don't exist on the buyer app) and a video player surface. Don't ship in v1 unless merchant dashboard is also shipping reels.
**Asked of:** product

### EX-5 — Editorial curation tools
**Where:** [`screens/10-explore/screen.md`](./screens/10-explore/screen.md) Purpose (intended)
**The question:** if EX-1/EX-2 land, admin tooling is needed: who curates collections, who features brands, who picks the "For You" mix?
**Mobile vote:** out of scope for mobile, but flagged. Backend + web admin work — not mobile-blocking, but Explore can't ship its editorial vision without it.
**Asked of:** product, backend (admin tooling)

### EX-6 — Category chip behaviour in Explore
**Where:** [`screens/10-explore/api-contract.md`](./screens/10-explore/api-contract.md) Call sequence on category chip tap
**The question:** tap a CategoryFilter chip on Explore — filter the "For You" grid in-place, OR navigate to a dedicated category listing screen?
**Mobile vote:** navigate to a dedicated category listing — Explore's content is curated, not category-filtered. Keep Explore as the home base; categories live elsewhere.
**Asked of:** product, design

### EX-7 — Like counts on product cards
**Where:** [`screens/10-explore/screen.md`](./screens/10-explore/screen.md) Layout §F
**The question:** product cards in Explore's "For You" grid show like counts (❤ 234 / ❤ 1.2K). Home cards don't. Standardise across screens, or keep Explore distinct?
**Mobile vote:** show on Explore only — adds social proof to the discovery surface. Home stays clean. Cross-screen consistency vote: only show where it informs intent (Explore = "what's popular"; Home = "what's new for you").
**Asked of:** product, design

### EX-8 — Should `/products/featured` accept genderType?
**Where:** [`api/products.md`](./api/products.md) §3
**The question:** currently `/products/featured` is gender-agnostic. If "For You" should respect the gender tab, the endpoint needs to accept `genderType` or Explore uses `/products/feed` instead.
**Mobile vote:** add `genderType` as optional param to `/products/featured`. Cleaner than swapping endpoints. Backwards-compatible (existing callers without the param get the current behaviour).
**Asked of:** backend

### EX-9 — Make Explore visible in the tab bar?
**Where:** [`screens/10-explore/screen.md`](./screens/10-explore/screen.md) Entry points
**The question:** currently hidden (`href: null`). If Explore gets its editorial differentiation (EX-1, EX-2), should it become a visible tab?
**Mobile vote:** visible tab once differentiated. Replace one of the existing tabs (Shop?) or expand from 5 to 6 tabs. Hidden = effectively dead. Either give it a tab or remove it.
**Asked of:** product, design

### EX-10 — "See All" on Trending Brands destination
**Where:** [`screens/10-explore/screen.md`](./screens/10-explore/screen.md) User actions
**The question:** "See All" on Explore's Trending Brands has no handler. Same question as Home's "See All" — does it route to a full brands directory screen?
**Mobile vote:** new screen `/explore/brands` (or reuse the Shop tab's brands directory). The Shop tab's A–Z brand list could serve as the destination.
**Asked of:** product, design

---

## Wishlist screen — product / UX / backend questions

### WL-1 — Server-backed bookmarks
**Where:** [`api/social.md`](./api/social.md) §4
**The question:** confirm bookmarks move server-side (currently `lib/social-store.ts` AsyncStorage only).
**Mobile vote:** server-side for signed-in users; local-only for guests with sync-on-signin. Same answer as [CC-3](#cc-3--server-side-vs-client-side-cart) for cart — without server backing, bookmarks don't survive a device wipe.
**Asked of:** backend, product

### WL-2 — Default view mode
**Where:** [`screens/09-wishlist/screen.md`](./screens/09-wishlist/screen.md) Layout
**The question:** on first visit, does Wishlist default to list or grid view?
**Mobile vote:** **list** — full-width cards show merchant + price + saved-at meta together, which is more information-dense. Grid is for browsing visuals. Persist the user's choice after first toggle.
**Asked of:** design

### WL-3 — Sort order
**Where:** [`api/social.md`](./api/social.md) §4
**The question:** default sort, and which sort options to surface in the UI?
**Mobile vote:** default `newest` (most recently bookmarked first). UI sort dropdown: Newest saved · Oldest saved · Price asc · Price desc · By brand.
**Asked of:** product, design

### WL-4 — Move-to-Cart affordance
**Where:** [`screens/09-wishlist/screen.md`](./screens/09-wishlist/screen.md) User actions
**The question:** explicit "Add to Cart" button on each Wishlist item, or do users have to navigate to Product Detail first?
**Mobile vote:** add via long-press or contextual menu — NOT a primary button. For variant products (most fashion items have sizes), the user has to pick a size on Product Detail anyway, so a direct Add to Cart from Wishlist is misleading. For sizeless items (accessories, art), allow the shortcut.
**Asked of:** product, design

### WL-5 — Collections / folders for bookmarks
**Where:** [`screens/09-wishlist/screen.md`](./screens/09-wishlist/screen.md) Layout
**The question:** Pinterest-style boards / collections within Wishlist (e.g. "Summer wardrobe", "Gifts for Mom")?
**Mobile vote:** v2. Useful but not essential. v1 ships flat list; v2 adds collections if engagement data justifies it.
**Asked of:** product

### WL-6 — Price-drop and restock notifications
**Where:** [`api/social.md`](./api/social.md) §4 `priceChanged` field
**The question:** notify users when a wishlisted item drops in price or restocks? Surface in-screen (badge) and/or via push?
**Mobile vote:** v2 push notifications opt-in per user; v1 in-screen badge "Price dropped" when `priceChanged === true`. High-intent re-engagement signal.
**Asked of:** product, backend

### WL-7 — Remove confirmation or undo
**Where:** [`screens/09-wishlist/api-contract.md`](./screens/09-wishlist/api-contract.md) Call sequence on remove
**The question:** 5-second Undo toast (proposed) or explicit confirmation dialog?
**Mobile vote:** Undo toast (matches Cart's CT-3). Confirmation dialogs at every bookmark remove are friction.
**Asked of:** design

### WL-8 — `bookmarkedAt` display format
**Where:** [`screens/09-wishlist/screen.md`](./screens/09-wishlist/screen.md) Layout §B
**The question:** relative ("Saved 2 days ago") or absolute ("Saved 3 Jun")?
**Mobile vote:** relative within 7 days, absolute beyond. ("Saved 2 days ago" / "Saved 3 weeks ago" / "Saved Mar 15").
**Asked of:** design

### WL-9 — Empty state CTA destination
**Where:** [`screens/09-wishlist/screen.md`](./screens/09-wishlist/screen.md) Layout
**The question:** Browse YIIVA → Home, or to a curated discovery surface (Explore)?
**Mobile vote:** Home. The empty-Wishlist user needs the broadest possible entry, not a specific curated set.
**Asked of:** product

### WL-10 — Header design (consistency vs distinction)
**Where:** [`screens/09-wishlist/screen.md`](./screens/09-wishlist/screen.md) Layout §A
**The question:** Wishlist uses a custom header (just title + view toggle). Other tabs (Home, Search) use `YiivaHeader` (with menu, logo, notifications, cart). Should Wishlist match?
**Mobile vote:** match `YiivaHeader`. Cross-tab consistency. The view-toggle moves to the right side of the row beneath the header (with sort dropdown beside it).
**Asked of:** design

### WL-11 — Unavailable products in wishlist
**Where:** [`api/social.md`](./api/social.md) §4 + screen States
**The question:** items that became sold out / unpublished — keep showing with "Unavailable" badge (proposed), or auto-remove?
**Mobile vote:** keep showing (user decides). "Unavailable" badge + strikethrough. Auto-removal feels like the platform losing the user's data without consent.
**Asked of:** product

### WL-12 — Guest bookmarks
**Where:** [`screens/09-wishlist/screen.md`](./screens/09-wishlist/screen.md) States
**The question:** guests can bookmark in v1 (per [CC-6](#cc-6--guest-social-actions)). How are local bookmarks reconciled to server on sign-in?
**Mobile vote:** on sign-in / claim, mobile reads local AsyncStorage bookmarks and POSTs each via `PUT /products/{id}/bookmark`. Merges with any existing server bookmarks. Banner on the Wishlist screen for guest users: "Sign in to sync your wishlist across devices."
**Asked of:** backend, product

---

## Merchant Profile screen — product / UX / backend questions

### MP-1 — Display merchant stats
**Where:** [`screens/08-merchant-profile/screen.md`](./screens/08-merchant-profile/screen.md) Layout §E2
**The question:** the API returns `followerCount`, `followingCount`, `postCount` but the current screen doesn't display them. Should we add a stats row?
**Mobile vote:** yes — show "N followers · N products" beneath the action buttons. Social proof matters for the brand-led discovery model. Skip `followingCount` (merchants rarely follow back; it adds noise).
**Asked of:** product, design

### MP-2 — Email visibility
See [§M-4](#m-4--email-on-public-merchant-profile) — moves `email` from top-level to `contact.email`, optional, hidden when null. Same answer needed.

### MP-3 — Profile picture tap
**Where:** [`screens/08-merchant-profile/screen.md`](./screens/08-merchant-profile/screen.md) User actions
**The question:** tapping the profile picture — should it open a full-screen view of the logo, do nothing, or navigate elsewhere?
**Mobile vote:** open a lightweight fullscreen lightbox of the logo. Same pattern as Instagram. Cheap to implement, expected by users.
**Asked of:** design

### MP-4 — Mute button visibility
**Where:** [`screens/08-merchant-profile/screen.md`](./screens/08-merchant-profile/screen.md) Layout §A
**The question:** mute button currently always shows, even on an images-only hero (where it does nothing). Hide when no videos present?
**Mobile vote:** yes, hide. Reduces visual noise.
**Asked of:** mobile (just confirm — not blocking)

### MP-5 — Bio truncation
**Where:** [`screens/08-merchant-profile/screen.md`](./screens/08-merchant-profile/screen.md) Layout §F
**The question:** long bios currently render in full and push content down. Truncate with "More" affordance?
**Mobile vote:** truncate to 3 lines with "More" → expand inline. Conservative default; brand-led discovery doesn't always need long-form bio first-screen.
**Asked of:** design

### MP-6 — "All" category tab handling
**Where:** [`screens/08-merchant-profile/screen.md`](./screens/08-merchant-profile/screen.md) Layout §G
**The question:** "All" tab is prepended client-side. Confirm — backend should NOT return "All" in the `categories[]` response.
**Mobile vote:** confirmed — client prepends. Keeps `categories[]` honest.
**Asked of:** backend (just confirm)

### MP-7 — Product sort order
**Where:** [`api/merchants.md`](./api/merchants.md) §3
**The question:** default sort for `/merchants/{username}/products`? Newest first, oldest first, popularity?
**Mobile vote:** newest first by default. Add a `sort` param for `price_asc`, `price_desc` for v2 sort controls.
**Asked of:** product

### MP-8 — Merchant story / highlights
**Where:** [`screens/08-merchant-profile/screen.md`](./screens/08-merchant-profile/screen.md) Layout
**The question:** Instagram-style story highlights — collections of content the merchant has pinned (e.g. "Lookbook 2026", "Behind the Scenes"). Worth adding?
**Mobile vote:** v2. The hero carousel already serves the "look at our content" purpose for v1. Highlights are a richer follow-up feature.
**Asked of:** product

### MP-9 — Share merchant
**Where:** [`screens/08-merchant-profile/screen.md`](./screens/08-merchant-profile/screen.md) User actions
**The question:** add a share affordance (system share sheet with the merchant's universal link `https://yiiva.co.za/{username}`)?
**Mobile vote:** yes. Brand-led platform should make sharing brands trivial. Add a share icon to the floating header (right side, next to mute) or in an overflow menu.
**Asked of:** product, design

### MP-10 — Suspended / deactivated merchant response
**Where:** [`api/merchants.md`](./api/merchants.md) §2
**The question:** when a merchant is SUSPENDED, DEACTIVATED, or CLOSED, does the backend return 404 or 200 with `status` field?
**Mobile vote:** 200 with `status`. Gives mobile context for a "This brand is currently unavailable" placeholder. 404 conflates "doesn't exist" with "temporarily unavailable."
**Asked of:** backend, product

### MP-11 — Report merchant
**Where:** [`screens/08-merchant-profile/screen.md`](./screens/08-merchant-profile/screen.md) Layout
**The question:** v1 / v2 / never? Some moderation surface required for a marketplace.
**Mobile vote:** v1 minimum viable — overflow menu (three dots) on the floating header with "Report this brand" → simple form → `POST /reports`. v2 add detailed categories.
**Asked of:** product, legal

### MP-12 — Floating header sticky behaviour
**Where:** [`screens/08-merchant-profile/screen.md`](./screens/08-merchant-profile/screen.md) Layout §A
**The question:** same question as PD-1 for Product Detail. Floating back / mute currently scroll away with the hero.
**Mobile vote:** sticky after hero scrolls past ~50%. Cross-screen consistency with PD-1.
**Asked of:** design

### MP-13 — Merchant view analytics
**Where:** [`screens/08-merchant-profile/api-contract.md`](./screens/08-merchant-profile/api-contract.md) §6
**The question:** track merchant profile views (`POST /merchants/{id}/view`)? Same shape as `POST /products/{id}/view`.
**Mobile vote:** yes — important signal for merchant dashboards ("your profile was viewed 1,242 times this week"). Same delivery decision as [PD-8](#pd-8--view-analytics-events).
**Asked of:** backend, product

### MP-14 — Route rename (`/artist` → `/merchant`)
**Where:** [`screens/08-merchant-profile/screen.md`](./screens/08-merchant-profile/screen.md) Purpose
**The question:** the route is `/artist/[artistId]` from earlier copy that used "artist" terminology. Rename to `/merchant/[username]`?
**Mobile vote:** rename in a future refactor. Not blocking for v1 — current route still works. Worth doing before universal links cement the `/artist/` path in the public URL space.
**Asked of:** product (decide on terminology), mobile (execute refactor)

---

## Search screen — product / UX / backend questions

### SR-1 — Recent searches storage (client vs server)
**Where:** [`screens/07-search/screen.md`](./screens/07-search/screen.md) Layout §D
**The question:** persist recent searches client-side (AsyncStorage) or server-side (`/me/recent-searches`)?
**Mobile vote:** client-side for v1 (AsyncStorage). Server-side adds complexity (privacy, sync, cross-device) for marginal UX gain. v2 may move to server if cross-device demand is real.
**Asked of:** product, backend

### SR-2 — Trending tags source
**Where:** [`api/search.md`](./api/search.md) §5
**The question:** are trending tags admin-curated, algorithmic (top searches this week), or hybrid?
**Mobile vote:** hybrid — backend computes top queries weekly, admin can curate / pin specific tags. Avoids embarrassing trends (e.g. typos rising to the top).
**Asked of:** product, backend

### SR-3 — Minimum query length
**Where:** [`api/search.md`](./api/search.md) §1
**The question:** minimum `q` length before backend processes a search — 1 or 2 characters?
**Mobile vote:** 2 characters. Single-char queries return noisy results and waste server load.
**Asked of:** backend

### SR-4 — Search-as-you-type vs press-enter
**Where:** [`screens/07-search/api-contract.md`](./screens/07-search/api-contract.md) Call sequence on query change
**The question:** fire search on every (debounced) keystroke, or wait for submit?
**Mobile vote:** search-as-you-type with 250ms debounce. Faster perceived experience. Submit is still supported (forces immediate fire).
**Asked of:** product

### SR-5 — Gender filter applied to search
**Where:** [`screens/07-search/api-contract.md`](./screens/07-search/api-contract.md) §1 notes
**The question:** should search respect the global `FilterContext.activePrimaryFilter` (Women / Men / Home & Lifestyle)?
**Mobile vote:** yes. Matches the user's current browsing context. If they're in Women mode, searching "kimono" returns women's kimonos first.
**Asked of:** product

### SR-6 — Category chip behavior in Search
**Where:** [`screens/07-search/screen.md`](./screens/07-search/screen.md) Layout §B
**The question:** tapping a CategoryFilter chip on Search — does it (a) filter the active search (add `category` param), (b) navigate to a category listing screen, or (c) seed the search input with the category name?
**Mobile vote:** (a) when there's an active query (filter the current results); (b) when there's no query (the chip rail behaves like a category browser). Same chip, contextual behaviour.
**Asked of:** product, design

### SR-7 — Merchants in results
**Where:** [`api/search.md`](./api/search.md) §1
**The question:** when a user types a brand name, should the response include the merchant card itself at the top, or only product results from that merchant?
**Mobile vote:** include a merchant header row at the top when there's a strong name match (e.g. exact or fuzzy >= 0.9). Cleaner UX than burying it in product results.
**Asked of:** backend, design

### SR-8 — Search analytics
**Where:** [`api/search.md`](./api/search.md) §6
**The question:** track every search query for ranking improvements? Same form-factor as [PD-8](#pd-8--view-analytics-events) — REST endpoint or dedicated analytics pipeline?
**Mobile vote:** yes, useful for ranking; pipeline preferred over REST. Match whatever decision lands on PD-8.
**Asked of:** backend

### SR-9 — Highlight matched terms
**Where:** [`screens/07-search/screen.md`](./screens/07-search/screen.md) Results grid
**The question:** highlight the search term within product names / merchant names in results?
**Mobile vote:** v1 no (visually noisy on cards). v2 maybe in a richer "search results" view with text snippets.
**Asked of:** product, design

### SR-10 — Empty trending fallback
**Where:** [`screens/07-search/screen.md`](./screens/07-search/screen.md) States
**The question:** if `GET /search/suggestions` returns no trending (e.g. new platform with no signal), what fills the section?
**Mobile vote:** hide the Trending section entirely. Don't show empty headers.
**Asked of:** product

---

## Track Order screen — product / UX / backend questions

### TO-1 — Timeline step count (4 or 5)
**Where:** [`screens/06-track-order/screen.md`](./screens/06-track-order/screen.md) Layout §C
**The question:** prototype has 4 steps (Placed, Confirmed, Shipped, Delivered). Adding Preparing makes 5. Worth it, or merge Confirmed + Preparing?
**Mobile vote:** 5 steps. Preparing is meaningful — especially for made-to-order brands where it's the longest phase. Users want to see "Tol'thema is creating it" as a distinct state.
**Asked of:** product, design

### TO-2 — Tracking granularity
**Where:** [`api/orders.md`](./api/orders.md) §4
**The question:** how granular is the courier tracking we surface? Every scan event, or just status-level summaries (in_transit / out_for_delivery / delivered)?
**Mobile vote:** v1 status-level only on the timeline; full event list available on a dedicated "Tracking history" sub-screen if user wants the detail. v2 may surface key events (out_for_delivery, exception) inline.
**Asked of:** product

### TO-3 — Merchant-side prep status copy
**Where:** [`screens/06-track-order/screen.md`](./screens/06-track-order/screen.md) Layout §C
**The question:** during PREPARING, do we show generic copy ("Being prepared") or merchant-personalised ("Tol'thema is hand-finishing your kimono")?
**Mobile vote:** merchant-personalised when single-merchant. Falls back to generic for multi-merchant orders (see TO-8). Reinforces the brand-story value YIIVA exists to surface.
**Asked of:** product, design

### TO-4 — Cancel Order affordance
**Where:** [`screens/06-track-order/screen.md`](./screens/06-track-order/screen.md) Actions card
**The question:** confirm Cancel Order belongs in the Actions card (rather than a hidden menu or out-of-band support flow), surfaced when eligible.
**Mobile vote:** in the Actions card. Hiding it forces users to call support for a routine action.
**Asked of:** product

### TO-5 — Update Notifications destination
**Where:** [`screens/06-track-order/screen.md`](./screens/06-track-order/screen.md) Actions card
**The question:** does "Notification Settings" open global app notification settings, or per-order preferences?
**Mobile vote:** global. Per-order preferences add complexity for marginal benefit; users overwhelmingly want "tell me about my orders" globally on or off, not per-order toggling.
**Asked of:** product

### TO-6 — Details button destination
**Where:** [`screens/06-track-order/screen.md`](./screens/06-track-order/screen.md) Layout §B
**The question:** "Details →" on the order info card — opens a full order detail screen, expands inline, or shows a modal?
**Mobile vote:** dedicated screen `/account/orders/{orderId}` — the same destination as tapping a row in My Orders. Reusable, deep-linkable, supports more depth (payment breakdown, refund details, etc.).
**Asked of:** product, design

### TO-7 — External courier tracking link
**Where:** [`api/orders.md`](./api/orders.md) §4
**The question:** do we surface a link to the courier's web tracker for users who want to see raw events?
**Mobile vote:** yes, when `courierTrackingUrl` is provided. Opens in in-app browser (`expo-web-browser`) to keep the user in the app.
**Asked of:** product

### TO-8 — Multi-merchant order timeline
**Where:** [`screens/06-track-order/screen.md`](./screens/06-track-order/screen.md) States
**The question:** if items from 2+ merchants ship separately, do we show separate timelines per merchant, a consolidated timeline, or a hybrid?
**Mobile vote:** v1 single consolidated timeline (status = SHIPPED when ANY merchant ships, DELIVERED only when all merchants deliver). v2 per-merchant breakdown when multi-merchant carts mature. Aligns with [SH-1](#sh-1--multi-merchant-shipping-rates).
**Asked of:** product, design

### TO-9 — Tracking refresh frequency
**Where:** [`screens/06-track-order/api-contract.md`](./screens/06-track-order/api-contract.md) Call sequence on mount
**The question:** how often does mobile poll `/orders/{id}/tracking`? Every 5min while the screen is open, or push-driven only?
**Mobile vote:** push-driven primary, with a 5min poll fallback while the screen is open. Push notifications carry the "status changed" signal; polling is a safety net for missed pushes.
**Asked of:** backend

### TO-10 — Return / Exchange entry point
**Where:** [`screens/06-track-order/screen.md`](./screens/06-track-order/screen.md) Actions card
**The question:** should DELIVERED orders surface a Return or Exchange affordance in the Actions card? Returns are flagged as TBD elsewhere.
**Mobile vote:** yes — surface the affordance even if the returns flow itself is v2. Tapping shows "Returns coming soon — contact <merchant> for now" until the real flow ships.
**Asked of:** product

---

## Order Success screen — product / UX / backend questions

### OS-1 — Guest claim CTA prominence
**Where:** [`screens/05-order-success/screen.md`](./screens/05-order-success/screen.md) Layout §F
**The question:** how prominent should the "Save your account" CTA be for guest checkouts? Subtle section above the action buttons (current proposal), or a full-screen step before the confirmation visual?
**Mobile vote:** subtle section. The confirmation is the priority moment — interrupting it with a forced signup step feels like a bait-and-switch. The claim CTA is right there and gets re-surfaced in the order confirmation email anyway.
**Asked of:** product, design

### OS-2 — Guest order access
**Where:** [`screens/05-order-success/api-contract.md`](./screens/05-order-success/api-contract.md) §1 notes
**The question:** how does a guest user load `GET /orders/{id}` for their own order on this screen? Options: (a) the `X-Cart-Session` UUID acts as proof of ownership, (b) a one-time signed URL emailed to the buyer, (c) the order ID alone is sufficient if hard-to-guess.
**Mobile vote:** `X-Cart-Session` for v1. Same session that placed the order can read it. After session expires (e.g. user reinstalls the app), the email link in the order confirmation provides a signed URL fallback.
**Asked of:** backend, product

### OS-3 — Payment retry mechanic
**Where:** [`screens/05-order-success/api-contract.md`](./screens/05-order-success/api-contract.md) Call sequence on Try Payment Again
**The question:** for the Failed payment state, do we (a) retry payment against the same order (new `paymentUrl` for the existing `orderId`), or (b) cancel + create a new order from the cart? Option (a) needs a new endpoint `POST /orders/{id}/retry-payment`.
**Mobile vote:** option (a) — retry the same order. Simpler UX (no "where did my cart go?" surprise), and the order record stays continuous for support/analytics.
**Asked of:** backend, product

### OS-4 — Pending-state poll cap
**Where:** [`screens/05-order-success/api-contract.md`](./screens/05-order-success/api-contract.md) Call sequence on pending poll
**The question:** polling caps at 2 minutes (per current proposal). Should we extend or rely on push notifications for confirmation after that?
**Mobile vote:** 2 minutes is enough. Beyond that, the user gets a push notification when the IPN confirms. Polling longer drains battery for marginal benefit.
**Asked of:** backend (confirms IPN landing within 2min in ~99% of cases)

### OS-5 — "What's Next?" copy variation by inventory type
**Where:** [`screens/05-order-success/screen.md`](./screens/05-order-success/screen.md) Layout §E
**The question:** the "Artist will start creating your item" step assumes made-to-order. For in-stock items, what's the equivalent copy?
**Mobile vote:** "We're preparing your order for shipping." Two variants of the middle line — the rest stay the same.
**Asked of:** product, design

### OS-6 — Multi-merchant order — fulfilment messaging
**Where:** [`screens/05-order-success/screen.md`](./screens/05-order-success/screen.md) Layout §E
**The question:** if the order contains items from 2+ merchants, do we say "<Merchant> will start creating it" with multiple lines, or use a generic "Your merchants will prepare your items"?
**Mobile vote:** generic for v1 ("Your merchants will prepare your items"). v2: per-merchant accordion in the Your Order section showing per-merchant fulfilment status.
**Asked of:** product

### OS-7 — Order confirmation push
**Where:** [`screens/05-order-success/screen.md`](./screens/05-order-success/screen.md) States
**The question:** should the backend send a push notification when the order's IPN confirms (separate from the email)? This unblocks the user from staying on the pending screen.
**Mobile vote:** yes — a single push *"Your YIIVA order is confirmed"* with deep link back to this screen. Replaces aggressive polling.
**Asked of:** backend, product

### OS-8 — Estimated delivery format
**Where:** [`screens/05-order-success/screen.md`](./screens/05-order-success/screen.md) Layout §C
**The question:** how to display estimated delivery? Date range ("Arriving 10-12 June"), business-day count ("3-5 business days"), or ISO date with relative formatting?
**Mobile vote:** date range "Arriving 10-12 June" — more concrete than business days, less noisy than full ISO. Backend returns ISO dates (`estimatedDeliveryFrom` / `estimatedDeliveryTo`); mobile formats.
**Asked of:** backend, design

---

## Checkout screen — product / UX / backend questions

### CK-1 — Promo code placement
**Where:** [`screens/04-checkout/screen.md`](./screens/04-checkout/screen.md) Layout §G
**The question:** confirm promo code entry lives on Checkout (not Cart). Resolves [CT-5](#ct-5--promo-code-entry-on-cart) once confirmed.
**Mobile vote:** Checkout. One promo input, one place to enter it.
**Asked of:** product

### CK-2 — Tax calculation (15% flat or per-item)
**Where:** [`screens/04-checkout/screen.md`](./screens/04-checkout/screen.md) Prototype-only behavior
**The question:** current prototype computes tax as flat 15% VAT on the subtotal. Real ZA tax has exemptions (e.g. zero-rated items like basic food, possibly some art). Does YIIVA need per-item VAT logic for v1?
**Mobile vote:** flat 15% for v1 — fashion/beauty/streetwear (the YIIVA categories) are all VAT-rated. Backend computes; mobile renders.
**Asked of:** backend, product

### CK-3 — "Edit" address destination
**Where:** [`screens/04-checkout/screen.md`](./screens/04-checkout/screen.md) Layout §D
**The question:** does "Edit" on the delivery address open (a) an inline form to edit the current address, (b) an address book screen to pick a different saved address, or (c) both via a sheet?
**Mobile vote:** address book screen with "Edit" + "Add new" affordances. Tapping a different address selects it; tapping pencil on an address opens edit. Cleaner than inline.
**Asked of:** product, design

### CK-4 — "Change Card" destination
**Where:** [`screens/04-checkout/screen.md`](./screens/04-checkout/screen.md) Layout §F
**The question:** same shape — bottom sheet with saved cards + "Add new card" CTA, or full screen?
**Mobile vote:** bottom sheet (faster to dismiss back to Checkout).
**Asked of:** design

### CK-5 — Guest address persistence
**Where:** [`screens/04-checkout/screen.md`](./screens/04-checkout/screen.md) States
**The question:** when a guest enters an address during checkout, do we persist it to a guest profile, or only to the order record?
**Mobile vote:** only to the order record. If the guest claims their account post-purchase (per [`auth-mobile-guide.md`](./auth-mobile-guide.md) §4.10), the claim flow seeds the user's `/me/addresses` from their recent orders.
**Asked of:** backend, product

### CK-6 — Apple Pay availability detection
**Where:** [`screens/04-checkout/screen.md`](./screens/04-checkout/screen.md) Layout §F
**The question:** how do we detect Apple Pay availability — `PKPaymentAuthorizationViewController.canMakePayments()` (iOS-only), PayFast SDK helper, or just show + handle gracefully if user has no cards in Wallet?
**Mobile vote:** Native availability check at mount; hide Apple Pay row on Android, and on iOS devices that don't support it. Don't show + fail.
**Asked of:** mobile (decision is ours but flagging for visibility)

### CK-7 — Polling timeout vs IPN-only confirmation
**Where:** [`screens/04-checkout/api-contract.md`](./screens/04-checkout/api-contract.md) Call sequence on payment return
**The question:** mobile currently polls `GET /orders/{id}` for 30s after payment-return deep link. If status doesn't confirm in time, we navigate to Order Success with a pending banner. Acceptable, or should mobile keep polling longer?
**Mobile vote:** 30s timeout is fine. Beyond that, the user sees the pending banner and the eventual confirmation comes via push notification or refreshing the order detail.
**Asked of:** product, backend

---

## Orders — backend questions

### O-1 — Guest order: email as identity
**Where:** [`api/orders.md`](./api/orders.md) §1
**The question:** for guest orders, the email in the request body is the only identity hook. Backend should index orders by email so a future-claimed account can pull guest order history. Confirm?
**Mobile vote:** yes — required for the claim flow per [`auth-mobile-guide.md`](./auth-mobile-guide.md) §4.10 to surface prior orders.
**Asked of:** backend

### O-2 — Order number format
**Where:** [`api/orders.md`](./api/orders.md) §2
**The question:** what's the user-facing order number format? Example shown: `YV-2026-000142`. Confirm or amend.
**Mobile vote:** `YV-YYYY-NNNNNN` is fine. Sortable, recognisable, includes year for support context.
**Asked of:** backend, product

### O-3 — Order cancellation window
**Where:** [`api/orders.md`](./api/orders.md) §5
**The question:** at which statuses can a buyer cancel? CONFIRMED only, or also PREPARING? Post-SHIPPED is clearly a return flow, not cancel.
**Mobile vote:** CONFIRMED + PREPARING up to 24h after CONFIRMED. PREPARING beyond 24h flips to "Contact support" flow.
**Asked of:** product, backend

---

## Shipping — backend questions

### SH-1 — Multi-merchant shipping rates
**Where:** [`api/shipping.md`](./api/shipping.md) §1
**The question:** if cart has items from 2 brands, do we get one consolidated shipping fee, or separate fees per merchant (each ships from their own location)?
**Mobile vote:** v1 single consolidated fee (simpler UX). v2 per-merchant breakdown shown in Cart and Checkout as items group by brand.
**Asked of:** backend, product

### SH-2 — Postal code resolution
**Where:** [`api/shipping.md`](./api/shipping.md) §1
**The question:** does ShipLogic validate ZA postcodes, or do we need our own validator? Some addresses get "no rates" because ShipLogic doesn't recognise the area.
**Mobile vote:** rely on ShipLogic. If empty rates, show "We don't ship to <postcode> yet" with Pickup fallback.
**Asked of:** backend

### SH-3 — Pickup location source
**Where:** [`api/shipping.md`](./api/shipping.md) §2
**The question:** Courier Guy's pickup point network — does backend mirror this from ShipLogic on a schedule, or proxy live each request?
**Mobile vote:** mirrored + cached. The list changes rarely and pickup discovery shouldn't depend on ShipLogic uptime.
**Asked of:** backend

---

## Payments — product / UX / backend questions

### PMT-1 — PayFast as the primary processor
**Where:** [`api/payments.md`](./api/payments.md)
**The question:** confirm PayFast is the v1 processor per the about doc (handling card, Apple Pay, EFT, SnapScan, Payflex, etc.)? Or are we considering Stripe / Yoco?
**Mobile vote:** PayFast — it's already in the product narrative and supports the SA-specific payment methods YIIVA needs.
**Asked of:** product, backend

### PMT-2 — Apple Pay through PayFast vs. native Stripe
**Where:** [`api/payments.md`](./api/payments.md) Payment integration notes
**The question:** Apple Pay can be processed through PayFast (hosted) or through Stripe (native). PayFast keeps everything in one processor; Stripe gives a smoother native UX.
**Mobile vote:** PayFast Apple Pay — consolidating the processor simplifies reconciliation and refunds.
**Asked of:** backend

### PMT-3 — Payflex SDK vs. WebView
**Where:** [`api/payments.md`](./api/payments.md) Payment integration notes
**The question:** Payflex has an iOS/Android SDK for in-app installment selection. Use SDK (smoother) or WebView (simpler integration)?
**Mobile vote:** WebView for v1 (same path as cards via PayFast). SDK in v2 if conversion data suggests friction.
**Asked of:** product, backend

### PMT-4 — PayJustNow / Mobicred / RCS scope
**Where:** [`screens/04-checkout/screen.md`](./screens/04-checkout/screen.md) Prototype-only behavior
**The question:** Product Detail copy lists Payflex + PayJustNow + Mobicred + RCS. Checkout only has Payflex. Add them all or trim the Product Detail copy?
**Mobile vote:** v1: Payflex only (consistent across screens). Trim Product Detail copy. v2: add PayJustNow first (largest market share), then Mobicred / RCS.
**Asked of:** product

### PMT-5 — Saved cards (vault scope)
**Where:** [`api/payments.md`](./api/payments.md) §2
**The question:** does PayFast support card vaulting / tokenisation for repeat purchases? If not, every checkout requires re-entering card details (poor UX).
**Mobile vote:** required. If PayFast doesn't support it, we may need a secondary processor for vaulting (Stripe).
**Asked of:** backend

### PMT-6 — Payment-method fee disclosure
**Where:** [`screens/04-checkout/screen.md`](./screens/04-checkout/screen.md) Layout §F
**The question:** some payment methods charge fees (Payflex / BNPL providers sometimes pass merchant fees to consumer or apply surcharge). Do we disclose these in the payment selector?
**Mobile vote:** disclose if non-zero. Surface as "Payflex · 4 installments · no extra cost" or "Payflex · 4 installments · 2% fee."
**Asked of:** product, backend

---

## Addresses — backend questions

### AD-1 — Province field validation
**Where:** [`api/addresses.md`](./api/addresses.md)
**The question:** validate against a fixed list of South African provinces server-side?
**Mobile vote:** yes. Mobile renders a picker (not free text). Reduces fraud, reduces typos affecting ShipLogic queries.
**Asked of:** backend

### AD-2 — Soft-delete for in-use addresses
**Where:** [`api/addresses.md`](./api/addresses.md) §4
**The question:** when an address is referenced by an active order, do we hard-delete (and break the order's address reference), soft-delete (preserve in DB but hide from user), or block the delete?
**Mobile vote:** soft-delete. The user perceives it as deleted; backend keeps the reference so order records stay intact.
**Asked of:** backend

### AD-3 — Multiple defaults / no default
**Where:** [`api/addresses.md`](./api/addresses.md) §5
**The question:** is there always exactly one default address (backend enforces), or can a user have zero defaults?
**Mobile vote:** always exactly one. First address added is auto-default; setting a new default flips the previous one to false in the same transaction.
**Asked of:** backend

---

## Cart screen — product / UX / backend questions

### CT-1 — "Total" vs "Subtotal" labelling on Cart
**Where:** [`screens/03-cart/screen.md`](./screens/03-cart/screen.md) Layout §D
**The question:** the Cart order-summary section currently shows "Subtotal", "Shipping: Calculated at checkout", and "Total" — where Total == Subtotal because shipping/tax aren't computed yet. This is misleading.
**Mobile vote:** drop the "Total" row from the Cart screen entirely. Show only "Subtotal" and "Shipping: Calculated at checkout". The bottom button reads *"PROCEED TO CHECKOUT - R<subtotal>"*. Total is reserved for the Checkout screen.
**Asked of:** product, design

### CT-2 — Quantity `-` at 1 — confirm-remove or disabled?
**Where:** [`screens/03-cart/screen.md`](./screens/03-cart/screen.md) User actions
**The question:** when quantity is 1 and the user taps `-`, do we (a) disable the button silently (current), or (b) show a "Remove item?" confirm dialog?
**Mobile vote:** disabled. The trash button is right there for explicit removal. Confirm dialogs at every tap are friction.
**Asked of:** product, design

### CT-3 — Undo affordance on remove
**Where:** [`screens/03-cart/api-contract.md`](./screens/03-cart/api-contract.md) Call sequence on remove
**The question:** ship the 5-second Undo toast on item removal?
**Mobile vote:** yes. Cheap to implement, prevents the "I tapped trash by mistake" frustration that kills trust in the cart.
**Asked of:** product, design

### CT-4 — Save for Later / Move to Wishlist
**Where:** [`screens/03-cart/screen.md`](./screens/03-cart/screen.md) Prototype-only behavior
**The question:** v1 feature? Common pattern in marketplaces — a swipe action or affordance per item to move it from cart to wishlist without losing it.
**Mobile vote:** v2. Wishlist already exists separately. v1 doesn't need cross-list moves to be functional.
**Asked of:** product

### CT-5 — Promo code entry on Cart
**Where:** [`screens/03-cart/screen.md`](./screens/03-cart/screen.md) Prototype-only behavior
**The question:** does the user enter a promo code on Cart, or on Checkout (or both)?
**Mobile vote:** Checkout only. Adds a section above Order Summary on the Checkout screen. Cart stays clean.
**Asked of:** product

### CT-6 — Block PROCEED with sold-out items
**Where:** [`screens/03-cart/api-contract.md`](./screens/03-cart/api-contract.md) Failure modes
**The question:** if the cart contains sold-out items, do we (a) block the PROCEED button until they're removed, or (b) allow PROCEED and let Checkout filter them?
**Mobile vote:** block + banner. The Cart screen is the right place to surface the issue; pushing the problem to Checkout means a worse "wait, where did my items go?" moment.
**Asked of:** product

### CT-7 — Offline cart mutations
**Where:** [`screens/03-cart/api-contract.md`](./screens/03-cart/api-contract.md) Failure modes
**The question:** if the user changes quantity or removes an item while offline, do we (a) queue mutations to replay when online, or (b) disable mutations and show offline state?
**Mobile vote:** v1 disable. Queue-and-replay introduces conflict-resolution complexity (item already sold out, stock changed, etc.). v2 may queue.
**Asked of:** product

### CT-8 — Post-order cart clear
**Where:** [`api/cart.md`](./api/cart.md) §6
**The question:** when a checkout succeeds, does the backend auto-clear the cart server-side, or does the mobile client need to `DELETE /cart` explicitly?
**Mobile vote:** backend auto-clears as part of order creation. Mobile relies on the next `GET /cart` returning empty.
**Asked of:** backend

### CT-9 — Multi-merchant cart UX
**Where:** [`screens/03-cart/screen.md`](./screens/03-cart/screen.md) Layout §C
**The question:** if the user has items from multiple brands, do we visually group them by merchant in the Cart, or list flat?
**Mobile vote:** flat for v1 (simpler). Group by merchant in v2 when multi-merchant shipping (separate fees per brand) ships.
**Asked of:** product, design

### CT-10 — Stock validation on Cart open
**Where:** [`screens/03-cart/api-contract.md`](./screens/03-cart/api-contract.md) Call sequence on mount
**The question:** how aggressively should `GET /cart` re-validate stock + price? Every mount? Foreground? Or only on PROCEED?
**Mobile vote:** every mount + foreground. Cart staleness is the worst UX — a user arriving at Checkout to find an item sold out has lost trust in the cart.
**Asked of:** backend (performance implications)

---

## Product Detail screen — product / UX / backend questions

### PD-1 — Floating header sticky behaviour
**Where:** [`screens/02-product-detail/screen.md`](./screens/02-product-detail/screen.md) Visual layout
**The question:** the back / share / cart icons currently scroll away with the hero. Should they become sticky once the hero scrolls past?
**Mobile vote:** sticky — at minimum back + cart. Most commerce apps keep these accessible. Sticky kicks in after hero passes ~50% of its height.
**Asked of:** design

### PD-2 — "MORE →" link semantics
**Where:** [`screens/02-product-detail/screen.md`](./screens/02-product-detail/screen.md) §Layout E
**The question:** what does the "MORE →" link next to the product name open?
**Mobile vote:** a modal with the full long-form `description` from `GET /products/{id}`. The on-screen header truncates at ~1 line; the modal shows the rest.
**Asked of:** product, design

### PD-3 — "SIZE INFO →" content source
**Where:** [`screens/02-product-detail/screen.md`](./screens/02-product-detail/screen.md) §Layout G
**The question:** where does the size-chart content come from? Per-category static chart, per-merchant chart, or per-product custom chart?
**Mobile vote:** per-category static chart for v1 (e.g. "Women's tops sizing"), with optional per-product override field on the product if the merchant wants to customise (rare).
**Asked of:** product, backend

### PD-4 — "FIND YOUR FIT →" — what is it?
**Where:** [`screens/02-product-detail/screen.md`](./screens/02-product-detail/screen.md) §Layout G
**The question:** sizing quiz, AI-driven recommender, external partner link, or vapourware?
**Mobile vote:** defer to v2. Hide the button in v1 if no real feature ships. Showing it broken is worse than not showing it.
**Asked of:** product

### PD-5 — Shipping ETA modal mechanic
**Where:** [`screens/02-product-detail/screen.md`](./screens/02-product-detail/screen.md) §Layout I
**The question:** "When will I get it?" modal — does it prompt for postcode and call ShipLogic, or is shipping ETA static copy per product?
**Mobile vote:** prompt for postcode (prefill from saved default address if signed in), call `POST /shipping/eta`, return min/max days + option breakdown. Static copy can't honour delivery zones.
**Asked of:** backend, product
**Blocks:** Shipping domain spec.

### PD-6 — BNPL "3 OPTIONS →" interaction
**Where:** [`screens/02-product-detail/screen.md`](./screens/02-product-detail/screen.md) §Layout F
**The question:** does this open a modal explaining each BNPL provider, or is it an active picker that affects the cart/checkout flow downstream?
**Mobile vote:** modal explanation on Product Detail (informational); provider picker lives at Checkout where actual payment selection happens.
**Asked of:** product, design

### PD-7 — Add-to-Cart 409 recovery UX
**Where:** [`screens/02-product-detail/api-contract.md`](./screens/02-product-detail/api-contract.md) §Failure modes
**The question:** if inventory drifts between view and add (409 OUT_OF_STOCK), do we refresh the product detail in place (current proposal), or navigate to a "sold out" screen?
**Mobile vote:** refresh in place — toast + auto-refetch product. Navigating away breaks the user's intent flow.
**Asked of:** product

### PD-8 — View analytics events
**Where:** [`api/products.md`](./api/products.md) §6
**The question:** should view-event tracking go through `POST /products/{id}/view` (REST) or a dedicated analytics pipeline (Segment / PostHog / Mixpanel / custom)?
**Mobile vote:** REST for v1 (simpler, no SDK), pipeline for v2. The data model is the same either way; the question is just where the write lands.
**Asked of:** backend

### PD-9 — Variant swap mechanic
**Where:** [`screens/02-product-detail/api-contract.md`](./screens/02-product-detail/api-contract.md) §Call sequence on variant swap
**The question:** are color/material variants returned in a single `GET /products/{id}` response (mobile swaps locally), or is each variant a separate product ID (swatch tap navigates)?
**Mobile vote:** single response. Variants carry `variantId` and Add-to-Cart sends it. Cleaner UX, fewer round-trips, simpler client state.
**Asked of:** backend, product

### PD-10 — Stock display granularity
**Where:** [`api/products.md`](./api/products.md) §4 `variants[].stockCount`
**The question:** should mobile show "Only 3 left" urgency UX, or just available/unavailable?
**Mobile vote:** "Only N left" when `stockCount ≤ 5`, nothing otherwise. Backend can always return `stockCount: null` for v1 if it doesn't want to expose this.
**Asked of:** product, backend

### PD-11 — Share message content
**Where:** [`screens/02-product-detail/screen.md`](./screens/02-product-detail/screen.md) User actions
**The question:** what does the share sheet contain — just the deep link `https://yiiva.co.za/products/{id}`, or also product name + image preview?
**Mobile vote:** title + URL. Image preview is handled by Open Graph tags on the web landing page for the product (web team scope).
**Asked of:** product, web team

### PD-12 — Made-to-order CTA label
**Where:** [`screens/02-product-detail/screen.md`](./screens/02-product-detail/screen.md) States
**The question:** when `inventoryType === "made_to_order"`, what's the bottom-bar CTA label? *"ADD TO CART"*, *"PRE-ORDER"*, or *"ORDER NOW · 2-3 weeks"*?
**Mobile vote:** keep "ADD TO CART" but surface lead time prominently above the bar ("Ready in 2-3 weeks"). Pre-order language could deter buyers who don't realise it's bespoke.
**Asked of:** product, design

---

## Home screen — product / UX questions

### H-1 — Mixed feed content (products + reels)
**Where:** [`screens/01-home/screen.md`](./screens/01-home/screen.md)
**The question:** should the feed mix products with brand-story video reels (per the about doc's *"content becomes commerce"*)? If yes, the feed endpoint needs a polymorphic item type.
**Mobile vote:** v1 products only; v2 reels mixed in. Doesn't block Home v1.
**Asked of:** product

### H-2 — Promotions / discount campaigns surface
**Where:** [`screens/01-home/screen.md`](./screens/01-home/screen.md)
**The question:** should Home surface ongoing promotions? New section + new endpoint if yes.
**Mobile vote:** v2 feature. Don't block Home v1.
**Asked of:** product

### H-3 — Notifications screen design
**Where:** [`screens/01-home/screen.md`](./screens/01-home/screen.md)
**The question:** does tapping the bell open a dedicated screen, a modal, or a side panel?
**Mobile vote:** dedicated screen (stack-pushed). Matches Instagram / Pinterest patterns and gives room for actionable rows.
**Asked of:** design, product

---

## Decisions log

Once a question is answered, move it here with the date and answer. Reference the spec / screen doc that was updated.

| Date | ID | Decision | Updated docs |
|---|---|---|---|
| _(none yet)_ | | | |
