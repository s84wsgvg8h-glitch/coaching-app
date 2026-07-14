# App Store Connect — invulgids (klik-voor-klik)

Gebruik dit document na upload van **TestFlight build 1.0 (2)**.

- **Plakblok (copy-paste tekst):** [`app-store-connect-paste.md`](./app-store-connect-paste.md)
- **Screenshots:** `docs/app-store-screenshots/iphone-67/`
- **ASC:** https://appstoreconnect.apple.com → **Apps** → **Limitless Coaching**

---

## 1. TestFlight — build activeren

1. **TestFlight** tab → wacht tot build **1.0 (2)** status **Ready to Test** heeft
2. **Internal Testing** → groep **+** → voeg je Apple ID toe als tester
3. Installeer op iPhone via TestFlight-app
4. Doorloop checklist: [`ios-testflight.md`](./ios-testflight.md) (auth, chat, push, account delete)

---

## 2. App Store → Versie 1.0

Ga naar **App Store** → **iOS App** → **+ Version** (of bestaande **1.0**) → koppel **build 1.0 (2)** onder **Build**.

### 2.1 Previews and Screenshots — iPhone 6.7" Display

Upload **minimaal 3**, aanbevolen **5** (volgorde = wat gebruikers eerst zien):

| # | Bestand | Waarom |
|---|---------|--------|
| 1 | `01-coach-dashboard.png` | Hero — coach cockpit |
| 2 | `06-athlete-program-week.png` | Kernfeature — programma + logging |
| 3 | `07-athlete-chat.png` | Chat + UGC-moderatie context |
| 4 | `08-athlete-profile.png` | Profiel, settings, account delete |
| 5 | `05-athlete-dashboard.png` | Atleet dashboard (optioneel) |
| 6 | `09-athlete-statistics.png` | Data/statistieken (optioneel) |

**Niet uploaden als store-screenshots:** `02-coach-athletes`, `03-coach-chat`, `04-coach-program` (intern/backup).

Tip: ASC accepteert **1290 × 2796** — onze exports zijn exact dit formaat.

### 2.2 Promotional Text (optioneel, max 170 tekens)

```
Coaching, programma's, chat en video — alles voor powerlifting coaches en atleten in één app.
```

### 2.3 Description (NL)

Zie [`app-store-connect-paste.md`](./app-store-connect-paste.md) → sectie Description.

### 2.4 Keywords (max 100 tekens)

```
powerlifting,coaching,training,gym,atleet,programma,RPE,chat
```

### 2.5 Support URL / Marketing URL

| Veld | URL |
|------|-----|
| Support URL | `https://limitlesscoaching.app/support` |
| Marketing URL | `https://limitlesscoaching.app` |

### 2.6 Version release

- **Manually release this version** (aanbevolen) — zodat je na approval zelf live zet

---

## 3. App Information (algemeen)

**App Store Connect** → **General** → **App Information**

| Veld | Waarde |
|------|--------|
| Name | Limitless Coaching |
| Subtitle | Powerlifting coaching |
| Primary Language | Dutch (NL) *of* English — kies één primair |
| Primary Category | Health & Fitness |
| Secondary Category | Sports |
| Content Rights | Bevat third-party content: **No** (eigen platform) |
| Age Rating | Zie sectie 5 |

**Privacy Policy URL:** `https://limitlesscoaching.app/privacy`

---

## 4. App Privacy (Privacy Nutrition Labels)

**App Store Connect** → **App Privacy** → **Get Started** / **Edit**

### 4.0 Eerste vragen

| Vraag | Antwoord |
|-------|----------|
| Do you or your third-party partners collect data from this app? | **Yes** |
| Is any data used to track users? | **No** |
| Is any data linked to the user's identity? | **Yes** (account-based app) |

**Tracking = No** omdat: geen IDFA, geen cross-app advertising, PostHog/Sentry voor product/crash (niet voor ad tracking).

---

### 4.1 Data types — per categorie invullen

Klik **+** bij elke categorie en voeg data types toe. Gebruik onderstaande instellingen per type.

#### Contact Info

| Data type | Collected | Linked to user | Used for tracking | Purposes |
|-----------|-----------|----------------|-------------------|----------|
| **Name** | Yes | Yes | No | App Functionality, Product Personalization |
| **Email Address** | Yes | Yes | No | App Functionality, Account Management |

#### Health & Fitness

| Data type | Collected | Linked to user | Used for tracking | Purposes |
|-----------|-----------|----------------|-------------------|----------|
| **Fitness** | Yes | Yes | No | App Functionality |

*Omvat: trainingslogs, sets/reps/RPE, bodyweight, programma-voortgang.*

#### User Content

| Data type | Collected | Linked to user | Used for tracking | Purposes |
|-----------|-----------|----------------|-------------------|----------|
| **Photos or Videos** | Yes | Yes | No | App Functionality |
| **Other User Content** | Yes | Yes | No | App Functionality |

*Omvat: chatberichten, spraaknotities, oefening-video's, coach-notities.*

#### Identifiers

| Data type | Collected | Linked to user | Used for tracking | Purposes |
|-----------|-----------|----------------|-------------------|----------|
| **User ID** | Yes | Yes | No | App Functionality, Account Management |

*Supabase user UUID, push subscription token (APNs device token).*

#### Purchases *(optioneel — alleen als je merch via Stripe in-app afhandelt)*

| Data type | Collected | Linked to user | Used for tracking | Purposes |
|-----------|-----------|----------------|-------------------|----------|
| **Purchase History** | Yes | Yes | No | App Functionality |

