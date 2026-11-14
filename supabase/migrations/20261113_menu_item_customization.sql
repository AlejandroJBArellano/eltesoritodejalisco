-- =============================================================================
-- Migración: Personalización de platillos (grupos de opciones)
-- Spec: docs/PERSONALIZACION_PLATILLOS.md
--
-- Todo es aditivo e idempotente: columnas nuevas con default, tablas nuevas y
-- reemplazo de create_order_with_items con la MISMA firma (sin sobrecargas,
-- ver types/__tests__/supabase-functions.test.ts / PGRST203).
-- =============================================================================

-- 1. Columnas en menu_items ---------------------------------------------------
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS customization_layout TEXT NOT NULL DEFAULT 'SCROLL',
  ADD COLUMN IF NOT EXISTS customization_deduct_base BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'menu_items_customization_layout_check'
  ) THEN
    ALTER TABLE public.menu_items
      ADD CONSTRAINT menu_items_customization_layout_check
      CHECK (customization_layout IN ('SCROLL', 'WIZARD'));
  END IF;
END $$;

-- 2. Ajustes por tenant -------------------------------------------------------
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS customization_edit_after_kitchen TEXT NOT NULL DEFAULT 'WITH_PERMISSION',
  ADD COLUMN IF NOT EXISTS customization_edit_reprint BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS customization_edit_notify_kds BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS discount_includes_modifiers BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_customization_edit_after_kitchen_check'
  ) THEN
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_customization_edit_after_kitchen_check
      CHECK (customization_edit_after_kitchen IN ('NEVER', 'WITH_PERMISSION', 'WITH_MANAGER_AUTH'));
  END IF;
END $$;

-- 3. Columnas en order_items --------------------------------------------------
--    unit_price pasa a ser el precio unitario FINAL (base + niveles + opciones).
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS base_unit_price DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS discount_base_price DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS skip_base_inventory BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS options_inventory_deducted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS customization_modified_at TIMESTAMPTZ;

-- 4. Configuración: grupos, niveles, opciones y recetas de opción --------------
CREATE TABLE IF NOT EXISTS public.menu_item_option_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  menu_item_id TEXT NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  min_select INTEGER NOT NULL DEFAULT 0 CHECK (min_select >= 0),
  max_select INTEGER CHECK (max_select IS NULL OR max_select >= 1),
  allow_repeat BOOLEAN NOT NULL DEFAULT false,
  max_per_option INTEGER CHECK (max_per_option IS NULL OR max_per_option >= 1),
  pricing_mode TEXT NOT NULL DEFAULT 'ADDITIVE' CHECK (pricing_mode IN ('ADDITIVE', 'TIERED')),
  tier_match_mode TEXT CHECK (tier_match_mode IS NULL OR tier_match_mode IN ('EXACT', 'ROUND_UP', 'RANGE')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT menu_item_option_groups_min_le_max CHECK (max_select IS NULL OR min_select <= max_select)
);
CREATE INDEX IF NOT EXISTS idx_mio_groups_menu_item ON public.menu_item_option_groups(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_mio_groups_tenant ON public.menu_item_option_groups(tenant_id);

CREATE TABLE IF NOT EXISTS public.menu_item_option_group_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.menu_item_option_groups(id) ON DELETE CASCADE,
  quantity_from INTEGER NOT NULL CHECK (quantity_from >= 1),
  quantity_to INTEGER CHECK (quantity_to IS NULL OR quantity_to >= quantity_from),
  price DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (price >= 0)
);
CREATE INDEX IF NOT EXISTS idx_mio_tiers_group ON public.menu_item_option_group_tiers(group_id);

