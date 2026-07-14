# App Store Connect — plakblok

**Uitgebreide invulgids:** [`app-store-connect-fill-guide.md`](./app-store-connect-fill-guide.md)

Screenshots: `docs/app-store-screenshots/iphone-67/`

---

## App Information

**Name:** Limitless Coaching  
**Subtitle:** Powerlifting coaching  
**Primary category:** Health & Fitness  
**Secondary category:** Sports  

**Support URL:** https://limitlesscoaching.app/support  
**Privacy Policy URL:** https://limitlesscoaching.app/privacy  
**Marketing URL:** https://limitlesscoaching.app  

---

## Description (NL)

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

**Keywords:** `powerlifting,coaching,training,gym,atleet,programma,RPE,chat`

**Promotional text:** `Coaching, programma's, chat en video — alles voor powerlifting coaches en atleten in één app.`

---

## App Review Information

**Sign-in required:** Yes

| Veld | Waarde |
|------|--------|
| Username | review-coach@limitlesscoaching.app |
| Password | ReviewCoach2026! |

**Notes (copy entire block):**

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

## Screenshots — iPhone 6.7" (1290×2796)

Upload in deze volgorde:

1. `01-coach-dashboard.png`
2. `06-athlete-program-week.png`
3. `07-athlete-chat.png`
4. `08-athlete-profile.png`
5. `05-athlete-dashboard.png` *(optioneel)*
6. `09-athlete-statistics.png` *(optioneel)*

---

## Privacy — quick reference

| Tracking | **No** |
|----------|--------|

| Data | Linked | Purposes |
|------|--------|----------|
| Name, Email | Yes | App Functionality, Account |
| Fitness (logs, RPE, bodyweight) | Yes | App Functionality |
| Photos/Videos, Chat | Yes | App Functionality |
| User ID, Push token | Yes | App Functionality |
| Purchase history (merch) | Yes | App Functionality |
| Product interaction (PostHog, if enabled) | Yes | Analytics |
| Crash data (Sentry, if enabled) | No/Yes | Analytics |

Volledige questionnaire: [`app-store-connect-fill-guide.md` §4](./app-store-connect-fill-guide.md#4-app-privacy-privacy-nutrition-labels)

---

## Age rating — quick reference

- User Generated Content: **Yes** (chat, video) — moderation + report/block
- Unrestricted Web Access: **Yes** (remote web app)
- Messaging/Chat: **Yes**
- Gambling / violence / adult content: **No**

Details: [`app-store-connect-fill-guide.md` §5](./app-store-connect-fill-guide.md#5-age-rating-questionnaire)

---

## Supabase (dashboard)

Leaked password protection: **Authentication → Providers → Email → Prevent use of leaked passwords → ON**
