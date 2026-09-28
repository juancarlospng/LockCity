begin;

create table if not exists public.operator_mockup_plans (
  plan_id uuid primary key,
  template_id bigint not null check (template_id > 0),
  product_payload jsonb not null,
  requested_variants jsonb not null,
  requested_styles jsonb not null,
  status text not null
    check (status in ('planned', 'scheduling', 'pending', 'failed')),
  task_keys jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists operator_mockup_plans_template_idx
  on public.operator_mockup_plans (template_id, created_at desc);
create index if not exists operator_mockup_plans_task_keys_idx
  on public.operator_mockup_plans using gin (task_keys);

create table if not exists public.operator_mockup_audit (
  event_id bigint generated always as identity primary key,
  plan_id uuid not null
    references public.operator_mockup_plans (plan_id) on delete restrict,
  template_id bigint not null check (template_id > 0),
  action text not null
    check (action in ('dry_run', 'generation', 'status_check')),
  task_key bigint check (task_key is null or task_key > 0),
  status text not null check (char_length(status) between 1 and 64),
  created_at timestamptz not null default now()
);

create index if not exists operator_mockup_audit_created_idx
  on public.operator_mockup_audit (created_at desc);

alter table public.operator_mockup_plans enable row level security;
alter table public.operator_mockup_audit enable row level security;

revoke all on table public.operator_mockup_plans from anon, authenticated;
revoke all on table public.operator_mockup_audit from anon, authenticated;
grant select, insert, update on table public.operator_mockup_plans to service_role;
grant select, insert on table public.operator_mockup_audit to service_role;

commit;
