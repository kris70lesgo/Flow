# Xano setup (optional — LOCAL mode is the default)

AegisFlow uses the `incident` table as its durable single-write evidence snapshot.
Sanity is the canonical supplier evidence graph. The other Xano tables are optional
normalized mirrors: they enrich the backend when configured, but never block the app.

## 1. Create the incident table (required)

In your workspace → **Database** → **Add table**. Create these with exactly these
field names (types in parentheses):

**`incident`**
`incident_key` (text) · `supplier` (text) · `affected_product` (text) · `status` (text) ·
`inventory_days` (int) · `revenue_exposure` (int) · `state` (text) · `evidence_json` (json)

## Optional normalized mirrors

Create these only if you want individually queryable Xano rows in addition to the
complete `incident.evidence_json` snapshot.

**`supplier`**
`incident_id` (int) · `supplier_key` (text) · `name` (text) · `location` (text) ·
`lead_time_days` (int) · `cost_multiplier` (decimal) · `risk_score` (int) ·
`recommendation` (bool) · `recommendation_reasoning` (text)

**`claim`**
`supplier_id` (int) · `claim_key` (text) · `text` (text) · `source` (text) · `ts` (text) ·
`confidence` (int) · `status` (text) · `conflict_reason` (text) · `document_evidence` (json)

**`audit_event`**
`incident_id` (int) · `event_ts` (text) · `event` (text) · `actor` (text)

> Xano adds `id`, `created_at` automatically — leave those.

## 2. Generate endpoints

Go to **APIs** → **Add API Group** → name it `aegisflow` (or reuse the default group).
Generate the standard CRUD endpoints for `incident`. Its POST endpoint must accept a
single JSON input named `record`; this is the durable evidence write used by the app.
The default CRUD endpoint set is optional for the mirror tables.

- `GET /{table}` (list all)
- `GET /{table}/{id}`
- `POST /{table}`
- `PATCH /{table}/{id}` (or `PUT` — either works)
- `DELETE /{table}/{id}` (not used, fine to leave)

That's it — **do not add inputs, filters, or search**. The app lists each table and
filters rows itself.

## 3. Get the base URL

On the API Group page, copy the **base URL**. It looks like:

```
https://x8ki-letl-twmt.n7.xano.io/api:AbC12dEf
```

(the `api:xxxxxx` suffix is the API group's canonical path).

## 4. Set env vars

In `.env.local` (and later as Vercel env vars):

```
XANO_API_BASE=https://x8ki-letl-twmt.n7.xano.io/api:AbC12dEf
XANO_API_TOKEN=            # leave blank — CRUD endpoints are public by default
XANO_AUTO_SEED=true        # auto-creates INC-1042 rows on first load
```

Only set `XANO_API_TOKEN` if you switched the endpoints to require authentication
(you don't need to for the demo).

## 5. Seed once (recommended)

The free tier is limited to **10 requests / 20 seconds**, so let the app seed at
runtime and the first incident load is slow (~30s) — or seed once up front:

```bash
node scripts/seed-xano.mjs
```

Then set `XANO_AUTO_SEED=false` in `.env` so the app never seeds at runtime — it
just reads INC-1042 once and writes updates best-effort.

## 6. Restart and verify

`npm run dev`, open the app. The sidebar footer should read **Persistence: XANO**,
and `/integrations` shows Xano as **LIVE** with a real `PATCH/POST` call after an
incident response.

If Xano hits its rate limit mid-run, the app **falls back to its in-memory mirror**
for that request (footer shows the reason) and keeps working — nothing breaks.

To reset: delete all rows in the four tables, re-run the seed script.
