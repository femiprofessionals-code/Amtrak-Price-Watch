# Travel Price Watch

A modern web app for tracking transportation ticket prices. Set a target price for an Amtrak trip and get an email the moment the fare drops below it.

Built with **Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Prisma 7 · PostgreSQL · Resend**, deployable to Vercel out of the box.

## Features

- **Landing page** — hero, animated stats, features, how-it-works, FAQ, testimonials, dark/light mode
- **Authentication** — email + password (bcrypt), JWT session cookies, email verification, forgot/reset password, social-login-ready UI
- **Dashboard** — overview cards (active alerts, price drops, lowest price, avg. savings), price history chart, recent alerts & notifications, quick actions
- **Alerts** — 4-step creation wizard (route → travel details → price target → review) with live fare estimate, list with search/filter/status tabs, detail page with SVG price chart and check history, edit / pause / resume / delete / check-now
- **Price monitoring engine** — scheduled fare checks, price history recording, target comparison, duplicate-notification prevention, automatic expiry of past travel dates
- **Notification center** — read/unread, search, type filter, mark all read
- **Emails** — responsive HTML templates for verification, password reset, alert created, and price drops (via Resend; logged to console in dev)
- **Settings** — profile, password change, email preferences, theme, account deletion
- **UI/UX** — responsive (mobile bottom nav → desktop sidebar), dark mode, skeleton loaders, empty states, toasts, accessible components (ARIA, keyboard nav, focus states)

## Architecture

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── (auth)/               # login, register, forgot/reset password, verify email
│   ├── (app)/                # authenticated shell: dashboard, alerts, notifications, settings
│   └── api/
│       ├── fare/             # live fare estimate for the wizard
│       └── cron/check-prices # scheduled monitoring endpoint
├── actions/                  # Server Actions (auth, alerts, notifications, profile)
├── components/               # ui/ (design system), charts/, alerts/, marketing/, …
├── lib/
│   ├── monitor.ts            # price monitoring engine
│   ├── providers/            # pluggable fare providers (Amtrak first)
│   ├── email/                # Resend client + HTML templates
│   ├── auth.ts, session.ts   # bcrypt + JWT sessions, token issuance
│   └── db.ts                 # Prisma client (pg driver adapter)
├── proxy.ts                  # optimistic auth redirects (Next 16 middleware)
└── generated/prisma/         # generated Prisma client (gitignored)
prisma/                       # schema, migrations, station seed
```

**Provider abstraction.** Fare sources implement the `PriceProvider` interface (`src/lib/providers/types.ts`) and register in `src/lib/providers/index.ts`. Amtrak has no public fares API, so the included adapter produces deterministic, realistic simulated fares (route-seeded base price, demand curve, weekend uplift, slow random walk so prices genuinely drop over time). Swap in a real scraper or partner API without touching the engine or UI. Adding Greyhound/FlixBus/etc. is: implement the interface, add an enum value, register it.

**Money** is stored as integer cents. **Prices** are recorded per alert in `PriceHistory` on every check.

**Notification dedup.** An alert stores `lastNotifiedPriceCents`; users are re-notified only when the fare falls *below* the last notified price (see `shouldNotify` in `src/lib/monitor.ts`, unit-tested).

## Getting started

```bash
npm install
cp .env.example .env       # fill in values (see below)
npx prisma migrate dev     # create schema
npx prisma db seed         # load ~50 Amtrak stations
npm run dev
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (Supabase/Neon/RDS/local) |
| `SESSION_SECRET` | ≥32-char random string for signing session JWTs (`openssl rand -hex 32`) |
| `RESEND_API_KEY` | Resend API key. Empty in dev → emails are logged to the console |
| `EMAIL_FROM` | Verified sender, e.g. `Travel Price Watch <alerts@yourdomain.com>` |
| `NEXT_PUBLIC_APP_URL` | Public base URL used in email links |
| `CRON_SECRET` | Shared secret protecting the monitoring endpoint |

## Price monitoring

`GET /api/cron/check-prices` (requires `Authorization: Bearer $CRON_SECRET`) runs a full pass: expires alerts whose travel date passed, fetches the current fare for every active alert, records history, and notifies (in-app + email) when targets are hit.

- **GitHub Actions (primary):** `.github/workflows/price-check.yml` calls the endpoint every 30 minutes. One-time setup: add a repository secret named `CRON_SECRET` (GitHub → repo → Settings → Secrets and variables → Actions) matching the value in Vercel. Scheduled workflows run from the repo's default branch.
- **Vercel Cron (backup):** `vercel.json` schedules a daily run (the Hobby plan allows at most one run per day); the auth header is sent automatically once `CRON_SECRET` is set in project env. Runs only on production deployments.
- **Anywhere else:** point any scheduler at the endpoint with the same header.
- Users can also trigger a single-alert check from the UI ("Check price now").

## Testing

```bash
npm test        # vitest — monitoring logic + fare provider
npm run lint    # eslint
npx tsc --noEmit
```

Core flows (register → create alert → monitor → notify → dedup, plus every page in light/dark and mobile) are covered by a Playwright script exercised against a production build during development.

## Deployment (Vercel)

1. Push the repo and import it in Vercel.
2. Add the environment variables above (use your production database).
3. `npm run build` runs `prisma generate` automatically; run `npx prisma migrate deploy` against the production DB (e.g. as a one-off or CI step).
4. Cron is configured by `vercel.json` — set `CRON_SECRET` and it works.
