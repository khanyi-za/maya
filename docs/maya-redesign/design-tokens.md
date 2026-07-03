# Maya Design Tokens (NativeWind / React Native)

> The foundation. Same YIIVA design language as athena, expressed for NativeWind +
> React Native. Every screen references these tokens instead of the ~738 ad-hoc
> hex values in the app today.
>
> **Status: PROPOSED. Values mirror athena (M2); RN-safe hex (not oklch).**

---

## 0. RN-specific reality (why this differs from athena's file)

- **No oklch.** React Native's color engine doesn't parse `oklch()`. athena's
  tokens are oklch; here we use the **hex equivalents of the same colors**. Same
  palette, RN-parseable.
- **Tokens as CSS variables** in a `global.css` (`:root` + `.dark`), mapped in
  `tailwind.config.js` `theme.extend.colors` via `var(--…)` — the same model as
  athena, so `bg-card`, `text-foreground`, `text-brand`, `border-border`, etc.
  work as className utilities and are theme-aware.
- **Dark mode** is driven by NativeWind's `colorScheme` (system + app toggle via
  `colorScheme.set()`), which flips the `.dark` variable set. `darkMode: 'class'`
  in tailwind config.

---

## 1. Color tokens (hex — light & dark)

`global.css`:

```css
:root {
  --background: #ffffff;
  --foreground: #18181b;   /* zinc-950 ink */

  --card: #ffffff;
  --card-foreground: #18181b;
  --popover: #ffffff;
  --popover-foreground: #18181b;

  --primary: #18181b;              /* ink — matches athena */
  --primary-foreground: #fafafa;

  --brand: #0ea5e9;                /* maya brand = Azure/Sky (athena stays violet) */
  --brand-foreground: #fafafa;
  --brand-subtle: #e0f2fe;         /* sky tint for active/selected */

  --secondary: #f4f4f5;            /* zinc-100 */
  --secondary-foreground: #18181b;
  --muted: #f4f4f5;
  --muted-foreground: #71717a;     /* zinc-500 */
  --accent: #f4f4f5;
  --accent-foreground: #18181b;

  --border: #e4e4e7;               /* zinc-200 */
  --input: #e4e4e7;
  --ring: #0ea5e9;                 /* brand */

  --success: #0f9d6f;  --success-foreground: #ffffff;
  --warning: #d08700;  --warning-foreground: #18181b;
  --danger:  #dc2626;  --danger-foreground:  #ffffff;
  --info:    #0891b2;  --info-foreground:    #ffffff;   /* teal — brand took blue */

  /* meaningful accent colors already in Reels — formalized, not changed */
  --like: #ff3040;     /* heart */
  --save: #ffd24d;     /* bookmark */
}

.dark {
  --background: #0c0c0f;
  --foreground: #fafafa;
  --card: #18181b;         --card-foreground: #fafafa;
  --popover: #18181b;      --popover-foreground: #fafafa;
  --primary: #fafafa;      --primary-foreground: #18181b;
  --brand: #38bdf8;        --brand-foreground: #0c0c0f;   /* Azure lifted for dark */
  --brand-subtle: #14293b;
  --secondary: #27272a;    --secondary-foreground: #fafafa;
  --muted: #27272a;        --muted-foreground: #a1a1aa;
  --accent: #27272a;       --accent-foreground: #fafafa;
  --border: #27272a;       --input: #27272a;   --ring: #38bdf8;
  --success: #34d399; --success-foreground: #0c0c0f;
  --warning: #fbbf24; --warning-foreground: #0c0c0f;
  --danger:  #f87171; --danger-foreground:  #0c0c0f;
  --info:    #22d3ee; --info-foreground:    #0c0c0f;
  --like: #ff3040; --save: #ffd24d;
}
```

`tailwind.config.js` maps each `--token` to a `colors.*` name (background,
foreground, card, primary, brand, brand-subtle, muted, muted-foreground, border,
ring, success, warning, danger, info, like, save) → yields `bg-*`/`text-*`/
`border-*` utilities, theme-aware.

> **Replaces:** 167×`#000`, 141×`#fff`, 113×`#666`, the 3 conflicting reds, the
> 3 light-grays, etc. — all route through tokens.

---

## 2. Neutral

Standardize on **zinc** (same as athena). The pile of `#333/#666/#999/#ccc/#ddd`
collapses to `foreground` / `muted-foreground` / `border`. Kill `text-black` →
`text-foreground`, `bg-white` (as a surface) → `bg-card`/`bg-background`.

---

## 3. Brand usage (ink primary + Azure/Sky accent)

