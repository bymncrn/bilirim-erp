ALTER TABLE public.pdks_staff
  ADD COLUMN IF NOT EXISTS hire_date date,
  ADD COLUMN IF NOT EXISTS exit_date date,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS documents jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.pdks_sites
  ADD COLUMN IF NOT EXISTS break_minutes integer NOT NULL DEFAULT 0;

ALTER TABLE public.pdks_leaves
  ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.pdks_overtime_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id character varying NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.pdks_staff(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, work_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdks_overtime_approvals TO authenticated;
GRANT ALL ON public.pdks_overtime_approvals TO service_role;

ALTER TABLE public.pdks_overtime_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members manage overtime approvals"
ON public.pdks_overtime_approvals FOR ALL TO authenticated
USING (company_id = public.current_company_id())
WITH CHECK (company_id = public.current_company_id());

CREATE TRIGGER update_pdks_overtime_approvals_updated_at
BEFORE UPDATE ON public.pdks_overtime_approvals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();