CREATE TABLE IF NOT EXISTS public.menu_item_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.menu_item_option_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  price_source TEXT NOT NULL DEFAULT 'CUSTOM' CHECK (price_source IN ('CUSTOM', 'LINKED_PRODUCT')),
  price_delta DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (price_delta >= 0),
  linked_menu_item_id TEXT REFERENCES public.menu_items(id) ON DELETE SET NULL,
  deduct_linked_inventory BOOLEAN NOT NULL DEFAULT true,
  out_of_stock_behavior TEXT NOT NULL DEFAULT 'DISABLE' CHECK (out_of_stock_behavior IN ('DISABLE', 'ALLOW')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mio_options_group ON public.menu_item_options(group_id);
CREATE INDEX IF NOT EXISTS idx_mio_options_linked ON public.menu_item_options(linked_menu_item_id);

-- ingredient_id usa el mismo tipo que ingredients.id (text o uuid según la base).
DO $$
DECLARE
  v_ing_type TEXT;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod) INTO v_ing_type
  FROM pg_attribute a
  WHERE a.attrelid = 'public.ingredients'::regclass AND a.attname = 'id' AND NOT a.attisdropped;

  IF to_regclass('public.menu_item_option_recipe_items') IS NULL THEN
    EXECUTE format($f$
      CREATE TABLE public.menu_item_option_recipe_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        option_id UUID NOT NULL REFERENCES public.menu_item_options(id) ON DELETE CASCADE,
        ingredient_id %s NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
        quantity_required DOUBLE PRECISION NOT NULL CHECK (quantity_required > 0),
        CONSTRAINT uq_mio_recipe_option_ingredient UNIQUE (option_id, ingredient_id)
      )
    $f$, v_ing_type);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_mio_recipe_option ON public.menu_item_option_recipe_items(option_id);

-- 5. Venta: snapshot de opciones y niveles por renglón -------------------------
CREATE TABLE IF NOT EXISTS public.order_item_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_item_id TEXT NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  option_id UUID REFERENCES public.menu_item_options(id) ON DELETE SET NULL,
  group_id UUID REFERENCES public.menu_item_option_groups(id) ON DELETE SET NULL,
  group_name TEXT NOT NULL,
  option_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  unit_price DOUBLE PRECISION NOT NULL DEFAULT 0,
  group_sort INTEGER NOT NULL DEFAULT 0,
  option_sort INTEGER NOT NULL DEFAULT 0,
  -- Lo que consume UNA unidad de la opción al momento de la venta:
  -- [{ "ingredientId": "...", "quantity": 0.08 }]
  inventory JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_oio_order_item ON public.order_item_options(order_item_id);
CREATE INDEX IF NOT EXISTS idx_oio_tenant_option ON public.order_item_options(tenant_id, option_id);

CREATE TABLE IF NOT EXISTS public.order_item_group_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_item_id TEXT NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.menu_item_option_groups(id) ON DELETE SET NULL,
  group_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_oigt_order_item ON public.order_item_group_tiers(order_item_id);

-- 6. Borradores de checkout de Pickup (la metadata de Stripe solo lleva el id) --
CREATE TABLE IF NOT EXISTS public.checkout_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '2 days'),
  consumed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_checkout_drafts_tenant ON public.checkout_drafts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_checkout_drafts_expires ON public.checkout_drafts(expires_at);

-- 7. RLS (mismo patrón que producción: get_user_tenants(auth.uid())) -----------
-- Configuración: miembros del tenant LEEN; solo el servidor (service role,
-- tras validar menu.manage_customization) ESCRIBE.
ALTER TABLE public.menu_item_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_option_group_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_option_recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_group_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_drafts ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'menu_item_option_groups',
    'menu_item_option_group_tiers',
    'menu_item_options',
    'menu_item_option_recipe_items'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenants(auth.uid())))',
      t || '_select', t
    );
  END LOOP;

  -- Snapshot de venta: mismo acceso que order_items para el personal del tenant.
  FOREACH t IN ARRAY ARRAY['order_item_options', 'order_item_group_tiers'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_tenant_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL USING (tenant_id IN (SELECT public.get_user_tenants(auth.uid()))) WITH CHECK (tenant_id IN (SELECT public.get_user_tenants(auth.uid())))',
      t || '_tenant_all', t
    );
  END LOOP;
  -- checkout_drafts: sin políticas ⇒ solo service role.
