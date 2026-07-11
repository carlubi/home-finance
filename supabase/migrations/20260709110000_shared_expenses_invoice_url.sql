-- Permite guardar un enlace de factura/comprobante además del archivo subido.
alter table public.shared_expenses
  add column if not exists invoice_url text;
