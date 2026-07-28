# YIIVA Mobile — Project Status

> Last updated: 2026-07-24 (session close)
> Read `CLAUDE.md` first for durable project context.
> Read this for **where the work is right now** and what to pick up next.

---

## 2026-07-24 — PostHog product analytics (Layer 1) wired app-wide
## (UNCOMMITTED)

Behavioral analytics shipped: **posthog-react-native** (EU cloud, POPIA)
across every key surface. tsc baseline-clean (VideoCard only), lint
baseline-clean, iOS bundle exports (5.48 MB). **⚠ All uncommitted.**

**Architecture (`lib/analytics.ts` — read this first):** module-level
PostHog singleton (most capture sites are plain TS, not components);
`PostHogProvider client=` wraps the root tree in `app/_layout.tsx` for
future component hooks. **Hard no-op when `EXPO_PUBLIC_POSTHOG_API_KEY` is
empty** (the dev default — app behaves identically). Typed
`AnalyticsEvent` union — no stringly-typed captures. Screen tracking =
manual `useScreenTracking()` (expo-router `usePathname`/`useSegments`,
reports the route PATTERN `/product/[productId]`, ids live on the events).

**Identity seam (`lib/auth-store.ts`):** `setAuthenticated` →
`identifyUser(user.id, {role})` (PII-minimal — no email/name in person
props v1) — single choke point covering login, verify-email auto-login,
cold-start + foreground refresh. `setGuest` → `reset()` **only on
authenticated→guest** (cold-start guest must NOT reset — would rotate the
anon id and break guest→signup stitching).

**Event taxonomy (18 events), co-located with the existing phalo backend
feeds (recordProductView/recordMerchantView/trackSearch untouched):**
product_viewed · brand_viewed · search_performed · search_result_clicked ·
add_to_cart · remove_from_cart (cart.tsx `removeNow` now takes the ITEM,
both call sites updated) · checkout_step_viewed (mount + goToStep) ·
payment_method_selected · order_placed · payment_cancelled ·
purchase_completed (order-success poll landing on confirmed, ref-guarded
once) · reel_viewed · reel_watched (active-effect cleanup clock, <500ms
skipped; `active` folds in nav focus so Buy-push stops the clock) ·
reel_buy_tapped · brand_subscribed/_unsubscribed · wishlist_toggled ·
sign_up_submitted. Hooks extended: `useTrackProductView` gained optional
summary param; `useTrackMerchantView` gained username param.

**Deps added:** posthog-react-native ^4.60 + expo-file-system/-application/
-localization (SDK-matched; expo-localization self-registered its config
plugin in app.json). `.env` gained the two POSTHOG vars (key EMPTY =
disabled).

**LIVE-VERIFIED (2026-07-24, owner on-device):** PostHog org created on EU
Cloud, `phc_…` key in `.env` (the key is PUBLIC — safe to commit knowledge
of, but `.env` stays gitignored), events confirmed flowing in PostHog →
Activity against demo nuwa :3005. ⚠ Free plan = **1 project per org** —
athena instrumentation later needs pay-as-you-go (card; ~1M events/mo still
free) for a second project, or an `app` property on a shared project.

**▶ NEXT:** (a) commit; (b) build the day-one insights in PostHog:
feed→product→cart→checkout→paid funnel, funnel-by-source, checkout step
drop-off; (c) later:
session replay needs the dev build (bundle with the push-notification
build); Layer 2 (nuwa /api/events for phalo) parked as its own session;
backlog otherwise unchanged (reels dynamic feed, suburb field on the
address form, dead-code cleanup, CC-1).

---

## 2026-07-09 — Bug-fix + FIELDS-demo round: portable API origin, browse-sheet
## nav fix, in-cart button, locations dropdown, reel audio (UNCOMMITTED)

Bug-cleanout + demo-polish session before the FIELDS pitch. **All
uncommitted.** tsc clean (known VideoCard error only), lint clean. nuwa's
companion work (feed shuffle + FIELDS spotlight, trending chips, brand-scoped
similar, category covers, 7 new demo brands → 15): nuwa/STATUS.md top entry.

