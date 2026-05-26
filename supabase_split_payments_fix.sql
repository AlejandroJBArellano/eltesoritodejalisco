-- Allow more than one payment record per order for split payments.
-- Run this once in the existing Supabase database.

ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS payments_order_id_key;

CREATE INDEX IF NOT EXISTS payments_order_id_idx
ON public.payments (order_id);
