-- Ya no se usa; las plantillas del contrato largo son PDF externos.

alter table public.reservations
  drop column if exists main_source_of_income;
