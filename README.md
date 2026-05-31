# menunico

## Setup

```bash
git clone git@github.com:nchristi13-personal/menunico.git
cd menunico
cp .env.local.example .env.local
# Fill in the values in .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Environment variables

See [.env.local.example](.env.local.example) for the full list. You'll need:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from your Supabase project (Settings → API).
- `SUPABASE_SERVICE_ROLE_KEY` — server-only key from the same page. Never expose to the client.
- `ANTHROPIC_API_KEY` — from https://console.anthropic.com.
- `CRON_SECRET` — any random string; used to authenticate scheduled jobs.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui (new-york style, zinc base)
- Supabase (SSR auth via `@supabase/ssr`)
