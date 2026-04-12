insert into public.jobs (id, job_id, customer_name, status, created_at) values
  ('11111111-1111-4111-8111-111111111111', 'WO-8821', 'Sarah Johnson', 'active', '2026-04-12T13:00:00Z')
on conflict (id) do update set
  job_id = excluded.job_id,
  customer_name = excluded.customer_name,
  status = excluded.status;

insert into public.vendors (id, name, preferred, created_at) values
  ('22222222-2222-4222-8222-222222222221', 'Midwest HVAC Supply', true, '2026-04-12T13:05:00Z'),
  ('22222222-2222-4222-8222-222222222222', 'Prairie Pipe & Fixture', false, '2026-04-12T13:06:00Z'),
  ('22222222-2222-4222-8222-222222222223', 'ToolShare Rentals', false, '2026-04-12T13:07:00Z')
on conflict (id) do update set
  name = excluded.name,
  preferred = excluded.preferred;

insert into public.items (id, name, unit, created_at) values
  ('33333333-3333-4333-8333-333333333331', 'Run Capacitor', 'each', '2026-04-12T13:10:00Z'),
  ('33333333-3333-4333-8333-333333333332', '40 Gallon Gas Water Heater', 'each', '2026-04-12T13:11:00Z'),
  ('33333333-3333-4333-8333-333333333333', 'Drain Machine Rental', 'day', '2026-04-12T13:12:00Z')
on conflict (id) do update set
  name = excluded.name,
  unit = excluded.unit;

insert into public.quote_responses (
  id,
  job_id,
  item_id,
  vendor_id,
  quantity,
  unit_price,
  shipping_cost,
  total_cost,
  lead_time_days,
  notes,
  created_at
) values
  (
    '44444444-4444-4444-8444-444444444441',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333331',
    '22222222-2222-4222-8222-222222222221',
    1,
    48.25,
    0,
    48.25,
    1,
    'Preferred counter pickup; reliable stock for dual run capacitors.',
    '2026-04-12T14:00:00Z'
  ),
  (
    '44444444-4444-4444-8444-444444444442',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333331',
    '22222222-2222-4222-8222-222222222222',
    1,
    41.75,
    4.50,
    46.25,
    2,
    'Cheapest delivered option, next-day counter transfer.',
    '2026-04-12T14:03:00Z'
  ),
  (
    '44444444-4444-4444-8444-444444444443',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333331',
    '22222222-2222-4222-8222-222222222223',
    1,
    56.00,
    0,
    56.00,
    0,
    'Faster pickup from rental counter partner, higher unit price.',
    '2026-04-12T14:06:00Z'
  )
on conflict (id) do update set
  job_id = excluded.job_id,
  item_id = excluded.item_id,
  vendor_id = excluded.vendor_id,
  quantity = excluded.quantity,
  unit_price = excluded.unit_price,
  shipping_cost = excluded.shipping_cost,
  total_cost = excluded.total_cost,
  lead_time_days = excluded.lead_time_days,
  notes = excluded.notes,
  created_at = excluded.created_at;

