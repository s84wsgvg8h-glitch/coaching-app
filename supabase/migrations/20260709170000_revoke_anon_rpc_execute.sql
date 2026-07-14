-- Revoke anonymous execute on sensitive SECURITY DEFINER RPCs.
-- Keep invite/signup validators callable before authentication.

revoke execute on function public.archive_athlete_for_coach(uuid) from anon;
revoke execute on function public.can_access_message(uuid) from anon;
revoke execute on function public.can_access_poll(uuid) from anon;
revoke execute on function public.can_access_program_block(uuid) from anon;
revoke execute on function public.can_access_program_day(uuid) from anon;
revoke execute on function public.can_access_program_exercise(uuid) from anon;
revoke execute on function public.can_access_program_week(uuid) from anon;
revoke execute on function public.can_create_program_for_athlete(uuid) from anon;
revoke execute on function public.can_send_group_message(uuid) from anon;
revoke execute on function public.can_write_program_block(uuid) from anon;
revoke execute on function public.can_write_program_day(uuid) from anon;
revoke execute on function public.can_write_program_exercise(uuid) from anon;
revoke execute on function public.can_write_program_week(uuid) from anon;
revoke execute on function public.create_program_block_for_athlete(uuid, text, text, date, uuid) from anon;
revoke execute on function public.duplicate_program_week(uuid, uuid, integer, text) from anon;
revoke execute on function public.get_my_coach_id() from anon;
revoke execute on function public.get_my_organization_id() from anon;
revoke execute on function public.get_my_profile() from anon;
revoke execute on function public.handle_auth_user_created() from anon;
revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_chat_group_admin(uuid) from anon;
revoke execute on function public.is_chat_group_creator(uuid) from anon;
revoke execute on function public.is_chat_group_member(uuid) from anon;
revoke execute on function public.is_chat_peer_blocked(uuid, uuid) from anon;
revoke execute on function public.is_coach() from anon;
revoke execute on function public.is_coach_or_admin() from anon;
revoke execute on function public.restore_athlete_for_coach(uuid) from anon;
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.sync_athlete_org_from_coach(uuid, uuid) from anon;

-- Signup / invite flows (idempotent re-grant)
grant execute on function public.validate_coach_invite_token(text) to anon, authenticated;
grant execute on function public.validate_coach_signup_token(text) to anon, authenticated;
grant execute on function public.validate_admin_platform_invite(text) to anon, authenticated;
grant execute on function public.get_coach_invite_details(text) to anon, authenticated;
grant execute on function public.register_athlete_via_invite(uuid, text, text) to anon, authenticated;
