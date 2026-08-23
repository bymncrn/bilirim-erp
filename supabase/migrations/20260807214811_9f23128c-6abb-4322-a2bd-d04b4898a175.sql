CREATE TABLE public.e_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id varchar NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  no varchar NOT NULL,
  kind varchar NOT NULL,
  direction varchar NOT NULL,
  account_name varchar NOT NULL DEFAULT '',
  doc_date date NOT NULL DEFAULT current_date,
  base double precision NOT NULL DEFAULT 0,
  vat double precision NOT NULL DEFAULT 0,
  total double precision NOT NULL DEFAULT 0,
  status varchar NOT NULL DEFAULT 'Taslak',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.e_documents TO authenticated;
GRANT ALL ON public.e_documents TO service_role;
ALTER TABLE public.e_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company members manage e_documents" ON public.e_documents FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id varchar NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title varchar NOT NULL,
  category varchar NOT NULL DEFAULT 'Diğer',
  amount double precision NOT NULL DEFAULT 0,
  account_name varchar NOT NULL DEFAULT '',
  expense_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company members manage expenses" ON public.expenses FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());
