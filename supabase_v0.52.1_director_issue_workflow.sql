-- TEAM Theory v0.52.1 監督発議ワークフロー追加
alter table public.director_issue_responses
  add column if not exists manager_comment text not null default '';

drop policy if exists "managers can comment issue responses" on public.director_issue_responses;
create policy "managers can comment issue responses"
on public.director_issue_responses
for update
using (
  exists (
    select 1 from public.director_issues i
    where i.id = issue_id
      and public.can_manage_team(i.team_id)
  )
)
with check (
  exists (
    select 1 from public.director_issues i
    where i.id = issue_id
      and public.can_manage_team(i.team_id)
  )
);
