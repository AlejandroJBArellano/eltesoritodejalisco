-- Migración: Tabla de API Keys por Tenant para Servidores MCP y Conexiones IA
-- Fecha: 2026-09-21

CREATE TABLE IF NOT EXISTS public.tenant_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Claude / MCP Key',
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL, -- ej. 'kt_live_xxxx'
    scopes JSONB NOT NULL DEFAULT '["analytics:read", "orders:read", "inventory:read", "menu:read"]'::jsonb,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    CONSTRAINT fk_tenant_api_keys_profiles FOREIGN KEY (created_by, tenant_id) REFERENCES public.profiles(id, tenant_id) ON DELETE SET NULL
);

-- Índices de búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_tenant_id ON public.tenant_api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_key_hash ON public.tenant_api_keys(key_hash);

-- Habilitar RLS
ALTER TABLE public.tenant_api_keys ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "tenant_api_keys_select" ON public.tenant_api_keys;
CREATE POLICY "tenant_api_keys_select" ON public.tenant_api_keys
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "tenant_api_keys_insert" ON public.tenant_api_keys;
CREATE POLICY "tenant_api_keys_insert" ON public.tenant_api_keys
    FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "tenant_api_keys_update" ON public.tenant_api_keys;
CREATE POLICY "tenant_api_keys_update" ON public.tenant_api_keys
    FOR UPDATE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "tenant_api_keys_delete" ON public.tenant_api_keys;
CREATE POLICY "tenant_api_keys_delete" ON public.tenant_api_keys
    FOR DELETE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
        )
    );
