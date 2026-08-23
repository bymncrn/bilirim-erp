ALTER TABLE public.pdks_staff ADD COLUMN IF NOT EXISTS device_id text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.pdks_punch_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id character varying NOT NULL REFERENCES public.companies(id),
  staff_id uuid NOT NULL,
  ip text NOT NULL DEFAULT '',
  method text NOT NULL DEFAULT 'QR',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pdks_punch_log TO authenticated;
GRANT ALL ON public.pdks_punch_log TO service_role;

ALTER TABLE public.pdks_punch_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view punch logs"
ON public.pdks_punch_log FOR SELECT TO authenticated
USING (company_id = public.current_company_id());

CREATE INDEX IF NOT EXISTS pdks_punch_log_ip_created_idx ON public.pdks_punch_log (ip, created_at DESC);