-- TEAM Theory v0.54.3
-- マイプロフィール保存用RPCの作成・再作成
-- 本人が変更できる項目だけを更新し、role / captain_role は変更しません。

-- 旧本人更新ポリシーが残っている場合は削除します。
drop policy if exists "users can update own membership" on public.team_members;
drop policy if exists "users can update own profile" on public.team_members;

-- 同じシグネチャの旧関数が存在する場合でも、安全に作り直します。
drop function if exists public.update_my_team_profile(uuid, text, text, text, text, text);

create function public.update_my_team_profile(
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
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  update public.team_members
  set display_name = coalesce(nullif(trim(p_display_name), ''), display_name),
      position = coalesce(nullif(trim(p_position), ''), '未設定'),
      grade = coalesce(nullif(trim(p_grade), ''), '未設定'),
      number = coalesce(trim(p_number), ''),
      dominant_hand = coalesce(nullif(trim(p_dominant_hand), ''), '未設定'),
      updated_at = now()
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

revoke all on function public.update_my_team_profile(uuid, text, text, text, text, text) from public;
grant execute on function public.update_my_team_profile(uuid, text, text, text, text, text) to authenticated;

-- PostgRESTへ関数追加を即時反映させます。
notify pgrst, 'reload schema';
