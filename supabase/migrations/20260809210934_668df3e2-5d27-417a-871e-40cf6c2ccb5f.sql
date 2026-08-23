ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS einvoice_username varchar NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS einvoice_password varchar NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS einvoice_alias varchar NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS edoc_credits integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id uuid PRIMARY KEY,
  email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL ON public.platform_admins TO service_role;

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform admin reads own row"
ON public.platform_admins FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = _user_id)
$$;

CREATE POLICY "super admin reads all companies"
ON public.companies FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "super admin updates all companies"
ON public.companies FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));