*Alleen merch-orders; coaching-abonnementen lopen buiten de app.*

#### Usage Data *(alleen als PostHog actief op productie — `NEXT_PUBLIC_POSTHOG_KEY` op Vercel)*

| Data type | Collected | Linked to user | Used for tracking | Purposes |
|-----------|-----------|----------------|-------------------|----------|
| **Product Interaction** | Yes | Yes | No | Analytics, App Functionality |

*Page views, feature events (dashboard, chat, training). Geen advertentie-profiling.*

#### Diagnostics *(alleen als Sentry actief — `NEXT_PUBLIC_SENTRY_DSN` op Vercel)*

| Data type | Collected | Linked to user | Used for tracking | Purposes |
|-----------|-----------|----------------|-------------------|----------|
| **Crash Data** | Yes | No *of* Yes | No | App Functionality, Analytics |
| **Performance Data** | Optional | No | No | App Functionality |

*Als Sentry uit staat op productie: **niet** declareren.*

---

### 4.2 Third-party partners (Privacy manifest)

Bij **Data Uses** → partners die data ontvangen:

| Partner | Doel |
|---------|------|
| **Supabase** | Database, auth, storage, realtime |
| **Vercel** | Hosting (server logs) |
| **Stripe** | Merch-betalingen |
| **PostHog** *(indien actief)* | Product analytics |
| **Sentry** *(indien actief)* | Crash reporting |
| **OpenAI** *(indien AI gebruikt)* | AI coach copilot / kennisbank vragen |
| **Resend** | Transactionele e-mail |

---

## 5. Age Rating (questionnaire)

**App Store Connect** → **App Information** → **Age Rating** → **Edit**

Typische antwoorden voor Limitless Coaching:

| Vraag | Antwoord | Toelichting |
|-------|----------|-------------|
| Cartoon or Fantasy Violence | None | — |
| Realistic Violence | None | — |
| Sexual Content or Nudity | None | — |
| Profanity or Crude Humor | None | — |
| Horror/Fear Themes | None | — |
| Mature/Suggestive Themes | None | — |
| Gambling | None | — |
| Alcohol, Tobacco, Drugs | None | — |
| Medical/Treatment Information | **Infrequent/Mild** *of* None | Fitness coaching, geen medische diagnose |
| Unrestricted Web Access | **Yes** | Capacitor laadt `limitlesscoaching.app` |
| User Generated Content | **Yes** | Chat + video; moderatie in-app |
| Messaging and Chat | **Yes** | Coach-atleet chat |

**Verwachte rating:** 12+ of 4+ afhankelijk van UGC/web-combinatie — volg ASC-suggestie na invullen.

Bij **User Generated Content = Yes**, verwacht extra vragen:
- Moderation: **Yes** — report + block in app, policy op `/voorwaarden#ugc`
- Ability to block: **Yes**
- Ability to report: **Yes**

---

## 6. App Review Information

**App Store Connect** → versie **1.0** → **App Review Information**

| Veld | Waarde |
|------|--------|
| Sign-in required | **Yes** |
| Username | `review-coach@limitlesscoaching.app` |
| Password | `ReviewCoach2026!` |
| Contact — First name | Daan |
| Contact — Last name | Meijer |
| Contact — Phone | *(jouw nummer)* |
| Contact — Email | *(jouw e-mail voor Apple review)* |

**Notes** — volledige tekst in [`app-store-connect-paste.md`](./app-store-connect-paste.md).

**Attachment (optioneel):** geen verplicht, tenzij Apple vraagt om demo-video.

---

## 7. Export Compliance

Bij upload/build processing:

| Vraag | Antwoord |
|-------|----------|
| Is your app designed to use cryptography? | **Yes** (HTTPS only) |
| Is it exempt? | **Yes** — standard encryption only |
| `ITSAppUsesNonExemptEncryption` | Already **false** in Info.plist |

In ASC bij build: **No** voor non-exempt encryption (alleen TLS).

---

## 8. Pricing & Availability

| Veld | Waarde |
|------|--------|
| Price | **Free** |
| Availability | Alle landen *of* EU + NL focus — jouw keuze |
| Pre-orders | No |

**In-App Purchases:** None (coaching buiten app; merch via Stripe web checkout).

---

## 9. Submit checklist

Vink af vóór **Add for Review**:

- [ ] Build **1.0 (2)** gekoppeld aan versie 1.0
- [ ] Min. 3 screenshots 6.7" geüpload (volgorde sectie 2.1)
- [ ] Description + keywords ingevuld
- [ ] Support URL + Privacy URL gecontroleerd (HTTP 200)
- [ ] App Privacy labels compleet (sectie 4)
- [ ] Age rating afgerond (sectie 5)
- [ ] Review credentials + notes (sectie 6)
- [ ] TestFlight device-checklist groen op build 2
- [ ] Supabase: leaked password protection **ON**
- [ ] Export compliance beantwoord

**Submit:** App Store → versie 1.0 → **Add for Review**

---

## 10. Na approval

1. **Release** handmatig (als gekozen)
2. Roteer review-wachtwoorden: `npm run create:app-review-demo` met nieuwe env passwords
3. Monitor crash reports (Sentry) + reviews eerste week

---

## Snelle verify (terminal)

```bash
node scripts/verify-ios-release.mjs
npm run verify:review-demo
curl -sI https://limitlesscoaching.app/privacy | head -1
curl -sI https://limitlesscoaching.app/support | head -1
```
