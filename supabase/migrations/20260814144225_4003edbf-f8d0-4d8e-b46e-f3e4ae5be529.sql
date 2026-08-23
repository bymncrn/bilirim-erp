ALTER TABLE public.pdks_sites ADD COLUMN IF NOT EXISTS schedule jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE public.pdks_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id character varying NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  holiday_date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdks_holidays TO authenticated;
GRANT ALL ON public.pdks_holidays TO service_role;

ALTER TABLE public.pdks_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members manage holidays"
ON public.pdks_holidays FOR ALL TO authenticated
USING (company_id = public.current_company_id())
WITH CHECK (company_id = public.current_company_id());

CREATE TRIGGER update_pdks_holidays_updated_at
BEFORE UPDATE ON public.pdks_holidays
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();