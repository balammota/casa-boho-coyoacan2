-- Guest-uploaded documents per reservation (private bucket + metadata).

-- 4 MiB: compatible con límite típico de body en Vercel/Next.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'guest-documents',
  'guest-documents',
  false,
  4194304,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS public.guest_reservation_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations (id) ON DELETE CASCADE,
  guest_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  original_filename text NOT NULL,
  mime_type text NOT NULL,
  file_size bigint NOT NULL CHECK (file_size > 0 AND file_size <= 4194304),
  document_category text NOT NULL
    CHECK (
      document_category IN (
        'official_id',
        'passport',
        'income_proof',
        'other'
      )
    ),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guest_res_docs_reservation
  ON public.guest_reservation_documents (reservation_id);

CREATE INDEX IF NOT EXISTS idx_guest_res_docs_guest
  ON public.guest_reservation_documents (guest_user_id);

ALTER TABLE public.guest_reservation_documents ENABLE ROW LEVEL SECURITY;
