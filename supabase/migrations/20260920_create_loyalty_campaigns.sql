-- 1. Tabla de Campañas de Fidelización
CREATE TABLE IF NOT EXISTS public.loyalty_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    template_key TEXT NOT NULL DEFAULT 'te_extranamos', -- 'te_extranamos' | 'canje_puntos' | 'personalizado'
    message_content TEXT NOT NULL,
    segment_filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED'
    total_recipients INTEGER NOT NULL DEFAULT 0,
    sent_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Destinatarios y Trazabilidad de Envíos
CREATE TABLE IF NOT EXISTS public.loyalty_campaign_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.loyalty_campaigns(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    loyalty_points INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING' | 'SENT' | 'FAILED'
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para consultas rápidas y validación anti-saturación
CREATE INDEX IF NOT EXISTS idx_loyalty_campaigns_tenant_status ON public.loyalty_campaigns(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_customer_sent ON public.loyalty_campaign_recipients(customer_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON public.loyalty_campaign_recipients(campaign_id);

-- RLS Policies
ALTER TABLE public.loyalty_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_campaign_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenants can manage their own loyalty campaigns" ON public.loyalty_campaigns;
CREATE POLICY "Tenants can manage their own loyalty campaigns"
    ON public.loyalty_campaigns
    FOR ALL
    USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenants can manage their campaign recipients" ON public.loyalty_campaign_recipients;
CREATE POLICY "Tenants can manage their campaign recipients"
    ON public.loyalty_campaign_recipients
    FOR ALL
    USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
