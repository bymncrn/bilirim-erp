ALTER TABLE public.pdks_sites
  ADD COLUMN IF NOT EXISTS work_start text NOT NULL DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS work_end text NOT NULL DEFAULT '18:00';

CREATE TABLE IF NOT EXISTS public.pdks_leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id varchar NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.pdks_staff(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  kind text NOT NULL DEFAULT 'Yıllık İzin',
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdks_leaves TO authenticated;
GRANT ALL ON public.pdks_leaves TO service_role;

ALTER TABLE public.pdks_leaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members manage pdks leaves"
ON public.pdks_leaves FOR ALL TO authenticated
USING (company_id = public.current_company_id())
WITH CHECK (company_id = public.current_company_id());

CREATE INDEX IF NOT EXISTS pdks_leaves_company_dates_idx
  ON public.pdks_leaves (company_id, start_date, end_date);

CREATE TRIGGER update_pdks_leaves_updated_at
BEFORE UPDATE ON public.pdks_leaves
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();