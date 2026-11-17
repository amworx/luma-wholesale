# Cloud sync (Luma wholesale demo)

The demo now keeps **one shared data document in Supabase**. Every device reads
and writes that same document, so an edit on the laptop appears on the phone
automatically. Products, variants, categories, orders, enquiries, users,
settings and favorites are all shared. The shopping cart stays per-device.

## How it works

- `src/data/cloud.ts` wraps the Supabase client. The URL and **publishable**
  (public, browser-safe) key are baked in so it works with no setup.
- `src/data/store.ts` picks `CloudAdapter` when cloud config is present,
  otherwise `LocalAdapter` (per-device) as a fallback.
- The shared document is one row in `public.luma_store` (id `main`), stored as
  `jsonb`. Writes use optimistic concurrency on `updated_at` so a stale device
  cannot silently overwrite a newer change; on conflict it adopts the newer row.
- A Supabase Realtime subscription pushes changes to every open tab/device
  immediately — no refresh needed.
- `localStorage` (`luma.data.v2`) is kept as an **offline cache**. If the network
  is down the app still opens with the last known data; edits are cached and the
  next successful write syncs them.

## Supabase project

- Project ref: `dymkqaxrnmiveshhakan`
- Region: West Europe (London)
- Dashboard: https://supabase.com/dashboard/project/dymkqaxrnmiveshhakan
- Schema: `docs/SUPABASE_SCHEMA.sql` (already applied)

## Security — read this before going live

This is **demo-grade**. RLS is enabled, but the policies intentionally allow
public read and write because the demo has no login gate on the data. That means
**anyone with the app URL can read or change the shared data**. The publishable
key is safe to expose in the browser; the risk is the open policies, not the key.

Before real use, do one of these:

1. Put real authentication in front of the dashboards and tighten the RLS
   policies to check `auth.uid()` / roles, or
2. Move writes behind an Edge Function or API that validates the caller.

Never put the `service_role` / secret key in the app. Only the publishable key
belongs in client code.

## Point it at your own project

1. Create a free project at https://supabase.com.
2. Run `docs/SUPABASE_SCHEMA.sql` in its SQL editor.
3. Replace `URL` and `PUBLISHABLE_KEY` in `src/data/cloud.ts` with your project's
   URL and publishable key.
4. Rebuild and redeploy.

## Resetting the demo

The admin "إعادة البيانات الأصلية" button writes fresh seed data to the shared
document, which resets **every** device. Use it deliberately.
