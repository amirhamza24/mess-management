-- One-time cleanup for databases where the earlier Supabase-auth version of
-- MessHisab (supabase/migrations/20261002000000_init.sql) was installed.
-- It removes those tables, functions, triggers and types so `prisma db push`
-- can create the new schema. Run it once in the Supabase SQL Editor.
-- ⚠ Deletes all data stored by the old version.

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_confirmed on auth.users;

drop table if exists
  public.meals,
  public.food_expenses,
  public.payments,
  public.house_rents,
  public.other_expenses,
  public.monthly_members,
  public.monthly_cycles,
  public.mess_members,
  public.messes,
  public.profiles
cascade;

drop function if exists
  public.set_updated_at(),
  public.is_mess_member(uuid),
  public.is_mess_manager(uuid),
  public.cycle_mess_id(uuid),
  public.my_member_id_for_cycle(uuid),
  public.guard_cycle_row(),
  public.guard_last_manager(),
  public.link_members_for_user(uuid, text),
  public.handle_new_user(),
  public.handle_user_confirmed(),
  public.guard_and_link_member(),
  public.create_mess(text, text),
  public.get_mess_roster(uuid),
  public.start_month(uuid, int, int, uuid[], numeric),
  public.add_member_to_month(uuid, uuid, numeric),
  public.set_month_status(uuid, public.cycle_status),
  public.get_cycle_summary(uuid)
cascade;

drop type if exists
  public.member_role,
  public.member_status,
  public.cycle_status,
  public.monthly_member_status,
  public.payment_method,
  public.payment_purpose,
  public.food_category,
  public.other_expense_category
cascade;
