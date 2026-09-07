-- 1. Agregar columnas de descuento a la tabla orders si no existen
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount_value double precision DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount_amount double precision DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_reason text DEFAULT NULL;

-- 2. Agregar columnas de descuento a la tabla order_items si no existen
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS discount_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount_value double precision DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount_amount double precision DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_scope text DEFAULT 'ROW',
  ADD COLUMN IF NOT EXISTS discount_reason text DEFAULT NULL;

-- 3. Actualizar función create_order_with_items con soporte para descuentos por ítem y por orden
-- Eliminar sobrecarga anterior para evitar conflicto de resolución de funciones en PostgREST (PGRST203)
DROP FUNCTION IF EXISTS public.create_order_with_items(uuid, text, text, text, text, jsonb, timestamp with time zone);

CREATE OR REPLACE FUNCTION public.create_order_with_items(
    p_tenant_id uuid,
    p_customer_id text,
    p_source text,
    p_table text,
    p_notes text,
    p_items jsonb,
    p_pickup_time timestamp with time zone DEFAULT NULL::timestamp with time zone,
    p_discount_type text DEFAULT NULL::text,
    p_discount_value double precision DEFAULT NULL::double precision,
    p_discount_reason text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_order_id text := gen_random_uuid()::text;
    v_today date;
    v_today_str text;
    v_last_order_number text;
    v_next_seq integer := 1;
    v_order_number text;
    v_gross_subtotal double precision := 0;
    v_items_discount double precision := 0;
    v_net_subtotal double precision := 0;
    v_order_discount double precision := 0;
    v_total double precision := 0;
    v_loyalty_ratio numeric := 10.0;
    v_points_earned integer := 0;
    v_result jsonb;
BEGIN
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'At least one order item is required';
    END IF;

    -- Determinar fecha operativa (CDMX, corte 4:00 AM)
    v_today := (NOW() AT TIME ZONE 'America/Mexico_City' - INTERVAL '4 hours')::date;
    v_today_str := to_char(v_today, 'YYMMDD');

    -- Determinar siguiente order_number
    SELECT order_number INTO v_last_order_number
      FROM orders
     WHERE tenant_id = p_tenant_id
       AND operational_date = v_today
     ORDER BY created_at DESC
     LIMIT 1
     FOR UPDATE;

    IF v_last_order_number IS NOT NULL AND v_last_order_number LIKE v_today_str || '-%' THEN
        v_next_seq := (SUBSTRING(v_last_order_number FROM '[0-9]+$'))::integer + 1;
    ELSE
        v_next_seq := 1;
    END IF;

    v_order_number := v_today_str || '-' || LPAD(v_next_seq::text, 3, '0');

    -- Validar que todos los items pertenezcan al tenant
    IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_items) elem
        LEFT JOIN menu_items m
               ON m.id = (elem->>'menu_item_id')
              AND m.tenant_id = p_tenant_id
        WHERE m.id IS NULL OR (elem->>'quantity')::numeric <= 0
    ) THEN
        RAISE EXCEPTION 'One or more menu items are invalid or do not belong to this tenant';
    END IF;

    -- Calcular subtotal bruto y descuentos por ítem
    WITH parsed_items AS (
        SELECT
            elem->>'menu_item_id' AS menu_item_id,
            (elem->>'quantity')::numeric AS quantity,
            elem->>'notes' AS notes,
            elem->>'discount_type' AS discount_type,
            (elem->>'discount_value')::double precision AS discount_value,
            COALESCE(elem->>'discount_scope', 'ROW') AS discount_scope,
            elem->>'discount_reason' AS discount_reason
        FROM jsonb_array_elements(p_items) AS elem
    ),
    item_calculations AS (
        SELECT
            p.quantity,
            COALESCE(m.price, 0) AS unit_price,
            (p.quantity * COALESCE(m.price, 0)) AS line_gross,
            CASE
                WHEN p.discount_type = 'PERCENT' AND p.discount_value > 0 THEN
                    LEAST(p.quantity * COALESCE(m.price, 0), ROUND((p.quantity * COALESCE(m.price, 0) * (p.discount_value / 100.0))::numeric, 2)::double precision)
                WHEN p.discount_type = 'FIXED' AND p.discount_value > 0 THEN
                    CASE
                        WHEN p.discount_scope = 'UNIT' THEN
                            LEAST(p.quantity * COALESCE(m.price, 0), ROUND((p.quantity * p.discount_value)::numeric, 2)::double precision)
                        ELSE
                            LEAST(p.quantity * COALESCE(m.price, 0), ROUND((p.discount_value)::numeric, 2)::double precision)
                    END
                ELSE 0
            END AS item_discount
        FROM parsed_items p
        LEFT JOIN menu_items m
               ON m.id = p.menu_item_id
              AND m.tenant_id = p_tenant_id
    )
    SELECT
        COALESCE(SUM(line_gross), 0),
        COALESCE(SUM(item_discount), 0)
    INTO v_gross_subtotal, v_items_discount
    FROM item_calculations;

    v_net_subtotal := GREATEST(0, v_gross_subtotal - v_items_discount);

    -- Calcular descuento a nivel orden en cascada
    IF p_discount_type = 'PERCENT' AND p_discount_value > 0 THEN
        v_order_discount := LEAST(v_net_subtotal, ROUND((v_net_subtotal * (p_discount_value / 100.0))::numeric, 2)::double precision);
    ELSIF p_discount_type = 'FIXED' AND p_discount_value > 0 THEN
        v_order_discount := LEAST(v_net_subtotal, ROUND((p_discount_value)::numeric, 2)::double precision);
    ELSE
        v_order_discount := 0;
    END IF;

    v_total := GREATEST(0, v_net_subtotal - v_order_discount);
    v_points_earned := FLOOR(v_total / v_loyalty_ratio);

    -- Insertar orden
    INSERT INTO orders (
        id, tenant_id, customer_id, order_number, source, status,
        "table", notes, subtotal, tax, total,
        discount_type, discount_value, discount_amount, discount_reason,
        operational_date, estado_cierre, pickup_time,
        created_at, updated_at
    ) VALUES (
        v_order_id,
        p_tenant_id,
        p_customer_id,
        v_order_number,
        p_source,
        'PENDING',
        p_table,
        p_notes,
        v_gross_subtotal,
        0,
        v_total,
        p_discount_type,
        p_discount_value,
        v_order_discount,
        p_discount_reason,
        v_today,
        'ABIERTA',
        p_pickup_time,
        NOW(),
        NOW()
    );

    -- Insertar items de la orden con sus descuentos calculados
    INSERT INTO order_items (
        id, order_id, menu_item_id, tenant_id,
        quantity, unit_price, notes,
        discount_type, discount_value, discount_amount, discount_scope, discount_reason,
        created_at, inventory_deducted
    )
    SELECT
        gen_random_uuid()::text,
        v_order_id,
        p.menu_item_id,
        p_tenant_id,
        p.quantity,
        p.unit_price,
        p.notes,
        p.discount_type,
        p.discount_value,
        CASE
            WHEN p.discount_type = 'PERCENT' AND p.discount_value > 0 THEN
                LEAST(p.quantity * p.unit_price, ROUND((p.quantity * p.unit_price * (p.discount_value / 100.0))::numeric, 2)::double precision)
            WHEN p.discount_type = 'FIXED' AND p.discount_value > 0 THEN
                CASE
                    WHEN p.discount_scope = 'UNIT' THEN
                        LEAST(p.quantity * p.unit_price, ROUND((p.quantity * p.discount_value)::numeric, 2)::double precision)
                    ELSE
                        LEAST(p.quantity * p.unit_price, ROUND((p.discount_value)::numeric, 2)::double precision)
                END
            ELSE 0
        END,
        p.discount_scope,
        p.discount_reason,
        NOW(),
        FALSE
    FROM (
        SELECT
            elem->>'menu_item_id' AS menu_item_id,
            (elem->>'quantity')::numeric AS quantity,
            elem->>'notes' AS notes,
            elem->>'discount_type' AS discount_type,
            (elem->>'discount_value')::double precision AS discount_value,
            COALESCE(elem->>'discount_scope', 'ROW') AS discount_scope,
            elem->>'discount_reason' AS discount_reason,
            COALESCE(m.price, 0) AS unit_price
        FROM jsonb_array_elements(p_items) AS elem
        LEFT JOIN menu_items m
               ON m.id = (elem->>'menu_item_id')
              AND m.tenant_id = p_tenant_id
    ) p;

    -- DESCONTAR INVENTARIO INMEDIATAMENTE AL CREAR
    PERFORM fn_deduct_inventory_for_order(v_order_id);

    -- Puntos de lealtad si aplica
    IF p_customer_id IS NOT NULL AND v_points_earned > 0 THEN
        UPDATE customers
           SET loyalty_points = COALESCE(loyalty_points, 0) + v_points_earned
         WHERE id = p_customer_id AND tenant_id = p_tenant_id;
    END IF;

    -- Construir respuesta completa
    SELECT row_to_json(o)::jsonb INTO v_result
    FROM (
        SELECT
            ord.*,
            COALESCE((
                SELECT json_agg(
                    json_build_object(
                        'id', oi.id,
                        'order_id', oi.order_id,
                        'menu_item_id', oi.menu_item_id,
                        'tenant_id', oi.tenant_id,
                        'quantity', oi.quantity,
                        'unit_price', oi.unit_price,
                        'notes', oi.notes,
                        'discount_type', oi.discount_type,
                        'discount_value', oi.discount_value,
                        'discount_amount', oi.discount_amount,
                        'discount_scope', oi.discount_scope,
                        'discount_reason', oi.discount_reason,
                        'status', oi.status,
                        'tiempo_preparacion_segundos', oi.tiempo_preparacion_segundos,
                        'inventory_deducted', oi.inventory_deducted,
                        'created_at', oi.created_at,
                        'menu_items', row_to_json(mi)
                    )
                )
                FROM order_items oi
                LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
                WHERE oi.order_id = v_order_id
            ), '[]'::json) AS order_items,
            '[]'::json AS payments,
            (
                SELECT row_to_json(cust)
                FROM customers cust
                WHERE cust.id = p_customer_id
            ) AS customer
        FROM orders ord
        WHERE ord.id = v_order_id
    ) o;

    RETURN v_result;
END;
$function$;
