-- TEAM Theory v0.56.1
-- Realtime対象テーブルをSupabaseのpublicationへ追加します。
-- 何度実行しても重複エラーにならないようにしています。

do $$
declare
  t text;
begin
  foreach t in array array['team_meetings','director_issues','director_issue_responses','team_members','teams']
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

alter table public.team_meetings replica identity full;
alter table public.director_issues replica identity full;
alter table public.director_issue_responses replica identity full;
alter table public.team_members replica identity full;
alter table public.teams replica identity full;

notify pgrst, 'reload schema';
