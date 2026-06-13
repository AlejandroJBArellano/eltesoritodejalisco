-- =====================================================================
-- TESORITO OS - MIGRATION: SEPARATE FIXED AND VARIABLE OPERATING EXPENSES
-- Run this in your Supabase SQL Editor to update your tables and functions.
-- =====================================================================

-- 1. Add 'tipo_gasto' column to expense_categories table
ALTER TABLE public.expense_categories 
ADD COLUMN IF NOT EXISTS tipo_gasto TEXT NOT NULL DEFAULT 'variable' CHECK (tipo_gasto IN ('fijo', 'variable'));

-- 2. Update existing categories with appropriate tipo_gasto
-- Fixed Expenses (Costos Fijos)
UPDATE public.expense_categories 
SET tipo_gasto = 'fijo' 
WHERE name ILIKE 'Sueldos' 
   OR name ILIKE 'Servicios' 
   OR name ILIKE 'Marketing' 
   OR name ILIKE 'Konta Sat' 
   OR name ILIKE '%konta%';

-- Variable Expenses (Costos Variables)
UPDATE public.expense_categories 
SET tipo_gasto = 'variable' 
WHERE name ILIKE 'Insumos' 
   OR name ILIKE 'Transportes' 
   OR name ILIKE 'Otros'
   OR name ILIKE '%jornada%';

-- 3. Replace the generar_corte_extemporaneo function to only sum Variable expenses
CREATE OR REPLACE FUNCTION public.generar_corte_extemporaneo(p_cut_date DATE, p_user_id UUID)
RETURNS TABLE(corte_id UUID, total_ventas NUMERIC, total_ordenes INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
    v_corte_id UUID;
    v_now_mx_date DATE := (now() AT TIME ZONE 'America/Mexico_City')::date;
    v_tax_rate NUMERIC := 1.16;
BEGIN
    IF p_cut_date IS NULL THEN
        RAISE EXCEPTION 'La fecha del corte es requerida';
    END IF;

    IF p_cut_date >= v_now_mx_date THEN
        RAISE EXCEPTION 'Solo se permiten fechas pasadas';
    END IF;

    IF EXISTS (SELECT 1 FROM public.daily_cuts WHERE cut_date = p_cut_date) THEN
        RAISE EXCEPTION 'Ya existe corte para esa fecha';
    END IF;

    WITH candidatas AS (
        SELECT o.id, o.total
        FROM public.orders o
        WHERE o.operational_date = p_cut_date
          AND o.corte_id IS NULL
          AND o.status IN ('PAID', 'DELIVERED', 'UNCOLLECTED')
        FOR UPDATE
    ),
    pay AS (
        SELECT
            p.order_id,
            COALESCE(SUM(CASE WHEN p.method = 'CASH' THEN COALESCE(p.tip_amount, 0) ELSE 0 END), 0) AS tips_cash,
            COALESCE(SUM(CASE WHEN p.method IN ('CARD', 'TRANSFER') THEN COALESCE(p.tip_amount, 0) ELSE 0 END), 0) AS tips_card,
            COALESCE(SUM(CASE WHEN p.method = 'CASH' THEN COALESCE(p.amount, 0) + COALESCE(p.tip_amount, 0) ELSE 0 END), 0) AS caja_cash,
            COALESCE(SUM(CASE WHEN p.method IN ('CARD', 'TRANSFER') THEN COALESCE(p.amount, 0) + COALESCE(p.tip_amount, 0) ELSE 0 END), 0) AS caja_card,
            COALESCE(SUM(CASE WHEN p.method NOT IN ('CASH', 'CARD', 'TRANSFER') THEN COALESCE(p.amount, 0) + COALESCE(p.tip_amount, 0) ELSE 0 END), 0) AS caja_other
        FROM public.payments p
        JOIN candidatas c ON c.id = p.order_id
        GROUP BY p.order_id
    ),
    totales AS (
        SELECT
            COALESCE(SUM(c.total / v_tax_rate), 0)::numeric(10, 2) AS venta_neta,
            COALESCE(SUM(c.total - (c.total / v_tax_rate)), 0)::numeric(10, 2) AS iva_acumulado,
            COALESCE(SUM(pay.tips_cash), 0)::numeric(10, 2) AS propinas_efectivo,
            COALESCE(SUM(pay.tips_card), 0)::numeric(10, 2) AS propinas_tarjeta,
            (COALESCE(SUM(pay.caja_cash), 0) + COALESCE(SUM(pay.caja_other), 0))::numeric(10, 2) AS caja_efectivo,
            COALESCE(SUM(pay.caja_card), 0)::numeric(10, 2) AS caja_tarjeta,
            COUNT(*)::integer AS total_orders
        FROM candidatas c
        LEFT JOIN pay ON pay.order_id = c.id
    ),
    gastos AS (
        SELECT COALESCE(SUM(e.amount), 0)::numeric(10, 2) AS total_gastos
        FROM public.expenses e
        LEFT JOIN public.expense_categories ec ON ec.id = e.category_id
        WHERE e.date = p_cut_date
          AND (ec.tipo_gasto IS NULL OR ec.tipo_gasto = 'variable')
    ),
    inserted AS (
        INSERT INTO public.daily_cuts (
            id,
            cut_date,
            venta_neta,
            iva_acumulado,
            propinas_efectivo,
            propinas_tarjeta,
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
            p_cut_date,
            t.venta_neta,
            t.iva_acumulado,
            t.propinas_efectivo,
            t.propinas_tarjeta,
            t.caja_efectivo,
            t.caja_tarjeta,
            (t.venta_neta + t.propinas_efectivo + t.propinas_tarjeta)::numeric(10, 2) AS utilidad_real,
            g.total_gastos,
            ((t.venta_neta + t.propinas_efectivo + t.propinas_tarjeta) - g.total_gastos)::numeric(10, 2) AS utilidad_final,
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
