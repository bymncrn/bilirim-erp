ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz;

UPDATE public.companies SET trial_ends_at = created_at + interval '30 days' WHERE trial_ends_at IS NULL;

ALTER TABLE public.companies ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '30 days');

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE new_company varchar;
BEGIN
  INSERT INTO public.companies (name, email, trial_ends_at)
  VALUES (COALESCE(NULLIF(NEW.raw_user_meta_data->>'company_name',''), 'İşletmem'), NEW.email, now() + interval '30 days')
  RETURNING id INTO new_company;

  INSERT INTO public.profiles (id, company_id, full_name, email)
  VALUES (NEW.id, new_company, COALESCE(NEW.raw_user_meta_data->>'full_name',''), COALESCE(NEW.email,''));

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  RETURN NEW;
END; $function$;