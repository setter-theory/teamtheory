-- TEAM Theory v0.50.3
-- クラウドメンバー情報・役割管理の追加

alter table public.team_members add column if not exists number text default '';
alter table public.team_members add column if not exists dominant_hand text default '未設定';
alter table public.team_members add column if not exists captain_role text default 'なし';

-- 自分のプロフィール更新では役割を勝手に昇格できないようにする。
-- 監督（チーム所有者）は既存の owners can manage memberships ポリシーで全員を管理可能。
drop policy if exists "users can update own membership" on public.team_members;
create policy "users can update own profile" on public.team_members
for update using (user_id=auth.uid())
with check (user_id=auth.uid());
