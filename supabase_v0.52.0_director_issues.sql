-- TEAM Theory v0.52.0 監督発議
create table if not exists public.director_issues (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  body text not null default '',
  target_type text not null default 'all',
  target_value text not null default '',
  due_at timestamptz,
  status text not null default 'open',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.director_issue_responses (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.director_issues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default '',
  answer text not null default '',
  read_at timestamptz,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  unique(issue_id,user_id)
);
alter table public.director_issues enable row level security;
alter table public.director_issue_responses enable row level security;
create or replace function public.can_manage_team(target_team uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.team_members m where m.team_id=target_team and m.user_id=auth.uid() and m.status='active' and m.role in ('監督','コーチ')) or exists(select 1 from public.teams t where t.id=target_team and t.owner_id=auth.uid()); $$;
drop policy if exists "team members can read director issues" on public.director_issues;
create policy "team members can read director issues" on public.director_issues for select using (public.is_team_member(team_id));
drop policy if exists "managers can create director issues" on public.director_issues;
create policy "managers can create director issues" on public.director_issues for insert with check (public.can_manage_team(team_id) and created_by=auth.uid());
drop policy if exists "managers can update director issues" on public.director_issues;
create policy "managers can update director issues" on public.director_issues for update using (public.can_manage_team(team_id)) with check (public.can_manage_team(team_id));
drop policy if exists "members can read issue responses" on public.director_issue_responses;
create policy "members can read issue responses" on public.director_issue_responses for select using (exists(select 1 from public.director_issues i where i.id=issue_id and public.is_team_member(i.team_id)));
drop policy if exists "members can insert own issue response" on public.director_issue_responses;
create policy "members can insert own issue response" on public.director_issue_responses for insert with check (user_id=auth.uid() and exists(select 1 from public.director_issues i where i.id=issue_id and public.is_team_member(i.team_id)));
drop policy if exists "members can update own issue response" on public.director_issue_responses;
create policy "members can update own issue response" on public.director_issue_responses for update using (user_id=auth.uid()) with check (user_id=auth.uid());
create index if not exists director_issues_team_created_idx on public.director_issues(team_id,created_at desc);
create index if not exists director_issue_responses_issue_idx on public.director_issue_responses(issue_id);
