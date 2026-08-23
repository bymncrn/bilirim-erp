ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS onboarding_module text,
  ADD COLUMN IF NOT EXISTS pdks_plan text NOT NULL DEFAULT 'starter';