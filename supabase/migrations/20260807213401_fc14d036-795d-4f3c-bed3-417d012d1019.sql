-- 0. temizlik: tüm demo veriler
TRUNCATE TABLE public.stock_movements, public.invoice_lines, public.payments, public.invoices,
  public.service_tickets, public.account_txns, public.instruments, public.financial_accounts,
  public.products, public.cariler, public.employees, public.counters, public.users, public.companies CASCADE;

-- 1. companies varsayılanları + abonelik
ALTER TABLE public.companies
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::varchar,
  ALTER COLUMN default_currency SET DEFAULT 'TRY',
  ALTER COLUMN default_vat SET DEFAULT 20,
  ALTER COLUMN primary_color SET DEFAULT '#16a34a',
  ALTER COLUMN invoice_footer SET DEFAULT '',
  ALTER COLUMN quote_terms_default SET DEFAULT '',
  ALTER COLUMN signature_enabled SET DEFAULT false,
  ALTER COLUMN smtp_host SET DEFAULT '',
  ALTER COLUMN smtp_port SET DEFAULT 587,
  ALTER COLUMN smtp_user SET DEFAULT '',
  ALTER COLUMN smtp_password SET DEFAULT '',
  ALTER COLUMN smtp_from SET DEFAULT '',
  ALTER COLUMN smtp_tls SET DEFAULT true,
  ALTER COLUMN notifications_enabled SET DEFAULT true,
  ALTER COLUMN notification_emails SET DEFAULT '{}',
  ALTER COLUMN notify_invoice SET DEFAULT true,
  ALTER COLUMN notify_payment SET DEFAULT true,
  ALTER COLUMN notify_service_new SET DEFAULT true,
  ALTER COLUMN notify_service_update SET DEFAULT true,
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS plan varchar NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS modules text[] NOT NULL DEFAULT '{muhasebe,pos,adisyon,servis,panel}';

-- 2. products ek alanlar + varsayılanlar
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS barcode varchar NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS category varchar NOT NULL DEFAULT 'Genel',
  ADD COLUMN IF NOT EXISTS color varchar NOT NULL DEFAULT 'apple',
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::varchar,
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.cariler ALTER COLUMN id SET DEFAULT gen_random_uuid()::varchar, ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.financial_accounts ALTER COLUMN id SET DEFAULT gen_random_uuid()::varchar, ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.invoices ALTER COLUMN id SET DEFAULT gen_random_uuid()::varchar, ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.invoice_lines ALTER COLUMN id SET DEFAULT gen_random_uuid()::varchar;
ALTER TABLE public.payments ALTER COLUMN id SET DEFAULT gen_random_uuid()::varchar, ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.service_tickets ALTER COLUMN id SET DEFAULT gen_random_uuid()::varchar, ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.account_txns ALTER COLUMN id SET DEFAULT gen_random_uuid()::varchar, ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.stock_movements ALTER COLUMN id SET DEFAULT gen_random_uuid()::varchar;
ALTER TABLE public.employees ALTER COLUMN id SET DEFAULT gen_random_uuid()::varchar, ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.instruments ALTER COLUMN id SET DEFAULT gen_random_uuid()::varchar, ALTER COLUMN created_at SET DEFAULT now();

-- 3. profiller ve roller
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id varchar NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','manager','staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS varchar LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR company_id = public.current_company_id());
CREATE POLICY "own profile write" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 4. kayıt tetikleyicisi: şirket + profil + admin rolü
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_company varchar;
BEGIN
  INSERT INTO public.companies (name, email)
  VALUES (COALESCE(NULLIF(NEW.raw_user_meta_data->>'company_name',''), 'İşletmem'), NEW.email)
  RETURNING id INTO new_company;

  INSERT INTO public.profiles (id, company_id, full_name, email)
  VALUES (NEW.id, new_company, COALESCE(NEW.raw_user_meta_data->>'full_name',''), COALESCE(NEW.email,''));

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. yeni tablolar
CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id varchar NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name varchar NOT NULL,
  color varchar NOT NULL DEFAULT 'apple',
  icon varchar NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_categories TO authenticated;
GRANT ALL ON public.product_categories TO service_role;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.dining_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id varchar NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name varchar NOT NULL,
  area varchar NOT NULL DEFAULT 'Salon',
  status varchar NOT NULL DEFAULT 'empty',
  waiter varchar NOT NULL DEFAULT '',
  opened_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dining_tables TO authenticated;
GRANT ALL ON public.dining_tables TO service_role;
ALTER TABLE public.dining_tables ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.table_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id varchar NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES public.dining_tables(id) ON DELETE CASCADE,
  product_id varchar,
  name varchar NOT NULL,
  price double precision NOT NULL DEFAULT 0,
  qty double precision NOT NULL DEFAULT 1,
  note text NOT NULL DEFAULT '',
  status varchar NOT NULL DEFAULT 'Bekliyor',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.table_order_items TO authenticated;
GRANT ALL ON public.table_order_items TO service_role;
ALTER TABLE public.table_order_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id varchar NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name varchar NOT NULL,
  email varchar NOT NULL DEFAULT '',
  role varchar NOT NULL DEFAULT 'Kasiyer',
  pin varchar NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  perms text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_members TO authenticated;
GRANT ALL ON public.staff_members TO service_role;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.cash_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id varchar NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  account_name varchar NOT NULL DEFAULT '',
  amount double precision NOT NULL DEFAULT 0,
  source varchar NOT NULL DEFAULT 'pos',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_entries TO authenticated;
GRANT ALL ON public.cash_entries TO service_role;
ALTER TABLE public.cash_entries ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.dayend_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id varchar NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  report_date date NOT NULL DEFAULT current_date,
  payload jsonb NOT NULL DEFAULT '{}',
  total double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dayend_reports TO authenticated;
GRANT ALL ON public.dayend_reports TO service_role;
ALTER TABLE public.dayend_reports ENABLE ROW LEVEL SECURITY;

-- 6. şirket bazlı RLS: tüm iş tabloları
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'products','cariler','financial_accounts','invoices','payments','service_tickets',
    'account_txns','stock_movements','employees','instruments','counters',
    'product_categories','dining_tables','table_order_items','staff_members','cash_entries','dayend_reports'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format($f$CREATE POLICY "company scope" ON public.%I FOR ALL TO authenticated
      USING (company_id = public.current_company_id())
      WITH CHECK (company_id = public.current_company_id())$f$, t);
  END LOOP;
END $$;

GRANT USAGE, SELECT ON SEQUENCE public.counters_id_seq TO authenticated;

-- companies kendi kaydı
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
CREATE POLICY "own company" ON public.companies FOR SELECT TO authenticated
  USING (id = public.current_company_id());
CREATE POLICY "own company update" ON public.companies FOR UPDATE TO authenticated
  USING (id = public.current_company_id()) WITH CHECK (id = public.current_company_id());

-- invoice_lines fatura üzerinden
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_lines TO authenticated;
GRANT ALL ON public.invoice_lines TO service_role;
CREATE POLICY "company scope lines" ON public.invoice_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.company_id = public.current_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.company_id = public.current_company_id()));

-- users tablosu artık kullanılmıyor
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;