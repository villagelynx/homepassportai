# Admin dashboard setup

Secure operator dashboard for HomePassportAI.

- **Route:** `/admin` (also `/admin.html`)
- **Stats API:** `GET /api/admin/stats` (Bearer token required)
- **Analytics ingest:** `POST /api/analytics/event` (signed-in users only; service role stays server-side)

The browser never receives `SUPABASE_SERVICE_ROLE_KEY`. Aggregates are computed only in Netlify functions / `server.py`.

## 1. Apply the analytics migration

In the Supabase SQL Editor, paste and run:

`supabase/migrations/20260718000000_admin_analytics.sql`

This creates:

- `public.analytics_events` (RLS on, no client policies)
- `public.admin_dashboard_database_stats()`
- `public.admin_analytics_aggregates()`
- refreshes `public.admin_inventory_stats()` grants for `service_role` only

If you cannot apply the migration yet, the dashboard still works for Auth + appliances metrics. Analytics-backed cards show empty / unavailable until the SQL is applied.

## 2. Configure environment variables

### Local (`.env`)

```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
ADMIN_EMAILS=you@example.com,other-admin@example.com
```

Then:

```bash
node scripts/build-config.mjs
./serve.sh
```

Open `http://localhost:8080/admin`.

### Netlify

Set the same variables in **Site settings → Environment variables**, then redeploy:

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | Browser + token verification |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only aggregates / inserts |
| `ADMIN_EMAILS` | Comma-separated admin allowlist |

Never expose the service role key in `js/runtime-config.js` or any browser bundle.

## 3. Grant admin access

### Option A — email allowlist (recommended)

Add the operator email to `ADMIN_EMAILS` (local `.env` and Netlify).

### Option B — Supabase role flag

In Supabase Auth → Users → choose user → set App Metadata, for example:

```json
{ "role": "admin" }
```

Also accepted: `{ "admin": true }` or `{ "is_admin": true }` in `app_metadata` / `user_metadata`.

Either allowlist **or** role flag is enough. Non-admins receive `403` from the API and an Access denied state on `/admin`.

## 4. Metric definitions

| Card | Source | Ready without migration? |
|------|--------|--------------------------|
| Total Registered Users | Auth admin users list | Yes |
| Active Today | `last_sign_in_at` within 24h | Yes |
| New Users This Week | `created_at` last 7 days | Yes |
| Homes Created | Distinct `appliances.user_id` (no homes table) | Yes* |
| Rooms Scanned | `analytics_events.room_scanned` | Needs migration + traffic |
| Appliances Added | `appliances` row count | Yes |
| Manual Lookups | `analytics_events.manual_lookup` (not file uploads) | Needs migration + traffic |
| Storage Used | `storage.objects` size sum | Needs migration RPC |
| Users by Country | Edge geo on analytics events | Needs migration + traffic |
| Most Used Features | Analytics event_name counts | Needs migration + traffic |
| iPhone vs Android | UA-derived device_type on events | Needs migration + traffic |
| Daily Growth | Auth signups/day (14 UTC days) | Yes |

\* Homes Created uses inventory presence as a proxy because there is no separate homes table.

Analytics metrics are **not backfilled**. They accumulate only after migration + deploy.

## 5. Privacy notes

- Clients may send only an allowlisted `eventName`.
- Country and device are derived server-side (geo headers / User-Agent).
- No free-form properties, content, photos, or model numbers are stored in analytics.
- `analytics_events` has RLS enabled with no anon/authenticated policies.

## 6. Smoke checks

1. Non-admin signed-in user → `/api/admin/stats` returns `403`
2. Admin user → dashboard cards load
3. Before migration: analytics cards show unavailable/empty, Auth/inventory cards still work
4. After migration: saving an appliance / room scan / opening manuals increments analytics cards after refresh
