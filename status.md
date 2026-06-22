# YIIVA Mobile — Project Status

> Last updated: 2026-06-19
> Read `CLAUDE.md` first for durable project context.
> Read this for **where the work is right now** and what to pick up next.

---

## Demo-environment session (2026-06-19) — read first

maya now runs against a **local DEMO backend** (`yiiva_demo` DB) on **:3005**,
serving 6 real imported brands (sakanya, suhu, madebyfade, embedded, tolthema,
fieldsstore) with full catalogues, logos, and Instagram videos. The importer
that built it lives in the **nuwa** repo (`tools/demo-importer/`); full context
in `../nuwa/docs/demo-importer/demo-importer-foundation.md` + `../nuwa/STATUS.md`.

**maya changes committed this session (`2e362a1`):**
- **Backend URL is now env-driven.** `lib/api-client.ts` (`API_BASE_URL`) and
  `lib/api.ts` (`AUTH_BASE`) read `EXPO_PUBLIC_API_URL`, falling back to the old
  platform default (`localhost:3000` / Android `10.0.2.2`). New **`maya/.env`**
  (gitignored) sets `EXPO_PUBLIC_API_URL=http://localhost:3005` → the demo
  backend. Delete `.env` (or set :3000) to return to the dev backend. Restart
  Metro with `expo start -c` after changing.
- **Video codec fix** (`lib/image-source.ts`): Instagram reels are **VP9**, which
  iOS AVPlayer can't decode → product + hero videos silently didn't play. Now
  inserts Cloudinary `vc_h264` into `/video/upload/` URLs so they deliver H.264.
  Fixes both the product-detail gallery and the merchant-hero. **Not yet
  simulator-verified** — confirm on reload (first play of each video lags ~1-2s
  while Cloudinary transcodes). See foundation §21.

**To run the demo:** start the demo nuwa on :3005 (see `../nuwa/STATUS.md`
runbook), then `expo start -c`. Logins — buyer `khanyi@yiiva.co.za` /
`khanyi@Suhu26`; merchants `<slug>@demo.yiiva.co.za` / `DemoPass1`.

**maya follow-ups from this session:** hero videos past the cover don't autoplay
on swipe (`HeroMediaItem` only play()s at player creation — small fix);
physical-device demos need `EXPO_PUBLIC_API_URL` set to the Mac's LAN IP.

---

## Where we are in one sentence

**The buyer app is fully wired to the live nuwa backend** — every active screen
runs on real data (`USE_FIXTURES = false`), auth is implemented end-to-end,
checkout reaches the PayFast sandbox, and chat is real-time over socket.io.
(2026-06-19: also runs against the local demo backend on :3005 — see above.)

---

## Integration state (completed 2026-06-11)

All wiring was done screen-by-screen against the running nuwa dev server, each
endpoint curl-verified before the screen consumed it.

| Screen | State | Notes |
|---|---|---|
| 01 Home | ✅ wired | feed (cursor-infinite), new-arrivals, trending, API categories; H&L tab = placeholder (P-4) |
| 02 Product Detail | ✅ wired | variants drive the size selector; view tracking; 404 state; add-to-cart = server |
| 03 Cart | ✅ wired | full server cart; guests see sign-in state |
| 04 Checkout | ✅ wired | address book + add form, server quote (VAT-inclusive — no client VAT math), PayFast WebView (`app/payfast.tsx`) |
| 05 Order Success | ✅ wired | status-driven; polls 5s/2min while PENDING_PAYMENT; failed/cancelled states |
| 06 Track Order | ✅ wired | timeline from statusHistory; courier-tracking card (404 = "not collected yet"); cancel within window |
| 07 Search | ✅ wired | debounced search, trending tags, recent-search persistence, tracking |
| 08 Merchant Profile | ✅ wired | real hero media (incl. videos), catalogue tabs, suspended state |
| 09 Wishlist | ✅ wired | server bookmarks, both view modes, remove syncs everywhere |
| 10 Explore | 🛑 scrapped | (backend decision — orphan surface) |
| 11 Shop | ✅ wired | A–Z directory w/ greyed alphabet index + jump-to-letter; API categories |
| 12 Chat | ✅ wired | REST writes + socket.io fan-out; optimistic send w/ idempotency key |
| 13 Video Player | ⏭ skipped | (backend decision) |

### Auth (new)

