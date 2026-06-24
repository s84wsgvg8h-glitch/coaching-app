# Vercel setup — Limitless Coaching App

Production URL: https://limitlesscoaching.app

---

## A. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** for **Production** (and Preview if needed).

### Required — Supabase (Auth + Postgres)

| Variable | Scope | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anon key (client-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Service role for cron/admin jobs |

### Required — Cloudflare R2 (file storage)

| Variable | Scope | Description |
|----------|-------|-------------|
| `STORAGE_PROVIDER` | Server | Set to `r2` in production |
| `CLOUDFLARE_ACCOUNT_ID` | Server only | Cloudflare account ID |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | Server only | R2 API token access key |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Server only | R2 API token secret |
| `CLOUDFLARE_R2_BUCKET` | Server | e.g. `limitless-storage` |
| `CLOUDFLARE_R2_PUBLIC_URL` | Server | Public base URL for R2 objects |

Optional public fallback for CSP/media:

| Variable | Scope |
|----------|-------|
| `NEXT_PUBLIC_R2_PUBLIC_URL` | Public (optional) |

### Required — Cron jobs

| Variable | Scope | Description |
|----------|-------|-------------|
| `CRON_SECRET` | Server only | Bearer token for `/api/cron/*` routes |

Vercel sends this automatically as `Authorization: Bearer …` when invoking cron jobs.

### Required — Stripe (merch checkout)

| Variable | Scope |
|----------|-------|
| `STRIPE_SECRET_KEY` | Server only |
| `STRIPE_WEBHOOK_SECRET` | Server only |

### Recommended — App URL

| Variable | Scope |
|----------|-------|
| `NEXT_PUBLIC_APP_URL` | Public — e.g. `https://limitlesscoaching.app` |

### Optional — AI features

| Variable | Scope |
|----------|-------|
| `OPENAI_API_KEY` | Server only — dashboard AI |

### Optional — Push notifications

| Variable | Scope |
|----------|-------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public |
| `VAPID_PRIVATE_KEY` | Server only |
| `VAPID_SUBJECT` | Server — e.g. `mailto:coach@example.com` |

### Optional — Email (admin)

| Variable | Scope |
|----------|-------|
| `RESEND_API_KEY` | Server only |
| `RESEND_FROM_EMAIL` | Server |

### Optional — Storage cleanup

| Variable | Default | Description |
|----------|---------|-------------|
| `STORAGE_CLEANUP_DRY_RUN` | `true` | Log orphans, do not delete |
| `STORAGE_CLEANUP_DELETE_ENABLED` | `false` | Allow actual deletes when dry-run is false |

### Optional — Supabase CLI / scripts

| Variable | Scope |
|----------|-------|
| `SUPABASE_ACCESS_TOKEN` | Local/CI only — not needed at runtime |

---

## B. Domains

| Domain | Target |
|--------|--------|
| `limitlesscoaching.app` | Vercel production deployment |
| `www.limitlesscoaching.app` | Redirect → `limitlesscoaching.app` |
| `media.limitlesscoaching.app` | Cloudflare R2 custom domain (public media) |

Configure in **Vercel → Domains** and **Cloudflare → R2 → Custom domain**.

---

## C. Manual Vercel settings

1. **Environment Variables** — all vars from section A
2. **Domains** — primary + www redirect
3. **Git** — Production branch = `main`
4. **Analytics** — enable if desired (Vercel Analytics)
5. **Speed Insights** — enable if desired
6. **Deployment Protection** — optional for preview deployments
7. **Cron Jobs** — defined in `vercel.json` (auto-applied on deploy)

> **Vercel Hobby-plan:** cron jobs mogen maximaal **1× per dag** draaien. Sub-daily schedules (bijv. elke 15 min) blokkeren deploy. Gebruik de externe cron hieronder voor frequentere broadcasts, of upgrade naar **Vercel Pro**.

### Cron schedule (`vercel.json`)

| Path | Schedule | Opmerking |
|------|----------|-----------|
| `/api/competition-calendar/sync` | Daily 06:00 UTC | |
| `/api/cron/reminders` | Daily 08:00 UTC | |
| `/api/cron/broadcasts` | Daily 07:00 UTC | Hobby-safe fallback |
| `/api/cron/storage-cleanup` | Sunday 03:00 UTC | |

### Externe cron — broadcasts elke 15 minuten (Hobby-plan)

**Geïmplementeerd:** GitHub Actions workflow `.github/workflows/cron-broadcasts.yml` roept elke 15 minuten `/api/cron/broadcasts` aan.

#### Status

| Stap | Status |
|------|--------|
| `CRON_SECRET` in GitHub Actions secrets | ✅ Geconfigureerd |
| Workflow `.github/workflows/cron-broadcasts.yml` | Push naar `main` vereist (zie hieronder) |

**Workflow naar GitHub pushen** (eenmalig — OAuth token needs `workflow` scope):

```bash
# Optie A: gh CLI met workflow scope
gh auth refresh -h github.com -s workflow
git push origin main

# Optie B: handmatig in GitHub UI
# Repository → Add file → Create new file
# Pad: .github/workflows/cron-broadcasts.yml
# Plak inhoud uit lokale .github/workflows/cron-broadcasts.yml
```

Daarna: **Actions → Cron — scheduled broadcasts → Run workflow** om direct te testen.

#### Eenmalige setup (GitHub secret)

1. ~~**New repository secret** `CRON_SECRET`~~ — **al ingesteld**
2. Optioneel — **Variables → `APP_URL`** = `https://limitlesscoaching.app`

#### Handmatige test (lokaal)

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://limitlesscoaching.app/api/cron/broadcasts
# Verwacht: 200
```

#### Alternatief: cron-job.org

Als je geen GitHub Actions wilt gebruiken:

1. Account op [cron-job.org](https://cron-job.org)
2. Job: `GET https://limitlesscoaching.app/api/cron/broadcasts` elke 15 min
3. Header: `Authorization: Bearer <CRON_SECRET>`

De dagelijkse Vercel-cron (07:00 UTC) blijft als backup; dubbele runs zijn veilig (reeds verzonden broadcasts hebben `sent_at`).

**Met Vercel Pro:** zet in `vercel.json` broadcasts naar `"schedule": "*/15 * * * *"`, verwijder GitHub workflow / externe job.

---

## D. Redeploy

1. Open [Vercel Dashboard](https://vercel.com) → **coaching-app**
2. **Deployments** → latest production deployment
3. **⋯** menu → **Redeploy**
4. Or push to `main` / run `npx vercel --prod --yes`

After changing environment variables, always redeploy so functions pick up new values.

---

## E. Verification checklist

- [ ] App opens at https://limitlesscoaching.app
- [ ] Login works (Supabase auth)
- [ ] Avatar / chat image upload works (R2)
- [ ] Large video upload works (presigned R2 + CORS on bucket)
- [ ] Cron routes return **401** without secret:
  ```bash
  curl -s -o /dev/null -w "%{http_code}" https://limitlesscoaching.app/api/cron/reminders
  # Expected: 401
  ```
- [ ] Cron routes return **200** with secret:
  ```bash
  curl -H "Authorization: Bearer $CRON_SECRET" \
    https://limitlesscoaching.app/api/cron/storage-cleanup
  ```
- [ ] `npm run typecheck` passes locally
- [ ] `npm run build` passes locally

Admin health check (logged in as admin): `/api/admin/health` shows `cronSecretPresent: true`.

---

## Local development

Copy env template:

```bash
cp .env.example .env.local
# Fill in values from Vercel / Supabase / Cloudflare dashboards
```

Pull Vercel env (optional):

```bash
npx vercel env pull .env.local
```
