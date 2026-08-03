-- =====================================================================
-- KITTNOS / TESORITO OS - MULTI-TENANT DATABASE MIGRATION SCRIPT
-- Run this in your Supabase SQL Editor to migrate the single-tenant
-- schema to a scalable multi-tenant architecture.
-- =====================================================================

BEGIN;

-- 1. Create public.tenants Table
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    system_name TEXT NOT NULL DEFAULT 'KittnOS',
    slug TEXT UNIQUE NOT NULL,
    primary_color TEXT DEFAULT '#FFB7CE',
    secondary_color TEXT DEFAULT '#FFD1DC',
    dark_bg_color TEXT DEFAULT '#121212',
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed the first default tenant (El Tesorito de Jalisco)
INSERT INTO public.tenants (name, system_name, slug, primary_color, secondary_color, dark_bg_color)
VALUES (
    'El Tesorito de Jalisco', 
    'TesoritoOS', 
    'tesorito', 
    '#FFB7CE', 
    '#FFD1DC', 
    '#121212'
)
ON CONFLICT (slug) DO NOTHING;

-- Retrieve the default tenant's ID for backfilling and apply column additions
DO $$
DECLARE
    default_tenant_id UUID;
    t_name TEXT;
    tables_to_migrate TEXT[] := ARRAY[
        'profiles', 'users', 'ingredients', 'menu_categories', 'menu_items', 
        'recipe_items', 'stock_adjustments', 'customers', 'orders', 'order_items', 
        'order_adjustments', 'payments', 'daily_tips', 'expense_categories', 
        'expenses', 'attendance', 'task_categories', 'primordial_tasks', 
        'task_executions', 'daily_cuts', 'business_hours', 'facturas'
    ];
BEGIN
    SELECT id INTO default_tenant_id FROM public.tenants WHERE slug = 'tesorito';

    -- Add tenant_id Columns and Backfill Data dynamically
    FOREACH t_name IN ARRAY tables_to_migrate LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t_name) THEN
            -- Check if column exists
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t_name AND column_name='tenant_id') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE', t_name);
                EXECUTE format('UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL', t_name, default_tenant_id);
                EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', t_name);
            END IF;
        END IF;
    END LOOP;
END $$;

-- 3. Drop Global Constraints and Re-create Composite Unique Constraints
DO $$
BEGIN
    -- Table: users (email)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') THEN
        ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='users_tenant_email_key' AND table_name='users') THEN
            ALTER TABLE public.users ADD CONSTRAINT users_tenant_email_key UNIQUE (tenant_id, email);
        END IF;
    END IF;

    -- Table: menu_categories (name)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='menu_categories') THEN
        ALTER TABLE public.menu_categories DROP CONSTRAINT IF EXISTS menu_categories_name_key;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='menu_categories_tenant_name_key' AND table_name='menu_categories') THEN
            ALTER TABLE public.menu_categories ADD CONSTRAINT menu_categories_tenant_name_key UNIQUE (tenant_id, name);
        END IF;
    END IF;

    -- Table: customers (phone, email)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='customers') THEN
        ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_phone_key;
        ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_email_key;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='customers_tenant_phone_key' AND table_name='customers') THEN
            ALTER TABLE public.customers ADD CONSTRAINT customers_tenant_phone_key UNIQUE (tenant_id, phone);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='customers_tenant_email_key' AND table_name='customers') THEN
            ALTER TABLE public.customers ADD CONSTRAINT customers_tenant_email_key UNIQUE (tenant_id, email);
        END IF;
    END IF;

    -- Table: orders (order_number)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orders') THEN
        ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_number_key;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='orders_tenant_order_number_key' AND table_name='orders') THEN
            ALTER TABLE public.orders ADD CONSTRAINT orders_tenant_order_number_key UNIQUE (tenant_id, order_number);
        END IF;
    END IF;

    -- Table: daily_tips (cut_date)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='daily_tips') THEN
        ALTER TABLE public.daily_tips DROP CONSTRAINT IF EXISTS daily_tips_cut_date_key;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='daily_tips_tenant_cut_date_key' AND table_name='daily_tips') THEN
            ALTER TABLE public.daily_tips ADD CONSTRAINT daily_tips_tenant_cut_date_key UNIQUE (tenant_id, cut_date);
        END IF;
    END IF;

    -- Table: expense_categories (name)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='expense_categories') THEN
        ALTER TABLE public.expense_categories DROP CONSTRAINT IF EXISTS expense_categories_name_key;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='expense_categories_tenant_name_key' AND table_name='expense_categories') THEN
            ALTER TABLE public.expense_categories ADD CONSTRAINT expense_categories_tenant_name_key UNIQUE (tenant_id, name);
        END IF;
    END IF;

    -- Table: task_categories (name)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='task_categories') THEN
        ALTER TABLE public.task_categories DROP CONSTRAINT IF EXISTS task_categories_name_key;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='task_categories_tenant_name_key' AND table_name='task_categories') THEN
            ALTER TABLE public.task_categories ADD CONSTRAINT task_categories_tenant_name_key UNIQUE (tenant_id, name);
        END IF;
    END IF;

    -- Table: primordial_tasks (name)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='primordial_tasks') THEN
        ALTER TABLE public.primordial_tasks DROP CONSTRAINT IF EXISTS primordial_tasks_name_key;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='primordial_tasks_tenant_name_key' AND table_name='primordial_tasks') THEN
            ALTER TABLE public.primordial_tasks ADD CONSTRAINT primordial_tasks_tenant_name_key UNIQUE (tenant_id, name);
        END IF;
    END IF;

    -- Table: daily_cuts (cut_date)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='daily_cuts') THEN
        ALTER TABLE public.daily_cuts DROP CONSTRAINT IF EXISTS daily_cuts_cut_date_key;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='daily_cuts_tenant_cut_date_key' AND table_name='daily_cuts') THEN
            ALTER TABLE public.daily_cuts ADD CONSTRAINT daily_cuts_tenant_cut_date_key UNIQUE (tenant_id, cut_date);
        END IF;
    END IF;

    -- Table: business_hours (day_of_week)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='business_hours') THEN
        ALTER TABLE public.business_hours DROP CONSTRAINT IF EXISTS business_hours_day_of_week_key;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='business_hours_tenant_day_of_week_key' AND table_name='business_hours') THEN
            ALTER TABLE public.business_hours ADD CONSTRAINT business_hours_tenant_day_of_week_key UNIQUE (tenant_id, day_of_week);
        END IF;
    END IF;

    -- Table: recipe_items
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='recipe_items') THEN
        BEGIN
            ALTER TABLE public.recipe_items DROP CONSTRAINT IF EXISTS recipe_items_menu_item_id_ingredient_id_key;
            IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='recipe_items_tenant_menu_ingredient_key' AND table_name='recipe_items') THEN
                ALTER TABLE public.recipe_items ADD CONSTRAINT recipe_items_tenant_menu_ingredient_key UNIQUE (tenant_id, menu_item_id, ingredient_id);
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                NULL;
        END;
    END IF;
