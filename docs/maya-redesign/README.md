# Maya Redesign — Plan Index

> Goal: make **maya** (the Expo/React Native buyer app) look **modern, slick, and
> branded** — feature-preserving and feature-*enhancing* — reusing the **same
> YIIVA design language** we shipped on the athena web dashboard. Foundation:
> **NativeWind (Tailwind for RN) + react-native-reusables** ("shadcn for RN"),
> on the **identical token values** as athena (YIIVA violet + semantic + neutral).
>
> **Status: PLAN / scoping. Framework LOCKED (2026-07-01): NativeWind + RNR,
> de-risked with a Phase 0 spike.** No app code changed yet.

## Read in this order

1. **[design-tokens.md](./design-tokens.md)** — the token spec (colors, type scale,
   spacing, radius, elevation, dark mode), expressed for NativeWind/RN. Same
   values as athena, RN-safe (hex, not oklch).
2. **[maya-redesign-plan.md](./maya-redesign-plan.md)** — the master plan:
   principles, current-state grounding, NativeWind setup, RNR component mapping,
   phased screen migration order, feature enhancements, risks + rollback, and the
   Phase 0 spike/fallback.

## The one-paragraph summary

maya isn't ugly, it's **undesigned** — like athena was: 100% hand-rolled
`StyleSheet`, **738 hardcoded hex values**, a 6-color skeleton `constants/Colors.ts`,
no spacing/type/shadow scale, no component primitives, no brand color, and
dark-mode that's wired but doesn't actually work. Two latent bugs: `ProductCard`
references `Didot`/`RobotoMono` fonts that **aren't loaded**, and `StatusBar` is
hardcoded light. The fix is a **design system**, not a reskin: stand up NativeWind
+ the YIIVA tokens, add a react-native-reusables primitive kit, then migrate
screen-by-screen while enhancing UX (skeletons, haptics, loading states, bottom
sheets) — with the standout Reels screen kept and only token-aligned.

## Continuity with athena (design language is shared)

| Decision | athena | maya |
|---|---|---|
| Brand accent | ✅ YIIVA Violet `#6d28d9` | ✅ **Azure/Sky `#0ea5e9`** (surface-specific; `info`→teal `#0891b2`) |
| Primary | ink (near-black) | **same** |
| Neutral | zinc | **same** |
| Semantic | success/warning/danger/info | **same** |
| Dark mode | shipped (finale) | planned (finale) |
| Authoring | Tailwind + shadcn | **NativeWind + react-native-reusables** (RN analogue) |

## Decisions to confirm before Phase 0

| # | Decision | Recommended default | Where |
|---|---|---|---|
| M1 | Framework | ✅ **LOCKED: NativeWind + react-native-reusables** | plan §1 |
| M2 | Tokens = athena's values, RN-safe (hex) | Yes | design-tokens |
| M3 | Dark mode in scope (fix the fake one) | Yes — via NativeWind `colorScheme` + a toggle | design-tokens §7 |
| M4 | Font strategy | Drop the unloaded `Didot`/`RobotoMono`; type scale on system font for v1 (optional brand font later) | design-tokens §4 |
| M5 | Reels | Keep as-is; only token-align accents (it's the best screen) | plan §7 |
| M6 | Phase 0 spike before committing | Yes — prove NativeWind on SDK 53 / New Arch, else fall back to hand-rolled kit (same tokens) | plan §10 |
