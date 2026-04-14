-- Facturama CFDI 4.0 Integration
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
    -- Facturama identifiers
    cfdi_uid TEXT NOT NULL,
    folio_fiscal TEXT,
    -- Receptor data
    rfc_receptor TEXT NOT NULL,
    razon_social_receptor TEXT NOT NULL,
    uso_cfdi TEXT NOT NULL DEFAULT 'G03',
    regimen_fiscal_receptor TEXT NOT NULL DEFAULT '616',
    cp_receptor TEXT NOT NULL,
    -- Amounts
    subtotal NUMERIC(10, 2) NOT NULL,
    iva NUMERIC(10, 2) NOT NULL DEFAULT 0,
    isr_retencion NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total NUMERIC(10, 2) NOT NULL,
    -- Status: 'issued' | 'cancelled'
    status TEXT NOT NULL DEFAULT 'issued',
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookup by order
CREATE INDEX IF NOT EXISTS invoices_order_id_idx ON public.invoices (order_id);

-- RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for anon on invoices"
ON public.invoices FOR ALL USING (true);
