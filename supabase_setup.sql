-- TEAM Theory v0.50.0 cloud foundation
create extension if not exists pgcrypto;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  school_name text default '',
  category text default '未設定',
  team_level text default '未設定',
  invite_code text not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default '選手',
  position text default '未設定',
  grade text default '未設定',
  status text not null default 'active',
  joined_at timestamptz not null default now(),
  unique(team_id,user_id)
);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

create or replace function public.is_team_member(target_team uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.team_members m where m.team_id=target_team and m.user_id=auth.uid() and m.status='active'); $$;

create policy "members can read their teams" on public.teams for select using (public.is_team_member(id) or owner_id=auth.uid());
create policy "users can create teams" on public.teams for insert with check (owner_id=auth.uid());
create policy "owners can update teams" on public.teams for update using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create policy "owners can delete teams" on public.teams for delete using (owner_id=auth.uid());

create policy "members can read memberships" on public.team_members for select using (public.is_team_member(team_id));
create policy "users can add own membership" on public.team_members for insert with check (user_id=auth.uid());
create policy "users can update own membership" on public.team_members for update using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "owners can manage memberships" on public.team_members for all using (exists(select 1 from public.teams t where t.id=team_id and t.owner_id=auth.uid())) with check (exists(select 1 from public.teams t where t.id=team_id and t.owner_id=auth.uid()));

create or replace function public.join_team_by_code(p_code text, p_name text, p_role text default '選手', p_position text default '未設定', p_grade text default '未設定')
returns uuid language plpgsql security definer set search_path=public as $$
declare v_team uuid;
begin
  select id into v_team from public.teams where upper(invite_code)=upper(trim(p_code));
  if v_team is null then raise exception 'INVALID_INVITE_CODE'; end if;
  insert into public.team_members(team_id,user_id,display_name,role,position,grade)
  values(v_team,auth.uid(),p_name,p_role,p_position,p_grade)
  on conflict(team_id,user_id) do update set display_name=excluded.display_name, role=excluded.role, position=excluded.position, grade=excluded.grade, status='active';
  return v_team;
end $$;
grant execute on function public.join_team_by_code(text,text,text,text,text) to authenticated;
