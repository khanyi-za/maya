# Steps-To-AppStore — maya launch roadmap

> Locked in 2026-09-07. Tracks everything between today's state and maya
> being live on the Google Play Store and Apple App Store. Update checkboxes
> as items land; add dated notes rather than deleting.
>
> **Master sequencing rule:** the app may enter store REVIEW in Paystack test
> mode, but production RELEASE waits for the payment gate:
> Paystack KYC approval → sk_live_ key → nuwa Phase D (arm the guards) →
> store production release. Everything else runs in parallel with the wait.

---

## Phase 0 — Store accounts (OWNER errands; start first, they have lead times)

- [ ] **D-U-N-S number for Khaziimla Technology (Pty) Ltd** (free, can take
      days–weeks in SA; needed for BOTH org registrations below).
      https://developer.apple.com/enroll/duns-lookup/
- [ ] **Google Play Console — ORGANIZATION account** ($25 once).
      ⚠ Register as an organization, not personal: personal accounts created
      after Nov 2023 must run a closed test with 12+ testers for 14
      continuous days before they may publish; org accounts skip this, and
      the listing shows the company name.
- [ ] **Apple Developer Program — organization enrollment** ($99/year).
      Same D-U-N-S; enrollment approval itself takes a few days.

## Phase 1 — Code readiness (mostly CLAUDE work)

Already done (2026-09 sprint):
- [x] Prod API origin baked into store builds (`eas.json` production profile
      sets `EXPO_PUBLIC_API_URL`)
- [x] EAS project + `projectId` in app.json (push token acquisition works in
      store builds)
- [x] App display name "YIIVA", `android.package za.co.yiiva.app`
- [x] Branded splash (native + JS photo splash), Android keystore on EAS
- [x] `.easignore` (demo media excluded from uploads)

Open:
- [ ] **`ios.bundleIdentifier`** — add `za.co.yiiva.app` to app.json (mirror
      of the Android package).
- [ ] **Remove `NSAllowsArbitraryLoads: true`** from app.json ios.infoPlist —
      App Store blocker. All traffic is HTTPS now; keep (or drop) only the
      localhost exception for dev.
- [ ] **In-app account deletion** — ⚠ APPLE HARD REQUIREMENT for apps with
      registration. Believed missing. Needs a nuwa endpoint (delete/anonymize
      user, cascade per POPIA posture) + a maya Account-screen entry. Confirm
      gap, then build BEFORE iOS submission.
- [ ] **Reels decision (OWNER decides, Claude implements):** fixtures point
      at yiiva_demo product ids → broken Buy buttons against prod. Either
      (a) dynamic backend feed (the designed near-zero-UI swap) or (b) hide
      the reels surface for v1.
- [ ] **1024×1024 square app icon (OWNER supplies artwork):** current
      ICON_BLACK.png is 580×204 (wordmark, non-square) — stores reject it.
      Y-mark centered in a square works. Also adaptive-icon foreground for
      Android + splash untouched.
- [ ] Universal links / associated domains — OPTIONAL for launch (OTP codes
      removed the emailed-link dependency; payment-return is
      WebView-intercepted). Post-launch polish.
- [ ] Versioning: `autoIncrement` already on in the production profile —
      nothing to do, noted for completeness.

## Phase 1b — Launch feature scope (product features wanted for launch)

- [ ] **Google + Meta (Facebook) log-in** — on maya AND athena. Full breakdown
      already scoped in auto-memory `social-login-project` (queued
      2026-09-03). Summary: nuwa endpoints verifying Google ID token / Meta
      access token server-side → link-or-create user → normal JWT;
      migration (`passwordHash` nullable + provider fields); email
      auto-link policy decision; owner console errands (Google Cloud OAuth
      clients — Android client needs the EAS keystore SHA-1; Meta app +
      Facebook Login, which requires the live privacy-policy URL ✅ and
      Meta App Review — days-to-weeks, START EARLY); maya via
      expo-auth-session (config-plugin change → new build); athena buttons
      + BFF routes.
      ⚠ **Apple trap:** the moment the iOS app offers ANY third-party
      login, App Store rules REQUIRE offering **Sign in with Apple** too —
      that is committed scope for the iOS submission, plan it as part of
      this item, not a surprise at review.
