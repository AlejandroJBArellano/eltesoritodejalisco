-- Migration: Support independent tip payment method (Efectivo, Tarjeta, Transferencia)
-- 1. Add columns to payments table
ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS tip_payment_method public."PaymentMethod" DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS tip_terminal_id UUID REFERENCES public.payment_terminals(id) ON DELETE SET NULL;

-- 2. Add propinas_transferencia column to daily_cuts
ALTER TABLE public.daily_cuts
    ADD COLUMN IF NOT EXISTS propinas_transferencia NUMERIC(10, 2) DEFAULT 0.00;

-- 3. Drop previous signatures of generar_corte_extemporaneo before recreation (Regla de Oro)
DROP FUNCTION IF EXISTS public.generar_corte_extemporaneo(date, uuid);
DROP FUNCTION IF EXISTS public.generar_corte_extemporaneo(date, uuid, text);
DROP FUNCTION IF EXISTS public.generar_corte_extemporaneo(date, text, text);
DROP FUNCTION IF EXISTS public.generar_corte_extemporaneo(date, uuid, uuid);
DROP FUNCTION IF EXISTS public.generar_corte_extemporaneo(date, text, uuid);

-- 4. Recreate multi-tenant extemporaneous cut function with independent tip payment methods
CREATE OR REPLACE FUNCTION public.generar_corte_extemporaneo(
    p_cut_date DATE,
    p_user_id UUID,
    p_tenant_id UUID
)
RETURNS TABLE(corte_id UUID, total_ventas NUMERIC, total_ordenes INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
    v_corte_id UUID;
    v_now_mx_date DATE := (now() AT TIME ZONE 'America/Mexico_City')::date;
BEGIN
    IF p_cut_date IS NULL THEN
        RAISE EXCEPTION 'La fecha del corte es requerida';
    END IF;

    IF p_tenant_id IS NULL THEN
        RAISE EXCEPTION 'El tenant_id es requerido';
    END IF;

    IF p_cut_date >= v_now_mx_date THEN
        RAISE EXCEPTION 'Solo se permiten fechas pasadas';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.daily_cuts
        WHERE cut_date = p_cut_date AND tenant_id = p_tenant_id
    ) THEN
        RAISE EXCEPTION 'Ya existe corte para esa fecha';
    END IF;

    WITH candidatas AS (
        SELECT o.id, o.total
        FROM public.orders o
        WHERE o.operational_date = p_cut_date
          AND o.tenant_id = p_tenant_id
          AND o.corte_id IS NULL
          AND o.status IN ('PAID', 'DELIVERED', 'UNCOLLECTED')
        FOR UPDATE
    ),
    pay AS (
        SELECT
            p.order_id,
            COALESCE(SUM(CASE WHEN COALESCE(p.tip_payment_method, p.method) = 'CASH' THEN COALESCE(p.tip_amount, 0) ELSE 0 END), 0) AS tips_cash,
            COALESCE(SUM(CASE WHEN COALESCE(p.tip_payment_method, p.method) = 'CARD' THEN COALESCE(p.tip_amount, 0) ELSE 0 END), 0) AS tips_card,
            COALESCE(SUM(CASE WHEN COALESCE(p.tip_payment_method, p.method) = 'TRANSFER' THEN COALESCE(p.tip_amount, 0) ELSE 0 END), 0) AS tips_transfer,
            COALESCE(SUM(
                CASE WHEN p.method = 'CASH' THEN COALESCE(p.amount, 0) ELSE 0 END +
                CASE WHEN COALESCE(p.tip_payment_method, p.method) = 'CASH' THEN COALESCE(p.tip_amount, 0) ELSE 0 END
            ), 0) AS caja_cash,
            COALESCE(SUM(
                CASE WHEN p.method IN ('CARD', 'TRANSFER') THEN COALESCE(p.amount, 0) ELSE 0 END +
                CASE WHEN COALESCE(p.tip_payment_method, p.method) IN ('CARD', 'TRANSFER') THEN COALESCE(p.tip_amount, 0) ELSE 0 END
            ), 0) AS caja_card,
            COALESCE(SUM(
                CASE WHEN p.method NOT IN ('CASH', 'CARD', 'TRANSFER') THEN COALESCE(p.amount, 0) ELSE 0 END +
                CASE WHEN COALESCE(p.tip_payment_method, p.method) NOT IN ('CASH', 'CARD', 'TRANSFER') THEN COALESCE(p.tip_amount, 0) ELSE 0 END
            ), 0) AS caja_other
        FROM public.payments p
        JOIN candidatas c ON c.id = p.order_id
        GROUP BY p.order_id
    ),
    totales AS (
        SELECT
            COALESCE(SUM(c.total / 1.16), 0)::numeric(10, 2) AS venta_neta,
            COALESCE(SUM(c.total - (c.total / 1.16)), 0)::numeric(10, 2) AS iva_acumulado,
            COALESCE(SUM(pay.tips_cash), 0)::numeric(10, 2) AS propinas_efectivo,
            COALESCE(SUM(pay.tips_card), 0)::numeric(10, 2) AS propinas_tarjeta,
            COALESCE(SUM(pay.tips_transfer), 0)::numeric(10, 2) AS propinas_transferencia,
            (COALESCE(SUM(pay.caja_cash), 0) + COALESCE(SUM(pay.caja_other), 0))::numeric(10, 2) AS caja_efectivo,
            COALESCE(SUM(pay.caja_card), 0)::numeric(10, 2) AS caja_tarjeta,
            COUNT(*)::integer AS total_orders
        FROM candidatas c
        LEFT JOIN pay ON pay.order_id = c.id
    ),
    gastos AS (
        SELECT COALESCE(SUM(e.amount), 0)::numeric(10, 2) AS total_gastos
        FROM public.expenses e
        WHERE e.date = p_cut_date AND e.tenant_id = p_tenant_id
    ),
    inserted AS (
        INSERT INTO public.daily_cuts (
            id,
            tenant_id,
            cut_date,
            venta_neta,
            iva_acumulado,
            propinas_efectivo,
            propinas_tarjeta,
            propinas_transferencia,
            caja_efectivo,
            caja_tarjeta,
            utilidad_real,
            total_gastos,
            utilidad_final,
            total_orders,
            notes,
            cut_type,
            created_by
        )
        SELECT
            gen_random_uuid(),
            p_tenant_id,
            p_cut_date,
            t.venta_neta,
            t.iva_acumulado,
            t.propinas_efectivo,
            t.propinas_tarjeta,
            t.propinas_transferencia,
            t.caja_efectivo,
            t.caja_tarjeta,
            (t.venta_neta + t.propinas_efectivo + t.propinas_tarjeta + t.propinas_transferencia)::numeric(10, 2) AS utilidad_real,
            g.total_gastos,
            ((t.venta_neta + t.propinas_efectivo + t.propinas_tarjeta + t.propinas_transferencia) - g.total_gastos)::numeric(10, 2) AS utilidad_final,
            t.total_orders,
            'Corte extemporáneo generado automáticamente',
            'EXTEMPORANEO',
            p_user_id
        FROM totales t
        CROSS JOIN gastos g
        RETURNING id
    )
    SELECT id INTO v_corte_id FROM inserted;

    UPDATE public.orders o
    SET corte_id = v_corte_id,
        estado_cierre = 'ARCHIVADA',
        closed_at = now()
    WHERE o.operational_date = p_cut_date
      AND o.tenant_id = p_tenant_id
      AND o.corte_id IS NULL
      AND o.status IN ('PAID', 'DELIVERED', 'UNCOLLECTED');

    RETURN QUERY
    SELECT
        v_corte_id,
        COALESCE(dc.venta_neta, 0)::numeric,
        COALESCE(dc.total_orders, 0)::integer
    FROM public.daily_cuts dc
    WHERE dc.id = v_corte_id;
END;
$$;
