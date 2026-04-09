-- =============================================================================
-- REINICIO TOTAL DEL ESQUEMA public (Supabase)
-- =============================================================================
-- Qué hace:
--   - Borra TODAS las tablas, vistas, funciones, tipos, enums y políticas RLS
--     que vivían en el esquema public (tu aplicación).
-- Qué NO toca:
--   - Esquemas internos: auth, storage, extensions, realtime, etc.
--
-- ANTES DE EJECUTAR:
--   1. Haz un backup si hay datos que quieras conservar.
--   2. Si usaste extensiones cuyos objetos vivían en public (poco habitual en
--      proyectos nuevos), tendrás que volver a activarlas desde
--      Database → Extensions.
--   3. Tras esto, vuelve a ejecutar tu migration de la app, por ejemplo:
--      supabase/migrations/001_booking_admin.sql
--
-- Dónde ejecutarlo: Supabase → SQL Editor → pegar → Run
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Eliminar por completo el esquema public y todo lo que contiene
-- -----------------------------------------------------------------------------
DROP SCHEMA IF EXISTS public CASCADE;

-- -----------------------------------------------------------------------------
-- 2) Recrear esquema vacío
-- -----------------------------------------------------------------------------
CREATE SCHEMA public;

-- -----------------------------------------------------------------------------
-- 3) Permisos que Supabase suele esperar en public (para anon / authenticated / service_role)
-- -----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

-- =============================================================================
-- OPCIONAL — vaciar usuarios de Auth (solo si quieres “login desde cero”)
-- =============================================================================
-- En muchos proyectos es más seguro hacerlo en:
--   Dashboard → Authentication → Users (borrar a mano o desactivar proveedores).
--
-- Si tu proyecto permite borrar desde SQL y quieres intentarlo, descomenta UNA
-- de las siguientes líneas (la que funcione en tu instancia):
--
-- DELETE FROM auth.users;
--
-- Si DELETE falla por FKs, prueba primero tablas relacionadas (orden puede variar):
-- TRUNCATE auth.refresh_tokens, auth.sessions, auth.mfa_factors, auth.identities CASCADE;
-- (No ejecutes truncates a ciegas en producción sin revisar la doc de tu versión.)

-- =============================================================================
-- OPCIONAL — Storage
-- =============================================================================
-- Los buckets y archivos no se borran con el DROP de public.
-- Vacía o elimina buckets en: Dashboard → Storage.

-- =============================================================================
-- Siguiente paso
-- =============================================================================
-- Ejecuta de nuevo el SQL de tu app, por ejemplo:
--   supabase/migrations/001_booking_admin.sql
-- Luego crea usuario en Auth y:
--   insert into public.admin_allowlist (email) values ('tu@correo.com');