Per `docs/auth-mobile-guide.md`: `lib/secure-storage.ts` (refresh token in
expo-secure-store), `lib/auth-store.ts` (Zustand, access token memory-only),
`lib/api.ts` (authed fetch wrapper, single-flight silent refresh, four 401
variants), `lib/auth.ts` (actions + cold-start hydration + AppState foreground
refresh, wired in `_layout.tsx`). Screens: `app/auth/` — login, register,
check-email, verify-email (deep-link), forgot/reset-password (deep-link).
SideMenu is auth-aware (greeting, Sign in/out).

**Note:** hydration goes through the same single-flight guard as request-time
refresh — two parallel refreshes would revoke each other (single-use rotation).
Don't "simplify" it back to a bare fetch.

### Social model

- **Bookmarks + follows: server-backed** (`PUT/DELETE /products/:id/bookmark`,
  `/merchants/:id/follow`). State = optimistic overlay (`lib/server-social.ts`)
  over the personalised fields (`isBookmarkedByMe`/`isFollowedByMe`) that list
  responses carry when authed. Overlay resets on sign-out. Guest taps prompt
  sign-in (`useRequireAuth`).
- **Likes: local-only** (social-store) — no server model in v1 (Phalo-adjacent).

### New libraries / files

- Deps added: `expo-secure-store`, `socket.io-client`
- `lib/`: `api.ts`, `auth.ts`, `auth-store.ts`, `secure-storage.ts`,
  `server-social.ts`, `chat-socket.ts`, `payment-session.ts`, `image-source.ts`,
  `format.ts`
- `hooks/`: `useHomeQueries`, `useProductQueries`, `useCartQueries`,
  `useCheckoutQueries`, `useOrderQueries`, `useSearchQueries`,
  `useMerchantQueries`, `useShopQueries`, `useBookmarkQueries`,
  `useSocialMutations`
- `app/payfast.tsx` (PayFast WebView), `app/auth/*`

### Legacy now unconsumed (delete in a cleanup pass)

`lib/dummy-data.ts` (only its Legacy* types referenced), `lib/cart-store.ts`,
`lib/chat-store.ts`, `lib/home-fixtures.ts` (still behind the USE_FIXTURES
flag), `lib/local-assets.ts` (only via image-source fallback),
`lib/media-resolver.ts`.

### Dev conveniences

- Test user: `maya-test@yiiva.dev` / `TestPass1` (verified, ACTIVE)
- nuwa dev DB seeded with: `Product.genderType`, 4 categories (linked),
  5 trending tags (linked), S/M/L variants on Black Hoodie (L sold out),
  a Suhu dispatch address (enables real ShipLogic rates), one buyer address
- `tsc`: one pre-existing error left (`VideoCard.tsx` — skipped screen)

---

## Open work

### Verification (next)

1. **Full simulator pass of the buyer journey** — browse → sign in → add to
   cart → checkout → PayFast sandbox payment in the WebView → order-success
   polling. The payment leg doubles as nuwa's pending PayFast smoke test
   (needs ngrok for the ITN so the order flips CONFIRMED).
2. **Chat real-time check** — needs a merchant reply (merchant dashboard or
   curl on the merchant surface) to see `message:new` deliver.

### Blocked / pending

- **Chat image attachments** — needs the `chat_attachment` signed preset in the
  Cloudinary dashboard (ops). The attach button shows "coming soon".
- **Tracking events in dev** — ShipLogic sandbox doesn't fire webhooks; the
  courier card shows "not collected yet" until production.

### Screens that don't yet exist (unchanged backlog)

Account/Profile hub, My Orders list, Messages (conversation list), Address
Book (standalone), Saved Payment Methods, Notifications, Returns flow,
Category Listing (Shop category tap is still a no-op log).

### Pre-store-submission

- Remove `NSAllowsArbitraryLoads` / `usesCleartextTraffic` from `app.json`
- Universal links: associated domains + web manifests (verify-email,
  reset-password, payment-return)
- Point `lib/api-client.ts` / `lib/api.ts` base URLs at the production API
  (EXPO_PUBLIC env)

---

## Working agreements with the user

- One screen at a time; verify each endpoint against the live backend before
  the screen consumes it
- Currency: integer ZAR cents everywhere; render via `lib/format.ts` formatZAR
- VAT is **inclusive** — never add 15% client-side
- Custom fetch wrappers (`lib/api.ts` for auth surface, `lib/api-client.ts`
  for `/api`); Zustand for client state; no axios
- Terse responses; flag decisions explicitly when they need user input