Same rule as athena: **primary = ink** (buttons/text stay classy), **brand =
Azure/Sky blue `#0ea5e9`** for the pops — active tab, selected chips, links, focus
rings, primary CTAs where they should stand out (Add to cart, Checkout), the Buy
action, badges. **Note:** maya's accent is blue (athena's is violet) — a deliberate
surface-specific accent on a shared system; `info` moved to teal `#0891b2` so it
doesn't collide with the now-blue brand.
The Reels **like (red)** and **save (gold)** stay — they're action-semantic, now
formalized as `--like` / `--save` tokens.

---

## 4. Typography (M4 — fix the font bug)

**Bug:** `ProductCard` uses `fontFamily: 'RobotoMono'` (title) + `'Didot'`
(price), but only `SpaceMono` is loaded → silent system fallback. v1 fix: **drop
the unloaded font refs** and use one clean type scale on the system font
(San Francisco / Roboto). Optionally load a brand display/serif later behind the
same `font-*` token.

Type scale (semantic, replaces per-component `fontSize` duplication):

| Token | Size / weight | Use |
|---|---|---|
| `text-display` | 28 / 700 | screen hero titles |
| `text-title` | 22 / 700 | section titles |
| `text-heading` | 18 / 600 | card titles |
| `text-body` | 15 / 400 | body |
| `text-label` | 15 / 600 | buttons, emphasis |
| `text-caption` | 13 / 400 | meta |
| `text-micro` | 11 / 500 | badges, overlines |

Numbers/prices use `tabular-nums`. Delivered as a `<Text>` primitive variant
(RNR) so screens stop hand-sizing.

---

## 5. Spacing

4px base scale (replaces the `gap: 3/6/8/12/16/24/30` chaos): **1=4, 2=8, 3=12,
4=16, 5=20, 6=24, 8=32, 12=48**. Screen gutter `px-5` (20). Card padding `p-4`.
Stack gaps `gap-3`/`gap-4`. NativeWind maps these to the Tailwind spacing scale
directly. Retire the negative-margin hacks in ProductCard.

---

## 6. Radius & elevation

- **Radius:** `--radius: 12`. `rounded-lg` cards/inputs/buttons; `rounded-full`
  pills/avatars. Kills the `1/3/4/6/8/10/12/16/20` spread.
- **Elevation:** 3 named shadow presets (the 3 ad-hoc ones today) — `shadow-sm`
  (cards), `shadow-md` (raised/sheets), `shadow-lg` (modals). On RN, expressed as
  a small set of shadow style objects (iOS shadow* + Android elevation) exposed as
  `Card` variants, since NativeWind shadow utilities are limited on native.

---

## 7. Dark mode (M3 — make it real)

Today it's fake (StatusBar hardcoded light, screens hardcoded `#fff`). Fix:
- Every migrated screen speaks tokens → flips automatically.
- Drive via NativeWind `colorScheme` (system default) + an in-app **toggle**
  (`colorScheme.set('dark'|'light')`), surfaced in the SideMenu / Account.
- `StatusBar` style derived from the active scheme (not hardcoded).
- Ships as the **finale**, once screen coverage is complete (same as athena).

---

## 8. Setup deps

- `nativewind` (v4) + `tailwindcss` + `react-native-css-interop` (transitive)
- `react-native-reusables` primitives (+ their RN primitive deps, e.g.
  `@rn-primitives/*`) — the shadcn-for-RN kit
- already present and reused: `react-native-reanimated`, `react-native-safe-area-context`,
  `expo-image`, `expo-blur`, `@expo/vector-icons`
- Config touch: `tailwind.config.js`, `global.css`, `babel.config.js`
  (nativewind preset), `metro.config.js` (`withNativeWind`), `nativewind-env.d.ts`.
  **All validated in the Phase 0 spike** (plan §10) — the app bundles cleanly
  (`expo export -p ios` succeeded on SDK 53 / RN 0.79 / New Arch).

### Version notes
- **SUPERSEDED (2026-07-02, SDK 54 upgrade):** the old exact `nativewind@4.1.23`
  pin applied only while maya was on SDK 53 / RN 0.79 (no `react-native-worklets`).
  maya is now on **Expo SDK 54 / RN 0.81 / reanimated 4 + react-native-worklets**,
  and `nativewind` is on **`^4.2`** (css-interop 0.2.x, worklets-based babel) —
  verified bundling cleanly via `expo export -p ios`.
- `tailwindcss` stays on the **v3** line (`^3.4.x`) — NativeWind v4 is built on
  Tailwind v3, NOT v4 (athena web uses v4; they diverge here intentionally).
- `babel-preset-expo` is now an explicit devDependency — SDK 54 no longer hoists
  it, and our custom `babel.config.js` references it by name.
