# Maya Redesign — Master Plan

> Modernize maya (Expo/RN buyer app) onto **NativeWind + react-native-reusables**
> using the **YIIVA design tokens** — feature-preserving and feature-*enhancing*.
> Read [design-tokens.md](./design-tokens.md) first.
>
> **Status: PLAN / scoping.** No app code changed. Framework LOCKED. Stack:
> Expo SDK **53**, RN **0.79.5**, React **19**, New Architecture ON, expo-router v5,
> Zustand, TanStack Query, expo-image/expo-video, reanimated.

---

## 1. Principles (same as athena)

1. **Design system, not reskin.** Tokens + a primitive kit first; ~80% of the win
   is the token layer before screens.
2. **Feature-preserving.** maya is fully wired to the live backend (auth, feed,
   product, cart, checkout, orders, tracking, chat, reels, notifications). This is
   **visual + interaction polish only** — no API, data-flow, socket, or nav-graph
   changes.
3. **Owned components, incremental.** react-native-reusables components are copied
   in (like shadcn) and restyled with tokens. NativeWind className coexists with
   existing `StyleSheet` → migrate screen-by-screen; the app always runs.
4. **Enhance while re-skinning.** Every screen we touch also gains a real UX win
   (skeletons, haptics, button loading states, bottom sheets, better empty states)
   — never a feature removed.
5. **One design language.** Identical token values to athena → web + mobile match.
6. **De-risk the bleeding edge.** SDK 53 / New Arch / React 19 are new; prove the
   NativeWind setup in a Phase 0 spike before wide adoption (fallback: hand-rolled
   kit, same tokens).

---

## 2. Current-state grounding (from the audit)

- **100% hand-rolled `StyleSheet`**, zero styling libs. **738 hardcoded hex.**
- `constants/Colors.ts` = 6-color Expo skeleton. No spacing/type/shadow scale.
- **No primitives** — every screen re-defines Button/Input/Card.
- **No brand color** (monochrome + ad-hoc accents). 3 reds, 3 light-grays.
- **Latent bugs:** `Didot`/`RobotoMono` referenced but **not loaded** (ProductCard);
  `StatusBar` hardcoded light → dark mode fake.
- **Good bones to keep + enhance:** Reels (standout overlay), Cart, Order-Success,
  Track-Order, the notification badge, the order-status color map.

---

## 3. Component mapping — bespoke → react-native-reusables + tokens

| Area | Today | Target |
|---|---|---|
| Text | raw `<Text>` + inline size/weight; `ThemedText` (Expo template) | RNR `Text` with type-scale variants (§4 tokens) |
| Button | per-screen `primaryButton`/`secondaryButton` styles (10+ copies) | RNR `Button` (variants: default/brand/outline/ghost/danger, sizes, **loading state**) |
| Input | per-screen `TextInput` styles | RNR `Input` + `Label` (token focus ring, error) |
| Card | ProductCard/VideoCard bespoke shadow+bg | RNR `Card` + elevation variants |
| Badge / status chip | inline; orders `STATUS_META`, reels action colors | RNR `Badge` (tones) + a shared `lib/order-status` map |
| Bottom sheet / modal | `SideMenu` (Animated), checkout address `Modal` | `@gorhom/bottom-sheet` (RNR-friendly) for address/variant pickers |
| Skeleton | none (plain `ActivityIndicator`) | RNR `Skeleton` shimmer for feed/cart/orders/detail |
| Tab bar | `(tabs)/_layout` hardcoded `#666` inactive | token colors + unified filled/outlined + **cart & notif badges** |
| Header | `YiivaHeader` hardcoded `#fff`/`#333`/`#e53935` | token surface + brand badge |
| Icons | `IconSymbol` (SF Symbols / Material) | **keep** — token color props |

---

## 4. Phase plan

Each phase is independently shippable and leaves the app running.

### Phase 0 — Spike & setup (de-risk; see §10)
Install NativeWind + Tailwind + RNR; wire `tailwind.config`, `global.css`,
babel/metro; add the token layer; prove **one preview screen + dark toggle**
renders on SDK 53 / New Arch (device + both platforms). **Gate:** clean setup →
proceed; painful → fall back to the hand-rolled kit (tokens unchanged).

### Phase 1 — Primitives + tokens
Bring in RNR `Text, Button, Input, Card, Badge, Skeleton, Separator, Avatar`,
restyled to tokens. Add `lib/order-status` (single source; reused by orders +
track + notifications). Fix the **font bug** (drop unloaded refs → type scale).
**Exit:** primitives render token-correct in light + dark.

### Phase 2 — Shell (navigation chrome)
Tab bar + `YiivaHeader` on tokens: brand active tint, unified icon states, **cart
count badge** + notification badge, token header surface, scheme-derived
`StatusBar`. **Exit:** consistent chrome app-wide.

