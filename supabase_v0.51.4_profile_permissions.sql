-- TEAM Theory v0.51.4
-- 招待参加者が自分の役割を変更できないよう、本人更新を許可項目限定のRPCへ移行します。

-- 旧ポリシーは role / captain_role まで本人が直接変更できるため削除します。
drop policy if exists "users can update own membership" on public.team_members;

create or replace function public.update_my_team_profile(
  p_team_id uuid,
  p_display_name text,
  p_position text,
  p_grade text,
  p_number text default '',
  p_dominant_hand text default '未設定'
)
returns public.team_members
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row public.team_members;
begin
  update public.team_members
  set display_name = nullif(trim(p_display_name), ''),
      position = coalesce(nullif(trim(p_position), ''), '未設定'),
      grade = coalesce(nullif(trim(p_grade), ''), '未設定'),
      number = coalesce(trim(p_number), ''),
      dominant_hand = coalesce(nullif(trim(p_dominant_hand), ''), '未設定')
  where team_id = p_team_id
    and user_id = auth.uid()
    and status = 'active'
  returning * into updated_row;

  if updated_row.id is null then
    raise exception 'active membership not found';
  end if;

  return updated_row;
end;
$$;

revoke all on function public.update_my_team_profile(uuid,text,text,text,text,text) from public;
grant execute on function public.update_my_team_profile(uuid,text,text,text,text,text) to authenticated;
