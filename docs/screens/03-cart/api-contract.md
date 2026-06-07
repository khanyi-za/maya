# YIIVA Mobile — Cart (API Contract)

> Screen 03 · companion to [`screen.md`](./screen.md)
>
> Manifest, not spec. Endpoint shapes are defined once in [`../../api/`](../../api/) by domain. This doc says which endpoints Cart calls, when, and any screen-specific context.
>
> Global rules → [`../../api-conventions.md`](../../api-conventions.md). Open questions → [`../../open-questions.md`](../../open-questions.md).

---

## Endpoints called by Cart

| # | Endpoint | Spec | When |
|---|---|---|---|
| 1 | `GET /cart` | [`api/cart.md`](../../api/cart.md) §2 | Mount, pull-to-refresh, return-from-checkout |
| 2 | `PATCH /cart/items/{itemId}` | [`api/cart.md`](../../api/cart.md) §4 | User taps `+` or `-` on quantity |
| 3 | `DELETE /cart/items/{itemId}` | [`api/cart.md`](../../api/cart.md) §5 | User taps 🗑 trash |
| 4 | `DELETE /cart` | [`api/cart.md`](../../api/cart.md) §6 | "Clear cart" affordance (TBD — not in current UI) |

Note: this screen does NOT call `POST /cart/items` (add-to-cart lives on Product Detail) or `GET /cart/summary` (the lightweight summary endpoint — Cart needs the full cart payload anyway).

---

## Call sequence on mount

```
1. GET /cart   ← critical, blocks render
   - Authed: Authorization header
   - Guest:  X-Cart-Session header (UUID from SecureStore)
2. Compute UI from response:
   - cart.items.length === 0 → render empty state
   - any item has available === false → mark "Sold out" badge on that row
   - any item has unitPrice !== item's last-known price → "Price changed" banner
3. Render.
```

## Call sequence on quantity change (`+` or `-`)

```
1. Optimistic: update local cache item.quantity, recompute subtotal locally
2. Disable both qty buttons on that row, show subtle spinner
3. PATCH /cart/items/{itemId}
   body: { quantity: <newQuantity> }
4a. 200 → confirm with server response (subtotal may differ slightly if a price
       drift happened mid-update); re-enable buttons
4b. 409 OUT_OF_STOCK → revert quantity, toast "Only N available",
       refetch GET /cart to refresh availability flags
4c. 404 CART_ITEM_NOT_FOUND → item was already removed elsewhere;
       refetch GET /cart, remove this row from the list
4d. 5xx / network → revert quantity, toast "Couldn't update. Try again."
```

## Call sequence on remove (🗑)

```
1. Optimistic: remove from local cache, fade-out animation
2. DELETE /cart/items/{itemId}
3a. 200 → confirm; show toast with Undo affordance (5s)
       - If Undo tapped → POST /cart/items { productId, variantId, quantity }
3b. 404 CART_ITEM_NOT_FOUND → already gone; treat as success
3c. 5xx / network → re-insert item, toast "Couldn't remove. Try again."
```

## Call sequence on PROCEED TO CHECKOUT

```
1. (Optional) Refetch GET /cart silently to validate one last time
2. Navigate to /checkout
3. Checkout screen re-fetches the cart on its own mount —
   the silent refetch here is a courtesy to surface stock issues
   BEFORE the user is staring at a checkout screen
```

---

## Cart-specific notes per endpoint

### 1. `GET /cart`

- **Critical path** — blocks render. Failure → error state with retry.
- **Auth mode** — uses `Authorization` if signed in, `X-Cart-Session` if guest. Backend resolves automatically. If both are present and the user has an empty authed cart, backend should merge the guest cart into it (see [open-questions §C-2](../../open-questions.md#c-2--guest-cart-reconciliation-on-login)).
- **Cache strategy** — TanStack Query staleTime 0, gcTime 5min. Always refetch on mount + on foreground via `AppState` listener. Stale cart data is the worst user experience this screen has — better to skeleton briefly.
- **Pull-to-refresh** — same fetch, re-validates stock + price.
- **Response is full cart** — items + subtotal + itemCount. No need to also call `/cart/summary` from this screen.

### 2. `PATCH /cart/items/{itemId}`

- **Optimistic** — update local item quantity immediately. Recompute subtotal client-side from the new quantity + cached unit price. Reconcile from server response when it arrives.
- **Debounce** — if the user taps `+` rapidly (5 taps in 2s), debounce so only the final quantity is sent. Single in-flight request per item at a time.
- **Stock validation** — backend returns 409 if the requested `quantity > stockCount`. Mobile reverts the optimistic update on 409.
- **Response includes the full updated cart** so the mobile client can reconcile subtotal + any cross-item effects (e.g. a quantity-based discount kicks in).

### 3. `DELETE /cart/items/{itemId}`

- **Optimistic** — remove from list immediately with a fade-out.
- **Undo affordance** — toast with "Undo" for 5 seconds. If tapped, fire `POST /cart/items` to re-add. This matters because trash buttons on touch screens get accidentally tapped often.
- **Idempotent** — 404 is treated as success (item already removed elsewhere).

### 4. `DELETE /cart`

- Not currently exposed in the UI. Useful if we add a "Clear cart" action (e.g. in an overflow menu) or as a post-checkout cleanup.
- **Post-order behaviour:** when checkout succeeds, the backend should clear the cart server-side as part of order creation. Mobile should NOT need to call `DELETE /cart` after a successful checkout — the cart returns empty on the next `GET /cart`.

---

## Failure modes specific to Cart

| Scenario | Mobile behaviour |
|---|---|
| `GET /cart` fails on mount | Full-screen error with retry button. If we have a cached cart from a previous session, show it with a "Showing your last cart — couldn't refresh" banner. |
| `GET /cart` returns empty | Empty state (not an error). |
| Item available flag flips to `false` server-side | Render row with strikethrough name + "Sold out" badge + only trash is enabled. PROCEED TO CHECKOUT button gates on this — see below. |
| Item price changed since add | Inline banner per affected row + change in subtotal. PROCEED TO CHECKOUT button stays enabled but user has effectively confirmed by tapping. |
| PROCEED with sold-out items in cart | Block — disable the bottom button, show top-banner: "Remove sold-out items to continue." User must trash them first. |
| Quantity `PATCH` fails | Revert quantity + toast. |
| Trash `DELETE` fails | Re-insert item + toast. |
| Network offline on Cart screen | Show cached cart with offline banner. Disable PROCEED button. Mutations queue (see open question). |
| Cart cleared on backend (e.g. session expired guest cart) | Mobile gets empty cart → renders empty state. If items were previously visible, brief toast: "Your cart was cleared." |
| Foreground from background with a stale cart | Refetch immediately via `AppState`. If stock/price drift detected, surface the changes with the same affordances as on mount. |
