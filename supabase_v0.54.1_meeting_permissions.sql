-- TEAM Theory v0.54.1
-- ミーティングの終了・完全削除権限を保護

alter table public.team_meetings
  add column if not exists created_by uuid references auth.users(id) on delete set null;

-- 既存データはチーム作成者を作成者として補完する。
update public.team_meetings tm
set created_by = t.owner_id
from public.teams t
where tm.team_id = t.id
  and tm.created_by is null;

create or replace function public.is_team_meeting_manager(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teams t
    where t.id = target_team_id
      and t.owner_id = auth.uid()
  ) or exists (
    select 1
    from public.team_members m
    where m.team_id = target_team_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('監督', 'コーチ')
  );
$$;

-- 閲覧・共同入力は同じチームのメンバーに許可する。
drop policy if exists "team members can read meetings" on public.team_meetings;
create policy "team members can read meetings" on public.team_meetings
for select using (public.is_team_member(team_id));

drop policy if exists "team members can create meetings" on public.team_meetings;
create policy "team members can create meetings" on public.team_meetings
for insert with check (
  public.is_team_member(team_id)
  and created_by = auth.uid()
);

drop policy if exists "team members can update meetings" on public.team_meetings;
create policy "team members can update meetings" on public.team_meetings
for update using (public.is_team_member(team_id))
with check (public.is_team_member(team_id));

-- 完全削除は作成者、チーム所有者、監督だけ。
-- コーチはアプリ上で終了操作はできるが、完全削除はできない。
drop policy if exists "team members can delete meetings" on public.team_meetings;
drop policy if exists "creator or director can delete meetings" on public.team_meetings;
create policy "creator or director can delete meetings" on public.team_meetings
for delete using (
  created_by = auth.uid()
  or exists (
    select 1 from public.teams t
    where t.id = team_id and t.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.team_members m
    where m.team_id = team_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = '監督'
  )
);
