ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'muhasebe';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'kasiyer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'garson';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'teknik_servis';

ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS company_id character varying;
UPDATE public.user_roles ur SET company_id = p.company_id FROM public.profiles p WHERE p.id = ur.user_id AND ur.company_id IS NULL;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;

CREATE POLICY "user_roles_select_own_or_company_admin" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'admin')));

CREATE POLICY "user_roles_admin_insert" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_admin_update" ON public.user_roles
FOR UPDATE TO authenticated
USING (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_admin_delete" ON public.user_roles
FOR DELETE TO authenticated
USING (company_id = public.current_company_id() AND public.has_role(auth.uid(), 'admin') AND user_id <> auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id character varying NOT NULL REFERENCES public.companies(id),
  user_id uuid,
  user_name text NOT NULL DEFAULT '',
  action text NOT NULL,
  summary text NOT NULL DEFAULT '',
  entity text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select_company" ON public.audit_logs
FOR SELECT TO authenticated
USING (company_id = public.current_company_id());

CREATE POLICY "audit_logs_insert_company" ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (company_id = public.current_company_id() AND (user_id IS NULL OR user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS audit_logs_company_created_idx ON public.audit_logs (company_id, created_at DESC);