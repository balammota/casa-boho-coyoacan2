-- Phase 2: guest portal workflow with draft reservations.

-- Extend booking/payment status enums represented as check constraints.
alter table public.reservations
  drop constraint if exists reservations_booking_status_check;
alter table public.reservations
  add constraint reservations_booking_status_check
  check (booking_status in ('draft', 'pending_payment', 'confirmed', 'cancelled', 'completed'));

alter table public.reservations
  drop constraint if exists reservations_payment_status_check;
alter table public.reservations
  add constraint reservations_payment_status_check
  check (payment_status in ('draft', 'pending_payment', 'confirmed', 'cancelled', 'completed'));

alter table public.payments
  drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check
  check (status in ('draft', 'pending_payment', 'confirmed', 'cancelled', 'completed'));

-- Guest-owned reservation updates for finalize flow.
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'reservations_guest_update_own'
  ) then
    create policy "reservations_guest_update_own" on public.reservations
      for update to authenticated
      using (guest_user_id = auth.uid())
      with check (guest_user_id = auth.uid());
  end if;
end $$;

-- Allow guest to update/read own contract/payment/deposit rows.
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'contracts_guest_update_own'
  ) then
    create policy "contracts_guest_update_own" on public.contracts
      for update to authenticated
      using (
        exists (
          select 1 from public.reservations r
          where r.id = reservation_id and r.guest_user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.reservations r
          where r.id = reservation_id and r.guest_user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'payments_guest_update_own'
  ) then
    create policy "payments_guest_update_own" on public.payments
      for update to authenticated
      using (
        exists (
          select 1 from public.reservations r
          where r.id = reservation_id and r.guest_user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.reservations r
          where r.id = reservation_id and r.guest_user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'payments_guest_insert_own'
  ) then
    create policy "payments_guest_insert_own" on public.payments
      for insert to authenticated
      with check (
        exists (
          select 1 from public.reservations r
          where r.id = reservation_id and r.guest_user_id = auth.uid()
        )
      );
  end if;
end $$;
