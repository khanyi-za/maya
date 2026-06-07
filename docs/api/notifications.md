# YIIVA Mobile — API: Notifications

> Canonical specs for notification endpoints.
> Global rules → [`../api-conventions.md`](../api-conventions.md).
> Open questions → [`../open-questions.md`](../open-questions.md) §Notifications.

All endpoints in this domain are **🔴 proposed (new)**.

---

## Endpoints

| § | Endpoint | Method | Auth | Used by |
|---|---|---|---|---|
| 1 | `/notifications/unread-count` | GET | required | Home (bell badge), every screen with `YiivaHeader` |
| 2 | `/notifications` | GET | required | Notifications screen (TBD) |
| 3 | `/notifications/{id}/read` | PATCH | required | Notifications screen |
| 4 | `/notifications/read-all` | POST | required | Notifications screen |
| 5 | `/me/push-tokens` | POST | required | App startup (register Expo Push Token) |
| 6 | `/me/push-tokens/{tokenId}` | DELETE | required | Logout, settings |

---

## 1. Get unread count 🔴

For the bell-icon badge.

```
GET /notifications/unread-count
```

**Auth:** required

### Response — 200 OK

```json
{ "success": true, "data": { "unreadCount": 4 } }
```

### Errors

Standard auth errors (401 → silent refresh per [`../auth-mobile-guide.md`](../auth-mobile-guide.md) §3).

### Rate limit

Global default. Called on Home mount and on app foreground via `AppState` listener. Recommend ETag for cheap 304s.

---

## 2. List notifications 🔴

```
GET /notifications
```

**Auth:** required · **Used by:** Notifications screen

Full spec drafted with the Notifications screen doc.

---

## 3. Mark notification as read 🔴

```
PATCH /notifications/{id}/read
```

**Auth:** required · **Used by:** Notifications screen

Full spec drafted with the Notifications screen doc.

---

## 4. Mark all as read 🔴

```
POST /notifications/read-all
```

**Auth:** required · **Used by:** Notifications screen

Full spec drafted with the Notifications screen doc.

---

## 5. Register push token 🔴

```
POST /me/push-tokens
```

**Auth:** required · **Used by:** App startup

Full spec drafted with the Notifications setup doc (separate from screen docs — covers Expo push-token wiring).

---

## 6. Revoke push token 🔴

```
DELETE /me/push-tokens/{tokenId}
```

**Auth:** required · **Used by:** Logout, settings

Full spec drafted with the Notifications setup doc.
