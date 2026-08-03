-- TEAM Theory v0.56.0
-- 学校ごとのミーティング公開ポリシー

alter table public.teams
  add column if not exists meeting_policy text not null default 'standard',
  add column if not exists meeting_show_active boolean not null default true,
  add column if not exists meeting_content_scope text not null default 'target',
  add column if not exists meeting_response_scope text not null default 'target',
  add column if not exists meeting_alia_scope text not null default 'all';

alter table public.teams drop constraint if exists teams_meeting_policy_check;
alter table public.teams add constraint teams_meeting_policy_check
  check (meeting_policy in ('open','standard','closed','custom'));

alter table public.teams drop constraint if exists teams_meeting_content_scope_check;
alter table public.teams add constraint teams_meeting_content_scope_check
  check (meeting_content_scope in ('target','all'));

alter table public.teams drop constraint if exists teams_meeting_response_scope_check;
alter table public.teams add constraint teams_meeting_response_scope_check
  check (meeting_response_scope in ('target','all'));

alter table public.teams drop constraint if exists teams_meeting_alia_scope_check;
alter table public.teams add constraint teams_meeting_alia_scope_check
  check (meeting_alia_scope in ('target','all'));

notify pgrst, 'reload schema';
