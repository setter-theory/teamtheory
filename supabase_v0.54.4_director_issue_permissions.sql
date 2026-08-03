-- TEAM Theory v0.54.4 監督発議の編集・再開・削除権限
-- 編集・終了・再開：チーム所有者、監督、コーチ
-- 完全削除：チーム所有者、監督、または発議作成者

drop policy if exists "managers can delete director issues" on public.director_issues;
create policy "managers can delete director issues"
on public.director_issues
for delete
using (
  created_by = auth.uid()
  or exists (
    select 1 from public.teams t
    where t.id = team_id and t.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.team_members m
    where m.team_id = director_issues.team_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = '監督'
  )
);

notify pgrst, 'reload schema';