**⚠ NETWORKING FIX (user-verified on-device):** the app now works on ANY
wifi/hotspot with zero .env edits. NEW `lib/api-origin.ts` — origin =
`EXPO_PUBLIC_API_URL` override → **Metro's `Constants.expoConfig.hostUri`
host + `EXPO_PUBLIC_API_PORT`** (=3005 demo / 3000 dev) → platform localhost
fallback. REST (`api-client.ts`), auth (`api.ts` AUTH_BASE) and the chat
socket all share it. `.env` rewritten: no more hardcoded LAN IP (that was
why cafe/hotspot demos showed no content). NEVER hardcode an IP again;
`expo start -c` after .env changes.

**Bug fixes:**
- **merchant-browse ghost-stack** (`app/_layout.tsx`): was
  `presentation:'fullScreenModal'` — product/artist pushes from inside it
  stacked INVISIBLY behind the modal and back() popped ghosts (the "can't
  open product / can't close sheet" bug). Now a card screen with
  `animation:'slide_from_bottom'` (sheet feel kept). Comment in the layout
  warns against restoring the modal.
- **Reel audio** (`app/reels.tsx`): NEW mute toggle (top-right speaker,
  session-global) + audio-kept-playing-after-close fixed — playback now
  gated on `useIsFocused()` (also stops on Buy/merchant push, resumes on
  return) + guarded pause-on-unmount safety net.

**Product screen (`app/product/[productId].tsx`):** bottom-bar button is now
cart-state-aware — in cart → outline **"In cart · View cart"** → cart tab;
variant-granular (selected size counts; other sizes stay addable); guests +
sold-out-but-carted handled. Derives live from the `['cart']` cache.
Optional follow-up: the "Added to cart" Alert is now redundant.

**Brand profile (`app/artist/[artistId].tsx`):**
- NEW **Locations dropdown** (replaces the one-line city row) + NEW
  `lib/merchant-locations.ts` fixtures (1–2 mock storefronts per demo brand,
  ⚠ SWAP POINT header). **fieldsstore's 4 entries are REAL (owner-supplied
  2026-07-09):** Old Biscuit Mill, V&A Waterfront, De Wet Square
  Stellenbosch, 44 Stanley. tolthema's mock moved to Melrose Arch to avoid
  colliding with the real FIELDS at 44 Stanley.
- **Categories rail: FIELDS-only brand-own card covers** via the new
  `categoryCovers` API field (typed in api-client, defensive-optional).
  Drop the `username === 'fieldsstore'` gate to roll out to all brands.
- **Subscribe popup**: subscribing now confirms "You will now get
  notifications when {brand} releases new items." (unsubscribe silent).
  ⚠ Promise is ahead of plumbing — no new-release notification exists in
  nuwa yet.

**▶ NEXT:** (a) **commit maya + nuwa**; (b) on-device pass of this round:
reel mute/close audio, in-cart button flip, browse-sheet product taps +
chevron close, locations dropdown, FIELDS category covers + spotlighted
feed; (c) backlog unchanged: profile "feels short" (stats line /
new-arrivals rail), hero gradient scrim, dead-code cleanup (EvenGrid,
MasonryGrid, video-player, VideoCard, dummy-data, home-fixtures,
chat-store), reels → dynamic backend feed, CC-1 envelope harmonisation.

---

## 2026-07-07 — Brand-page redesign: browse toggle + card rails + full-screen
## browse sheet; "Subscribe" vocabulary (COMMITTED at d072939) — read first

UI-polish session on the merchant/artist profile, post-demo. **All
uncommitted** (HEAD `93f89d7`). tsc clean (pre-existing VideoCard error only).

**Brand page redesigned (`app/artist/[artistId].tsx`):**
- Hero carousel height `screenWidth × 1.2` → **`× 1.33`** (owner-tuned:
  1.44 → 1.51 → 1.33; loading skeleton matches).
- The 2026-07-04 collection chip tabs + EvenGrid product grid are **GONE**
  from the profile. In their place, below bio/location: the Shop screen's
  segmented toggle (**Collections | Categories**) + a horizontal rail of
  Home-category-style cards (145×190, image + black/40 scrim + label;
  collection cards also show item counts). `EvenGrid` import dropped (now
  0 consumers — add to the dead-code cleanup list).
