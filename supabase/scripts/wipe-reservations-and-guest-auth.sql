-- =============================================================================
-- Borrar reservaciones + datos relacionados + usuarios de Auth (huéspedes)
-- =============================================================================
-- Qué hace:
--   1) Vacía archivos del bucket Storage `guest-documents`.
--   2) Borra todas las filas de `public.reservations` (CASCADE elimina en una
--      sola operación: contracts, payments, deposits, guest_reservation_documents).
--   3) Borra en `auth.users` a quienes NO estén en `public.admin_allowlist`
--      (comparación por email en minúsculas). Las filas de `public.users`
--      se eliminan en cascada al borrar el usuario en Auth.
--
-- Qué NO toca:
--   - pricing_settings, blocked_date_ranges, admin_allowlist, migraciones, etc.
--
-- ANTES DE EJECUTAR:
--   - Confirma que TODOS los correos de administrador que quieras conservar
--     existen en: SELECT * FROM public.admin_allowlist;
--   - Haz backup si hay algo que no quieras perder (irreversible).
--
-- Dónde: Supabase → SQL Editor → Run (rol con permisos suficientes; suele ser postgres).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Storage: quitar objetos del bucket de documentos de huéspedes
-- -----------------------------------------------------------------------------
DELETE FROM storage.objects
WHERE bucket_id = 'guest-documents';

-- -----------------------------------------------------------------------------
-- 2) Reservaciones (CASCADE a hijas del booking)
-- -----------------------------------------------------------------------------
DELETE FROM public.reservations;

-- -----------------------------------------------------------------------------
-- 3) Auth: conservar solo usuarios cuyo email está en la lista de admins
-- -----------------------------------------------------------------------------
DELETE FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1
  FROM public.admin_allowlist a
  WHERE lower(trim(a.email)) = lower(trim(au.email))
);

-- =============================================================================
-- OPCIÓN NUCLEAR (solo desarrollo): borrar TODOS los usuarios de Auth
-- =============================================================================
-- Te dejará sin sesión de admin hasta que vuelvas a crear usuario en el
-- Dashboard y reinsertes su email en admin_allowlist. NO uses en producción.
--
-- -- DELETE FROM public.reservations;  -- si no corriste el bloque de arriba
-- -- DELETE FROM storage.objects WHERE bucket_id = 'guest-documents';
-- DELETE FROM auth.users;
