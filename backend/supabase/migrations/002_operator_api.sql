begin;

create table if not exists public.operator_audit (
  idempotency_key_hash text primary key
    check (char_length(idempotency_key_hash) = 64),
  operation_id uuid not null unique,
  product_id bigint not null check (product_id > 0),
  fingerprint text not null check (char_length(fingerprint) = 64),
  reason text not null check (char_length(reason) between 1 and 500),
  actor text not null default 'operator',
  created_at timestamptz not null default now(),
  state text not null
    check (state in ('pending', 'writing', 'verified', 'unverified',
                     'rejected', 'uncertain')),
  before_payload jsonb,
  after_payload jsonb,
  result_payload jsonb,
  http_status integer check (http_status is null or http_status between 100 and 599)
);

create index if not exists operator_audit_created_at_idx
  on public.operator_audit (created_at desc);

create table if not exists public.operator_locks (
  product_id bigint primary key check (product_id > 0),
  operation_id uuid not null unique
    references public.operator_audit (operation_id) on delete restrict,
  acquired_at timestamptz not null default now()
);

alter table public.operator_audit enable row level security;
alter table public.operator_locks enable row level security;

revoke all on table public.operator_audit from anon, authenticated;
revoke all on table public.operator_locks from anon, authenticated;
grant select, insert, update, delete on table public.operator_audit to service_role;
grant select, insert, update, delete on table public.operator_locks to service_role;

commit;
