# YIIVA Mobile — Video Player / Reels (API Contract)

> Screen 13 · companion to [`screen.md`](./screen.md)
>
> Manifest, not spec. Endpoint shapes are defined once in [`../../api/`](../../api/) by domain. This doc says which endpoints Video Player calls, when, and any screen-specific context.
>
> Global rules → [`../../api-conventions.md`](../../api-conventions.md). Open questions → [`../../open-questions.md`](../../open-questions.md).
>
> **Every endpoint here is proposed. No reels domain exists yet.** Building this screen for real requires a merchant-side upload flow (in the merchant web dashboard, out of scope for this app) AND the buyer-side endpoints below.

---

## Endpoints called by Video Player

| # | Endpoint | Spec | When |
|---|---|---|---|
| 1 | `GET /reels` | [`api/reels.md`](../../api/reels.md) §1 (TBD) | Mount, infinite scroll |
| 2 | `GET /reels/{id}` | [`api/reels.md`](../../api/reels.md) §2 (TBD) | When entered via deep-link with a specific reelId |
| 3 | `PUT/DELETE /reels/{id}/like` | [`api/reels.md`](../../api/reels.md) §3 (TBD) | Heart tap, double-tap on video |
| 4 | `POST /reels/{id}/view` | [`api/reels.md`](../../api/reels.md) §4 (TBD) | Reel active for ≥ 3 seconds |
| 5 | `GET /reels/{id}/comments` | [`api/reels.md`](../../api/reels.md) §5 (TBD) | Comments sheet opened |
| 6 | `POST /reels/{id}/comments` | [`api/reels.md`](../../api/reels.md) §6 (TBD) | User posts a comment |
| 7 | `POST /reels/{id}/share` | [`api/reels.md`](../../api/reels.md) §7 (TBD) | Share button tap (analytics) |
| 8 | `PUT/DELETE /merchants/{id}/follow` | [`api/social.md`](../../api/social.md) §3 | Follow plus on merchant avatar |
| 9 | `POST /reels/{id}/report` | [`api/reels.md`](../../api/reels.md) §8 (TBD) | Ellipsis → Report |
| 10 | `POST /cart/items` | [`api/cart.md`](../../api/cart.md) §3 | Add to Cart from product attachment |

---

## Call sequence on mount

```
1. Read videoId / reelId from URL params (optional)
2. If reelId:
   - GET /reels/{reelId}             ← critical, blocks render
   - GET /reels?cursor=<after this reel>&limit=20   ← prefetches next reels
3. Else (default — open feed at top):
   - GET /reels?limit=20             ← critical
4. Render. First reel auto-plays.
```

## Call sequence on swipe (advance / go back)

```
On viewable item change:
1. Pause outgoing video, play incoming
2. After incoming has been active for 3s:
   - POST /reels/{id}/view (fire-and-forget analytics)
3. When near end of buffer (within last 3 reels):
   - GET /reels?cursor=<nextCursor>&limit=20 (prefetch next page)
4. Local debounce — don't fire view events if user rapidly scrolled past
```

## Call sequence on like / double-tap

```
Authenticated:
1. Optimistic: flip heart, increment likeCount
2. PUT (or DELETE) /reels/{id}/like
3. On error: revert + toast

Guest:
1. Show login modal
```

## Call sequence on Comments

```
1. Tap comment icon → bottom sheet slides up
2. GET /reels/{id}/comments?limit=20 (latest first)
3. Render list; input at bottom
4. On send: POST /reels/{id}/comments
   body: { text }
5. Append optimistic comment; reconcile from server response
```

## Call sequence on Share

```
1. Tap share → system share sheet with universal link
   `https://yiiva.co.za/reels/{id}` + title + thumbnail
2. After share sheet closes (regardless of action):
   - POST /reels/{id}/share (fire-and-forget — increments share count)
```

## Call sequence on product attachment ("Shop the look")

```
1. Tap product chip → bottom sheet with product preview
2. User selects size (if variants)
3. Tap "Add to Cart" → POST /cart/items
4. Cart badge updates; toast confirmation; user remains in reels feed
```

## Call sequence on report

```
1. Ellipsis → action sheet → "Report"
2. POST /reels/{id}/report
   body: { reason: "harassment" | "spam" | "inappropriate" | "other" }
3. Toast: "Thanks. We'll review it."
4. Auto-skip to next reel
```

---

## Video Player-specific notes per endpoint

### 1. `GET /reels`

- **Algorithmic or chronological?** See [VP-5](../../open-questions.md#vp-5--feed-algorithm). Mobile vote: personalised algorithmic (gender filter applied + follow signal + engagement history). Falls back to "trending" for guests.
- **Pagination** — cursor preferred for an infinite feed.
- **Response items include**: video URL + thumbnail + merchant + counts + `isLikedByMe` + `products[]` attachments.
- **Cache strategy** — TanStack `useInfiniteQuery`. Reels page caches for 5min; older pages drop from memory.

### 2. `GET /reels/{id}`

- **Used when deep-linked to a specific reel.** Pre-loaded into the feed at the correct position.

### 3. `PUT/DELETE /reels/{id}/like`

- **Same shape as product likes.** Idempotent.
- **Response** — `{ liked: true, likeCount: 12401 }`.

### 4. `POST /reels/{id}/view`

- **Trigger only after 3 seconds of active playback.** Prevents inflating counts from rapid scrolling.
- **Fire-and-forget** — no error handling.
- **Idempotency** — backend dedupes per (user, reel, hour) to avoid view-count manipulation from reloading.

### 5-6. `/reels/{id}/comments`

- **Threading?** Mobile vote: flat (no replies) for v1. Threaded in v2 if engagement justifies.
- **Sort** — newest first.
- **Length** — max 500 chars per comment.

### 7. `POST /reels/{id}/share`

- **Analytics only** — share count is informational. The actual share is handled by the system share sheet (no backend involvement in the share itself).

### 8. `PUT/DELETE /merchants/{id}/follow`

- **Same as Home / Merchant Profile.** Shared TanStack cache key keeps state consistent across screens.

### 9. `POST /reels/{id}/report`

- **Triggers moderation review** server-side.
- **Body** — `{ reason, details? }`.

### 10. `POST /cart/items`

- **Same as Product Detail's add-to-cart.** Same 409 OUT_OF_STOCK recovery (per [PD-7](../../open-questions.md#pd-7--add-to-cart-409-recovery-ux)).

---

## Failure modes specific to Video Player

| Scenario | Mobile behaviour |
|---|---|
| `GET /reels` fails on mount | Black screen with retry button. If a single reel was deep-linked, show that reel and let the user retry the feed below. |
| Video fails to load | Show thumbnail with retry CTA; auto-skip to next reel after 5s |
| Video buffering takes > 5s | Skeleton overlay; if > 15s, auto-skip with toast: "Couldn't load — skipping" |
| Like / follow mutation fails | Revert optimistic + toast |
| Comment post fails | Comment bubble shows "Failed — tap to retry" |
| Network drops mid-feed | Pause + offline banner; the current reel keeps playing if it had buffered enough |
| User scrolls extremely fast | Debounce view-tracking; only fire `POST /view` for reels that were active ≥ 3s |
| Reel is reported by user | Mobile filters this reel ID from the local feed for 1h; skips automatically next time |
| Guest tries to like / follow / comment | Open login modal |
| Reel has no products attached | Hide the Shop-the-look chip rail; bottom info shows only @brand + title + description |
| App backgrounds while video plays | Pause + remember position; resume on foreground |
| End of feed reached | Show "You're all caught up" overlay with CTA: refresh feed / browse YIIVA |
