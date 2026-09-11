# YIIVA Mobile — Claude project notes

Read this on session start. It's the durable context for working in this repo.

---

## What this app is

YIIVA is a mobile-first commerce platform for South Africa's creative SMEs (fashion, beauty, streetwear, art). This repo (`maya`) is the **buyer-side Expo / React Native app** — one of three planned surfaces:

| Surface | Tech | Status |
|---|---|---|
| Buyer mobile app | Expo / React Native (this repo) | UI prototype on fixtures; production wiring in progress |
| Merchant dashboard | Next.js web (separate repo) | Out of scope here |
| Admin panel | Next.js web (separate repo) | Out of scope here |

The buyer app primarily serves the `BUYER` role. Users who become merchants keep using this app as buyers; merchant operations live on the web dashboard.

**Strategic framing:** the work ahead is moving each buyer surface from "demo running on fixtures" toward "real transactions against a real backend." Every change either advances that line or it's churn.

---

## Stack

- **Expo SDK 54** (upgraded 2026-07-02), React Native 0.81.5, React 19.1, New Architecture on (`newArchEnabled: true`); reanimated 4 + react-native-worklets; NativeWind `^4.2` (the old exact-4.1.23 pin was SDK-53-only and is lifted)
- **Expo Router** v5 (file-based) with `typedRoutes` experiment
- **TanStack Query** v5 — provider mounted in `app/_layout.tsx`, mobile-tuned defaults (5min staleTime, 3× exponential retry)
- **Zustand** v5 + manual `AsyncStorage` persistence (no middleware)
- **expo-video** for video, **expo-image** for images
- TypeScript, strict-style types
- **No `axios`** — custom `fetch` wrapper in `lib/api-client.ts`. Extend it, don't replace it.

---

## Codebase tour

### Routing (`app/`)

```
app/
  _layout.tsx                root: QueryClient + FilterProvider + ThemeProvider; loads cart + social state
  index.tsx                  redirects to /(tabs)
  (tabs)/                    bottom tab routes
    _layout.tsx              5 visible tabs + Explore hidden via href:null
    index.tsx                Home feed
    profile.tsx              Shop tab (Brands ↔ Categories) — file is named profile for historical reasons
    search.tsx               Search
    cart.tsx                 Cart
    bookmarks.tsx            Wishlist
    explore.tsx              Explore (hidden tab)
  product/[productId].tsx    Product Detail
  artist/[artistId].tsx      Merchant Profile (param is actually username, not id — historical naming)
  chat/[artistId].tsx        Chat with merchant (same username quirk)
  checkout.tsx
  order-success.tsx
  track-order.tsx
  video-player.tsx           DEAD — old image-based reels mockup, 0 consumers (superseded by reels.tsx)
```

The route `/artist/[artistId]` and `/chat/[artistId]` both use a param literally named `artistId` but the value passed and expected is the **merchant username**. Future refactor: rename to `/merchant/[username]` and `/chat/[username]`. Not blocking.

### State management

| File | What |
|---|---|
| `lib/cart-store.ts` | **DELETED (2026-07-03)** — cart is fully server-backed; the tab badge reads the `['cart']` query cache |
| `lib/social-store.ts` | likedProducts (local-only likes, v1). Persisted. Bookmarks/follows are SERVER-backed via `lib/server-social.ts` overlay |
| `lib/chat-store.ts` | Dead prototype mock — 0 consumers (chat is REST + socket.io) |
| `contexts/FilterContext.tsx` | `activePrimaryFilter: 'women' \| 'men' \| 'home-lifestyle'` — drives every feed query |

**Auth store** (per `docs/auth-mobile-guide.md`): discriminated-union `{ status: 'loading' \| 'authenticated' \| 'guest' }`. Access token in memory only; refresh token in `expo-secure-store` under key `yiiva.refreshToken`.

### Data fetching

