# YIIVA Mobile — Video Player / Reels (Screen)

> Screen 13 · Route: `/video-player?videoId=<id>` (`app/video-player.tsx`)
> Endpoints this screen calls → [`api-contract.md`](./api-contract.md)
> Open questions → [`../../open-questions.md`](../../open-questions.md) §Video Player

> ⚠️ **This screen is the closest thing in the repo to YIIVA's central product vision — and the furthest from being shippable.** It's a TikTok / Reels-style full-screen vertical video feed sketched in UI but unwired in every other way. The current code:
>
> - Renders images, not actual video
> - Has no real backend for any engagement action
> - Is not navigated to from anywhere else in the app
> - Has no link from a video to a product to buy
>
> The about doc's *"content becomes commerce"* pitch lives or dies here. Either YIIVA invests heavily to make this real (which is significant backend + merchant tooling work — see Open Questions) or this screen gets deleted from v1 and revisited when the merchant upload tooling exists.

---

## Purpose (intended)

The brand-story discovery surface. A full-screen vertical-swipe video feed where each video is a brand's creative content — behind-the-scenes, process documentaries, product launches, look-books — with a direct path from any video to its products and the merchant's profile.

This is the realisation of YIIVA's "content becomes commerce" thesis. If it ships properly, it differentiates YIIVA from every other commerce app in South Africa. If it ships as currently built (images + local state), it confuses users about what YIIVA is.

---

## Entry points (intended; currently NONE)

- **Home feed** — interleave reels among products (or as a dedicated section)
- **Explore tab** — a "Reels" carousel (per Explore EX-4)
- **Merchant Profile** — a "Reels" section showing the brand's video content
- **Product Detail** — "See this brand's reels" link
- **Push notification** — featured reels of the day
- **Deep link / universal link** — `https://yiiva.co.za/reels/<id>` → opens straight into the feed at that reel
- **Currently NONE** — no navigation in the code points here

---

## Visual layout

```
┌───────────────────────────────────────────┐
│  [✕]                                      │  ← A   Close button (top-left)
│                                            │
│                                            │
│                                            │
│           [ FULL-BLEED VIDEO ]             │  ← B   Full-screen video
│             autoplays, looped              │       (4:5 / 9:16 fitted)
│                                            │
│                                            │     ╭───╮
│                                            │     │ ◯ │ ← profile + follow +
│                                            │     ╰─+─╯
│                                            │      💗
│                                            │     12.4K  ← C   Side action
│                                            │      💬          stack (right)
│                                            │     832
│                                            │      ↗
│  @brand_username                          │     1.2K
│  Video title                              │      ⋮
│  Description (2 lines truncated…) more    │  ← D   Bottom info
│                                            │       (brand · title · desc)
│  [Shop the look →]                        │  ← E   Product attachments (NEW)
└───────────────────────────────────────────┘
    │ swipe up → next reel │
    │ swipe down → previous │
```

### Section → data-source key

| § | Section | Data source |
|---|---|---|
| **A** | Close | Pops navigator |
| **B** | Video | `reel.videoUrl` from `GET /reels` — real `VideoView` (`expo-video`) with autoplay-on-active, pause-on-inactive |
| **C** | Side actions | Profile + follow ← `merchant` + `isFollowedByMe` from reel. Like ← `reel.isLikedByMe` + `reel.likeCount`. Comment ← `reel.commentCount`. Share ← system share sheet. Ellipsis → action sheet (report / not interested / etc.) |
| **D** | Bottom info | `reel.merchant.username`, `reel.title`, `reel.description`. Description truncates to 2 lines with "more" expand |
| **E** | Product attachments (NEW) | `reel.products[]` — tappable chip → product detail OR cart-add modal |

### Scroll & sticky behaviour

- **Vertical paged scroll** — one reel per screen, paging snaps full-screen.
- **All overlays (A, C, D, E)** are positioned absolute over the video.
- **Status bar is hidden** for an immersive feel (or made translucent with light-content).
- **Video pauses when scrolled away** from active position; resumes when scrolled back.

---

## Layout (top to bottom)

### Close button
- Absolutely positioned top-left in safe area.
- Tap → `router.back()`. If no back stack, navigate to `/(tabs)`.

### Full-bleed video
- `VideoView` from `expo-video` filling the screen.
- Autoplays on entry / when becoming the active page; pauses on inactive.
- Tap on video → toggle play/pause; double-tap → like (Instagram pattern).
- Long-press → pause indefinitely until released.

### Side action stack (right side, bottom-aligned)
- Merchant avatar (circular, 48px) with a `+` follow button below it (hidden when already following)
- Like (heart + count)
- Comment (bubble + count)
- Share (forward-arrow + count)
- More (ellipsis) → action sheet: Report · Not interested · Save · Cancel

### Bottom info (bottom-left, padded above tab-bar height)
- `@merchant_username` (tappable → merchant profile)
- Video title (1 line)
- Description (truncated to 2 lines; tap to expand)
- (NEW) Product attachment chips — "Shop the look" with product thumbnail rail

