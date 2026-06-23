# Limitless Coaching App — volledige samenvatting met screenshots

**Product:** coachingplatform voor powerlifting/strength coaching (coaches, atleten, admins).

**Live URL:** [https://limitlesscoaching.app](https://limitlesscoaching.app)

**Screenshots:** opgenomen op productie (1440×900), juni 2026. Bestanden staan in `/public/app-screenshots/`.

---

## Tech stack


| Laag       | Technologie                                       |
| ---------- | ------------------------------------------------- |
| Frontend   | Next.js 16 (App Router), React 19, TypeScript     |
| Styling    | Tailwind CSS 4, custom design tokens              |
| Backend    | Supabase (Auth, Postgres, RLS, Realtime, Storage) |
| Charts     | Recharts                                          |
| Betalingen | Stripe (merch + Stripe Connect)                   |
| Hosting    | Vercel                                            |


---

## Design & stijl

Modern **glassmorphism**-design met light/dark mode.

- Accent `#4f8cff`, donkere achtergrond `#09090b`
- 16px border-radius, blur-cards, zachte schaduwen
- SF Pro / system stack, Lucide + emoji-navigatie
- `AppShell` met topbar (⌘K, notificaties, profiel)
- Chat fullscreen; dashboard met configureerbare widgets

---

## Publieke pagina's

### Home (`/`)

Home

### Inloggen (`/login`)

Login

### Registreren (`/signup`)

Signup

---

## Coach — pagina's

### Dashboard

Configureerbare widgets: agenda, KPI's, inbox, AI copilot, alerts, engagement, todo's, snelkoppelingen.

Coach dashboard

### Kennisbank & AI-vragen

Curated kennisblokken + atleten-AI vragen.

Kennisbank

AI-vragen

### Agenda & wedstrijden

Agenda

Wedstrijd kalender

Wedstrijd checklist

Planning

### Data & analyse

Data hub

Statistieken

Ruwe data

Invulscore

Leaderboard

### Oefeningenbibliotheek

Categorietree, drag & drop, uitlegvideo's.

Oefeningenbibliotheek

### Betalingen & merch

Maandprijzen per atleet, Stripe Connect, teamkleding + orders.

Betalingen

Merch

### Atletenbeheer

Atleten

Atleten overzicht

Atleten profielen

Atleet hub

Atleet profiel

Limitless data

### Todo, chat & programma's

Todo

Chat

Directe chat

Programma's

Programma detail

### Video & doelen

Video review

Video gallery

Doelen

### Profiel & instellingen

Coach profiel

Intakeformulier instellingen

Checklist instellingen

RPE-tabel

---

## Atleet — pagina's

Atleet dashboard

Programma's

Programma detail

Voortgang & data

Meet-week

Merch

Chat

Leaderboard

Profiel

Intake

Doelen

---

## Admin

Admin panel

---

## Chat slash commands (coach)


| Command      | Functie                |
| ------------ | ---------------------- |
| `/program`   | Programma van atleet   |
| `/bw`        | Bodyweight-grafiek     |
| `/externals` | Herstel & fatigue      |
| `/volume`    | SBD volume             |
| `/intensity` | SBD intensiteit        |
| `/max`       | Max-lijst SBD          |
| `/data`      | Ruwe atleetdata        |
| `/injuries`  | Blessures & spierkaart |
| `/ai`        | Coaching AI            |
| `/todo`      | Todo-lijst             |
| `/agenda`    | Coachagenda            |


---

## Samenvatting

Limitless Coaching is een **volledig geïntegreerd coachingplatform** met glassy dark/light UI: coaches beheren atleten, schrijven programma's, chatten met ingebouwde data-analyse, plannen wedstrijden, en regelen betalingen/merch — atleten loggen training, communiceren en volgen voortgang — alles op één plek (Vercel + Supabase).