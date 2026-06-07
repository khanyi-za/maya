# YIIVA Mobile — Track Order (API Contract)

> Screen 06 · companion to [`screen.md`](./screen.md)
>
> Manifest, not spec. Endpoint shapes are defined once in [`../../api/`](../../api/) by domain. This doc says which endpoints Track Order calls, when, and any screen-specific context.
>
> Global rules → [`../../api-conventions.md`](../../api-conventions.md). Open questions → [`../../open-questions.md`](../../open-questions.md).

---

## Endpoints called by Track Order

| # | Endpoint | Spec | When |
|---|---|---|---|
| 1 | `GET /orders/{id}` | [`api/orders.md`](../../api/orders.md) §2 | Mount, pull-to-refresh, foreground via `AppState` |
| 2 | `GET /orders/{id}/tracking` | [`api/orders.md`](../../api/orders.md) §4 | Mount (when `order.status` ∈ {SHIPPED, DELIVERED}), pull-to-refresh |
| 3 | `POST /orders/{id}/cancel` | [`api/orders.md`](../../api/orders.md) §5 | "Cancel Order" tap |

---

## Call sequence on mount

```
1. Read orderId from useLocalSearchParams
2. GET /orders/{orderId}   ← critical, blocks render
3. If order.status ∈ {SHIPPED, DELIVERED}:
   - GET /orders/{orderId}/tracking   ← non-blocking, fills Shipped step
4. Render based on order.status:
   - Compute timeline step states from order.status + order.statusHistory
   - Show "Cancel Order" action only if status ∈ {CONFIRMED, PREPARING}
     AND order.cancellationEligibleUntil > now
   - Show "Return or Exchange" action only if status === DELIVERED
5. If push token registered, subscribe to status-change topic for this order
   (transport-level — when a push arrives for this orderId, invalidate the query)
```

## Call sequence on Cancel Order

```
1. Confirm dialog: "Cancel this order? This will refund your payment."
2. POST /orders/{orderId}/cancel
3a. 200 → toast: "Order cancelled. Refund processing."
       Refetch GET /orders/{id} so the timeline updates to Cancelled state
3b. 409 ORDER_NOT_CANCELLABLE → toast: "This order can't be cancelled anymore.
       Contact support if you need help."
       Refetch order to get updated cancellationEligibleUntil
3c. 5xx → toast, re-enable button
```

## Call sequence on Contact Artist (merchant)

```
1. Tap row → navigate to /chat/{merchantUsername}?orderId=X
2. The Chat screen reads the orderId param and injects an initial
   "Re: Order #YV-2026-000142" context message into the conversation
   (UI-level; doesn't create a backend artifact unless the user sends)
```

## Call sequence on Return or Exchange (delivered)

```
1. Tap row → navigate to /returns/new?orderId=X
2. Returns flow is its own screen tree (TBD — out of scope for v1 unless
   product confirms it as a launch requirement)
```

## Call sequence on push notification

```
Push arrives with payload: { type: "order_status_changed", orderId, newStatus }
1. If user is currently on Track Order for this orderId:
   - Silently invalidate the GET /orders/{id} query → triggers refetch
   - If newStatus === SHIPPED, also fetch /tracking
   - Timeline updates without disrupting the user
2. Otherwise:
   - Standard notification UX (banner) with deep link back to this screen
```

---

## Track Order-specific notes per endpoint

### 1. `GET /orders/{id}`

- **Critical path** — screen can't render without it.
- **Auth mode** — required for signed-in users. Guests use `X-Cart-Session` (same as Order Success — see [open-questions §OS-2](../../open-questions.md#os-2--guest-order-access)).
- **Cache strategy** — TanStack staleTime 30s (status doesn't change every second, but the user expects freshness). Pull-to-refresh forces immediate refetch.
- **`statusHistory[]`** — drives the timeline timestamps. Mobile renders the chronological list; each `{status, at}` entry becomes a step's timestamp.
- **`cancellationEligibleUntil`** — ISO timestamp. Mobile shows the Cancel action only while this is in the future. After expiry, the row is hidden.

### 2. `GET /orders/{id}/tracking`

- **Triggered only when** `order.status` ∈ {SHIPPED, DELIVERED}. No point calling it earlier — there's no courier data yet.
- **Cache strategy** — staleTime 1min. Fresh enough; courier scans don't change every second.
- **Failure mode** — non-blocking. If ShipLogic is down, just hide the tracking sub-section; the timeline still works from order data alone.

### 3. `POST /orders/{id}/cancel`

- **Confirmation dialog mandatory** — explicit user intent. Cancelling refunds payment server-side.
- **Idempotent** — calling cancel on an already-cancelled order returns 200 with current state. Calling on a non-cancellable status returns 409.
- **Side effects** — backend handles refund initiation via the original payment provider; mobile only triggers the cancel action and reflects the new status.

---

## Failure modes specific to Track Order

| Scenario | Mobile behaviour |
|---|---|
| `orderId` missing from URL | Show error: "Tell us which order you want to track" + nav to /account/orders. Log to error tracker. |
| `GET /orders/{id}` 404 | "We couldn't find that order" + back-to-Home CTA |
| `GET /orders/{id}` 403 | "You don't have access to this order" + back-to-Home CTA |
| `GET /orders/{id}/tracking` fails | Hide tracking sub-section; timeline still works |
| ShipLogic returns "no events yet" | Show "We'll update when the courier picks it up" placeholder in the Shipped step |
| `POST /orders/{id}/cancel` 409 ORDER_NOT_CANCELLABLE | Toast + refetch order. The Cancel row may have been visible due to stale state |
| Cancel succeeds but refund fails async | Mobile doesn't see this — backend handles via support flow. Status still flips to CANCELLED on the timeline |
| Multi-merchant order, one merchant ships first | Single consolidated timeline still progresses (status = SHIPPED when ANY merchant has shipped). Per-merchant breakdown is v2 (see [open-questions §TO-8](../../open-questions.md#to-8--multi-merchant-order-timeline)) |
| User opens Track Order for a very old order | Same flow. `cancellationEligibleUntil` is in the past → no Cancel row. Timeline shows all completed steps with historical timestamps |
| Push notification arrives but app is killed | Cold-start handler routes to `/track-order?orderId=X` via the notification payload deep link |
| Network drops while on screen | Show offline banner; cached order data stays visible; mutations (Cancel) disabled until back online |
