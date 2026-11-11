begin;

-- Human Operator sessions. Only a keyed hash of the opaque cookie is stored.
create table if not exists public.operator_sessions (
  session_hash text primary key check (char_length(session_hash) = 64),
  actor_id text not null check (char_length(actor_id) between 1 and 100),
  created_at timestamptz not null,
  expires_at timestamptz not null check (expires_at > created_at),
  revoked_at timestamptz,
  last_seen_at timestamptz not null
);

create index if not exists operator_sessions_expiry_idx
  on public.operator_sessions (expires_at);

-- Fixed-window login throttling. bucket_hash is an HMAC of email + source IP;
-- neither value is recoverable from this table.
create table if not exists public.operator_login_attempts (
  bucket_hash text not null check (char_length(bucket_hash) = 64),
  window_started_at timestamptz not null,
  attempts integer not null check (attempts > 0),
  last_attempt_at timestamptz not null,
  primary key (bucket_hash, window_started_at)
);

create index if not exists operator_login_attempts_cleanup_idx
  on public.operator_login_attempts (window_started_at);

-- Generalized audit ledger. The original operator_audit table remains intact.
create table if not exists public.operator_audit_events (
  idempotency_key_hash text primary key check (char_length(idempotency_key_hash) = 64),
  operation_id uuid not null unique,
  request_fingerprint text not null check (char_length(request_fingerprint) = 64),
  actor_id text not null check (char_length(actor_id) between 1 and 100),
  action text not null check (char_length(action) between 1 and 100),
  entity_type text not null check (char_length(entity_type) between 1 and 100),
  entity_id text,
  state text not null check (state in ('reserved', 'writing', 'verified', 'failed', 'uncertain')),
  reason text not null check (char_length(reason) between 1 and 500),
  before_payload jsonb,
  after_payload jsonb,
  result_payload jsonb,
  http_status integer check (http_status is null or http_status between 100 and 599),
  error_code text check (error_code is null or char_length(error_code) between 1 and 100),
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists operator_audit_events_created_idx
  on public.operator_audit_events (created_at desc);
create index if not exists operator_audit_events_entity_idx
  on public.operator_audit_events (entity_type, entity_id, created_at desc);

alter table public.operator_sessions enable row level security;
alter table public.operator_login_attempts enable row level security;
alter table public.operator_audit_events enable row level security;

revoke all on table public.operator_sessions from anon, authenticated;
revoke all on table public.operator_login_attempts from anon, authenticated;
revoke all on table public.operator_audit_events from anon, authenticated;

grant select, insert, update, delete on table public.operator_sessions to service_role;
grant select, insert, update, delete on table public.operator_login_attempts to service_role;
grant select, insert, update on table public.operator_audit_events to service_role;

commit;