- [ ] **Payflex integration (buy-now-pay-later)** — currently the one
      "Soon" row in maya's payment-method selector. The plumbing already
      exists end-to-end (`dto.paymentMethod` → Paystack `channels`
      restriction on the hosted page); what's missing is the channel being
      active on the Paystack account. Steps: (1) OWNER: ask Paystack to
      enable Payflex/BNPL on the account (bundle into the live-activation
      conversation after KYC approval); (2) map the channel value + un-Soon
      the selector row in maya; (3) test-mode e2e if Paystack supports it in
      test, else first-live-transaction smoke. Low code, high dependency on
      Paystack account config.

## Phase 2 — Store listing content (parallel with everything)

- [ ] **Screenshots** — phone-size sets for both stores (record against the
      demo env :3005 — that's what it's for). Apple: 6.7" set minimum.
- [ ] **Play feature graphic** 1024×500.
- [ ] **Descriptions** — short (80 chars) + full, category Shopping,
      keywords (Apple).
- [ ] **Privacy policy URL** — ✅ live: https://yiiva.co.za/privacy-policy
- [ ] **Support email on the Play listing** — support@yiiva.co.za (mailbox
      creation still an owner errand at Cloudflare).
- [ ] **Apple privacy "nutrition labels" + Google Data Safety form** —
      declare: name/email/phone/address (account + delivery), payments via
      third party (Paystack hosted — card data never touches the app),
      PostHog analytics (EU cloud), push tokens. ~1 hour of honest form-work.
- [ ] **Play content rating questionnaire** (shopping app — trivial).
- [ ] **Reviewer notes + demo login** for both stores — reuse the Paystack
      review package: dedicated account, test card 4084 0840 8408 4081,
      short walkthrough. Create a FRESH reviewer account (the paystack.review
      one gets torn down after their review).

## Phase 3 — Builds, testing tracks, review

- [ ] `eas build -p android --profile production` → **AAB** (Play requires
      AAB; the preview APK profile stays for internal shares).
- [ ] `eas build -p ios --profile production` (EAS manages Apple certs; needs
      the Apple account from Phase 0).
- [ ] `eas submit -p android` / `eas submit -p ios` → consoles.
- [ ] **Play internal testing track** — smoke on real Android hardware.
- [ ] **TestFlight** — first-ever real-iPhone test of maya (Expo Go aside).
      Verify: push delivery (finally testable), payment WebView, chat socket.
- [ ] Promote to review. Expect: Google hours–2 days; Apple 1–3 days.
      Apple will poke at: guest checkout, ACCOUNT DELETION, payments flow,
      demo login quality.

## Phase 4 — Release gate

- [ ] Paystack KYC approved → sk_live_ key received.
- [ ] nuwa **Phase D arm-the-guards** (NODE_ENV=production, live Paystack
      key, LIVE webhook URL on the dashboard, real TCG/ShipLogic key +
      prod base URL, final CORS_ORIGINS, yiiva-prod Cloudinary cloud +
      presets, rotate admin password).
- [ ] Real catalogue state: demo dressing stores (Yiiva Demo Store, Mara
      Studio, Common Ground) archived/hidden before public launch; Doppler
      (and real merchants) approved through the real P-1/P-2 gates.
- [ ] **Production release** on both stores (staged rollout on Play is free
      insurance: 10% → 50% → 100%).
- [ ] App-store URLs: update the landing page's AppStoreButtons (currently
      `#` placeholders) + the "Download the app" copy in FAQ/CTA.

---

## Suggested attack order

1. **Owner, today:** start D-U-N-S + both store registrations (dead time).
   Also start the Meta developer app early — its App Review is the longest
   external queue in the whole plan.
2. **Claude, now:** bundle ID, ATS removal, verify the account-deletion gap.
3. **Owner:** icon artwork + reels decision.
4. **Claude:** account-deletion feature (nuwa+maya) once confirmed missing.
5. **Claude:** social login build (nuwa foundation + Google first, Meta when
   its review clears, Sign in with Apple alongside the iOS submission).
6. **Both:** listings + screenshots while Paystack reviews.
7. **Owner:** Payflex enablement ask in the Paystack live-activation
   conversation; Claude wires the channel when it's active.
8. Builds → testing tracks → store review (test mode).
9. Hold at release gate until Phase D; then ship.
