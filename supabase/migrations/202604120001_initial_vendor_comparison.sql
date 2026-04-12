create extension if not exists pgcrypto;

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  job_id text not null,
  customer_name text,
  status text,
  created_at timestamptz not null default now()
);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  preferred boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text,
  created_at timestamptz not null default now()
);

create table if not exists public.quote_responses (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  item_id uuid references public.items(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete cascade,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  shipping_cost numeric not null default 0,
  total_cost numeric not null default 0,
  lead_time_days numeric,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.parts_usage (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  item_id uuid references public.items(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete cascade,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  total_cost numeric not null default 0,
  source_quote_id uuid references public.quote_responses(id) on delete set null,
  confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_quote_responses_job_item on public.quote_responses(job_id, item_id);
create index if not exists idx_quote_responses_item on public.quote_responses(item_id);
create index if not exists idx_quote_responses_vendor on public.quote_responses(vendor_id);
create index if not exists idx_parts_usage_job_item on public.parts_usage(job_id, item_id);
create index if not exists idx_parts_usage_vendor on public.parts_usage(vendor_id);

