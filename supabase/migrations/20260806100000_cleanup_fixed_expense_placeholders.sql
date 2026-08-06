-- El onboarding guardaba tipos de gastos fijos sin importe.
-- Esas filas no son automatizaciones recurrentes válidas.

delete from public.fixed_expenses
where amount is null;
