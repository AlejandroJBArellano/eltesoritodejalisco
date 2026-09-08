-- Migración: Crear tabla de auditoría y trazabilidad de órdenes (order_audit_logs)

CREATE TABLE IF NOT EXISTS public.order_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    action_type TEXT NOT NULL, -- 'CREATED', 'ITEMS_ADDED', 'ITEMS_REMOVED', 'DISCOUNT_APPLIED', 'CANCELLED', 'REOPENED', 'PAID'
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_order_audit_logs_order_id ON public.order_audit_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_audit_logs_tenant_id ON public.order_audit_logs(tenant_id);

-- RLS (Row Level Security)
ALTER TABLE public.order_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_audit_logs' AND policyname = 'Allow access to tenant members'
  ) THEN
    CREATE POLICY "Allow access to tenant members" ON public.order_audit_logs
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
