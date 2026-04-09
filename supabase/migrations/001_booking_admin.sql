-- Casa Boho: tarifas, bloqueos y lista de administradores.
-- Ejecuta esto en Supabase → SQL Editor (o con CLI supabase db push).

-- Tarifas (una sola fila id = 1)
create table if not exists public.pricing_settings (
  id integer primary key default 1 check (id = 1),
  night_rate integer not null,
  week_rate integer not null,
  month_rate integer not null,
  updated_at timestamptz not null default now()
);

insert into public.pricing_settings (id, night_rate, week_rate, month_rate)
values (1, 1000, 5500, 20000)
on conflict (id) do nothing;

-- Rangos bloqueados (fechas inclusivas en calendario)
create table if not exists public.blocked_date_ranges (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  note text,
  created_at timestamptz not null default now(),
  constraint blocked_dates_order check (start_date <= end_date)
);

-- Correos con acceso al panel /admin (añade el tuyo tras crear el usuario en Auth)
create table if not exists public.admin_allowlist (
  email text primary key
);

alter table public.pricing_settings enable row level security;
alter table public.blocked_date_ranges enable row level security;
alter table public.admin_allowlist enable row level security;

-- Lectura pública (sitio + /api/booking-data con anon)
create policy "public_read_pricing"
  on public.pricing_settings for select
  to anon, authenticated
  using (true);

create policy "public_read_blocked"
  on public.blocked_date_ranges for select
  to anon, authenticated
  using (true);

-- Solo admins en allowlist pueden escribir
create policy "allowlisted_update_pricing"
  on public.pricing_settings for update
  to authenticated
  using (
    exists (
      select 1 from public.admin_allowlist a
      where a.email = (auth.jwt() ->> 'email')
    )
  )
  with check (true);

create policy "allowlisted_insert_blocked"
  on public.blocked_date_ranges for insert
  to authenticated
  with check (
    exists (
      select 1 from public.admin_allowlist a
      where a.email = (auth.jwt() ->> 'email')
    )
  );

create policy "allowlisted_delete_blocked"
  on public.blocked_date_ranges for delete
  to authenticated
  using (
    exists (
      select 1 from public.admin_allowlist a
      where a.email = (auth.jwt() ->> 'email')
    )
  );

-- El propio usuario puede comprobar si está en la lista (layout /admin)
create policy "allowlisted_read_self"
  on public.admin_allowlist for select
  to authenticated
  using (email = (auth.jwt() ->> 'email'));

-- Permisos API: la clave anon debe poder leer tarifas y bloqueos (sitio + /api/booking-data)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.pricing_settings TO anon, authenticated;
GRANT SELECT ON public.blocked_date_ranges TO anon, authenticated;
GRANT INSERT, DELETE ON public.blocked_date_ranges TO authenticated;
GRANT UPDATE ON public.pricing_settings TO authenticated;

-- Tras crear el usuario en Authentication → Users, ejecuta (sustituye el correo):
-- insert into public.admin_allowlist (email) values ('tu@correo.com');
