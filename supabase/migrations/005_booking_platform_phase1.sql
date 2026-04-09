-- Phase 1 booking platform schema (manual payments + contracts + deposits)

-- Optional profile table for future guest panel.
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  guest_user_id uuid references auth.users(id) on delete set null,
  guest_name text not null,
  guest_email text not null,
  guest_phone text not null,
  check_in date not null,
  check_out date not null,
  nights integer not null check (nights >= 1),
  guests integer not null check (guests >= 1 and guests <= 20),
  currency text not null check (currency in ('MXN', 'USD')),
  total_amount integer not null check (total_amount >= 0),
  cleaning_fee integer not null default 0 check (cleaning_fee >= 0),
  stay_type text not null check (stay_type in ('short_stay', 'long_stay')),
  contract_type text not null check (contract_type in ('short_stay_contract', 'long_stay_contract')),
  booking_status text not null default 'pending_payment'
    check (booking_status in ('pending_payment', 'confirmed', 'cancelled', 'completed')),
  payment_status text not null default 'pending_payment'
    check (payment_status in ('pending_payment', 'confirmed', 'cancelled', 'completed')),
  deposit_amount integer not null default 0 check (deposit_amount >= 0),
  contract_accepted_at timestamptz,
  payment_instructions text,
  checkin_instructions text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservations_date_order check (check_in < check_out)
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  contract_type text not null check (contract_type in ('short_stay_contract', 'long_stay_contract')),
  accepted boolean not null default false,
  accepted_at timestamptz,
  content text not null,
  pdf_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reservation_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  method text not null check (method in ('bank_transfer', 'cash_payment')),
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'confirmed', 'cancelled', 'completed')),
  amount integer not null check (amount >= 0),
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deposits (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  amount integer not null check (amount >= 0),
  status text not null default 'received'
    check (status in ('received', 'returned', 'partially_withheld')),
  withheld_amount integer not null default 0 check (withheld_amount >= 0),
  received_at timestamptz,
  returned_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reservation_id)
);

create index if not exists idx_reservations_status on public.reservations(booking_status);
create index if not exists idx_reservations_payment_status on public.reservations(payment_status);
create index if not exists idx_reservations_checkin_checkout on public.reservations(check_in, check_out);
create index if not exists idx_reservations_created_at on public.reservations(created_at desc);
create index if not exists idx_contracts_reservation_id on public.contracts(reservation_id);
create index if not exists idx_payments_reservation_id on public.payments(reservation_id);
create index if not exists idx_deposits_reservation_id on public.deposits(reservation_id);

alter table public.users enable row level security;
alter table public.reservations enable row level security;
alter table public.contracts enable row level security;
alter table public.payments enable row level security;
alter table public.deposits enable row level security;

-- Guest can view/update own profile.
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'users_select_own') then
    create policy "users_select_own" on public.users
      for select to authenticated
      using (id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'users_update_own') then
    create policy "users_update_own" on public.users
      for update to authenticated
      using (id = auth.uid())
      with check (id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'users_insert_own') then
    create policy "users_insert_own" on public.users
      for insert to authenticated
      with check (id = auth.uid());
  end if;
end $$;

-- Public can create reservation requests, but cannot read all data.
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'reservations_public_insert') then
    create policy "reservations_public_insert" on public.reservations
      for insert to anon, authenticated
      with check (true);
  end if;
end $$;

-- Guests can read own reservations by linked auth user.
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'reservations_guest_select_own') then
    create policy "reservations_guest_select_own" on public.reservations
      for select to authenticated
      using (guest_user_id = auth.uid());
  end if;
end $$;

-- Admin full access based on allowlist.
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'reservations_admin_all') then
    create policy "reservations_admin_all" on public.reservations
      for all to authenticated
      using (exists (
        select 1 from public.admin_allowlist a
        where a.email = auth.jwt()->>'email'
      ))
      with check (exists (
        select 1 from public.admin_allowlist a
        where a.email = auth.jwt()->>'email'
      ));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'contracts_admin_all') then
    create policy "contracts_admin_all" on public.contracts
      for all to authenticated
      using (exists (
        select 1 from public.admin_allowlist a
        where a.email = auth.jwt()->>'email'
      ))
      with check (exists (
        select 1 from public.admin_allowlist a
        where a.email = auth.jwt()->>'email'
      ));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'payments_admin_all') then
    create policy "payments_admin_all" on public.payments
      for all to authenticated
      using (exists (
        select 1 from public.admin_allowlist a
        where a.email = auth.jwt()->>'email'
      ))
      with check (exists (
        select 1 from public.admin_allowlist a
        where a.email = auth.jwt()->>'email'
      ));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'deposits_admin_all') then
    create policy "deposits_admin_all" on public.deposits
      for all to authenticated
      using (exists (
        select 1 from public.admin_allowlist a
        where a.email = auth.jwt()->>'email'
      ))
      with check (exists (
        select 1 from public.admin_allowlist a
        where a.email = auth.jwt()->>'email'
      ));
  end if;
end $$;

-- Basic read policies for linked guest on child tables.
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'contracts_guest_select_own') then
    create policy "contracts_guest_select_own" on public.contracts
      for select to authenticated
      using (
        exists (
          select 1 from public.reservations r
          where r.id = reservation_id and r.guest_user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'payments_guest_select_own') then
    create policy "payments_guest_select_own" on public.payments
      for select to authenticated
      using (
        exists (
          select 1 from public.reservations r
          where r.id = reservation_id and r.guest_user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'deposits_guest_select_own') then
    create policy "deposits_guest_select_own" on public.deposits
      for select to authenticated
      using (
        exists (
          select 1 from public.reservations r
          where r.id = reservation_id and r.guest_user_id = auth.uid()
        )
      );
  end if;
end $$;
