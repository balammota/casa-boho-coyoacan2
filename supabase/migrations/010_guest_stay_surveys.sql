-- Post-stay guest satisfaction (5 questions). Filled via public /survey/[public_id] after stay marked completed.

CREATE TABLE IF NOT EXISTS public.guest_stay_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations (id) ON DELETE CASCADE,
  public_id text NOT NULL,
  rating_overall smallint NOT NULL
    CHECK (rating_overall >= 1 AND rating_overall <= 5),
  rating_clean smallint NOT NULL
    CHECK (rating_clean >= 1 AND rating_clean <= 5),
  rating_comfort smallint NOT NULL
    CHECK (rating_comfort >= 1 AND rating_comfort <= 5),
  rating_recommend smallint NOT NULL
    CHECK (rating_recommend >= 1 AND rating_recommend <= 5),
  comments text NOT NULL DEFAULT ''::text,
  consent_publish boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guest_stay_surveys_comments_len CHECK (char_length(comments) <= 4000),
  CONSTRAINT guest_stay_surveys_one_per_reservation UNIQUE (reservation_id)
);

CREATE INDEX IF NOT EXISTS idx_guest_stay_surveys_public_id
  ON public.guest_stay_surveys (public_id);

CREATE INDEX IF NOT EXISTS idx_guest_stay_surveys_created_at
  ON public.guest_stay_surveys (created_at DESC);

ALTER TABLE public.guest_stay_surveys ENABLE ROW LEVEL SECURITY;