- **TanStack Query** is configured globally in `_layout.tsx`; **every active screen runs on the live `/api` surface** (hooks in `hooks/use*Queries.ts`). `lib/dummy-data.ts` has 0 consumers (dead — delete in a cleanup pass).
- **`lib/api-client.ts`** is the typed contract for all buyer endpoints (feed, product, cart, checkout, orders, merchants incl. `collections[]`, search, notifications).
- **`lib/local-assets.ts`** maps `/demo-assets/<brand>/<file>` URLs to bundled `require()` calls. Only `suhu` and `tol_thema` brands have real bundled assets. Once the backend returns absolute CDN URLs, this file disappears.

### Demo data

Two brands have bundled assets in `assets/media/`:
- `suhu` — streetwear: t-shirts, sweats, knit golfers, bags
- `tol_thema` — heritage textiles: kimonos, shirts, dresses

Dummy data: `lib/dummy-data.ts` — `DUMMY_FEED_PRODUCTS`, `DUMMY_CAROUSEL_PRODUCTS`, `getDummyMerchant`, etc.

---

## Documentation layout

Every screen has a folder under `docs/screens/`. Read these for screen-by-screen context:

```
docs/
  about_yiiva.md                  Product vision (read first)
  auth-guide.md                   Web auth contract (NOT for mobile)
  auth-mobile-guide.md            Mobile auth wiring (token store, refresh, deep links) ← READ
  api-conventions.md              Global API rules (envelope, pagination, errors, money) ← READ
  open-questions.md               ~150 open questions with mobile votes ← READ
  api/                            Canonical endpoint specs per domain
    products.md  merchants.md  categories.md  social.md  cart.md
    orders.md  shipping.md  payments.md  addresses.md  notifications.md
    search.md  chat.md  (reels.md not yet created)
  screens/                        Per-screen docs (UX + manifest)
    01-home/    02-product-detail/    03-cart/    04-checkout/
    05-order-success/    06-track-order/    07-search/
    08-merchant-profile/    09-wishlist/    10-explore/
    11-shop/    12-chat/    13-video-player/
```

Each `screens/<n>-<name>/` has:
- `screen.md` — Purpose, Entry points, Visual layout (ASCII), Layout details, User actions, States, Prototype-only behavior to deprecate
- `api-contract.md` — manifest pointing to canonical specs in `api/`, plus screen-specific call sequences, per-endpoint notes, failure modes

---

## Working conventions

### Code

- **Custom `fetch` wrapper, not axios.** Extend `lib/api-client.ts`. Auth: `lib/api.ts` (planned per auth-mobile-guide.md §3).
- **Zustand**, not Context or Redux, for client state.
- **UI vocabulary: "purchase", never "order"** (owner call 2026-07-02 — buyers purchase; merchants order). Display copy only; routes/hooks/types/API fields keep `order*`.
- **Product imagery is 2:3 portrait** app-wide (ProductCard, rails, EvenGrid, skeletons) via `aspectRatio`, never fixed heights.
- **Brand logos render via `Avatar variant="logo"`** (contain + padding on an always-white coin) — never cover-cropped like person avatars.
- **Tab bar active tint is ink**, not brand (owner call 2026-07-02). Brand/Azure is for accents: badges, links, selected chips, CTAs.
- **No comments unless WHY is non-obvious.** Don't restate what code does.
- **No emojis in code.** UI emojis only where they're already in the design.
- **Currency as integer ZAR cents** (per api-conventions.md §Money). `89900` = R899.00. **Pending backend confirmation — see open-questions §CC-2.**
- **Timestamps as ISO 8601 UTC strings.**
- **All CDN URLs absolute** (per api-conventions.md §URLs & media).

### Docs

- Per-screen docs are **self-contained for product context** but reference canonical specs in `api/` for endpoints. Track A (screens) + Track B (canonical specs) + open-questions.md is the model.
- **Mobile votes on every open question** — frontend recommendation with reasoning; backend / product can override.
- When documenting a screen, surface the prototype-only behavior in a deprecation table — it's the wiring TODO list.

### Known footguns / non-obvious

