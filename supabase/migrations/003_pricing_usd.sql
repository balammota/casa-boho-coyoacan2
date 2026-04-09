-- Tarifas en USD (sitio en inglés). Enteros, mismo criterio que MXN.
alter table public.pricing_settings
  add column if not exists night_rate_usd integer not null default 55,
  add column if not exists week_rate_usd integer not null default 300,
  add column if not exists month_rate_usd integer not null default 1100;

comment on column public.pricing_settings.night_rate_usd is 'Nightly rate USD (English site)';
comment on column public.pricing_settings.week_rate_usd is '7-night block USD';
comment on column public.pricing_settings.month_rate_usd is '30-night block USD';
