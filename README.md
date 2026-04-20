# SyncCapture

SyncCapture is a mobile-first field capture prototype for turning technician notes, photos, proof of presence, and job context into office-side action queues.

## Product Boundary

Field mode is for capture and intent. It should stay fast, low-friction, and action-first.

Ops mode is for structure, pricing, review, formalization, and office-side execution.

If a technician has to stop and fill out a long form, the product is drifting in the wrong direction.

## Current Scope

- Unified field capture input for typed or voice notes.
- Photo, GPS, timestamp, and audit trail proof of presence.
- Deterministic routing layer for suggested next actions.
- Job matching by work order ID, customer/address, GPS proximity, and recent open job context.
- Ops queues for proposals, work orders, office updates, and emergencies.
- Supabase-backed vendor comparison slice for jobs, vendors, items, quote responses, and parts usage when configured.

## Routing Actions

- `generate_proposal` routes to `proposals`.
- `log_to_job` routes to `work_orders`.
- `notify_office` routes to `office_updates`.
- `escalate_emergency` routes to `emergencies` and overrides normal routing.

## Run Locally

Prerequisite: Node.js.

```bash
npm install
npm run dev
```

Set `GEMINI_API_KEY` in `.env.local` if you want live capture interpretation. Without it, the app uses deterministic mock interpretation for local development.

## Checks

```bash
npm test
npm run lint
npm run build
```

## Supabase Vendor Comparison Slice

The data-backed loop uses Supabase for jobs, vendors, items, quote responses, and selected parts usage.

1. Create a Supabase project.
2. Run `supabase/migrations/202604120001_initial_vendor_comparison.sql`.
3. Run `supabase/seed/202604120001_vendor_comparison_seed.sql`.
4. Add these values to `.env.local`:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

5. Restart `npm run dev`.

In the app, create or open a capture, add a material, pick the seeded Supabase job, and use Compare vendors to load quote responses. Choosing Use this vendor writes the selected quote into `parts_usage`.
