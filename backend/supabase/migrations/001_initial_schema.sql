-- LOCK CITY OS — Supabase/Postgres operational schema (P1)
-- Source-of-truth rules:
--   WooCommerce = orders / revenue / customers / refunds / shipping charged
--   Printful    = fulfillment / production cost / shipping cost / tracking
--   GA4         = behavioral analytics
--   Supabase    = operational intelligence (this schema)
--   Lock City AI = analysis only; never writes to official sources
--
-- Apply with: psql $DATABASE_URL -f 001_initial_schema.sql
-- (Transaction Pooler URI, port 6543 — see Emergent Supabase playbook)
-- RLS is enabled on every table with NO public policies: only the
-- service role (server-side) can read/write. Never expose the
-- service-role key to the browser.

begin;

create table if not exists customers (
  customer_id      uuid primary key default gen_random_uuid(),
  woo_customer_id  bigint unique,
  email            text,
  country          text,
  city             text,
  first_order_date timestamptz,
  last_order_date  timestamptz,
  order_count      integer not null default 0,
  total_revenue    numeric(12,2) not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists products (
  lock_product_id     uuid primary key default gen_random_uuid(),
  woo_product_id      bigint unique,
  printful_product_id text,
  sku                 text,
  commercial_name     text not null,
  internal_object_name text,           -- e.g. OBJECT_0041 (secondary metadata)
  collection          text,            -- district slug
  drop                text,
  hero_product        boolean not null default false,
  price               numeric(12,2),
  status              text not null default 'ACTIVE'  -- ACTIVE | SOLD_OUT | ARCHIVED
    check (status in ('ACTIVE','SOLD_OUT','ARCHIVED'))
);

create table if not exists product_variants (
  variant_id          uuid primary key default gen_random_uuid(),
  lock_product_id     uuid not null references products(lock_product_id) on delete cascade,
  woo_variation_id    bigint,
  printful_variant_id text,
  sku                 text,
  size                text,
  color               text,
  price               numeric(12,2),
  status              text not null default 'ACTIVE',
  unique (woo_variation_id)
);

create table if not exists orders (
  lock_order_id      uuid primary key default gen_random_uuid(),
  woo_order_id       bigint unique not null,
  customer_id        uuid references customers(customer_id),
  order_date         timestamptz,
  status             text,
  currency           text default 'EUR',
  gross_sales        numeric(12,2),
  net_sales          numeric(12,2),
  shipping_collected numeric(12,2),
  discount           numeric(12,2),
  refund             numeric(12,2) default 0,
  total              numeric(12,2)
);

create table if not exists order_items (
  order_item_id               uuid primary key default gen_random_uuid(),
  woo_order_id                bigint not null references orders(woo_order_id) on delete cascade,
  lock_product_id             uuid references products(lock_product_id),
  variant_id                  uuid references product_variants(variant_id),
  quantity                    integer not null,
  unit_price                  numeric(12,2),
  net_revenue                 numeric(12,2),
  printful_cost               numeric(12,2),
  printful_shipping_allocation numeric(12,2)
);

-- Promoter pipeline stages are defined by the LOCKED IN NETWORK playbook:
-- NEW_LEAD / RESEARCHED / QUALIFIED / CONTACTED / RESPONDED / INTERESTED /
-- ONBOARDING / ACTIVE_PROMOTER / GENERATING_SALES / AMBASSADOR / PARTNER
-- (plus NO_RESPONSE / FOLLOW_UP / PAUSED / REMOVED).
-- Commission economics are intentionally NOT defined here.
create table if not exists promoters (
  promoter_id   uuid primary key default gen_random_uuid(),
  person_id     uuid,
  stage         text not null default 'NEW_LEAD',
  city          text,
  country       text,
  category      text,
  brand_fit     smallint,
  audience_fit  smallint,
  coupon        text,
  referral_code text unique,
  status        text not null default 'ACTIVE',
  last_contact  timestamptz,
  next_action   text
);

create table if not exists attribution (
  attribution_id     uuid primary key default gen_random_uuid(),
  session_id         text,
  promoter_id        uuid references promoters(promoter_id),
  campaign_id        text,
  coupon             text,
  utm_source         text,
  utm_medium         text,
  utm_campaign       text,
  woo_order_id       bigint references orders(woo_order_id),
  attributed_revenue numeric(12,2)
);
create index if not exists attribution_order_idx on attribution(woo_order_id);
create index if not exists attribution_promoter_idx on attribution(promoter_id);

create table if not exists content_assets (
  asset_id          uuid primary key default gen_random_uuid(),
  product_id        uuid references products(lock_product_id),
  person_id         uuid,
  promoter_id       uuid references promoters(promoter_id),
  campaign          text,
  drop              text,
  format            text,
  platform          text,
  status            text,
  published_at      timestamptz,
  storage_reference text
);

create table if not exists conversations (
  conversation_id   uuid primary key default gen_random_uuid(),
  customer_id       uuid references customers(customer_id),
  promoter_id       uuid references promoters(promoter_id),
  person_ref        text,
  channel           text,   -- email | instagram | tiktok | website
  intent            text,   -- product_question | size_fit | shipping | order_status | return | refund | promoter_inquiry | collaboration | wholesale | other
  status            text not null default 'OPEN',
  last_interaction  timestamptz,
  owner             text,
  next_action       text
);

create table if not exists tasks (
  task_id    uuid primary key default gen_random_uuid(),
  entity_ref text,   -- e.g. promoter:<uuid> / order:<woo_order_id>
  task_type  text,
  owner      text,
  priority   smallint default 2,
  status     text not null default 'OPEN',
  due_date   date
);

-- Human-approval gate: commissions are never paid automatically.
create table if not exists commission_ledger (
  commission_id    uuid primary key default gen_random_uuid(),
  promoter_id      uuid not null references promoters(promoter_id),
  woo_order_id     bigint not null references orders(woo_order_id),
  eligible_revenue numeric(12,2),
  status           text not null default 'PENDING'
    check (status in ('PENDING','VALIDATED','ELIGIBLE','APPROVED','PAID','REVERSED')),
  created_at       timestamptz not null default now()
);

-- Any financially/legally sensitive automation must pass through here
-- and wait for a human: refunds, pricing changes, payouts, ad spend,
-- contracts, major promotions, sensitive communications.
create table if not exists approvals (
  approval_id  uuid primary key default gen_random_uuid(),
  action_type  text not null,
  requested_by text,
  payload      jsonb,
  status       text not null default 'PENDING'
    check (status in ('PENDING','APPROVED','REJECTED')),
  approved_by  text,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

-- Webhook idempotency: delivery ids from WooCommerce/Printful are stored
-- here so retries never create duplicate records.
create table if not exists webhook_events (
  delivery_id text primary key,
  source      text not null,   -- woocommerce | printful | ...
  topic       text not null,
  received_at timestamptz not null default now()
);

-- Row Level Security: locked down by default (service role only).
alter table customers          enable row level security;
alter table products           enable row level security;
alter table product_variants   enable row level security;
alter table orders             enable row level security;
alter table order_items        enable row level security;
alter table promoters          enable row level security;
alter table attribution        enable row level security;
alter table content_assets     enable row level security;
alter table conversations      enable row level security;
alter table tasks              enable row level security;
alter table commission_ledger  enable row level security;
alter table approvals          enable row level security;
alter table webhook_events     enable row level security;

commit;
