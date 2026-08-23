CREATE TABLE public.pdks_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id character varying NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  start_time text NOT NULL DEFAULT '08:00',
  end_time text NOT NULL DEFAULT '16:00',
  break_minutes integer NOT NULL DEFAULT 60,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdks_shifts TO authenticated;
GRANT ALL ON public.pdks_shifts TO service_role;

ALTER TABLE public.pdks_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members manage own shifts"
ON public.pdks_shifts FOR ALL TO authenticated
USING (company_id = public.current_company_id())
WITH CHECK (company_id = public.current_company_id());

CREATE TRIGGER update_pdks_shifts_updated_at
BEFORE UPDATE ON public.pdks_shifts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.pdks_staff ADD COLUMN shift_id uuid REFERENCES public.pdks_shifts(id) ON DELETE SET NULL;