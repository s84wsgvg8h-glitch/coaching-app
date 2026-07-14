# App Store Connect — Limitless Coaching

Checklist en copy-paste metadata voor TestFlight internal en App Store public submission.

- **Bundle ID:** `app.limitlesscoaching`
- **SKU:** (kies eenmalig, bijv. `limitless-coaching-ios`)
- **Primary language:** Dutch (NL) of English (U.S.) — kies één primair; beschrijving kan NL blijven

## URLs (verplicht in App Store Connect)

| Veld | URL |
|------|-----|
| **Support URL** | https://limitlesscoaching.app/support |
| **Privacy Policy URL** | https://limitlesscoaching.app/privacy |
| **Marketing URL** (optioneel) | https://limitlesscoaching.app |

Optioneel env op Vercel voor support-e-mail in de app:

| Variable | Voorbeeld |
|----------|-----------|
| `NEXT_PUBLIC_SUPPORT_EMAIL` | `support@limitlesscoaching.app` |

---

## App Information

### Name

```
Limitless Coaching
```

### Subtitle (max 30 tekens)

```
Powerlifting coaching
```

### Category

- **Primary:** Health & Fitness
- **Secondary:** Sports (optioneel)

### Content rights

- Bevat user-generated content (chat, video): **Ja**
- Moderatie: in-app melden + blokkeren; review binnen 24 uur (zie `/voorwaarden#ugc`)

---

## Description (App Store — NL)

```
Limitless Coaching is het platform voor powerlifting coaches en atleten.

Voor coaches:
• Beheer atleten, programma's en macrocycli
• Chat, video-review en check-ins
• Dashboard met team-overzicht en agenda

Voor atleten:
• Volg je programma en log sets, RPE en video's
• Chat met je coach
• Meet-week hub, statistieken en doelen

Accountaanmaak verloopt via invite van je coach (B2B). Geen openbare registratie zonder uitnodiging.

Merch-bestellingen worden apart via Stripe afgehandeld; coachingabonnementen lopen buiten de app om via je coach.
```

### Keywords (max 100 tekens, komma-gescheiden)

```
powerlifting,coaching,training,gym,atleet,programma,RPE,chat
```

### Promotional text (optioneel, max 170 tekens)

```
Coaching, programma's, chat en video — alles voor powerlifting coaches en atleten in één app.
```

---

## App Review Information

### Sign-in required

**Yes** — demo-account verstrekken (zie hieronder).

### Demo account (verplicht voor review)

```bash
node scripts/create-app-review-demo.mjs
```

Standaard credentials (override via env `REVIEW_COACH_EMAIL`, `REVIEW_COACH_PASSWORD`, …):

| Rol | E-mail | Wachtwoord |
|-----|--------|------------|
| Coach | `review-coach@limitlesscoaching.app` | `ReviewCoach2026!` |
| Atleet | `review-athlete@limitlesscoaching.app` | `ReviewAthlete2026!` |

Paste **coach** credentials in App Store Connect → App Review Information. Roteer wachtwoorden na review.

Optioneel: log ook **atleet**-credentials in review notes zodat reviewers program logging + chat vanuit atleten-perspectief kunnen testen.

Seed + verify:

```bash
npm run create:app-review-demo
npm run verify:review-demo
```

### Notes for Review (copy-paste)

```
Limitless Coaching is a B2B invite-only coaching platform for powerlifting.

SIGN-IN (coach — primary demo):
Email: review-coach@limitlesscoaching.app
Password: ReviewCoach2026!

SIGN-IN (athlete — optional, for program logging + chat):
Email: review-athlete@limitlesscoaching.app
Password: ReviewAthlete2026!

SIGN-UP: New users need an invite link from a coach. Without a token, /signup shows an invalid state.

PAYMENTS: In-app Stripe checkout is for merchandise (merch) only. Coaching fees are arranged outside the app between coach and athlete — not sold through IAP.

ACCOUNT DELETION: Profile → Account → Account verwijderen (type VERWIJDER to confirm).

UGC MODERATION: Chat messages can be reported (message menu → Melden) or users blocked (chat options → Gebruiker blokkeren). Policy: https://limitlesscoaching.app/voorwaarden#ugc

NATIVE SHELL: iOS app is a Capacitor WebView loading https://limitlesscoaching.app. Push uses APNs; universal links open the app from Safari.

CAMERA/MIC: Used for exercise video upload and voice messages in chat.
```

---

## Privacy Nutrition Labels (indicatief)

Declareer in App Store Connect op basis van werkelijke data flows:

| Data type | Linked to user | Used for tracking |
|-----------|----------------|-------------------|
| Contact info (email, name) | Yes | No |
| Health & fitness (training logs, bodyweight) | Yes | No |
| User content (chat, video) | Yes | No |
| Identifiers (user ID, push token) | Yes | No |
| Diagnostics (crash logs if Sentry enabled) | Optional | No |

Third parties: Supabase, Vercel, Stripe (merch), OpenAI (optional AI features).

Geen advertentie-tracking.

---

## Age rating questionnaire

- Geen gambling, geen ongefilterde UGC openbaar (invite-only + moderation)
- Chat met moderation → beantwoord vragen over UGC consistent met report/block flow
- Medische/fitness content: training coaching, geen diagnose

---

## Screenshots (vereist)

Genereer iPhone 6.7" screenshots (1290×2796) met review demo-accounts:

```bash
npm run create:app-review-demo
npm run capture:app-store-screenshots
```

Output: `docs/app-store-screenshots/iphone-67/`

**Copy-paste bundle:** [`docs/app-store-connect-paste.md`](./app-store-connect-paste.md)  
**Klik-voor-klik invulgids:** [`docs/app-store-connect-fill-guide.md`](./app-store-connect-fill-guide.md)

Minimaal per device class (6.7" iPhone aanbevolen als primary):

1. Coach dashboard (cockpit)
2. Athlete program week / logging
3. Chat
4. Profile / settings
5. (Optioneel) Video review of statistics

Gebruik dark mode voor consistentie met app-default.

---

## TestFlight → App Store flow

1. [x] Internal TestFlight build geüpload (1.0 build 2)
2. [ ] Metadata invullen — [`app-store-connect-fill-guide.md`](./app-store-connect-fill-guide.md)
3. [ ] Screenshots uploaden — `docs/app-store-screenshots/iphone-67/` (volgorde in fill-guide §2.1)
4. [ ] Privacy labels — fill-guide §4
5. [ ] Age rating — fill-guide §5
6. [ ] Demo credentials + review notes — [`app-store-connect-paste.md`](./app-store-connect-paste.md)
7. [ ] Device-checklist — [`ios-testflight.md`](./ios-testflight.md)
8. [ ] **Submit for Review**

---

## Pre-submit verificatie (lokaal)

```bash
node scripts/verify-ios-release.mjs
npm run verify:review-demo
```

Controleert o.a. AASA, support/privacy/voorwaarden HTTP 200, review demo login + program/chat data.

### Supabase Auth (dashboard)

- [ ] **Leaked password protection** aanzetten: [Auth → Password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