### Phase 3 — Home + ProductCard (highest visibility)
Re-skin `ProductCard` (kill negative-margin hacks + font bug, token type/spacing,
tasteful violet accents, animated like/bookmark), the feed grid, FeedTabs,
trending-brands rail, category filter. Add **skeleton** feed loading. **Exit:**
the first screen looks like a modern commerce app.

### Phase 4 — Product detail + Cart
Detail: media carousel, variant chips (violet selected), sticky **Add to cart**
(loading + haptic), merchant card. Cart: token rows, quantity steppers, summary,
sticky checkout (loading). **Exit:** the buy path is polished; no logic change.

### Phase 5 — Checkout + Orders + Track
Checkout: address picker → **bottom sheet**, token forms, PayFast WebView
unchanged. Orders/Track: token status badges (shared map), timeline polish,
skeletons. **Exit:** post-purchase flows on-system.

### Phase 6 — Search + Shop + Merchant profile
Search input/browse/results, ReelsGrid, shop A–Z directory, merchant profile
(optional parallax header). **Exit:** discovery surfaces done.

### Phase 7 — Auth + account
Login/register/verify/forgot/reset on `Input`/`Button` primitives; account hub.
**Exit:** every screen a buyer touches is migrated.

### Phase 8 — Reels token-align + enhancements
Reels: keep the layout (it's the best), token-align text/accents, formalize
`like`/`save` tokens. Global enhancements: haptics (like/bookmark/ATC), pull-to-
refresh polish, empty-state upgrades, shared-element/product transitions
(optional). **Exit:** consistent + delightful.

### Phase 9 — Dark mode toggle (finale)
Surface the toggle (SideMenu/Account), scheme-derived StatusBar, verify every
screen in dark. **Exit:** dark mode live end-to-end.

---

## 5. Feature enhancements (the "enhance, not compromise" list)

All additive, no logic/feature change: skeleton loaders (feed/cart/orders/detail),
**haptics** on like/bookmark/add-to-cart (expo-haptics already available),
**loading states** on Add-to-cart / Checkout / Follow buttons, **bottom sheets**
for address + variant pickers, **tab badges** (cart count, notifications),
unified tab icon states, better empty states, gradient/elevation depth, optional
shared-element transitions. These *raise* the UX on top of existing hooks.

---

## 6. Reels — keep, don't rebuild (M5)

Reels is the app's best screen (clear overlay hierarchy, meaningful action
colors). We only **token-align** it: text → tokens, `like`/`save` colors
formalized as tokens, Buy → brand. No structural change.

---

## 7. Risks & rollback

| Risk | Likelihood | Mitigation |
|---|---|---|
| NativeWind setup fights SDK 53 / New Arch / React 19 | Med | **Phase 0 spike** proves it first; **fallback** = hand-rolled token kit (same values), zero design rework |
| oklch not RN-parseable | Resolved | tokens defined in **hex** (design-tokens §0) |
| RNR maturity / missing primitive | Low-Med | components are copy-in; pin versions; hand-roll any gap on tokens |
| Mixed old/new look mid-migration | High (expected) | phase order does primitives + shell first; time-box |
| Perf (NativeWind className overhead) | Low | v4 compiles styles; keep FlatList virtualization; measure |
| Font bug surfacing differently | Low | Phase 1 removes unloaded refs explicitly |
| Metro/babel cache issues on config change | Med | `expo start -c` after config; documented in spike |

**Rollback:** Phase 0 is isolated (revert config + preview). Each screen is its own
change; `StyleSheet` coexists with NativeWind so a partial migration never bricks
the app. No backend/nav-graph risk anywhere.

---

## 8. Out of scope (this track)

- Backend/API/socket/auth changes.
- New features (the enhancements in §5 polish existing flows only).
- Nav-graph / routing changes.
- Ejecting from Expo / changing the New Architecture setting.

---

## 9. Open items to confirm before Phase 0

- **M2–M6** (README table) — all have recommended defaults; confirm or adjust.
- Font strategy (M4): system-font type scale for v1 vs load a brand font now.
- Whether to load a shared brand font (e.g. Geist, to match athena) or keep system.

---

## 10. Phase 0 spike (the de-risk gate — do this first)

Mirror the athena prototype approach:
1. Install NativeWind v4 + Tailwind + RNR; add `tailwind.config.js`, `global.css`,
   babel `nativewind/babel`, `metro` `withNativeWind`, `nativewind-env.d.ts`.
2. Write the token layer (design-tokens §1).
3. Build **one preview screen** (`app/redesign-preview.tsx`, isolated) using RNR
   `Text/Button/Card/Badge` + a re-skinned ProductCard, with a **dark toggle**.
4. Run on **iOS + Android** (device/simulator), New Arch on. Verify: tokens
   resolve, dark flips, no metro/babel breakage, no perf cliff.
5. **Decision gate:** clean → adopt NativeWind for the full plan. Painful/broken →
   fall back to the **hand-rolled token kit** (theme.ts + StyleSheet primitives),
   reusing the identical token values — the plan's phases/screens are unchanged,
   only the authoring mechanism differs.

Revert = delete the preview screen + config files; the app is untouched.
