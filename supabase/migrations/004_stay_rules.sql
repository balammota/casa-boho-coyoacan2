-- Reglas de estancia configurables desde admin.
alter table public.pricing_settings
  add column if not exists min_stay_nights integer not null default 2,
  add column if not exists block_buffer_before_days integer not null default 1,
  add column if not exists block_buffer_after_days integer not null default 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'pricing_settings_min_stay_nights_check'
  ) then
    alter table public.pricing_settings
      add constraint pricing_settings_min_stay_nights_check
      check (min_stay_nights >= 1);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'pricing_settings_block_buffer_before_days_check'
  ) then
    alter table public.pricing_settings
      add constraint pricing_settings_block_buffer_before_days_check
      check (block_buffer_before_days >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'pricing_settings_block_buffer_after_days_check'
  ) then
    alter table public.pricing_settings
      add constraint pricing_settings_block_buffer_after_days_check
      check (block_buffer_after_days >= 0);
  end if;
end $$;
