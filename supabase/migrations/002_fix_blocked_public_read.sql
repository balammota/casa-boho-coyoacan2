-- Arregla calendario público vacío: /api/booking-data usa la clave ANON (rol anon).
-- Sin GRANT + política SELECT para anon, las filas existen pero la API devuelve [].

-- Permisos de lectura pública (anon) y sesión de usuario (authenticated)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.pricing_settings TO anon, authenticated;
GRANT SELECT ON public.blocked_date_ranges TO anon, authenticated;

-- Escritura admin (panel con usuario logueado)
GRANT INSERT, DELETE ON public.blocked_date_ranges TO authenticated;
GRANT UPDATE ON public.pricing_settings TO authenticated;

ALTER TABLE public.blocked_date_ranges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_blocked" ON public.blocked_date_ranges;

CREATE POLICY "public_read_blocked"
  ON public.blocked_date_ranges
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Por si la tabla de tarifas quedó sin política o permisos
ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_pricing" ON public.pricing_settings;

CREATE POLICY "public_read_pricing"
  ON public.pricing_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);