- The `/artist/[artistId]` route param is **username**, not id. Same for `/chat/[artistId]`.
- `app.json` enables `NSAllowsArbitraryLoads` (iOS) — fine for dev, **must be removed before store submission.** (`android.usesCleartextTraffic` was already dropped in the SDK 54 upgrade.)
- **`expo-video` `VideoView` renders BLACK / zero-sized with `StyleSheet.absoluteFill`** — give it **explicit `width/height: '100%'`** (see the artist/product screens and `ReelCard`/`reels.tsx`). This cost a long debug.
- **`expo-video` won't play a bare `require()`'d asset number** in Expo Go, AND `Asset.fromModule(mod).uri` (a Metro dev-server URL) doesn't stream reliably on the iOS Simulator either — `.localUri` is null until `downloadAsync()`. Lesson from the reels work: **prefer remote Cloudinary `{uri}` over bundled video assets.** The reels were rebuilt onto `imageSource(url)` (Cloudinary, `vc_h264`) exactly because the bundled-asset path rendered black. Note: `expo-image` *does* accept require numbers; `expo-video` does not. Also `@/`-aliased `require()` doesn't register assets (no babel module-resolver) — use **relative** paths for asset requires.
- **Adding/removing bundled assets needs a full Metro restart** (`expo start -c`); Fast Refresh won't re-register the asset map.
- **`useVideoPlayer`'s setup callback runs ONCE at player creation** — driving play/pause/mute there means state changes never reach the player (hero videos didn't autoplay on swipe; mute toggle was dead). Drive playback from a `useEffect` on the live state instead (see `HeroMediaItem` in artist/[artistId] and `MediaItem` in product/[productId]).
- Push-notification **delivery** can't be tested in Expo Go / the iOS Simulator (no APNs) — emails + the in-app inbox cover it; push needs a dev build on a physical device.
- **`Pressable` with a FUNCTION `style` prop (`style={({pressed}) => ...}`) silently loses ALL its styles** under NativeWind's component interop — buttons render as bare unstyled text. Cost a debug on the splash welcome gate (2026-09-08). Use the house pattern instead: `TouchableOpacity` with a plain `style`/`className` and `activeOpacity`.

### New screens (2026-06 mobile build)

- `app/account.tsx` — signed-in hub (profile + view-only addresses + sign out), reached from the SideMenu "Account" item.
- `app/orders.tsx` — "My Orders" list (`GET /api/orders`, consolidated PaymentGroups); tap → `track-order`.
- `app/notifications.tsx` — in-app inbox (`GET /api/me/notifications`); bell + unread badge in `YiivaHeader`; tap deep-links to the order. Push registration in `lib/push.ts`.
- `app/reels.tsx` + `components/ReelsGrid.tsx`/`ReelCard.tsx` + `lib/reels-fixtures.ts` — Search "Discover" reels grid → full-screen product-reel feed. Static fixtures = the 10 `yiiva_demo` products that own a Cloudinary video (real productId/price/desc/logo); each `video` is a Cloudinary URL played via `imageSource()`. Dynamic backend feed (serving these same product videos) is the next phase.

### Skills / commands

```
npm start              Expo dev server
npm run ios            Open in iOS simulator
npm run android        Open in Android emulator
npm run web            Open in browser
npm run lint           Run eslint
```

API base URL is platform-aware (`Platform.select` in `lib/api-client.ts`) — `localhost:3000` on iOS sim, `10.0.2.2:3000` on Android.

### Git / PRs

- No commit conventions documented; recent commits are minimal. Match the existing style.
- Don't push or open PRs without explicit user approval.

---

## When in doubt

- For UX context on any screen: `docs/screens/<n>/screen.md`
- For endpoint specs: `docs/api/<domain>.md`
- For "did we already decide this?": `docs/open-questions.md` (sorted by domain)
- For auth wiring details: `docs/auth-mobile-guide.md`
- For product vision: `docs/about_yiiva.md`
- For *where the work is RIGHT NOW*: `status.md`
