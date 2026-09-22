-- Migración: Tabla de Terminales Bancarias y Comisiones Diferenciadas
-- Fecha: 2026-09-22

-- 1. Crear tabla de terminales bancarias
CREATE TABLE IF NOT EXISTS public.payment_terminals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                          -- Ej. "General", "Clip Pro Barra", "Terminal BBVA"
    short_name TEXT NOT NULL,                    -- Ej. "General", "Clip", "BBVA"
    commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Índices de optimización
CREATE INDEX IF NOT EXISTS idx_payment_terminals_tenant_id ON public.payment_terminals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_terminals_active ON public.payment_terminals(tenant_id, is_active);

-- 3. Habilitar RLS
ALTER TABLE public.payment_terminals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_terminals_select" ON public.payment_terminals;
CREATE POLICY "payment_terminals_select" ON public.payment_terminals
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "payment_terminals_insert" ON public.payment_terminals;
CREATE POLICY "payment_terminals_insert" ON public.payment_terminals
    FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "payment_terminals_update" ON public.payment_terminals;
CREATE POLICY "payment_terminals_update" ON public.payment_terminals
    FOR UPDATE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "payment_terminals_delete" ON public.payment_terminals;
CREATE POLICY "payment_terminals_delete" ON public.payment_terminals
    FOR DELETE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- 4. Modificar la tabla payments para snapshot de terminal y comisión
ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS terminal_id UUID REFERENCES public.payment_terminals(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS terminal_name TEXT,
    ADD COLUMN IF NOT EXISTS terminal_commission_rate NUMERIC(5, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS terminal_commission_amount NUMERIC(10, 2) DEFAULT 0.00;

-- 5. Migración de comisiones existentes:
-- Insertar una terminal "General" con la tasa actual de cada tenant que aún no tenga terminales configuradas
INSERT INTO public.payment_terminals (tenant_id, name, short_name, commission_rate, is_default, is_active)
SELECT 
    id AS tenant_id,
    'General' AS name,
    'General' AS short_name,
    COALESCE(terminal_commission_rate, 0.00) AS commission_rate,
    true AS is_default,
    true AS is_active
FROM public.tenants
WHERE NOT EXISTS (
    SELECT 1 FROM public.payment_terminals WHERE payment_terminals.tenant_id = tenants.id
);
