# YIIVA Mobile — Merchant Profile (Screen)

> Screen 08 · Route: `/artist/[artistId]` (`app/artist/[artistId].tsx`)
> Endpoints this screen calls → [`api-contract.md`](./api-contract.md)
> Open questions → [`../../open-questions.md`](../../open-questions.md) §Merchant Profile · §Merchants · §Social

---

## Purpose

The brand storefront. Where a buyer goes to see a merchant's hero content, their full catalogue, their identity (bio, location, verification, follower context), and either follow them or open a direct conversation. This screen is the foundation of YIIVA's brand-led discovery model — the buyer is following a brand, not a marketplace.

This is also the screen the merchant most cares about. It's their YIIVA home; the visual hero + verified state + bio is their brand presentation. Latency and visual fidelity here directly affect merchant satisfaction.

> The route is `/artist/[artistId]` but the param is actually the merchant **username** (per current code's `getMerchantByUsername` usage). The "artist" route name is a holdover from earlier copy; the data layer is merchant-keyed. Worth a future rename to `/merchant/[username]` for clarity, but flagged here, not blocking.

---

## Entry points

- **Product card** → merchant name / logo tap (Home, Search, Wishlist, Explore, Cart)
- **Trending Brands carousel** on Home
- **Brand directory** in Shop tab
- **Universal link** — `https://yiiva.co.za/<username>` (the brand's shareable handle URL)
- **Chat screen** — view-merchant CTA links back here
- **Deep link** — `yiivaapp://artist/<username>`

---

## Visual layout

### Standard state (active merchant)

```
┌───────────────────────────────────────────┐
│ [←]                                  [🔇] │  ← A   Floating header
│                                            │       (over hero, dark bg)
│                                            │
│            [ HERO MEDIA CAROUSEL ]         │  ← B   Hero
│          (images + videos, h-scroll)       │       1.2 × screen width
│              dark overlay 30%              │       paged
│                                            │
│  ╭──╮                                      │
│  │◯│                       · · · ●         │  ← C   Profile picture
│  ╰──╯                                      │       (overlaps hero edge)
├───────────────────────────────────────────┤
│   Tol'thema  ✓                            │  ← D   Display name + verified
├───────────────────────────────────────────┤
│   ┌──────────┐  ┌──────────┐               │
│   │  Follow  │  │ Contact  │               │  ← E   Action buttons
│   └──────────┘  └──────────┘               │
├───────────────────────────────────────────┤
│   17.2k followers · 42 products            │  ← E2  Stats (proposed —
│                                            │        not in current code)
├───────────────────────────────────────────┤
│   Heritage textiles, reimagined.           │  ← F   Bio
│   📍 Cape Town                             │       + location
├───────────────────────────────────────────┤
│   [All]  Kimono  Shirt  Dress  Set   →    │  ← G   Category tabs
│    ────                                     │       (h-scroll)
├───────────────────────────────────────────┤
│   ┌──────────────┐  ┌──────────────┐      │
│   │     IMG      │  │     IMG      │      │
│   │   R899.00    │  │   R650.00    │      │  ← H   Product grid
│   └──────────────┘  └──────────────┘      │       (EvenGrid 2-col)
│              ⋮ infinite scroll ⋮           │
└───────────────────────────────────────────┘
```

### Contact modal (overlay)

```
┌───────────────────────────────────────────┐
│ ░░░░░░░░░░ backdrop (50% black) ░░░░░░░░░ │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │  Contact Tol'thema             [✕]   │ │
│  │                                       │ │
│  │  ┌──┐                                 │ │
│  │  │💬│  Message Tol'thema      →     │ │
│  │  └──┘  Send a direct message          │ │
│  │                                       │ │
│  │  ┌──┐                                 │ │
│  │  │✉ │  Email                    →     │ │
│  │  └──┘  hello@tolthema.co.za           │ │
│  │                                       │ │
│  └──────────────────────────────────────┘ │
└───────────────────────────────────────────┘
```

### Suspended / deactivated merchant

```
┌───────────────────────────────────────────┐
│ [←]                                       │
│                                            │
│              [ ◯ greyed ]                 │
│                                            │
│         This brand is unavailable          │  ← Suspended-state placeholder
│                                            │
│   This brand is currently not available    │
│   on YIIVA. Discover other brands →        │
│                                            │
│         ┌─────────────────────────┐        │
│         │  Browse Brands          │        │
│         └─────────────────────────┘        │
└───────────────────────────────────────────┘
```

### Section → data-source key

| § | Section | Data source |
|---|---|---|
| **A** | Floating header | Back ← navigator. Mute/unmute ← local state, applies to videos in **B** |
| **B** | Hero carousel | `merchant.heroMedia[]` from `GET /merchants/{username}` |
| **C** | Profile picture + dots | `merchant.logo` ← API. Dots driven by `currentMediaIndex` local state |
| **D** | Merchant name + verified | `merchant.displayName` + `merchant.isVerified` |
| **E** | Follow + Contact buttons | Follow state ← social-store + API. Contact → opens modal |
| **E2** | Stats (proposed) | `merchant.followerCount`, `merchant.postCount` — currently in API response but NOT rendered |
| **F** | Bio + location | `merchant.bio`, `merchant.location` |
| **G** | Category tabs | `categories[]` from `GET /merchants/{username}/products` response. "All" prepended client-side |
| **H** | Product grid | `products[]` from `GET /merchants/{username}/products?clothingType=<selected>` |

### Scroll & sticky behaviour

- **Vertical scroll** on the whole content (hero scrolls away with the rest).
- **Floating header (A) is absolute over the hero** — scrolls with the hero. Worth flagging as a design call (commerce apps usually keep back accessible).
- **Hero (B) scrolls horizontally** (paged).
- **Category tabs (G) scroll horizontally.**
- **Product grid (H) is rendered via `EvenGrid` inside the outer vertical scroll** — pagination handled inline.

---

## Layout (top to bottom)

### Floating header (over hero)
- Close button (←, left, top safe-area + 10) → `router.back()`
- Mute button (🔇 / 🔊, right, top safe-area + 10) → toggles `isVideoMuted` for hero videos

### Hero section (`heroSection`, height = `1.2 × screenWidth`)
- Horizontal paged ScrollView of `heroMedia[]`
- `HeroMediaItem` renders each: image via `Image`, video via `VideoView` (autoplays only the active slide)
- Dark overlay (`heroOverlay`, rgba 0,0,0,0.3) for text legibility
- Dot indicators (bottom center) — one per media item
- Profile picture (`profilePicture`, 80×80 circular, white border) positioned absolute at `bottom: -30, left: 20` — overlaps hero and content below

### Merchant name section
- Display name (left)
- Blue verified checkmark badge (right of name, only if `isVerified === true`)

### Action buttons
- Follow button — fills black when not following, becomes light grey "Following" when active
- Contact button — outlined, opens the Contact modal

### Stats row (PROPOSED — not in current code)
- Follower count + product count, comma-separated and abbreviated (e.g. "17.2k followers · 42 products")

### Bio section
- Bio text (multi-line, no truncation in current code)
- Location row: 📍 icon + location text

### Category tabs (`categorySection`)
- Horizontal scroll, "All" + each distinct `clothingType` from the merchant's catalogue
- Selected tab has underline + bold styling
- Tap → setSelectedCategory → refetch products

### Product grid (`EvenGrid`)
- 2-column even-spaced grid (different from MasonryGrid)
- Each item: image, price
- Tap → `/product/{productId}`

### Contact modal (rendered as `Modal` component)
- Modal overlay with backdrop press-to-close
- Title: "Contact {displayName}"
- Two contact options:
  - **Message** → navigates to `/chat/{username}`
  - **Email** → opens `mailto:` with merchant's email (or `info@{username}.com` fallback)
- Close button (×) in modal header

---

## User actions

| Action | Result |
|---|---|
| Tap close (←) | `router.back()` |
| Tap mute | Toggle local `isVideoMuted` state — affects all hero videos |
| Swipe hero | Updates `currentMediaIndex`, autoplays incoming video / pauses outgoing |
| Tap Follow | Toggle follow — optimistic UI + `PUT/DELETE /merchants/{id}/follow` |
| Tap Contact | Opens Contact modal |
| Tap "Message {merchant}" in modal | Navigate to `/chat/{username}` |
| Tap "Email" in modal | Open `mailto:` link with merchant email |
| Tap close (×) in modal | Dismiss modal |
| Tap backdrop in modal | Dismiss modal |
| Tap category tab | Set selected, refetch products with new `clothingType` filter |
| Tap product card | Navigate to `/product/{productId}` |
| Pull to refresh | Refetch `/merchants/{username}` + `/merchants/{username}/products` |
| Scroll to bottom | Load next page of products (infinite scroll — currently not wired) |
| Tap profile picture | TBD — see Open Questions ([MP-3](../../open-questions.md#mp-3--profile-picture-tap)) |

---

## States

| State | Trigger | UI |
|---|---|---|
| **Loading** | First fetch in flight | Skeleton hero + name + buttons + grid |
| **Loaded** | Merchant + products resolved | Standard layout |
| **Empty catalogue** | Merchant has no products | Show profile chrome (hero, name, bio); replace grid with "No products yet" message |
| **No videos in hero** | `heroMedia` contains only images | Hide mute button |
| **Follow in flight** | After tap | Button shows spinner; revert on error |
| **Following** | User follows this merchant | Button shows "Following" with grey style |
| **Verified** | `merchant.isVerified === true` | Blue checkmark next to display name |
| **Unverified** | Not verified | No badge |
| **Suspended / Deactivated** | Merchant status changed server-side | Render suspended placeholder (variant above); hide all interactive surfaces |
| **404 — merchant not found** | Bad username | "Brand not found" + Browse YIIVA CTA |
| **Network error** | 5xx / offline | Toast + retry; cached data stays visible if present |
| **Authenticated** | Signed in | Follow + Contact work; modal Message → chat |
| **Guest** | No session | Follow prompts login modal; Contact still opens modal but Message option is gated |
| **Category change** | User taps a tab | Grid shows loading state, then renders new product set |

---

## Prototype-only behavior to deprecate

| Item | Location | Replace with |
|---|---|---|
| `getDummyMerchant` + `getDummyMerchantProducts` from dummy-data | `[artistId].tsx:23, 79, 80-83` | `useQuery` against `GET /merchants/{username}` + `useInfiniteQuery` against `GET /merchants/{username}/products` |
| `getLocalAsset` translation of demo asset paths | `[artistId].tsx:90, 102, 108` | Absolute CDN URLs from API |
| Hero logo path constructed manually as `/demo-assets/${username}/${logo}` | `[artistId].tsx:107-110` | `merchant.logo` is already an absolute URL in production |
| `useVideoPlayer` invoked conditionally inside `HeroMediaItem` | `[artistId].tsx:38-47` | Conditional hook calls are a React anti-pattern. Always invoke the hook; pass empty source when not a video |
| Stats (followers / posts) not displayed despite being in API | — | Add stats row per [MP-1](../../open-questions.md#mp-1--display-merchant-stats) |
| Email fallback to `info@{username}.com` when merchant.email is null | `[artistId].tsx:122, 190` | If email is null, hide the Email contact option entirely. Don't fabricate. |
| Mute button always shown even on images-only hero | `[artistId].tsx:232` | Show only when at least one media item is a video |
| Profile picture not tappable | — | TBD — see [MP-3](../../open-questions.md#mp-3--profile-picture-tap) |
| Hero media not preloaded — videos load on first scroll | `[artistId].tsx:38` | Use `expo-video`'s preload hints or render adjacent media items as image thumbnails first |
| Follow state from `social-store` (local) | `[artistId].tsx:77` | Server-backed once Social endpoints land |
| Bio rendered without truncation or "More" affordance | `[artistId].tsx:287` | Add truncation + tap-to-expand for long bios — see [MP-5](../../open-questions.md#mp-5--bio-truncation) |
| Floating header scrolls away with the hero (no sticky back button) | `[artistId].tsx:222-240` | Same issue as Product Detail — consider sticky after hero scrolls past. See [MP-12](../../open-questions.md#mp-12--floating-header-sticky-behaviour) |
| No "share merchant" affordance | — | Add per [MP-9](../../open-questions.md#mp-9--share-merchant) — system share with universal link |
| `info@{username}.com` is a fake email — current code's fallback for missing `email` field | `[artistId].tsx:122, 190` | Hide Email option when no email; never construct an address |
| Route is `/artist/[artistId]` but param is the username | `[artistId].tsx` route file | Consider renaming to `/merchant/[username]` in a future refactor — not blocking, but flagged |
| `EvenGrid` doesn't paginate | `[artistId].tsx:324` | Wire infinite scroll using `useInfiniteQuery` cursor |
