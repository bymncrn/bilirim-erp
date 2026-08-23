ALTER TABLE public.e_documents
  ADD COLUMN IF NOT EXISTS scenario varchar NOT NULL DEFAULT 'Temel Fatura',
  ADD COLUMN IF NOT EXISTS invoice_type varchar NOT NULL DEFAULT 'Satış',
  ADD COLUMN IF NOT EXISTS buyer_tax_no varchar NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS buyer_tax_office varchar NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS buyer_city varchar NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS buyer_district varchar NOT NULL DEFAULT '';

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS scenario varchar NOT NULL DEFAULT 'Temel Fatura',
  ADD COLUMN IF NOT EXISTS invoice_type varchar NOT NULL DEFAULT 'Satış',
  ADD COLUMN IF NOT EXISTS buyer_tax_no varchar NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS buyer_tax_office varchar NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS buyer_city varchar NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS buyer_district varchar NOT NULL DEFAULT '';