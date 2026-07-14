# iOS / TestFlight — Limitless Coaching

Native iOS shell via [Capacitor](https://capacitorjs.com). De app laadt **https://limitlesscoaching.app** in een WKWebView (geen static Next.js export).

- **Bundle ID:** `app.limitlesscoaching`
- **App name:** Limitless Coaching
- **Backend:** blijft op Vercel + Supabase

## Vereisten

- Xcode (met iOS SDK)
- Apple Developer-account (team gekoppeld in App Store Connect)
- App-record in App Store Connect voor `app.limitlesscoaching`

## Eerste setup (eenmalig)

```bash
npm install
npm run cap:icons    # icon + splash → ios/App/Assets.xcassets
npx cap sync ios
npm run cap:open:ios # opent ios/App/App.xcodeproj
```

In Xcode:

1. Target **App** → **Signing & Capabilities**
   - Team: jouw Apple Developer-team
   - Bundle Identifier: `app.limitlesscoaching`
   - Automatically manage signing: aan
   - Controleer capabilities: **Associated Domains** + **Push Notifications** (entitlements staan in `App.entitlements`)
2. **General** → Display Name: `Limitless Coaching`
3. Version / Build: bijv. `1.0` / `1` (verhoog build bij elke upload)

Privacy strings staan in `ios/App/App/Info.plist` (camera, microfoon, fotobibliotheek, background push).

## Universal Links

Links naar `https://limitlesscoaching.app/...` openen in de native app (invite-links, password reset, chat, etc.).

### Apple Developer Portal

1. **Identifiers** → `app.limitlesscoaching` → enable **Associated Domains**
2. Save + refresh provisioning profiles in Xcode

### Vercel env

| Variable | Beschrijving |
|----------|--------------|
| `APPLE_TEAM_ID` | 10-char Team ID (Membership details in Apple Developer) |

Valideer na deploy:

```bash
curl -s https://limitlesscoaching.app/.well-known/apple-app-site-association | jq .
```

Moet JSON met `appIDs: ["TEAMID.app.limitlesscoaching"]` tonen.

### Test

1. Installeer app via TestFlight op fysiek device
2. Open Safari → `https://limitlesscoaching.app/signup` (of invite-link)
3. App opent i.p.v. Safari-tab

## Native push (APNs)

iOS gebruikt APNs; web blijft VAPID/web-push. Beide slaan op in `push_subscriptions` (`endpoint` prefix `ios:` voor native tokens).

### Apple Developer / App Store Connect

1. **Keys** → **+** → **Apple Push Notifications service (APNs)**
2. Download `.p8` key (één keer) — noteer **Key ID**
3. App ID `app.limitlesscoaching` → enable **Push Notifications**

### Vercel env (server only)

| Variable | Beschrijving |
|----------|--------------|
| `APNS_KEY_ID` | Key ID van APNs `.p8` key |
| `APNS_TEAM_ID` | Zelfde als `APPLE_TEAM_ID` |
| `APNS_PRIVATE_KEY` | Volledige `.p8` inhoud (newlines als `\n` ok) |
| `APNS_BUNDLE_ID` | `app.limitlesscoaching` (default) |
| `APNS_USE_SANDBOX` | `true` alleen voor debug builds op device; TestFlight = `false` |

Bestaande web push vars blijven nodig voor browser:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

### Gebruiker inschakelen

Profiel → **Push notificaties** → Inschakelen (native permission prompt op iOS).

Cron `/api/cron/reminders` stuurt naar web **en** iOS subscriptions.

## Dev vs TestFlight — UI parity

De native shell laadt **geen** lokale `npm run build` output. Met `server.url` in Capacitor laadt WKWebView altijd die remote URL.

| Workflow | Capacitor `server.url` | UI-bron | Gelijk aan TestFlight? |
|----------|------------------------|---------|------------------------|
| `npm run ios:dev` | `http://localhost:3000` | `next dev` (lokaal) | **Nee** — tenzij prod identiek is én deployed |
| `npm run ios:sim:prod` | `https://limitlesscoaching.app` | Vercel productie | **Ja** (zelfde remote UI) |
| TestFlight / App Store | `https://limitlesscoaching.app` | Vercel productie | Referentie |

**`npm run build` + `cap sync` verandert de TestFlight UI niet** zolang `server.url` op productie staat. Alleen een nieuwe **Vercel deploy** wijzigt wat TestFlight toont.

Controleer ingebakken URL na sync:

```bash
node -e "console.log(require('./ios/App/App/capacitor.config.json').server.url)"
# Verwacht voor TestFlight parity: https://limitlesscoaching.app
```

Controleer productie-build op device (Safari Web Inspector → Console):

```javascript
fetch('/api/build-version').then(r=>r.json()).then(console.log)
// { version: "dpl_..." } — moet overeenkomen met laatste Vercel deploy
```

## TestFlight build uploaden

Automated (archive + upload):

```bash
npm run ios:archive
```

Handmatig in Xcode:

1. Selecteer scheme **App** en device **Any iOS Device (arm64)** (geen simulator).
2. **Product → Archive**
3. **Distribute App → App Store Connect → Upload**
4. In [App Store Connect](https://appstoreconnect.apple.com) → **TestFlight**
5. Wacht op processing (~5–15 min)
6. **Internal Testing** → testers toevoegen

**Laatste upload (lokaal):** versie **1.0**, build **3**, `server.url` = `https://limitlesscoaching.app`

## Na web-wijzigingen

De iOS-shell laadt productie. **Geen nieuwe TestFlight-build nodig** voor gewone web/UI-updates op Vercel.

Wel opnieuw builden + uploaden wanneer je wijzigt:

- `capacitor.config.ts` (URL, plugins)
- `ios/` native project (Info.plist, entitlements, icons, signing)
- Capacitor plugin versies

```bash
npx cap sync ios
npm run cap:open:ios
# Archive opnieuw in Xcode
```

## Handmatige checks vóór TestFlight

Zie ook **App Store Connect metadata**: [`docs/app-store-connect.md`](./app-store-connect.md)

Automated smoke (routes + AASA):

```bash
node scripts/verify-ios-release.mjs
```

### Auth & account

- [ ] Inloggen / uitloggen (Supabase sessie)
- [ ] **Review demo coach** (`review-coach@limitlesscoaching.app`) — dashboard + atleet zichtbaar
- [ ] **Review demo atleet** — program week + chat (geen intake-blokkade)
- [ ] Signup zonder invite toont invalid state
- [ ] Signup met invite-link werkt
- [ ] **Account verwijderen** (Profiel → Account → typ `VERWIJDER`)
- [ ] Password reset e-mail → redirect terug naar app

### Links & push

- [ ] Universal link opent app (`/signup`, invite URL)
- [ ] Push inschakelen in profiel + test reminder
- [ ] Push-tap opent juiste pagina (`APNS_USE_SANDBOX=false` op TestFlight)

### Chat & UGC

- [ ] Chat + spraakbericht
- [ ] **Bericht melden** (long-press → Melden)
- [ ] **Gebruiker blokkeren** (chat-opties, DM)
- [ ] Groepsinfo: melden/blokkeren per lid

### Media & payments

- [ ] Video opnemen (program week / video review)
- [ ] Stripe merch checkout (externe browser)

### Support (App Store)

- [ ] https://limitlesscoaching.app/support laadt (200)
- [ ] Support-e-mail klopt (`NEXT_PUBLIC_SUPPORT_EMAIL` op Vercel indien afwijkend)

## Scripts

| Script | Doel |
|--------|------|
| `npm run cap:icons` | PNG icon/splash genereren + iOS assets |
| `npm run cap:sync` | Web assets + plugins naar `ios/` |
| `npm run ios:dev` | Sync **localhost** + simulator (local UI) |
| `npm run ios:archive` | Verify + cap sync + archive + upload naar App Store Connect |
| `npm run cap:open:ios` | Xcode openen |
| `npm run create:app-review-demo` | App Store review accounts + sample data |
| `npm run verify:review-demo` | Login + program/chat check voor review accounts |

## Architectuur

```
iOS app (Capacitor)
  ├── Universal Links → limitlesscoaching.app/*
  ├── APNs device token → push_subscriptions (ios:…)
  └── WKWebView → https://limitlesscoaching.app
        └── Next.js op Vercel (SSR, API routes, Supabase)
```

`components/CapacitorBootstrap.tsx` — splash, status bar, deep links, push-tap navigatie.
