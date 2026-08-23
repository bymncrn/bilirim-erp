CREATE TABLE public.pdks_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id varchar NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT '',
  branch text NOT NULL DEFAULT '',
  pin text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdks_staff TO authenticated;
GRANT ALL ON public.pdks_staff TO service_role;
ALTER TABLE public.pdks_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company scope" ON public.pdks_staff FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

CREATE TABLE public.pdks_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id varchar NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  coords text NOT NULL DEFAULT '',
  radius double precision NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdks_sites TO authenticated;
GRANT ALL ON public.pdks_sites TO service_role;
ALTER TABLE public.pdks_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company scope" ON public.pdks_sites FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());