- Card tap → **NEW `app/merchant-browse.tsx`** — full-screen slide-up sheet
  (`presentation: 'fullScreenModal'`, registered in `app/_layout.tsx`).
  Header = name + COLLECTION/CATEGORY micro-label + chevron.down dismiss.
  Body = the exact Home-feed grid (ProductCard pairs, server bookmarks +
  local likes, auth gating, infinite scroll, pull-to-refresh, shared
  EmptyState, anatomy-matched skeletons). Filters via existing
  `useMerchantProducts(username, {collection}|{clothingType})`.
- Subscribe/Contact buttons + the screen's error/retry CTAs: `rounded-full`
  → default `rounded-lg` (app-standard rectangles).

**Categories rail data path (the gotcha):** `useCategories(null)` NEVER
fires (`enabled: gender !== null` — Home's home-lifestyle contract). Fix:
`getCategories()` genderType is now optional (omitted → `GET /api/categories`
unfiltered) + new **`useAllCategories()`** hook (24h cache) in
`hooks/useHomeQueries.ts`. The brand's category slugs come from the
unfiltered `useMerchantProducts` page-1 `categories[]`, cross-referenced
against the platform chips for names + card images. Verified live:
fieldsstore 10/10 slugs match, all with images. Owner flagged "solve it
later" — the two-hook split works but could fold into one explicit-mode hook.

**"Subscribe" vocabulary (UI copy ONLY — API/hooks/types still "follow"):**
brand page button (Subscribe/Subscribed), Home Trending Brands pills, hidden
explore screen. athena's "Followers" stat cards → "Subscribers" (see
athena/CHANGELOG.md). nuwa audited: NEW_FOLLOWER is enum-only, no copy exists.

**Backend this session (nuwa, see its STATUS.md):** collection-cover
fallback in the profile endpoint — every collection tab now has an image
(merchant-set cover wins, else first ACTIVE product's primary image).
Demo :3005 runs it; 100% coverage verified across all 8 demo brands.

**▶ NEXT:** (a) commit all three repos; (b) on-device pass of the new browse
flow (toggle, rails, sheet); (c) profile feels shorter without the grid —
candidates: stats line (subscribers · products) under the name, new-arrivals
preview rail; (d) parked polish list from the 2026-07-07 UI read (empty-state
consolidation, bookmarks safe-area hardcoded pt-16, header bg consistency,
artist modal chevron color, checkout shadow dedupe, dead-code cleanup incl.
EvenGrid); (e) hero flat black/30 overlay → bottom gradient scrim still open.

---

## 2026-07-04 — Brand-page collection tabs (SUPERSEDED 2026-07-07: chip tabs
## replaced by the browse rails above; the API work below still powers them)

The merchant/artist page catalogue tabs now mirror **the brand's own site
sections** (owner requirement). The old YIIVA-category chips are replaced by
the merchant's StoreCollections, in their site-nav order with their site-nav
labels (an "All" tab first; the row hides entirely for brands with no
collections).

- **Files (uncommitted):** `app/artist/[artistId].tsx` (tabs from
  `profile.collections`, state = `selectedCollection` slug),
  `hooks/useMerchantQueries.ts` (`useMerchantProducts(username, {clothingType?,
  collection?})`), `lib/api-client.ts` (`MerchantCollection` type on
  `MerchantProfile` + `collection` query param).
- **Backend dependency:** nuwa's (also uncommitted) collections work —
  `collections[]` on the profile + `?collection=` filter + the importer's new
  `renav` command that scraped each demo brand's live site nav. Demo **:3005 is
  running it**; the dev DB has the migration but no collection curation, so
  brand pages there just hide the tab row.
- **Verified:** tsc clean, iOS bundle clean; API verified end-to-end against
  all 6 demo brands' live sites (e.g. tolthema 30 collections → 8 tabs matching
  their menu). On-device visual pass = user's step.