END $$;

-- 4. Re-create Scoped Optimization Indexes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orders') THEN
        DROP INDEX IF EXISTS public.idx_orders_status;
        DROP INDEX IF EXISTS public.idx_orders_created;
        CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON public.orders(tenant_id, status);
        CREATE INDEX IF NOT EXISTS idx_orders_tenant_created ON public.orders(tenant_id, created_at DESC);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ingredients') THEN
        DROP INDEX IF EXISTS public.idx_ingredients_stock;
        CREATE INDEX IF NOT EXISTS idx_ingredients_tenant_stock ON public.ingredients(tenant_id, current_stock);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='customers') THEN
        DROP INDEX IF EXISTS public.idx_customers_phone;
        CREATE INDEX IF NOT EXISTS idx_customers_tenant_phone ON public.customers(tenant_id, phone);
    END IF;
END $$;

-- 5. Row Level Security (RLS) Configuration Scoped by tenant_id
DO $$
DECLARE
    t_name TEXT;
    tables_to_policy TEXT[] := ARRAY[
        'ingredients', 'menu_categories', 'menu_items', 'recipe_items', 'stock_adjustments', 
        'customers', 'orders', 'order_items', 'order_adjustments', 'payments', 
        'daily_tips', 'expense_categories', 'expenses', 'attendance', 'task_categories', 
        'primordial_tasks', 'task_executions', 'daily_cuts', 'business_hours'
    ];
BEGIN
    -- General policies for profiles, users, facturas
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Allow scoped operations for profiles" ON public.profiles';
        EXECUTE 'CREATE POLICY "Allow scoped operations for profiles" ON public.profiles FOR ALL USING (true)';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Allow scoped operations for users" ON public.users';
        EXECUTE 'CREATE POLICY "Allow scoped operations for users" ON public.users FOR ALL USING (true)';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='facturas') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Allow scoped operations for facturas" ON public.facturas';
        EXECUTE 'CREATE POLICY "Allow scoped operations for facturas" ON public.facturas FOR ALL USING (true)';
    END IF;

    -- Scoped access policies
    FOREACH t_name IN ARRAY tables_to_policy LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t_name) THEN
            -- Drop existing single-tenant "Allow all" policy
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow all for ' || t_name, t_name);
            
            -- Also drop "Permitir" policies for business_hours
            IF t_name = 'business_hours' THEN
                EXECUTE 'DROP POLICY IF EXISTS "Permitir lectura para todos en business_hours" ON public.business_hours';
                EXECUTE 'DROP POLICY IF EXISTS "Permitir todo para autenticados en business_hours" ON public.business_hours';
            END IF;

            -- Drop existing scoped policy if any to recreate
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Scoped access for ' || t_name, t_name);
            
            -- Create new scoped policy
            EXECUTE format('
                CREATE POLICY %I ON public.%I FOR ALL USING (
                  tenant_id = COALESCE(
                    (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()),
                    nullif(current_setting(%L, true), %L)::uuid,
                    (SELECT id FROM public.tenants WHERE slug = %L)
                  )
                )', 
                'Scoped access for ' || t_name, 
                t_name, 
                'app.current_tenant_id', 
                '', 
                'tesorito'
            );
        END IF;
    END LOOP;
END $$;

COMMIT;
