CREATE TABLE public.subscription_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id varchar NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_name text NOT NULL DEFAULT '',
  created_by uuid,
  module text NOT NULL DEFAULT '',
  plan text NOT NULL DEFAULT '',
  period text NOT NULL DEFAULT 'monthly',
  amount double precision NOT NULL DEFAULT 0,
  sender_name text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_orders TO authenticated;
GRANT ALL ON public.subscription_orders TO service_role;

ALTER TABLE public.subscription_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members read own orders"
ON public.subscription_orders FOR SELECT TO authenticated
USING (company_id = public.current_company_id() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Company members create own orders"
ON public.subscription_orders FOR INSERT TO authenticated
WITH CHECK (company_id = public.current_company_id());

CREATE POLICY "Super admins update orders"
ON public.subscription_orders FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER update_subscription_orders_updated_at
BEFORE UPDATE ON public.subscription_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();