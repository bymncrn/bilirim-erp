CREATE TABLE public.user_permissions (
  user_id uuid PRIMARY KEY,
  company_id varchar NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  perms jsonb NOT NULL DEFAULT '{}'::jsonb,
  sales_scope varchar NOT NULL DEFAULT 'all',
  allowed_accounts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kendi yetkisini gorur" ON public.user_permissions
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Yonetici sirket yetkilerini yonetir" ON public.user_permissions
FOR ALL TO authenticated
USING (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();