END $$;

-- 8. Guardado atómico de la configuración de un producto -----------------------
-- Upsert por id para conservar ids estables (reportes); borra lo que ya no viene.
CREATE OR REPLACE FUNCTION public.save_menu_item_customization(
  p_tenant_id UUID,
  p_menu_item_id TEXT,
  p_config JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  v_group JSONB;
  v_option JSONB;
  v_tier JSONB;
  v_recipe JSONB;
  v_group_id UUID;
  v_option_id UUID;
  v_group_ids UUID[] := ARRAY[]::UUID[];
  v_option_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM menu_items WHERE id = p_menu_item_id AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Menu item not found for tenant';
  END IF;

  UPDATE menu_items
     SET customization_layout = COALESCE(p_config->>'layout', 'SCROLL'),
         customization_deduct_base = COALESCE((p_config->>'deductBase')::boolean, true),
         updated_at = now()
   WHERE id = p_menu_item_id AND tenant_id = p_tenant_id;

  -- Ids que se conservan
  FOR v_group IN SELECT * FROM jsonb_array_elements(COALESCE(p_config->'groups', '[]'::jsonb)) LOOP
    v_group_ids := v_group_ids || (v_group->>'id')::uuid;
    FOR v_option IN SELECT * FROM jsonb_array_elements(COALESCE(v_group->'options', '[]'::jsonb)) LOOP
      v_option_ids := v_option_ids || (v_option->>'id')::uuid;
    END LOOP;
  END LOOP;

  -- Un id de grupo/opción de OTRO producto o tenant no se puede secuestrar
  IF EXISTS (
    SELECT 1 FROM menu_item_option_groups g
     WHERE g.id = ANY(v_group_ids)
       AND (g.menu_item_id <> p_menu_item_id OR g.tenant_id <> p_tenant_id)
  ) OR EXISTS (
    SELECT 1 FROM menu_item_options o
      JOIN menu_item_option_groups g ON g.id = o.group_id
     WHERE o.id = ANY(v_option_ids)
       AND (g.menu_item_id <> p_menu_item_id OR g.tenant_id <> p_tenant_id)
  ) THEN
    RAISE EXCEPTION 'Option or group id belongs to another menu item';
  END IF;

  DELETE FROM menu_item_option_groups
   WHERE menu_item_id = p_menu_item_id AND tenant_id = p_tenant_id
     AND NOT (id = ANY(v_group_ids));

  FOR v_group IN SELECT * FROM jsonb_array_elements(COALESCE(p_config->'groups', '[]'::jsonb)) LOOP
    v_group_id := (v_group->>'id')::uuid;

    INSERT INTO menu_item_option_groups (
      id, tenant_id, menu_item_id, name, sort_order, min_select, max_select,
      allow_repeat, max_per_option, pricing_mode, tier_match_mode, is_active, updated_at
    ) VALUES (
      v_group_id, p_tenant_id, p_menu_item_id,
      v_group->>'name',
      COALESCE((v_group->>'sortOrder')::int, 0),
      COALESCE((v_group->>'minSelect')::int, 0),
      NULLIF(v_group->>'maxSelect', '')::int,
      COALESCE((v_group->>'allowRepeat')::boolean, false),
      NULLIF(v_group->>'maxPerOption', '')::int,
      COALESCE(v_group->>'pricingMode', 'ADDITIVE'),
      NULLIF(v_group->>'tierMatchMode', ''),
      COALESCE((v_group->>'isActive')::boolean, true),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      sort_order = EXCLUDED.sort_order,
      min_select = EXCLUDED.min_select,
      max_select = EXCLUDED.max_select,
      allow_repeat = EXCLUDED.allow_repeat,
      max_per_option = EXCLUDED.max_per_option,
      pricing_mode = EXCLUDED.pricing_mode,
      tier_match_mode = EXCLUDED.tier_match_mode,
      is_active = EXCLUDED.is_active,
      updated_at = now();

    -- Niveles: se reemplazan completos
    DELETE FROM menu_item_option_group_tiers WHERE group_id = v_group_id;
    FOR v_tier IN SELECT * FROM jsonb_array_elements(COALESCE(v_group->'tiers', '[]'::jsonb)) LOOP
      INSERT INTO menu_item_option_group_tiers (tenant_id, group_id, quantity_from, quantity_to, price)
      VALUES (
        p_tenant_id, v_group_id,
        (v_tier->>'quantityFrom')::int,
        NULLIF(v_tier->>'quantityTo', '')::int,
        COALESCE((v_tier->>'price')::double precision, 0)
      );
    END LOOP;

    -- Opciones que ya no vienen en este grupo
    DELETE FROM menu_item_options
     WHERE group_id = v_group_id AND NOT (id = ANY(v_option_ids));

    FOR v_option IN SELECT * FROM jsonb_array_elements(COALESCE(v_group->'options', '[]'::jsonb)) LOOP
      v_option_id := (v_option->>'id')::uuid;

      INSERT INTO menu_item_options (
        id, tenant_id, group_id, name, sort_order, is_active, price_source, price_delta,
        linked_menu_item_id, deduct_linked_inventory, out_of_stock_behavior, updated_at
      ) VALUES (
        v_option_id, p_tenant_id, v_group_id,
        v_option->>'name',
        COALESCE((v_option->>'sortOrder')::int, 0),
        COALESCE((v_option->>'isActive')::boolean, true),
        COALESCE(v_option->>'priceSource', 'CUSTOM'),
        COALESCE((v_option->>'priceDelta')::double precision, 0),
        NULLIF(v_option->>'linkedMenuItemId', ''),
        COALESCE((v_option->>'deductLinkedInventory')::boolean, true),
        COALESCE(v_option->>'outOfStockBehavior', 'DISABLE'),
        now()
      )
      ON CONFLICT (id) DO UPDATE SET
        group_id = EXCLUDED.group_id,
        name = EXCLUDED.name,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active,
        price_source = EXCLUDED.price_source,
        price_delta = EXCLUDED.price_delta,
        linked_menu_item_id = EXCLUDED.linked_menu_item_id,
        deduct_linked_inventory = EXCLUDED.deduct_linked_inventory,
        out_of_stock_behavior = EXCLUDED.out_of_stock_behavior,
        updated_at = now();

      DELETE FROM menu_item_option_recipe_items WHERE option_id = v_option_id;
      FOR v_recipe IN SELECT * FROM jsonb_array_elements(COALESCE(v_option->'recipe', '[]'::jsonb)) LOOP
        INSERT INTO menu_item_option_recipe_items (tenant_id, option_id, ingredient_id, quantity_required)
        SELECT p_tenant_id, v_option_id, i.id, (v_recipe->>'quantityRequired')::double precision
          FROM ingredients i
         WHERE i.id::text = v_recipe->>'ingredientId'
           AND i.tenant_id = p_tenant_id;
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'groups', array_length(v_group_ids, 1));
END;
$function$;

REVOKE ALL ON FUNCTION public.save_menu_item_customization(UUID, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_menu_item_customization(UUID, TEXT, JSONB) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_menu_item_customization(UUID, TEXT, JSONB) TO service_role;

-- 9. create_order_with_items con precio final y snapshot de opciones -----------
-- Misma firma que 20260907_add_discounts.sql. Cada elemento de p_items acepta
-- además (todos opcionales, calculados y validados por el servidor):
--   unit_price, base_unit_price, discount_base_price, skip_base_inventory,
--   options: [{option_id, group_id, group_name, option_name, quantity,
--              unit_price, group_sort, option_sort, inventory}],
--   tiers:   [{group_id, group_name, quantity, price}]
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
    v_elem jsonb;
    v_opt jsonb;
    v_tier jsonb;
    v_item_id text;
    v_qty numeric;
    v_unit_price double precision;
    v_discount_base double precision;
    v_line_gross double precision;
    v_line_discount_base double precision;
    v_item_discount double precision;
    v_discount_type text;
    v_discount_value double precision;
    v_discount_scope text;
    v_skip_base boolean;
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

    -- Pasada 1: subtotal bruto y descuentos por ítem (para insertar la orden
    -- ya con sus totales, igual que la versión anterior).
    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_qty := (v_elem->>'quantity')::numeric;
        SELECT COALESCE((v_elem->>'unit_price')::double precision, m.price, 0)
          INTO v_unit_price
          FROM menu_items m
         WHERE m.id = (v_elem->>'menu_item_id') AND m.tenant_id = p_tenant_id;
        v_discount_base := COALESCE((v_elem->>'discount_base_price')::double precision, v_unit_price);
        v_line_discount_base := v_qty * v_discount_base;
        v_discount_type := v_elem->>'discount_type';
        v_discount_value := (v_elem->>'discount_value')::double precision;
        v_discount_scope := COALESCE(v_elem->>'discount_scope', 'ROW');
        v_item_discount := CASE
            WHEN v_discount_type = 'PERCENT' AND v_discount_value > 0 THEN
                LEAST(v_line_discount_base, ROUND((v_line_discount_base * (v_discount_value / 100.0))::numeric, 2)::double precision)
            WHEN v_discount_type = 'FIXED' AND v_discount_value > 0 THEN
                CASE
                    WHEN v_discount_scope = 'UNIT' THEN
                        LEAST(v_line_discount_base, ROUND((v_qty * v_discount_value)::numeric, 2)::double precision)
                    ELSE
                        LEAST(v_line_discount_base, ROUND((v_discount_value)::numeric, 2)::double precision)
                END
            ELSE 0
        END;
        v_gross_subtotal := v_gross_subtotal + v_qty * v_unit_price;
        v_items_discount := v_items_discount + v_item_discount;
    END LOOP;

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
        v_order_id, p_tenant_id, p_customer_id, v_order_number, p_source, 'PENDING',
        p_table, p_notes, v_gross_subtotal, 0, v_total,
        p_discount_type, p_discount_value, v_order_discount, p_discount_reason,
        v_today, 'ABIERTA', p_pickup_time,
        NOW(), NOW()
    );

    -- Pasada 2: insertar renglones uno por uno (necesitamos su id para las opciones)
    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_item_id := gen_random_uuid()::text;
        v_qty := (v_elem->>'quantity')::numeric;

        SELECT COALESCE((v_elem->>'unit_price')::double precision, m.price, 0)
          INTO v_unit_price
          FROM menu_items m
         WHERE m.id = (v_elem->>'menu_item_id') AND m.tenant_id = p_tenant_id;

        v_discount_base := COALESCE((v_elem->>'discount_base_price')::double precision, v_unit_price);
        v_line_discount_base := v_qty * v_discount_base;
        v_discount_type := v_elem->>'discount_type';
        v_discount_value := (v_elem->>'discount_value')::double precision;
        v_discount_scope := COALESCE(v_elem->>'discount_scope', 'ROW');
        v_skip_base := COALESCE((v_elem->>'skip_base_inventory')::boolean, false);

        v_item_discount := CASE
            WHEN v_discount_type = 'PERCENT' AND v_discount_value > 0 THEN
                LEAST(v_line_discount_base, ROUND((v_line_discount_base * (v_discount_value / 100.0))::numeric, 2)::double precision)
            WHEN v_discount_type = 'FIXED' AND v_discount_value > 0 THEN
                CASE
                    WHEN v_discount_scope = 'UNIT' THEN
                        LEAST(v_line_discount_base, ROUND((v_qty * v_discount_value)::numeric, 2)::double precision)
                    ELSE
                        LEAST(v_line_discount_base, ROUND((v_discount_value)::numeric, 2)::double precision)
                END
            ELSE 0
        END;

        -- inventory_deducted := skip ⇒ fn_deduct_inventory_for_order omite el
        -- producto base cuando el admin desactivó "descontar producto base".
        INSERT INTO order_items (
            id, order_id, menu_item_id, tenant_id,
            quantity, unit_price, base_unit_price, discount_base_price, notes,
            discount_type, discount_value, discount_amount, discount_scope, discount_reason,
            skip_base_inventory, options_inventory_deducted,
            created_at, inventory_deducted
        ) VALUES (
            v_item_id, v_order_id, v_elem->>'menu_item_id', p_tenant_id,
            v_qty, v_unit_price,
            (v_elem->>'base_unit_price')::double precision,
            (v_elem->>'discount_base_price')::double precision,
            v_elem->>'notes',
            v_discount_type, v_discount_value, v_item_discount, v_discount_scope, v_elem->>'discount_reason',
            v_skip_base, false,
            NOW(), v_skip_base
        );

        FOR v_opt IN SELECT * FROM jsonb_array_elements(COALESCE(v_elem->'options', '[]'::jsonb)) LOOP
            INSERT INTO order_item_options (
                tenant_id, order_item_id, option_id, group_id, group_name, option_name,
                quantity, unit_price, group_sort, option_sort, inventory
            ) VALUES (
                p_tenant_id, v_item_id,
                NULLIF(v_opt->>'option_id', '')::uuid,
                NULLIF(v_opt->>'group_id', '')::uuid,
                COALESCE(v_opt->>'group_name', ''),
                COALESCE(v_opt->>'option_name', ''),
                GREATEST(1, COALESCE((v_opt->>'quantity')::int, 1)),
                COALESCE((v_opt->>'unit_price')::double precision, 0),
                COALESCE((v_opt->>'group_sort')::int, 0),
                COALESCE((v_opt->>'option_sort')::int, 0),
                COALESCE(v_opt->'inventory', '[]'::jsonb)
            );
        END LOOP;

        FOR v_tier IN SELECT * FROM jsonb_array_elements(COALESCE(v_elem->'tiers', '[]'::jsonb)) LOOP
            INSERT INTO order_item_group_tiers (
                tenant_id, order_item_id, group_id, group_name, quantity, price
            ) VALUES (
                p_tenant_id, v_item_id,
                NULLIF(v_tier->>'group_id', '')::uuid,
                COALESCE(v_tier->>'group_name', ''),
                COALESCE((v_tier->>'quantity')::int, 0),
                COALESCE((v_tier->>'price')::double precision, 0)
            );
        END LOOP;
    END LOOP;

    -- DESCONTAR INVENTARIO INMEDIATAMENTE AL CREAR (producto base).
    -- Las opciones se descuentan desde el servidor (lib/services/inventory.ts).
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
                        'base_unit_price', oi.base_unit_price,
                        'discount_base_price', oi.discount_base_price,
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
                        'menu_items', row_to_json(mi),
                        'order_item_options', COALESCE((
                            SELECT json_agg(row_to_json(oio) ORDER BY oio.group_sort, oio.option_sort)
                              FROM order_item_options oio
                             WHERE oio.order_item_id = oi.id
                        ), '[]'::json)
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

-- 10. Permiso nuevo para gerentes del sistema que ya administran el menú --------
UPDATE public.roles
   SET permissions = permissions || '["menu.manage_customization"]'::jsonb,
       updated_at = now()
 WHERE system_slug = 'MANAGER'
   AND permissions ? 'menu.manage'
   AND NOT (permissions ? 'menu.manage_customization');
