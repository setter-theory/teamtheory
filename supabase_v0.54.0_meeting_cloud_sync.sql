-- TEAM Theory v0.54.1
-- ミーティング本体をチーム単位でクラウド共有

create table if not exists public.team_meetings (
  id text primary key,
  team_id uuid not null references public.teams(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_team_meetings_team_id on public.team_meetings(team_id);
create index if not exists idx_team_meetings_updated_at on public.team_meetings(updated_at desc);

alter table public.team_meetings enable row level security;

drop policy if exists "team members can read meetings" on public.team_meetings;
create policy "team members can read meetings" on public.team_meetings
for select using (public.is_team_member(team_id));

drop policy if exists "team members can create meetings" on public.team_meetings;
create policy "team members can create meetings" on public.team_meetings
for insert with check (public.is_team_member(team_id));

drop policy if exists "team members can update meetings" on public.team_meetings;
create policy "team members can update meetings" on public.team_meetings
for update using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));

drop policy if exists "team members can delete meetings" on public.team_meetings;
create policy "team members can delete meetings" on public.team_meetings
for delete using (public.is_team_member(team_id));