**▶ NEXT: more merchant profile page work (owner's stated next focus).**

---

## 2026-07-03 — Screen-upgrade round 2 — COMMITTED at `dd0bd77`

Round-2 polish across the remaining screens (everything except Auth), plus one
structural change to checkout. All tsc + bundle verified.

- **Cart:** brand-grouped rows (mirrors the per-store order split),
  swipe-to-delete (`ReanimatedSwipeable`; `GestureHandlerRootView` added at the
  root layout — it was never wired), trash-tap now confirms, qty>1 shows line
  total, haptics. **Tab cart badge fixed:** it read the dead pre-integration
  local store — now derives from the server-cart query cache.
  **`lib/cart-store.ts` DELETED** (was fully dead once the badge moved).
- **Checkout is now 3-STEP** (safety: address chosen in Delivery, re-confirmed
  on Review before any money moves): Etsy-style circle stepper (Delivery →
  Payment → Review), address picker moved from the modal INLINE into step 1,
  PayFast card + reassurance copy on step 2 plus **mock "Soon" payment rows**
  (Apple Pay / Card with Visa+MC marks / Payflex — `MOCK_PAYMENT_METHODS`
  array, display-only), Review = editable address/payment cards + grouped
  summary + totals; COMPLETE PURCHASE only exists on step 3. Back walks steps.
- **Orders/Track:** shared EmptyState states, brand-grouped items, **one
  contact row per brand** (multi-brand purchases could only reach the first
  merchant before), tracking skeletons, cancel haptic.
- **Wishlist:** now the Home-style 2-col ProductCard grid (owner call); the
  list/masonry toggle is gone → `components/MasonryGrid.tsx` is now
  unconsumed (delete in a cleanup pass).
- **Notifications / Account / Chat:** skeleton parity, shared EmptyState,
  haptics; Account sign-out now confirms; Chat got WhatsApp-style **day
  separators**.
- **Shop:** brand rows show product counts; **category taps now work** — NEW
  `app/category/[slug].tsx` (gender-aware category listing over
  `/api/search/category`, 2-col grid, infinite scroll). Was a console.log stub.
- **New shared primitive:** `components/ui/empty-state.tsx` (the icon-circle
  pattern, `fill` variant) — used by cart/orders/track/wishlist/notifications/
  account/chat/shop/category. `lib/theme.ts` gained `dangerForeground`.

---

## 2026-07-02 — Screen-upgrade round 1 (post-redesign polish) — read first

**ALL UNCOMMITTED** (together with the SDK 54 upgrade below — commit next
session). Screen-by-screen visual/UX upgrades on top of the redesign, each
verified headless (tsc clean apart from the pre-existing VideoCard error;
`expo export -p ios` bundles clean) and visually on a physical device via
Expo Go. Backend origin: `.env` → **Mac LAN IP** `http://192.168.10.18:3005`
(physical device can't resolve localhost; IP is network-specific).

**Vocabulary: order → purchase (UI copy ONLY, owner decision).** 9 files —
headings, buttons, alerts, empty states ("My purchases", "COMPLETE PURCHASE",
"Purchase Successful!", "Track Purchase"…). Routes/hooks/types/API fields
unchanged. ⚠️ nuwa notification/email copy still says "order" — pending pass.

**Done this round:**
- **SideMenu** rebuilt: auth-driven identity header (Avatar + name + email /
  guest sign-in CTA), labeled sections, icon chips, dark-mode **Switch**,
  dead links (/returns, /gift-voucher, /help → 404) now inert "Soon" rows,
  backdrop fade, haptics, version from expo-constants. `userName` prop
  deleted (was hardcoded "Khanyisomthamo2" in 4 screens).
- **Home**: ProductCard **2:3 aspect** (was fixed 370px ≈ 1:2) — grid stays
  2-col, ~2 rows/screen now; skeletons mirror real card anatomy everywhere
  (home/search/wishlist); FeedTabs stable underline + pt-4 spacing; tab bar
  active tint = **ink** (owner call: no blue); trending brands on Avatar
  `variant="logo"`; Trending "See All" → Shop tab (ST-9); EmptyState
  icon-circle pattern; rail artist-link disabled until nuwa serves
  new-arrivals `merchant.username` (slug-guess 404'd for 4/6 demo brands).
- **Avatar `variant="logo"`** (new): contain-fit + 14% padding on an
  always-white bordered coin — logos never crop, white wordmarks stay visible
  (Embedded's needed a DB-side Cloudinary `e_colorize` fix too). Applied:
  trending, Shop directory, chat header, brand profile.
- **Search**: browse rail now shows **real categories** (gender-aware, same
  API as Home; `showAll={false}`) instead of the old Men/Women filter cards —
  tap runs a **category-scoped search** via `/api/search/category` (new
  `useCategorySearchResults` hook; results header "N results in X"; text input
  switches back to universal). Plus: **Cancel** button (hamburger tucks away),
  clear-all recents, keyboard dismiss-on-drag, no-results trending chips,
  honest placeholder, icon-circle states.
- **Discover reels grid**: 6px mosaic gutters, **staggered two-column
  "running" layout** (right column's first cell is 9:12 — `ReelCard`
  `size='short'`), gradient label scrims + play glyph. Dep added:
  **expo-linear-gradient** (first-party, SDK-matched).
- **Product page**: emoji chrome → IconSymbols; **share button now works**
  (native sheet — it had NO handler); "TAP TO ZOOM" removed (no zoom exists);
  five dead "→" CTAs removed; size chips haptic + press-scale; dots → active
  pill; merchant line reads as a link; **Similar Items → shared
  RowProductList rail** (rail itself upgraded to 2:3; See All now optional).
- **Brand page**: **hero videos now autoplay on swipe** (old backlog bug —
  playback was only started in the player-creation callback; mute toggle also
  never reached existing players, both fixed via a state-driven effect);
  category tabs → brand pill chips; EvenGrid 2:3 + dead heart removed; dots
  pill; follow haptic.

**Product-copy decisions parked:** "Get it now, pay later" section promises
Payflex/PayJustNow/Mobicred/RCS — checkout is PayFast-only v1.

**▶ NEXT:** commit everything; then continue screens: **Cart, Checkout,
Orders/Track, Wishlist, Shop, Notifications, Account, Chat, Auth**. Deferred
decisions: @gorhom/bottom-sheet (checkout address picker + brand contact
modal), nuwa new-arrivals `username` one-liner, nuwa "purchase" copy pass.

---

## ⚠️ 2026-07-02 — Backend data divergence: demo (:3005) vs dev (:3000)

The Home **category rail + gendered feeds** now depend on backend data that
exists ONLY in the demo env (`yiiva_demo` on :3005): the 18-category taxonomy
(with Cloudinary card images), gender-curated `Product.genderType`
(88 WOMEN / 40 MEN / 71 UNISEX), and jittered timestamps for feed interleaving.
nuwa's `/api/categories` also now filters chips per gender tab (unisex shows in
both). **If maya is repointed at the dev backend (:3000 / `ayana` DB), expect
few/zero category chips and identical Women/Men feeds — that's un-curated data,
not a maya bug.** Fix by running the importer's `seed-demo` + `relink` +
`regender` against that DB first. Full detail: `../nuwa/STATUS.md` (2026-07-02
divergence note).

---

## 2026-07-02 — Expo SDK 54 upgrade (UNCOMMITTED) — read first

Expo Go on physical devices only supports the latest SDK → upgraded maya
**SDK 53 → 54**: RN 0.79.5 → **0.81.5**, React 19.0 → **19.1**, reanimated 3 →
**4.1** (+ new `react-native-worklets`), expo-router 5 → **6**, expo-video 2 →
**3**, expo-image 2 → **3**. **NativeWind unpinned 4.1.23 → `^4.2`**
(css-interop 0.2.x, worklets babel — the exact-pin reason was SDK-53-only;
design-tokens §8 updated). Fixes rolled into the upgrade: `babel-preset-expo`
added as an explicit devDependency (SDK 54 stops hoisting it — bundle failed
without it); dead `lib/media-resolver.ts` deleted (referenced now-absent
`expo-asset`; zero importers); invalid `android.usesCleartextTraffic` removed
from app.json (dropped from the SDK 54 schema); `.expo/` untracked + gitignored.

**Verified headless:** `npx tsc` back to baseline (only the pre-existing unused
`VideoCard.tsx` error); `expo export -p ios` bundles clean (4.7 MB);
expo-doctor passes except the pre-existing non-square app icon (ICON_BLACK.png
580×204 — needs a real square icon asset eventually).
**NOT yet verified (user's step):** `expo start -c` (cache clear REQUIRED after
the babel/dep changes) → full visual pass on device — this doubles as the
still-pending redesign visual pass (dark-mode flip + reels playback).

---

## 2026-07-01 — Visual redesign (all 9 phases) + reels COMMITTED

**Committed at `447b515`** ("all 9 phase of visual aesthetic revamp") —
**working tree clean.** This one commit contains BOTH the full design-system
migration AND the reels feature described in the 2026-06-26 section below
(which was uncommitted at the time it was written; `app/reels.tsx`,
`ReelCard`/`ReelsGrid`, the Cloudinary-URL `reels-fixtures.ts` rebuild, and the
`assets/reels/` deletion all landed here).

**The redesign — every reachable buyer screen is now on the token design
system, with dark mode:**

- **Stack:** NativeWind v4 + token layer. ⚠️ `nativewind` pinned **EXACTLY
  4.1.23** (4.2.x needs RN 0.83+, breaks on SDK 53 / RN 0.79) and
  `tailwindcss` **v3** (^3.4, NOT v4). Wiring: `global.css` (light + `.dark`
  hex tokens) + `tailwind.config.js` + babel/metro config +
  `import '../global.css'` in `app/_layout.tsx`.
- **Brand accent = Azure/Sky `#0ea5e9`** (dark lift `#38bdf8`) — deliberately
  NOT athena's violet; same shared token system, surface-specific accent.
  `info` moved to teal `#0891b2` to avoid brand===info collision. Reels
  like/save stay red/gold (`--like`/`--save`).
- **Primitives:** `components/ui/{text,button,card,badge,input,skeleton,
  separator,avatar}.tsx` (token-driven, RNR-style, authored directly);
  `lib/utils.ts` `cn()`; `lib/order-status.ts` (single status→tone source);
  `lib/theme.ts` = JS mirror of the CSS tokens (`THEME_COLORS` +
  `useThemeColors()`) for RN APIs needing color VALUES — **keep in sync with
  global.css**.
- **Screens migrated (phases 2–9):** tab bar + header shell, Home +
  ProductCard, product detail, cart, checkout, orders/track/order-success,
  search + reels grid, Shop directory, merchant profile, auth (all 6),
  account, bookmarks, notifications, chat, SideMenu, explore, payfast wrapper.
  Full-screen reels (`app/reels.tsx`) intentionally stays dark
  (white-on-black video overlays — correct, don't "fix").
- **Dark mode toggle** lives in the **SideMenu** (nativewind
  `useColorScheme().toggleColorScheme`). StatusBar is scheme-derived.
- **Enhancements:** skeleton loading states, `lib/haptics.ts` (guarded
  expo-haptics: card like/bookmark, reels Buy/Like/Save, add-to-cart success),
  button loading states, brand press animations.
- **Font bug fixed:** all 18 unloaded Didot/RobotoMono `fontFamily` refs
  removed (only SpaceMono is loaded).
- **⚠️ Lesson (footgun):** Tailwind opacity modifiers (`bg-danger/10`) do NOT
  work on our CSS-var token colors — use the explicit `-subtle` tokens
  (`brand-subtle`, `danger-subtle`, `info-subtle`, `warning-subtle`, …).
- **Left un-migrated (acceptable):** `components/VideoCard.tsx` (unused; owns
  the one pre-existing tsc error), `app/video-player.tsx` (deprecated mockup),
  `app/+not-found.tsx`.
- Plan docs: `docs/maya-redesign/` (README + design-tokens + 9-phase plan).

**Verified:** tsc clean (only the pre-existing VideoCard error);
`expo export -p ios` bundles clean; opacity-modifier sweep clean.
**NOT yet verified (user's step):** on-device visual pass — `expo start -c`,
flip dark mode in the SideMenu, and visually confirm reels playback
(grid + full-screen; Claude only did headless bundle checks).

**▶ NEXT:** (a) device visual pass + dark-mode flip + reels playback confirm;
(b) then pick a track — dynamic reels backend feed (fixtures → nuwa-served
feed, near-zero UI swap), or the deferred redesign extras
(@gorhom/bottom-sheet pickers), or the next integration screen.

---

## 2026-06-26 — Search reels + account/notifications/orders
> ⚠️ Historical note: the "UNCOMMITTED" reels work below was committed on
> 2026-07-01 as part of `447b515` (see the section above).

**Committed at `312168e`** ("2nd round of mobile integration"): the
**`/account`** hub (profile + view-only addresses + sign out), the
**`/orders`** My Orders list, the **`/notifications`** inbox + bell badge, and
push registration (`lib/push.ts`, guarded — no-ops in Expo Go). All run against
the demo backend on :3005.

**UNCOMMITTED — the Search "reels" feature:**
- **`app/(tabs)/search.tsx`** restructured: one browse ScrollView where the top
  swaps categories ↔ trending on focus, and a **2-col reels grid stays below**.
- **`components/ReelsGrid.tsx` + `ReelCard.tsx`** — the "Discover" grid; each
  cell autoplays a muted product clip with the merchant name; tap → full-screen
  feed at that index.
- **`app/reels.tsx`** — full-screen TikTok/Insta vertical feed. Bottom-left:
  merchant logo + brand + product name/price/description. Bottom-right vertical
  action stack: **Buy** (→ product detail), **Like** (local), **Save**
  (bookmark, server + auth). Plays only the on-screen reel.

**▶ REELS PLAYBACK FIXED (2026-06-26, later) — root cause was the video SOURCE,
not sizing/codec.** Reels were the only videos resolved via
`Asset.fromModule(mod).localUri ?? .uri`. `localUri` is always null (nothing
calls `downloadAsync()`), so it served a Metro dev-server URL that expo-video
won't stream on the iOS Simulator → black grid + black full-screen feed, while
every other (Cloudinary `{uri}`) video played fine.
- **Fix = switch to the proven remote path.** `lib/reels-fixtures.ts` rebuilt:
  `video` is now a **Cloudinary URL string** (was a `require()` number);
  removed `reelVideoSource` + `expo-asset`. `ReelCard`/`reels.tsx` now build the
  player from **`imageSource(reel.video)`** — the same helper the product
  gallery + merchant hero already use (forces `vc_h264` → H.264 for iOS).
- **REELS is now 10 REAL product reels** — only yiiva_demo products that own a
  Cloudinary video (SAKANYA ×4, Suhu ×2, Tol'thema ×4), brands interleaved so
  each grid row mixes brands. Buy → that exact product. This pre-stages the
  dynamic feed (which will serve these same product videos → near-zero swap).
- **`assets/reels/` (~22 MB) DELETED** — the 9 bundled mp4s are no longer
  referenced. The 5 products without a Cloudinary video (Bravado set, Suhu
  golfer, Fade sweatpants, Embedded legging, Bria mini) dropped out; to bring a
  specific dropped clip back, upload it to `yiiva-dev` and reference the URL.
- **Verified:** tsc clean for reels (only the pre-existing `VideoCard.tsx`
  error remains); all 10 URLs return 200 + `codecs=avc1`.

**⚠️ expo-video gotcha still valid (in CLAUDE.md footguns):** `VideoView`
renders **black / zero-sized with `StyleSheet.absoluteFill`** — use explicit
`width/height: '100%'`. (The "Asset.fromModule for require'd numbers" note is
now moot for reels — we abandoned bundled assets for Cloudinary URLs.)

**▶ NEXT:** **reload maya and visually confirm reels playback** (grid +
full-screen). No `expo start -c` needed — the bundled-asset change is gone, so a
normal JS reload picks it up. Videos are Cloudinary URLs (play without :3005),
but Buy → product detail and Save need demo nuwa on :3005. Then **commit the
reels feature**.

---

## Demo-environment session (2026-06-19)

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
(2026-06-19: also runs against the local demo backend on :3005 — see above.
2026-07-01: every screen re-skinned onto the Azure token design system with
dark mode — see the top section.)

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