### Product attachment chips (NEW, per VP-3)
- Horizontal row of small product cards
- Each chip: thumbnail + price
- Tap → opens a bottom sheet with full product card + Add to Cart + View Details
- Most reels will have 1-3 attached products; some have none (pure brand content)

---

## User actions

| Action | Result |
|---|---|
| Swipe up | Next reel; current video pauses, next autoplays |
| Swipe down | Previous reel |
| Tap close | Back to entry point |
| Tap video | Toggle play/pause |
| Double-tap video | Like (with heart-burst animation) |
| Tap merchant avatar / username | Navigate to `/artist/{username}` |
| Tap follow (+) | Optimistic follow + API call |
| Tap heart | Toggle like (optimistic + API) |
| Tap comment | Open comments sheet (TBD — see [VP-4](../../open-questions.md#vp-4--comments-system)) |
| Tap share | System share sheet with universal link |
| Tap ellipsis | Action sheet: Report · Not interested · Save · Cancel |
| Tap "Shop the look" chip | Bottom sheet with product card + Add to Cart |
| Tap to expand description | Expand to full description with brand context |
| Background while playing | Pause; persist position so resume picks up |
| Foreground | Resume from saved position |

---

## States

| State | Trigger | UI |
|---|---|---|
| **Loading initial** | First reel fetching | Black screen with spinner |
| **Playing** | Reel is active page | Standard layout, video plays |
| **Paused** | User tapped to pause | Play icon overlay shown briefly |
| **Buffering** | Video downloading mid-play | Spinner overlay over video |
| **Video failed to load** | Network / unsupported codec | Show static thumbnail with retry CTA; auto-skip to next after 5s |
| **End of feed** | No more reels to load | Loop back to top OR show "You're all caught up" placeholder |
| **Following merchant** | `isFollowedByMe` true | Hide the `+` follow button |
| **Liked** | `isLikedByMe` true | Heart icon is filled red |
| **Comments loading** | After tapping comment | Sheet slides up with spinner |
| **No products attached** | `reel.products.length === 0` | Hide the product chip rail |
| **Reported reel** | User reports | Toast: "Thanks. We'll review it." Auto-skip to next reel. |
| **Network offline** | Lost connection | Pause + banner: "You're offline." |
| **Authenticated** | Signed in | Full functionality |
| **Guest** | No session | Like / follow / comment prompt for sign-in |

---

## Prototype-only behavior to deprecate

| Item | Location | Replace with |
|---|---|---|
| Renders `Image` instead of `VideoView` — calls them "videos" but they're static thumbnails | `video-player.tsx:176` | `VideoView` from `expo-video` with real `videoUrl` |
| Hard-coded `mockVideos` array | `video-player.tsx:34-100` | `useInfiniteQuery` against `GET /reels` |
| Image paths use `assets/images/...` including the broken `' masonwabe_profile_pic.png'` (leading space) | `video-player.tsx:37-99` | Absolute CDN URLs from API |
| Like toggle is local state only | `video-player.tsx:132-138` | `PUT/DELETE /reels/{id}/like` (proposed) |
| Follow toggle is local state only | `video-player.tsx:140-146` | `PUT/DELETE /merchants/{id}/follow` (existing) |
| Share handler is `console.log` | `video-player.tsx:148-151` | Wire to `Share.share({ url: 'https://yiiva.co.za/reels/' + reel.id })` |
| Comment handler is `console.log` | `video-player.tsx:153-156` | Open Comments sheet — full feature TBD per [VP-4](../../open-questions.md#vp-4--comments-system) |
| **Artist navigation uses kebab-cased display name as the username** | `video-player.tsx:158-161` | Use `reel.merchant.username` directly. Current code: `artistName.toLowerCase().replace(/\s+/g, '-')` → broken. |
| `loadMoreVideos` duplicates the same 5 videos with mangled IDs | `video-player.tsx:163-170` | Real pagination via cursor |
| No view tracking (analytics) | — | `POST /reels/{id}/view` on each reel becoming active for ≥ 3s |
| No connection from videos to products to buy | — | **Add `reel.products[]` and the Shop-the-look chip rail** — see [VP-3](../../open-questions.md#vp-3--product-attachments-shop-the-look) — this is the core of "content becomes commerce" |
| Ellipsis (more) button has no handler | `video-player.tsx:234-236` | Wire to action sheet: Report · Not interested · Save · Cancel |
| No background audio handling | — | Pause when app backgrounds; resume on foreground (per [VP-8](../../open-questions.md#vp-8--background-audio-handling)) |
| Engagement counts are static strings ("12.4K") | `video-player.tsx:42, 67, 94` | Real counts from `GET /reels` response |
| No mute/unmute affordance | — | Add a mute icon (top-right) — important since reels autoplay with sound |
| **Not navigated to from anywhere in the app** | — | Wire entry points per Entry points section above |
| `initialScrollIndex` + `getItemLayout` interaction with paging is fragile | `video-player.tsx:274-279` | Verify behaviour with real videos (height handling differs from images) |
