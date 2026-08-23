CREATE TABLE public.quotes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id character varying NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  no character varying NOT NULL DEFAULT '',
  cari_id character varying REFERENCES public.cariler(id) ON DELETE SET NULL,
  account_name character varying NOT NULL DEFAULT '',
  quote_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal double precision NOT NULL DEFAULT 0,
  vat_total double precision NOT NULL DEFAULT 0,
  total double precision NOT NULL DEFAULT 0,
  terms text NOT NULL DEFAULT '',
  status character varying NOT NULL DEFAULT 'Taslak',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Şirket kendi tekliflerini yönetir"
ON public.quotes FOR ALL TO authenticated
USING (company_id = public.current_company_id())
WITH CHECK (company_id = public.current_company_id());

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_quotes_updated_at
BEFORE UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();